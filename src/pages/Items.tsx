import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Search, History, Download, Upload, RefreshCw, MoreHorizontal,
  CheckSquare, Square, XCircle, Edit2, Copy, ShieldBan, ShieldCheck,
  ChevronDown, ChevronLeft, ChevronRight, AlertTriangle, TrendingUp,
  ArrowDownToLine, ArrowUpFromLine, Eye, X
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';
import * as XLSX from 'xlsx';
import { useAppContext } from '../context/AppContext';

// ── Types ──
type ItemData = {
  id: string; mvpp: string; name: string; category: string; unit: string;
  price: number; quota: number; itemType: string; isActive: boolean;
  stock: number; reserved: number; updatedAt: string;
};
type SummaryData = {
  totalItems: number; activeItems: number; outOfStock: number; lowStock: number;
  totalStockValue: number; movementsToday: number;
  alerts: { type: string; message: string; count: number }[];
  categoryBreakdown: { name: string; value: number }[];
  topItemsByUsage: { name: string; mvpp: string; count: number }[];
};
type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

// ── Helpers ──
const PIE_COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
const PAGE_SIZE = 20;

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

function stockStatus(item: ItemData) {
  if (item.reserved > 0 && item.stock === 0) return { label: 'Tạm giữ', cls: 'bg-purple-100 text-purple-700' };
  if (item.stock === 0) return { label: 'Hết hàng', cls: 'bg-rose-100 text-rose-700' };
  const threshold = Math.max(Math.floor(item.quota * 0.2), 5);
  if (item.stock <= threshold) return { label: 'Sắp hết', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Còn hàng', cls: 'bg-emerald-100 text-emerald-700' };
}

// ── Toast Component ──
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-bold animate-in slide-in-from-right-5 ${t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-rose-600' : 'bg-indigo-600'}`}>
          <span>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}

export default function Items() {
  const { currentUser } = useAppContext();
  const role = currentUser?.role || 'EMPLOYEE';
  const isEmployee = role === 'EMPLOYEE';
  const isAdmin = role === 'ADMIN';
  const isWarehouse = role === 'WAREHOUSE';

  const [items, setItems] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [tabFilter, setTabFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [page, setPage] = useState(1);

  // Modals
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemData | null>(null);
  const [formData, setFormData] = useState({ mvpp: '', name: '', category: '', unit: '', price: 0, quota: 100, itemType: 'VPP', isActive: true });
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<{ isOpen: boolean; item: ItemData | null; reason: string; targetStatus: boolean }>({ isOpen: false, item: null, reason: '', targetStatus: false });

  // Toast
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };
  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/items?all=true');
      setItems(res.data);
      setSelectedIds(new Set());
      setActiveMenuId(null);
    } catch (error) { console.error('Lỗi tải danh mục:', error); }
    finally { setLoading(false); }
  };

  const fetchSummary = async () => {
    try { const res = await api.get('/items/summary'); setSummary(res.data); }
    catch (e) { console.error('Lỗi tải summary:', e); }
  };

  useEffect(() => { fetchItems(); fetchSummary(); }, []);

  // ── Form Save ──
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, price: Number(formData.price), quota: Number(formData.quota) };
      if (editingItem) { await api.patch(`/items/${editingItem.id}`, payload); }
      else { await api.post('/items', payload); }
      setShowItemForm(false);
      addToast(editingItem ? 'Đã cập nhật hàng hoá thành công!' : 'Đã thêm hàng hoá mới!');
      fetchItems(); fetchSummary();
    } catch (error: any) {
      addToast('Lỗi: ' + (error.response?.data?.error || 'Không thể lưu.'), 'error');
    }
  };

  const generateCode = () => {
    const prefix = formData.itemType === 'VPP' ? 'VPP' : 'VS';
    const count = items.filter(i => i.mvpp.startsWith(prefix)).length + 1;
    setFormData({ ...formData, mvpp: `${prefix}${String(count).padStart(3, '0')}` });
  };

  const confirmChangeStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModal.item) return;
    if (!statusModal.targetStatus && !statusModal.reason.trim()) { addToast('Vui lòng nhập lý do.', 'error'); return; }
    try {
      await api.patch(`/items/${statusModal.item.id}`, { isActive: statusModal.targetStatus });
      setStatusModal({ isOpen: false, item: null, reason: '', targetStatus: false });
      addToast('Đã thay đổi trạng thái!');
      fetchItems(); fetchSummary();
    } catch { addToast('Lỗi khi đổi trạng thái', 'error'); }
  };

  const handleExport = () => {
    const data = filteredItems.length > 0 ? filteredItems : items;
    const exp = data.map((d, i) => ({ 'STT': i + 1, 'Mã VPP': d.mvpp, 'Tên Hàng Hóa': d.name, 'Phân loại': d.category, 'ĐVT': d.unit, 'Đơn giá': d.price, 'Định mức': d.quota, 'Tồn kho': d.stock, 'Trạng thái': d.isActive ? 'Đang cấp' : 'Ngừng cấp' }));
    const ws = XLSX.utils.json_to_sheet(exp);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Muc");
    XLSX.writeFile(wb, `Danh_Muc_VPP_${new Date().getTime()}.xlsx`);
    addToast('Đã xuất file Excel!', 'info');
  };

  // ── Filtering & Sorting ──
  const filteredItems = items.filter(i => {
    if (tabFilter !== 'ALL' && i.itemType !== tabFilter) return false;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE' && !i.isActive) return false;
      if (statusFilter === 'INACTIVE' && i.isActive) return false;
    }
    if (stockFilter !== 'ALL') {
      const s = stockStatus(i).label;
      if (stockFilter === 'IN_STOCK' && s !== 'Còn hàng') return false;
      if (stockFilter === 'LOW' && s !== 'Sắp hết') return false;
      if (stockFilter === 'OUT' && s !== 'Hết hàng') return false;
      if (stockFilter === 'RESERVED' && s !== 'Tạm giữ') return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return i.name.toLowerCase().includes(q) || i.mvpp.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'stock') cmp = a.stock - b.stock;
    else if (sortBy === 'price') cmp = a.price - b.price;
    else if (sortBy === 'updatedAt') cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    else cmp = a.name.localeCompare(b.name);
    return sortDir === 'desc' ? -cmp : cmp;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [tabFilter, searchQuery, statusFilter, stockFilter, sortBy, sortDir]);

  // Selection
  const toggleAll = () => {
    if (selectedIds.size === paginatedItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginatedItems.map(i => i.id)));
  };
  const toggleSelect = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };
  const handleBulkStatusChange = async (target: boolean) => {
    if (!confirm(`Xác nhận chuyển ${selectedIds.size} mặt hàng sang ${target ? 'ĐANG CẤP' : 'NGỪNG CẤP'}?`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map(id => api.patch(`/items/${id}`, { isActive: target })));
      addToast(`Đã cập nhật ${selectedIds.size} mặt hàng!`);
      fetchItems(); fetchSummary();
    } catch { addToast('Có lỗi xảy ra.', 'error'); }
  };

  const openAdd = () => {
    setEditingItem(null);
    setFormData({ mvpp: '', name: '', category: '', unit: '', price: 0, quota: 100, itemType: 'VPP', isActive: true });
    setShowItemForm(true);
  };

  const isEmptyState = !loading && items.length === 0;

  // ── RENDER ──
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] p-4 md:p-8 bg-slate-50 relative overflow-hidden" onClick={() => setActiveMenuId(null)}>
      {/* Toast */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Package className="w-7 h-7 mr-3 text-indigo-600" /> Danh mục Hàng hoá
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Quản lý định mức, thông tin VPP / Vệ sinh</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          {!isEmployee && (
            <button className="flex items-center px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition" onClick={() => addToast('Chức năng Lịch sử đang phát triển...', 'info')}>
              <History className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Lịch sử</span>
            </button>
          )}
          {!isEmployee && <div className="w-px h-6 bg-slate-200 mx-1" />}
          
          {!isEmployee && (
            <button onClick={handleExport} className="flex items-center px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition">
              <Download className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Export Excel</span>
            </button>
          )}
          {isAdmin && (
            <button className="flex items-center px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 rounded-xl transition" onClick={() => addToast('Tính năng Import Excel sẽ được mở sớm.', 'info')}>
              <Upload className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Import Excel</span>
            </button>
          )}
          
          {!isEmployee && <div className="w-px h-6 bg-slate-200 mx-1" />}
          
          <button onClick={() => { fetchItems(); fetchSummary(); }} className="flex items-center px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition" title="Làm mới">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          
          {isAdmin && (
            <button onClick={openAdd} className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition transform hover:-translate-y-0.5 ml-2">
              <Plus className="w-5 h-5 mr-2" /> Thêm hàng hóa mới
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards + Alerts + Chart Row */}
      {summary && !isEmptyState && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6 shrink-0">
          {/* 5 Summary Cards */}
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Tổng danh mục', value: summary.totalItems, icon: Package, color: 'indigo' },
              { label: 'Sẵn sàng cấp', value: summary.activeItems, icon: ShieldCheck, color: 'emerald' },
              { label: 'Sắp hết', value: summary.lowStock, icon: AlertTriangle, color: 'amber' },
              { label: 'Hết hàng', value: summary.outOfStock, icon: XCircle, color: 'rose' },
              ...(isEmployee ? [] : [{ label: 'Giá trị tồn', value: summary.totalStockValue.toLocaleString('vi-VN') + 'đ', icon: TrendingUp, color: 'cyan' }]),
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group cursor-default`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 bg-${c.color}-100 text-${c.color}-600`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">{c.value}</p>
                </div>
              );
            })}
          </div>
          {/* Alerts Block */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center"><AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-500" />Cần xử lý</p>
            {summary.alerts.length === 0 ? (
              <p className="text-sm text-emerald-600 font-medium">✓ Không có cảnh báo nào</p>
            ) : (
              <div className="space-y-1.5">
                {summary.alerts.map((a, i) => (
                  <button key={i} onClick={() => {
                    if (a.type === 'OUT_OF_STOCK') setStockFilter('OUT');
                    else if (a.type === 'LOW_STOCK') setStockFilter('LOW');
                  }} className="w-full text-left text-sm font-medium text-slate-700 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${a.type === 'OUT_OF_STOCK' ? 'bg-rose-500' : a.type === 'LOW_STOCK' ? 'bg-amber-500' : a.type === 'PENDING_REQUESTS' ? 'bg-blue-500' : 'bg-indigo-500'}`} />
                    {a.message}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Mini Pie Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col items-center justify-center">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Nhóm hàng</p>
            {summary.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={110}>
                <PieChart>
                  <Pie data={summary.categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={45} innerRadius={20} strokeWidth={2}>
                    {summary.categoryBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <ReTooltip formatter={(v: any, n: any) => [`${v} mục`, n]} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-slate-400">Chưa có dữ liệu</p>}
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && isAdmin && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-50">
          <span className="font-bold border-r border-slate-600 pr-4">{selectedIds.size} mục được chọn</span>
          <button onClick={() => handleBulkStatusChange(true)} className="text-sm font-bold flex items-center hover:text-emerald-400 transition"><ShieldCheck className="w-4 h-4 mr-1" />Kích hoạt</button>
          <button onClick={() => handleBulkStatusChange(false)} className="text-sm font-bold flex items-center hover:text-amber-400 transition"><ShieldBan className="w-4 h-4 mr-1" />Ngừng cấp</button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-4 text-slate-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-t-2xl shadow-sm border border-slate-200 border-b-0 flex gap-3 flex-wrap shrink-0 items-center justify-between z-10">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {[['ALL', 'Tất cả'], ['VPP', 'Văn phòng phẩm'], ['VE_SINH', 'Đồ vệ sinh']].map(([val, lbl]) => (
            <button key={val} onClick={() => setTabFilter(val)} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${tabFilter === val ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{lbl}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tra cứu tên / mã..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm outline-none transition-all" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-xl px-3 py-2 font-bold outline-none cursor-pointer">
            <option value="ALL">Mọi trạng thái</option>
            <option value="ACTIVE">Đang cấp</option>
            <option value="INACTIVE">Ngừng cấp</option>
          </select>
          <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-xl px-3 py-2 font-bold outline-none cursor-pointer">
            <option value="ALL">Mọi tồn kho</option>
            <option value="IN_STOCK">Còn hàng</option>
            <option value="LOW">Sắp hết</option>
            <option value="OUT">Hết hàng</option>
            <option value="RESERVED">Tạm giữ</option>
          </select>
          <select value={`${sortBy}_${sortDir}`} onChange={e => { const [s, d] = e.target.value.split('_'); setSortBy(s); setSortDir(d as 'asc' | 'desc'); }} className="bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-xl px-3 py-2 font-bold outline-none cursor-pointer">
            <option value="name_asc">Tên A→Z</option>
            <option value="stock_asc">Tồn kho ↑</option>
            <option value="stock_desc">Tồn kho ↓</option>
            <option value="price_desc">Đơn giá ↓</option>
            <option value="updatedAt_desc">Mới cập nhật</option>
          </select>
          {(searchQuery || statusFilter !== 'ALL' || tabFilter !== 'ALL' || stockFilter !== 'ALL') && (
            <button onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setTabFilter('ALL'); setStockFilter('ALL'); }} className="px-3 py-2 text-rose-500 hover:bg-rose-50 text-sm font-bold rounded-xl transition whitespace-nowrap">Xóa lọc</button>
          )}
        </div>
      </div>

      {/* Table or Empty State */}
      <div className="bg-white rounded-b-2xl shadow-[0_0_15px_rgba(0,0,0,0.03)] border border-slate-200 flex-1 overflow-hidden flex flex-col">
        {isEmptyState ? (
          /* ── EMPTY STATE CTA ── */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="w-24 h-24 rounded-3xl bg-indigo-50 flex items-center justify-center mx-auto mb-6">
                <Package className="w-12 h-12 text-indigo-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Kho hiện chưa có vật tư</h2>
              <p className="text-slate-500 mb-8 font-medium">Bạn có thể thêm mới từng vật tư hoặc import danh sách từ Excel để bắt đầu quản lý tồn kho.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {isAdmin && (
                  <button onClick={openAdd} className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition transform hover:-translate-y-0.5">
                    <Plus className="w-5 h-5 mr-2" /> Thêm vật tư
                  </button>
                )}
                {isAdmin && (
                  <button className="flex items-center justify-center px-6 py-3 bg-white text-blue-700 border-2 border-blue-200 rounded-xl font-bold hover:bg-blue-50 transition" onClick={() => addToast('Tính năng Import Excel sẽ được mở sớm.', 'info')}>
                    <Upload className="w-5 h-5 mr-2" /> Import Excel
                  </button>
                )}
              </div>
              {isAdmin && (
                <button className="mt-4 text-sm text-indigo-600 hover:underline font-medium" onClick={() => addToast('File mẫu sẽ được cung cấp sớm.', 'info')}>↓ Tải file mẫu import Excel</button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-auto flex-1 relative">
              <table className="w-full text-left whitespace-nowrap min-w-max">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                  <tr className="text-xs uppercase font-black text-slate-500 tracking-wider">
                    <th className="p-4 w-12 text-center">
                      {isAdmin && (
                        <button onClick={toggleAll} className="text-slate-400 hover:text-indigo-600 transition">
                          {paginatedItems.length > 0 && selectedIds.size === paginatedItems.length ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5" />}
                        </button>
                      )}
                    </th>
                    <th className="p-4">M Mã VT</th>
                    <th className="p-4">Tên hàng hóa</th>
                    <th className="p-4">Phân loại</th>
                    <th className="p-4 text-center">ĐVT</th>
                    {!isEmployee && <th className="p-4 text-right">Đơn giá</th>}
                    <th className="p-4 text-right">Định mức</th>
                    <th className="p-4 text-center">Trạng thái</th>
                    <th className="p-4 text-center">Tồn Kho</th>
                    <th className="p-4 text-center">Tồn kho TT</th>
                    <th className="p-4 text-center">Cập nhật</th>
                    <th className="p-4 text-right pr-6 w-20">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={12} className="p-12 text-center text-slate-400 font-bold animate-pulse">Đang tải danh mục...</td></tr>
                  ) : paginatedItems.length === 0 ? (
                    <tr><td colSpan={12} className="p-12 text-center text-slate-400 font-medium">Không tìm thấy hàng hoá nào phù hợp bộ lọc.</td></tr>
                  ) : paginatedItems.map(item => {
                    const ss = stockStatus(item);
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <tr key={item.id} className={`hover:bg-indigo-50/30 transition-colors group ${!item.isActive ? 'bg-slate-50/50 opacity-75' : ''} ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                        <td className="p-4 text-center">
                          {isAdmin && (
                            <button onClick={() => toggleSelect(item.id)} className="text-slate-300 hover:text-indigo-600 focus:outline-none">
                              {isSelected ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5" />}
                            </button>
                          )}
                        </td>
                        <td className="p-4 font-black tracking-wide text-slate-600">{item.mvpp}</td>
                        <td className="p-4 font-bold text-slate-800">
                          <span className={`w-2 h-2 rounded-full inline-block mr-2 ${item.itemType === 'VPP' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                          {item.name}
                        </td>
                        <td className="p-4 text-slate-600 font-medium">{item.category}</td>
                        <td className="p-4 text-center text-slate-500 font-medium">{item.unit}</td>
                        {!isEmployee && <td className="p-4 text-right font-bold text-amber-700">{item.price.toLocaleString('vi-VN')} đ</td>}
                        <td className="p-4 text-right font-black text-slate-700">{item.quota}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-black rounded-full ${item.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                            {item.isActive ? 'ĐANG CẤP' : 'NGỪNG CẤP'}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold text-indigo-600">{item.stock}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-black rounded-full ${ss.cls}`} title={`Tồn: ${item.stock} | Ngưỡng: ${Math.max(Math.floor(item.quota * 0.2), 5)} | Tạm giữ: ${item.reserved}`}>
                            {ss.label}
                          </span>
                        </td>
                        <td className="p-4 text-center text-xs text-slate-400 font-medium" title={new Date(item.updatedAt).toLocaleString('vi-VN')}>{relativeTime(item.updatedAt)}</td>
                        <td className="p-4 text-right relative pr-6">
                          <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                          {activeMenuId === item.id && (
                            <div className="absolute right-8 top-10 w-52 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 py-2 z-50" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => { addToast('Tính năng đang phát triển', 'info'); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-bold text-slate-700 flex items-center"><Eye className="w-4 h-4 mr-2" /> Xem chi tiết</button>
                              
                              {isAdmin && (
                                <>
                                  <button onClick={() => { setEditingItem(item); setFormData({ ...item }); setShowItemForm(true); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-bold text-blue-700 flex items-center"><Edit2 className="w-4 h-4 mr-2" /> Chỉnh sửa</button>
                                  <button onClick={() => { setEditingItem(null); setFormData({ ...item, mvpp: `${item.mvpp}_COPY` }); setShowItemForm(true); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-bold text-indigo-700 flex items-center"><Copy className="w-4 h-4 mr-2" /> Nhân bản</button>
                                  <div className="h-px bg-slate-100 my-1" />
                                </>
                              )}

                              {(isAdmin || isWarehouse) && (
                                <>
                                  <button onClick={() => { addToast('Tính năng đang phát triển', 'info'); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-bold text-cyan-700 flex items-center"><ArrowDownToLine className="w-4 h-4 mr-2" /> Nhập kho</button>
                                  <button onClick={() => { addToast('Tính năng đang phát triển', 'info'); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-bold text-orange-600 flex items-center"><ArrowUpFromLine className="w-4 h-4 mr-2" /> Xuất kho</button>
                                  <div className="h-px bg-slate-100 my-1" />
                                </>
                              )}

                              {isAdmin && (
                                <button onClick={() => { setStatusModal({ isOpen: true, item, targetStatus: !item.isActive, reason: '' }); setActiveMenuId(null); }} className={`w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-bold flex items-center ${item.isActive ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {item.isActive ? <><ShieldBan className="w-4 h-4 mr-2" /> Ngừng cấp</> : <><ShieldCheck className="w-4 h-4 mr-2" /> Cấp phát lại</>}
                                </button>
                              )}

                              {!isEmployee && (
                                <button onClick={() => { addToast('Tính năng đang phát triển', 'info'); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-bold text-slate-500 flex items-center"><History className="w-4 h-4 mr-2" /> Xem lịch sử</button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination Footer */}
            <div className="bg-slate-50 p-3 border-t border-slate-200 text-xs font-bold text-slate-500 shrink-0 flex items-center justify-between px-6">
              <span>Hiển thị {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredItems.length)} / {filteredItems.length} hàng hoá (Chọn: {selectedIds.size})</span>
              <div className="flex items-center gap-2">
                <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition"><ChevronLeft className="w-4 h-4" /></button>
                <span className="px-2">Trang {safePage} / {totalPages}</span>
                <button disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL: Add/Edit Item */}
      {showItemForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-bold text-slate-800">{editingItem ? 'Sửa thông tin hàng hoá' : 'Thêm hàng hóa mới'}</h2>
              <button type="button" onClick={() => setShowItemForm(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><XCircle className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveItem} className="p-8 overflow-y-auto bg-slate-50/50">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Mã hàng *</label>
                  <div className="flex gap-2">
                    <input required disabled={!!editingItem} value={formData.mvpp} onChange={e => setFormData({ ...formData, mvpp: e.target.value.toUpperCase() })} className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 uppercase font-mono text-sm shadow-sm" placeholder="Nhập mã..." />
                    {!editingItem && <button type="button" onClick={generateCode} className="px-4 py-2.5 bg-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-200 transition text-sm whitespace-nowrap">Sinh mã</button>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Thuộc Kho *</label>
                  <div className="relative">
                    <select value={formData.itemType} onChange={e => setFormData({ ...formData, itemType: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium appearance-none shadow-sm">
                      <option value="VPP">Văn phòng phẩm</option>
                      <option value="VE_SINH">Đồ vệ sinh</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Tên hàng hoá *</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm" placeholder="Giấy in A4, Bút bi..." />
              </div>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Phân loại *</label>
                  <input required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm" placeholder="Bút, Giấy, Tẩy..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Đơn vị tính *</label>
                  <input required value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm" placeholder="Cái, Hộp, Ram..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Đơn giá (VNĐ) *</label>
                  <input required type="number" min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-mono text-lg text-amber-600 shadow-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Định mức tồn kho *</label>
                  <input required type="number" min="0" value={formData.quota} onChange={e => setFormData({ ...formData, quota: Number(e.target.value) })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm" />
                </div>
              </div>
              <div className="mb-6">
                <label className="flex items-center cursor-pointer select-none">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                    <div className={`block w-14 h-8 rounded-full transition-colors duration-300 ease-in-out ${formData.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ease-in-out ${formData.isActive ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <div className="ml-4 font-bold text-sm">
                    {formData.isActive ? <span className="text-emerald-600">Trạng thái: Đang cấp phát</span> : <span className="text-slate-500">Trạng thái: Ngừng cấp phát</span>}
                  </div>
                </label>
              </div>
              <div className="pt-4 flex gap-4 mt-8 border-t border-slate-200 pt-6">
                <button type="button" onClick={() => setShowItemForm(false)} className="flex-1 py-3.5 font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-sm">Huỷ bỏ</button>
                <button type="submit" className="flex-[2] py-3.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-lg shadow-indigo-500/30 flex items-center justify-center">{editingItem ? 'Lưu chỉnh sửa' : 'Tạo mới Hàng Hóa'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Status Change Confirm */}
      {statusModal.isOpen && statusModal.item && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
              {statusModal.targetStatus ? <ShieldCheck className="w-6 h-6 mr-2 text-emerald-600" /> : <ShieldBan className="w-6 h-6 mr-2 text-amber-600" />}
              Xác nhận {statusModal.targetStatus ? 'Cấp phát lại' : 'Ngừng cấp hàng'}
            </h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">Bạn có chắc muốn <strong className={statusModal.targetStatus ? 'text-emerald-600' : 'text-amber-600'}>{statusModal.targetStatus ? 'ĐANG CẤP' : 'NGỪNG CẤP'}</strong> mặt hàng <strong>{statusModal.item.mvpp} ({statusModal.item.name})</strong>?</p>
            {!statusModal.targetStatus && (
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Lý do ngừng cấp *</label>
                <textarea autoFocus value={statusModal.reason} onChange={e => setStatusModal({ ...statusModal, reason: e.target.value })} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm h-24" placeholder="Nhập lý do..." />
              </div>
            )}
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition" onClick={() => setStatusModal({ isOpen: false, item: null, reason: '', targetStatus: false })}>Hủy</button>
              <button className={`flex-1 py-2.5 font-bold text-white rounded-xl transition shadow-md ${statusModal.targetStatus ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`} onClick={confirmChangeStatus}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
