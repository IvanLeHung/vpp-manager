// @ts-nocheck
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../lib/auth';

const router = Router();
router.use(authMiddleware);

// GET /api/items/summary — Dashboard-level stats for the items page
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await prisma.item.findMany({
      include: {
        stocks: { where: { warehouseCode: 'MAIN' } },
      },
    });

    let totalItems = items.length;
    let activeItems = 0;
    let outOfStock = 0;
    let lowStock = 0;
    let totalStockValue = 0;
    const alerts: { type: string; message: string; count: number }[] = [];
    const categoryMap: Record<string, number> = {};

    const lowStockItems: string[] = [];
    const outOfStockItems: string[] = [];

    for (const item of items) {
      const stock = item.stocks[0]?.quantityOnHand ?? 0;
      const price = Number(item.price);
      const threshold = Math.max(Math.floor(item.quota * 0.2), 5);

      if (item.isActive) activeItems++;

      totalStockValue += stock * price;

      // Category breakdown
      categoryMap[item.category] = (categoryMap[item.category] || 0) + 1;

      // Stock status
      if (stock === 0) {
        outOfStock++;
        outOfStockItems.push(item.name);
      } else if (stock <= threshold) {
        lowStock++;
        lowStockItems.push(item.name);
      }
    }

    // Alerts
    if (outOfStock > 0) {
      alerts.push({ type: 'OUT_OF_STOCK', message: `${outOfStock} vật tư hết hàng cần nhập thêm`, count: outOfStock });
    }
    if (lowStock > 0) {
      alerts.push({ type: 'LOW_STOCK', message: `${lowStock} vật tư sắp hết cần bổ sung`, count: lowStock });
    }

    // Movements today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const movementsToday = await prisma.stockMovement.count({
      where: { createdAt: { gte: startOfDay } },
    });

    if (movementsToday > 0) {
      alerts.push({ type: 'MOVEMENTS', message: `${movementsToday} lượt nhập/xuất hôm nay`, count: movementsToday });
    }

    // Pending requests count
    const pendingRequests = await prisma.request.count({
      where: { status: 'PENDING' },
    });
    if (pendingRequests > 0) {
      alerts.push({ type: 'PENDING_REQUESTS', message: `${pendingRequests} yêu cầu cấp phát đang chờ duyệt`, count: pendingRequests });
    }

    // Category breakdown for chart
    const categoryBreakdown = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

    // Top items by stock movements (usage)
    const topMovements = await prisma.stockMovement.groupBy({
      by: ['itemId'],
      where: { movementType: 'ISSUE' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const topItemIds = topMovements.map(m => m.itemId);
    const topItemsData = await prisma.item.findMany({
      where: { id: { in: topItemIds } },
      select: { id: true, name: true, mvpp: true },
    });

    const topItemsByUsage = topMovements.map(m => {
      const item = topItemsData.find(i => i.id === m.itemId);
      return { name: item?.name || 'Unknown', mvpp: item?.mvpp || '', count: m._count.id };
    });

    res.json({
      totalItems,
      activeItems,
      outOfStock,
      lowStock,
      totalStockValue: req.user?.role === 'EMPLOYEE' ? 0 : totalStockValue,
      movementsToday,
      alerts,
      categoryBreakdown,
      topItemsByUsage,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// GET /api/items?q=&type=VPP&all=true&sortBy=stock&sortDir=asc
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { q, type, all, sortBy, sortDir } = req.query;
  const isEmployee = req.user?.role === 'EMPLOYEE';

  // Build orderBy
  let orderBy: any = { name: 'asc' };
  if (sortBy === 'price') {
    orderBy = { price: sortDir === 'desc' ? 'desc' : 'asc' };
  } else if (sortBy === 'updatedAt') {
    orderBy = { updatedAt: sortDir === 'desc' ? 'desc' : 'asc' };
  } else if (sortBy === 'name') {
    orderBy = { name: sortDir === 'desc' ? 'desc' : 'asc' };
  }
  // sortBy=stock handled client-side since it's a joined field

  const items = await prisma.item.findMany({
    where: {
      ...( (all === 'true' && !isEmployee) ? {} : { isActive: true }),
      ...(type ? { itemType: String(type) } : {}),
      ...(q ? {
        OR: [
          { name: { contains: String(q), mode: 'insensitive' } },
          { mvpp: { contains: String(q), mode: 'insensitive' } },
        ],
      } : {}),
    },
    include: {
      stocks: { where: { warehouseCode: 'MAIN' } },
    },
    orderBy,
  });

  const result = items.map(item => ({
    ...item,
    price: isEmployee ? 0 : item.price,
    stock: item.stocks[0]?.quantityOnHand ?? 0,
    reserved: item.stocks[0]?.quantityReserved ?? 0,
  }));

  // Client-side sort for stock (joined field)
  if (sortBy === 'stock') {
    result.sort((a, b) => sortDir === 'desc' ? b.stock - a.stock : a.stock - b.stock);
  }

  res.json(result);
});

// GET /api/items/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const item = await prisma.item.findUnique({
    where: { id: req.params.id },
    include: { stocks: true },
  });
  if (!item) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(item);
});

// POST /api/items  (ADMIN only)
router.post('/', requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const { mvpp, name, category, unit, price, quota, itemType } = req.body;
  const item = await prisma.item.create({
    data: { mvpp, name, category, unit, price, quota: quota ?? 100, itemType: itemType ?? 'VPP' },
  });
  await prisma.stock.create({
    data: { itemId: item.id, warehouseCode: 'MAIN', quantityOnHand: 0 },
  });
  res.status(201).json(item);
});

// PATCH /api/items/:id  (ADMIN only)
router.patch('/:id', requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const item = await prisma.item.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(item);
});

export default router;
