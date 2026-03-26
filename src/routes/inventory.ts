import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../lib/auth';
import { MovementType } from '@prisma/client';

const router = Router();
router.use(authMiddleware);

// GET /api/inventory/stocks - Get list of stocks in MAIN warehouse
router.get('/stocks', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, category } = req.query;

    const stocks = await prisma.stock.findMany({
      where: {
        warehouseCode: 'MAIN',
        item: {
          isActive: true,
          ...(category ? { category: String(category) } : {}),
          ...(q ? {
            OR: [
              { name: { contains: String(q), mode: 'insensitive' } },
              { mvpp: { contains: String(q), mode: 'insensitive' } },
            ],
          } : {}),
        },
      },
      include: {
        item: true,
      },
      orderBy: {
        item: { name: 'asc' }
      }
    });

    res.json(stocks);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// GET /api/inventory/movements - Get stock movement history
router.get('/movements', async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId, type, limit = '200', offset = '0', q } = req.query;
    const userRole = (req as any).user.role;
    const userId = (req as any).user.userId;
    const userDeptId = (req as any).user.departmentId;

    let userDept = '';
    if (userDeptId) {
      const dept = await prisma.department.findUnique({ where: { id: userDeptId } });
      userDept = dept?.name || '';
    }

    let baseWhere: any = {
      warehouseCode: 'MAIN',
      ...(itemId ? { itemId: String(itemId) } : {}),
      ...(type ? { movementType: type as MovementType } : {}),
    };

    if (q) {
      baseWhere = {
        ...baseWhere,
        OR: [
          { refId: { contains: String(q) } },
          { reason: { contains: String(q) } },
          { item: { name: { contains: String(q), mode: 'insensitive' } } },
          { item: { mvpp: { contains: String(q), mode: 'insensitive' } } }
        ]
      }
    }

    if (userRole === 'EMPLOYEE') {
      const userRequests = await prisma.request.findMany({ where: { requesterId: userId }, select: { id: true } });
      const requestIds = userRequests.map(r => r.id);
      baseWhere = {
        ...baseWhere,
        refType: 'Request',
        refId: { in: requestIds },
        movementType: 'ISSUE'
      };
    } else if (userRole === 'MANAGER') {
      const deptRequests = await prisma.request.findMany({ where: { department: userDept }, select: { id: true } });
      const requestIds = deptRequests.map(r => r.id);
      baseWhere = {
        ...baseWhere,
        refType: 'Request',
        refId: { in: requestIds },
        movementType: { in: ['ISSUE', 'RETURN'] }
      };
    }

    const movements = await prisma.stockMovement.findMany({
      where: baseWhere,
      include: {
        item: { select: { name: true, mvpp: true } },
        createdBy: { select: { fullName: true, username: true, department: { select: { name: true } } } }
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Number(limit),
      skip: Number(offset),
    });

    res.json(movements);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// POST /api/inventory/receive - Receive new stock for an item
router.post('/receive', requireRole('ADMIN', 'WAREHOUSE'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId, qty, refType, refId, reason } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ, không tìm thấy userId' });
      return;
    }

    if (!itemId || !qty || Number(qty) <= 0) {
      res.status(400).json({ error: 'itemId and a positive qty are required' });
      return;
    }

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get current stock
      let stock = await tx.stock.findUnique({
        where: { itemId_warehouseCode: { itemId, warehouseCode: 'MAIN' } }
      });

      if (!stock) {
        stock = await tx.stock.create({
          data: { itemId, warehouseCode: 'MAIN', quantityOnHand: 0 }
        });
      }

      const beforeQty = stock.quantityOnHand;
      const afterQty = beforeQty + Number(qty);

      // Update stock
      const updatedStock = await tx.stock.update({
        where: { id: stock.id },
        data: { quantityOnHand: afterQty }
      });

      // Create movement
      const movement = await tx.stockMovement.create({
        data: {
          warehouseCode: 'MAIN',
          movementType: 'RECEIVE',
          qty: Number(qty),
          beforeQty,
          afterQty,
          refType: refType || null,
          refId: refId || null,
          reason: reason || null,
          item: { connect: { id: itemId } },
          createdBy: { connect: { id: userId } },
        }
      });

      return { updatedStock, movement };
    });

    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// POST /api/inventory/adjust - Ad-hoc adjustment of stock level
router.post('/adjust', requireRole('ADMIN', 'WAREHOUSE'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId, newQty, reason } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ, không tìm thấy userId' });
      return;
    }

    if (!itemId || newQty === undefined || Number(newQty) < 0) {
      res.status(400).json({ error: 'itemId and a non-negative newQty are required' });
      return;
    }

    if (!reason) {
      res.status(400).json({ error: 'Reason is required for manual stock adjustment' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      let stock = await tx.stock.findUnique({
        where: { itemId_warehouseCode: { itemId, warehouseCode: 'MAIN' } }
      });

      if (!stock) {
        stock = await tx.stock.create({
          data: { itemId, warehouseCode: 'MAIN', quantityOnHand: 0 }
        });
      }

      const beforeQty = stock.quantityOnHand;
      const afterQty = Number(newQty);
      const diff = afterQty - beforeQty;

      if (diff === 0) {
        throw new Error('New quantity matches current stock. No adjustment needed.');
      }

      // Update stock
      const updatedStock = await tx.stock.update({
        where: { id: stock.id },
        data: {
          quantityOnHand: afterQty,
          lastCountedAt: new Date(),
        }
      });

      // Create movement
      const movement = await tx.stockMovement.create({
        data: {
          warehouseCode: 'MAIN',
          movementType: 'ADJUSTMENT',
          qty: diff,
          beforeQty,
          afterQty,
          reason: reason || null,
          item: { connect: { id: itemId } },
          createdBy: { connect: { id: userId } },
        }
      });

      return { updatedStock, movement };
    });

    res.status(200).json(result);
  } catch (err: any) {
    if (err.message.includes('No adjustment needed')) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

export default router;
