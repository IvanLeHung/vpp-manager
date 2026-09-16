import { useEffect, useState } from 'react';
import { Clock3, LockKeyhole } from 'lucide-react';
import { Modal } from 'antd';
import type { VppCreationPermission } from '../services/vppPermissionApi';

const formatDateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
const countdownText = (seconds: number) => {
  const totalMinutes = Math.max(0, Math.ceil(seconds / 60));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return days > 0 ? `Còn ${days} ngày ${String(hours).padStart(2, '0')} giờ ${String(minutes).padStart(2, '0')} phút`
    : hours > 0 ? `Còn ${String(hours).padStart(2, '0')} giờ ${String(minutes).padStart(2, '0')} phút`
      : `Còn ${minutes} phút`;
};

export default function VppCreationLockedModal({ open, permission, serverNow, error, onClose }: { open: boolean; permission: VppCreationPermission | null; serverNow: () => number; error?: string; onClose: () => void }) {
  const [now, setNow] = useState(serverNow());
  useEffect(() => {
    if (!open) return;
    setNow(serverNow());
    const timer = window.setInterval(() => setNow(serverNow()), 1000);
    return () => window.clearInterval(timer);
  }, [open, serverNow]);
  useEffect(() => {
    if (open && permission?.allowed) onClose();
  }, [open, permission?.allowed, onClose]);
  const target = permission && !permission.allowed ? permission.nextOpenAt : undefined;
  const remaining = target ? Math.max(0, Math.ceil((new Date(target).getTime() - now) / 1000)) : 0;
  return <Modal open={open} onCancel={onClose} footer={<button type="button" onClick={onClose} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white">Đóng</button>} title={null} centered destroyOnHidden>
    <div className="py-3 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-100 text-amber-700"><LockKeyhole className="h-6 w-6" /></span>
      <h2 className="mt-4 text-lg font-black text-slate-800">Chưa thể tạo đề xuất VPP</h2>
      <p className="mt-2 text-sm text-slate-600">{error || permission?.message}</p>
      {permission?.status === 'NOT_OPEN_YET' && <p className="mt-2 text-sm text-slate-600">Hệ thống sẽ mở vào <strong>{formatDateTime(permission.openAt)}</strong>.</p>}
      {permission?.status === 'CLOSED' && <p className="mt-2 text-sm text-slate-600">Kỳ vừa qua đã đóng lúc <strong>{formatDateTime(permission.closeAt)}</strong>.</p>}
      {target && <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700"><Clock3 className="h-4 w-4" />{countdownText(remaining)}</p>}
    </div>
  </Modal>;
}
