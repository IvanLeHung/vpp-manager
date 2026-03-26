// @ts-nocheck
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthPayload } from '../lib/auth';

const router = Router();
router.use(authMiddleware);

type AuthRequest = Request & { user?: AuthPayload };

// Lấy danh sách thông báo của tôi
router.get('/', async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const notifications = await prisma.notification.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  
  const unreadCount = await prisma.notification.count({
    where: { userId: user.userId, isRead: false }
  });

  res.json({ data: notifications, unreadCount });
});

// Đánh dấu đã đọc
router.patch('/:id/read', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
  
  if (!notif) {
    res.status(404).json({ error: 'Không tìm thấy' }); return;
  }
  if (notif.userId !== user.userId) {
    res.status(403).json({ error: 'Không quyền truy cập' }); return;
  }

  await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true }
  });

  res.json({ success: true });
});

// Đánh dấu đã đọc toàn bộ
router.post('/read-all', async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  await prisma.notification.updateMany({
    where: { userId: user.userId, isRead: false },
    data: { isRead: true }
  });
  res.json({ success: true });
});

export default router;
