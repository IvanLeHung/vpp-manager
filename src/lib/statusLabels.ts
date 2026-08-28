const requestStatusLabels: Record<string, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ xử lý',
  PENDING_MANAGER: 'Chờ Trưởng bộ phận duyệt',
  PENDING_ADMIN: 'Chờ Hành chính duyệt',
  RETURNED: 'Trả lại chỉnh sửa',
  NEED_REVISION: 'Cần chỉnh sửa',
  PARTIALLY_APPROVED: 'Duyệt một phần',
  PARTIAL_TBP_APPROVED: 'Trưởng bộ phận duyệt một phần',
  PARTIAL_ADMIN_APPROVED: 'Hành chính duyệt một phần',
  APPROVED: 'Đã duyệt',
  READY_TO_ISSUE: 'Sẵn sàng xuất kho',
  READY_TO_PICK: 'Sẵn sàng lấy hàng',
  PICKING: 'Đang lấy hàng',
  PARTIALLY_ISSUED: 'Đã xuất một phần',
  READY_TO_HANDOVER: 'Sẵn sàng bàn giao',
  WAITING_HANDOVER: 'Chờ xác nhận bàn giao',
  PARTIALLY_DELIVERED: 'Đã giao một phần',
  PENDING_REMAINING_DELIVERY: 'Chờ giao phần còn lại',
  FULLY_DELIVERED: 'Đã giao đủ',
  PARTIALLY_FULFILLED: 'Đáp ứng một phần',
  OUT_OF_STOCK: 'Hết hàng',
  NEEDS_PROCUREMENT: 'Cần mua hàng',
  BACKORDER: 'Chờ mua bổ sung',
  COMPLETED: 'Hoàn tất',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
  CLOSED: 'Đã đóng',
  CLOSED_PARTIAL: 'Đã đóng một phần',
};

const lineStatusLabels: Record<string, string> = {
  ...requestStatusLabels,
  TBP_APPROVED: 'Trưởng bộ phận đã duyệt',
  TBP_PARTIAL: 'Trưởng bộ phận duyệt một phần',
  TBP_REJECTED: 'Trưởng bộ phận từ chối',
  ADMIN_APPROVED: 'Hành chính đã duyệt',
  ADMIN_PARTIAL: 'Hành chính duyệt một phần',
  ADMIN_REJECTED: 'Hành chính từ chối',
  SHORT_SHIPPED: 'Giao chưa đủ',
  SUBSTITUTED: 'Đã thay thế vật tư',
  APPROVED_WAITING_PURCHASE: 'Đã duyệt, chờ mua hàng',
  REPLACEMENT_ALLOWED: 'Cho phép thay thế',
  REPLACEMENT_PENDING_ADMIN: 'Chờ Hành chính duyệt thay thế',
  REPLACEMENT_REJECTED: 'Từ chối thay thế',
  PURCHASED: 'Đã mua',
  RECEIVED: 'Đã nhập kho',
  ISSUED: 'Đã xuất kho',
  HANDOVER_CONFIRMED: 'Đã xác nhận bàn giao',
  PENDING_STOCK: 'Chờ có hàng',
  CANCELLED_REMAINING: 'Đã hủy phần còn lại',
};

const actionLabels: Record<string, string> = {
  SUBMIT: 'Gửi trình duyệt',
  TBP_APPROVE: 'Trưởng bộ phận duyệt',
  ADMIN_APPROVE: 'Hành chính duyệt',
  RETURN_FOR_REVISION: 'Trả lại chỉnh sửa',
  RETURN_FOR_EDIT: 'Trả lại chỉnh sửa',
  RETURN: 'Trả lại chỉnh sửa',
  REJECT: 'Từ chối toàn bộ',
  CANCEL: 'Hủy phiếu',
  ISSUE: 'Xuất kho / Giao hàng',
  ISSUED: 'Xuất kho / Giao hàng',
  PARTIAL_DELIVERY_CONFIRMED: 'Xác nhận giao một phần',
  CONFIRM_RECEIPT: 'Xác nhận đã nhận hàng',
  APPROVE: 'Duyệt',
  TBP_REJECT: 'Trưởng bộ phận từ chối',
  ADMIN_REJECT: 'Hành chính từ chối',
  WITHDRAW: 'Rút phiếu',
  URGE_DELIVERY: 'Hối thúc giao hàng',
  CREATE_PO: 'Tạo đơn mua sắm bổ sung',
  UPDATE: 'Cập nhật phiếu',
  CREATE: 'Tạo phiếu',
  HANDOVER: 'Bàn giao hàng hóa',
};

export function getRequestStatusLabel(status?: string | null) {
  if (!status) return 'Chưa xác định';
  return requestStatusLabels[status.toUpperCase()] || 'Trạng thái khác';
}

export function getLineStatusLabel(status?: string | null) {
  if (!status) return 'Chưa xác định';
  return lineStatusLabels[status.toUpperCase()] || getRequestStatusLabel(status);
}

export function getApprovalActionLabel(action?: string | null) {
  if (!action) return 'Chưa xác định';
  return actionLabels[action.toUpperCase()] || 'Cập nhật quy trình';
}
