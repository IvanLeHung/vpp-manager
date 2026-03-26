import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/dashboard', authenticateToken, async (req: any, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.userId;
    const userDeptId = req.user.departmentId;

    let userDept = '';
    if (userDeptId) {
      const dept = await prisma.department.findUnique({ where: { id: userDeptId } });
      userDept = dept?.name || '';
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Build base queries based on role
    const reqWhere: any = {};
    if (userRole === 'EMPLOYEE') reqWhere.requesterId = userId;
    else if (userRole === 'MANAGER') reqWhere.department = userDept;

    // 1. Operational: Basic Counts
    const totalRequests = await prisma.request.count({
      where: { ...reqWhere, createdAt: { gte: startOfMonth } }
    });

    const purchases = await prisma.purchaseOrder.findMany({
      where: { createdAt: { gte: startOfMonth }, status: { notIn: ['DRAFT', 'CANCELLED', 'REJECTED'] } }
    });
    const totalPurchasesAmount = purchases.reduce((sum, po) => sum + Number(po.totalAmount || 0), 0);
    
    // 2. Operational: Pending Actions / Bottlenecks
    let pendingRequests = 0; let pendingPurchases = 0; let pendingReceipts = 0;
    
    if (userRole === 'EMPLOYEE') {
      pendingRequests = await prisma.request.count({ where: { requesterId: userId, status: { notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'] } } });
    } else if (userRole === 'MANAGER') {
      pendingRequests = await prisma.request.count({ where: { department: userDept, status: 'PENDING_MANAGER' } });
    } else if (userRole === 'ADMIN') {
      pendingRequests = await prisma.request.count({ where: { status: 'PENDING_ADMIN' } });
      pendingPurchases = await prisma.purchaseOrder.count({ where: { status: 'PENDING_APPROVAL' } });
    } else if (userRole === 'WAREHOUSE') {
      pendingRequests = await prisma.request.count({ where: { status: { in: ['APPROVED', 'READY_TO_ISSUE', 'PARTIALLY_ISSUED'] } } });
      pendingReceipts = await prisma.receipt.count({ where: { status: 'PENDING' } });
    }

    // 3. Analytical: Trend Data (Last 30 days) - Warehouse & Admin & Manager
    let trendData: any[] = [];
    let topConsumed: any[] = [];
    let slowMoving: any[] = [];
    let fillRate = 0;
    let abcAnalysis: any = { A: 0, B: 0, C: 0 };
    let departmentHeatmap: any[] = [];
    
    // Predictive
    const stockoutRisks: any[] = [];
    let budgetForecast = 0;
    let slaRisks: any[] = [];

    // ONLY compute heavy analytics for non-employees
    if (userRole !== 'EMPLOYEE') {
      // Stock Movements
      const movements = await prisma.stockMovement.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        include: { item: true }
      });

      // Group by Date for Trends
      const trendMap = new Map<string, { date: string, nhap: number, xuat: number }>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        trendMap.set(d, { date: d.substring(5), nhap: 0, xuat: 0 }); // Use MM-DD for cleaner charts
      }

      const itemUsageMap = new Map<string, { item: any, totalQty: number, totalValue: number }>();

      movements.forEach(m => {
        const fullDate = m.createdAt.toISOString().split('T')[0];
        const displayDate = fullDate.substring(5);
        if (trendMap.has(displayDate)) {
          const entry = trendMap.get(displayDate)!;
          if (m.movementType === 'RECEIVE' || m.movementType === 'TRANSFER_IN') entry.nhap += m.qty;
          if (m.movementType === 'ISSUE') entry.xuat += Math.abs(m.qty);
        }

        if (m.movementType === 'ISSUE') {
          const usage = Math.abs(m.qty);
          const current = itemUsageMap.get(m.itemId) || { item: m.item, totalQty: 0, totalValue: 0 };
          current.totalQty += usage;
          current.totalValue += usage * Number(m.item.price);
          itemUsageMap.set(m.itemId, current);
        }
      });

      trendData = Array.from(trendMap.values());
      const usageArray = Array.from(itemUsageMap.values());

      // Top Consumed
      topConsumed = [...usageArray].sort((a, b) => b.totalQty - a.totalQty).slice(0, 5).map(x => ({
         name: x.item.name, mvpp: x.item.mvpp, quantity: x.totalQty
      }));

      // ABC Analysis (By Value)
      const sortedByValue = [...usageArray].sort((a, b) => b.totalValue - a.totalValue);
      const totalUsageValue = sortedByValue.reduce((sum, x) => sum + x.totalValue, 0);
      let cumulative = 0;
      sortedByValue.forEach(x => {
        cumulative += x.totalValue;
        const pct = cumulative / (totalUsageValue || 1);
        if (pct <= 0.7) abcAnalysis.A++;
        else if (pct <= 0.9) abcAnalysis.B++;
        else abcAnalysis.C++;
      });

      // Budget Forecast (Based on last 30 days * 1.05 buffer factor)
      budgetForecast = totalUsageValue * 1.05;

      // Fill Rate (Service Level)
      const reqLines = await prisma.requestLine.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, status: { notIn: ['DRAFT', 'CANCELLED', 'REJECTED'] } }
      });
      let totalReq = 0; let totalDelivered = 0;
      reqLines.forEach(l => { totalReq += l.qtyRequested; totalDelivered += l.qtyDelivered; });
      fillRate = totalReq > 0 ? Math.round((totalDelivered / totalReq) * 100) : 100;

      // Stockout Risks & Slow Moving
      const allStocks = await prisma.stock.findMany({ include: { item: true } });
      allStocks.forEach(s => {
        const usage = itemUsageMap.get(s.itemId)?.totalQty || 0;
        const dailyAvg = usage / 30;
        if (dailyAvg > 0) {
          const daysLeft = s.quantityOnHand / dailyAvg;
          if (daysLeft < 15 && daysLeft >= 0) {
            stockoutRisks.push({
              mvpp: s.item.mvpp,
              name: s.item.name,
              stock: s.quantityOnHand,
              dailyAvg: dailyAvg.toFixed(1),
              daysLeft: Math.floor(daysLeft)
            });
          }
        } else if (s.quantityOnHand > 0) {
          slowMoving.push({ mvpp: s.item.mvpp, name: s.item.name, stock: s.quantityOnHand });
        }
      });
      stockoutRisks.sort((a, b) => a.daysLeft - b.daysLeft).splice(5);

      // SLA Risks (Pending > 24h)
      const pendingReqs = await prisma.request.findMany({
        where: { status: { in: ['PENDING_MANAGER', 'PENDING_ADMIN', 'APPROVED', 'READY_TO_ISSUE'] } }
      });
      slaRisks = pendingReqs.filter(r => (now.getTime() - r.createdAt.getTime()) > 24 * 60 * 60 * 1000).map(r => ({
        id: r.id, department: r.department, hoursPending: Math.floor((now.getTime() - r.createdAt.getTime()) / 3600000), status: r.status
      }));
    }

    res.json({
      role: userRole,
      operational: {
        totalRequests,
        totalPurchases: { count: purchases.length, amount: totalPurchasesAmount },
        pendingActions: { requests: pendingRequests, purchases: pendingPurchases, receipts: pendingReceipts },
        fillRate,
        slaPerformance: 94 // Base line SLA assumption
      },
      analytical: {
        trendData,
        topConsumed,
        slowMoving: slowMoving.slice(0, 5),
        abcAnalysis,
        departmentHeatmap
      },
      predictive: {
        stockoutRisks,
        budgetForecast,
        slaRisks: slaRisks.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

export default router;
