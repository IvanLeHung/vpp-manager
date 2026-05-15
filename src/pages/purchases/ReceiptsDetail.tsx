import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  ArrowLeft, CheckCircle, Package, AlertTriangle, Printer, 
  ChevronLeft, ChevronRight, User, History, Undo, FileText
} from 'lucide-react';

const AUDIT_ACTION_MAP: Record<string, { label: string, impact: string, color: string }> = {
  'CREATE': { label: 'Khởi tạo phiếu', impact: 'Hệ thống', color: 'bg-slate-50 text-slate-400 border-slate-100' },
  'SAVE_DRAFT': { label: 'Lưu nháp đối chiếu', impact: 'Không đổi tồn', color: 'bg-blue-50 text-blue-500 border-blue-100' },
  'CONFIRM': { label: 'Xác nhận nhập kho', impact: 'Cập nhật tồn', color: 'bg-emerald-50 text-emerald-500 border-emerald-100' },
  'CANCEL': { label: 'Hủy phiếu', impact: 'Không đổi tồn', color: 'bg-rose-50 text-rose-500 border-rose-100' },
  'CANCEL_AND_RESTORE': { label: 'Hủy & hoàn tồn', impact: 'Hoàn tồn', color: 'bg-rose-600 text-white border-rose-600' },
  'ADJUST': { label: 'Điều chỉnh tồn', impact: 'Cập nhật tồn', color: 'bg-amber-50 text-amber-500 border-amber-100' }
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

  const handleComplete = async () => {
    if (!window.confirm('Hành động này sẽ đóng phiếu nhập kho và không đợi nhập thêm nữa. Bạn chắc chắn chứ?')) return;
    try {
      await api.post(`/receipts/${currentId}/complete`);
      showToast('Đã hoàn thành phiếu nhập kho!');
      await refreshData();
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



  if (loading || !data) return <div className="p-10 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div></div>;

  const isPending = data.status === 'PENDING' || data.status === 'PARTIALLY_RECEIVED';

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
    <div className="flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden font-sans text-slate-900">
      {/* HEADER SECTION */}
      <div className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-6 shrink-0 z-20 print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition" title="Quay lại">
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">Phiếu Nhập Kho: {data.id}</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg ml-2">
              <button disabled={!canGoPrev} onClick={goPrev} className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 transition group relative">
                <ChevronLeft className="w-4 h-4" />
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">Phiếu trước</span>
              </button>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 border-x border-slate-200" title={navigationIds.length > 0 ? `Vị trí ${currentIndex + 1} / ${navigationIds.length}` : 'Không có danh sách điều hướng'}>
                {currentIndex + 1} / {navigationIds.length || 1}
              </span>
              <button disabled={!canGoNext} onClick={goNext} className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 transition group relative">
                <ChevronRight className="w-4 h-4" />
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">Phiếu sau</span>
              </button>
            </div>
          </div>
          
          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          
          <p className="text-[11px] font-medium text-slate-400">
            Tham chiếu PO: <span className="text-blue-600 font-bold">{data.poId || 'N/A'}</span> • Kho: {data.warehouseCode}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            data.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
            data.status === 'PARTIALLY_RECEIVED' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
            data.status === 'DISCREPANCY' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
            data.status === 'CANCELLED' ? 'bg-slate-100 text-slate-400 border-slate-200' : 
            'bg-blue-50 text-blue-600 border-blue-100'
          }`}>
            {data.status === 'PENDING' ? 'Chờ kiểm hàng' : 
             data.status === 'PARTIALLY_RECEIVED' ? 'Nhập một phần' : 
             data.status === 'COMPLETED' ? 'Đã nhập kho' : 
             data.status === 'CANCELLED' ? 'Đã hủy' : 'Lệch / Lỗi'}
          </span>

          <div className="flex items-center gap-2">
            {isPending ? (
              <>
                <button onClick={() => setCancelModal({ open: true, reason: '' })} className="h-9 px-4 text-[11px] font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition uppercase tracking-wide">
                  Hủy phiếu
                </button>
                {data.status === 'PARTIALLY_RECEIVED' && (
                  <button onClick={handleComplete} className="h-9 px-4 text-[11px] font-bold text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition uppercase tracking-wide">
                    Hoàn thành phiếu
                  </button>
                )}
                <button onClick={handleConfirm} className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition uppercase tracking-wide shadow-sm">
                  {data.status === 'PARTIALLY_RECEIVED' ? 'Xác nhận nhập thêm' : 'Xác nhận nhập kho'}
                </button>
              </>
            ) : data.status !== 'CANCELLED' && (
              <button onClick={() => setCancelModal({ open: true, reason: '' })} className="h-9 px-4 text-[11px] font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition flex items-center gap-2 uppercase tracking-wide">
                <Undo className="w-3.5 h-3.5" /> Hủy & hoàn tồn
              </button>
            )}
            <button onClick={() => window.print()} className="p-2 text-slate-400 hover:text-slate-600 transition">
              <Printer className="w-5 h-5"/>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar print:hidden">
        {/* TOP SUMMARY CARDS */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Nhà cung cấp', value: data.supplier, icon: User, color: 'text-slate-300' },
            { label: 'Quy chiếu (PO)', value: totalOrdered, icon: Package, color: 'text-slate-300' },
            { label: 'Đã nhập', value: `${currentAccepted} / ${totalOrdered}`, icon: CheckCircle, color: 'text-emerald-400' },
            { label: 'Lệch / Lỗi', value: hasDiscrepancy ? (totalMissing + totalExtra + currentDefective) : 0, icon: AlertTriangle, color: hasDiscrepancy ? 'text-amber-400' : 'text-slate-300' },
            { label: 'Hoàn tất', value: `${totalOrdered > 0 ? Math.round((currentAccepted / totalOrdered) * 100) : 0}%`, icon: CheckCircle, color: 'text-blue-400' }
          ].map((card, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-1 shadow-sm">
              <div className="flex items-center gap-2">
                <card.icon className={`w-3 h-3 ${card.color}`} />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="text-base font-bold text-slate-800 truncate">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* MAIN SPLIT CONTENT */}
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          {/* LEFT COLUMN: TABLE (65%) */}
          <div className="flex-[3] bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[400px]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
                <Package className="w-4 h-4 text-blue-500" /> Đối chiếu & nhập thực tế
              </h3>
              {isPending && (
                <button onClick={handleSaveDraft} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition uppercase tracking-widest">
                  Lưu nháp đối chiếu
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar relative">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-sm">
                  <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="p-4 w-12 text-center border-b border-slate-100">STT</th>
                    <th className="p-4 border-b border-slate-100">Hàng hoá</th>
                    <th className="p-4 text-center border-b border-slate-100">Quy Chiếu</th>
                    <th className="p-4 text-center border-b border-slate-100">Giao Tới</th>
                    <th className="p-4 text-center border-b border-slate-100">Thực Nhập</th>
                    <th className="p-4 text-center border-b border-slate-100">Lỗi / Bù</th>
                    <th className="p-4 border-b border-slate-100">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.lines.map((l: any, idx: number) => {
                    const v = reconcileValues.find(x => x.id === l.id) || {};
                    const isDiscrepantLine = v.qtyAccepted < l.qtyOrdered || v.qtyDefective > 0;
                    
                    return (
                      <tr key={l.id} className={`group transition-all ${isDiscrepantLine ? 'bg-amber-50/20' : 'hover:bg-slate-50/50'}`}>
                        <td className="p-4 text-center text-xs font-medium text-slate-300">{idx + 1}</td>
                        <td className="p-4 max-w-[250px]">
                          <p className="font-bold text-slate-700 text-xs leading-snug uppercase">{l.item.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5 tracking-tight">{l.item.mvpp} · {l.item.unit}</p>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-slate-400">{l.qtyOrdered}</span>
                        </td>
                        <td className="p-4 text-center">
                          {isPending ? (
                            <input type="number" value={v.qtyDelivered} onChange={(e) => setReconcileValues(reconcileValues.map(a => a.id === l.id ? { ...a, qtyDelivered: parseInt(e.target.value) || 0 } : a))}
                              className="w-14 h-8 text-center bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:border-blue-400 outline-none transition shadow-sm" />
                          ) : <span className="font-bold text-slate-600">{l.qtyDelivered}</span>}
                        </td>
                         <td className="p-4 text-center">
                          {isPending ? (
                            <div className="flex flex-col items-center gap-1">
                                <input type="number" value={v.qtyAccepted} onChange={(e) => setReconcileValues(reconcileValues.map(a => a.id === l.id ? { ...a, qtyAccepted: parseInt(e.target.value) || 0 } : a))}
                                  className="w-14 h-8 text-center bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-600 focus:border-blue-500 outline-none transition shadow-sm ring-1 ring-blue-50" />
                                {l.qtyConfirmed > 0 && (
                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Đã nhập: {l.qtyConfirmed}</span>
                                )}
                            </div>
                          ) : <span className="font-bold text-blue-600">{l.qtyAccepted}</span>}
                        </td>
                        <td className="p-4 text-center">
                          {isPending ? (
                            <input type="number" value={v.qtyDefective} onChange={(e) => setReconcileValues(reconcileValues.map(a => a.id === l.id ? { ...a, qtyDefective: parseInt(e.target.value) || 0 } : a))}
                              className="w-14 h-8 text-center bg-white border border-slate-200 rounded-lg text-xs font-bold text-amber-600 focus:border-amber-400 outline-none transition" />
                          ) : <span className={`font-bold ${l.qtyDefective > 0 ? 'text-amber-600' : 'text-slate-200'}`}>{l.qtyDefective || '-'}</span>}
                        </td>
                        <td className="p-4">
                          {isPending ? (
                            <input type="text" placeholder="..." value={v.note} onChange={(e) => setReconcileValues(reconcileValues.map(a => a.id === l.id ? { ...a, note: e.target.value } : a))}
                              className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:bg-white focus:border-blue-400 outline-none transition" />
                          ) : (
                            <div className="flex items-center gap-2">
                              {l.note ? (
                                <>
                                  <FileText className="w-3 h-3 text-blue-400" />
                                  <span className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">{l.note}</span>
                                </>
                              ) : <span className="text-slate-200 text-xs">-</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="h-16"></div>
            </div>

            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-20 backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng cộng biên bản</span>
              <div className="flex items-center gap-10">
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-slate-400 uppercase font-black tracking-tighter">Quy chiếu</span>
                  <span className="text-xs font-bold text-slate-400">{totalOrdered}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-slate-400 uppercase font-black tracking-tighter">Giao tới</span>
                  <span className="text-xs font-bold text-slate-600">{currentDelivered}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-blue-400 uppercase font-black tracking-tighter">Thực nhập</span>
                  <span className="text-sm font-black text-blue-600">{currentAccepted}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-amber-400 uppercase font-black tracking-tighter">Lỗi/Bù</span>
                  <span className="text-xs font-bold text-amber-600">{currentDefective}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: AUDIT TRAIL (35%) */}
          <div className="flex-[1.8] bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-w-[320px]">
            <div className="px-5 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
                <History className="w-4 h-4 text-blue-500" /> Lịch sử thao tác mã phiếu
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/20">
              <div className="relative pl-6 border-l border-slate-200 space-y-10 ml-2">
                {data.auditLogs?.map((audit: any) => {
                  const mapped = AUDIT_ACTION_MAP[audit.action] || { label: audit.action, impact: 'Thay đổi', color: 'bg-slate-100 text-slate-400 border-slate-200' };
                  const isCancel = audit.action.includes('CANCEL');
                  return (
                    <div key={audit.id} className="relative group">
                      <div className={`absolute -left-[30px] top-1 w-3 h-3 rounded-full bg-white border-2 ring-4 ring-white transition-all ${isCancel ? 'border-rose-400 ring-rose-50' : 'border-slate-300 ring-slate-50'} group-hover:border-blue-500`}></div>
                      <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-black text-slate-800 leading-tight uppercase tracking-tight">{mapped.label}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest bg-slate-50 px-1 rounded">{audit.action}</span>
                              <span className="text-[9px] text-slate-400 font-medium">{new Date(audit.createdAt).toLocaleString('vi-VN')}</span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider border ${mapped.color}`}>
                            {mapped.impact}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                           <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-black text-slate-400">
                             {(audit.user?.fullName || 'S').charAt(0)}
                           </div>
                           <span className="text-[10px] font-bold text-slate-500">{audit.user?.fullName || 'Hệ thống'}</span>
                        </div>

                        {audit.newValues?.reason && (
                          <div className={`p-3 rounded-lg border ${isCancel ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                            <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isCancel ? 'text-rose-400' : 'text-slate-400'}`}>Ghi chú thao tác</p>
                            <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic">“{audit.newValues.reason}”</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REFINED CANCEL MODAL */}
      {cancelModal.open && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">
                {data.status === 'COMPLETED' || data.status === 'DISCREPANCY' ? 'Hủy & Hoàn Tồn Kho?' : 'Hủy Phiếu Nhập Kho?'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                {data.status === 'COMPLETED' || data.status === 'DISCREPANCY' 
                  ? 'Hệ thống sẽ đảo ngược số lượng đã nhập khỏi tồn kho. Hành động này không thể hoàn tác.'
                  : 'Dữ liệu đối chiếu hiện tại sẽ bị xóa và trạng thái PO sẽ được cập nhật lại.'}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lý do thực hiện (Bắt buộc)</label>
                <textarea 
                  placeholder="Nhập lý do chi tiết..."
                  value={cancelModal.reason}
                  onChange={e => setCancelModal({...cancelModal, reason: e.target.value})}
                  className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                ></textarea>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCancelModal({ open: false, reason: '' })} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition text-xs uppercase tracking-wide">
                  Quay lại
                </button>
                <button onClick={handleCancelReceipt} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition text-xs uppercase tracking-wide shadow-sm shadow-rose-500/20">
                  Xác nhận hủy
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


