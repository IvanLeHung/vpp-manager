import { prisma } from './prisma';

export async function notifyEvent(userId: string, type: string, title: string, message: string, requestId?: string) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        requestId
      }
    });
  } catch (error) {
    console.error('Lỗi khi gửi thông báo:', error);
  }
}
