import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  console.log('[AUTH_LOGIN_V2] route mới đã chạy');
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'username và password là bắt buộc' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ 
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        fullName: true,
        role: true,
        isActive: true,
        departmentId: true,
        managerId: true,
      }
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Tài khoản không tồn tại hoặc đã bị khóa' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Sai mật khẩu' });
      return;
    }

    const token = signToken({ 
      userId: user.id, 
      role: user.role, 
      departmentId: user.departmentId ?? null,
      managerId: user.managerId ?? null
    });

    res.setHeader('X-Auth-Version', 'AUTH_LOGIN_V2');
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        departmentId: user.departmentId,
        managerId: user.managerId,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('[AUTH_LOGIN_V2] login error:', error);
    res.status(500).json({
      error: 'Lỗi đăng nhập',
      detail: error?.message || 'Unknown error',
    });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'No token' }); return; }

  try {
    const { prisma: _p, ...rest } = { prisma, rest: {} };
    const { signToken: _s, ...a } = { signToken, rest: {} };
    // Giải token bằng import trực tiếp
    const jwt = require('jsonwebtoken');
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'vpp-secret-key-2026');
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, fullName: true, username: true, role: true, departmentId: true, managerId: true, avatar: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
