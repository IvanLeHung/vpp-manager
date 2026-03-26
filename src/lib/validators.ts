import { z } from 'zod';

export const createRequestSchema = z.object({
  requestType: z.enum(['Định kỳ', 'Bổ sung đột xuất', 'Dự án mới']).default('Định kỳ'),
  priority: z.enum(['Thường', 'Cao', 'Khẩn cấp']).default('Thường'),
  purpose: z.string().optional(),
  costCenter: z.string().optional(),
  projectCode: z.string().optional(),
  warehouseCode: z.string().default('MAIN'),
  neededByDate: z.string().datetime().optional(),
  lines: z.array(z.object({
    itemId: z.string().uuid(),
    qtyRequested: z.number().int().min(1),
    note: z.string().optional(),
  })).min(1, 'Phải có ít nhất 1 dòng hàng'),
});

export const approveSchema = z.object({
  idempotencyKey: z.string().optional(),
  lineApprovals: z.array(z.object({
    lineId: z.string().uuid(),
    qtyApproved: z.number().int().min(0),
    approvalNote: z.string().optional(),
  })).optional(), // Nếu không truyền → approve toàn phiếu với qty = qtyRequested
});

export const rejectSchema = z.object({
  reason: z.string().min(1, 'Bắt buộc nhập lý do từ chối'),
  idempotencyKey: z.string().optional(),
});

export const issueSchema = z.object({
  idempotencyKey: z.string().optional(),
  lineIssues: z.array(z.object({
    lineId: z.string().uuid(),
    qtyDelivered: z.number().int().min(1),
    issueNote: z.string().optional(),
    substituteItemId: z.string().uuid().optional(),
  })).min(1),
});

export const withdrawSchema = z.object({
  reason: z.string().optional(),
});

export const returnSchema = z.object({
  reason: z.string().min(1, 'Bắt buộc nhập lý do trả lại'),
});

export const cancelSchema = z.object({
  reason: z.string().min(1, 'Bắt buộc nhập lý do hủy'),
  idempotencyKey: z.string().optional(),
});

export const batchApproveSchema = z.object({
  requestIds: z.array(z.string().uuid()).min(1, 'Chưa chọn phiếu nào'),
  idempotencyKey: z.string().optional(),
});

export type CreateRequestBody = z.infer<typeof createRequestSchema>;
export type ApproveBody = z.infer<typeof approveSchema>;
export type RejectBody = z.infer<typeof rejectSchema>;
export type IssueBody = z.infer<typeof issueSchema>;
export type BatchApproveBody = z.infer<typeof batchApproveSchema>;
