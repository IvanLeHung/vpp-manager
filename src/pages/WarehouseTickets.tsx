import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Plus, Search, ChevronLeft, ChevronRight, RefreshCw,
  ArrowDownToLine, ArrowUpFromLine, Settings2, Eye, X, XCircle,
  CheckCircle2, Clock, FileX2, Zap, Ban, Package, Send, Check, ArrowLeft,
  Download, FilePieChart
} from 'lucide-react';
import api from '../lib/api';
import { useAppContext } from '../context/AppContext';
import WarehouseTicketModal from '../components/warehouse/WarehouseTicketModal';
import * as XLSX from 'xlsx';

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
  receiverName: string | null;
  receiverDept: string | null;
  receiverType: string | null;
  issueType: string | null;
  lines: TicketLine[];
};
type Summary = {
  total: number; pending: number; approved: number; rejected: number;
  executed: number; draft: number; cancelled: number;
  handedOver: number; returned: number;
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
  WAITING_HANDOVER: { label: 'Chờ bàn giao', cls: 'bg-blue-50 text-blue-600 border-blue-200', icon: Clock },
  HANDED_OVER: { label: 'Hoàn thành', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: CheckCircle2 },
  RETURNED: { label: 'Đã hoàn kho', cls: 'bg-rose-50 text-rose-600 border-rose-200', icon: ArrowLeft },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-gray-50 text-gray-400 border-gray-200', icon: Ban },
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  WAREHOUSE: 'Thủ kho',
  MANAGER: 'Quản lý',
  EMPLOYEE: 'Nhân viên',
  ACCOUNTANT: 'Kế toán',
  PURCHASING: 'Mua hàng'
};

const TYPE_CONFIG: Record<string, { label: string, color: string, icon: any }> = {
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

export default function WarehouseTickets({ warehouseCode: initialWarehouseCode = 'ALL', basePath = '/warehouse-tickets' }: { warehouseCode?: string; basePath?: string }) {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
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
  const [warehouseFilter, setWarehouseFilter] = useState(initialWarehouseCode);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      if (warehouseFilter !== 'ALL') params.warehouseCode = warehouseFilter;
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

  useEffect(() => { fetchTickets(); }, [statusFilter, typeFilter, warehouseFilter]);

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

  const handleTicketSuccess = () => {
    addToast(isAdmin ? 'Phiếu đã tạo và thực thi thành công!' : 'Phiếu đã tạo thành công, bạn có thể gửi duyệt.');
    fetchTickets();
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

  const handleExportExcel = () => {
    try {
      const data = filteredTickets.map((t, idx) => ({
        'STT': idx + 1,
        'Mã phiếu': t.ticketCode,
        'Loại': TYPE_CONFIG[t.ticketType]?.label || t.ticketType,
        'Người tạo': t.createdBy.fullName,
        'Người nhận': t.receiverName || '—',
        'Bộ phận nhận': t.receiverDept || '—',
        'Thời gian': new Date(t.createdAt).toLocaleString('vi-VN'),
        'Trạng thái': STATUS_CONFIG[t.status]?.label || t.status,
        'Lý do': t.reason || '—'
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Danh sách phiếu");
      XLSX.writeFile(wb, `Danh_sach_phieu_kho_${new Date().toISOString().split('T')[0]}.xlsx`);
      addToast('Xuất Excel thành công!');
    } catch (err) {
      console.error(err);
      addToast('Lỗi xuất Excel', 'error');
    }
  };

  const handleBatchPrint = () => {
    if (selectedTickets.length === 0) return addToast('Vui lòng chọn ít nhất 1 phiếu', 'error');
    if (selectedTickets.length > 10) return addToast('Vui lòng chọn tối đa 10 phiếu mỗi lần in', 'error');
    selectedTickets.forEach((id, index) => {
      setTimeout(() => {
        window.open(`${basePath}/${id}?autoprint=true`, '_blank');
      }, index * 500);
    });
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 1000 };
      if (warehouseFilter !== 'ALL') params.warehouseCode = warehouseFilter;
      const res = await api.get('/warehouse-tickets', { params });
      const allTickets = res.data.data;

      const data = [];
      for (const t of allTickets) {
        for (const l of t.lines) {
          data.push({
            'Mã phiếu': t.ticketCode,
            'Loại': TYPE_CONFIG[t.ticketType]?.label || t.ticketType,
            'Kho': t.warehouseCode,
            'Ngày': new Date(t.createdAt).toLocaleDateString('vi-VN'),
            'Mã vật tư': l.item.mvpp,
            'Tên vật tư': l.item.name,
            'ĐVT': l.item.unit,
            'Số lượng': l.qty,
            'Người tạo': t.createdBy.fullName,
            'Người nhận': t.receiverName || '—',
            'Lý do': t.reason || '—'
          });
        }
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Báo cáo chi tiết");
      XLSX.writeFile(wb, `Bao_cao_xuat_nhap_${warehouseFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
      addToast('Lập báo cáo thành công!');
    } catch (err) {
      console.error(err);
      addToast('Lỗi lập báo cáo', 'error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] p-4 md:p-8 bg-slate-50 relative">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center uppercase italic tracking-tight">
            <ClipboardList className="w-7 h-7 mr-3 text-indigo-600" /> Quản lý Phiếu kho
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 ml-10">Hệ thống chứng từ kho tập trung</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchTickets} className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition" title="Làm mới">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button onClick={handleExportExcel} className="flex items-center px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 shadow-sm transition-all">
            <Download className="w-4 h-4 mr-2" /> Xuất Excel
          </button>
          <button onClick={handleGenerateReport} className="flex items-center px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 shadow-sm transition-all">
            <FilePieChart className="w-4 h-4 mr-2" /> Lập báo cáo
          </button>
          {selectedTickets.length > 0 && (
            <button onClick={handleBatchPrint} className="flex items-center px-4 py-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-100 shadow-sm transition-all animate-in zoom-in-95">
              <Printer className="w-4 h-4 mr-2" /> In phiếu ({selectedTickets.length})
            </button>
          )}
          {canCreate && (
            <button onClick={() => setShowCreateModal(true)} className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all transform hover:-translate-y-1 active:translate-y-0">
              <Plus className="w-5 h-5 mr-2" /> Tạo phiếu mới
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 mb-6 shrink-0">
          {[
            { label: 'Tổng', value: summary.total, color: 'indigo', icon: Package, status: 'ALL' },
            { label: 'Nháp', value: summary.draft, color: 'slate', icon: FileX2, status: 'DRAFT' },
            { label: 'Chờ duyệt', value: summary.pending, color: 'amber', icon: Clock, status: 'PENDING_ADMIN_APPROVAL' },
            { label: 'Đã duyệt', value: summary.approved, color: 'blue', icon: CheckCircle2, status: 'APPROVED' },
            { label: 'Thực thi', value: summary.executed, color: 'emerald', icon: Zap, status: 'EXECUTED' },
            { label: 'Hoàn thành', value: summary.handedOver, color: 'indigo', icon: CheckCircle2, status: 'HANDED_OVER' },
            { label: 'Hoàn kho', value: summary.returned, color: 'rose', icon: ArrowLeft, status: 'RETURNED' },
            { label: 'Từ chối', value: summary.rejected, color: 'rose', icon: XCircle, status: 'REJECTED' },
            { label: 'Đã hủy', value: summary.cancelled, color: 'gray', icon: Ban, status: 'CANCELLED' },
          ].map((c, i) => {
            const Icon = c.icon;
            const isSelected = statusFilter === c.status;
            return (
              <button key={i} onClick={() => { setStatusFilter(c.status); }}
                className={`bg-white p-4 rounded-2xl shadow-sm border transition-all cursor-pointer text-left ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/5 shadow-md scale-105 z-10' : 'border-slate-100 hover:border-slate-200'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest truncate">{c.label}</p>
                <p className="text-xl font-black text-slate-800">{c.value}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-5 rounded-t-[2rem] shadow-sm border border-slate-200 border-b-0 flex gap-4 flex-wrap shrink-0 items-center justify-between z-10">
        <div className="flex gap-4 items-center">
          <div className="flex bg-slate-100 p-1.5 rounded-[1.25rem] border border-slate-200">
            {[['ALL', 'Tất cả'], ['MAIN', 'VPP'], ['VE_SINH', 'Vệ sinh'], ['CCDC', 'CCDC']].map(([val, lbl]) => (
              <button key={val} onClick={() => setWarehouseFilter(val)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${warehouseFilter === val ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{lbl}</button>
            ))}
          </div>
          <div className="h-8 w-px bg-slate-200 mx-1"></div>
          <div className="flex bg-slate-100 p-1.5 rounded-[1.25rem] border border-slate-200">
            {[['ALL', 'Tất cả'], ['RECEIVE', 'Nhập'], ['ISSUE', 'Xuất'], ['ADJUSTMENT', 'Điều chỉnh']].map(([val, lbl]) => (
              <button key={val} onClick={() => setTypeFilter(val)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === val ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{lbl}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm mã phiếu, vật tư, lý do..."
              className="w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-sm placeholder:font-medium placeholder:text-slate-300" />
          </div>
          {(statusFilter !== 'ALL' || typeFilter !== 'ALL' || warehouseFilter !== 'ALL' || searchQuery) && (
            <button onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); setWarehouseFilter('ALL'); setSearchQuery(''); }} className="px-4 py-2 text-rose-500 hover:bg-rose-50 text-[10px] font-black uppercase tracking-widest rounded-xl transition whitespace-nowrap">Xóa bộ lọc</button>
          )}
        </div>
      </div>


      {/* Table */}
      <div className="bg-white rounded-b-2xl shadow-[0_0_15px_rgba(0,0,0,0.03)] border border-slate-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 relative">
          <table className="w-full text-left whitespace-nowrap min-w-max">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20 shadow-sm">
              <tr className="text-xs uppercase font-black text-slate-500 tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={pagedTickets.length > 0 && selectedTickets.length === pagedTickets.length}
                    onChange={e => {
                      if (e.target.checked) setSelectedTickets(pagedTickets.map(t => t.id));
                      else setSelectedTickets([]);
                    }}
                  />
                </th>
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">Phiếu (Loại / Thời gian)</th>
                <th className="p-4">Người tạo</th>
                <th className="p-4">Người nhận</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4">Lý do</th>
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
                  <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors group cursor-pointer" onClick={() => navigate(`${basePath}/${t.id}`)}>
                    <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                       <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                         checked={selectedTickets.includes(t.id)}
                         onChange={e => {
                           if (e.target.checked) setSelectedTickets([...selectedTickets, t.id]);
                           else setSelectedTickets(selectedTickets.filter(id => id !== t.id));
                         }}
                       />
                    </td>
                    <td className="p-4 text-center text-xs text-slate-400 font-bold">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="p-4">
                      <div className="font-black text-indigo-700 tracking-wide">{t.ticketCode}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <TypeIcon className={`w-3 h-3 ${tc.color}`} />
                        <span className={`text-[10px] font-black uppercase ${tc.color}`}>{tc.label}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] text-slate-400 font-bold">{new Date(t.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-700">{t.createdBy.fullName}</span>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{ROLE_LABELS[t.createdBy.role] || t.createdBy.role}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-700">{t.receiverName || '—'}</span>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.receiverDept || '—'}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] uppercase tracking-wider font-black rounded-full border ${sc.cls}`}>
                        <StatusIcon className="w-3 h-3" /> {sc.label}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-500 font-medium max-w-[200px] truncate">{t.reason || '—'}</td>
                    <td className="p-4 text-right pr-6">
                      <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`${basePath}/${t.id}`)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Xem chi tiết">
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
      <WarehouseTicketModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleTicketSuccess}
        warehouseCode={warehouseFilter === 'ALL' ? 'MAIN' : warehouseFilter}
        initialType="ISSUE"
      />
    </div>
  );
}
