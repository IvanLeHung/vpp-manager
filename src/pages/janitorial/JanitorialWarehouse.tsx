import { useState, useEffect } from 'react';
import { Droplets, ArrowDownToLine, ArrowUpFromLine, X, Zap, Loader2, Download, SlidersHorizontal, Scale, AlertTriangle, Search, CheckSquare, Square } from 'lucide-react';
import api from '../../lib/api';
import WarehouseTicketModal from '../../components/warehouse/WarehouseTicketModal';
import QuickHandoverModal from '../../components/warehouse/QuickHandoverModal';
import { StockAdjustModal } from '../../components/warehouse/StockAdjustModal';
import * as XLSX from 'xlsx';

type QuickActionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  stock: any;
  type: 'RECEIVE' | 'ISSUE';
  onSuccess: () => void;
};

function QuickActionModal({ isOpen, onClose, stock, type, onSuccess }: QuickActionModalProps) {
  const [qty, setQty] = useState(1);
  const [issueType, setIssueType] = useState('INTERNAL');
  const [reason, setReason] = useState('');
  const [location, setLocation] = useState('');
  const [gender] = useState('Chung');
  const [receiverName, setReceiverName] = useState('');
  const [receiverDept, setReceiverDept] = useState('');
  const [ticketDate, setTicketDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);





  const ISSUE_TYPES = [
    { id: 'INTERNAL', label: 'Xuất sử dụng nội bộ' },
    { id: 'HANDOVER', label: 'Xuất bàn giao' },
    { id: 'PERIODIC', label: 'Xuất vệ sinh định kỳ' },
    { id: 'REPLACEMENT', label: 'Xuất bù' },
    { id: 'TRANSFER', label: 'Xuất điều chuyển' },
    { id: 'WASTE', label: 'Xuất hủy/hỏng' },
    { id: 'OTHER', label: 'Khác' },
  ];

  const LOCATIONS = [
    'VPBH Danko Avenue', 'VPBH Sông Công', 'VPBH Thái Nguyên', 'Mặt trước C6-I', 'Mặt sau C6-I', 'Tầng 9 C6-I',
    'TTTM Danko City', 'VPBH Danko Sun River', 'VPBH Danko Riverside', 'VPBH Danko Center', 'VPBH Danko Royal',
    'VPBH Danko The Country', 'Khác (Ghi chú)'
  ];

  useEffect(() => {
    if (isOpen) {
      setQty(1);
      setReason('');
      setReceiverName('');
      setReceiverDept('');
      setShowConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen || !stock) return null;

  const khadung = stock.quantityOnHand - stock.quantityReserved;
  const tonSau = type === 'ISSUE' ? khadung - qty : khadung + qty;

  const handleAction = async () => {
    if (qty <= 0) return alert('Số lượng phải lớn hơn 0');
    if (type === 'ISSUE' && qty > khadung) return alert('Số lượng xuất không được lớn hơn tồn hiện tại (' + khadung + ')');
    if (!reason.trim()) return alert('Vui lòng nhập mô tả chi tiết');
    if (type === 'ISSUE' && !location) return alert('Vui lòng chọn địa điểm/khu vực nhận');

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      setLoading(true);
      await api.post('/warehouse-tickets', {
        ticketType: type,
        reason: reason,
        warehouseCode: 'VE_SINH',
        ticketDate: ticketDate,
        issueType,
        receiverName,
        receiverDept,
        lines: [{ 
          itemId: stock.item.id, 
          qty: type === 'ISSUE' ? -Math.abs(qty) : Math.abs(qty),
          location: type === 'ISSUE' ? location : null,
          gender: type === 'ISSUE' ? gender : null
        }]
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('Lỗi: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${type === 'RECEIVE' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' : 'bg-rose-50 text-rose-600 shadow-rose-100'}`}>
              {type === 'RECEIVE' ? <ArrowDownToLine className="w-6 h-6" /> : <ArrowUpFromLine className="w-6 h-6" />}
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">{type === 'RECEIVE' ? 'Nhập kho lẻ' : 'Xuất kho lẻ'}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Mặt hàng</p>
            <p className="font-black text-slate-800 text-sm">{stock.item.name}</p>
            <p className="text-[10px] text-emerald-500 font-bold mt-1 uppercase">{stock.item.mvpp} • Tồn khả dụng: {khadung} {stock.item.unit}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Số lượng *</label>
              <input type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 outline-none font-black text-2xl text-center text-emerald-600" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Ngày chứng từ *</label>
              <input type="date" value={ticketDate} onChange={e => setTicketDate(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" />
            </div>
          </div>

          {type === 'ISSUE' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Khu vực nhận *</label>
                <select value={location} onChange={e => setLocation(e.target.value)} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-slate-700">
                  <option value="">-- Chọn vị trí --</option>
                  {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Loại xuất *</label>
                <select value={issueType} onChange={e => setIssueType(e.target.value)} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-slate-700">
                  {ISSUE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Ghi chú / Lý do *</label>
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm resize-none" placeholder="Lý do xuất/nhập chi tiết..." />
          </div>

          {showConfirm && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 animate-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-[11px] font-bold text-amber-700">Xác nhận trừ kho {qty} {stock.item.unit}? Tồn sau sẽ là {tonSau}.</p>
            </div>
          )}
        </div>

        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-6 py-4 bg-white text-slate-600 font-black rounded-2xl border border-slate-200">HỦY</button>
          <button onClick={handleAction} disabled={loading} className={`flex-1 px-6 py-4 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center ${loading ? 'bg-slate-300' : type === 'RECEIVE' ? 'bg-emerald-600' : 'bg-rose-600 shadow-rose-200'}`}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : showConfirm ? 'XÁC NHẬN' : 'THỰC THI'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JanitorialWarehouse() {

  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [metrics, setMetrics] = useState<any>({ pending: 0, executedToday: 0 });

  const [modalType, setModalType] = useState<'RECEIVE' | 'ISSUE' | null>(null);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showMegaModal, setShowMegaModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);

  // Filter & Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hideZeroStock, setHideZeroStock] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');



  const QUICK_FILTERS = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'IN_STOCK', label: 'Còn tồn' },
    { id: 'READY', label: 'Sẵn sàng cấp' },
    { id: 'LOW', label: 'Sắp hết' },
    { id: 'RESERVED', label: 'Có tạm giữ' },
    { id: 'REPLENISH', label: 'Cần mua bổ sung' },
    { id: 'OUT_OF_STOCK', label: 'Hết hàng' },
  ];

  const CATEGORY_FILTERS = [
    { id: 'GIAY', label: 'Vật tư giấy', keywords: ['giấy', 'khăn', 'cuộn'] },
    { id: 'HOA_CHAT', label: 'Hóa chất', keywords: ['nước', 'lau', 'tẩy', 'xà phòng', 'javen'] },
    { id: 'DUNG_CU', label: 'Dụng cụ', keywords: ['chổi', 'cây lau', 'gạt', 'găng', 'túi'] },
  ];

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/stocks?warehouseCode=VE_SINH');
      setStocks(res.data);
    } catch (error) {
      console.error('Failed to fetch stocks', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/warehouse-tickets/summary/kpi?warehouseCode=VE_SINH');
      setMetrics(res.data);
    } catch (error) {
      console.error('Failed to fetch metrics', error);
    }
  };

  useEffect(() => {
    fetchStocks();
    fetchMetrics();
  }, []);

  const displayedStocks = stocks.filter(stock => {
    const khadung = stock.quantityOnHand - stock.quantityReserved;
    const threshold = Math.max(Math.floor(stock.item.quota * 0.2), 5);

    if (activeFilter === 'IN_STOCK' && stock.quantityOnHand === 0) return false;
    if (activeFilter === 'READY' && khadung <= 0) return false;
    if (activeFilter === 'LOW' && (stock.quantityOnHand === 0 || stock.quantityOnHand > threshold)) return false;
    if (activeFilter === 'RESERVED' && stock.quantityReserved === 0) return false;
    if (activeFilter === 'REPLENISH' && khadung > threshold) return false;
    if (activeFilter === 'OUT_OF_STOCK' && stock.quantityOnHand > 0) return false;

    // Apply Hide Zero Stock toggle if not explicitly looking for out of stock items
    if (hideZeroStock && stock.quantityOnHand === 0 && activeFilter !== 'OUT_OF_STOCK' && activeFilter !== 'REPLENISH') return false;

    const cat = CATEGORY_FILTERS.find(f => f.id === activeFilter);
    if (cat) {
      const match = cat.keywords.some(kw => 
        stock.item.name.toLowerCase().includes(kw) || 
        stock.item.category.toLowerCase().includes(kw)
      );
      if (!match) return false;
    }

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return stock.item.name.toLowerCase().includes(q) || stock.item.mvpp.toLowerCase().includes(q);
  });

  const handleExport = async () => {
    try {
      setLoading(true);
      const dataToExport = selectedIds.size > 0 ? stocks.filter(s => selectedIds.has(s.id)) : displayedStocks;
      const stockHeaders = ['Mã hàng', 'Tên hàng', 'Loại', 'Tồn TT', 'ĐVT', 'Khả dụng', 'Đơn giá'];
      const stockRows = dataToExport.map(s => [s.item.mvpp, s.item.name, s.item.category, s.quantityOnHand, s.item.unit, s.quantityOnHand - s.quantityReserved, s.item.price]);
      const wsStock = XLSX.utils.aoa_to_sheet([stockHeaders, ...stockRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsStock, "Ton-Kho-Janitorial");
      XLSX.writeFile(wb, `Bao_Cao_Kho_Ve_Sinh_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (error) {
      console.error('Export failed', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === displayedStocks.length && displayedStocks.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayedStocks.map(s => s.id)));
  };

  const totalValue = displayedStocks.reduce((sum, s) => sum + (s.quantityOnHand * Number(s.item.price)), 0);

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative">
      <div className="bg-white px-8 pt-4 pb-4 border-b border-slate-200 shrink-0 sticky top-0 z-10 w-full shadow-sm">
        <h1 className="text-xl font-black flex items-center text-emerald-700 tracking-tight uppercase">
           <Droplets className="w-6 h-6 mr-3 text-emerald-500" /> TỒN KHO ĐỒ VỆ SINH
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative pb-24">
        {/* Modals */}
        <QuickActionModal 
          isOpen={!!modalType}
          type={modalType!}
          stock={selectedStock}
          onClose={() => { setModalType(null); setSelectedStock(null); }}
          onSuccess={() => { fetchStocks(); fetchMetrics(); }}
        />
        
        <StockAdjustModal 
          isOpen={showAdjustModal} 
          onClose={() => setShowAdjustModal(false)} 
          stock={selectedStock} 
          onSuccess={() => { fetchStocks(); fetchMetrics(); }} 
        />

        <WarehouseTicketModal
          isOpen={showMegaModal}
          onClose={() => setShowMegaModal(false)}
          onSuccess={() => { fetchStocks(); fetchMetrics(); }}
          warehouseCode="VE_SINH"
          initialType="ISSUE"
        />

        <QuickHandoverModal
          isOpen={showHandoverModal}
          onClose={() => setShowHandoverModal(false)}
          onSuccess={() => { fetchStocks(); fetchMetrics(); setSelectedIds(new Set()); }}
          warehouseCode="VE_SINH"
          itemType="VE_SINH"
          selectedStocks={stocks.filter(s => selectedIds.has(s.id))}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 group hover:border-emerald-200 transition-colors">
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tổng mặt hàng</p>
               <p className="text-3xl font-black text-slate-800 mt-1">{displayedStocks.length}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-b-4 border-b-emerald-500">
               <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Sẵn sàng cấp</p>
               <p className="text-3xl font-black text-emerald-600 mt-1">{displayedStocks.filter(s => (s.quantityOnHand - s.quantityReserved) > 0).length}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-b-4 border-b-amber-500">
               <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Sắp hết</p>
               <p className="text-3xl font-black text-amber-600 mt-1">{displayedStocks.filter(s => s.quantityOnHand > 0 && s.quantityOnHand <= Math.max(Math.floor(s.item.quota * 0.2), 5)).length}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-b-4 border-b-rose-500">
               <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest">Hết hàng</p>
               <p className="text-3xl font-black text-rose-600 mt-1">{stocks.filter(s => s.quantityOnHand === 0).length}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
               <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Giá trị tồn</p>
               <p className="text-xl font-black text-blue-700 mt-1">{totalValue.toLocaleString('vi-VN')}₫</p>
            </div>
            <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg shadow-indigo-100 text-white flex flex-col justify-between">
               <p className="text-[10px] text-indigo-200 font-black uppercase tracking-widest">Phiếu chờ</p>
               <div className="flex items-end justify-between">
                  <p className="text-3xl font-black leading-none">{metrics.pending}</p>
                  {metrics.pending > 0 && (
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce delay-75"></span>
                    </div>
                  )}
               </div>
            </div>
        </div>

        {/* Search & Main Filter Bar */}
        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 mb-6 space-y-4">
           <div className="flex flex-col xl:flex-row gap-4 items-center">
              <div className="relative group flex-1 w-full">
                <input 
                  type="text" 
                  placeholder="Tra cứu MVPP / tên đồ vệ sinh..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-11 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold placeholder:font-medium placeholder:text-slate-400 transition-all" 
                />
                <Search className="absolute left-4 top-4 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              
              <div className="flex gap-2 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 no-scrollbar">
                {QUICK_FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${activeFilter === f.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-105' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div 
                    onClick={() => setHideZeroStock(!hideZeroStock)}
                    className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${hideZeroStock ? 'bg-emerald-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${hideZeroStock ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-700">Ẩn tồn 0</span>
                </label>
                <button className="p-3 bg-slate-50 text-slate-500 rounded-2xl hover:bg-slate-100 border border-slate-200 transition-all"><SlidersHorizontal className="w-5 h-5" /></button>
              </div>
           </div>

           {/* Category Specific Sub-filters */}
           <div className="flex items-center gap-3 border-t border-slate-50 pt-4 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] shrink-0 mr-2">Nhóm hàng:</span>
              {CATEGORY_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(activeFilter === f.id ? 'ALL' : f.id)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border-2 ${activeFilter === f.id ? 'bg-amber-50 border-amber-500 text-amber-700 scale-105' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
                >
                  {f.label}
                </button>
              ))}
              <div className="h-4 w-px bg-slate-100 mx-2" />
              <button className="px-4 py-2 rounded-xl text-[11px] font-bold bg-white border-2 border-slate-100 text-slate-500 hover:border-slate-300">Vượt định mức</button>
              <button className="px-4 py-2 rounded-xl text-[11px] font-bold bg-white border-2 border-slate-100 text-slate-500 hover:border-slate-300">Cấp phát định kỳ</button>
           </div>
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-5xl bg-slate-900/90 backdrop-blur-xl text-white px-8 py-5 rounded-[3rem] shadow-2xl flex items-center justify-between border border-white/10 animate-in slide-in-from-bottom-10 duration-500 ring-1 ring-white/20">
             <div className="flex items-center gap-6">
                <div className="flex flex-col border-r border-white/10 pr-6">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Đang chọn</span>
                  <span className="text-2xl font-black leading-none">{selectedIds.size} <span className="text-xs font-medium text-slate-400 italic">vật tư</span></span>
                </div>
                
                <div className="flex gap-4">
                  {(() => {
                    const selectedList = stocks.filter(s => selectedIds.has(s.id));
                    const stockReady = selectedList.filter(s => (s.quantityOnHand - s.quantityReserved) > 0).length;
                    const noStock = selectedList.length - stockReady;

                    return (
                      <>
                        <div className="flex flex-col">
                           <button 
                            onClick={() => setShowHandoverModal(true)} 
                            disabled={stockReady === 0}
                            className={`flex items-center gap-2 px-7 py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 ${stockReady > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                           >
                            <Zap className={`w-4 h-4 ${stockReady > 0 ? 'animate-pulse text-yellow-300' : ''}`} /> 
                            BÀN GIAO NHANH ({stockReady})
                           </button>
                           {noStock > 0 && <p className="text-[9px] font-bold text-rose-400 mt-1.5 ml-1 uppercase tracking-wider italic">* {noStock} mặt hàng hết hàng bị bỏ qua</p>}
                        </div>

                        <button onClick={() => setShowMegaModal(true)} className="flex items-center gap-2 px-6 py-3.5 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-sm hover:bg-white/10 transition-all active:scale-95">
                          <ArrowUpFromLine className="w-4 h-4" /> XUẤT KHO
                        </button>
                        
                        <button onClick={handleExport} className="flex items-center gap-2 px-6 py-3.5 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-sm hover:bg-white/10 transition-all active:scale-95">
                          <Download className="w-4 h-4" /> EXCEL
                        </button>
                      </>
                    );
                  })()}
                </div>
             </div>
             <button onClick={() => setSelectedIds(new Set())} className="px-5 py-2 text-slate-400 hover:text-white transition-colors uppercase text-[10px] font-black tracking-widest border border-white/5 hover:border-white/20 rounded-xl bg-white/5">Bỏ chọn</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-6 py-5 w-12 text-center">
                    <button onClick={toggleAll} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                      {selectedIds.size === displayedStocks.length && displayedStocks.length > 0 ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                    </button>
                  </th>
                  <th className="px-4 py-5">Mã hàng</th>
                  <th className="px-4 py-5">Tên hàng hóa</th>
                  <th className="px-4 py-5 text-center">Tồn kho</th>
                  <th className="px-4 py-5 text-center">Tạm giữ</th>
                  <th className="px-4 py-5 text-center">Khả dụng</th>
                  <th className="px-4 py-5 text-right">Đơn giá</th>
                  <th className="px-8 py-5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={8} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                        <Droplets className="absolute inset-0 m-auto w-4 h-4 text-emerald-300" />
                      </div>
                      <p className="text-slate-500 font-black tracking-widest text-xs uppercase animate-pulse">Đang nạp dữ liệu kho VE_SINH...</p>
                    </div>
                  </td></tr>
                ) : displayedStocks.length === 0 ? (
                  <tr><td colSpan={8} className="p-20 text-center">
                    <div className="bg-slate-50 inline-flex p-8 rounded-full mb-4">
                      <Droplets className="w-12 h-12 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold tracking-tight">Không tìm thấy vật tư nào phù hợp bộ lọc.</p>
                  </td></tr>
                ) : displayedStocks.map((stock) => {
                  const khadung = stock.quantityOnHand - stock.quantityReserved;
                  const isSelected = selectedIds.has(stock.id);

                  return (
                    <tr key={stock.id} className={`group transition-all hover:bg-slate-50/80 ${isSelected ? 'bg-emerald-50/50' : ''}`}>
                      <td className="px-6 py-4 text-center">
                         <button onClick={() => toggleSelect(stock.id)} className="p-1 hover:bg-slate-200/50 rounded-lg transition-colors">
                           {isSelected ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-200 group-hover:text-slate-300" />}
                         </button>
                      </td>
                      <td className="px-4 py-4 font-black text-slate-600 text-xs tracking-wider">{stock.item.mvpp}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">{stock.item.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{stock.item.category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${stock.quantityOnHand > 0 ? 'bg-slate-100 text-slate-700' : 'bg-rose-50 text-rose-500'}`}>
                          {stock.quantityOnHand} {stock.item.unit}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-xs font-bold ${stock.quantityReserved > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                          {stock.quantityReserved}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center font-black text-emerald-600">{khadung}</td>
                      <td className="px-4 py-4 text-right font-bold text-slate-600 text-xs">{(Number(stock.item.price)).toLocaleString('vi-VN')} đ</td>
                      <td className="px-8 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <button onClick={() => { setSelectedStock(stock); setModalType('ISSUE'); }} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Xuất kho"><ArrowUpFromLine className="w-4 h-4" /></button>
                          <button onClick={() => { setSelectedStock(stock); setModalType('RECEIVE'); }} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Nhập kho"><ArrowDownToLine className="w-4 h-4" /></button>
                          <button onClick={() => { setSelectedStock(stock); setShowAdjustModal(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm" title="Điều chỉnh"><Scale className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
