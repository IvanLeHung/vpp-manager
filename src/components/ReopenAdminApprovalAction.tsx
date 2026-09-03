import { useState } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import api from '../lib/api';

const REOPENABLE_STATUSES = [
  'APPROVED',
  'READY_TO_ISSUE',
  'PARTIAL_ADMIN_APPROVED',
  'PARTIALLY_APPROVED',
  'BACKORDER',
];

interface Props {
  request: any;
  currentUserRole?: string;
  onSuccess?: () => void | Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  variant?: 'preview' | 'sidebar';
}

export default function ReopenAdminApprovalAction({
  request,
  currentUserRole,
  onSuccess,
  showToast,
  variant = 'sidebar',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalDelivered = (request?.lines || []).reduce((sum: number, line: any) => {
    return sum + Number(line.qtyDelivered || line.deliveredQty || line.issuedQty || 0);
  }, 0);
  const canReopen = Boolean(
    currentUserRole === 'ADMIN'
      && request?.id
      && REOPENABLE_STATUSES.includes(request.status)
      && totalDelivered === 0,
  );

  if (!canReopen) return null;

  const closeModal = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    setReason('');
  };

  const submit = async () => {
    const cleanReason = reason.trim();
    if (cleanReason.length < 3) {
      showToast('Vui lòng nhập lý do mở lại phiếu', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/requests/${request.id}/reopen-admin-approval`, { reason: cleanReason });
      showToast('Đã đưa phiếu về bước Hành chính duyệt', 'success');
      setIsOpen(false);
      setReason('');
      await onSuccess?.();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Không thể mở lại phiếu', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {variant === 'preview' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 transition hover:border-amber-400 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
          title="Đưa phiếu về bước Hành chính duyệt để chỉnh sửa"
        >
          <RotateCcw className="h-4 w-4" />
          Mở lại
        </button>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
          <div className="mb-2 flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <RotateCcw className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">Điều chỉnh phê duyệt</p>
              <p className="mt-0.5 text-[10px] leading-4 text-amber-700">Đưa phiếu về bước Hành chính duyệt.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white py-2.5 text-xs font-black text-amber-700 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            <RotateCcw className="h-4 w-4" />
            MỞ LẠI ĐỂ CHỈNH SỬA
          </button>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reopen-request-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <RotateCcw className="h-5 w-5" />
                </span>
                <div>
                  <h3 id="reopen-request-title" className="text-base font-black text-slate-900">Mở lại phiếu để chỉnh sửa</h3>
                  <p className="mt-1 text-xs font-medium text-slate-500">Phiếu {request.id} sẽ trở về bước Hành chính duyệt.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Các kết quả duyệt hiện tại sẽ được giữ để Admin kiểm tra và điều chỉnh lại.</p>
              </div>
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Lý do mở lại <span className="text-rose-500">*</span></span>
                <textarea
                  autoFocus
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="h-28 w-full resize-none rounded-xl border-2 border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-800 outline-none transition focus:border-amber-400 focus:bg-white"
                  placeholder="Ví dụ: Điều chỉnh lại số lượng đã duyệt..."
                  maxLength={500}
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={isSubmitting || reason.trim().length < 3}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className={`h-4 w-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                {isSubmitting ? 'Đang mở lại...' : 'Xác nhận mở lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
