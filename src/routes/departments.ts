import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../lib/auth';
import { z } from 'zod';

const router = Router();

const departmentSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  isActive: z.boolean().optional(),
  managerUserId: z.string().optional().nullable(),
});

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const departments = await prisma.department.findMany({
    include: {
      _count: {
        select: { users: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch managers for the departments in a second step or via relation
  // Since Department has managerUserId, let's fetch those names
  const managerIds = departments.map(d => d.managerUserId).filter(Boolean) as string[];
  const managers = await prisma.user.findMany({
    where: { id: { in: managerIds } },
    select: { id: true, fullName: true }
  });

  const managerMap = new Map(managers.map(m => [m.id, m.fullName]));

  const flattenedDepts = departments.map(d => ({
    id: d.id,
    code: d.code,
    name: d.name,
    isActive: d.isActive,
    managerUserId: d.managerUserId,
    managerName: d.managerUserId ? managerMap.get(d.managerUserId) : null,
    userCount: d._count.users,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt
  }));

  res.json({ data: flattenedDepts });
});

// POST /api/departments - ADMIN only
router.post('/', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = departmentSchema.parse(req.body);
    const existing = await prisma.department.findUnique({ where: { code: data.code } });
    if (existing) {
      return res.status(400).json({ error: 'Mã phòng ban đã tồn tại' });
    }
    const department = await prisma.department.create({
      data: {
        code: data.code,
        name: data.name,
        isActive: data.isActive ?? true,
        managerUserId: data.managerUserId,
      }
    });
    res.status(201).json({ data: department });
  } catch (error: any) {
    console.error('[POST /api/departments] Error:', error);
    res.status(400).json({ error: error.message || 'Dữ liệu không hợp lệ' });
  }
});

// PUT /api/departments/:id - ADMIN only
router.put('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = departmentSchema.parse(req.body);
    const department = await prisma.department.update({
      where: { id: req.params.id as string },
      data: {
        code: data.code,
        name: data.name,
        isActive: data.isActive,
        managerUserId: data.managerUserId,
      }
    });
    res.json({ data: department });
  } catch (error: any) {
    console.error(`[PUT /api/departments/${req.params.id}] Error:`, error);
    res.status(400).json({ error: error.message || 'Lỗi xử lý yêu cầu' });
  }
});

// PATCH /api/departments/:id/status - ADMIN only
router.patch('/:id/status', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    await prisma.department.update({
      where: { id: req.params.id as string },
      data: { isActive }
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error(`[PATCH /api/departments/${req.params.id}/status] Error:`, error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
