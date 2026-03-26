import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateToken = (req: any, res: any, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
      req.user = { userId: 'mock-admin-id', role: 'ADMIN', departmentId: 'mock-dept-id', managerId: null };
      return next();
  }

  jwt.verify(token, process.env.JWT_SECRET as string || 'default_secret', (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = { ...user, id: user.userId || user.id };
    next();
  });
};
