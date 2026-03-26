import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRouter from './routes/auth';
import itemsRouter from './routes/items';
import requestsRouter from './routes/requests';
import notificationsRouter from './routes/notifications';
import publicRouter from './routes/public';
import usersRouter from './routes/users';
import inventoryRouter from './routes/inventory';
import purchasesRouter from './routes/purchases';
import receiptsRouter from './routes/receipts';
import reportsRouter from './routes/reports';
import departmentsRouter from './routes/departments';
const app = express();
const port = process.env.PORT || 3001;

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// Uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/public', publicRouter);
app.use('/api/users', usersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/departments', departmentsRouter);
// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', version: '2.5.0', timestamp: new Date().toISOString() });
});

// Debug Route: Check DB Columns (as requested by user)
import { prisma } from './lib/prisma';
app.get('/api/debug/db-user-columns', async (_req, res) => {
  try {
    const columns: any = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      ORDER BY ordinal_position;
    `);
    const dbUrl = process.env.DATABASE_URL || '';
    res.json({ 
      version: '2.5.0-DEBUG',
      dbUrlPrefix: dbUrl.split('@')[1] || 'local', 
      columns 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`🚀 VPP Backend API running on http://localhost:${port}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/items`);
  console.log(`   GET  /api/requests`);
  console.log(`   POST /api/requests`);
  console.log(`   POST /api/requests/:id/approve`);
  console.log(`   POST /api/requests/:id/reject`);
});
