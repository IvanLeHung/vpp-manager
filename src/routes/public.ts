import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const router = Router();

const publicRequestSchema = z.object({
  guestName: z.string().min(1, 'Họ tên là bắt buộc'),
  guestPhone: z.string().min(1, 'SĐT/Phòng ban là bắt buộc'),
  purpose: z.string().optional(),
  lines: z.array(z.object({
    itemId: z.string().uuid(),
    qtyRequested: z.number().int().min(1),
    note: z.string().optional(),
  })).min(1, 'Phải có ít nhất 1 dòng hàng'),
});

function validateBody<T>(schema: z.ZodType<T>, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', code: 'VALIDATION_ERROR', details: result.error.flatten() });
    return null;
  }
  return result.data;
}

// GET /api/public/items
router.get('/items', async (req: Request, res: Response): Promise<void> => {
  const { q, type } = req.query;
  const items = await prisma.item.findMany({
    where: {
      isActive: true,
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
    orderBy: { name: 'asc' },
  });

  const result = items.map(item => ({
    ...item,
    stock: item.stocks[0]?.quantityOnHand ?? 0,
    reserved: item.stocks[0]?.quantityReserved ?? 0,
  }));

  res.json(result);
});

// POST /api/public/requests
router.post('/requests', async (req: Request, res: Response): Promise<void> => {
  const body = validateBody(publicRequestSchema, req.body, res);
  if (!body) return;

  // Find or create guest user
  let guestUser = await prisma.user.findUnique({ 
    where: { username: 'guest' }, 
    include: { 
      department: { select: { name: true } } 
    } 
  });
  if (!guestUser) {
    guestUser = await prisma.user.create({
      data: {
        username: 'guest',
        passwordHash: 'guest',
        fullName: 'Khách (Guest)',
        role: 'EMPLOYEE',
      },
      include: { 
        department: { select: { name: true } } 
      }
    });
  }

  const id = `PDX-${Date.now().toString().slice(-8)}`;
  
  const purposeString = `Khách hỏi: ${body.guestName} - ${body.guestPhone}${body.purpose ? ' - ' + body.purpose : ''}`;

  const lineData = await Promise.all(body.lines.map(async (l) => {
    const stock = await prisma.stock.findUnique({
      where: { itemId_warehouseCode: { itemId: l.itemId, warehouseCode: 'MAIN' } },
    });
    const item = await prisma.item.findUnique({ where: { id: l.itemId }, select: { price: true, quota: true } });
    return {
      itemId: l.itemId,
      qtyRequested: l.qtyRequested,
      note: l.note ?? '',
      status: 'PENDING' as const, // Guest request submit immediately to pending
      availableQtyAtRequest: stock?.quantityOnHand ?? 0,
      quotaRemainingAtRequest: item?.quota ?? 100,
      unitPrice: item?.price,
      lineAmount: item?.price ? new Prisma.Decimal(Number(item.price) * l.qtyRequested) : undefined,
    };
  }));

  const request = await prisma.request.create({
    data: {
      id,
      requesterId: guestUser.id,
      department: guestUser.department?.name || 'Khách',
      requestType: 'Đột xuất',
      priority: 'Thường',
      purpose: purposeString,
      status: 'PENDING' as any,
      submittedAt: new Date(),
      lines: { create: lineData },
    },
    include: { lines: { include: { item: { select: { name: true, mvpp: true, unit: true } } } } },
  });

  res.status(201).json(request);
});

export default router;
