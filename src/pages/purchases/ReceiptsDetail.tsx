import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  ArrowLeft, CheckCircle, Package, AlertTriangle, Printer, Trash2, XCircle,
  ChevronLeft, ChevronRight, User, Clock, AlertCircle, 
  Info, History, Undo, FileText
} from 'lucide-react';

const AUDIT_ACTION_MAP: Record<string, { label: string, impact: string, color: string }> = {
  'CREATE': { label: 'Khởi tạo phiếu', impact: 'Hệ thống', color: 'bg-slate-100 text-slate-500' },
  'SAVE_DRAFT': { label: 'Lưu nháp đối chiếu', impact: 'Không đổi tồn', color: 'bg-blue-100 text-blue-600' },
  'CONFIRM': { label: 'Xác nhận nhập kho', impact: 'Cập nhật tồn', color: 'bg-emerald-100 text-emerald-600' },
  'CANCEL': { label: 'Hủy phiếu', impact: 'Không đổi tồn', color: 'bg-rose-100 text-rose-600' },
  'CANCEL_AND_RESTORE': { label: 'Hủy & hoàn tồn', impact: 'Hoàn tồn', color: 'bg-rose-600 text-white' },
  'ADJUST': { label: 'Điều chỉnh tồn', impact: 'Cập nhật tồn', color: 'bg-amber-100 text-amber-600' }
};

interface ReceiptsDetailProps {
  receiptId: string;
  navigationIds?: string[];
  onBack: () => void;
  showToast: (m: string, t?: 'success' | 'error' | 'warning') => void;
}

const ReceiptsDetail: React.FC<ReceiptsDetailProps> = ({ receiptId, navigationIds = [], onBack, showToast }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentId, setCurrentId] = useState(receiptId);
  const [cancelModal, setCancelModal] = useState<{ open: boolean, reason: string }>({ open: false, reason: '' });

  // Navigation logic
  const currentIndex = navigationIds.indexOf(currentId);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex !== -1 && currentIndex < navigationIds.length - 1;

  const goPrev = () => canGoPrev && setCurrentId(navigationIds[currentIndex - 1]);
  const goNext = () => canGoNext && setCurrentId(navigationIds[currentIndex + 1]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);


  // Reconciliation data
  const [reconcileValues, setReconcileValues] = useState<any[]>([]);

  const refreshData = async () => {
    try {
      const res = await api.get(`/receipts/${currentId}`);
      setData(res.data);
      if (res.data) {
        setReconcileValues(res.data.lines.map((l: any) => ({
          id: l.id,
          qtyDelivered: l.qtyDelivered || l.qtyOrdered,
          qtyAccepted: l.qtyAccepted || l.qtyOrdered,
          qtyDefective: l.qtyDefective || 0,
          note: l.note || '',
          location: l.location || ''
        })));
      }
    } catch (err) {
      console.error(err);
      showToast('Không thể tải Phiếu Nhập kho', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [currentId]);


  const handleSaveDraft = async () => {
    try {
      await api.put(`/receipts/${currentId}/check`, { lines: reconcileValues });
      showToast('Đã lưu nháp biên bản Kiểm Hàng!');
      await refreshData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi lưu dữ liệu', 'error');
    }
  };

  const handleConfirm = async () => {
    if (!window.confirm('Hành động này sẽ thực sự cộng Tồn kho. Bạn chắc chắn chứ?')) return;
    try {
      // Đầu tiên lưu current changes
      await api.put(`/receipts/${currentId}/check`, { lines: reconcileValues });
      // Sau đó chốt nhập
      await api.post(`/receipts/${currentId}/confirm`);
      showToast('Hoàn thành Nhập Kho & Cộng Tồn!');
      
      if (canGoNext) {
        setTimeout(() => goNext(), 500);
      } else {
        await refreshData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi hệ thống', 'error');
    }
  };

  const handleCancelReceipt = async () => {
    if (!cancelModal.reason.trim()) {
      showToast('Vui lòng nhập lý do hủy phiếu', 'warning');
      return;
    }
    try {
      await api.post(`/receipts/${currentId}/cancel`, { reason: cancelModal.reason });
      showToast('Đã hủy phiếu nhập kho!', 'warning');
      setCancelModal({ open: false, reason: '' });
      await refreshData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi khi hủy phiếu', 'error');
    }
  };

  const handleQuickAction = (lineId: string, action: 'FULL' | 'MISSING' | 'FAULTY') => {
    setReconcileValues(reconcileValues.map(v => {
      if (v.id !== lineId) return v;
      const line = data.lines.find((l: any) => l.id === lineId);
      if (!line) return v;

      switch (action) {
        case 'FULL':
          return { ...v, qtyDelivered: line.qtyOrdered, qtyAccepted: line.qtyOrdered, qtyDefective: 0 };
        case 'MISSING':
          return { ...v, qtyDelivered: 0, qtyAccepted: 0, qtyDefective: 0 };
        case 'FAULTY':
          return { ...v, qtyDelivered: line.qtyOrdered, qtyAccepted: 0, qtyDefective: line.qtyOrdered };
        default:
          return v;
      }
    }));
  };

  const handleDeleteReceipt = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn XÓA VĨNH VIỄN phiếu nhập này? (Chỉ áp dụng với phiếu ở trạng thái Chờ hoặc Đã Hủy)')) return;
    try {
      await api.delete(`/receipts/${currentId}`);
      showToast('Đã xóa phiếu nhập kho!', 'success');
      onBack(); // Go back to list
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi khi xóa phiếu', 'error');
    }
  };


  if (loading || !data) return <div className="p-10 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div></div>;

  const isPending = data.status === 'PENDING';

  // Checking for discrepancies
  const totalOrdered = data.lines.reduce((s: number, l: any) => s + l.qtyOrdered, 0);
  const currentAccepted = reconcileValues.reduce((s: number, v: any) => s + (v.qtyAccepted || 0), 0);
  const currentDefective = reconcileValues.reduce((s: number, v: any) => s + (v.qtyDefective || 0), 0);
  const currentDelivered = reconcileValues.reduce((s: number, v: any) => s + (v.qtyDelivered || 0), 0);

  // Breakdown stats
  const totalMissing = data.lines.reduce((sum: number, l: any) => {
    const v = reconcileValues.find(x => x.id === l.id);
    const diff = l.qtyOrdered - (v?.qtyDelivered || 0);
    return sum + (diff > 0 ? diff : 0);
  }, 0);

  const totalExtra = data.lines.reduce((sum: number, l: any) => {
    const v = reconcileValues.find(x => x.id === l.id);
    const diff = (v?.qtyDelivered || 0) - l.qtyOrdered;
    return sum + (diff > 0 ? diff : 0);
  }, 0);

  const hasDiscrepancy = currentAccepted < totalOrdered || currentDefective > 0 || totalExtra > 0;


  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      <div className="h-20 bg-white border-b border-slate-200 flex justify-between items-center px-6 md:px-10 shrink-0 z-20 shadow-sm print:hidden">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition shadow-inner" title="Quay lại danh sách">
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <button 
              disabled={!canGoPrev}
              onClick={goPrev}
              className="p-1.5 bg-white text-slate-400 hover:text-indigo-600 disabled:opacity-30 rounded-xl transition shadow-sm border border-slate-200 group relative"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">Phiếu trước</span>
            </button>
            <div className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap" title={navigationIds.length > 0 ? `Vị trí ${currentIndex + 1} trong danh sách` : 'Không có danh sách điều hướng'}>
              {currentIndex + 1} / {navigationIds.length || 1}
            </div>
            <button 
              disabled={!canGoNext}
              onClick={goNext}
              className="p-1.5 bg-white text-slate-400 hover:text-indigo-600 disabled:opacity-30 rounded-xl transition shadow-sm border border-slate-200 group relative"
            >
              <ChevronRight className="w-5 h-5" />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">Phiếu sau</span>
            </button>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden md:block mx-2"></div>

          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              Phiếu Nhập Kho: {data.id}
              <button onClick={() => window.print()} className="p-1.5 text-slate-400 hover:text-indigo-600 transition" title="In phiếu">
                <Printer className="w-4 h-4"/>
              </button>
            </h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Tham chiếu PO: <span className="text-indigo-600 font-black">{data.poId || 'N/A'}</span> • Kho: {data.warehouseCode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-4">
             <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md ${
               data.status === 'COMPLETED' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
               data.status === 'DISCREPANCY' ? 'bg-rose-500 text-white shadow-rose-500/20' : 
               data.status === 'CANCELLED' ? 'bg-slate-400 text-white' : 
               'bg-amber-500 text-white shadow-amber-500/20'
             }`}>
               {data.status === 'PENDING' ? 'CHỜ KIỂM HÀNG' : data.status === 'COMPLETED' ? 'ĐÃ NHẬP KHO' : data.status === 'CANCELLED' ? 'ĐÃ HỦY' : 'LỆCH / LỖI'}
             </span>
          </div>

          <div className="flex items-center gap-2">
            {isPending ? (
              <>
                <button 
                  onClick={() => setCancelModal({ open: true, reason: '' })}
                  className="px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition flex items-center gap-2 text-xs font-black border border-rose-100"
                >
                  <XCircle className="w-4 h-4" /> HỦY PHIẾU
                </button>
                <button 
                  onClick={handleDeleteReceipt}
                  className="p-2.5 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition border border-slate-200"
                  title="Xóa vĩnh viễn"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            ) : data.status !== 'CANCELLED' && (
              <button 
                onClick={() => setCancelModal({ open: true, reason: '' })}
                className="px-4 py-2.5 bg-slate-50 text-slate-400 hover:bg-rose-600 hover:text-white rounded-xl transition flex items-center gap-2 text-xs font-black border border-slate-200"
              >
                <Undo className="w-4 h-4" /> HỦY & HOÀN TỒN
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-8 custom-scrollbar print:hidden">
        {/* Header Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><User className="w-3 h-3 mr-1"/> Nhà Cung Cấp</p>
            <p className="text-xs font-black text-slate-800 uppercase tracking-tighter leading-tight truncate">{data.supplier}</p>
          </div>
          
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><Package className="w-3 h-3 mr-1"/> Quy chiếu (PO)</p>
            <p className="text-2xl font-black text-slate-800 tracking-tighter">{totalOrdered}</p>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Đã nhập</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-black text-emerald-600 tracking-tighter">{currentAccepted}</p>
              <p className="text-[10px] font-black text-slate-400 mb-1">/ {totalOrdered}</p>
            </div>
          </div>

          <div className={`p-5 rounded-3xl shadow-sm border transition-colors ${hasDiscrepancy ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-3 flex items-center ${hasDiscrepancy ? 'text-rose-500' : 'text-slate-400'}`}>
               <AlertTriangle className="w-3 h-3 mr-1"/> Lệch / Lỗi
            </p>
            {hasDiscrepancy ? (
              <div className="flex flex-wrap gap-2">
                 {totalMissing > 0 && <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg">-{totalMissing} thiếu</span>}
                 {totalExtra > 0 && <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg">+{totalExtra} bù/dư</span>}
                 {currentDefective > 0 && <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-lg">{currentDefective} lỗi</span>}
              </div>
            ) : (
              <p className="text-2xl font-black tracking-tighter text-slate-300">0</p>
            )}
          </div>

          <div className={`p-5 rounded-3xl shadow-lg flex flex-col justify-center transition-all duration-500 ${hasDiscrepancy ? 'bg-amber-500 shadow-amber-500/20' : 'bg-indigo-600 shadow-indigo-600/20'}`}>
            <p className="text-[9px] font-black text-white/70 uppercase tracking-widest mb-1 flex items-center">
              {hasDiscrepancy ? <AlertCircle className="w-3 h-3 mr-1"/> : <CheckCircle className="w-3 h-3 mr-1"/>} 
              {totalOrdered > 0 && currentAccepted === totalOrdered && currentDefective === 0 ? 'Hoàn tất' : 'Tiến độ'}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-white">
                {totalOrdered > 0 ? Math.round((currentAccepted / totalOrdered) * 100) : 0}%
              </p>
              {isPending && (
                <div className="flex flex-col gap-1">
                  <button onClick={handleSaveDraft} className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-[9px] font-black rounded-lg transition uppercase tracking-widest">Lưu Nháp</button>
                </div>
              )}
            </div>
          </div>
        </div>


        {isPending && (
          <div className="flex items-center justify-between bg-white px-8 py-4 rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-500/5">
            <div className="flex items-center gap-4 text-indigo-600">
               <Info className="w-5 h-5" />
               <div>
                  <p className="text-xs font-black uppercase tracking-tighter">Bạn đang ở chế độ Kiểm hàng</p>
                  <p className="text-[10px] font-bold text-slate-500">Vui lòng nhập số lượng thực tế giao tới và số lượng lỗi (nếu có)</p>
               </div>
            </div>
            <button 
              onClick={handleConfirm}
              className={`px-10 py-4 text-white rounded-2xl font-black tracking-widest shadow-xl transition-all transform hover:scale-105 active:scale-95 ${hasDiscrepancy ? 'bg-amber-600 shadow-amber-500/30' : 'bg-indigo-600 shadow-indigo-500/30'}`}
            >
              {hasDiscrepancy ? 'XÁC NHẬN NHẬP KHO (CÓ LỆCH)' : 'XÁC NHẬN NHẬP KHO'}
            </button>
          </div>
        )}


        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col overflow-hidden relative flex-1 min-h-[400px]">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
              <Package className="w-4 h-4 mr-2 text-indigo-500" /> Đối Chiếu & Nhập Số Lượng Thực Tế
            </h3>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar relative pb-[60px]">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr className="text-[9px] uppercase font-black text-slate-400 tracking-widest bg-white">
                  <th className="p-4 w-12 text-center border-b border-slate-100 sticky left-0 bg-white z-20">STT</th>
                  <th className="p-4 border-b border-slate-100 sticky left-12 bg-white z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Hàng hoá</th>
                  <th className="p-4 text-center border-b border-slate-100 bg-indigo-50/30 text-indigo-600">Quy Chiếu (PO)</th>
                  <th className="p-4 text-center border-b border-slate-100 bg-amber-50/30 text-amber-600">Giao Tới</th>
                  <th className="p-4 text-center border-b border-slate-100 bg-emerald-50/30 text-emerald-600">Thực Nhập</th>
                  <th className="p-4 text-center border-b border-slate-100 bg-rose-50/30 text-rose-600">Lỗi / Bù</th>
                  {isPending && <th className="p-4 text-center border-b border-slate-100 bg-slate-50">Thao tác nhanh</th>}
                  <th className="p-4 border-b border-slate-100">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.lines.map((l: any, idx: number) => {
                  const v = reconcileValues.find(x => x.id === l.id) || {};
                  const isDiscrepantLine = v.qtyAccepted < l.qtyOrdered || v.qtyDefective > 0;
                  
                  return (
                    <tr key={l.id} className={`group transition-all ${isDiscrepantLine ? 'bg-rose-50/20 hover:bg-rose-50/40' : 'hover:bg-slate-50/80'}`}>
                      <td className="p-4 text-center font-bold text-slate-300 text-[10px] sticky left-0 bg-inherit z-10 border-r border-slate-50">{idx + 1}</td>
                      <td className="p-4 sticky left-12 bg-inherit z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-50">
                        <p className="font-black text-slate-800 text-[11px] uppercase tracking-tighter leading-tight max-w-[250px] whitespace-normal">{l.item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black tracking-widest">{l.item.mvpp}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase italic">{l.item.unit}</span>
                        </div>
                      </td>
                      
                      <td className="p-4 text-center bg-indigo-50/10">
                        <span className="font-black text-lg text-indigo-300">{l.qtyOrdered}</span>
                      </td>

                      <td className="p-4 text-center bg-amber-50/10">
                        {isPending ? (
                          <input type="number" min="0" value={v.qtyDelivered}
                            onChange={(e: any) => setReconcileValues(reconcileValues.map(a => a.id === l.id ? { ...a, qtyDelivered: parseInt(e.target.value) || 0 } : a))}
                            className="w-14 text-center py-1.5 bg-white border border-amber-200 outline-none rounded-xl focus:border-amber-400 font-black text-sm transition text-amber-700 shadow-sm"
                          />
                        ) : <span className="font-black text-base text-amber-600">{l.qtyDelivered}</span>}
                      </td>

                      <td className="p-4 text-center bg-emerald-50/10">
                        {isPending ? (
                          <input type="number" min="0" value={v.qtyAccepted}
                            onChange={(e: any) => setReconcileValues(reconcileValues.map(a => a.id === l.id ? { ...a, qtyAccepted: parseInt(e.target.value) || 0 } : a))}
                            className={`w-16 text-center py-1.5 bg-white border outline-none rounded-xl focus:border-emerald-400 font-black text-sm transition shadow-sm ${v.qtyAccepted < l.qtyOrdered ? 'text-rose-600 border-rose-300' : 'text-emerald-700 border-emerald-200'}`}
                          />
                        ) : <span className={`font-black text-base ${l.qtyAccepted < l.qtyOrdered ? 'text-rose-600' : 'text-emerald-600'}`}>{l.qtyAccepted}</span>}
                      </td>

                      <td className="p-4 text-center bg-rose-50/10">
                        {isPending ? (
                          <input type="number" min="0" value={v.qtyDefective}
                            onChange={(e: any) => setReconcileValues(reconcileValues.map(a => a.id === l.id ? { ...a, qtyDefective: parseInt(e.target.value) || 0 } : a))}
                            className="w-14 text-center py-1.5 bg-white border border-rose-200 outline-none rounded-xl focus:border-rose-400 font-black text-sm transition text-rose-600 shadow-sm"
                          />
                        ) : <span className={`font-black text-base ${l.qtyDefective > 0 ? 'text-rose-600' : 'text-slate-300'}`}>{l.qtyDefective}</span>}
                      </td>

                      {isPending && (
                        <td className="p-4 text-center bg-slate-50/30">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleQuickAction(l.id, 'FULL')} className="p-1.5 bg-white hover:bg-emerald-600 hover:text-white rounded-lg transition border border-slate-200 shadow-sm text-[8px] font-black uppercase" title="Nhập Đủ">ĐỦ</button>
                            <button onClick={() => handleQuickAction(l.id, 'MISSING')} className="p-1.5 bg-white hover:bg-amber-600 hover:text-white rounded-lg transition border border-slate-200 shadow-sm text-[8px] font-black uppercase" title="Báo Thiếu">THIẾU</button>
                            <button onClick={() => handleQuickAction(l.id, 'FAULTY')} className="p-1.5 bg-white hover:bg-rose-600 hover:text-white rounded-lg transition border border-slate-200 shadow-sm text-[8px] font-black uppercase" title="Báo Lỗi">LỖI</button>
                          </div>
                        </td>
                      )}

                      <td className="p-4 min-w-[150px]">
                        {isPending ? (
                          <input type="text" placeholder="..." value={v.note}
                            onChange={(e: any) => setReconcileValues(reconcileValues.map(a => a.id === l.id ? { ...a, note: e.target.value } : a))}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 outline-none rounded-xl focus:border-indigo-400 font-bold text-[11px] transition text-slate-700 shadow-sm"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                             {l.note ? (
                               <>
                                 <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100"><FileText className="w-3.5 h-3.5"/></div>
                                 <span className="text-[11px] font-bold text-slate-700 max-w-[200px] truncate">{l.note}</span>
                               </>
                             ) : (
                               <span className="text-[11px] font-bold text-slate-300 italic">---</span>
                             )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              <tfoot className="sticky bottom-0 z-10">
                <tr className="bg-slate-900 text-white font-black text-xs uppercase tracking-widest">
                  <td colSpan={2} className="p-4 text-right">TỔNG CỘNG:</td>
                  <td className="p-4 text-center border-l border-white/10">{totalOrdered}</td>
                  <td className="p-4 text-center bg-amber-600/50 border-l border-white/10">{currentDelivered}</td>
                  <td className="p-4 text-center bg-emerald-600/50 border-l border-white/10">{currentAccepted}</td>
                  <td className="p-4 text-center bg-rose-600/50 border-l border-white/10">{currentDefective}</td>
                  {isPending && <td className="p-4 bg-slate-800 border-l border-white/10"></td>}
                  <td className="p-4 bg-slate-800 border-l border-white/10"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {data.auditLogs && data.auditLogs.length > 0 && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 flex flex-col w-full print:hidden mb-10">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 border-b border-slate-100 pb-4 flex items-center">
                <History className="w-4 h-4 mr-2 text-indigo-500" /> Lịch sử thao tác mã phiếu (Audit Trail)
             </h3>
             <div className="relative pl-6 border-l-2 border-slate-100 space-y-10 ml-4">
                 {data.auditLogs.map((audit:any) => {
                    const mapped = AUDIT_ACTION_MAP[audit.action] || { label: audit.action, impact: 'Thay đổi', color: 'bg-slate-100 text-slate-500' };
                    return (
                      <div key={audit.id} className="relative group">
                        <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-white ring-4 ring-slate-50 border-2 border-slate-200 group-hover:border-indigo-500 group-hover:scale-125 transition-all flex items-center justify-center">
                           <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-500"></div>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                           <div>
                              <p className="text-[11px] font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                                 {mapped.label}
                                 <span className="text-[8px] font-black text-slate-300 px-1 border border-slate-100 rounded">{audit.action}</span>
                                 {audit.action.includes('CANCEL') && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                 <span className="flex items-center text-[9px] font-bold text-slate-400 uppercase"><User className="w-3 h-3 mr-1 text-slate-300"/> {audit.user?.fullName || 'Hệ thống'}</span>
                                 <span className="flex items-center text-[9px] font-bold text-slate-400 uppercase"><Clock className="w-3 h-3 mr-1 text-slate-300"/> {new Date(audit.createdAt).toLocaleString('vi-VN')}</span>
                              </div>
                           </div>
                           <div className={`px-3 py-1.5 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest ${mapped.color}`}>
                              {mapped.impact}
                           </div>
                        </div>
                        {audit.newValues?.reason && (
                          <div className={`mt-3 p-4 rounded-2xl border relative ${audit.action.includes('CANCEL') ? 'bg-rose-50/50 border-rose-100 border-l-4 border-l-rose-500' : 'bg-slate-50 border-slate-200 border-l-4 border-l-indigo-400'}`}>
                             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center ${audit.action.includes('CANCEL') ? 'text-rose-500' : 'text-indigo-500'}`}>
                                <AlertCircle className="w-3 h-3 mr-1"/> {audit.action.includes('CANCEL') ? 'Lý do hủy phiếu:' : 'Ghi chú thao tác:'}
                             </p>
                             <p className="text-xs font-bold text-slate-700">{audit.newValues.reason}</p>
                          </div>
                        )}
                      </div>
                    );
                 })}
             </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 bg-rose-600 text-white relative">
                 <div className="absolute top-0 right-0 p-8 opacity-10"><XCircle className="w-32 h-32" /></div>
                 <h3 className="text-2xl font-black tracking-tight mb-2">
                   {data.status === 'COMPLETED' || data.status === 'DISCREPANCY' ? 'Hủy & Hoàn Tồn Kho?' : 'Hủy Phiếu Nhập Kho?'}
                 </h3>
                 <p className="text-rose-100 font-bold text-sm leading-relaxed">
                   {data.status === 'COMPLETED' || data.status === 'DISCREPANCY' 
                     ? 'CẢNH BÁO: Hệ thống sẽ ĐẢO NGƯỢC số lượng đã nhập khỏi tồn kho MAIN. Hành động này sẽ được ghi nhận vào audit trail và không thể sửa sau khi hủy.'
                     : 'Hành động này sẽ hủy bỏ các kết quả đối chiếu và hoàn trả lại trạng thái cho Đơn mua hàng (PO).'}
                 </p>
              </div>
              <div className="p-8 space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Lý do thực hiện (Bắt buộc)</label>
                    <textarea 
                      placeholder="Nhập lý do chi tiết..."
                      value={cancelModal.reason}
                      onChange={e => setCancelModal({...cancelModal, reason: e.target.value})}
                      className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all resize-none"
                    ></textarea>
                 </div>
                 <div className="flex gap-4">
                    <button 
                      onClick={() => setCancelModal({ open: false, reason: '' })}
                      className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition uppercase tracking-widest text-xs"
                    >
                      Bỏ qua
                    </button>
                    <button 
                      onClick={handleCancelReceipt}
                      className="flex-2 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl transition shadow-lg shadow-rose-500/30 uppercase tracking-widest text-xs"
                    >
                      Xác nhận {data.status === 'COMPLETED' || data.status === 'DISCREPANCY' ? 'Hủy & Hoàn tồn' : 'Hủy phiếu'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}


      {/* FORMAL PRINT-ONLY SECTION (A4 Standard) */}
      <div className="hidden print:block print-container">
          <div className="text-center text-lg font-bold uppercase mb-4">PHIẾU KIỂM HOÁ & NHẬP VẬT TƯ (GRN)</div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4 text-[13px]">
              <div><strong>Mã Phiếu:</strong> {data.id}</div>
              <div><strong>Thực Kiểm:</strong> {data.receiveDate ? new Date(data.receiveDate).toLocaleString('vi-VN') : '....'}</div>
              <div><strong>Người Làm Phiếu:</strong> {data.receiver?.fullName || '....................'}</div>
              <div><strong>Kho Nhận Hàng:</strong> {data.warehouseCode || '....................'}</div>
              <div className="col-span-2"><strong>Nhà Cung Cấp:</strong> {data.supplier || '....................'}</div>
              <div className="col-span-2"><strong>Tham chiếu PO:</strong> {data.poId || '....................'}</div>
          </div>

          <table className="print-table">
              <thead className="bg-slate-100">
                  <tr>
                      <th className="text-center font-bold" style={{width:'6%'}}>STT</th>
                      <th className="text-center font-bold" style={{width:'15%'}}>Mã VT</th>
                      <th className="text-left font-bold" style={{width:'37%'}}>Tên Văn Phòng Phẩm</th>
                      <th className="text-center font-bold" style={{width:'8%'}}>ĐVT</th>
                      <th className="text-center font-bold" style={{width:'12%'}}>Treo (Sổ)</th>
                      <th className="text-center font-bold" style={{width:'12%'}}>Thực Nhận</th>
                      <th className="text-center font-bold" style={{width:'10%'}}>Hư/Lỗi</th>
                  </tr>
              </thead>
              <tbody>
                  {data.lines.map((l: any, idx: number) => (
                      <tr key={l.id}>
                          <td className="text-center">{idx + 1}</td>
                          <td className="text-center font-medium">{l.item.mvpp}</td>
                          <td className="font-medium">{l.item.name}</td>
                          <td className="text-center">{l.item.unit}</td>
                          <td className="text-center">{l.qtyOrdered}</td>
                          <td className="text-center font-bold">{l.qtyAccepted}</td>
                          <td className="text-center italic text-xs">{l.qtyDefective > 0 ? l.qtyDefective : '-'}</td>
                      </tr>
                  ))}
                  <tr className="font-bold bg-slate-50">
                      <td colSpan={5} className="text-right uppercase">Tổng SL Thực Tế:</td>
                      <td className="text-center text-lg">{data.lines.reduce((sum: number, line: any) => sum + (line.qtyAccepted || 0), 0)}</td>
                      <td></td>
                  </tr>
              </tbody>
          </table>

          <div className="signature-section">
              <div className="text-center min-h-[120px]">
                  <p className="font-bold uppercase mb-1">Thủ Kho / Người Kiểm Định</p>
                  <p className="text-[11px] italic mb-16">(Ký, ghi gõ họ tên xác nhận nhận hàng)</p>
                  <p className="font-bold uppercase text-[13px]">{data.receiver?.fullName || '....................................'}</p>
              </div>
              <div className="text-center min-h-[120px]">
                  <p className="font-bold uppercase mb-1">Bên Giao / Đơn vị cung cấp</p>
                  <p className="text-[11px] italic mb-16">(Ký và xác nhận đối chiếu đúng hàng)</p>
                  <p className="font-bold uppercase text-[13px]">....................................</p>
              </div>
          </div>
      </div>

    </div>
  );
};

export default ReceiptsDetail;


