// @ts-nocheck
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../lib/auth';
import { z } from 'zod';

const router = Router();

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(2),
  departmentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'WAREHOUSE'])
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  departmentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'WAREHOUSE']).optional(),
  isActive: z.boolean().optional()
});

const passwordSchema = z.object({
  newPassword: z.string().min(6)
});

// All routes require ADMIN or MANAGER
router.use(authMiddleware, requireRole('ADMIN', 'MANAGER'));

// GET /api/users
router.get('/', async (req: Request, res: Response) => {
  const userRole = (req as any).user.role;
  const userDeptId = (req as any).user.departmentId;
  const { role, isActive } = req.query;
  
  const whereClause: any = {};
  if (userRole === 'MANAGER' && userDeptId) {
    whereClause.departmentId = userDeptId;
  }
  if (role) whereClause.role = role;
  if (isActive === 'true') whereClause.isActive = true;
  if (isActive === 'false') whereClause.isActive = false;

  const users = await prisma.user.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, fullName: true, username: true } }
    }
  });

  const flattenedUsers = users.map(u => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    isActive: u.isActive,
    departmentId: u.departmentId,
    departmentName: u.department?.name || null,
    managerId: u.managerId,
    managerName: u.manager?.fullName || null,
    createdAt: u.createdAt
  }));

  res.json({ data: flattenedUsers });
});

// POST /api/users - ADMIN only
router.post('/', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ 
      where: { username: data.username },
      select: { id: true, username: true }
    });
    if (existing) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    }

    if (data.role === 'EMPLOYEE' && !data.managerId) {
      return res.status(400).json({ error: 'Nhân viên (EMPLOYEE) bắt buộc phải chọn Quản lý trực tiếp' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        fullName: data.fullName,
        departmentId: data.departmentId,
        managerId: data.managerId,
        role: data.role
      },
      select: {
        id: true, username: true, fullName: true, role: true, departmentId: true, managerId: true, isActive: true
      }
    });
    res.status(201).json({ data: user });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Dữ liệu không hợp lệ' });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id.trim();
    console.log(`[users.put] Attempting to update user with id: "${id}"`);
    const data = updateUserSchema.parse(req.body);
    
    const currentUser = (req as any).user;
    const existing = await prisma.user.findUnique({ 
      where: { id },
      select: { id: true, departmentId: true, managerId: true }
    });
    if (!existing) {
      console.log(`[users.put] Error: User id "${id}" not found in DB!`);
      return res.status(404).json({ error: `Không tìm thấy tài khoản (ID: ${id})` });
    }

    if (currentUser.role === 'MANAGER') {
       if (existing.departmentId !== currentUser.departmentId) {
           return res.status(403).json({ error: 'Không thể sửa tài khoản ngoài bộ phận của bạn' });
       }
       // Manager doesn't get to override role or active state currently
       data.role = undefined;
       data.isActive = undefined;
    }

    if (data.role && data.role !== 'EMPLOYEE') {
       data.managerId = null;
    } else if (data.role === 'EMPLOYEE' && !data.managerId && !existing.managerId) {
       return res.status(400).json({ error: 'Nhân viên (EMPLOYEE) bắt buộc phải chọn Quản lý trực tiếp' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        fullName: data.fullName,
        departmentId: data.departmentId,
        managerId: data.managerId,
        role: data.role,
        isActive: data.isActive
      },
      select: {
        id: true, username: true, fullName: true, role: true, departmentId: true, managerId: true, isActive: true
      }
    });
    console.log(`[users.put] Successfully updated user ${id}`);
    res.json({ data: user });
  } catch (error: any) {
    console.error(`[users.put] Error updating user:`, error.message);
    res.status(400).json({ error: error.message || 'Lỗi xử lý yêu cầu' });
  }
});

// PATCH /api/users/:id/password - ADMIN only
router.patch('/:id/password', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { newPassword } = passwordSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash }
    });
    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
