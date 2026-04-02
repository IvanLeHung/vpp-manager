import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Settings2, Send,
  Check, X, XCircle, Ban, Zap, Clock, FileX2, CheckCircle2,
  ClipboardList, User, Calendar, MessageSquare, Shield
} from 'lucide-react';
import api from '../lib/api';
import { useAppContext } from '../context/AppContext';

// ── Types ──
type TicketLine = {
  id: string; itemId: string; qty: number; qtyApproved: number | null;
  beforeQty: number | null; afterQty: number | null; note: string | null;
  item: { name: string; mvpp: string; unit: string; price?: number; category?: string };
};
type AuditEntry = {
  id: string; action: string; oldValues: any; newValues: any; createdAt: string;
  user: { fullName: string; username: string; role: string } | null;
};
type TicketDetail = {
  id: string; ticketCode: string; ticketType: string; warehouseCode: string;
  status: string; reason: string | null; note: string | null; rejectReason: string | null;
  createdAt: string; submittedAt: string | null; approvedAt: string | null;
  executedAt: string | null; cancelledAt: string | null; rejectedAt: string | null;
  createdBy: { fullName: string; username: string; role: string };
  approvedBy: { fullName: string; username: string } | null;
  executedBy: { fullName: string; username: string } | null;
  lines: TicketLine[];
  auditTrail: AuditEntry[];
};

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

const STATUS_CONFIG: Record<string, { label: string; cls: string; bgCls: string; icon: any }> = {
  DRAFT: { label: 'Nháp', cls: 'text-slate-600', bgCls: 'bg-slate-100 border-slate-300', icon: FileX2 },
  PENDING_ADMIN_APPROVAL: { label: 'Chờ Admin duyệt', cls: 'text-amber-700', bgCls: 'bg-amber-50 border-amber-300', icon: Clock },
  APPROVED: { label: 'Đã duyệt', cls: 'text-blue-700', bgCls: 'bg-blue-50 border-blue-300', icon: CheckCircle2 },
  REJECTED: { label: 'Từ chối', cls: 'text-rose-700', bgCls: 'bg-rose-50 border-rose-300', icon: XCircle },
  EXECUTED: { label: 'Đã thực thi', cls: 'text-emerald-700', bgCls: 'bg-emerald-50 border-emerald-300', icon: Zap },
  CANCELLED: { label: 'Đã hủy', cls: 'text-gray-500', bgCls: 'bg-gray-100 border-gray-300', icon: Ban },
};

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  RECEIVE: { label: 'Phiếu nhập kho', icon: ArrowDownToLine, color: 'text-emerald-600' },
  ISSUE: { label: 'Phiếu xuất kho', icon: ArrowUpFromLine, color: 'text-rose-600' },
  ADJUSTMENT: { label: 'Phiếu điều chỉnh', icon: Settings2, color: 'text-amber-600' },
};

const AUDIT_LABELS: Record<string, string> = {
  CREATE: 'Tạo phiếu', EDIT: 'Sửa phiếu', SUBMIT: 'Gửi duyệt', APPROVE: 'Duyệt phiếu',
  REJECT: 'Từ chối', EXECUTE: 'Thực thi', CANCEL: 'Hủy phiếu', AUTO_EXECUTE: 'Tự động thực thi',
};

export default function WarehouseTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const role = currentUser?.role || 'EMPLOYEE';
  const isAdmin = role === 'ADMIN';
  const isWarehouse = role === 'WAREHOUSE';

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Toast
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (message: string, type: Toast['type'] = 'success') => {
    const tid = Date.now();
    setToasts(prev => [...prev, { id: tid, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 4000);
  };

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/warehouse-tickets/${id}`);
      setTicket(res.data);
    } catch (err) {
      console.error(err);
      addToast('Không thể tải phiếu kho', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) fetchTicket(); }, [id]);

  // Actions
  const handleSubmit = async () => {
    try {
      setActionLoading(true);
      await api.post(`/warehouse-tickets/${id}/submit`);
      addToast('Phiếu đã gửi duyệt thành công!');
      fetchTicket();
    } catch (err: any) {
      addToast('Lỗi: ' + (err.response?.data?.error || 'Không thể gửi duyệt'), 'error');
    } finally { setActionLoading(false); }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      await api.post(`/warehouse-tickets/${id}/approve`);
      addToast('Phiếu đã được duyệt!');
      fetchTicket();
    } catch (err: any) {
      addToast('Lỗi: ' + (err.response?.data?.error || 'Không thể duyệt'), 'error');
    } finally { setActionLoading(false); }
  };

  const handleExecute = async () => {
    try {
      setActionLoading(true);
      await api.post(`/warehouse-tickets/${id}/execute`);
      addToast('Phiếu đã được thực thi — tồn kho đã cập nhật!');
      fetchTicket();
    } catch (err: any) {
      addToast('Lỗi: ' + (err.response?.data?.error || 'Không thể thực thi'), 'error');
    } finally { setActionLoading(false); }
  };

  const handleApproveAndExecute = async () => {
    try {
      setActionLoading(true);
      await api.post(`/warehouse-tickets/${id}/approve`);
      await api.post(`/warehouse-tickets/${id}/execute`);
      addToast('Duyệt & thực thi thành công — tồn kho đã cập nhật!');
      fetchTicket();
    } catch (err: any) {
      addToast('Lỗi: ' + (err.response?.data?.error || 'Không thể duyệt & thực thi'), 'error');
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { addToast('Vui lòng nhập lý do từ chối', 'error'); return; }
    try {
      setActionLoading(true);
      await api.post(`/warehouse-tickets/${id}/reject`, { rejectReason });
      addToast('Phiếu đã bị từ chối.');
      setShowRejectModal(false);
      setRejectReason('');
      fetchTicket();
    } catch (err: any) {
      addToast('Lỗi: ' + (err.response?.data?.error || 'Không thể từ chối'), 'error');
    } finally { setActionLoading(false); }
  };

  const handleCancel = async () => {
    try {
      setActionLoading(true);
      await api.post(`/warehouse-tickets/${id}/cancel`, { cancelReason });
      addToast('Phiếu đã bị hủy.');
      setShowCancelModal(false);
      setCancelReason('');
      fetchTicket();
    } catch (err: any) {
      addToast('Lỗi: ' + (err.response?.data?.error || 'Không thể hủy'), 'error');
    } finally { setActionLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-50">
        <div className="text-center">
          <ClipboardList className="w-12 h-12 text-indigo-300 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400 font-bold">Đang tải phiếu kho...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-50">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-rose-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold mb-4">Không tìm thấy phiếu kho.</p>
          <button onClick={() => navigate('/warehouse-tickets')} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
            <ArrowLeft className="w-4 h-4 mr-2 inline" /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  const sc = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.DRAFT;
  const tc = TYPE_CONFIG[ticket.ticketType] || TYPE_CONFIG.RECEIVE;
  const StatusIcon = sc.icon;
  const TypeIcon = tc.icon;
  const isOwner = ticket.createdBy.username === currentUser?.username;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] p-4 md:p-8 bg-slate-50 overflow-auto">
      {/* Toast */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-bold ${t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-rose-600' : 'bg-indigo-600'}`}>
            <span>{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      {/* Back + Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/warehouse-tickets')} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition border border-transparent hover:border-slate-200">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <TypeIcon className={`w-6 h-6 ${tc.color}`} />
              {tc.label}
              <span className="text-indigo-600">{ticket.ticketCode}</span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs uppercase tracking-wider font-black rounded-full border ${sc.bgCls} ${sc.cls}`}>
                <StatusIcon className="w-3.5 h-3.5" /> {sc.label}
              </span>
              <span className="text-sm text-slate-500 font-medium">Kho: <strong>{ticket.warehouseCode}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* WAREHOUSE: Submit Draft */}
          {isWarehouse && isOwner && ticket.status === 'DRAFT' && (
            <button onClick={handleSubmit} disabled={actionLoading} className="flex items-center px-5 py-2.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 shadow-md transition disabled:opacity-50">
              <Send className="w-4 h-4 mr-2" /> Gửi duyệt
            </button>
          )}
          {/* WAREHOUSE/ADMIN: Cancel Draft/Pending */}
          {(isOwner || isAdmin) && ['DRAFT', 'PENDING_ADMIN_APPROVAL'].includes(ticket.status) && (
            <button onClick={() => setShowCancelModal(true)} disabled={actionLoading} className="flex items-center px-4 py-2.5 bg-white text-slate-600 border border-slate-300 rounded-xl font-bold hover:bg-slate-50 transition disabled:opacity-50">
              <Ban className="w-4 h-4 mr-2" /> Hủy phiếu
            </button>
          )}
          {/* ADMIN: Approve Pending */}
          {isAdmin && ticket.status === 'PENDING_ADMIN_APPROVAL' && (
            <>
              <button onClick={() => setShowRejectModal(true)} disabled={actionLoading} className="flex items-center px-4 py-2.5 bg-white text-rose-600 border border-rose-300 rounded-xl font-bold hover:bg-rose-50 transition disabled:opacity-50">
                <XCircle className="w-4 h-4 mr-2" /> Từ chối
              </button>
              <button onClick={handleApprove} disabled={actionLoading} className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition disabled:opacity-50">
                <Check className="w-4 h-4 mr-2" /> Duyệt
              </button>
              <button onClick={handleApproveAndExecute} disabled={actionLoading} className="flex items-center px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-md transition disabled:opacity-50">
                <Zap className="w-4 h-4 mr-2" /> Duyệt & Thực thi
              </button>
            </>
          )}
          {/* ADMIN: Execute Approved */}
          {isAdmin && ticket.status === 'APPROVED' && (
            <button onClick={handleExecute} disabled={actionLoading} className="flex items-center px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition disabled:opacity-50">
              <Zap className="w-4 h-4 mr-2" /> Thực thi cập nhật tồn
            </button>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info + Lines */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reject reason */}
          {ticket.status === 'REJECTED' && ticket.rejectReason && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-rose-700 flex items-center mb-1"><XCircle className="w-4 h-4 mr-2" /> Lý do từ chối</p>
              <p className="text-rose-600 font-medium">{ticket.rejectReason}</p>
            </div>
          )}

          {/* Lines Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center"><ClipboardList className="w-4 h-4 mr-2 text-indigo-600" /> Danh sách hàng hóa ({ticket.lines.length} dòng)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase font-black text-slate-500 tracking-wider">
                  <tr>
                    <th className="p-4 w-12">#</th>
                    <th className="p-4">Mã</th>
                    <th className="p-4">Tên hàng</th>
                    <th className="p-4 text-center">ĐVT</th>
                    <th className="p-4 text-right">SL đề nghị</th>
                    <th className="p-4 text-right">SL duyệt</th>
                    <th className="p-4 text-right">Tồn trước</th>
                    <th className="p-4 text-right">Tồn sau</th>
                    <th className="p-4">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ticket.lines.map((line, i) => (
                    <tr key={line.id} className="hover:bg-slate-50/50">
                      <td className="p-4 text-slate-400 font-bold text-sm">{i + 1}</td>
                      <td className="p-4 font-black text-indigo-600">{line.item.mvpp}</td>
                      <td className="p-4 font-bold text-slate-800">{line.item.name}</td>
                      <td className="p-4 text-center text-slate-500">{line.item.unit}</td>
                      <td className={`p-4 text-right font-black text-lg ${line.qty > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                        {line.qty > 0 ? `+${line.qty}` : line.qty}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-600">
                        {line.qtyApproved !== null ? (line.qtyApproved > 0 ? `+${line.qtyApproved}` : line.qtyApproved) : '—'}
                      </td>
                      <td className="p-4 text-right text-slate-400 font-medium">{line.beforeQty ?? '—'}</td>
                      <td className="p-4 text-right font-bold text-emerald-600">{line.afterQty ?? '—'}</td>
                      <td className="p-4 text-slate-500 text-sm">{line.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reason & Note */}
          {(ticket.reason || ticket.note) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 flex items-center mb-3"><MessageSquare className="w-4 h-4 mr-2 text-indigo-600" /> Lý do & Ghi chú</h3>
              {ticket.reason && <p className="text-slate-700 font-medium mb-2"><strong>Lý do:</strong> {ticket.reason}</p>}
              {ticket.note && <p className="text-slate-500 font-medium"><strong>Ghi chú:</strong> {ticket.note}</p>}
            </div>
          )}
        </div>

        {/* Right: Meta + Audit */}
        <div className="space-y-6">
          {/* Meta Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center"><Shield className="w-4 h-4 mr-2 text-indigo-600" /> Thông tin phiếu</h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-center">
                <User className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <span className="text-slate-500 font-medium w-24">Người tạo</span>
                <span className="font-bold text-slate-700">{ticket.createdBy.fullName} <span className="text-xs text-slate-400">({ticket.createdBy.role})</span></span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <span className="text-slate-500 font-medium w-24">Tạo lúc</span>
                <span className="font-bold text-slate-700">{new Date(ticket.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              {ticket.submittedAt && (
                <div className="flex items-center">
                  <Send className="w-4 h-4 text-amber-500 mr-2 shrink-0" />
                  <span className="text-slate-500 font-medium w-24">Gửi duyệt</span>
                  <span className="font-bold text-slate-700">{new Date(ticket.submittedAt).toLocaleString('vi-VN')}</span>
                </div>
              )}
              {ticket.approvedBy && (
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-blue-500 mr-2 shrink-0" />
                  <span className="text-slate-500 font-medium w-24">Người duyệt</span>
                  <span className="font-bold text-slate-700">{ticket.approvedBy.fullName}</span>
                </div>
              )}
              {ticket.approvedAt && (
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-blue-400 mr-2 shrink-0" />
                  <span className="text-slate-500 font-medium w-24">Duyệt lúc</span>
                  <span className="font-bold text-slate-700">{new Date(ticket.approvedAt).toLocaleString('vi-VN')}</span>
                </div>
              )}
              {ticket.executedBy && (
                <div className="flex items-center">
                  <Zap className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                  <span className="text-slate-500 font-medium w-24">Thực thi bởi</span>
                  <span className="font-bold text-slate-700">{ticket.executedBy.fullName}</span>
                </div>
              )}
              {ticket.executedAt && (
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                  <span className="text-slate-500 font-medium w-24">Thực thi lúc</span>
                  <span className="font-bold text-slate-700">{new Date(ticket.executedAt).toLocaleString('vi-VN')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Audit Trail */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center"><Clock className="w-4 h-4 mr-2 text-indigo-600" /> Lịch sử thao tác</h3>
            {ticket.auditTrail.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium">Chưa có lịch sử.</p>
            ) : (
              <div className="space-y-3">
                {ticket.auditTrail.map((a, i) => (
                  <div key={a.id} className="flex gap-3 text-sm">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${a.action === 'REJECT' || a.action === 'CANCEL' ? 'bg-rose-400' : a.action === 'EXECUTE' || a.action === 'AUTO_EXECUTE' ? 'bg-emerald-400' : a.action === 'APPROVE' ? 'bg-blue-400' : 'bg-slate-300'}`} />
                      {i < ticket.auditTrail.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                    </div>
                    <div className="pb-3">
                      <p className="font-bold text-slate-700">{AUDIT_LABELS[a.action] || a.action}</p>
                      <p className="text-slate-400 text-xs font-medium">
                        {a.user?.fullName || 'Hệ thống'} • {new Date(a.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── REJECT MODAL ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center"><XCircle className="w-6 h-6 mr-2 text-rose-600" /> Từ chối phiếu kho</h3>
            <p className="text-sm text-slate-600 mb-4 font-medium">Phiếu <strong>{ticket.ticketCode}</strong> sẽ bị từ chối.</p>
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Lý do từ chối *</label>
              <textarea autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 text-sm h-24" placeholder="Nhập lý do từ chối..." />
            </div>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}>Hủy</button>
              <button className="flex-1 py-2.5 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-md" onClick={handleReject} disabled={actionLoading}>
                {actionLoading ? 'Đang xử lý...' : 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CANCEL MODAL ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center"><Ban className="w-6 h-6 mr-2 text-amber-600" /> Hủy phiếu kho</h3>
            <p className="text-sm text-slate-600 mb-4 font-medium">Phiếu <strong>{ticket.ticketCode}</strong> sẽ bị hủy.</p>
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Lý do hủy</label>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm h-24" placeholder="Nhập lý do hủy (không bắt buộc)..." />
            </div>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition" onClick={() => { setShowCancelModal(false); setCancelReason(''); }}>Quay lại</button>
              <button className="flex-1 py-2.5 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-md" onClick={handleCancel} disabled={actionLoading}>
                {actionLoading ? 'Đang xử lý...' : 'Hủy phiếu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
