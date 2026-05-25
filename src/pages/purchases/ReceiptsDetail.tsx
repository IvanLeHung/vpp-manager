import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  ArrowLeft, CheckCircle, Package, AlertTriangle, Printer, 
  ChevronLeft, ChevronRight, User, History, Undo, FileText,
  Plus, Trash2, Search
} from 'lucide-react';
import { GoodsNameWithPreview } from '../../components/GoodsNameWithPreview';
import { useAppContext } from '../../context/AppContext';

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
  
  const { currentUser } = useAppContext();
  const role = currentUser?.role || 'EMPLOYEE';
  const isWarehouseOrAdmin = role === 'ADMIN' || role === 'WAREHOUSE';

  // Unexpected items catalog search state
  const [items, setItems] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Exchange items state
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceFormData, setReplaceFormData] = useState({
    originalReceiptLineId: '',
    replacementItemId: '',
    replacementQty: 1,
    handlingMode: 'ACCEPT_REPLACEMENT',
    reason: 'NCC giao model thay thế',
    note: ''
  });
  const [replaceSearchTerm, setReplaceSearchTerm] = useState('');

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

  const fetchItems = async () => {
    try {
      const res = await api.get('/items');
      setItems(res.data.filter((i: any) => i.isActive));
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  };

  const refreshData = async () => {
    try {
      const res = await api.get(`/receipts/${currentId}`);
      setData(res.data);
      if (res.data) {
        setReconcileValues(res.data.lines.map((l: any) => ({
          lineId: l.id,
          itemId: l.itemId,
          qtyDelivered: l.qtyDelivered || l.qtyOrdered,
          actualQty: 0,
          qtyDefective: 0,
          note: l.note || '',
          location: l.location || '',
          discrepancyType: l.discrepancyType || '',
          status: l.status || '',
          isUnexpected: l.qtyOrdered === 0
        })));
      }
    } catch (err) {
      console.error(err);
      showToast('Không thể tải Phiếu Nhập kho', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    refreshData();
  }, [currentId]);

  const handleAddUnexpectedItem = (item: any) => {
    if (reconcileValues.find(v => v.itemId === item.id)) {
      showToast('Mặt hàng này đã có trong danh sách đối chiếu!', 'warning');
      return;
    }
    const tempId = `temp-${Date.now()}`;
    setReconcileValues([
      ...reconcileValues,
      {
        lineId: tempId,
        itemId: item.id,
        qtyDelivered: 1,
        actualQty: 1,
        qtyDefective: 0,
        note: 'Nhà cung cấp giao khác model',
        location: '',
        discrepancyType: 'Hàng ngoài PO / Sai model',
        status: 'Chờ xử lý lệch',
        isUnexpected: true
      }
    ]);
    setShowAddModal(false);
    setSearchTerm('');
    showToast(`Đã thêm hàng phát sinh: ${item.name}`);
  };

  const handleApplyRemainingAll = () => {
    if (!data) return;
    const updated = reconcileValues.map((v: any) => {
      const l = data.lines.find((x: any) => x.id === v.lineId);
      if (l && l.qtyOrdered > 0) {
        const remaining = Math.max(0, l.qtyOrdered - (l.qtyConfirmed || 0));
        return { ...v, actualQty: remaining };
      }
      return v;
    });
    setReconcileValues(updated);
    showToast('Đã áp dụng nhập đủ phần còn lại cho tất cả các dòng hàng!', 'success');
  };

  const handleSaveDraft = async () => {
    try {
      const draftPayload = reconcileValues.map((v: any) => {
        const l = data.lines.find((x: any) => x.id === v.lineId);
        const qtyConfirmedBefore = l ? (l.qtyConfirmed || 0) : 0;
        return {
          id: v.lineId,
          itemId: v.itemId,
          qtyDelivered: v.qtyDelivered || 0,
          qtyAccepted: qtyConfirmedBefore + (v.actualQty || 0),
          qtyDefective: v.qtyDefective,
          note: v.note,
          location: v.location,
          discrepancyType: v.discrepancyType || null,
          status: v.status || null
        };
      });
      await api.put(`/receipts/${currentId}/check`, { lines: draftPayload });
      showToast('Đã lưu nháp biên bản Kiểm Hàng!');
      await refreshData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi lưu dữ liệu', 'error');
    }
  };

  const handleConfirm = async (mode: 'PARTIAL' | 'FULL') => {
    const totalOrdered = data.lines.reduce((s: number, l: any) => s + l.qtyOrdered, 0);
    const totalConfirmed = data.lines.reduce((s: number, l: any) => s + (l.qtyOrdered > 0 ? (l.qtyConfirmed || 0) : 0), 0);
    
    const sanitizedLines = reconcileValues.map((v: any) => {
      const l = data.lines.find((x: any) => x.id === v.lineId);
      if (l && l.qtyOrdered > 0) {
        const remainingLineQty = Math.max(0, l.qtyOrdered - (l.qtyConfirmed || 0));
        if (remainingLineQty <= 0) {
          return { ...v, actualQty: 0, qtyDefective: 0 };
        }
      }
      return v;
    });

    const totalInput = sanitizedLines.reduce((s: number, v: any) => s + (v.actualQty || 0), 0);
    const remainingQtyAfterConfirm = totalOrdered - (totalConfirmed + totalInput);

    if (mode === 'PARTIAL') {
      if (totalInput === 0) {
        showToast('Vui lòng nhập ít nhất một mặt hàng để xác nhận nhập phần đã nhận!', 'warning');
        return;
      }
      if (!window.confirm('Bạn có chắc chắn muốn xác nhận nhập kho cho phần số lượng đã nhận này? (Phiếu vẫn tiếp tục mở để nhập tiếp)')) return;
    } else {
      // mode === 'FULL'
      if (remainingQtyAfterConfirm > 0) {
        if (!window.confirm(`Phiếu còn thiếu ${remainingQtyAfterConfirm} sản phẩm chưa nhập. Bạn có chắc chắn muốn hoàn tất và đóng phiếu không?`)) {
          return;
        }
      } else {
        if (!window.confirm('Bạn có chắc chắn muốn xác nhận nhập kho và hoàn tất phiếu nhập này?')) return;
      }
    }
    
    try {
      await api.post(`/receipts/${currentId}/confirm`, { mode, lines: sanitizedLines });
      showToast('Xác nhận Nhập Kho thành công!');
      
      if (canGoNext && mode === 'FULL') {
        setTimeout(() => goNext(), 500);
      } else {
        await refreshData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi hệ thống', 'error');
    }
  };

  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceFormData.originalReceiptLineId) {
      showToast('Vui lòng chọn dòng PO cần đổi.', 'warning');
      return;
    }
    if (!replaceFormData.replacementItemId) {
      showToast('Vui lòng chọn hàng hóa thay thế.', 'warning');
      return;
    }
    if (replaceFormData.replacementQty <= 0) {
      showToast('Số lượng đổi phải lớn hơn 0.', 'warning');
      return;
    }
    
    try {
      const res = await api.post(`/receipts/${currentId}/replacement-lines`, replaceFormData);
      if (res.data.success) {
        showToast('Ghi nhận đổi hàng thành công!', 'success');
        setShowReplaceModal(false);
        setReplaceFormData({
          originalReceiptLineId: '',
          replacementItemId: '',
          replacementQty: 1,
          handlingMode: 'ACCEPT_REPLACEMENT',
          reason: 'NCC giao model thay thế',
          note: ''
        });
        setReplaceSearchTerm('');
        await refreshData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi khi ghi nhận đổi hàng', 'error');
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

  const isPending = data.status === 'PENDING' || data.status === 'PARTIAL_RECEIVED' || data.status === 'PARTIALLY_RECEIVED' || data.status === 'DRAFT';

  // Checking for discrepancies
  const totalOrdered = data.lines.reduce((s: number, l: any) => s + l.qtyOrdered, 0);
  const totalConfirmed = data.lines.reduce((s: number, l: any) => s + (l.qtyOrdered > 0 ? (l.qtyConfirmed || 0) : 0), 0); // Chỉ hàng chuẩn
  const currentInputActual = reconcileValues.reduce((s: number, v: any) => s + (v.actualQty || 0), 0);
  const currentDefective = reconcileValues.reduce((s: number, v: any) => s + (v.qtyDefective || 0), 0);
  const currentDelivered = reconcileValues.reduce((s: number, v: any) => s + (v.qtyDelivered || 0), 0);

  // Replacement stats
  const totalReplacementsAccepted = data.replacements?.reduce((sum: number, r: any) => sum + (r.status === 'ACCEPTED' ? r.replacementQty : 0), 0) || 0;
  const totalReplacementsReturned = data.replacements?.reduce((sum: number, r: any) => sum + (r.status === 'RETURNED' ? r.replacementQty : 0), 0) || 0;
  const totalReplacementsPending = data.replacements?.reduce((sum: number, r: any) => sum + (['WAITING_APPROVAL', 'PENDING_PO_ADJUSTMENT'].includes(r.status) ? r.replacementQty : 0), 0) || 0;

  // Breakdown stats
  const totalMissing = data.lines.reduce((sum: number, l: any) => {
    if (l.qtyOrdered === 0) return sum;
    const diff = l.qtyOrdered - (l.qtyConfirmed || 0);
    return sum + (diff > 0 ? diff : 0);
  }, 0);

  const totalExtra = data.lines.reduce((sum: number, l: any) => {
    if (l.qtyOrdered === 0) {
      return sum + (l.qtyConfirmed || 0);
    }
    const diff = (l.qtyConfirmed || 0) - l.qtyOrdered;
    return sum + (diff > 0 ? diff : 0);
  }, 0);

  const remainingQty = Math.max(0, totalOrdered - totalConfirmed);
  const totalDefective = data.lines.reduce((s: number, l: any) => s + (l.qtyDefective || 0), 0);
  const totalDiscrepancy = totalDefective + totalExtra;

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
            data.status === 'COMPLETED' || data.status === 'FULL_RECEIVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
            data.status === 'PARTIALLY_RECEIVED' || data.status === 'PARTIAL_RECEIVED' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
            data.status === 'DISCREPANCY' || data.status === 'HAS_ERROR' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
            data.status === 'CANCELLED' ? 'bg-slate-100 text-slate-400 border-slate-200' : 
            'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
            {data.status === 'PENDING' ? 'Chờ kiểm hàng' : 
             data.status === 'PARTIALLY_RECEIVED' || data.status === 'PARTIAL_RECEIVED' ? 'Nhập một phần' : 
             data.status === 'COMPLETED' || data.status === 'FULL_RECEIVED' ? 'Đã nhập kho' : 
             data.status === 'CANCELLED' ? 'Đã hủy' : 'Lệch / Lỗi'}
          </span>

          <div className="flex items-center gap-2">
            {isPending ? (
              <>
                <button onClick={() => setCancelModal({ open: true, reason: '' })} className="h-9 px-4 text-[11px] font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition uppercase tracking-wide">
                  Hủy phiếu
                </button>
                {isWarehouseOrAdmin && (
                  <button onClick={() => {
                    const firstUnsatisfied = data.lines.find((line: any) => line.qtyOrdered > 0 && (line.qtyOrdered - line.qtyConfirmed - (line.replacedQtyTotal || 0)) > 0);
                    const initialQty = firstUnsatisfied ? Math.max(0, firstUnsatisfied.qtyOrdered - firstUnsatisfied.qtyConfirmed - (firstUnsatisfied.replacedQtyTotal || 0)) : 1;
                    setReplaceFormData({
                      originalReceiptLineId: firstUnsatisfied?.id || '',
                      replacementItemId: '',
                      replacementQty: initialQty,
                      handlingMode: 'ACCEPT_REPLACEMENT',
                      reason: 'NCC giao model thay thế',
                      note: ''
                    });
                    setReplaceSearchTerm('');
                    setShowReplaceModal(true);
                  }} className="h-9 px-4 text-[11px] font-bold text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg transition uppercase tracking-wide">
                    Đổi hàng
                  </button>
                )}
                <button onClick={handleApplyRemainingAll} className="h-9 px-4 text-[11px] font-bold text-teal-600 hover:bg-teal-50 border border-teal-200 rounded-lg transition uppercase tracking-wide">
                  Áp dụng nhập đủ
                </button>
                {remainingQty > 0 ? (
                  <button onClick={() => handleConfirm('PARTIAL')} className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition uppercase tracking-wide shadow-sm">
                    Xác nhận nhập phần đã nhận
                  </button>
                ) : (
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5" /> Phiếu đã nhập đủ
                  </span>
                )}
                <button onClick={() => handleConfirm('FULL')} className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition uppercase tracking-wide shadow-sm">
                  Xác nhận & hoàn tất
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Nhà cung cấp', value: data.supplier || 'N/A', icon: User, color: 'text-slate-300' },
            { label: 'Quy chiếu (PO)', value: totalOrdered, icon: Package, color: 'text-slate-300' },
            { label: 'Đã nhập', value: `${totalConfirmed} / ${totalOrdered}`, icon: CheckCircle, color: 'text-emerald-400' },
            { label: 'Còn lại', value: remainingQty, icon: Package, color: remainingQty > 0 ? 'text-amber-500' : 'text-slate-300' },
            { label: 'Lệch / Lỗi', value: totalDiscrepancy, icon: AlertTriangle, color: totalDiscrepancy > 0 ? 'text-rose-400' : 'text-slate-300' },
            { label: 'Hoàn tất', value: `${totalOrdered > 0 ? Math.round((totalConfirmed / totalOrdered) * 100) : 0}%`, icon: CheckCircle, color: 'text-blue-400' }
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
                <div className="flex items-center gap-4">
                  <button onClick={() => setShowAddModal(true)} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition uppercase tracking-widest flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Thêm hàng phát sinh
                  </button>
                  <button onClick={handleSaveDraft} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition uppercase tracking-widest">
                    Lưu nháp đối chiếu
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar relative">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-sm">
                  <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="p-4 w-12 text-center border-b border-slate-100">STT</th>
                    <th className="p-4 border-b border-slate-100">Hàng hoá</th>
                    <th className="p-4 text-center border-b border-slate-100">Quy Chiếu</th>
                    <th className="p-4 text-center border-b border-slate-100">Đã Nhập Trước</th>
                    <th className="p-4 text-center border-b border-slate-100">Còn Lại</th>
                    <th className="p-4 text-center border-b border-slate-100 w-24">Thực Nhập</th>
                    <th className="p-4 text-center border-b border-slate-100 w-20">Hỏng / Lỗi</th>
                    <th className="p-4 border-b border-slate-100 w-36">Loại lệch</th>
                    <th className="p-4 border-b border-slate-100 w-44">Trạng thái</th>
                    <th className="p-4 border-b border-slate-100">Ghi chú</th>
                    <th className="p-4 text-center border-b border-slate-100 w-16">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reconcileValues.map((v: any, idx: number) => {
                    const l = data.lines.find((x: any) => x.id === v.lineId) || {
                      id: v.lineId,
                      qtyOrdered: 0,
                      qtyConfirmed: 0,
                      qtyDefective: 0,
                      note: '',
                      item: items.find(i => i.id === v.itemId) || { name: 'Đang tải...', mvpp: '', unit: '' }
                    };
                    const remainingLineQty = Math.max(0, l.qtyOrdered - l.qtyConfirmed);
                    const isLineCompleted = l.qtyOrdered > 0 && remainingLineQty <= 0;
                    const isUnexpected = v.isUnexpected || l.qtyOrdered === 0;
                    
                    const lineReplacements = data.replacements?.filter((r: any) => r.originalReceiptLineId === l.id) || [];
                    
                    return (
                      <React.Fragment key={v.lineId}>
                        <tr className={`group transition-all ${isLineCompleted ? 'bg-slate-50/40 opacity-75' : 'hover:bg-slate-50/50'}`}>
                          <td className="p-4 text-center text-xs font-medium text-slate-300">{idx + 1}</td>
                          <td className="p-4 max-w-[220px]">
                            {l.item?.id ? (
                              <GoodsNameWithPreview 
                                itemId={l.item.id}
                                itemCode={l.item.mvpp}
                                itemName={l.item.name}
                                imageUrl={l.item.imageUrl}
                                thumbnailUrl={l.item.thumbnailUrl}
                                categoryName={l.item.category}
                                unit={l.item.unit}
                              />
                            ) : (
                              <p className="font-bold text-slate-700 text-xs leading-snug uppercase">{l.item?.name || 'Đang tải...'}</p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <p className="text-[9px] font-bold text-slate-400 tracking-tight">{l.item.mvpp} · {l.item.unit}</p>
                              {isLineCompleted && (
                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Đã nhập đủ</span>
                              )}
                              {isUnexpected && (
                                <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Hàng phát sinh</span>
                              )}
                              {l.replacedQtyTotal > 0 && (
                                <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border ${
                                  l.qtyConfirmed + l.replacedQtyTotal >= l.qtyOrdered
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : 'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                  {l.qtyConfirmed + l.replacedQtyTotal >= l.qtyOrdered ? 'Đã đổi đủ' : `Đã đổi ${l.replacedQtyTotal} cái`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-bold text-slate-500">{l.qtyOrdered}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-bold text-emerald-600">{l.qtyConfirmed}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`font-bold ${remainingLineQty > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{remainingLineQty}</span>
                          </td>
                          <td className="p-4 text-center">
                            {isPending ? (
                              <input 
                                type="number" 
                                min={0} 
                                max={isUnexpected ? undefined : remainingLineQty} 
                                value={isLineCompleted ? "" : v.actualQty} 
                                disabled={isLineCompleted}
                                placeholder={isLineCompleted ? "Đã đủ" : "0"}
                                tabIndex={isLineCompleted ? -1 : undefined}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  if (!isUnexpected && val > remainingLineQty) {
                                    showToast('Số nhập đợt này không được vượt số còn lại.', 'warning');
                                  }
                                  const finalVal = (!isUnexpected && val > remainingLineQty) ? remainingLineQty : val;
                                  setReconcileValues(reconcileValues.map(a => a.lineId === v.lineId ? { ...a, actualQty: finalVal } : a));
                                }}
                                className="w-16 h-8 text-center bg-white disabled:bg-slate-50 border border-blue-200 disabled:border-slate-100 rounded-lg text-xs font-bold text-blue-600 disabled:text-slate-400 focus:border-blue-500 outline-none transition shadow-sm ring-1 ring-blue-50/50" 
                              />
                            ) : (
                              <span className="font-bold text-blue-600">{l.qtyConfirmed}</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {isPending ? (
                              <input 
                                type="number" 
                                min={0} 
                                value={isLineCompleted ? "" : v.qtyDefective} 
                                disabled={isLineCompleted}
                                placeholder={isLineCompleted ? "-" : "0"}
                                tabIndex={isLineCompleted ? -1 : undefined}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setReconcileValues(reconcileValues.map(a => a.lineId === v.lineId ? { ...a, qtyDefective: val } : a));
                                }}
                                className="w-14 h-8 text-center bg-white disabled:bg-slate-50 border border-slate-200 disabled:border-slate-100 rounded-lg text-xs font-bold text-amber-600 disabled:text-slate-400 focus:border-amber-500 outline-none transition shadow-sm" 
                              />
                            ) : (
                              <span className={`font-bold ${l.qtyDefective > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{l.qtyDefective || '-'}</span>
                            )}
                          </td>
                          <td className="p-4">
                            {isPending ? (
                              isUnexpected ? (
                                <select
                                  value={v.discrepancyType || 'Hàng ngoài PO / Sai model'}
                                  onChange={(e) => setReconcileValues(reconcileValues.map(a => a.lineId === v.lineId ? { ...a, discrepancyType: e.target.value } : a))}
                                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:border-blue-400 outline-none transition shadow-sm"
                                >
                                  <option value="Hàng ngoài PO / Sai model">Hàng ngoài PO / Sai model</option>
                                  <option value="Hàng ngoài PO / Khác cấu hình">Hàng ngoài PO / Khác cấu hình</option>
                                  <option value="Hàng khuyến mãi / tặng kèm">Hàng khuyến mãi / tặng kèm</option>
                                  <option value="Khác">Khác</option>
                                </select>
                              ) : (
                                <span className="text-slate-400 text-xs font-medium">-</span>
                              )
                            ) : (
                              <span className="text-slate-500 text-xs font-bold">{l.discrepancyType || '-'}</span>
                            )}
                          </td>
                          <td className="p-4">
                            {isPending ? (
                              isUnexpected ? (
                                <select
                                  value={v.status || 'Chờ xử lý lệch'}
                                  onChange={(e) => setReconcileValues(reconcileValues.map(a => a.lineId === v.lineId ? { ...a, status: e.target.value } : a))}
                                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:border-blue-400 outline-none transition shadow-sm"
                                >
                                  <option value="Chờ xử lý lệch">Chờ xử lý lệch</option>
                                  <option value="Chấp nhận hàng thay thế">Chấp nhận hàng thay thế</option>
                                  <option value="Trả lại nhà cung cấp">Trả lại nhà cung cấp</option>
                                  <option value="Chờ bổ sung/chỉnh PO">Chờ bổ sung/chỉnh PO</option>
                                  <option value="Nhập tạm chờ duyệt">Nhập tạm chờ duyệt</option>
                                </select>
                              ) : (
                                <span className="text-slate-400 text-xs font-medium">-</span>
                              )
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                l.status === 'Chấp nhận hàng thay thế' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                l.status === 'Trả lại nhà cung cấp' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                l.status === 'Chờ bổ sung/chỉnh PO' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                l.status === 'Nhập tạm chờ duyệt' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                l.status ? 'bg-slate-100 text-slate-600 border border-slate-200' : ''
                              }`}>
                                {l.status || '-'}
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {isPending ? (
                              <input 
                                type="text" 
                                placeholder="..." 
                                value={isLineCompleted ? "" : v.note} 
                                disabled={isLineCompleted}
                                onChange={(e) => setReconcileValues(reconcileValues.map(a => a.lineId === v.lineId ? { ...a, note: e.target.value } : a))}
                                className="w-full h-8 px-3 bg-slate-50 disabled:bg-slate-100 border border-slate-200 disabled:border-slate-100 rounded-lg text-xs font-medium text-slate-600 disabled:text-slate-400 focus:bg-white focus:border-blue-400 outline-none transition" 
                              />
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
                          <td className="p-4 text-center">
                            {isPending && isUnexpected ? (
                              <button 
                                onClick={() => {
                                  setReconcileValues(reconcileValues.filter(a => a.lineId !== v.lineId));
                                }}
                                className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 hover:text-rose-600 text-rose-400 flex items-center justify-center transition mx-auto"
                                title="Xóa hàng phát sinh"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                        {lineReplacements.map((rep: any) => (
                          <tr key={rep.id} className="bg-amber-50/15 text-xs">
                            <td className="p-4 text-center text-slate-300 font-bold">↳</td>
                            <td className="p-4 max-w-[220px]">
                              {rep.replacementItem ? (
                                <GoodsNameWithPreview 
                                  itemId={rep.replacementItem.id}
                                  itemCode={rep.replacementItem.mvpp}
                                  itemName={rep.replacementItem.name}
                                  imageUrl={rep.replacementItem.imageUrl}
                                  thumbnailUrl={rep.replacementItem.thumbnailUrl}
                                  categoryName={rep.replacementItem.category}
                                  unit={rep.replacementItem.unit}
                                />
                              ) : (
                                <span className="font-bold text-slate-700 text-xs uppercase">Đang tải...</span>
                              )}
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[8px] font-black text-amber-600 uppercase tracking-tighter bg-amber-100/50 px-1 py-0.5 rounded">Hàng thay thế</p>
                                <span className="text-[9px] text-slate-400 font-bold">{rep.replacementItem?.mvpp}</span>
                              </div>
                            </td>
                            <td className="p-4 text-center text-slate-400 font-semibold">-</td>
                            <td className="p-4 text-center text-slate-400 font-semibold">-</td>
                            <td className="p-4 text-center text-slate-400 font-semibold">-</td>
                            <td className="p-4 text-center font-bold text-blue-600">{rep.replacementQty}</td>
                            <td className="p-4 text-center text-slate-300">-</td>
                            <td className="p-4 text-xs font-semibold text-slate-500">Đổi hàng / Sai model</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                rep.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                rep.status === 'RETURNED' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                rep.status === 'PENDING_PO_ADJUSTMENT' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                rep.status === 'WAITING_APPROVAL' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {rep.status === 'ACCEPTED' ? 'Chấp nhận thay thế' :
                                 rep.status === 'RETURNED' ? 'Trả lại NCC' :
                                 rep.status === 'PENDING_PO_ADJUSTMENT' ? 'Chờ chỉnh PO' :
                                 rep.status === 'WAITING_APPROVAL' ? 'Nhập tạm chờ duyệt' : rep.status}
                              </span>
                            </td>
                            <td className="p-4 text-xs font-medium text-slate-500 italic" colSpan={2}>
                              {rep.reason} {rep.note ? `(${rep.note})` : ''}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
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
                  <span className="text-[8px] text-emerald-400 uppercase font-black tracking-tighter">Đã Nhập Tổng</span>
                  <span className="text-xs font-bold text-emerald-600">{totalConfirmed}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-amber-400 uppercase font-black tracking-tighter">Còn Lại</span>
                  <span className="text-xs font-bold text-amber-600">{remainingQty}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-blue-400 uppercase font-black tracking-tighter">Vừa Nhập</span>
                  <span className="text-sm font-black text-blue-600">{currentInputActual}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-rose-400 uppercase font-black tracking-tighter">Lỗi / Hỏng</span>
                  <span className="text-sm font-black text-rose-600">{currentDefective}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-indigo-500 uppercase font-black tracking-tighter">Hàng thay thế</span>
                  <span className="text-sm font-black text-indigo-600">{totalReplacementsAccepted}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-rose-500 uppercase font-black tracking-tighter">Trả lại NCC</span>
                  <span className="text-sm font-black text-rose-600">{totalReplacementsReturned}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-amber-500 uppercase font-black tracking-tighter">Chờ xử lý</span>
                  <span className="text-sm font-black text-amber-600">{totalReplacementsPending}</span>
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

      {/* ADD UNEXPECTED ITEM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" /> Thêm hàng phát sinh / hàng ngoài PO
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                Chọn vật tư từ danh mục hệ thống để đưa vào biên bản đối chiếu thực tế.
              </p>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Gõ tên hoặc mã MVPP để tìm kiếm..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-sm text-slate-700"
                />
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto border border-slate-100 rounded-xl bg-white shadow-sm">
                {items.filter(i => 
                  i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  i.mvpp.toLowerCase().includes(searchTerm.toLowerCase())
                ).slice(0, 10).map((item: any) => (
                  <div 
                    key={item.id} 
                    onClick={() => handleAddUnexpectedItem(item)}
                    className="p-3 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition group"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="font-bold text-slate-800 text-xs leading-normal uppercase">{item.name}</p>
                      <p className="text-[9px] font-black tracking-widest text-slate-400 mt-0.5">{item.mvpp} · Đơn vị: {item.unit}</p>
                    </div>
                    <button className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {items.filter(i => 
                  i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  i.mvpp.toLowerCase().includes(searchTerm.toLowerCase())
                ).length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                    Không tìm thấy sản phẩm nào phù hợp.
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setSearchTerm('');
                }} 
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold rounded-lg transition text-xs uppercase tracking-wide"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* EXCHANGE MODEL MODAL */}
      {showReplaceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 bg-white shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Đổi hàng / Giao hàng thay thế
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                Ghi nhận vật tư thực nhận khác model so với PO và thiết lập liên kết đối chiếu chênh lệch.
              </p>
            </div>
            
            <form onSubmit={handleReplaceSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-slate-50/30">
              {/* Dòng PO gốc */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dòng hàng gốc trên PO *</label>
                <select
                  required
                  value={replaceFormData.originalReceiptLineId}
                  onChange={e => {
                    const origId = e.target.value;
                    const origLine = data.lines.find((line: any) => line.id === origId);
                    const remaining = origLine ? Math.max(0, origLine.qtyOrdered - origLine.qtyConfirmed - (origLine.replacedQtyTotal || 0)) : 1;
                    setReplaceFormData({
                      ...replaceFormData,
                      originalReceiptLineId: origId,
                      replacementQty: remaining
                    });
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-700 shadow-sm"
                >
                  <option value="">-- Chọn dòng PO cần đổi --</option>
                  {data.lines.filter((line: any) => line.qtyOrdered > 0 && (line.qtyOrdered - line.qtyConfirmed - (line.replacedQtyTotal || 0)) > 0).map((line: any) => (
                    <option key={line.id} value={line.id}>
                      {line.item.mvpp} - {line.item.name} (Còn lại: {line.qtyOrdered - line.qtyConfirmed - (line.replacedQtyTotal || 0)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Chi tiết dòng gốc */}
              {(() => {
                const origLine = data.lines.find((line: any) => line.id === replaceFormData.originalReceiptLineId);
                if (!origLine) return null;
                return (
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-xs space-y-2 font-semibold text-slate-600">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Thông tin dòng PO gốc:</p>
                    <p><strong>Vật tư PO:</strong> {origLine.item.name} ({origLine.item.mvpp})</p>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="bg-slate-50 p-2 rounded border border-slate-100">
                        <p className="text-[8px] text-slate-400 uppercase font-black">Quy chiếu</p>
                        <p className="text-xs font-black text-slate-700">{origLine.qtyOrdered}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-100">
                        <p className="text-[8px] text-slate-400 uppercase font-black">Đã nhập trước</p>
                        <p className="text-xs font-black text-emerald-600">{origLine.qtyConfirmed}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-100">
                        <p className="text-[8px] text-slate-400 uppercase font-black">Còn lại</p>
                        <p className="text-xs font-black text-amber-600">{origLine.qtyOrdered - origLine.qtyConfirmed - (origLine.replacedQtyTotal || 0)}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Hàng thực nhận */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hàng hóa thực nhận (Vật tư thay thế) *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm vật tư thay thế theo tên hoặc mã MVPP..."
                    value={replaceSearchTerm}
                    onChange={e => setReplaceSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-xs font-semibold text-slate-700 shadow-sm"
                  />
                </div>
                {replaceSearchTerm && !replaceFormData.replacementItemId && (
                  <div className="absolute left-0 right-0 border border-slate-200 rounded-xl bg-white shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-100 z-[110] mt-1">
                    {items.filter(i => 
                      i.name.toLowerCase().includes(replaceSearchTerm.toLowerCase()) || 
                      i.mvpp.toLowerCase().includes(replaceSearchTerm.toLowerCase())
                    ).slice(0, 5).map((item: any) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setReplaceFormData({
                            ...replaceFormData,
                            replacementItemId: item.id,
                            note: `Đổi từ dòng PO cũ. ĐVT thực nhận: ${item.unit}`
                          });
                          setReplaceSearchTerm(`${item.name} (${item.mvpp})`);
                        }}
                        className="p-3 hover:bg-slate-50 text-xs cursor-pointer flex justify-between items-center transition"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-slate-700 uppercase truncate">{item.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold">{item.mvpp} · {item.unit}</p>
                        </div>
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded shadow-sm">Chọn</span>
                      </div>
                    ))}
                    {items.filter(i => 
                      i.name.toLowerCase().includes(replaceSearchTerm.toLowerCase()) || 
                      i.mvpp.toLowerCase().includes(replaceSearchTerm.toLowerCase())
                    ).length === 0 && (
                      <div className="p-4 text-center text-slate-400 text-[10px] font-bold">Không tìm thấy vật tư nào</div>
                    )}
                  </div>
                )}
              </div>

              {/* Chi tiết hàng thực nhận */}
              {(() => {
                const selectedItem = items.find(i => i.id === replaceFormData.replacementItemId);
                if (!selectedItem) return null;
                return (
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-xs space-y-2 font-semibold text-slate-600">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Vật tư thay thế đã chọn:</p>
                      <button 
                        type="button" 
                        onClick={() => {
                          setReplaceFormData({ ...replaceFormData, replacementItemId: '' });
                          setReplaceSearchTerm('');
                        }}
                        className="text-[9px] text-rose-500 hover:underline uppercase font-bold"
                      >
                        Chọn lại
                      </button>
                    </div>
                    <p><strong>Vật tư nhận:</strong> {selectedItem.name} ({selectedItem.mvpp})</p>
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>Đơn vị tính: <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{selectedItem.unit}</span></div>
                      <div>Đơn giá hệ thống: <span className="font-bold text-amber-600">{Number(selectedItem.price).toLocaleString('vi-VN')} đ</span></div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                {/* Số lượng đổi */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số lượng thực nhận *</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={replaceFormData.replacementQty}
                    onChange={e => setReplaceFormData({ ...replaceFormData, replacementQty: Math.max(1, parseInt(e.target.value) || 0) })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-700 shadow-sm font-mono text-center text-lg text-blue-600"
                  />
                </div>

                {/* Cách xử lý */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cách xử lý lệch *</label>
                  <select
                    required
                    value={replaceFormData.handlingMode}
                    onChange={e => setReplaceFormData({ ...replaceFormData, handlingMode: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-700 shadow-sm"
                  >
                    <option value="ACCEPT_REPLACEMENT">Chấp nhận hàng thay thế</option>
                    <option value="TEMP_RECEIVE">Nhập tạm chờ duyệt</option>
                    <option value="RETURN_SUPPLIER">Trả lại nhà cung cấp</option>
                    <option value="WAIT_PO_ADJUSTMENT">Chờ chỉnh PO</option>
                  </select>
                </div>
              </div>

              {/* Lý do đổi hàng */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lý do đổi hàng *</label>
                <input
                  required
                  type="text"
                  placeholder="Ví dụ: Nhà cung cấp giao model 7cm thay thế model 5cm đã hết..."
                  value={replaceFormData.reason}
                  onChange={e => setReplaceFormData({ ...replaceFormData, reason: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-700 shadow-sm"
                />
              </div>

              {/* Ghi chú */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ghi chú thêm</label>
                <input
                  type="text"
                  placeholder="..."
                  value={replaceFormData.note}
                  onChange={e => setReplaceFormData({ ...replaceFormData, note: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-700 shadow-sm"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => {
                    setShowReplaceModal(false);
                    setReplaceSearchTerm('');
                  }} 
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition text-xs uppercase tracking-wide"
                >
                  Đóng
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition text-xs uppercase tracking-wide shadow-lg shadow-amber-500/20"
                >
                  Xác nhận đổi hàng
                </button>
              </div>
            </form>
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


