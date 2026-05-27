import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAppContext as useApp } from '../../context/AppContext';
import { 
  ArrowLeft, CheckSquare, XCircle, CheckCircle, 
  ShoppingCart, Send, Info, Printer,
  TrendingUp, Coins, FileText, AlertTriangle, Download, Trash2,
  ExternalLink, User as UserIcon, Building, Clock, Paperclip,
  Truck, Package, Search, Plus, RotateCcw,
  ChevronLeft, ChevronRight, Layers, CheckCircle2, Archive
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DocumentChainMap from '../../components/DocumentChainMap';
import WorkflowStepper from '../../components/purchases/WorkflowStepper';
import LinkedDocumentReferences from '../../components/LinkedDocumentReferences';
import { GoodsNameWithPreview } from '../../components/GoodsNameWithPreview';

interface PurchasesDetailProps {
  poId: string;
  navigationIds?: string[];
  onNavigate?: (id: string) => void;
  onBack: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

const formatDigitalSignatureDate = (date: string | Date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const formatAuditAction = (action: string) => {
  switch (action) {
    case 'CREATE': return 'Tạo mới';
    case 'SUBMIT': return 'Trình duyệt';
    case 'APPROVE': return 'Đã duyệt';
    case 'REJECT': return 'Từ chối';
    case 'ORDER': return 'Đã đặt hàng';
    case 'CONFIRM_DELIVERY': return 'Giao hàng';
    case 'RECEIVE': return 'Đã nhận';
    case 'CANCEL': return 'Đã hủy';
    case 'UPDATE': return 'Cập nhật';
    default: return action;
  }
};

const PurchasesDetail = ({ poId, navigationIds, onNavigate, onBack, showToast }: PurchasesDetailProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');
  const ref = searchParams.get('ref');
  const { currentUser } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleBack = () => {
    if (from && ref) {
      if (from === 'request') {
        navigate(`/requests/${ref}`);
      } else if (from === 'po') {
        navigate(`/purchase-orders/${ref}`);
      } else if (from === 'receipt') {
        navigate(`/receipts/${ref}`);
      }
    } else {
      onBack();
    }
  };

  // Navigation Logic
  const currentIndex = navigationIds ? navigationIds.indexOf(poId) : -1;
  const total = navigationIds?.length || 0;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < total - 1 && currentIndex !== -1;

  const goPrev = () => {
    if (canGoPrev && onNavigate && navigationIds) {
      onNavigate(navigationIds[currentIndex - 1]);
    }
  };

  const goNext = () => {
    if (canGoNext && onNavigate && navigationIds) {
      onNavigate(navigationIds[currentIndex + 1]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, navigationIds, onNavigate]);

  // Modal States
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [chainData, setChainData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'reconciliation' | 'history' | 'links'>('items');
  const [approvals, setApprovals] = useState<any[]>([]);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSupplier, setOrderSupplier] = useState('');
  const [orderExpectedDate, setOrderExpectedDate] = useState('');
  const [vat, setVat] = useState(0);
  const [discount, setDiscount] = useState(0);

  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState('MAIN');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelFiles, setCancelFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPrintType, setSelectedPrintType] = useState<'ALL' | 'VPP' | 'VE_SINH'>('ALL');

  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [activeReplaceLine, setActiveReplaceLine] = useState<any>(null);
  const [replacementSearch, setReplacementSearch] = useState('');
  const [selectedReplacementItem, setSelectedReplacementItem] = useState<any>(null);
  const [replacementQty, setReplacementQty] = useState(0);
  const [replacementPrice, setReplacementPrice] = useState(0);
  const [replacementReason, setReplacementReason] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);

  const fetchItems = async () => {
    try {
      const res = await api.get('/items');
      setItems(res.data.filter((i: any) => i.isActive));
    } catch (e: any) {}
  };

  const refreshData = async () => {
    try {
      const res = await api.get(`/purchases/${poId}`);
      setData(res.data);
      try {
        const chainRes = await api.get(`/procurement-chain/by-po/${poId}`);
        setChainData(chainRes.data);
      } catch (e) {
        console.error("Failed to load chain data", e);
      }
      if (res.data) {
          setApprovals(res.data.lines.map((l: any) => ({
              lineId: l.id,
              itemId: l.itemId,
              item: l.item,
              qtyRequested: l.qtyRequested,
              qtyApproved: l.qtyApproved ?? l.qtyRequested,
              unitPrice: l.unitPrice,
              supplier: l.supplier || res.data.supplier || '',
              location: l.location || '',
              gender: l.gender || '',
              status: l.status || 'PENDING',
              selected: l.status === 'PENDING' || !l.status,
              isDeleted: false,
              isNew: false
          })));
          setOrderSupplier(res.data.supplier || '');
          setOrderExpectedDate(res.data.expectedDate ? res.data.expectedDate.substring(0, 10) : '');
          setVat(Number(res.data.vat || 0));
          setDiscount(Number(res.data.discount || 0));
      }
    } catch(err: any) {
      console.error(err);
      showToast('Không thể tải chi tiết Phiếu', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    fetchItems();
  }, [poId]);

  const handleAction = async (actionPath: string, payload: any = {}, msg: string) => {
    try {
      await api.post(`/purchases/${poId}${actionPath}`, payload);
      showToast(msg, 'success');
      
      setShowApproveModal(false);
      setShowOrderModal(false);
      setShowDeliveryModal(false);
      setShowCancelModal(false);

      // Auto navigate to next if approved/rejected/submitted
      if (canGoNext && (actionPath === '/approve' || actionPath === '/reject' || actionPath === '/cancel' || actionPath === '/submit')) {
          goNext();
      } else {
          await refreshData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Thao tác thất bại', 'error');
    }
  };

  const printDocument = async (printType: 'ALL' | 'VPP' | 'VE_SINH' = 'ALL') => {
      const hasPendingReplacement = data?.lines?.some((l: any) => l.requestLine?.status === 'REPLACEMENT_PENDING_ADMIN');
      if (hasPendingReplacement) {
          showToast('Không thể in: Có vật tư đang chờ Admin duyệt thay thế.', 'warning');
          return;
      }
      setSelectedPrintType(printType);
      window.open(`/purchase-orders/${poId}/print?printType=${printType}`, '_blank');
  };

  const handleAdminReplacementAction = async (lineId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await api.post(`/requests/lines/${lineId}/admin-action`, { action, reason: 'Phê duyệt từ trang chi tiết PO' });
      showToast(action === 'APPROVE' ? 'Đã duyệt thay thế vật tư!' : 'Đã từ chối thay thế!', 'success');
      
      // If there are no more pending replacements in THIS PO, maybe go next?
      // For now just refresh or go next if explicitly requested.
      refreshData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Thao tác thất bại', 'error');
    }
  };

  const handleReplaceConfirm = async () => {
    const targetId = activeReplaceLine?.requestLineId || activeReplaceLine?.id;
    
    if (!targetId) {
      showToast('Thiếu ID dòng vật tư, không thể thay thế.', 'error');
      return;
    }
    if (!selectedReplacementItem || !replacementReason) {
      showToast('Vui lòng chọn vật tư và nhập lý do thay thế', 'warning');
      return;
    }
    try {
      setIsReplacing(true);
      console.log("[replacement] Sending replacement for target ID:", targetId);
      const response = await api.patch(`/requests/lines/${targetId}/replace`, {
        replacementItemId: selectedReplacementItem.id,
        replacementQty: Number(replacementQty),
        replacementPrice: Number(replacementPrice),
        replacementReason
      });
      console.log("[replacement] Success:", response.data);
      showToast('Đã lưu thông tin thay thế vật tư', 'success');
      setShowReplaceModal(false);
      setSelectedReplacementItem(null);
      setReplacementReason('');
      refreshData();
    } catch (err: any) {
      console.error("[replacement] Error details:", err.response?.data || err.message);
      const errorMsg = err.response?.data?.error || 'Thay thế thất bại';
      showToast(errorMsg, 'error');
    } finally {
      setIsReplacing(false);
    }
  };

  if (!currentUser) return null;
  if (loading || !data) return <div className="p-10 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div></div>;

  const status = data.status;
  const isDRAFT = status === 'DRAFT';
  const isPENDING = status === 'PENDING_APPROVAL' || status === 'PARTIALLY_APPROVED';
  const isAPPROVED = status === 'APPROVED';
  const isORDERED = status === 'ORDERED';
  const isDELIVERING = status === 'DELIVERING' || status === 'PARTIALLY_DELIVERED';
  const isCOMPLETED = status === 'COMPLETED';
  const isCANCELLED = status === 'CANCELLED' || status === 'REJECTED';
  const isRETURNED = status === 'RETURNED';

  const isBackorderPO = data.source === 'AUTO' || data.id.startsWith('PO-BO');

  const currentUid = currentUser.userId || currentUser.id;
  const isAdmin = currentUser.role === 'ADMIN';
  const isManager = currentUser.role === 'MANAGER';

  const canSubmit = (currentUid === data.requesterId || isAdmin) && isDRAFT;
  const canApprove = (isManager || isAdmin) && isPENDING;
  const canOrder = (isManager || isAdmin) && (isAPPROVED || (isDRAFT && data.type === 'PO'));
  const canConfirmDelivery = (isManager || isAdmin) && isORDERED;
  const canCancel = isAdmin && !isCOMPLETED && !isCANCELLED;
  const canEdit = (currentUid === data.requesterId || isAdmin) && (isDRAFT || isRETURNED);

  const addApprovalLine = (item: any) => {
    if (approvals.find((a: any) => a.itemId === item.id && !a.isDeleted)) {
        showToast('Mặt hàng đã có trong danh sách', 'warning');
        return;
    }
    setApprovals([...approvals, {
        lineId: `NEW-${Date.now()}`,
        itemId: item.id,
        item: item,
        qtyRequested: 1,
        qtyApproved: 1,
        unitPrice: item.price || 0,
        supplier: '',
        location: '',
        gender: '',
        isDeleted: false,
        isNew: true
    }]);
    setSearchTerm('');
  };

  const toggleDeleteLine = (lineId: string) => {
    setApprovals(approvals.map((a: any) => a.lineId === lineId ? { ...a, isDeleted: !a.isDeleted } : a));
  };

  // Financial Stats
  const totalAmount = data.lines?.reduce((sum: number, l: any) => {
      const qtyReq = l.qtyOrdered ?? l.qtyApproved ?? l.qtyRequested;
      const isReplaced = !!l.requestLine?.replacementItemId;
      const effectivePrice = isReplaced ? Number(l.requestLine?.replacementPrice || 0) : Number(l.unitPrice || 0);
      const effectiveQty = isReplaced ? Number(l.requestLine?.replacementQty || 0) : qtyReq;
      return sum + (effectivePrice * effectiveQty);
  }, 0) || Number(data.totalAmount || 0);
  const vatAmount = totalAmount * (Number(data.vat || 0) / 100);
  const discountAmount = Number(data.discount || 0);
  const finalTotal = totalAmount + vatAmount - discountAmount;

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'DRAFT': return 'bg-slate-400 text-white shadow-slate-400/30';
      case 'PENDING_APPROVAL': return 'bg-amber-500 text-white shadow-amber-500/30';
      case 'PARTIALLY_APPROVED': return 'bg-orange-500 text-white shadow-orange-500/30';
      case 'APPROVED': return 'bg-emerald-500 text-white shadow-emerald-500/30';
      case 'ORDERED': return 'bg-indigo-500 text-white shadow-indigo-500/30';
      case 'DELIVERING': case 'PARTIALLY_DELIVERED': return 'bg-blue-500 text-white shadow-blue-500/30';
      case 'COMPLETED': return 'bg-teal-600 text-white shadow-teal-600/30';
      case 'CANCELLED': case 'REJECTED': return 'bg-rose-500 text-white shadow-rose-500/30';
      default: return 'bg-slate-500 text-white';
    }
  };

  const getStatusDescription = (s: string) => {
    switch(s) {
      case 'DRAFT': return 'Đề nghị này chưa được gửi duyệt. Bạn có thể chỉnh sửa trước khi gửi.';
      case 'PENDING_APPROVAL': return 'Đề nghị đang chờ cấp trên hoặc Admin phê duyệt.';
      case 'PARTIALLY_APPROVED': return 'Một số mặt hàng đã được phê duyệt. Đang chờ phê duyệt các mặt hàng còn lại.';
      case 'APPROVED': return 'Đề nghị đã được duyệt. Sẵn sàng để phát hành PO.';
      case 'ORDERED': return 'Đơn đặt hàng đã được chốt và gửi cho Nhà cung cấp.';
      case 'DELIVERING': return 'Nhà cung cấp đang trong quá trình giao hàng.';
      case 'PARTIALLY_DELIVERED': return 'Đã nhận một phần hàng hóa. Đang chờ phần còn lại.';
      case 'COMPLETED': return 'Toàn bộ hàng hóa đã được nhận và nhập kho hoàn tất.';
      case 'CANCELLED': return 'Phiếu này đã bị hủy bỏ và không thể thực hiện tiếp.';
      case 'REJECTED': return 'Đề nghị này đã bị từ chối phê duyệt.';
      default: return '';
    }
  };

  const renderTitleWithLinks = (text: string) => {
    if (!text) return null;
    const pdxRegex = /PDX-\d{8}-\d{4}/g;
    const parts = text.split(pdxRegex);
    const matches = text.match(pdxRegex);
    
    if (!matches) return <span>{text}</span>;
    
    return (
      <span className="inline-flex items-center flex-wrap">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {matches[i] && (
              <button 
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/requests/${matches[i]}`); }}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-all font-black text-[10px] mx-1 border border-blue-100 shadow-sm"
              >
                {matches[i]} <ExternalLink className="w-3 h-3"/>
              </button>
            )}
          </React.Fragment>
        ))}
      </span>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] relative print:bg-white print:overflow-auto">
      {/* WEB UI ONLY - HIDDEN ON PRINT */}
      <div className="no-print flex flex-col flex-1 print:hidden">
          {/* HEADER BAR */}
          <div className="bg-white border-b border-slate-200 flex flex-col pt-3 shrink-0 z-20 shadow-sm">
          <div className="flex justify-between items-center px-6 md:px-8 pb-3">
              <div className="flex items-center gap-4">
                  <button onClick={handleBack} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition shadow-inner">
                      <ArrowLeft className="w-4 h-4"/>
                  </button>
                  <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center leading-tight">
                          {data.id} 
                        </h2>
                        {navigationIds && navigationIds.length > 0 && (
                          <div className="flex items-center bg-slate-100 rounded-xl p-1 ml-4 border border-slate-200">
                            <button 
                              onClick={goPrev}
                              disabled={!canGoPrev}
                              className={`p-1.5 rounded-lg transition-all ${canGoPrev ? 'hover:bg-white text-indigo-600 shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}
                              title="Phiếu trước (Arrow Left)"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[60px] text-center border-x border-slate-200">
                              {currentIndex + 1} / {total}
                            </span>
                            <button 
                              onClick={goNext}
                              disabled={!canGoNext}
                              className={`p-1.5 rounded-lg transition-all ${canGoNext ? 'hover:bg-white text-indigo-600 shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}
                              title="Phiếu sau (Arrow Right)"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <span className="text-[9px] tracking-widest bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-black uppercase ml-2">{data.type}</span>
                        {isCANCELLED && <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-black uppercase">ĐÃ HỦY</span>}
                      </div>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3"/> 
                        {data.source} • Lập lúc {new Date(data.createdAt).toLocaleString('vi-VN')}
                        <span className="mx-1.5 text-slate-200">|</span>
                        <span className="truncate max-w-[400px]">{renderTitleWithLinks(data.title)}</span>
                      </p>
                      {chainData && (
                        <div className="mt-2">
                          <LinkedDocumentReferences
                            request={chainData.request ? { id: chainData.request.id, code: chainData.request.id } : undefined}
                            purchaseOrder={chainData.purchaseOrder ? { id: chainData.purchaseOrder.id, code: chainData.purchaseOrder.id } : undefined}
                            receipt={chainData.receipts?.length === 1 ? { id: chainData.receipts[0].id, code: chainData.receipts[0].id } : undefined}
                            receipts={chainData.receipts?.length > 1 ? chainData.receipts.map((r: any) => ({ id: r.id, code: r.id })) : undefined}
                            warehouse={chainData.warehouse ? { id: chainData.warehouse.id, name: chainData.warehouse.name } : undefined}
                            supplier={chainData.supplier ? { id: chainData.supplier.id, name: chainData.supplier.name } : undefined}
                          />
                        </div>
                      )}
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-lg transform hover:scale-105 transition-all ${getStatusColor(status)}`}>
                     {status.replace(/_/g, ' ')}
                  </div>
              </div>
          </div>

          <WorkflowStepper currentStatus={status} />
          
          <div className="px-8 py-2 bg-indigo-50/50 border-t border-indigo-100 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0"/>
              <p className="text-[11px] font-bold text-indigo-700 italic">"{getStatusDescription(status)}"</p>
              {isPENDING && data.approver && (
                  <span className="ml-auto text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-slate-200">Người xử lý: {data.approver.fullName}</span>
              )}
          </div>
      </div>

          <div key={data.id} className="flex-1 p-4 md:p-6 flex flex-col xl:flex-row gap-4 w-full max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          <div className="flex-1 flex flex-col gap-4 min-w-0">
              
              {/* TOP SUMMARY GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* General Info */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 relative overflow-hidden lg:col-span-2">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Thông Tin Tổng Quan</p>
                          <h3 className="text-base font-black text-slate-900 leading-tight mt-1">{data.title || 'Đề nghị Mua sắm'}</h3>
                        </div>
                        <FileText className="w-4 h-4 text-indigo-200"/>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><UserIcon className="w-2.5 h-2.5"/> Người Yêu Cầu</p>
                           <p className="text-[13px] font-bold text-slate-700 leading-tight">{data.requester?.fullName || 'Hệ thống'}</p>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Building className="w-2.5 h-2.5"/> Bộ Phận / Phòng Ban</p>
                           <p className="text-[13px] font-bold text-indigo-600 leading-tight">{data.department || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="mt-3 p-2.5 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Info className="w-2.5 h-2.5"/> Mục đích sử dụng</p>
                        <p className="text-[12px] font-medium text-slate-600 italic leading-snug">
                          {renderTitleWithLinks(data.purpose || 'Không có ghi chú thêm')}
                        </p>
                      </div>
                  </div>

                  {/* Vendor Info */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Nhà Cung Cấp</p>
                        <Truck className="w-4 h-4 text-teal-200"/>
                      </div>
                      <div className="flex-1 flex flex-col justify-center py-1">
                        <h3 className="text-base font-black text-slate-800 leading-tight">{data.supplier || 'Chờ cập nhật'}</h3>
                        {(!data.supplier || data.supplier === 'Đang chờ cập nhật') && (
                          <div className="mt-1 flex items-center gap-1 text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded w-fit">
                            <AlertTriangle className="w-3 h-3"/>
                            <p className="text-[9px] font-black uppercase tracking-tighter">Cần chỉ định NCC</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-50">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ngày dự kiến nhận (ETA)</p>
                         <div className="flex items-center gap-1.5 text-teal-600 font-bold text-xs">
                            <Clock className="w-3.5 h-3.5"/>
                            {data.expectedDate ? new Date(data.expectedDate).toLocaleDateString('vi-VN') : 'Chưa xác định'}
                         </div>
                      </div>
                  </div>
              </div>

              {/* Tab Selector Header */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 flex items-center gap-1 mb-4 select-none">
                  {[
                      { id: 'items', label: 'Chi tiết dòng hàng', icon: Archive },
                      { id: 'reconciliation', label: 'Đối chiếu dòng hàng', icon: FileText },
                      { id: 'history', label: 'Lịch sử xử lý', icon: Clock },
                      { id: 'links', label: 'Liên kết chứng từ', icon: ShoppingCart }
                  ].map(tab => (
                      <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center gap-2 px-6 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-xl ${
                              activeTab === tab.id 
                              ? 'bg-indigo-50 text-indigo-650 shadow-sm border border-indigo-100/50' 
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                          <tab.icon className="w-4 h-4" />
                          {tab.label}
                      </button>
                  ))}
              </div>

              {activeTab === 'items' && (
                  <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 flex flex-col overflow-hidden">
                      <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                          <Package className="w-5 h-5"/>
                        </div>
                        <div>
                           <h3 className="text-base font-black text-slate-800 tracking-tight">Danh Mục Văn Phòng Phẩm</h3>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                             Tổng cộng {data.lines.length} mặt hàng
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
                            <input 
                                type="text"
                                placeholder="Tìm mặt hàng..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 focus:outline-none w-56 transition-all"
                            />
                        </div>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left whitespace-nowrap min-w-max border-collapse po-table">
                          <thead className="bg-slate-50 border-b border-slate-100">
                              <tr className="text-[9px] uppercase font-black text-slate-400 tracking-wider">
                                  <th className="p-2.5 w-10 text-center">STT</th>
                                  <th className="p-2.5">Vật Tư & Quy Cách</th>
                                  <th className="p-2.5 text-center">ĐVT</th>
                                  <th className="p-2.5 text-center">Vị Trí</th>
                                  <th className="p-2.5 text-center">Đối Tượng</th>
                                  <th className="p-2.5 text-center border-x border-slate-100">SL Duyệt PR</th>
                                  <th className="p-2.5 text-center bg-indigo-50/30 text-indigo-600">SL Mua PO</th>
                                  <th className="p-2.5 text-center border-l border-slate-100">Đã Nhập</th>
                                  <th className="p-2.5 text-center">% Hoàn Thành</th>
                                  <th className="p-2.5 text-right bg-emerald-50/30 text-emerald-700">Đơn Giá / Thành Tiền</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {data.lines
                                .filter((l: any) => l.item.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.item.mvpp.toLowerCase().includes(searchTerm.toLowerCase()))
                                  .map((l:any, idx:number) => {
                                    const qtyReq = l.qtyOrdered ?? l.qtyApproved ?? l.qtyRequested;
                                    
                                    // Replacement Info from RequestLine
                                    const isReplaced = !!l.requestLine?.replacementItemId;
                                    const origItem = l.requestLine?.item;
                                    const origPrice = Number(l.requestLine?.unitPrice || origItem?.price || 0);
                                    const origQty = Number(l.requestLine?.qtyApproved || l.requestLine?.qtyRequested || 0);
                                    const origTotal = origPrice * origQty;
                                    
                                    const isPending = l.requestLine?.status === 'REPLACEMENT_PENDING_ADMIN';
                                    const effectiveItem = isReplaced ? l.requestLine?.replacementItem : l.item;
                                    const effectivePrice = isReplaced ? Number(l.requestLine?.replacementPrice || 0) : Number(l.unitPrice || 0);
                                    const effectiveQty = isReplaced ? Number(l.requestLine?.replacementQty || 0) : qtyReq;
                                    const progress = effectiveQty > 0 ? Math.min(100, Math.round((l.qtyReceived / effectiveQty) * 100)) : 0;
                                    const effectiveAmount = effectivePrice * effectiveQty;
                                    
                                    const diff = effectiveAmount - origTotal;
                                    const isExpensive = diff > 0;
                                    const isSavings = diff < 0;

                                    return (
                                    <React.Fragment key={l.id}>
                                    <tr className={`hover:bg-indigo-50/20 transition group ${isReplaced ? 'bg-indigo-50/5' : ''}`}>
                                      <td className="p-2.5 text-center font-bold text-slate-300 group-hover:text-indigo-400">{idx+1}</td>
                                      <td className="p-2.5">
                                          <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                              <GoodsNameWithPreview 
                                                itemId={effectiveItem?.id || l.item.id}
                                                itemCode={effectiveItem?.mvpp || l.item.mvpp}
                                                itemName={effectiveItem?.name || l.item.name}
                                                imageUrl={effectiveItem?.imageUrl || l.item.imageUrl}
                                                thumbnailUrl={effectiveItem?.thumbnailUrl || l.item.thumbnailUrl}
                                                categoryName={effectiveItem?.category || l.item.category}
                                                unit={effectiveItem?.unit || l.item.unit}
                                              />
                                              {isReplaced && (
                                                 <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${isPending ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                                                    {isPending ? 'Đang chờ duyệt' : 'Đã thay thế'}
                                                 </span>
                                              )}
                                              {!isReplaced && l.status && l.status !== 'PENDING' && (
                                                 <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${l.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {l.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                                                 </span>
                                               )}
                                               {!isReplaced && (!l.status || l.status === 'PENDING') && isPENDING && (
                                                 <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter bg-amber-100 text-amber-700">
                                                    Đang chờ duyệt
                                                 </span>
                                               )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                               <span className="text-[9px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-md font-black tracking-widest uppercase">
                                                  {effectiveItem?.mvpp || l.item.mvpp}
                                               </span>
                                               {l.supplier && <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-100 uppercase tracking-tighter">NCC: {l.supplier}</span>}
                                            </div>
                                          </div>
                                      </td>
                                      <td className="p-2.5 text-center">
                                          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{effectiveItem?.unit || l.item.unit}</span>
                                      </td>
                                      <td className="p-2.5 text-center">
                                          <span className="text-[11px] font-bold text-slate-400">{l.location || '-'}</span>
                                      </td>
                                      <td className="p-2.5 text-center">
                                          <span className="text-[11px] font-bold text-slate-400">{l.gender || '-'}</span>
                                      </td>
                                      <td className="p-2.5 text-center border-x border-slate-50">
                                           <span className="font-bold text-slate-400 text-base">{l.qtyRequested}</span>
                                      </td>
                                      <td className="p-2.5 text-center bg-indigo-50/20">
                                          <div className="flex flex-col items-center">
                                            <span className="font-black text-lg text-indigo-700">{effectiveQty}</span>
                                            {isReplaced && effectiveQty !== qtyReq && (
                                              <span className="text-[9px] font-bold text-slate-400 line-through">({qtyReq})</span>
                                            )}
                                          </div>
                                      </td>
                                      <td className="p-2.5 text-center border-l border-slate-50">
                                          <span className="font-black text-lg text-slate-800">{isORDERED || isDELIVERING || isCOMPLETED ? l.qtyReceived : '-'}</span>
                                      </td>
                                      <td className="p-2.5 w-36">
                                          <div className="flex flex-col gap-1">
                                             <div className="flex justify-between items-center mb-0.5">
                                                <span className={`text-[9px] font-black leading-none ${progress === 100 ? 'text-emerald-500' : 'text-slate-400'}`}>{progress}%</span>
                                             </div>
                                             <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                <div className={`h-full transition-all duration-700 ease-out rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                                             </div>
                                          </div>
                                      </td>
                                      <td className="p-2.5 text-right bg-emerald-50/20">
                                          <p className="font-black text-sm text-emerald-700">{Number(effectivePrice).toLocaleString('vi-VN')} <span className="text-[9px]">đ</span></p>
                                          <div className="mt-0.5 flex items-center justify-end gap-1">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Thành tiền:</span>
                                            <span className="text-[11px] font-black text-emerald-800">{Number(effectiveAmount).toLocaleString('vi-VN')} đ</span>
                                          </div>
                                      </td>
                                      <td className="p-5 text-center">
                                          {isBackorderPO && (isDRAFT || isPENDING) && (
                                            <button 
                                              onClick={() => {
                                                setActiveReplaceLine(l);
                                                setReplacementQty(l.qtyOrdered || l.qtyApproved || l.qtyRequested);
                                                setShowReplaceModal(true);
                                              }}
                                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                              title="Thay thế vật tư"
                                            >
                                              <RotateCcw className="w-4 h-4"/>
                                            </button>
                                          )}
                                      </td>
                                    </tr>

                                    {/* Replacement Comparison Row */}
                                    {isReplaced && (
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                      <td className="p-0"></td>
                                      <td colSpan={10} className="p-3">
                                        <div className="bg-white border-l-4 border-indigo-400 rounded-r-xl p-3 shadow-sm flex flex-col gap-2">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <div className="bg-slate-100 p-2 rounded-lg">
                                                <RotateCcw className="w-4 h-4 text-slate-400"/>
                                              </div>
                                              <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thay thế cho vật tư gốc</p>
                                                <div className="flex items-center gap-2">
                                                  {origItem ? (
                                                    <GoodsNameWithPreview 
                                                      itemId={origItem.id}
                                                      itemCode={origItem.mvpp}
                                                      itemName={origItem.name}
                                                      imageUrl={origItem.imageUrl}
                                                      thumbnailUrl={origItem.thumbnailUrl}
                                                      categoryName={origItem.category}
                                                      unit={origItem.unit}
                                                    />
                                                  ) : (
                                                    <span className="text-[13px] font-bold text-slate-600">N/A</span>
                                                  )}
                                                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black">{origItem?.mvpp}</span>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="text-right">
                                               <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSavings ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                  {isSavings ? 'Tiết kiệm' : 'Chênh lệch'}
                                               </p>
                                               <span className={`text-[14px] font-black ${isExpensive ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                  {isExpensive ? '+' : ''}{Math.abs(diff).toLocaleString('vi-VN')} đ
                                               </span>
                                            </div>
                                          </div>
                                          
                                          <div className="grid grid-cols-6 gap-4 mt-1 border-t border-slate-100 pt-2">
                                            <div>
                                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Giá gốc</p>
                                              <p className="text-[12px] font-bold text-slate-500 line-through decoration-slate-300">{origPrice.toLocaleString('vi-VN')} đ</p>
                                            </div>
                                            <div>
                                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tổng tiền cũ</p>
                                              <p className="text-[12px] font-bold text-slate-500 line-through decoration-slate-300">{origTotal.toLocaleString('vi-VN')} đ</p>
                                            </div>
                                            <div>
                                              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Giá mới</p>
                                              <p className="text-[12px] font-bold text-emerald-600">{effectivePrice.toLocaleString('vi-VN')} đ</p>
                                            </div>
                                            <div>
                                              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Tổng tiền mới</p>
                                              <p className="text-[12px] font-bold text-emerald-600">{effectiveAmount.toLocaleString('vi-VN')} đ</p>
                                            </div>
                                            <div className="col-span-2">
                                              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Lý do thay thế</p>
                                              <p className="text-[11px] font-medium text-slate-600 italic">"{l.requestLine?.replacementReason || 'Không có lý do'}"</p>
                                               {isAdmin && isPending && (
                                                 <div className="mt-3 flex gap-2 justify-end border-t border-slate-100 pt-3">
                                                    <button 
                                                      onClick={() => handleAdminReplacementAction(l.requestLineId, 'REJECT')}
                                                      className="px-4 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition"
                                                    >
                                                      Từ chối
                                                    </button>
                                                    <button 
                                                      onClick={() => handleAdminReplacementAction(l.requestLineId, 'APPROVE')}
                                                      className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20"
                                                    >
                                                      Duyệt thay thế
                                                    </button>
                                                 </div>
                                               )}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                    )}
                                  </React.Fragment>
                                  )})}
                          </tbody>
                          <tfoot className="bg-[#f7f8ff] border-t border-[#e5e7f0]">
                              <tr>
                                  <td colSpan={10} className="p-[12px_16px] text-right">
                                    <div className="flex items-center justify-end gap-4">
                                       <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-[0.04em]">GIÁ TRỊ TẠM TÍNH TRƯỚC THUẾ/CK:</span>
                                       <span className="text-sm font-black text-[#4f46e5] min-w-[140px]">{Number(totalAmount).toLocaleString('vi-VN')} <span className="text-[10px]">đ</span></span>
                                    </div>
                                  </td>
                              </tr>
                          </tfoot>
                      </table>
                  </div>
              </div>
              )}

              {/* TAB CONTENT: Reconciliation */}
              {activeTab === 'reconciliation' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-x-auto mb-6">
                  <div className="mb-4 flex items-center justify-between">
                     <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-4 h-4 text-indigo-500"/> Đối Chiếu Dòng Hàng Chuỗi Phiếu</h3>
                  </div>
                  <table className="w-full text-left whitespace-nowrap min-w-full border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-[9px] uppercase font-black text-slate-400 tracking-wider">
                        <th className="px-3 py-3">Hàng hóa</th>
                        <th className="px-3 py-3 text-center">Đề xuất</th>
                        <th className="px-3 py-3 text-center">Duyệt</th>
                        <th className="px-3 py-3 text-center">PO</th>
                        <th className="px-3 py-3 text-center">Nhập đúng</th>
                        <th className="px-3 py-3 text-center">Nhập thay thế</th>
                        <th className="px-3 py-3 text-center">Thiếu</th>
                        <th className="px-3 py-3 text-center">Còn lại</th>
                        <th className="px-3 py-3 text-right">Giá PO</th>
                        <th className="px-3 py-3 text-right">Giá thực tế</th>
                        <th className="px-3 py-3">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {chainData?.lines?.map((line: any) => {
                        const isReplacement = line.isReplacement;
                        
                        return (
                          <tr key={line.id} className={`hover:bg-slate-50/50 ${isReplacement ? 'bg-amber-50/20' : ''}`}>
                            <td className="px-3 py-3 font-semibold text-slate-800">
                              {isReplacement ? (
                                <div className="pl-4 flex items-center gap-1.5">
                                  <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-black uppercase">Hàng thay thế</span>
                                  <span>{line.actualItemName}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">({line.actualItemCode})</span>
                                </div>
                              ) : (
                                <div>
                                  <span>{line.itemName}</span>
                                  <span className="block text-[10px] text-slate-450 font-normal">{line.itemCode}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center font-medium text-slate-500">{isReplacement ? '-' : line.requestedQty}</td>
                            <td className="px-3 py-3 text-center font-bold text-slate-600">{isReplacement ? '-' : line.approvedQty}</td>
                            <td className="px-3 py-3 text-center font-bold text-indigo-650">{isReplacement ? '-' : line.orderedQty}</td>
                            <td className="px-3 py-3 text-center font-bold text-emerald-600">{line.receivedOriginalQty || '-'}</td>
                            <td className="px-3 py-3 text-center font-bold text-teal-650">{line.receivedReplacementQty || '-'}</td>
                            <td className="px-3 py-3 text-center font-bold text-rose-500">{line.shortageQty || '-'}</td>
                            <td className="px-3 py-3 text-center font-bold text-slate-600">{line.remainingQty || '-'}</td>
                            <td className="px-3 py-3 text-right font-medium text-slate-650">
                              {line.poUnitPrice ? `${Number(line.poUnitPrice).toLocaleString('vi-VN')} đ` : '-'}
                            </td>
                            <td className="px-3 py-3 text-right font-black text-emerald-600">
                              {line.actualReceiptUnitPrice ? `${Number(line.actualReceiptUnitPrice).toLocaleString('vi-VN')} đ` : '-'}
                            </td>
                            <td className="px-3 py-3 text-slate-500 max-w-[200px] truncate" title={line.note}>{line.note || '-'}</td>
                          </tr>
                        );
                      })}
                      {(!chainData || chainData.lines?.length === 0) && (
                        <tr>
                          <td colSpan={11} className="py-10 text-center text-slate-400 italic font-medium">Chưa có dữ liệu đối chiếu chuỗi phiếu.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB CONTENT: History */}
              {activeTab === 'history' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                  <div className="mb-4">
                     <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-500"/> Lịch Sử Xử Lý (Audit Trail)</h3>
                  </div>
                  <div className="relative pl-6 border-l-2 border-slate-100 space-y-6">
                    {data.auditLogs?.map((audit: any) => {
                      const isPositive = ['APPROVE', 'ORDERED', 'CONFIRM_DELIVERY', 'RECEIVE'].includes(audit.action);
                      const isNegative = ['REJECT', 'CANCEL'].includes(audit.action);
                      
                      return (
                        <div key={audit.id} className="relative group">
                          <div className={`absolute -left-[32px] top-1 w-4 h-4 rounded-full bg-white border-2 shadow-sm z-10 transition-all group-hover:scale-125 ${isPositive ? 'border-emerald-500' : isNegative ? 'border-rose-500' : 'border-indigo-500'}`}></div>
                          <div className="flex justify-between items-start">
                            <h4 className={`text-xs font-black uppercase tracking-tight ${isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-slate-800'}`}>
                              {formatAuditAction(audit.action)}
                            </h4>
                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">{new Date(audit.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1">
                            <UserIcon className="w-3 h-3"/> {audit.user?.fullName || 'Hệ thống'} • {new Date(audit.createdAt).toLocaleTimeString('vi-VN')}
                          </p>
                          {audit.newValues?.reason && (
                            <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-medium text-slate-700 leading-normal italic relative group-hover:bg-indigo-50/30 group-hover:border-indigo-100 transition-all max-w-2xl">
                              "{audit.newValues.reason}"
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {(!data.auditLogs || data.auditLogs.length === 0) && (
                      <div className="text-center py-6 text-slate-400 font-medium">Chưa có lịch sử xử lý nào.</div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: Links */}
              {activeTab === 'links' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                  <div className="mb-4">
                     <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest flex items-center gap-1.5"><ShoppingCart className="w-4 h-4 text-indigo-500"/> Liên Kết Chứng Từ Trong Chuỗi</h3>
                  </div>
                  {chainData ? (
                    <DocumentChainMap chainData={chainData} currentDocType="po" currentDocId={poId} />
                  ) : (
                    <div className="text-center py-10 text-slate-400 font-medium">Đang tải dữ liệu liên kết...</div>
                  )}
                </div>
              )}

               {/* Attachments Section */}
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Paperclip className="w-3.5 h-3.5 mr-1.5 text-indigo-500"/> Chứng Từ Đính Kèm</h3>
                    <button className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded hover:bg-indigo-100 transition">Thêm</button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                     {data.attachments && data.attachments.length > 0 ? (
                       data.attachments.map((file: any) => (
                         <div key={file.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2 group border-dashed hover:border-indigo-400 hover:bg-white transition-all">
                            <div className="flex justify-between items-start">
                               <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-indigo-500"><FileText className="w-4 h-4"/></div>
                               <button className="p-1 text-slate-300 hover:text-rose-500 transition opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3"/></button>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-slate-700 truncate" title={file.fileName}>{file.fileName}</p>
                               <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{(file.fileSize / 1024).toFixed(0)} KB</p>
                            </div>
                            <a href={file.fileUrl} target="_blank" rel="noreferrer" className="w-full mt-1 py-1.5 bg-white text-indigo-600 text-[9px] font-black uppercase text-center rounded-lg border border-slate-200 hover:bg-indigo-600 hover:text-white transition flex items-center justify-center gap-1.5">
                               <Download className="w-2.5 h-2.5"/> Download
                            </a>
                         </div>
                       ))
                     ) : (
                        <div className="col-span-full py-6 flex flex-col items-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                           <Paperclip className="w-8 h-8 text-slate-200 mb-1"/>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Bấm Thêm để đính kèm chứng từ</p>
                        </div>
                     )}
                  </div>
               </div>
          </div>

          {/* RIGHT SIDEBAR: ADMIN ACTION CENTER */}
          <div className="w-full xl:w-[320px] flex flex-col gap-4 shrink-0 print:hidden sticky top-6 h-fit">
              <div className="bg-white rounded-2xl shadow-xl shadow-indigo-200/20 p-4 border border-slate-200 relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-[60px] opacity-30 transform translate-x-1/2 -translate-y-1/2"></div>
                  
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20"><Building className="w-5 h-5"/></div>
                     <div>
                        <h3 className="text-base font-black text-slate-900 tracking-tight">Trung Tâm Lệnh</h3>
                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Quyền: {currentUser.role}</p>
                     </div>
                  </div>

                  <div className="flex flex-col gap-2.5 relative z-10">
                      
                      {/* Edit Draft */}
                      {canEdit && (
                         <button onClick={() => {
                             setApprovals(data.lines.map((l:any) => ({
                                 lineId: l.id,
                                 requestLineId: l.requestLineId,
                                 itemId: l.itemId,
                                 item: l.item,
                                 qtyRequested: l.qtyRequested,
                                 qtyApproved: l.qtyApproved || l.qtyRequested,
                                 unitPrice: l.unitPrice,
                                 supplier: l.supplier || '',
                                 location: l.location || '',
                                 gender: l.gender || '',
                                 status: l.status || 'PENDING',
                                 selected: true,
                                 isDeleted: false,
                                 isNew: false
                             })));
                             setShowApproveModal(true);
                         }} className="w-full py-2.5 bg-white text-indigo-600 rounded-xl font-black hover:bg-indigo-50 transition border border-indigo-100 flex items-center justify-center gap-1.5 uppercase tracking-widest text-[10px]">
                            <FileText className="w-3.5 h-3.5"/> Chỉnh Sửa
                         </button>
                      )}

                      {/* Submit PR */}
                      {canSubmit && (
                        <div className="group">
                           <button onClick={() => handleAction('/submit', {}, 'Đã trình duyệt thành công!')} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/30 flex flex-col items-center gap-0.5 group-active:scale-95 transform">
                              <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider"><Send className="w-4 h-4"/> Gửi Trình Duyệt</span>
                              <span className="text-[8px] font-bold text-indigo-200 opacity-60 uppercase">Chuyển PR thành Chờ Duyệt</span>
                           </button>
                        </div>
                      )}

                      {/* Approve PR */}
                      {canApprove && (
                          <div className="space-y-2">
                              <button onClick={() => {
                                  setApprovals(data.lines.map((l:any) => ({
                                      lineId: l.id,
                                      requestLineId: l.requestLineId,
                                      itemId: l.itemId,
                                      item: l.item,
                                      qtyRequested: l.qtyRequested,
                                      qtyApproved: l.qtyApproved || l.qtyRequested,
                                      unitPrice: l.unitPrice,
                                      supplier: l.supplier || '',
                                      location: l.location || '',
                                      gender: l.gender || '',
                                      status: l.status || 'PENDING',
                                      selected: l.status === 'PENDING' || !l.status,
                                      isDeleted: false,
                                      isNew: false
                                  })));
                                  setShowApproveModal(true);
                              }} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-black hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/30 flex flex-col items-center gap-0.5 group-active:scale-95 transform">
                                 <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider"><CheckSquare className="w-4 h-4"/> Duyệt & Chốt KL</span>
                                 <span className="text-[8px] font-bold text-emerald-100 opacity-60 uppercase tracking-widest">Xác nhận Số Lượng & Giá cuối</span>
                              </button>
                              <button onClick={() => { if(window.confirm('Trả lại Đề nghị để chỉnh sửa?')) handleAction('/reject-to-draft', {reason: 'Yêu cầu chỉnh sửa lại'}, 'Đã trả lại') }} className="w-full py-2 bg-amber-50 text-amber-600 rounded-xl font-black hover:bg-amber-500 hover:text-white transition uppercase tracking-widest text-[9px] border border-amber-100 border-dashed">
                                 Trả Lại Chỉnh Sửa
                              </button>
                              <button onClick={() => { if(window.confirm('Từ chối Đề nghị?')) handleAction('/reject', {reason: 'Không hợp lệ'}, 'Đã từ chối') }} className="w-full py-2.5 bg-rose-50 text-rose-600 rounded-xl font-black hover:bg-rose-500 hover:text-white transition uppercase tracking-widest text-[10px] border border-rose-100 border-dashed">
                                 Từ Chối
                              </button>
                          </div>
                      )}

                      {/* Issue PO */}
                      {canOrder && (
                          <button onClick={() => setShowOrderModal(true)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 flex flex-col items-center gap-0.5 group-active:scale-95 transform border-b-2 border-blue-800">
                             <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider"><ShoppingCart className="w-4 h-4"/> Phát Hành PO</span>
                             <span className="text-[8px] font-bold text-blue-100 opacity-60 uppercase tracking-widest">Chốt NCC & Xuất File</span>
                          </button>
                      )}

                      {/* Deliver Confirm */}
                      {canConfirmDelivery && (
                          <button onClick={() => setShowDeliveryModal(true)} className="w-full py-3 bg-[#7c3aed] text-white rounded-xl font-black hover:bg-[#6d28d9] transition shadow-lg shadow-purple-500/30 flex flex-col items-center gap-0.5 group-active:scale-95 transform">
                             <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider"><Truck className="w-4 h-4"/> Xác Nhận Giao</span>
                             <span className="text-[8px] font-bold text-purple-100 opacity-60 uppercase tracking-widest">Khởi tạo GRN</span>
                          </button>
                      )}

                      {/* PRINT OPTIONS GROUP */}
                      <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-700">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 text-center">Tùy chọn in mua sắm</p>
                          
                          {(() => {
                            const hasPendingReplacement = data.lines.some((l: any) => l.requestLine?.status === 'REPLACEMENT_PENDING_ADMIN');
                            return (
                              <div className="space-y-2">
                                <button 
                                  onClick={() => printDocument('VPP')} 
                                  disabled={hasPendingReplacement}
                                  className={`w-full py-3 flex items-center justify-center rounded-xl font-black transition shadow-sm border ${hasPendingReplacement ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-white text-indigo-600 hover:bg-indigo-50 border-indigo-100 hover:border-indigo-200'}`}
                                >
                                  <Printer className="w-4 h-4 mr-2"/> In Mua Sắm VPP
                                </button>
                                
                                <button 
                                  onClick={() => printDocument('VE_SINH')} 
                                  disabled={hasPendingReplacement}
                                  className={`w-full py-3 flex items-center justify-center rounded-xl font-black transition shadow-sm border ${hasPendingReplacement ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-white text-cyan-600 hover:bg-cyan-50 border-cyan-100 hover:border-cyan-200'}`}
                                >
                                  <Printer className="w-4 h-4 mr-2"/> In Mua Sắm Vệ Sinh
                                </button>

                                <button 
                                  onClick={() => printDocument('ALL')} 
                                  disabled={hasPendingReplacement}
                                  className={`w-full py-3.5 flex items-center justify-center rounded-xl font-black transition shadow-lg border ${hasPendingReplacement ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-slate-800 text-white hover:bg-slate-900 border-slate-900'}`}
                                >
                                  <Printer className="w-5 h-5 mr-2 text-indigo-400"/> IN CẢ PHIẾU (A4 FULL)
                                </button>
                              </div>
                            );
                          })()}
                      </div>

                      {/* Cancel PO */}
                      {canCancel && (
                        <div className="mt-2 pt-4 border-t border-slate-100">
                           <button onClick={() => setShowCancelModal(true)} className="w-full py-2.5 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl font-black transition border border-dashed border-slate-100 hover:border-rose-200 uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5">
                             <XCircle className="w-3.5 h-3.5"/> Hủy Đơn
                           </button>
                        </div>
                      )}

                      {/* Placeholder for no actions */}
                      {!canSubmit && !canApprove && !canOrder && !canConfirmDelivery && !canCancel && !canEdit && (
                        <div className="py-6 flex flex-col items-center justify-center opacity-40">
                           <AlertTriangle className="w-8 h-8 text-slate-300 mb-2"/>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center leading-tight">Không có <br/> Thao tác</p>
                        </div>
                      )}
                  </div>
              </div>

              {/* Quick Summary Card */}
              <div className="bg-indigo-900 rounded-2xl p-4 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/40">
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-[50px]"></div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 mb-4 flex items-center gap-1.5">
                     <Coins className="w-3.5 h-3.5"/> Diễn Giải Tài Chính
                  </h4>
                  <div className="space-y-3">
                      <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10 group hover:bg-white/10 transition-colors">
                        <span className="text-[11px] font-bold text-indigo-200">Tạm tính:</span>
                        <span className="text-[13px] font-black tracking-tight">{Number(totalAmount).toLocaleString('vi-VN')} <span className="text-[9px]">₫</span></span>
                     </div>
                     <div className="flex justify-between items-center text-[11px] px-2">
                        <span className="font-bold text-indigo-400 text-[9px] uppercase tracking-widest">VAT ({data.vat}%)</span>
                        <span className="font-black">+{Number(vatAmount).toLocaleString('vi-VN')} <span className="text-[9px]">₫</span></span>
                     </div>
                     <div className="flex justify-between items-center text-[11px] px-2">
                        <span className="font-bold text-rose-400 text-[9px] uppercase tracking-widest">Chiết khấu</span>
                        <span className="font-black">-{Number(discountAmount).toLocaleString('vi-VN')} <span className="text-[9px]">₫</span></span>
                     </div>
                     <div className="pt-3 mt-3 border-t border-white/10 flex justify-between items-start">
                        <span className="text-[11px] font-black uppercase tracking-widest pt-1">Quyết Toán</span>
                        <div className="text-right">
                           <p className="text-xl font-black text-white leading-none mb-0.5">{Number(finalTotal + (Number(data.shippingFee) || 0)).toLocaleString('vi-VN')} <span className="text-sm font-normal">₫</span></p>
                           <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest italic leading-none">Bao gồm thuế phí</p>
                        </div>
                     </div>

                     {/* Budget Progress */}
                     <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex justify-between items-center mb-1.5">
                           <span className="text-[8px] font-black text-indigo-400 uppercase">Hạn mức tháng</span>
                           <span className="text-[9px] font-black text-white">72%</span>
                        </div>
                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-400 w-[72%] rounded-full"></div>
                        </div>
                        <p className="text-[8px] text-indigo-400 mt-1.5 text-center font-bold italic">Còn lại: ~ 12,500,000 ₫</p>
                     </div>
                  </div>
              </div>
          </div>
      </div>

      {/* MODAL CHỈNH SỬA / PHÊ DUYỆT */}
      {showApproveModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh] animate-slide-up">
                  {/* MODAL HEADER - STICKY */}
                  <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white shrink-0">
                      <div className="flex items-center gap-4">
                         <div className={`w-12 h-12 ${canEdit ? 'bg-indigo-500' : 'bg-emerald-500'} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                            {canEdit ? <FileText className="w-7 h-7"/> : <CheckSquare className="w-7 h-7"/>}
                         </div>
                         <div>
                            <h4 className="text-xl font-black tracking-tight leading-none mb-1">{canEdit ? 'Chỉnh Sửa Đề Nghị' : 'Xác Nhận Phê Duyệt'}</h4>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{canEdit ? 'Cập nhật nội dung bản nháp' : 'Chốt Khối Lượng và Đơn Giá Cuối'}</p>
                         </div>
                      </div>
                      <button onClick={()=>setShowApproveModal(false)} className="text-slate-400 hover:text-white transition"><XCircle className="w-8 h-8"/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
                      {/* SEARCH & INFO BLOCK */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
                              <div className="flex justify-between items-center">
                                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                      <Search className="w-3 h-3"/> Tìm thêm mặt hàng mới
                                  </h5>
                              </div>
                              <div className="relative">
                                  <input 
                                      type="text" 
                                      placeholder="Gõ tên vật tư hoặc MVPP để thêm..." 
                                      className="w-full bg-slate-50 border border-slate-100 px-5 py-3.5 rounded-2xl outline-none focus:bg-white focus:border-indigo-400 transition font-bold text-slate-700 shadow-inner"
                                      value={searchTerm}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                  />
                                  {searchTerm && (
                                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                          {items.filter((i: any) => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.mvpp.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5).map((item: any) => (
                                              <div 
                                                  key={item.id} 
                                                  onClick={() => addApprovalLine(item)}
                                                  className="p-4 hover:bg-indigo-50 cursor-pointer flex justify-between items-center transition group border-b border-slate-50 last:border-0"
                                              >
                                                  <div>
                                                      <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                                                      <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{item.mvpp} • {item.category}</p>
                                                  </div>
                                                  <Plus className="w-5 h-5 text-indigo-400 opacity-0 group-hover:opacity-100 transition"/>
                                              </div>
                                          ))}
                                          {items.filter((i: any) => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.mvpp.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                              <div className="p-6 text-center text-slate-400 font-bold text-xs italic">Không tìm thấy mặt hàng phù hợp.</div>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>
                          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
                              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                              <h5 className="text-[9px] font-black text-indigo-100 uppercase tracking-widest mb-2 flex items-center gap-2"><Info className="w-3 h-3"/> Tóm tắt điều chỉnh</h5>
                              <div className="space-y-3 relative z-10">
                                  <div className="flex justify-between items-center">
                                      <span className="text-xs font-bold text-indigo-100">Số khoản đang chọn:</span>
                                      <span className="text-sm font-black">{approvals.filter((a: any) => !a.isDeleted).length} dòng</span>
                                  </div>
                                  <div className="flex justify-between items-center border-t border-white/10 pt-2">
                                      <span className="text-xs font-bold text-indigo-100">Tổng giá trị tạm tính:</span>
                                      <span className="text-lg font-black">
                                          {Number(approvals.reduce((sum: number, a: any) => sum + (a.isDeleted ? 0 : (a.qtyApproved || a.qtyRequested || 0) * (a.unitPrice || 0)), 0)).toLocaleString('vi-VN')} <span className="text-[10px]">₫</span>
                                      </span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* TABLE SECTION - WITH STICKY HEADER */}
                      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                          <div className="overflow-x-auto">
                              <table className="w-full text-left whitespace-nowrap min-w-max">
                                  <thead className="bg-slate-50/80 sticky top-0 z-10">
                                     <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100">
                                        {!canEdit && (
                                            <th className="p-5 w-12 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    checked={approvals.filter(a => !a.isDeleted && a.status === 'PENDING').length > 0 && approvals.filter(a => !a.isDeleted && a.status === 'PENDING').every(a => a.selected)}
                                                    onChange={(e) => {
                                                        const isChecked = e.target.checked;
                                                        setApprovals(approvals.map(a => (a.status === 'PENDING' && !a.isDeleted) ? { ...a, selected: isChecked } : a));
                                                    }}
                                                />
                                            </th>
                                        )}
                                        <th className="p-5 w-12 text-center">STT</th>
                                        <th className="p-5">Mặt Hàng</th>
                                        <th className="p-5 w-24 text-center">Gốc</th>
                                        <th className={`p-5 ${canEdit ? 'bg-indigo-50/30' : 'bg-emerald-50/30'} w-32 text-center border-x border-slate-100`}>Duyệt</th>
                                        <th className={`p-5 ${canEdit ? 'bg-indigo-50/30' : 'bg-emerald-50/30'} w-44 text-right`}>Đơn Giá (₫)</th>
                                        <th className={`p-5 ${canEdit ? 'bg-indigo-50/30' : 'bg-emerald-50/30'} w-44 text-right border-l border-slate-100`}>Thành tiền</th>
                                        <th className={`p-5 ${canEdit ? 'bg-indigo-50/30' : 'bg-emerald-50/30'} w-48 text-center border-l border-slate-100`}>Đối tượng / NCC</th>
                                        <th className="p-5 w-12"></th>
                                     </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {approvals.map((a:any, idx: number) => {
                                          const lineTotal = (a.qtyApproved || a.qtyRequested || 0) * (a.unitPrice || 0);
                                          
                                          return (
                                          <tr key={a.lineId} className={`transition-all ${a.isDeleted ? 'bg-slate-100 opacity-50 grayscale italic' : 'hover:bg-slate-50/50'} ${!a.selected && a.status === 'PENDING' && !canEdit ? 'opacity-60' : ''}`}>
                                              {!canEdit && (
                                                <td className="p-5 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        disabled={a.isDeleted || a.status !== 'PENDING'}
                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30"
                                                        checked={a.selected || a.status !== 'PENDING'}
                                                        onChange={(e) => setApprovals(approvals.map(x => x.lineId === a.lineId ? { ...x, selected: e.target.checked } : x))}
                                                    />
                                                </td>
                                              )}
                                              <td className="p-5 text-center font-bold text-slate-400 text-xs">{idx + 1}</td>
                                              <td className="p-5">
                                                   {a.item ? (
                                                     <GoodsNameWithPreview 
                                                       itemId={a.item.id}
                                                       itemCode={a.item.mvpp}
                                                       itemName={a.item.name}
                                                       imageUrl={a.item.imageUrl}
                                                       thumbnailUrl={a.item.thumbnailUrl}
                                                       categoryName={a.item.category}
                                                       unit={a.item.unit}
                                                     />
                                                   ) : (
                                                     <p className="font-bold text-slate-800 text-sm whitespace-normal leading-tight">N/A</p>
                                                   )}
                                                  <div className="flex items-center gap-2 mt-1">
                                                      <span className="text-[9px] font-black bg-slate-100 px-1 py-0.5 rounded text-slate-500">{a.item?.mvpp}</span>
                                                      <span className={`text-[9px] font-black px-1 py-0.5 rounded ${a.item?.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>Tồn: {a.item?.stock || 0}</span>
                                                      {a.isNew && <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded">NEW</span>}
                                                      {a.status && a.status !== 'PENDING' && (
                                                         <span className={`text-[9px] font-black px-1 py-0.5 rounded ${a.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                            {a.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
                                                         </span>
                                                      )}
                                                  </div>
                                              </td>
                                              <td className="p-5 text-center font-black text-slate-400 text-lg bg-slate-50/30">{a.qtyRequested}</td>
                                              <td className={`p-5 border-x border-slate-100 bg-white`}>
                                                  <input 
                                                      type="number" min="0" 
                                                      disabled={a.isDeleted || (a.status !== 'PENDING' && !canEdit)}
                                                      value={a.qtyApproved || ''} 
                                                      onChange={(e) => {
                                                          const val = parseInt(e.target.value) || 0;
                                                          setApprovals(approvals.map((x:any) => x.lineId === a.lineId ? {...x, qtyRequested: val, qtyApproved: val} : x));
                                                      }}
                                                      className={`w-full text-center py-2 bg-slate-50 border-2 border-slate-100 outline-none rounded-xl focus:bg-white font-black text-lg transition shadow-inner ${canEdit ? 'focus:border-indigo-400 text-indigo-700' : 'focus:border-emerald-400 text-emerald-700'}`}
                                                  />
                                              </td>
                                              <td className="p-5 bg-white relative group/price">
                                                  <input 
                                                      type="number" min="0" 
                                                      disabled={a.isDeleted || (a.status !== 'PENDING' && !canEdit)}
                                                      value={a.unitPrice || ''} 
                                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApprovals(approvals.map((x:any) => x.lineId === a.lineId ? {...x, unitPrice: parseInt(e.target.value)||0} : x))}
                                                      className={`w-full pr-3 pl-3 text-right py-2 bg-slate-50 border-2 border-slate-100 outline-none rounded-xl focus:bg-white font-bold transition text-slate-700 shadow-inner ${canEdit ? 'focus:border-indigo-400' : 'focus:border-emerald-400'}`}
                                                  />
                                                  {a.item?.price && Math.abs(((a.unitPrice - a.item.price) / a.item.price) * 100) > 10 && (
                                                      <div className="absolute -top-1 right-2 flex items-center gap-1 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">
                                                          <AlertTriangle className="w-2 h-2"/>
                                                          {((a.unitPrice - a.item.price) / a.item.price * 100).toFixed(0)}%
                                                      </div>
                                                  )}
                                              </td>
                                              <td className="p-5 text-right font-black text-slate-700 border-l border-slate-100">
                                                  {lineTotal.toLocaleString()}
                                              </td>
                                              <td className="p-5 border-l border-slate-100 bg-white">
                                                  <div className="flex flex-col gap-1.5 min-w-[140px]">
                                                      <select 
                                                          disabled={a.isDeleted || (a.status !== 'PENDING' && !canEdit)}
                                                          value={a.gender || ''} 
                                                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setApprovals(approvals.map((x:any) => x.lineId === a.lineId ? {...x, gender: e.target.value} : x))}
                                                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-100 outline-none rounded-lg focus:bg-white font-bold text-[9px] transition"
                                                      >
                                                          <option value="">-- Đối tượng --</option>
                                                          <option value="Dùng chung">Dùng chung</option>
                                                          <option value="Nam">Nam</option>
                                                          <option value="Nữ">Nữ</option>
                                                      </select>
                                                      <input 
                                                          type="text" placeholder="NCC..." 
                                                          disabled={a.isDeleted || (a.status !== 'PENDING' && !canEdit)}
                                                          value={a.supplier || ''} 
                                                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApprovals(approvals.map((x:any) => x.lineId === a.lineId ? {...x, supplier: e.target.value} : x))}
                                                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-100 outline-none rounded-lg focus:bg-white font-bold text-[10px] transition placeholder:text-slate-300"
                                                      />
                                                  </div>
                                              </td>
                                              <td className="p-5 text-center">
                                                   {(canEdit || a.status === 'PENDING') && (
                                                      <button 
                                                          onClick={() => toggleDeleteLine(a.lineId)}
                                                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${a.isDeleted ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600'}`}
                                                      >
                                                          {a.isDeleted ? <ArrowLeft className="w-4 h-4 rotate-180"/> : <Trash2 className="w-4 h-4"/>}
                                                      </button>
                                                   )}
                                              </td>
                                          </tr>
                                   )})}
                                      {approvals.length === 0 && (
                                          <tr>
                                              <td colSpan={8} className="p-20 text-center text-slate-400 italic font-bold">Danh sách đang trống. Vui lòng thêm mặt hàng.</td>
                                          </tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>

                  {/* MODAL FOOTER - STICKY */}
                  <div className="p-6 md:p-8 bg-white border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                      <div className="flex gap-6 items-center">
                          <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dự toán tổng cộng</p>
                              <p className="text-2xl font-black text-indigo-600 leading-none">
                                  {Number(approvals.reduce((sum, a) => sum + (a.isDeleted ? 0 : (a.qtyApproved || a.qtyRequested || 0) * (a.unitPrice || 0)), 0)).toLocaleString('vi-VN')} <span className="text-sm">₫</span>
                              </p>
                          </div>
                      </div>
                      
                      <div className="flex gap-4 w-full md:w-auto">
                          <button onClick={()=>setShowApproveModal(false)} className="flex-1 md:flex-none px-8 py-3.5 font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition uppercase tracking-widest text-xs">Hủy Bỏ</button>
                          <button 
                              onClick={async () => {
                                 const activeLines = approvals.filter(a => !a.isDeleted);
                                 const selectedLines = approvals.filter(a => !a.isDeleted && a.selected && a.status === 'PENDING');
                                  
                                  if (!canEdit && selectedLines.length === 0) {
                                      showToast('Vui lòng chọn ít nhất 1 mặt hàng để phê duyệt', 'warning');
                                      return;
                                  }

                                  if (canEdit && activeLines.length === 0) {
                                      showToast('Cần ít nhất 1 mặt hàng trong danh sách', 'warning');
                                      return;
                                  }

                                  const finalLines = (canEdit ? activeLines : selectedLines).map(a => ({
                                      lineId: a.lineId,
                                      requestLineId: a.requestLineId,
                                      itemId: a.itemId,
                                      qtyRequested: a.qtyRequested,
                                      qtyApproved: a.qtyApproved,
                                      unitPrice: a.unitPrice,
                                      supplier: a.supplier,
                                      location: a.location,
                                      gender: a.gender
                                  }));

                                 if (canEdit) {
                                     try {
                                         await api.put(`/purchases/${poId}`, {
                                             title: data.title,
                                             purpose: data.purpose,
                                             expectedDate: data.expectedDate,
                                             lines: finalLines
                                         });
                                         showToast('Đã cập nhật đề nghị!', 'success');
                                         await refreshData();
                                         setShowApproveModal(false);
                                     } catch(err: any) {
                                         showToast(err.response?.data?.error || 'Cập nhật thất bại', 'error');
                                     }
                                 } else {
                                     handleAction('/approve', { lines: finalLines }, 'Đã Phê Duyệt Đề Nghị Mua thành công!');
                                 }
                              }} 
                              className={`flex-1 md:flex-none px-12 py-3.5 ${canEdit ? 'bg-indigo-600 shadow-indigo-600/40' : 'bg-emerald-500 shadow-emerald-500/40'} text-white font-black tracking-widest uppercase text-sm rounded-2xl hover:opacity-90 transition shadow-xl disabled:opacity-50`}
                          >
                             {canEdit ? 'Lưu Thay Đổi' : 'Ghi Nhận & Phê Duyệt'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL PHÁT HÀNH PO */}
      {showOrderModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-slide-up flex flex-col">
                  <div className="p-8 border-b border-slate-100 bg-blue-600 text-white">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white"><ShoppingCart className="w-7 h-7"/></div>
                        <div>
                           <h4 className="text-xl font-black tracking-tight mb-1 leading-none">Phát Hành Đơn (PO)</h4>
                           <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Thiết Lập Tài Chính Cuối Cùng</p>
                        </div>
                     </div>
                  </div>
                  <div className="p-8 space-y-6 bg-slate-50/50">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Nhà cung cấp tổng của đơn hành</label>
                           <input type="text" value={orderSupplier} onChange={e=>setOrderSupplier(e.target.value)} placeholder="Tên Công ty NCC..." className="w-full bg-white border-2 border-slate-100 px-5 py-4 rounded-3xl outline-none focus:border-blue-400 focus:bg-white transition font-black text-slate-800 shadow-sm"/>
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Thuế VAT (%)</label>
                           <input type="number" value={vat} onChange={e=>setVat(Number(e.target.value))} className="w-full bg-white border-2 border-slate-100 px-5 py-4 rounded-3xl outline-none focus:border-blue-400 focus:bg-white transition font-black text-center text-slate-800 shadow-sm"/>
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Chiết Khấu (Giảm tiền)</label>
                           <input type="number" value={discount} onChange={e=>setDiscount(Number(e.target.value))} className="w-full bg-white border-2 border-slate-100 px-5 py-4 rounded-3xl outline-none focus:border-blue-400 focus:bg-white transition font-black text-right text-slate-800 shadow-sm"/>
                        </div>
                        <div className="col-span-2">
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Hẹn Giao Dự Kiến</label>
                           <input type="date" value={orderExpectedDate} onChange={e=>setOrderExpectedDate(e.target.value)} className="w-full bg-white border-2 border-slate-100 px-5 py-4 rounded-3xl outline-none focus:border-blue-400 focus:bg-white transition font-black text-slate-800 shadow-sm"/>
                        </div>
                      </div>

                      <div className="p-5 bg-blue-50 rounded-[1.5rem] border border-blue-100 flex gap-4">
                         <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-500 shrink-0"><Info className="w-5 h-5"/></div>
                         <p className="text-[11px] font-bold text-blue-800 leading-relaxed uppercase">
                           Bấm xác nhận để chính thức chốt chứng từ và chuyển thành trạng thái <b>Đã Đặt Hàng (ORDERED)</b>. PO sẽ có định dạng để in.
                         </p>
                      </div>
                  </div>
                  <div className="p-8 bg-white border-t border-slate-100 flex justify-end gap-4">
                      <button onClick={()=>setShowOrderModal(false)} className="px-8 py-3.5 font-black text-slate-400 hover:text-slate-600 transition uppercase tracking-widest text-xs">Hủy</button>
                      <button onClick={() => {
                          handleAction('/place_order', { supplier: orderSupplier, expectedDate: orderExpectedDate, vat, discount }, 'Phát hành PO Thành Công!');
                      }} className="px-10 py-3.5 bg-blue-600 text-white font-black tracking-widest uppercase text-sm rounded-2xl hover:bg-blue-700 transition shadow-xl shadow-blue-500/40 flex items-center gap-2">Chốt Phát Hành PO <Send className="w-4 h-4"/></button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL HỦY PO */}
      {showCancelModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
                  <div className="p-6 bg-rose-500 text-white text-center">
                     <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-rose-200"/>
                     <h4 className="text-xl font-black uppercase tracking-tight">Hủy Đơn Hàng?</h4>
                  </div>
                  <div className="p-8">
                      <p className="text-sm font-bold text-slate-500 text-center mb-6 leading-relaxed">Hành động này sẽ dừng toàn bộ quy trình mua sắm của Phiếu hiện tại. Vui lòng nhập lý do:</p>
                      <textarea 
                        value={cancelReason} 
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCancelReason(e.target.value)} 
                        placeholder="VD: Nhà cung cấp báo hết hàng, Thay đổi quy cách hàng hóa..."
                        className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-rose-400 transition mb-6"
                      ></textarea>

                      {/* Attachment Section In Modal */}
                      <div className="mb-6">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tài liệu đính kèm (nếu có)</label>
                        <div className="space-y-3">
                           {cancelFiles.map((file: File, idx: number) => (
                             <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2 overflow-hidden">
                                   <FileText className="w-4 h-4 text-indigo-500 shrink-0"/>
                                   <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                                </div>
                                <button onClick={() => setCancelFiles((prev: File[]) => prev.filter((_, i: number) => i !== idx))} className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition">
                                   <Trash2 className="w-4 h-4"/>
                                </button>
                             </div>
                           ))}
                           
                           <label className="flex items-center justify-center gap-2 w-full py-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition text-slate-400 hover:text-indigo-600">
                              <Paperclip className="w-5 h-5"/>
                              <span className="text-xs font-bold uppercase tracking-widest">Thêm đính kèm</span>
                              <input 
                                type="file" 
                                multiple 
                                className="hidden" 
                                onChange={(e) => {
                                  if (e.target.files) {
                                    setCancelFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                  }
                                }}
                              />
                           </label>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button 
                          disabled={isUploading}
                          onClick={async () => {
                             try {
                               setIsUploading(true);
                               // 1. Upload files first if any
                               const uploadedAttachments = [];
                               for (const file of cancelFiles) {
                                  const formData = new FormData();
                                  formData.append('file', file);
                                  const res = await api.post('/attachments/upload', formData, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                  });
                                  uploadedAttachments.push(res.data);
                               }

                               // 2. Call cancel API with attachments
                               await handleAction('/cancel', { 
                                 reason: cancelReason, 
                                 attachments: uploadedAttachments 
                                }, 'Đã hủy đơn hàng thành công!');
                               
                               setCancelFiles([]);
                               setCancelReason('');
                             } catch (err: any) {
                               showToast(err.response?.data?.error || 'Lỗi khi hủy đơn hàng', 'error');
                             } finally {
                               setIsUploading(false);
                             }
                          }} 
                          className={`w-full py-4 ${isUploading ? 'bg-slate-400' : 'bg-rose-500 hover:bg-rose-600'} text-white rounded-2xl font-black uppercase tracking-widest text-sm transition shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2`}
                        >
                          {isUploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div> ĐANG XỬ LÝ...</> : 'Xác Nhận Hủy Ngay'}
                        </button>
                        <button onClick={()=>{ setShowCancelModal(false); setCancelFiles([]); }} className="w-full py-4 bg-white text-slate-400 hover:text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs transition">Bỏ Qua</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL GIAO HÀNG (DELIVERY) */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
              <div className="p-8 bg-[#7c3aed] text-white">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><Truck className="w-7 h-7"/></div>
                    <h4 className="text-xl font-black tracking-tight leading-none">Hẹn Giao Hàng</h4>
                 </div>
              </div>
              <div className="p-8 space-y-5">
                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">NGÀY GIAO HÀNG DỰ KIẾN</label>
                      <input type="date" value={orderExpectedDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderExpectedDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-3xl outline-none focus:border-purple-400 transition font-black text-slate-800"/>
                  </div>
                  
                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Kho Nhận Hàng</label>
                      <select 
                        value={selectedWarehouse} 
                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-3xl outline-none focus:border-purple-400 transition font-black text-slate-800 appearance-none"
                      >
                         <option value="MAIN">Kho Chính (MAIN)</option>
                         <option value="VE_SINH">Kho Đồ Vệ Sinh (VE_SINH)</option>
                      </select>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex gap-4 italic font-bold text-[11px] text-purple-800 leading-relaxed">
                     <div className="w-5 h-5 text-purple-400 flex-shrink-0"><Info className="w-5 h-5"/></div>
                     <p>Hệ thống sẽ tạo Phiếu Nhập Kho (GRN) tương ứng vào kho đã chọn.</p>
                  </div>
                  <div className="flex gap-3 pt-2">
                     <button onClick={()=>setShowDeliveryModal(false)} className="flex-1 py-4 font-black text-slate-400 hover:bg-slate-100 rounded-2xl transition uppercase text-xs tracking-widest">Hủy</button>
                     <button onClick={() => handleAction('/confirm_delivery', { expectedDate: orderExpectedDate, warehouseCode: selectedWarehouse }, 'Chuyển trạng thái Đang giao hàng thành công!')} className="flex-[2] py-4 bg-[#7c3aed] text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-[#6d28d9] transition shadow-lg shadow-purple-500/30">Xác Nhận Hẹn Giao</button>
                  </div>
              </div>
          </div>
        </div>
      )}

      </div> {/* END NO-PRINT WEB UI */}

      {/* FORMAL PRINT-ONLY SECTION (A4 Standard) */}
            <div className="hidden print:block print-area print-container p-4">
          {/* TOP HEADER WITH BRANDING & QR */}
          <div className="flex justify-between items-start mb-6 border-b-2 border-slate-900 pb-4">
              <div className="flex flex-col">
                  <h1 className="text-[16px] font-black text-slate-900 leading-tight">CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO</h1>
                  <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Hệ thống Quản lý Vật tư - Thiết bị</p>
                  <p className="text-[9px] font-medium text-slate-400 italic">Mã hệ thống: {data.id}</p>
              </div>
              <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-white border border-slate-200 p-1 mb-1">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${data.id}`} 
                        alt="QR Verification" 
                        className="w-full h-full"
                      />
                  </div>
                  <p className="text-[8px] font-black tracking-widest uppercase text-slate-400">SCAN TO VERIFY</p>
              </div>
          </div>

          <div className="text-center mb-8">
              <h2 className="text-[24px] font-black uppercase tracking-widest mb-1">
                  {(() => {
                    if (selectedPrintType === 'VE_SINH') return 'PHIẾU ĐỀ XUẤT VỆ SINH';
                    if (selectedPrintType === 'VPP') return 'PHIẾU ĐỀ XUẤT VĂN PHÒNG PHẨM';
                    return 'PHIẾU ĐỀ XUẤT TỔNG HỢP VĂN PHÒNG PHẨM VÀ ĐỒ VỆ SINH';
                  })()}
                </h2>
              <div className="w-32 h-1 bg-slate-900 mx-auto mb-2"></div>
              <p className="text-[11px] font-bold text-slate-600">Số phiếu: {data.id}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-3 mb-8 text-[12px]">
              <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-1">
                  <span className="font-bold min-w-[120px]">Người lập phiếu:</span>
                  <span className="flex-1">{data.requester?.fullName}</span>
              </div>
              <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-1">
                  <span className="font-bold min-w-[120px]">Kho xuất/nhập:</span>
                  <span className="flex-1 font-bold">{data.department || 'VĂN PHÒNG'}</span>
              </div>
              <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-1">
                  <span className="font-bold min-w-[120px]">Ngày lập phiếu:</span>
                  <span className="flex-1">{new Date(data.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-1">
                  <span className="font-bold min-w-[120px]">Ngày thực thi:</span>
                  <span className="flex-1">{data.expectedDate ? new Date(data.expectedDate).toLocaleDateString('vi-VN') : '---'}</span>
              </div>
              <div className="col-span-2 flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-1">
                  <span className="font-bold min-w-[120px]">Lý do / Ghi chú:</span>
                  <span className="flex-1 italic">"{data.purpose || 'Mua hàng bổ sung văn phòng'}"</span>
              </div>
          </div>

          <table className="print-table w-full mb-8 border-collapse border-2 border-slate-900">
              <thead className="bg-slate-100">
                  <tr className="text-[10px] font-black uppercase text-center border-b-2 border-slate-900">
                      <th className="p-2 border-r border-slate-900 whitespace-nowrap" style={{width: '6%'}}>STT</th>
                      <th className="p-2 border-r border-slate-900" style={{width: '10%'}}>MÃ VT</th>
                      <th className="p-2 border-r border-slate-900 text-left" style={{width: '30%'}}>TÊN VẬT TƯ / LINH KIỆN</th>
                      <th className="p-2 border-r border-slate-900" style={{width: '7%'}}>ĐVT</th>
                      <th className="p-2 border-r border-slate-900" style={{width: '6%'}}>SL</th>
                      <th className="p-2 border-r border-slate-900" style={{width: '15%'}}>ĐƠN GIÁ</th>
                      <th className="p-2 border-r border-slate-900" style={{width: '15%'}}>THÀNH TIỀN</th>
                      <th className="p-2" style={{width: '11%'}}>GHI CHÚ</th>
                  </tr>
              </thead>
               <tbody>
                  {(() => {
                    const filteredLines = data.lines.filter((l: any) => {
                        if (selectedPrintType === 'ALL') return true;
                        const type = l.item.itemType || (l.item.mvpp.startsWith('VPP') ? 'VPP' : 'VE_SINH');
                        return type === selectedPrintType;
                    });

                    return (
                      <>
                        {filteredLines.map((l: any, idx: number) => {
                            const isReplaced = !!l.requestLine?.replacementItemId;
                            const effectiveItem = isReplaced ? l.requestLine.replacementItem : l.item;
                            const qtyActual = l.qtyOrdered ?? l.qtyApproved ?? l.qtyRequested;
                            const effectiveQty = isReplaced ? Number(l.requestLine?.replacementQty || 0) : qtyActual;
                            const effectivePrice = isReplaced ? Number(l.requestLine?.replacementPrice || 0) : Number(l.unitPrice || 0);
                            const effectiveAmount = effectivePrice * effectiveQty;

                            return (
                            <tr key={l.id} className="text-[10px] border-b border-slate-300 h-10">
                                <td className="text-center p-2 border-r border-slate-400 font-bold">{idx + 1}</td>
                                <td className="text-center p-2 border-r border-slate-400 font-black">{effectiveItem?.mvpp || l.item.mvpp}</td>
                                <td className="p-2 border-r border-slate-400">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[11px] uppercase">{effectiveItem?.name || l.item.name}</span>
                                        {isReplaced && (
                                            <span className="text-[8px] text-slate-500 italic mt-0.5">
                                                (Thay cho: {l.item.name})
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="text-center p-2 border-r border-slate-400">{effectiveItem?.unit || l.item.unit}</td>
                                <td className="text-center p-2 border-r border-slate-400 font-black">{effectiveQty}</td>
                                <td className="text-right p-2 border-r border-slate-400 font-medium">{effectivePrice.toLocaleString('vi-VN')}</td>
                                <td className="text-right p-2 border-r border-slate-400 font-black bg-slate-50">{effectiveAmount.toLocaleString('vi-VN')}</td>
                                <td className="p-2 italic text-[9px]">{l.note || (l.location ? `@${l.location}` : '')} {l.gender ? `[${l.gender}]` : ''}</td>
                            </tr>
                        )})}
                        <tr className="font-black bg-slate-100 uppercase text-[12px] border-t-2 border-slate-900">
                            <td colSpan={4} className="p-3 text-right">Tổng cộng (Đã bao gồm VAT {data.vat}%):</td>
                            <td className="text-center p-3 border-x border-slate-900">{filteredLines.reduce((sum: number, l: any) => {
                                const qtyActual = l.qtyOrdered ?? l.qtyApproved ?? l.qtyRequested;
                                return sum + (!!l.requestLine?.replacementItemId ? Number(l.requestLine?.replacementQty || 0) : qtyActual);
                            }, 0)}</td>
                            <td className="p-3 text-right" colSpan={2}>
                                {(() => {
                                    const subTotal = filteredLines.reduce((sum: number, l: any) => {
                                        const isReplaced = !!l.requestLine?.replacementItemId;
                                        const effectivePrice = isReplaced ? Number(l.requestLine?.replacementPrice || 0) : Number(l.unitPrice || 0);
                                        const qtyActual = l.qtyOrdered ?? l.qtyApproved ?? l.qtyRequested;
                                        const effectiveQty = isReplaced ? Number(l.requestLine?.replacementQty || 0) : qtyActual;
                                        return sum + (effectivePrice * effectiveQty);
                                    }, 0);
                                    const vatAmount = subTotal * (data.vat / 100);
                                    return (subTotal + vatAmount).toLocaleString('vi-VN');
                                })()} VNĐ
                            </td>
                            <td></td>
                        </tr>
                      </>
                    );
                  })()}
              </tbody>
          </table>

          {/* REPLACEMENT SUMMARY FOR TGĐ */}
          {(() => {
              const filteredLines = data.lines.filter((l: any) => {
                  if (selectedPrintType === 'ALL') return true;
                  const type = l.item.itemType || (l.item.mvpp.startsWith('VPP') ? 'VPP' : 'VE_SINH');
                  return type === selectedPrintType;
              });

              if (!filteredLines.some((l: any) => !!l.requestLine?.replacementItemId)) return null;

              const approvedTotal = filteredLines.reduce((sum: number, l: any) => {
                  const origPrice = Number(l.requestLine?.unitPrice || l.requestLine?.item?.price || 0);
                  const origQty = Number(l.requestLine?.qtyRequested || l.qtyRequested || 0);
                  return sum + (origPrice * origQty);
              }, 0);

              const actualTotal = filteredLines.reduce((sum: number, l: any) => {
                  const isReplaced = !!l.requestLine?.replacementItemId;
                  const effectivePrice = isReplaced ? Number(l.requestLine?.replacementPrice || 0) : Number(l.unitPrice || 0);
                  const qtyActual = l.qtyOrdered ?? l.qtyApproved ?? l.qtyRequested;
                  const effectiveQty = isReplaced ? Number(l.requestLine?.replacementQty || 0) : qtyActual;
                  return sum + (effectivePrice * effectiveQty);
              }, 0);

              const diff = actualTotal - approvedTotal;

              return (
                  <div className="mb-8 p-4 border-2 border-dashed border-slate-400 rounded-xl bg-slate-50/30">
                      <h4 className="text-[12px] font-black uppercase mb-3 border-b border-slate-300 pb-2">BÁO CÁO THAY THẾ VẬT TƯ THỰC TẾ</h4>
                      <div className="grid grid-cols-3 gap-8">
                          <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">TỔNG GIÁ TRỊ ĐỀ XUẤT ĐÃ DUYỆT</p>
                              <p className="text-[14px] font-bold text-slate-700">{approvedTotal.toLocaleString('vi-VN')} đ</p>
                          </div>
                          <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">TỔNG GIÁ TRỊ MUA THỰC TẾ SAU RÀ SOÁT</p>
                              <p className="text-[14px] font-black text-indigo-700">{actualTotal.toLocaleString('vi-VN')} đ</p>
                          </div>
                          <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">HIỆU QUẢ TỐI ƯU CHI PHÍ MUA SẮM</p>
                              <p className="text-[14px] font-black">
                                  <span className={diff <= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                      {diff <= 0 ? 'Tiết kiệm: ' : 'Tăng thêm: '}
                                      {Math.abs(diff).toLocaleString('vi-VN')} đ
                                  </span>
                              </p>
                          </div>
                      </div>
                  </div>
              );
          })()}

          <div className="flex justify-between items-start mt-2 px-6">
              <div className="text-center w-1/3">
                  <p className="font-black uppercase text-[12px] mb-1">NGƯỜI LẬP PHIẾU</p>
                  <div className="mt-6">
                      <p className="font-black uppercase text-[13px]">{data.requester?.fullName}</p>
                      <p className="text-[9px] font-bold text-blue-600 mt-1">
                          {formatDigitalSignatureDate(data.createdAt)} (Đã ký số)
                      </p>
                  </div>
              </div>
              <div className="text-center w-1/3">
                  <p className="font-black uppercase text-[12px] mb-1">TRƯỞNG BỘ PHẬN</p>
                  <div className="mt-10">
                      <p className="font-black uppercase text-[13px]">{data.approver?.fullName || '..........................'}</p>
                      {data.approvedAt && (
                          <p className="text-[9px] font-bold text-blue-600 mt-1">
                              {formatDigitalSignatureDate(data.approvedAt)} (Đã ký số)
                          </p>
                      )}
                      {!data.approvedAt && <p className="text-[10px] text-slate-400">.../.../...</p>}
                  </div>
              </div>
              <div className="text-center w-1/3">
                  <p className="font-black uppercase text-[12px] mb-1">THỦ KHO / XUẤT</p>
                  <div className="mt-16">
                      <p className="font-black uppercase text-[13px]">..........................</p>
                      <p className="text-[10px] text-slate-400">.../.../...</p>
                  </div>
              </div>
          </div>

          <div className="mt-20 border-t border-slate-200 pt-4 flex justify-between text-[9px] text-slate-400 italic">
              <p>Ngày in: {new Date().toLocaleString('vi-VN')} • Mã hệ thống: {data.id}</p>
              <p>Hệ thống Quản lý Tồn kho - Danko Group • Trang 1/1</p>
          </div>
      </div>

      {/* REPLACEMENT MODAL */}
      {showReplaceModal && activeReplaceLine && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                   <RotateCcw className="w-6 h-6"/>
                </div>
                <div>
                  <h4 className="text-xl font-black tracking-tight">Thay Thế Vật Tư Thực Tế</h4>
                  <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Áp dụng cho: {activeReplaceLine.item.name}</p>
                </div>
              </div>
              <button onClick={() => setShowReplaceModal(false)} className="text-white/60 hover:text-white transition"><XCircle className="w-8 h-8"/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
              {/* Original Item Info */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Vật tư gốc được duyệt</p>
                 <div className="flex justify-between items-center">
                    <div>
                       <p className="font-black text-slate-800">{activeReplaceLine.item.name}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">{activeReplaceLine.item.mvpp}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-bold text-slate-500">SL: {activeReplaceLine.qtyOrdered || activeReplaceLine.qtyApproved || activeReplaceLine.qtyRequested}</p>
                       <p className="text-sm font-black text-indigo-600">{Number(activeReplaceLine.unitPrice || 0).toLocaleString('vi-VN')} đ</p>
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                {/* Search Replacement */}
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Chọn vật tư thay thế mới</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                    <input 
                      type="text"
                      placeholder="Tìm mã hoặc tên vật tư..."
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition shadow-sm"
                      value={replacementSearch}
                      onChange={(e) => setReplacementSearch(e.target.value)}
                    />
                  </div>
                  {replacementSearch && !selectedReplacementItem && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[110] overflow-hidden max-h-60 overflow-y-auto">
                      {items.filter((i:any) => i.name.toLowerCase().includes(replacementSearch.toLowerCase()) || i.mvpp.toLowerCase().includes(replacementSearch.toLowerCase())).slice(0, 10).map((item:any) => (
                        <div 
                          key={item.id}
                          onClick={() => {
                            setSelectedReplacementItem(item);
                            setReplacementPrice(Number(item.price || 0));
                            setReplacementSearch('');
                          }}
                          className="p-4 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 transition"
                        >
                          <p className="text-sm font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase">{item.mvpp} • {item.category}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedReplacementItem && (
                  <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 animate-in fade-in slide-in-from-top-4">
                     <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center"><CheckCircle className="w-5 h-5"/></div>
                           <div>
                              <p className="text-sm font-black text-slate-800">{selectedReplacementItem.name}</p>
                              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{selectedReplacementItem.mvpp}</p>
                           </div>
                        </div>
                        <button onClick={() => setSelectedReplacementItem(null)} className="text-rose-500 hover:text-rose-700 transition"><Trash2 className="w-5 h-5"/></button>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số lượng mua</label>
                           <input 
                              type="number"
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition"
                              value={replacementQty}
                              onChange={(e) => setReplacementQty(Number(e.target.value))}
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đơn giá thực tế (₫)</label>
                           <input 
                              type="number"
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition"
                              value={replacementPrice}
                              onChange={(e) => setReplacementPrice(Number(e.target.value))}
                           />
                        </div>
                     </div>

                     {/* Savings check */}
                     <div className="mt-4 pt-4 border-t border-indigo-100/50 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Chênh lệch chi phí:</span>
                        {(() => {
                           const originalLineTotal = Number(activeReplaceLine.qtyRequested) * Number(activeReplaceLine.unitPrice || 0);
                           const newTotal = Number(replacementQty) * Number(replacementPrice);
                           const diff = originalLineTotal - newTotal;
                           return (
                             <span className={`text-xs font-black ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                               {diff >= 0 ? 'Tiết kiệm: ' : 'Tăng thêm: '}
                               {Math.abs(diff).toLocaleString('vi-VN')} đ
                             </span>
                           );
                        })()}
                     </div>
                  </div>
                )}

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Lý do thay thế</label>
                   <textarea 
                     placeholder="Vui lòng nhập lý do (VD: Hết hàng, đổi sang loại tương đương rẻ hơn...)"
                     className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none transition shadow-sm min-h-[100px]"
                     value={replacementReason}
                     onChange={(e) => setReplacementReason(e.target.value)}
                   />
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
               <button onClick={() => setShowReplaceModal(false)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition">Hủy bỏ</button>
               <button 
                 onClick={handleReplaceConfirm}
                 disabled={isReplacing || !selectedReplacementItem || !replacementReason}
                 className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
               >
                 {isReplacing ? 'Đang lưu...' : 'Xác nhận thay thế'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesDetail;
