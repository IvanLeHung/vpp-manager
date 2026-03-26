// @ts-nocheck
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthPayload, requireRole } from '../lib/auth';
import {
  createRequestSchema,
  approveSchema,
  rejectSchema,
  issueSchema,
  withdrawSchema,
  returnSchema,
  cancelSchema,
} from '../lib/validators';
import { Prisma } from '@prisma/client';
import { upload } from '../lib/upload';
import { notifyEvent } from '../lib/notifier';

const router = Router();
router.use(authMiddleware);

type AuthRequest = Request & { user?: AuthPayload };

// ─── Helper: chuẩn hoá lỗi ──────────────────────────────────
function apiError(res: Response, status: number, message: string, code?: string) {
  return res.status(status).json({ error: message, code: code ?? `HTTP_${status}` });
}

function validateBody<T>(schema: { safeParse: (d: unknown) => { success: boolean; data?: T; error?: any } }, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', code: 'VALIDATION_ERROR', details: result.error.flatten() });
    return null;
  }
  return result.data as T;
}

// ─── Idempotency check helper ────────────────────────────────
async function checkIdempotency(key: string | undefined, res: Response): Promise<boolean> {
  if (!key) return false;
  const existing = await prisma.approvalHistory.findUnique({ where: { idempotencyKey: key } });
  if (existing) {
    res.status(200).json({ message: 'Idempotent: action already performed', action: existing.action, createdAt: existing.createdAt });
    return true;
  }
  return false;
}

// ──────────────────────────────────────────────────────────────
//  GET /api/requests
// ──────────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { status, page = '1', limit = '20' } = req.query;

  const where: Prisma.RequestWhereInput = {
    ...(user.role === 'ADMIN' ? {} :
      user.role === 'MANAGER' ? { requester: { departmentId: user.departmentId } } :
      { requesterId: user.userId }),
    ...(status ? { status: status as any } : {}),
  };

  const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
  const take = Math.min(parseInt(String(limit)), 100);

  const [requests, total] = await Promise.all([
    prisma.request.findMany({
      where,
      include: {
        requester: { select: { fullName: true, department: { select: { name: true } } } },
        lines: { select: { id: true, status: true, qtyRequested: true, qtyApproved: true, qtyDelivered: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.request.count({ where }),
  ]);

  res.json({ data: requests, total, page: parseInt(String(page)), limit: take });
});

// ──────────────────────────────────────────────────────────────
//  GET /api/requests/:id
// ──────────────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const request = await prisma.request.findUnique({
    where: { id: req.params.id },
    include: {
      requester: { select: { fullName: true, department: { select: { name: true } }, role: true } },
      lines: { include: { item: { include: { stocks: { where: { warehouseCode: 'MAIN' } } } }, substituteItem: { select: { mvpp: true, name: true } } } },
      approvalHistories: { include: { approver: { select: { fullName: true, role: true } } }, orderBy: { createdAt: 'desc' } },
      printLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      attachments: true,
      snapshots: { orderBy: { version: 'desc' }, take: 5 },
    },
  });
  if (!request) { apiError(res, 404, 'Không tìm thấy phiếu'); return; }
  res.json(request);
});

// ──────────────────────────────────────────────────────────────
//  POST /api/requests  — Tạo nháp
// ──────────────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const body = validateBody(createRequestSchema, req.body, res);
  if (!body) return;

  const id = `PDX-${Date.now().toString().slice(-8)}`;

  const requester = await prisma.user.findUnique({ 
    where: { id: user.userId }, 
    include: { 
      department: { select: { name: true } } 
    } 
  });
  if (!requester) { apiError(res, 404, 'User not found'); return; }

  const lineData = await Promise.all(body.lines.map(async (l) => {
    const stock = await prisma.stock.findUnique({
      where: { itemId_warehouseCode: { itemId: l.itemId, warehouseCode: body.warehouseCode } },
    });
    const item = await prisma.item.findUnique({ where: { id: l.itemId }, select: { price: true, quota: true } });
    return {
      itemId: l.itemId,
      qtyRequested: l.qtyRequested,
      note: l.note ?? '',
      status: 'DRAFT' as const,
      availableQtyAtRequest: stock?.quantityOnHand ?? 0,
      quotaRemainingAtRequest: item?.quota ?? 100,
      unitPrice: item?.price,
      lineAmount: item?.price ? new Prisma.Decimal(Number(item.price) * l.qtyRequested) : undefined,
    };
  }));

  const request = await prisma.request.create({
    data: {
      id,
      requesterId: user.userId,
      department: requester.department?.name ?? 'N/A', 
      requestType: body.requestType,
      priority: body.priority,
      purpose: body.purpose,
      costCenter: body.costCenter,
      projectCode: body.projectCode,
      warehouseCode: body.warehouseCode,
      neededByDate: body.neededByDate ? new Date(body.neededByDate) : undefined,
      status: 'DRAFT',
      lines: { create: lineData },
    },
    include: { lines: { include: { item: { select: { name: true, mvpp: true, unit: true } } } } },
  });

  res.status(201).json(request);
});

// ──────────────────────────────────────────────────────────────
//  PATCH /api/requests/:id  — Sửa phiếu nháp
// ──────────────────────────────────────────────────────────────
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  
  const request = await prisma.request.findUnique({ where: { id: req.params.id }, include: { lines: true } });
  if (!request) { apiError(res, 404, 'Không tìm thấy phiếu'); return; }
  if (request.requesterId !== user.userId) { apiError(res, 403, 'Không quyền sửa phiếu này', 'FORBIDDEN'); return; }
  if (request.status !== 'DRAFT' && request.status !== 'RETURNED') {
    apiError(res, 409, `Chỉ có thể sửa phiếu DRAFT hoặc RETURNED`); return;
  }

  const data = req.body;
  
  await prisma.$transaction(async (tx) => {
    // Snapshot state cũ
    await tx.requestSnapshot.create({
      data: {
        requestId: request.id,
        version: request.version,
        snapshotJson: request as any,
        changedById: user.userId,
        changedReason: data.reason ?? 'Cập nhật nháp',
      }
    });

    if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
      await tx.requestLine.deleteMany({ where: { requestId: request.id } });
      const newLines = await Promise.all(data.lines.map(async (l: any) => {
        const item = await tx.item.findUnique({ where: { id: l.itemId }, select: { price: true } });
        return {
          itemId: l.itemId,
          qtyRequested: l.qtyRequested,
          note: l.note ?? '',
          status: 'DRAFT' as const,
          unitPrice: item?.price,
          lineAmount: item?.price ? new Prisma.Decimal(Number(item.price) * l.qtyRequested) : undefined,
        };
      }));
      await tx.request.update({
        where: { id: request.id },
        data: {
          requestType: data.requestType ?? request.requestType,
          priority: data.priority ?? request.priority,
          purpose: data.purpose ?? request.purpose,
          costCenter: data.costCenter ?? request.costCenter,
          projectCode: data.projectCode ?? request.projectCode,
          neededByDate: data.neededByDate ? new Date(data.neededByDate) : request.neededByDate,
          version: { increment: 1 },
          rowVersion: { increment: 1 },
          lines: { create: newLines },
        }
      });
    } else {
      await tx.request.update({
         where: { id: request.id },
         data: {
          requestType: data.requestType ?? request.requestType,
          priority: data.priority ?? request.priority,
          purpose: data.purpose ?? request.purpose,
          costCenter: data.costCenter ?? request.costCenter,
          projectCode: data.projectCode ?? request.projectCode,
          neededByDate: data.neededByDate ? new Date(data.neededByDate) : request.neededByDate,
          version: { increment: 1 },
          rowVersion: { increment: 1 },
         }
      });
    }
  });

  res.json({ success: true, message: 'Cập nhật thành công' });
});

// ──────────────────────────────────────────────────────────────
//  POST /api/requests/:id/submit  — Gửi duyệt (DRAFT → PENDING_MANAGER)
// ──────────────────────────────────────────────────────────────
router.post('/:id/submit', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const request = await prisma.request.findUnique({ where: { id: req.params.id }, include: { lines: true } });
  if (!request) { apiError(res, 404, 'Không tìm thấy phiếu'); return; }
  if (request.requesterId !== user.userId) { apiError(res, 403, 'Không có quyền thao tác phiếu này', 'FORBIDDEN'); return; }
  if (request.status !== 'DRAFT' && request.status !== 'RETURNED') {
    apiError(res, 409, `Không thể submit phiếu đang ở trạng thái ${request.status}`, 'INVALID_STATUS'); return;
  }
  if (request.lines.length === 0) { apiError(res, 400, 'Phiếu chưa có dòng hàng nào', 'EMPTY_LINES'); return; }

  const requester = await prisma.user.findUnique({ 
    where: { id: request.requesterId },
    select: { id: true, role: true, managerId: true }
  });
  if (!requester) { apiError(res, 404, 'Requester not found'); return; }

  let nextStatus: 'PENDING_MANAGER' | 'PENDING_ADMIN' = 'PENDING_MANAGER';
  let nextApproverId: string | null = null;

  if (requester.role === 'EMPLOYEE') {
    if (!requester.managerId) {
       return apiError(res, 400, 'Tài khoản nhân viên chưa được gán Quản lý trực tiếp. Vui lòng liên hệ Admin.', 'MISSING_MANAGER');
    }
    nextStatus = 'PENDING_MANAGER';
    nextApproverId = requester.managerId;
  } else if (requester.role === 'MANAGER' || requester.role === 'ADMIN') {
    nextStatus = 'PENDING_ADMIN';
    nextApproverId = null;
  }

  await prisma.$transaction([
    prisma.request.update({
      where: { id: req.params.id },
      data: { 
        status: nextStatus, 
        currentApproverId: nextApproverId,
        submittedAt: new Date(), 
        rowVersion: { increment: 1 } 
      },
    }),
    prisma.requestLine.updateMany({
      where: { requestId: req.params.id, status: 'DRAFT' },
      data: { status: 'PENDING' },
    }),
  ]);

  res.json({ success: true, message: 'Phiếu đã được gửi cho Trưởng bộ phận xét duyệt' });
});

// ──────────────────────────────────────────────────────────────
//  POST /api/requests/:id/withdraw  — Thu hồi (PENDING → DRAFT)
// ──────────────────────────────────────────────────────────────
router.post('/:id/withdraw', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const body = validateBody(withdrawSchema, req.body, res);
  if (!body) return;

  const request = await prisma.request.findUnique({ where: { id: req.params.id } });
  if (!request) { apiError(res, 404, 'Không tìm thấy phiếu'); return; }
  if (request.requesterId !== user.userId) { apiError(res, 403, 'Không có quyền', 'FORBIDDEN'); return; }
  if (request.status !== 'PENDING_MANAGER' && request.status !== 'PENDING_ADMIN') {
    apiError(res, 409, `Chỉ thu hồi được phiếu đang Chờ duyệt`, 'INVALID_STATUS'); return;
  }

  await prisma.request.update({
    where: { id: req.params.id },
    data: { status: 'DRAFT', revisionReason: body.reason, rowVersion: { increment: 1 } },
  });

  res.json({ success: true, message: 'Phiếu đã được thu hồi về nháp' });
});

// ──────────────────────────────────────────────────────────────
//  POST /api/requests/:id/return  — Trả lại (MANAGER/ADMIN → RETURNED)
// ──────────────────────────────────────────────────────────────
router.post('/:id/return', requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const body = validateBody(returnSchema, req.body, res);
  if (!body) return;

  const request = await prisma.request.findUnique({ where: { id: req.params.id } });
  if (!request) { apiError(res, 404, 'Không tìm thấy phiếu'); return; }
  if (request.status !== 'PENDING_MANAGER' && request.status !== 'PENDING_ADMIN') {
    apiError(res, 409, 'Chỉ trả được phiếu đang Chờ duyệt', 'INVALID_STATUS'); return;
  }

  await prisma.$transaction([
    prisma.request.update({
      where: { id: req.params.id },
      data: { status: 'RETURNED', returnReason: body.reason, rowVersion: { increment: 1 } },
    }),
    prisma.approvalHistory.create({
      data: { requestId: req.params.id, approverId: user.userId, action: 'RETURNED', reason: body.reason },
    }),
  ]);

  res.json({ success: true, message: 'Phiếu đã được trả lại để bổ sung' });
});

// ──────────────────────────────────────────────────────────────
//  POST /api/requests/:id/cancel  — Hủy phiếu
// ──────────────────────────────────────────────────────────────
router.post('/:id/cancel', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const body = validateBody(cancelSchema, req.body, res);
  if (!body) return;

  if (await checkIdempotency(body.idempotencyKey, res)) return;

  const request = await prisma.request.findUnique({ where: { id: req.params.id } });
  if (!request) { apiError(res, 404, 'Không tìm thấy phiếu'); return; }

  const cancelableStatuses = ['DRAFT', 'PENDING_MANAGER', 'PENDING_ADMIN', 'RETURNED', 'APPROVED', 'READY_TO_ISSUE', 'WAITING_HANDOVER'];
  if (!cancelableStatuses.includes(request.status)) {
    apiError(res, 409, `Không thể hủy phiếu ở trạng thái ${request.status}`, 'INVALID_STATUS'); return;
  }
  // Employee chỉ hủy phiếu của chính mình
  if (user.role === 'EMPLOYEE' && request.requesterId !== user.userId) {
    apiError(res, 403, 'Không có quyền', 'FORBIDDEN'); return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.request.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED', cancelReason: body.reason, rowVersion: { increment: 1 } },
    });
    // Giải phóng reservation nếu có
    await tx.reservation.updateMany({
      where: { requestId: req.params.id, status: 'ACTIVE' },
      data: { status: 'RELEASED' },
    });
    if (body.idempotencyKey) {
      await tx.approvalHistory.create({
        data: { requestId: req.params.id, approverId: user.userId, action: 'CANCELLED', reason: body.reason, idempotencyKey: body.idempotencyKey },
      });
    }
  });

  res.json({ success: true, message: 'Phiếu đã bị hủy' });
});

// ──────────────────────────────────────────────────────────────
//  POST /api/requests/:id/create_po  — Tạo Đơn Mua Sắm (Auto PO)
// ──────────────────────────────────────────────────────────────
router.post('/:id/create_po', requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const request = await prisma.request.findUnique({
    where: { id: req.params.id },
    include: { lines: { include: { item: true } } },
  });

  if (!request) { apiError(res, 404, 'Không tìm thấy phiếu'); return; }

  // Tính toán hàng đang thiếu (Backorder)
  const backorderLines = request.lines
    .filter(l => l.qtyRequested > (l.qtyApproved ?? 0))
    .map(l => ({
      itemId: l.itemId,
      qtyToBuy: l.qtyRequested - (l.qtyApproved ?? 0),
      price: l.item.price,
    }))
    .filter(l => l.qtyToBuy > 0);

  if (backorderLines.length === 0) {
    apiError(res, 400, 'Không có hàng hóa nào báo thiếu để tạo PO', 'NO_BACKORDER'); return;
  }

  await prisma.$transaction(async (tx) => {
    const poId = `PO-${Date.now().toString().slice(-6)}`;
    let totalAmount = 0;

    const poLines = backorderLines.map(bl => {
       const lineAmount = Number(bl.price) * bl.qtyToBuy;
       totalAmount += lineAmount;
       return {
          itemId: bl.itemId,
          qtyRequested: bl.qtyToBuy,
          qtyApproved: bl.qtyToBuy,
          qtyOrdered: bl.qtyToBuy,
          unitPrice: bl.price,
          lineAmount
       };
    });

    await tx.purchaseOrder.create({
      data: {
        id: poId,
        type: 'PO',
        source: 'BACKORDER',
        title: `Mua tự động từ ĐXC ${request.id}`,
        requesterId: request.requesterId,
        department: request.department,
        supplier: 'Nhà cung cấp VPP mặc định',
        status: 'ORDERED',
        orderedAt: new Date(),
        totalAmount,
        lines: {
          create: poLines,
        }
      }
    });

    // Cập nhật trạng thái phiếu mẹ để biết đã xử lý backorder
    await tx.request.update({
      where: { id: request.id },
      data: { 
        revisionReason: request.revisionReason ? `${request.revisionReason} | Đã tạo PO: ${poId}` : `Đã tạo PO: ${poId}` 
      },
    });

    await tx.approvalHistory.create({
      data: {
        requestId: request.id,
        approverId: user.userId,
        action: 'CREATED_PO',
        reason: `Đã tự động tạo PO mua sắm (${poId}) cho các mặt hàng bị thiếu.`,
      }
    });
  });

  res.json({ success: true, message: 'Đã tạo Đơn đặt hàng (PO) thành công cho các vật tư còn thiếu.' });
});

// ──────────────────────────────────────────────────────────────
//  POST /api/requests/:id/approve  — DUYỆT 2 CẤP (Manager & Admin)
// ──────────────────────────────────────────────────────────────
router.post('/:id/approve', requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const body = validateBody(approveSchema, req.body, res);
  if (!body) return;

  if (await checkIdempotency(body.idempotencyKey, res)) return;

  const request = await prisma.request.findUnique({
    where: { id: req.params.id },
    include: { lines: { include: { item: { include: { stocks: { where: { warehouseCode: 'MAIN' } } } } } } },
  });
  if (!request) { apiError(res, 404, 'Không tìm thấy phiếu'); return; }
  
  if (user.role === 'MANAGER') {
    if (request.status !== 'PENDING_MANAGER') {
      apiError(res, 409, `Manager chỉ duyệt phiếu ở trạng thái PENDING_MANAGER. Trạng thái hiện tại: ${request.status}`, 'INVALID_STATUS'); return;
    }
    if (request.currentApproverId !== user.userId) {
      apiError(res, 403, 'Bạn không phải là người được chỉ định duyệt phiếu này', 'FORBIDDEN'); return;
    }
    if (request.requesterId === user.userId) {
      // Logic safety check, should be prevented by create/submit logic but good to have
      apiError(res, 403, 'Bạn không thể tự duyệt phiếu của chính mình', 'SELF_APPROVAL'); return;
    }
  }
  if (user.role === 'ADMIN' && request.status !== 'PENDING_ADMIN' && request.status !== 'PENDING_MANAGER') {
    apiError(res, 409, `Admin hành chính chỉ duyệt phiếu ở trạng thái PENDING_ADMIN hoặc PENDING_MANAGER. Trạng thái hiện tại: ${request.status}`, 'INVALID_STATUS'); return;
  }

  // Admin có thể duyệt thẳng từ PENDING_MANAGER (vượt cấp) hoặc PENDING_ADMIN.
  // Nếu là MANAGER thì chỉ được update PENDING_ADMIN, chưa trừ tồn, chưa check cấp thực tế.
  if (user.role === 'MANAGER') {
     await prisma.$transaction(async (tx) => {
        await tx.request.update({
          where: { id: request.id },
          data: { 
            status: 'PENDING_ADMIN', 
            currentApproverId: null, // Next is Admin, usually no specific admin ID assigned
            managerApprovedAt: new Date(), 
            rowVersion: { increment: 1 } 
          },
        });
        await tx.approvalHistory.create({
          data: { requestId: request.id, approverId: user.userId, action: 'APPROVED', reason: 'Trưởng bộ phận đã duyệt', idempotencyKey: body.idempotencyKey },
        });
     });
     res.json({ success: true, message: 'Đã duyệt cấp 1. Đang chờ Hành chính phê duyệt cuối.' });
     return;
  }

  // LOGIC DÀNH CHO ADMIN (DUYỆT CUỐI - CHỐT SỐ LƯỢNG - RESERVE KHO)
  const lineApprovalMap = new Map(
    (body.lineApprovals ?? request.lines.map(l => ({ lineId: l.id, qtyApproved: l.qtyRequested }))).map(la => [la.lineId, la])
  );

  await prisma.$transaction(async (tx) => {
    let hasPartial = false;

    for (const line of request.lines) {
      const approval = lineApprovalMap.get(line.id);
      const qtyApproved = approval?.qtyApproved ?? line.qtyRequested;
      const currentStock = line.item.stocks[0]?.quantityOnHand ?? 0;

      if (qtyApproved < line.qtyRequested) hasPartial = true;
      if (qtyApproved === 0) {
        await tx.requestLine.update({ where: { id: line.id }, data: { qtyApproved: 0, status: 'REJECTED', approvalNote: approval?.approvalNote, availableQtyAtApprove: currentStock, rowVersion: { increment: 1 } } });
        continue;
      }

      await tx.requestLine.update({
        where: { id: line.id },
        data: {
          qtyApproved,
          status: 'READY_TO_ISSUE',
          approvalNote: approval?.approvalNote,
          availableQtyAtApprove: currentStock,
          rowVersion: { increment: 1 },
        },
      });

      // Soft reservation
      await tx.reservation.upsert({
        where: { lineId: line.id },
        update: { qty: qtyApproved, status: 'ACTIVE' },
        create: {
          itemId: line.itemId,
          warehouseCode: request.warehouseCode,
          requestId: request.id,
          lineId: line.id,
          qty: qtyApproved,
          status: 'ACTIVE',
        },
      });
    }

    const newStatus = hasPartial ? 'PARTIALLY_APPROVED' : 'READY_TO_ISSUE';

    await tx.request.update({
      where: { id: request.id },
      data: { 
        status: newStatus, 
        currentApproverId: null, // End of approval chain
        adminApprovedAt: new Date(), 
        approvedAt: new Date(), 
        rowVersion: { increment: 1 } 
      },
    });

    await tx.approvalHistory.create({
      data: {
        requestId: request.id,
        approverId: user.userId,
        action: 'APPROVED',
        reason: 'Hành chính đã phê duyệt cấp phát',
        metadata: body.lineApprovals ? { lineApprovals: body.lineApprovals } : undefined,
        idempotencyKey: body.idempotencyKey,
      },
    });
  });

  res.json({ success: true, message: 'Admin đã phê duyệt thành công. Kho có thể tiến hành xuất hàng.' });
});

// ──────────────────────────────────────────────────────────────
//  POST /api/requests/batch/approve  — DUYỆT NHIỀU PHIẾU CÙNG LÚC
// ──────────────────────────────────────────────────────────────
router.post('/batch/approve', requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const body = validateBody(batchApproveSchema, req.body, res);
  if (!body) return;

  if (await checkIdempotency(body.idempotencyKey, res)) return;

  const requests = await prisma.request.findMany({
    where: { id: { in: body.requestIds } },
    include: { lines: { include: { item: { include: { stocks: { where: { warehouseCode: 'MAIN' } } } } } } },
  });

  if (requests.length === 0) { apiError(res, 404, 'Không tìm thấy phiếu nào'); return; }

  // Lọc lấy các phiếu hợp lệ cho Role hiện tại
  const validRequests = requests.filter(r => {
    if (user.role === 'MANAGER') return r.status === 'PENDING_MANAGER';
    if (user.role === 'ADMIN') return r.status === 'PENDING_ADMIN' || r.status === 'PENDING_MANAGER';
    return false;
  });

  if (validRequests.length === 0) {
    apiError(res, 409, 'Các phiếu chọn không hợp lệ hoặc đã qua trạng thái duyệt của bạn', 'INVALID_STATUS'); return;
  }

  await prisma.$transaction(async (tx) => {
    for (const request of validRequests) {
      if (user.role === 'MANAGER') {
        await tx.request.update({
          where: { id: request.id },
          data: { status: 'PENDING_ADMIN', managerApprovedAt: new Date(), rowVersion: { increment: 1 } },
        });
        await tx.approvalHistory.create({
          data: { requestId: request.id, approverId: user.userId, action: 'APPROVED', reason: 'Trưởng bộ phận đã duyệt hàng loạt', idempotencyKey: body.idempotencyKey ? `${body.idempotencyKey}-${request.id}` : undefined },
        });
      } else {
        // ADMIN Logic
        let hasPartial = false;
        for (const line of request.lines) {
          const qtyApproved = line.qtyRequested; // Duyệt mặc định = số yêu cầu
          const currentStock = line.item.stocks[0]?.quantityOnHand ?? 0;
          
          if (qtyApproved < line.qtyRequested) hasPartial = true;

          await tx.requestLine.update({
            where: { id: line.id },
            data: {
              qtyApproved,
              status: 'READY_TO_ISSUE',
              availableQtyAtApprove: currentStock,
              rowVersion: { increment: 1 },
            },
          });

          await tx.reservation.upsert({
            where: { lineId: line.id },
            update: { qty: qtyApproved, status: 'ACTIVE' },
            create: {
              itemId: line.itemId,
              warehouseCode: request.warehouseCode,
              requestId: request.id,
              lineId: line.id,
              qty: qtyApproved,
              status: 'ACTIVE',
            },
          });
        }

        const newStatus = hasPartial ? 'PARTIALLY_APPROVED' : 'READY_TO_ISSUE';
        await tx.request.update({
          where: { id: request.id },
          data: { status: newStatus, adminApprovedAt: new Date(), approvedAt: new Date(), rowVersion: { increment: 1 } },
        });

        await tx.approvalHistory.create({
          data: {
            requestId: request.id,
            approverId: user.userId,
            action: 'APPROVED',
            reason: 'Hành chính đã phê duyệt cấp phát hàng loạt',
            idempotencyKey: body.idempotencyKey ? `${body.idempotencyKey}-${request.id}` : undefined,
          },
        });
      }
    }
  });

  res.json({ success: true, message: `Thao tác hàng loạt hoàn tất (${validRequests.length}/${body.requestIds.length} hợp lệ)` });
});

// ──────────────────────────────────────────────────────────────
//  POST /api/requests/:id/reject
// ──────────────────────────────────────────────────────────────
router.post('/:id/reject', requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const body = validateBody(rejectSchema, req.body, res);
  if (!body) return;

  if (await checkIdempotency(body.idempotencyKey, res)) return;

  const request = await prisma.request.findUnique({ where: { id: req.params.id } });
  if (!request) { apiError(res, 404, 'Không tìm thấy phiếu'); return; }
  if (request.status !== 'PENDING_MANAGER' && request.status !== 'PENDING_ADMIN') {
    apiError(res, 409, 'Chỉ từ chối phiếu đang Chờ duyệt', 'INVALID_STATUS'); return;
  }

  await prisma.$transaction([
    prisma.request.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', rejectReason: body.reason, rowVersion: { increment: 1 } },
    }),
    prisma.approvalHistory.create({
      data: { requestId: req.params.id, approverId: user.userId, action: 'REJECTED', reason: body.reason, idempotencyKey: body.idempotencyKey },
    }),
  ]);

  res.json({ success: true, message: 'Phiếu đã bị từ chối' });
});

// ──────────────────────────────────────────────────────────────
//  POST /api/requests/:id/issue  — XUẤT KHO thực tế (WAREHOUSE)
// ──────────────────────────────────────────────────────────────
router.post('/:id/issue', requireRole('WAREHOUSE', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const body = validateBody(issueSchema, req.body, res);
  if (!body) return;

  if (await checkIdempotency(body.idempotencyKey, res)) return;

  const request = await prisma.request.findUnique({
    where: { id: req.params.id },
    include: { lines: { include: { item: { include: { stocks: { where: { warehouseCode: 'MAIN' } } } } } } },
  });
  if (!request) { apiError(res, 404, 'Không tìm thấy phiếu'); return; }

  const issuableStatuses = ['APPROVED', 'READY_TO_ISSUE', 'PARTIALLY_ISSUED', 'PARTIALLY_APPROVED'];
  if (!issuableStatuses.includes(request.status)) {
    apiError(res, 409, `Phiếu ở trạng thái ${request.status} không thể xuất kho`, 'INVALID_STATUS'); return;
  }

  await prisma.$transaction(async (tx) => {
    let allFulfilled = true;
    let hasBackorder = false;

    for (const lineIssue of body.lineIssues) {
      const line = request.lines.find(l => l.id === lineIssue.lineId);
      if (!line) continue;

      const stock = line.item.stocks[0];
      if (!stock) throw new Error(`Không tìm thấy tồn kho cho mặt hàng ${line.item.name}`);

      // Optimistic Lock check
      const currentStock = await tx.stock.findUnique({
        where: { itemId_warehouseCode: { itemId: line.itemId, warehouseCode: request.warehouseCode } },
      });
      if (!currentStock || currentStock.rowVersion !== stock.rowVersion) {
        throw new Error(`Xung đột dữ liệu tồn kho cho mặt hàng ${line.item.name}. Vui lòng tải lại trang.`);
      }
      if (currentStock.quantityOnHand < lineIssue.qtyDelivered) {
        throw new Error(`Tồn kho thực tế không đủ cho "${line.item.name}". Tồn: ${currentStock.quantityOnHand}, Cần xuất: ${lineIssue.qtyDelivered}`);
      }

      const beforeQty = currentStock.quantityOnHand;
      const afterQty = beforeQty - lineIssue.qtyDelivered;

      // Trừ tồn thực tế (Optimistic Lock)
      await tx.stock.update({
        where: { itemId_warehouseCode: { itemId: line.itemId, warehouseCode: request.warehouseCode } },
        data: {
          quantityOnHand: { decrement: lineIssue.qtyDelivered },
          rowVersion: { increment: 1 },
        },
      });

      // Ghi StockMovement
      await tx.stockMovement.create({
        data: {
          itemId: line.itemId,
          warehouseCode: request.warehouseCode,
          movementType: 'ISSUE',
          qty: -lineIssue.qtyDelivered,
          beforeQty,
          afterQty,
          refType: 'Request',
          refId: request.id,
          refLineId: line.id,
          reason: lineIssue.issueNote,
          createdById: user.userId,
        },
      });

      // Giải phóng reservation
      await tx.reservation.updateMany({ where: { lineId: line.id }, data: { status: 'FULFILLED' } });

      const remainingQty = (line.qtyApproved ?? line.qtyRequested) - line.qtyDelivered - lineIssue.qtyDelivered;
      const newLineStatus = remainingQty > 0 ? 'BACKORDER' : (lineIssue.substituteItemId ? 'SUBSTITUTED' : 'CLOSED');

      if (remainingQty > 0) { hasBackorder = true; allFulfilled = false; }

      await tx.requestLine.update({
        where: { id: line.id },
        data: {
          qtyDelivered: { increment: lineIssue.qtyDelivered },
          backorderQty: Math.max(0, remainingQty),
          availableQtyAtIssue: beforeQty,
          issueNote: lineIssue.issueNote,
          substituteItemId: lineIssue.substituteItemId,
          status: newLineStatus,
          rowVersion: { increment: 1 },
        },
      });
    }

    const newStatus = allFulfilled ? 'WAITING_HANDOVER' : hasBackorder ? 'BACKORDER' : 'WAITING_HANDOVER';
    await tx.request.update({
      where: { id: request.id },
      data: { status: newStatus, issuedAt: new Date(), rowVersion: { increment: 1 } },
    });

    await tx.approvalHistory.create({
      data: {
        requestId: request.id,
        approverId: user.userId,
        action: allFulfilled ? 'ISSUED' : 'PARTIALLY_ISSUED',
        idempotencyKey: body.idempotencyKey,
      },
    });
  });

  res.json({ success: true, message: 'Xuất kho thành công. Vui lòng bàn giao và nhắc người dùng xác nhận trên hệ thống.' });
});

// ──────────────────────────────────────────────────────────────
//  GET /api/requests/:id/audit  — Lịch sử đầy đủ
// ──────────────────────────────────────────────────────────────
router.get('/:id/audit', async (req: AuthRequest, res: Response): Promise<void> => {
  const request = await prisma.request.findUnique({
    where: { id: req.params.id },
    select: { id: true, lines: { select: { id: true } } },
  });
  if (!request) { apiError(res, 404, 'Không tìm thấy phiếu'); return; }

  const lineIds = request.lines.map(l => l.id);

  const [approvalHistory, stockMovements, snapshots] = await Promise.all([
    prisma.approvalHistory.findMany({
      where: { requestId: req.params.id },
      include: { approver: { select: { fullName: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.stockMovement.findMany({
      where: { refType: 'Request', refId: req.params.id },
      include: { item: { select: { mvpp: true, name: true } }, createdBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.requestSnapshot.findMany({
      where: { requestId: req.params.id },
      orderBy: { version: 'asc' },
    }),
  ]);

  res.json({ approvalHistory, stockMovements, snapshots });
});

// ──────────────────────────────────────────────────────────────
//  POST /api/requests/:id/attachments  — Upload file đính kèm
// ──────────────────────────────────────────────────────────────
router.post('/:id/attachments', upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  
  if (!req.file) {
    apiError(res, 400, 'Không tìm thấy file'); return;
  }

  const request = await prisma.request.findUnique({ where: { id: req.params.id } });
  if (!request) { apiError(res, 404, 'Không tìm thấy phiếu'); return; }

  const attachment = await prisma.attachment.create({
    data: {
      requestId: request.id,
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      purpose: req.body.purpose || 'SUPPORT_DOC',
      uploadedById: user.userId
    }
  });

  res.status(201).json({ success: true, data: attachment });
});

// ──────────────────────────────────────────────────────────────
//  POST /api/requests/:id/print  — Ghi log in ấn
// ──────────────────────────────────────────────────────────────
router.post('/:id/print', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const request = await prisma.request.findUnique({ where: { id: req.params.id } });
  if (!request) { apiError(res, 404, 'Không tìm thấy phiếu'); return; }

  const printCount = request.printCount + 1;

  await prisma.$transaction([
    prisma.request.update({
      where: { id: request.id },
      data: { printCount, lastPrintedAt: new Date() }
    }),
    prisma.printLog.create({
      data: {
        requestId: request.id,
        userId: user.userId,
        printType: req.body.printType || 'FOR_REVIEW',
        version: request.version,
        printCount: printCount,
        reason: req.body.reason,
        ipAddress: req.ip
      }
    })
  ]);

  res.status(200).json({ success: true, message: 'Đã ghi nhận log in ấn', printCount });
});

// ──────────────────────────────────────────────────────────────
//  POST /api/requests/:id/confirm_receipt  — User xác nhận nhận hàng
// ──────────────────────────────────────────────────────────────
router.post('/:id/confirm_receipt', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const request = await prisma.request.findUnique({ where: { id: req.params.id } });
  if (!request) { apiError(res, 404, 'Không tìm thấy phiếu'); return; }
  
  if (request.status !== 'WAITING_HANDOVER') {
    apiError(res, 409, `Phiếu đang ở trạng thái ${request.status}, chưa thể xác nhận nhận hàng.`, 'INVALID_STATUS'); return;
  }
  
  // Chỉ ai là người yêu cầu mới được confirm (hoặc ADMIN)
  if (request.requesterId !== user.userId && user.role !== 'ADMIN') {
    apiError(res, 403, 'Chỉ người đề xuất mới được xác nhận hóa đơn', 'FORBIDDEN'); return;
  }

  await prisma.$transaction([
    prisma.request.update({
      where: { id: request.id },
      data: { status: 'COMPLETED', handoverAt: new Date(), rowVersion: { increment: 1 } },
    }),
    prisma.approvalHistory.create({
      data: {
        requestId: request.id,
        approverId: user.userId,
        action: 'COMPLETED',
        reason: req.body.note || 'Người nhận đã xác nhận lấy đủ hàng',
      },
    }),
  ]);

  res.json({ success: true, message: 'Đã xác nhận lấy hàng thành công!' });
});

export default router;
