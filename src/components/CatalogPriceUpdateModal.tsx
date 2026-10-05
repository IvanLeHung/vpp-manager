import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XCircle } from 'lucide-react';

type CatalogPricePreview = {
  fromDate: string;
  toDate: string;
  requestCount: number;
  lineCount: number;
  oldTotal: number;
  newTotal: number;
};

type Props = {
  preview: CatalogPricePreview | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN');
}

export default function CatalogPriceUpdateModal({ preview, loading, onClose, onConfirm }: Props) {
  useEffect(() => {
    if (!preview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [preview, loading, onClose]);

  if (!preview) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget && !loading) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Xem trước cập nhật giá danh mục" className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Cập nhật giá theo Danh mục hàng hóa</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(preview.fromDate)} — {formatDate(preview.toDate)}</p>
          </div>
          <button type="button" aria-label="Đóng" disabled={loading} onClick={onClose}><XCircle className="h-6 w-6 text-slate-400" /></button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-indigo-50 p-4"><p className="text-[10px] font-black uppercase text-indigo-500">Phiếu bị thay đổi</p><p className="mt-1 text-2xl font-black text-indigo-800">{preview.requestCount}</p></div>
          <div className="rounded-2xl bg-amber-50 p-4"><p className="text-[10px] font-black uppercase text-amber-600">Dòng giá thay đổi</p><p className="mt-1 text-2xl font-black text-amber-800">{preview.lineCount}</p></div>
        </div>
        <div className="mt-3 rounded-2xl border border-slate-200 p-4 text-sm">
          <div className="flex justify-between"><span className="font-bold text-slate-500">Tổng giá trị cũ</span><strong>{Number(preview.oldTotal || 0).toLocaleString('vi-VN')} đ</strong></div>
          <div className="mt-2 flex justify-between"><span className="font-bold text-slate-500">Theo Danh mục hiện tại</span><strong className="text-indigo-700">{Number(preview.newTotal || 0).toLocaleString('vi-VN')} đ</strong></div>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">Chỉ cập nhật giá trên phiếu đề xuất và ghi lịch sử thay đổi. Giá mua thực tế trên PO, phiếu nhập và dữ liệu tồn kho không bị ghi đè.</p>
        {preview.lineCount === 0 && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">Tất cả các dòng đã khớp với Danh mục hàng hóa.</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={loading} onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-600 disabled:opacity-50">Đóng</button>
          {preview.lineCount > 0 && <button type="button" disabled={loading} onClick={onConfirm} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{loading ? 'Đang cập nhật…' : 'Xác nhận cập nhật'}</button>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
