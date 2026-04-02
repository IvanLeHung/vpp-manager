import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Plus, Search, ChevronLeft, ChevronRight, RefreshCw,
  ArrowDownToLine, ArrowUpFromLine, Settings2, Eye, X, XCircle,
  CheckCircle2, Clock, FileX2, Zap, Ban, Package, Send, Check
} from 'lucide-react';
import api from '../lib/api';
import { useAppContext } from '../context/AppContext';

// ── Types ──
type TicketLine = {
  id: string; itemId: string; qty: number; qtyApproved: number | null;
  beforeQty: number | null; afterQty: number | null; note: string | null;
  item: { name: string; mvpp: string; unit: string };
};
type Ticket = {
  id: string; ticketCode: string; ticketType: string; warehouseCode: string;
  status: string; reason: string | null; note: string | null; rejectReason: string | null;
  createdAt: string; submittedAt: string | null; approvedAt: string | null; executedAt: string | null;
  createdBy: { fullName: string; username: string; role: string };
  approvedBy: { fullName: string; username: string } | null;
  executedBy: { fullName: string; username: string } | null;
  lines: TicketLine[];
};
type Summary = {
  total: number; pending: number; approved: number; rejected: number;
  executed: number; draft: number; cancelled: number;
};
type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

// ── Constants ──
const PAGE_SIZE = 15;

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  DRAFT: { label: 'Nháp', cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: FileX2 },
  PENDING_ADMIN_APPROVAL: { label: 'Chờ duyệt', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  APPROVED: { label: 'Đã duyệt', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle2 },
  REJECTED: { label: 'Từ chối', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
  EXECUTED: { label: 'Đã thực thi', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Zap },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-gray-100 text-gray-500 border-gray-200', icon: Ban },
};

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  RECEIVE: { label: 'Nhập kho', icon: ArrowDownToLine, color: 'text-emerald-600' },
  ISSUE: { label: 'Xuất kho', icon: ArrowUpFromLine, color: 'text-rose-600' },
  ADJUSTMENT: { label: 'Điều chỉnh', icon: Settings2, color: 'text-amber-600' },
};

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-bold ${t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-rose-600' : 'bg-indigo-600'}`}>
          <span>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}

export default function WarehouseTickets() {
  const navigate = useNavigate();
  const { currentUser, items } = useAppContext();
  const role = currentUser?.role || 'EMPLOYEE';
  const isAdmin = role === 'ADMIN';
  const isWarehouse = role === 'WAREHOUSE';
  const canCreate = isAdmin || isWarehouse;

  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'RECEIVE' | 'ISSUE' | 'ADJUSTMENT'>('RECEIVE');
  const [createReason, setCreateReason] = useState('');
  const [createNote, setCreateNote] = useState('');
  const [createLines, setCreateLines] = useState<{ itemId: string; qty: number; note: string }[]>([{ itemId: '', qty: 1, note: '' }]);
  const [creating, setCreating] = useState(false);

  // Toast
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // Fetch
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (typeFilter !== 'ALL') params.ticketType = typeFilter;
      if (searchQuery) params.q = searchQuery;
      const res = await api.get('/warehouse-tickets', { params });
      setTickets(res.data.data);
      setSummary(res.data.summary);
    } catch (err) {
      console.error(err);
      addToast('Lỗi tải danh sách phiếu kho', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [statusFilter, typeFilter]);
  useEffect(() => { setPage(1); }, [statusFilter, typeFilter, searchQuery]);

  // Filtered
  const filteredTickets = useMemo(() => {
    if (!searchQuery) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(t =>
      t.ticketCode.toLowerCase().includes(q) ||
      t.reason?.toLowerCase().includes(q) ||
      t.createdBy.fullName.toLowerCase().includes(q) ||
      t.lines.some(l => l.item.name.toLowerCase().includes(q) || l.item.mvpp.toLowerCase().includes(q))
    );
  }, [tickets, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedTickets = filteredTickets.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Create ticket
  const handleCreate = async () => {
    const validLines = createLines.filter(l => l.itemId && l.qty);
    if (validLines.length === 0) { addToast('Vui lòng thêm ít nhất 1 dòng hàng', 'error'); return; }
    if (!createReason.trim()) { addToast('Vui lòng nhập lý do', 'error'); return; }

    try {
      setCreating(true);
      await api.post('/warehouse-tickets', {
        ticketType: createType,
        reason: createReason,
        note: createNote || null,
        lines: validLines.map(l => ({ itemId: l.itemId, qty: createType === 'ISSUE' ? -Math.abs(l.qty) : l.qty, note: l.note || null })),
      });
      addToast(isAdmin ? 'Phiếu đã tạo và thực thi thành công!' : 'Phiếu đã tạo thành công, bạn có thể gửi duyệt.');
      setShowCreateModal(false);
      resetCreateForm();
      fetchTickets();
    } catch (err: any) {
      addToast('Lỗi tạo phiếu: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateType('RECEIVE');
    setCreateReason('');
    setCreateNote('');
    setCreateLines([{ itemId: '', qty: 1, note: '' }]);
  };

  // Quick actions
  const handleSubmit = async (id: string) => {
    try {
      await api.post(`/warehouse-tickets/${id}/submit`);
      addToast('Phiếu đã gửi duyệt thành công!');
      fetchTickets();
    } catch (err: any) {
      addToast('Lỗi: ' + (err.response?.data?.error || 'Không thể gửi duyệt'), 'error');
    }
  };

  const handleApproveAndExecute = async (id: string) => {
    try {
      await api.post(`/warehouse-tickets/${id}/approve`);
      await api.post(`/warehouse-tickets/${id}/execute`);
      addToast('Duyệt & thực thi thành công!');
      fetchTickets();
    } catch (err: any) {
      addToast('Lỗi: ' + (err.response?.data?.error || 'Không thể duyệt'), 'error');
    }
  };

  // Available items for the item picker
  const availableItems = items.filter(i => i.itemType === 'VPP' || i.itemType === 'VE_SINH');

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] p-4 md:p-8 bg-slate-50 relative overflow-hidden">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <ClipboardList className="w-7 h-7 mr-3 text-indigo-600" /> Phiếu kho
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Quản lý phiếu nhập / xuất / điều chỉnh kho — quy trình 2 lớp phê duyệt</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchTickets} className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition" title="Làm mới">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          {canCreate && (
            <button onClick={() => setShowCreateModal(true)} className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition transform hover:-translate-y-0.5">
              <Plus className="w-5 h-5 mr-2" /> Tạo phiếu mới
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6 shrink-0">
          {[
            { label: 'Tổng', value: summary.total, color: 'indigo', icon: Package },
            { label: 'Nháp', value: summary.draft, color: 'slate', icon: FileX2 },
            { label: 'Chờ duyệt', value: summary.pending, color: 'amber', icon: Clock },
            { label: 'Đã duyệt', value: summary.approved, color: 'blue', icon: CheckCircle2 },
            { label: 'Đã thực thi', value: summary.executed, color: 'emerald', icon: Zap },
            { label: 'Từ chối', value: summary.rejected, color: 'rose', icon: XCircle },
            { label: 'Đã hủy', value: summary.cancelled, color: 'gray', icon: Ban },
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <button key={i} onClick={() => { setStatusFilter(c.label === 'Tổng' ? 'ALL' : ['DRAFT', 'PENDING_ADMIN_APPROVAL', 'APPROVED', 'EXECUTED', 'REJECTED', 'CANCELLED'][i - 1]); }}
                className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer text-left ${statusFilter === (['ALL', 'DRAFT', 'PENDING_ADMIN_APPROVAL', 'APPROVED', 'EXECUTED', 'REJECTED', 'CANCELLED'][i]) ? 'ring-2 ring-indigo-400' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 bg-${c.color}-100 text-${c.color}-600`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{c.label}</p>
                <p className="text-xl font-black text-slate-800">{c.value}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-t-2xl shadow-sm border border-slate-200 border-b-0 flex gap-3 flex-wrap shrink-0 items-center justify-between z-10">
        <div className="flex gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[['ALL', 'Tất cả'], ['RECEIVE', 'Nhập'], ['ISSUE', 'Xuất'], ['ADJUSTMENT', 'Điều chỉnh']].map(([val, lbl]) => (
              <button key={val} onClick={() => setTypeFilter(val)} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${typeFilter === val ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{lbl}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Mã phiếu, tên hàng, người tạo..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm outline-none transition-all" />
          </div>
          {(statusFilter !== 'ALL' || typeFilter !== 'ALL' || searchQuery) && (
            <button onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); setSearchQuery(''); }} className="px-3 py-2 text-rose-500 hover:bg-rose-50 text-sm font-bold rounded-xl transition whitespace-nowrap">Xóa lọc</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-b-2xl shadow-[0_0_15px_rgba(0,0,0,0.03)] border border-slate-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 relative">
          <table className="w-full text-left whitespace-nowrap min-w-max">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20 shadow-sm">
              <tr className="text-xs uppercase font-black text-slate-500 tracking-wider">
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">Mã phiếu</th>
                <th className="p-4 text-center">Loại</th>
                <th className="p-4">Người tạo</th>
                <th className="p-4">Thời gian tạo</th>
                <th className="p-4">Lý do</th>
                <th className="p-4 text-center">Số dòng</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4">Người duyệt</th>
                <th className="p-4 text-right pr-6">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={10} className="p-12 text-center text-slate-400 font-bold animate-pulse">Đang tải phiếu kho...</td></tr>
              ) : pagedTickets.length === 0 ? (
                <tr><td colSpan={10} className="p-12 text-center text-slate-400 font-medium">
                  {filteredTickets.length === 0 ? 'Chưa có phiếu kho nào.' : 'Không tìm thấy phiếu phù hợp bộ lọc.'}
                </td></tr>
              ) : pagedTickets.map((t, idx) => {
                const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.DRAFT;
                const tc = TYPE_CONFIG[t.ticketType] || TYPE_CONFIG.RECEIVE;
                const TypeIcon = tc.icon;
                const StatusIcon = sc.icon;
                return (
                  <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors group cursor-pointer" onClick={() => navigate(`/warehouse-tickets/${t.id}`)}>
                    <td className="p-4 text-center text-xs text-slate-400 font-bold">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="p-4 font-black text-indigo-700 tracking-wide">{t.ticketCode}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 font-bold text-sm ${tc.color}`}>
                        <TypeIcon className="w-4 h-4" /> {tc.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-700">{t.createdBy.fullName}</span>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.createdBy.role}</span>
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-medium">{new Date(t.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="p-4 text-sm text-slate-500 font-medium max-w-[200px] truncate">{t.reason || '—'}</td>
                    <td className="p-4 text-center font-bold text-slate-600">{t.lines.length}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] uppercase tracking-wider font-black rounded-full border ${sc.cls}`}>
                        <StatusIcon className="w-3 h-3" /> {sc.label}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-medium">{t.approvedBy?.fullName || '—'}</td>
                    <td className="p-4 text-right pr-6">
                      <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/warehouse-tickets/${t.id}`)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Xem chi tiết">
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* WAREHOUSE: submit draft */}
                        {isWarehouse && t.status === 'DRAFT' && t.createdBy.username === currentUser?.username && (
                          <button onClick={() => handleSubmit(t.id)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Gửi duyệt">
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {/* ADMIN: approve + execute */}
                        {isAdmin && t.status === 'PENDING_ADMIN_APPROVAL' && (
                          <button onClick={() => handleApproveAndExecute(t.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Duyệt & thực thi">
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-slate-50 p-3 border-t border-slate-200 text-xs font-bold text-slate-500 shrink-0 flex items-center justify-between px-6">
          <span>Hiển thị {filteredTickets.length > 0 ? (safePage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(safePage * PAGE_SIZE, filteredTickets.length)} / {filteredTickets.length} phiếu</span>
          <div className="flex items-center gap-2">
            <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-2">Trang {safePage} / {totalPages}</span>
            <button disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* ── CREATE MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-bold text-slate-800">Tạo phiếu kho mới</h2>
              <button onClick={() => { setShowCreateModal(false); resetCreateForm(); }} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-8 overflow-y-auto bg-slate-50/50">
              {isAdmin && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-700 flex items-center">
                  <Zap className="w-4 h-4 mr-2" /> Bạn là Admin — phiếu sẽ được tự động thực thi ngay khi tạo.
                </div>
              )}
              {/* Type selector */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Loại phiếu *</label>
                <div className="flex gap-2">
                  {(['RECEIVE', 'ISSUE', 'ADJUSTMENT'] as const).map(t => {
                    const cfg = TYPE_CONFIG[t];
                    const Icon = cfg.icon;
                    return (
                      <button key={t} onClick={() => setCreateType(t)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold border-2 transition ${createType === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                        <Icon className="w-5 h-5" /> {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reason */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Lý do *</label>
                <input value={createReason} onChange={e => setCreateReason(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm" placeholder="Nhập lý do nhập/xuất/điều chỉnh..." />
              </div>

              {/* Note */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Ghi chú</label>
                <textarea value={createNote} onChange={e => setCreateNote(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm h-20" placeholder="Ghi chú thêm (không bắt buộc)..." />
              </div>

              {/* Lines */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Danh sách hàng hóa *</label>
                <div className="space-y-3">
                  {createLines.map((line, i) => (
                    <div key={i} className="flex gap-3 items-start bg-white p-3 rounded-xl border border-slate-200">
                      <div className="flex-[3]">
                        <select value={line.itemId} onChange={e => { const nl = [...createLines]; nl[i].itemId = e.target.value; setCreateLines(nl); }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                          <option value="">-- Chọn hàng hóa --</option>
                          {availableItems.map(item => (
                            <option key={item.id} value={item.id}>{item.mvpp} — {item.name} ({item.unit})</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <input type="number" min="1" value={line.qty} onChange={e => { const nl = [...createLines]; nl[i].qty = Math.max(1, Number(e.target.value)); setCreateLines(nl); }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-center" placeholder="SL" />
                      </div>
                      <div className="flex-[2]">
                        <input value={line.note} onChange={e => { const nl = [...createLines]; nl[i].note = e.target.value; setCreateLines(nl); }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ghi chú dòng" />
                      </div>
                      {createLines.length > 1 && (
                        <button onClick={() => setCreateLines(createLines.filter((_, j) => j !== i))} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setCreateLines([...createLines, { itemId: '', qty: 1, note: '' }])}
                    className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition flex items-center justify-center">
                    <Plus className="w-4 h-4 mr-2" /> Thêm dòng hàng
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex gap-4 border-t border-slate-200 pt-6">
                <button type="button" onClick={() => { setShowCreateModal(false); resetCreateForm(); }} className="flex-1 py-3.5 font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-sm">Hủy bỏ</button>
                <button onClick={handleCreate} disabled={creating} className="flex-[2] py-3.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-lg shadow-indigo-500/30 flex items-center justify-center disabled:opacity-50">
                  {creating ? 'Đang tạo...' : isAdmin ? '⚡ Tạo & Thực thi phiếu' : 'Tạo phiếu nháp'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
