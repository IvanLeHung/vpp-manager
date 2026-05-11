import { useState, useEffect } from 'react';
import { XCircle, Printer, CheckCircle, RefreshCw, ArrowLeft, Archive, CheckSquare, Trash2, StopCircle, AlertTriangle, ShoppingCart, Minus, Plus, Check, FileSpreadsheet, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../lib/api';
import type { User } from '../../context/AppContext';
import type { ViewMode } from '../Requests';

interface Props {
  requestId: string;
  navigationIds?: string[];
  onNavigate?: (id: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveRequest?: (req: any) => void;
  refreshData: () => Promise<void>;
  showToast: (m: string, t?: 'success' | 'error' | 'warning') => void;
  currentUser: User;
}

function getItemSortGroupName(itemName: string) {
  if (!itemName) return '';
  return itemName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(a4|a5|a3|den|xanh|do|be|to|nho|lon)\b/g, "")
    .replace(/\b\d+(\.\d+)?\s*(ml|l|kg|g|cm|mm|m)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sortLinesForPrinting(lines: any[]) {
  return [...lines].sort((a, b) => {
    const itemA = a.item || {};
    const itemB = b.item || {};
    const groupA = itemA.printSortGroup || getItemSortGroupName(itemA.name || '');
    const groupB = itemB.printSortGroup || getItemSortGroupName(itemB.name || '');
    if (groupA !== groupB) return groupA.localeCompare(groupB, "vi");
    if (itemA.name !== itemB.name) return (itemA.name || '').localeCompare(itemB.name || '', "vi");
    return (itemA.mvpp || '').localeCompare(itemB.mvpp || '', "vi");
  });
}

export default function RequestsDetail({ requestId, navigationIds, onNavigate, setViewMode, setActiveRequest, refreshData, showToast, currentUser }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Navigation Logic
  const currentIndex = navigationIds ? navigationIds.indexOf(requestId) : -1;
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

  // Modals state
  const [rejectReason, setRejectReason] = useState('');
  const [globalApproveReason, setGlobalApproveReason] = useState('');
  const [comparison, setComparison] = useState<any>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  
  // Custom approvals
  const [approvals, setApprovals] = useState<{lineId: string, qtyApproved: number, selected: boolean, note: string}[]>([]);
  // Custom issues
  const [issues, setIssues] = useState<{lineId: string, qtyDelivered: number}[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('MAIN');
  const [selectedPrintType, setSelectedPrintType] = useState<'ALL' | 'VPP' | 'VE_SINH'>('ALL');
  const [isConfirmingIssue, setIsConfirmingIssue] = useState(false);
  const [autoCreateBackorder, setAutoCreateBackorder] = useState(true);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/requests/${requestId}`);
      setData(res.data);
      // Init modal states
      setApprovals(res.data.lines.map((l:any) => ({ 
        lineId: l.id, 
        qtyApproved: l.qtyApproved ?? l.qtyRequested,
        selected: l.status !== 'REJECTED',
        note: l.approvalNote || ''
      })));
      setIssues(res.data.lines.map((l:any) => ({ lineId: l.id, qtyDelivered: l.qtyApproved ?? l.qtyRequested })));
      setSelectedWarehouse(res.data.warehouseCode || 'MAIN');
      // Load comparison for Admin Level 2
      if (currentUser.role === 'ADMIN' && res.data.status === 'PENDING_ADMIN') {
        try {
          setLoadingComparison(true);
          const compRes = await api.get(`/requests/${requestId}/comparison`);
          setComparison(compRes.data);
        } catch (e) {
          console.error("Failed to load comparison info", e);
        } finally {
          setLoadingComparison(false);
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi tải phiếu', 'error');
      setViewMode('LIST');
    } finally {
      setLoading(true); // Keep loading false only after all async work
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [requestId]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'APPROVED': case 'READY_TO_ISSUE': case 'COMPLETED': return 'bg-emerald-500 text-white shadow-emerald-500/30';
      case 'REJECTED': case 'CANCELLED': return 'bg-rose-500 text-white shadow-rose-500/30';
      case 'DRAFT': return 'bg-slate-400 text-white shadow-slate-400/30';
      case 'PARTIALLY_ISSUED': case 'PARTIALLY_APPROVED': 
      case 'PARTIAL_TBP_APPROVED': case 'PARTIAL_ADMIN_APPROVED':
        return 'bg-teal-500 text-white shadow-teal-500/30';
      case 'RETURNED': case 'NEED_REVISION': return 'bg-orange-500 text-white shadow-orange-500/30';
      case 'WAITING_HANDOVER': return 'bg-blue-500 text-white shadow-blue-500/30';
      case 'PENDING_MANAGER': case 'PENDING_ADMIN': return 'bg-amber-500 text-white shadow-amber-500/30';
      case 'TBP_APPROVED': return 'bg-indigo-500 text-white shadow-indigo-500/30';
      default: return 'bg-slate-500 text-white cursor-help';
    }
  };

  const handleAction = async (actionPath: string, payload: any = {}, successMsg: string) => {
    try {
      await api.post(`/requests/${requestId}${actionPath}`, payload);
      showToast(successMsg);
      
      // Auto navigate to next if approved/rejected/cancelled/returned
      const nextActions = ['/approve', '/tbp_approve', '/admin_approve', '/reject', '/tbp_reject', '/admin_reject', '/return', '/cancel', '/confirm_receipt'];
      if (canGoNext && nextActions.includes(actionPath)) {
          goNext();
      } else {
          await refreshData();
          if (['/submit', '/withdraw'].includes(actionPath)) {
            setViewMode('LIST');
          }
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Thao tác thất bại', 'error');
    }
  };

  const printDocument = async () => {
      const hasPendingReplacement = data.lines.some((l: any) => l.status === 'REPLACEMENT_PENDING_ADMIN');
      if (hasPendingReplacement) {
          showToast('Không thể in: Có vật tư đang chờ Admin duyệt thay thế.', 'warning');
          return;
      }
      window.print();
      try { await api.post(`/requests/${requestId}/print`, { printType: 'FOR_RECORDS' }); } catch(e) {}
  };

  const handleExportExcel = () => {
      if (!data) return;

      const headerInfo = [
          ["PHIẾU YÊU CẦU CẤP PHÁT VẬN PHÒNG PHẨM"],
          [`Mã phiếu: ${data.id}`],
          [`Người đề xuất: ${data.requester.fullName} (${data.department})`],
          [`Lý do/Mục đích: ${data.purpose || "—"}`],
          [`Ngày tạo: ${new Date(data.createdAt).toLocaleString('vi-VN')}`],
          [`Trạng thái: ${data.status}`],
          [],
          ["STT", "Mã VT", "Tên Vật tư / Hàng hóa", "ĐVT", "SL Xin", "TBP Duyệt", "Admin Duyệt", "Lấy Thực", "Ghi chú"]
      ];

      const lineData = data.lines.map((l: any, idx: number) => {
          return [
              idx + 1,
              l.item.mvpp,
              l.item.name,
              l.item.unit,
              l.qtyRequested,
              l.qtyManagerApproved ?? "—",
              l.qtyAdminApproved ?? l.qtyApproved ?? "Chưa duyệt",
              l.qtyDelivered,
              l.approvalNote || ""
          ];
      });

      const worksheet = XLSX.utils.aoa_to_sheet([...headerInfo, ...lineData]);
      worksheet['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 25 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Chi tiết yêu cầu");
      XLSX.writeFile(workbook, `VPP_${data.id}.xlsx`);
  };

  const getWorkflowProgress = () => {
    if (!data) return 0;
    
    let basePercent = 0;
    switch(data.status) {
      case 'DRAFT': basePercent = 0; break;
      case 'PENDING_MANAGER': basePercent = 25; break;
      case 'PENDING_ADMIN': 
      case 'PARTIAL_TBP_APPROVED': basePercent = 50; break;
      case 'APPROVED':
      case 'READY_TO_ISSUE':
      case 'PARTIAL_ADMIN_APPROVED':
      case 'BACKORDER':
        basePercent = 75; break;
      case 'COMPLETED':
      case 'PARTIALLY_ISSUED':
      case 'WAITING_HANDOVER':
        basePercent = 100; break;
      default: basePercent = 0;
    }

    const totalTarget = data.lines.reduce((s:number, l:any) => s + (l.qtyApproved || l.qtyRequested), 0) || 1;
    const totalDelivered = data.lines.reduce((s:number, l:any) => s + l.qtyDelivered, 0);
    const deliveryPercent = Math.round((totalDelivered / totalTarget) * 100);

    return Math.min(100, Math.max(basePercent, deliveryPercent));
  };

  const getActionLabel = (action: string) => {
    if (!action) return '—';
    switch(action.toUpperCase()) {
      case 'SUBMIT': return 'Gửi trình duyệt';
      case 'TBP_APPROVE': return 'Trưởng bộ phận Duyệt';
      case 'ADMIN_APPROVE': return 'Hành chính Duyệt';
      case 'RETURN_FOR_REVISION': case 'RETURN_FOR_EDIT': return 'Trả lại chỉnh sửa';
      case 'REJECT': return 'Từ chối toàn bộ';
      case 'CANCEL': return 'Hủy phiếu';
      case 'ISSUE': case 'ISSUED': return 'Xuất kho / Giao hàng';
      case 'CONFIRM_RECEIPT': return 'Đã nhận hàng';
      case 'APPROVE': return 'Duyệt (Approve)';
      case 'TBP_REJECT': return 'Trưởng bộ phận Từ chối';
      case 'ADMIN_REJECT': return 'Hành chính Từ chối';
      case 'WITHDRAW': return 'Rút phiếu';
      default: return action;
    }
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col h-full bg-slate-50 relative items-center justify-center">
         <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
         <p className="font-bold text-slate-500">Đang tải dữ liệu phiếu...</p>
      </div>
    );
  }

  const currentUid = currentUser.userId || currentUser.id;
  const isApprover = data.currentApproverId === currentUid || (currentUser.role === 'ADMIN' && (data.status === 'PENDING_ADMIN' || data.status === 'PENDING_MANAGER'));
  const isWarehouse = (currentUser.role === 'WAREHOUSE' || currentUser.role === 'ADMIN') && ['APPROVED', 'READY_TO_ISSUE', 'PARTIALLY_ISSUED', 'PARTIALLY_APPROVED', 'PARTIAL_ADMIN_APPROVED', 'BACKORDER'].includes(data.status);
  const isOwnerDraft = currentUid === data.requesterId && (data.status === 'DRAFT' || data.status === 'RETURNED' || data.status === 'NEED_REVISION');
  const isOwnerPending = currentUid === data.requesterId && (data.status === 'PENDING_MANAGER' || data.status === 'PENDING_ADMIN');
  const canCancel = ['DRAFT', 'PENDING_MANAGER', 'PENDING_ADMIN', 'RETURNED', 'NEED_REVISION', 'APPROVED', 'READY_TO_ISSUE'].includes(data.status) && (currentUser.role !== 'EMPLOYEE' || currentUid === data.requesterId);
  const isHandover = (currentUid === data.requesterId || currentUser.role === 'ADMIN') && data.status === 'WAITING_HANDOVER';
  const isFutureApprover = currentUser.role === 'MANAGER' && data.approvalSteps?.some((s: any) => s.approverId === currentUid) && data.status === 'PENDING_MANAGER' && data.currentApproverId !== currentUid;

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden relative print:bg-white print:overflow-auto">
      {/* HEADER BAR */}
      <div className="no-print h-20 bg-white border-b border-slate-200 flex justify-between items-center px-6 md:px-10 shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-6">
              <button onClick={() => setViewMode('LIST')} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition shadow-inner">
                  <ArrowLeft className="w-5 h-5"/>
              </button>
              <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
                    {data.id} 
                    {navigationIds && navigationIds.length > 0 && (
                      <div className="flex items-center bg-slate-100 rounded-xl p-1 ml-4 border border-slate-200">
                        <button 
                          onClick={goPrev}
                          disabled={!canGoPrev}
                          className={`p-1.5 rounded-lg transition-all ${canGoPrev ? 'hover:bg-white text-indigo-600 shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}
                          title="Phiếu trước (Arrow Left)"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="px-4 text-[11px] font-black text-slate-500 uppercase tracking-widest min-w-[70px] text-center border-x border-slate-200">
                          {currentIndex + 1} / {total}
                        </span>
                        <button 
                          onClick={goNext}
                          disabled={!canGoNext}
                          className={`p-1.5 rounded-lg transition-all ${canGoNext ? 'hover:bg-white text-indigo-600 shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}
                          title="Phiếu sau (Arrow Right)"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    {data.priority === 'Khẩn cấp' && <span className="ml-3 text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded uppercase tracking-wider animate-pulse shadow-sm shadow-rose-500/50">Khẩn cấp</span>}
                  </h2>
                  <p className="text-sm font-semibold text-slate-500 mt-0.5">{data.requestType} • Lập lúc {new Date(data.createdAt).toLocaleString('vi-VN')}</p>
              </div>
          </div>
          <div className="flex items-center gap-3">
              {(() => {
                const hasPendingReplacement = data.lines.some((l: any) => l.status === 'REPLACEMENT_PENDING_ADMIN');
                return (
                  <button 
                    onClick={() => { setSelectedPrintType('ALL'); setTimeout(() => printDocument(), 100); }} 
                    disabled={hasPendingReplacement}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition shadow-sm border ${hasPendingReplacement ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}
                    title={hasPendingReplacement ? "Đang chờ Admin duyệt thay thế" : "In phiếu A4"}
                  >
                    <Printer className={`w-4 h-4 ${hasPendingReplacement ? 'text-slate-300' : 'text-indigo-500'}`}/> In Phiếu
                  </button>
                );
              })()}
              <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg ${getStatusColor(data.status)}`}>{data.status.replace(/_/g, ' ')}</span>
          </div>
      </div>

      <div key={requestId} className="no-print flex-1 overflow-y-auto p-4 md:p-8 flex flex-col xl:flex-row gap-6 w-full max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* LEFT COLUMN: Main Info & Lines */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
              {/* Box 1: Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pl-4">
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Người Đề Xuất</p>
                          <p className="text-lg font-bold text-slate-800">{data.requester?.fullName}</p>
                          <p className="text-sm font-semibold text-indigo-600 mt-1">{data.department}</p>
                      </div>
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lý do & Mục đích</p>
                          <p className="text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">"{data.purpose || 'Không có ghi chú'}"</p>
                      </div>
                      {['REJECTED', 'RETURNED', 'CANCELLED', 'NEED_REVISION'].includes(data.status) && (
                          <div className="md:col-span-2 bg-rose-50 border border-rose-200 rounded-xl p-4 mt-2">
                              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Lý do {data.status}</p>
                              <p className="font-bold text-rose-700">{data.rejectReason || data.returnReason || data.cancelReason || data.revisionReason}</p>
                          </div>
                      )}
                  </div>
              </div>

              {/* Box 1.5: Summary Statistics */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 flex items-center">
                       <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mr-2.5 shrink-0"><RefreshCw className="w-4 h-4"/></div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hạng mục</p>
                          <h4 className="text-xl font-black text-slate-800">{data.lines.length}</h4>
                       </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 flex items-center">
                       <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mr-2.5 shrink-0"><CheckSquare className="w-4 h-4"/></div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã Duyệt</p>
                          <h4 className="text-xl font-black text-emerald-600">{data.lines.filter((l:any) => l.status.includes('APPROVED') || l.status === 'COMPLETED' || l.status.includes('PARTIAL')).length}</h4>
                       </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 flex items-center">
                       <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mr-2.5 shrink-0"><XCircle className="w-4 h-4"/></div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bị Từ Chối</p>
                          <h4 className="text-xl font-black text-rose-600">{data.lines.filter((l:any) => l.status.includes('REJECTED')).length}</h4>
                       </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 flex items-center">
                       <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mr-2.5 shrink-0"><Archive className="w-4 h-4"/></div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã Xuất</p>
                          <h4 className="text-xl font-black text-blue-600">{data.lines.filter((l:any) => l.qtyDelivered > 0).length}</h4>
                       </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 flex flex-col justify-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex justify-between">Tiến độ <span>{getWorkflowProgress()}%</span></p>
                       <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 transition-all duration-500" 
                            style={{width: `${getWorkflowProgress()}%`}}
                          ></div>
                       </div>
                    </div>
                </div>

               {/* Decision Support Panel for Admin */}
               {currentUser.role === 'ADMIN' && data.status === 'PENDING_ADMIN' && (
                   <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                       {!comparison ? (
                           loadingComparison ? (
                               <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-3 animate-pulse">
                                   <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đang đối soát lịch sử phòng ban...</p>
                               </div>
                           ) : null
                       ) : (
                           <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                               <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                           <RefreshCw className="w-5 h-5"/>
                                       </div>
                                       <div>
                                           <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Đối soát lịch sử cấp phát</h3>
                                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Decision Support System</p>
                                       </div>
                                   </div>
                                   <div className="flex gap-6">
                                       {!comparison.lastRequest ? (
                                           <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5"/> Lịch sử trống</span>
                                       ) : (
                                           <>
                                               <div className="text-right">
                                                   <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Mã phiếu gần nhất</p>
                                                   <a 
                                                      href={`/requests/${comparison.lastRequest.id}`} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer"
                                                      className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer inline-block"
                                                    >
                                                      {comparison.lastRequest.code}
                                                    </a>
                                               </div>
                                               <div className="text-right border-l border-slate-200 pl-6">
                                                   <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Khoảng cách ngày</p>
                                                   <p className={`text-xs font-black flex items-center gap-1.5 ${comparison.gapDays < 7 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
                                                       {comparison.gapDays} ngày 
                                                       {comparison.gapDays < 7 && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
                                                   </p>
                                               </div>
                                           </>
                                       )}
                                   </div>
                               </div>

                               <div className="p-5">
                                   {!comparison.lastRequest ? (
                                       <div className="bg-indigo-50/50 rounded-2xl p-8 border border-indigo-100 border-dashed text-center">
                                           <p className="text-indigo-600 font-bold">Chưa có lịch sử cấp phát nào được ghi nhận cho phòng ban này.</p>
                                           <p className="text-[11px] text-indigo-400 mt-1">Hệ thống không thể thực hiện đối chiếu tự động.</p>
                                       </div>
                                   ) : (
                                       <>
                                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                               <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tổng SL đã duyệt cũ</p>
                                                   <h4 className="text-2xl font-black text-slate-700">{comparison.lastRequest.totalQty}</h4>
                                               </div>
                                               <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                                                   <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Tổng SL đang yêu cầu</p>
                                                   <h4 className="text-2xl font-black text-indigo-600">{comparison.currentRequest.totalQty}</h4>
                                               </div>
                                               <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex flex-col justify-center">
                                                   <p className="text-[10px] font-black text-amber-500 uppercase mb-1.5 flex justify-between">Tỷ lệ so với cũ <span>{Math.round((comparison.currentRequest.totalQty / (comparison.lastRequest.totalQty || 1)) * 100)}%</span></p>
                                                   <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
                                                      <div 
                                                        className={`h-full transition-all duration-700 ${comparison.currentRequest.totalQty > comparison.lastRequest.totalQty ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                        style={{width: `${Math.min(100, (comparison.currentRequest.totalQty / (comparison.lastRequest.totalQty || 1)) * 100)}%`}}
                                                      ></div>
                                                   </div>
                                               </div>
                                           </div>

                                           <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                               <table className="w-full text-left">
                                                   <thead className="bg-slate-50 border-b border-slate-100 text-[9px] uppercase font-black text-slate-400 tracking-widest">
                                                       <tr>
                                                           <th className="px-5 py-3">Tên vật tư hàng hóa</th>
                                                           <th className="px-5 py-3 text-center bg-slate-100/30">Cũ (Duyệt)</th>
                                                           <th className="px-5 py-3 text-center bg-indigo-50/30">Mới (Xin)</th>
                                                           <th className="px-5 py-3 text-center">Chênh lệch</th>
                                                           <th className="px-5 py-3 text-right">Phát hiện thông minh</th>
                                                       </tr>
                                                   </thead>
                                                   <tbody className="divide-y divide-slate-50">
                                                       {comparison.comparison.map((item: any) => (
                                                           <tr key={item.itemId} className={`hover:bg-slate-50/50 transition-colors ${item.isSurge || item.isNew ? 'bg-rose-50/10' : ''}`}>
                                                               <td className="px-5 py-3">
                                                                   <p className="text-xs font-bold text-slate-800">{item.itemName}</p>
                                                               </td>
                                                               <td className="px-5 py-3 text-center font-bold text-slate-500 bg-slate-100/10">{item.prevApprovedQty}</td>
                                                               <td className="px-5 py-3 text-center font-black text-indigo-600 bg-indigo-50/10">{item.currentQty}</td>
                                                               <td className={`px-5 py-3 text-center font-black text-sm ${item.diff > 0 ? 'text-rose-500' : (item.diff < 0 ? 'text-emerald-500' : 'text-slate-400')}`}>
                                                                   {item.diff > 0 ? `+${item.diff}` : (item.diff === 0 ? '--' : item.diff)}
                                                               </td>
                                                               <td className="px-5 py-3 text-right">
                                                                   <div className="flex gap-2 justify-end">
                                                                       {item.isNew && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 border border-indigo-200 rounded text-[8px] font-black uppercase tracking-tighter shadow-sm animate-bounce">Mới tinh</span>}
                                                                       {item.isSurge && <span className="px-2 py-0.5 bg-rose-500 text-white rounded text-[8px] font-black uppercase tracking-tighter shadow-lg shadow-rose-200 animate-pulse">Tăng vọt</span>}
                                                                       {!item.isNew && !item.isSurge && item.diff === 0 && <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[8px] font-bold uppercase tracking-tighter">Ổn định</span>}
                                                                       {item.diff < 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[8px] font-bold uppercase tracking-tighter">Giảm SL</span>}
                                                                   </div>
                                                               </td>
                                                           </tr>
                                                       ))}
                                                   </tbody>
                                               </table>
                                           </div>
                                           {comparison.gapDays < 7 && (
                                               <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3">
                                                   <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce"/>
                                                   <p className="text-[11px] font-bold text-rose-700">CẢNH BÁO: Đề xuất lặp lại quá nhanh (Dưới 7 ngày). Vui lòng kiểm tra kỹ lý do cần gấp trước khi duyệt.</p>
                                               </div>
                                           )}
                                       </>
                                   )}
                               </div>
                           </div>
                       )}
                   </div>
               )}

              {/* Box 2: Lines Grid */}
               <div className="no-print bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
                   <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                      <h3 className="text-[11px] font-black text-indigo-700 uppercase tracking-widest">Chi tiết Vật tư Xin Cấp</h3>
                      {data.lines.some((l:any) => l.qtyRequested > (l.item.stocks?.find((s:any)=>s.warehouseCode===data.warehouseCode)?.quantityOnHand||0)) && <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-3 py-1 rounded border border-rose-200 flex items-center print:hidden"><AlertTriangle className="w-3.5 h-3.5 mr-1"/> Cảnh báo thiếu Tồn Kho (Kho yêu cầu)</span>}
                   </div>
                   <div className="overflow-x-auto">
                       <table className="w-full text-left whitespace-nowrap min-w-full">
                           <thead className="bg-white border-b border-slate-200">
                               <tr className="text-[9px] uppercase font-black text-slate-400 tracking-wider bg-slate-50/50">
                                   <th className="px-2 py-3 text-center w-10 border-r border-slate-100">STT</th>
                                   <th className="px-2 py-3">Vật tư / Hàng hóa</th>
                                   <th className="px-2 py-3 text-center">Tồn / Khả dụng</th>
                                   <th className="px-2 py-3 text-center border-x border-slate-100">SL Xin</th>
                                   <th className="px-2 py-3 text-center text-amber-600 bg-amber-50/30 border-r border-slate-100">TBP Duyệt</th>
                                   <th className="px-2 py-3 text-center text-emerald-600 bg-emerald-50/30 border-r border-slate-100">Admin Duyệt</th>
                                   <th className="px-2 py-3 text-center text-blue-600 bg-blue-50/30">Lấy thực</th>
                                    <th className="px-2 py-3 text-right">Đơn giá</th>
                                    <th className="px-2 py-3 text-right">Thành tiền</th>
                                   <th className="px-2 py-3 text-center">Trạng thái</th>
                                   <th className="px-2 py-3 text-center">Ghi chú</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               {data.lines.map((l:any, idx:number) => {
                                   
                                   const stocks = l.item.stocks || [];
                                   const reqStock = stocks.find((s:any) => s.warehouseCode === data.warehouseCode) || { quantityOnHand: 0, quantityReserved: 0 };
                                   const totalOnHand = stocks.reduce((sum:number, s:any) => sum + s.quantityOnHand, 0);
                                   const available = reqStock.quantityOnHand - reqStock.quantityReserved;
                                   const outOfStock = l.qtyRequested > available;
                                   
                                   const getLineStatusColor = (status: string) => {
                                        switch(status) {
                                            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
                                            case 'PARTIALLY_ISSUED': return 'bg-blue-100 text-blue-700 border-blue-200';
                                            case 'READY_TO_ISSUE': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
                                            case 'TBP_APPROVED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
                                            case 'TBP_PARTIAL': return 'bg-amber-50 text-amber-600 border-amber-100';
                                            case 'TBP_REJECTED': return 'bg-rose-50 text-rose-600 border-rose-100';
                                            case 'ADMIN_APPROVED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                                            case 'ADMIN_PARTIAL': return 'bg-teal-50 text-teal-700 border-teal-100';
                                            case 'ADMIN_REJECTED': return 'bg-rose-100 text-rose-700 border-rose-200';
                                            case 'NEED_REVISION': return 'bg-orange-100 text-orange-700 border-orange-200';
                                            default: return 'bg-slate-100 text-slate-500 border-slate-200';
                                        }
                                   };

                                   return (
                                   <tr key={l.id} className={`hover:bg-slate-50 transition border-l-4 ${outOfStock && data.status.startsWith('PENDING') ? 'border-l-rose-500 bg-rose-50/30' : 'border-l-transparent'}`}>
                                       <td className="px-2 py-2 text-center font-bold text-slate-400 border-r border-slate-100">{idx+1}</td>
                                       <td className="px-2 py-2 min-w-[150px]">
                                            <p className="font-bold text-slate-800 text-sm whitespace-normal">{l.replacementItem?.name || l.item.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                               <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black tracking-widest">{l.replacementItem?.mvpp || l.item.mvpp}</span>
                                               {l.replacementItemId && <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded uppercase">Đã thay thế</span>}
                                               <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1"><Archive className="w-3 h-3"/> Kho: {data.warehouseCode}</span>
                                            </div>
                                        </td>
                                       <td className="px-2 py-2">
                                           <div className="flex flex-col items-center gap-1">
                                              <div className="flex gap-1">
                                                 <div className="text-center px-1 py-0.5 bg-slate-50 border border-slate-200 rounded">
                                                    <p className="text-[7px] font-black text-slate-400 uppercase">Tồn</p>
                                                    <p className="text-[10px] font-black text-slate-700">{reqStock.quantityOnHand}</p>
                                                 </div>
                                                 <div className="text-center px-1 py-0.5 bg-emerald-50 border border-emerald-100 rounded">
                                                    <p className="text-[7px] font-black text-emerald-400 uppercase">Khả dụng</p>
                                                    <p className="text-[10px] font-black text-emerald-700">{available}</p>
                                                 </div>
                                                 <div className="text-center px-1 py-0.5 bg-amber-50 border border-amber-100 rounded">
                                                    <p className="text-[7px] font-black text-amber-400 uppercase">Đã giữ</p>
                                                    <p className="text-[10px] font-black text-amber-700">{reqStock.quantityReserved}</p>
                                                 </div>
                                              </div>
                                              {totalOnHand > reqStock.quantityOnHand && (
                                                 <p className="text-[9px] font-bold text-slate-400 italic">Tổng tồn: {totalOnHand}</p>
                                              )}
                                           </div>
                                       </td>
                                       <td className="px-2 py-2 text-center border-x border-slate-100">
                                           <span className="font-black text-base text-slate-700">{l.qtyRequested}</span> <span className="text-[9px] font-bold text-slate-400 uppercase">{l.item.unit}</span>
                                       </td>
                                        <td className="px-2 py-2 text-center bg-amber-50/30 border-r border-slate-100">
                                            {l.qtyManagerApproved !== null ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="font-black text-base text-amber-600">{l.qtyManagerApproved}</span>
                                                    {l.qtyManagerApproved !== l.qtyRequested && (
                                                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${l.qtyManagerApproved < l.qtyRequested ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {l.qtyManagerApproved < l.qtyRequested ? `-${l.qtyRequested - l.qtyManagerApproved}` : `+${l.qtyManagerApproved - l.qtyRequested}`}
                                                      </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Chờ TBP</span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 text-center bg-emerald-50/30 border-r border-slate-100">
                                            {l.qtyAdminApproved !== null || l.qtyApproved !== null || l.replacementQty !== null ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="font-black text-base text-emerald-600">{l.replacementQty ?? l.qtyAdminApproved ?? l.qtyApproved}</span>
                                                    { (l.replacementQty ?? l.qtyAdminApproved ?? l.qtyApproved) !== (l.qtyManagerApproved ?? l.qtyRequested) && (
                                                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${ (l.replacementQty ?? l.qtyAdminApproved ?? l.qtyApproved) < (l.qtyManagerApproved ?? l.qtyRequested) ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {(l.replacementQty ?? l.qtyAdminApproved ?? l.qtyApproved) < (l.qtyManagerApproved ?? l.qtyRequested) ? `-${(l.qtyManagerApproved ?? l.qtyRequested) - (l.replacementQty ?? l.qtyAdminApproved ?? l.qtyApproved)}` : `+${(l.replacementQty ?? l.qtyAdminApproved ?? l.qtyApproved) - (l.qtyManagerApproved ?? l.qtyRequested)}`}
                                                      </span>
                                                    )}
                                                    {l.replacementQty !== null && (l.qtyAdminApproved ?? l.qtyApproved) !== l.replacementQty && (
                                                      <span className="text-[9px] font-bold text-slate-400 line-through">({l.qtyAdminApproved ?? l.qtyApproved})</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Chờ Admin</span>
                                            )}
                                        </td>
                                       <td className="px-2 py-2 text-center bg-blue-50/30">
                                           <span className="font-black text-base text-blue-600">{l.qtyDelivered ?? 0}</span>
                                           {l.qtyDelivered > 0 && l.qtyDelivered < (l.qtyApproved ?? l.qtyRequested) && (
                                               <p className="text-[9px] font-bold text-rose-500 bg-rose-50 rounded px-1 mt-1">Còn nợ: {(l.qtyApproved ?? l.qtyRequested) - l.qtyDelivered}</p>
                                           )}
                                       </td>

                                       <td className="px-2 py-2 text-right">

                                           <span className="text-xs font-bold text-slate-500">{(l.item.price || 0).toLocaleString('vi-VN')}</span>

                                       </td>

                                       <td className="px-2 py-2 text-right">

                                           <span className="text-xs font-black text-slate-800">{((l.item.price || 0) * (l.qtyApproved ?? l.qtyRequested)).toLocaleString('vi-VN')}</span>

                                       </td>
                                       <td className="px-2 py-2 text-center">
                                           <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${getLineStatusColor(l.status)}`}>
                                               {l.status.replace(/_/g, ' ')}
                                           </span>
                                           {l.approvalNote && (
                                              <div className="mt-1 flex items-start gap-1 justify-center">
                                                 <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5"/>
                                                 <p className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded italic whitespace-normal max-w-[120px] leading-tight">
                                                    {l.approvalNote}
                                                 </p>
                                              </div>
                                           )}
                                           {l.issueNote && <p className="text-[10px] italic text-slate-400 mt-1 truncate max-w-[100px]" title={l.issueNote}>{l.issueNote}</p>}
                                       </td>
                                       <td className="px-2 py-2">
                                           <div className="max-w-[180px] whitespace-normal">
                                              <p className="text-[11px] font-medium text-slate-600 italic leading-tight">
                                                 {l.note || '—'}
                                              </p>
                                           </div>
                                        </td>
                                   </tr>
                               )})}
                           </tbody>
                       </table>
                   </div>
               </div>
          </div>

          {/* RIGHT COLUMN: Actions & History */}
          <div className="no-print w-full xl:w-96 flex flex-col gap-6 shrink-0">
              
              {/* Box 3: Action Toolbar (Role-based) */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-6 border border-slate-700 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
                  <div className="flex items-center justify-between mb-6 relative z-10">
                      <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                          <Shield className="w-5 h-5 text-indigo-400"/> TRUNG TÂM LỆNH
                      </h3>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white/5 px-2 py-1 rounded border border-white/10">ROLE: {currentUser.role}</span>
                  </div>
                  <div className="flex flex-col gap-3 relative z-10">
                      
                      {/* --- THAO TÁC CỦA NGƯỜI LẬP --- */}
                      {isOwnerDraft && (
                          <button onClick={() => {
                            if (setActiveRequest) setActiveRequest(data);
                            setViewMode('CREATE');
                          }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30">Tiếp Tục Chỉnh Sửa</button>
                      )}
                      {isOwnerPending && (
                           <button onClick={() => handleAction('/withdraw', {reason:'Xin rút lại để sửa'}, 'Đã rút phiếu thành công')} className="w-full py-3 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition border border-slate-600">Thu hồi sửa đổi</button>
                      )}

                      {/* --- THAO TÁC CỦA QUẢN LÝ --- */}
                      {isApprover && (
                          <>
                             <button onClick={() => setShowApproveModal(true)} className="w-full py-3.5 bg-emerald-500 text-white rounded-xl font-black hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/30 flex items-center justify-center transform hover:scale-[1.02]"><CheckSquare className="w-5 h-5 mr-2"/> {(currentUser.role === 'MANAGER' && data.status === 'PENDING_MANAGER') ? 'DUYỆT CẤP 1 (TRƯỞNG BP)' : 'PHÊ DUYỆT CẤP 2 (Admin)' }</button>
                             <div className="flex gap-3">
                                <button onClick={() => setShowRejectModal(true)} className="flex-1 py-2.5 bg-slate-800 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/50 rounded-xl font-bold transition">Từ Chối</button>
                                <button onClick={() => handleAction('/return', {reason: prompt('Lý do yêu cầu làm lại?')}, 'Đã trả lại')} className="flex-1 py-2.5 bg-slate-800 text-amber-500 hover:bg-amber-500 hover:text-white border border-amber-500/50 rounded-xl font-bold transition">Trả Lại Sửa</button>
                             </div>
                          </>
                      )}

                      {/* --- THAO TÁC CỦA KHO --- */}
                      {(isWarehouse || currentUser.role === 'ADMIN') && ['APPROVED', 'READY_TO_ISSUE', 'PARTIALLY_ISSUED', 'PARTIALLY_APPROVED', 'PARTIAL_ADMIN_APPROVED', 'BACKORDER'].includes(data.status) && (
                           <button onClick={() => setShowIssueModal(true)} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/40 flex items-center justify-center transform hover:scale-[1.02] mt-2 border border-emerald-500"><Archive className="w-6 h-6 mr-2"/> CẤP PHÁT CHO NHÂN SỰ</button>
                      )}

                      {/* --- TẠO MUA SẮM (AUTO PO) --- */}
                      {currentUser.role === 'ADMIN' && 
                       ['APPROVED', 'READY_TO_ISSUE', 'PARTIALLY_ISSUED', 'PARTIALLY_APPROVED'].includes(data.status) &&
                       data.lines.some((l:any) => l.qtyRequested > (l.qtyApproved ?? 0)) &&
                       (!data.revisionReason?.includes('Đã tạo PO')) && (
                           <button onClick={() => {
                               if(window.confirm('Tạo tự động Đơn mua sắm (PO) cho các mặt hàng báo thiếu?')) {
                                   handleAction('/create_po', {}, 'Đã tạo Đơn đặt hàng (PO) thành công!');
                               }
                           }} className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-black hover:bg-amber-600 transition shadow-lg shadow-amber-500/40 flex items-center justify-center transform hover:scale-[1.02] mt-2 border border-amber-500"><ShoppingCart className="w-5 h-5 mr-2"/> TẠO ĐƠN MUA SẮM (BACKORDER)</button>
                      )}

                      {/* --- XÁC NHẬN BÀN GIAO --- */}
                      {isHandover && (
                          <button onClick={() => {
                              if(window.confirm('Xác nhận bạn đã nhận đủ vật tư từ kho theo đúng số lượng thực giao?')) {
                                  handleAction('/confirm_receipt', {}, 'Bàn giao thành công. Phiếu đã được đóng!');
                              }
                          }} className="w-full py-4 bg-indigo-500 text-white rounded-xl font-black hover:bg-indigo-600 transition shadow-lg shadow-indigo-500/40 flex items-center justify-center transform hover:scale-[1.02] mt-2 border border-indigo-500"><CheckCircle className="w-6 h-6 mr-2"/> XÁC NHẬN ĐÃ NHẬN HÀNG</button>
                      )}

                      <hr className="border-slate-700 my-2" />
                      
                      {canCancel && <button onClick={() => handleAction('/cancel', {reason: prompt('Nhập lý do hủy phiếu:')}, 'Đã Hủy phiếu')} className="w-full py-2.5 bg-transparent text-slate-400 hover:text-rose-500 flex items-center justify-center rounded-xl font-bold transition"><Trash2 className="w-4 h-4 mr-2"/> Hủy Bỏ Phiếu Này</button>}
                      
                      {(() => {
                        const hasPendingReplacement = data.lines.some((l: any) => l.status === 'REPLACEMENT_PENDING_ADMIN');
                        return (
                          <button 
                            onClick={() => { setSelectedPrintType('ALL'); setTimeout(() => printDocument(), 100); }} 
                            disabled={hasPendingReplacement}
                            className={`w-full py-3.5 flex items-center justify-center rounded-xl font-black transition shadow-sm border ${hasPendingReplacement ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200'}`}
                            title={hasPendingReplacement ? "Đang chờ Admin duyệt thay thế" : "In Phiếu Đề Xuất"}
                          >
                            <Printer className={`w-5 h-5 mr-2 ${hasPendingReplacement ? 'text-slate-300' : 'text-indigo-500'}`}/> IN PHIẾU ĐỀ XUẤT (A4)
                          </button>
                        );
                      })()}

                      <button 
                        onClick={handleExportExcel}
                        className="w-full py-2.5 bg-white text-slate-800 hover:bg-slate-100 flex items-center justify-center rounded-xl font-bold transition shadow-sm"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500"/> Xuất File Excel
                      </button>

                      {['PENDING_MANAGER', 'PENDING_ADMIN', 'APPROVED', 'READY_TO_ISSUE', 'WAITING_HANDOVER', 'COMPLETED', 'PARTIALLY_ISSUED', 'PARTIALLY_APPROVED', 'PARTIAL_TBP_APPROVED', 'PARTIAL_ADMIN_APPROVED'].includes(data.status) && (
                          <div className="flex flex-col gap-2 bg-white/5 p-3 rounded-xl border border-white/10 mt-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Tùy chọn In nâng cao</p>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => { setSelectedPrintType('VPP'); setTimeout(() => printDocument(), 100); }} 
                                className="flex-1 py-2 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 flex items-center justify-center rounded-lg font-bold transition shadow-sm text-[10px]"
                              >
                                <Printer className="w-3 h-3 mr-1.5"/> IN VPP
                              </button>
                              <button 
                                onClick={() => { setSelectedPrintType('VE_SINH'); setTimeout(() => printDocument(), 100); }} 
                                className="flex-1 py-2 bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600 hover:text-white border border-cyan-500/30 flex items-center justify-center rounded-lg font-bold transition shadow-sm text-[10px]"
                              >
                                <Printer className="w-3 h-3 mr-1.5"/> IN VỆ SINH
                              </button>
                            </div>
                          </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="flex justify-between items-center mb-2">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ xử lý</p>
                             <span className="text-xs font-black text-emerald-400">{getWorkflowProgress()}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                             <div 
                               className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                               style={{width: `${getWorkflowProgress()}%`}}
                             ></div>
                          </div>
                      </div>
                  </div>
              </div>

                      {isFutureApprover && (
                          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/50 rounded-xl">
                              <p className="text-xs font-bold text-amber-500 flex items-center">
                                  <AlertTriangle className="w-4 h-4 mr-2"/> Chờ phê duyệt cấp dưới
                              </p>
                              <p className="text-[10px] text-amber-200/70 mt-1">Bạn có tên trong danh sách duyệt nhưng hiện tại chưa đến lượt của bạn.</p>
                          </div>
                      )}

              {/* Box 4: Approval Timeline (Audit Trail) */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden max-h-[600px] shrink-0">
                  <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center sticky top-0 z-10">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lịch sử Xử lý (Audit Trail)</h3>
                      {data.approvalHistories?.length > 5 && (
                          <button 
                            onClick={() => setShowFullHistory(true)}
                            className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1 transition-colors"
                          >
                             Xem tất cả ({data.approvalHistories.length + 1})
                          </button>
                      )}
                  </div>
                  
                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                      <div className="relative pl-3 border-l-2 border-slate-100 space-y-6">
                          {/* Entry 1: Creation */}
                          <div className="relative">
                              <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white shadow-sm"></div>
                              <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">Tạo đề xuất</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-tight">
                                  {new Date(data.createdAt).toLocaleString('vi-VN')} • <span className="text-slate-600 font-black italic">{data.requester?.fullName}</span>
                              </p>
                          </div>

                          {/* Dynamic Histories (Limited in sidebar) */}
                          {data.approvalHistories?.slice(0, 8).map((audit:any) => {
                              const getActionColor = (action: string) => {
                                if (action.includes('REJECT') || action === 'CANCEL') return 'bg-rose-500';
                                if (action.includes('APPROVE')) return 'bg-emerald-500';
                                if (action.includes('RETURN')) return 'bg-orange-500';
                                if (action === 'ISSUE') return 'bg-blue-500';
                                if (action === 'SUBMIT') return 'bg-indigo-500';
                                return 'bg-slate-400';
                              };
                              
                              return (
                                <div key={audit.id} className="relative group">
                                    <div className={`absolute -left-[18px] top-1 w-3 h-3 rounded-full ring-4 ring-white shadow-sm transition-transform group-hover:scale-125 ${getActionColor(audit.action)}`}></div>
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">{getActionLabel(audit.action)}</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-tight">
                                        {new Date(audit.createdAt).toLocaleString('vi-VN')} • <span className="text-slate-600 font-black italic">{audit.approver?.fullName}</span>
                                    </p>
                                    {audit.reason && (
                                        <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 relative">
                                            <p className="text-[10px] font-bold text-slate-500 italic line-clamp-2 leading-relaxed break-words" title={audit.reason}>
                                                "{audit.reason}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                              );
                           })}

                          {/* Final State */}
                          {data.status === 'COMPLETED' && (
                              <div className="relative">
                                  <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50 shadow-sm animate-pulse"></div>
                                  <p className="text-xs font-black text-emerald-600 uppercase tracking-widest italic">Phiếu Đã Đóng</p>
                              </div>
                          )}
                      </div>

                      {data.approvalHistories?.length > 8 && (
                          <button 
                             onClick={() => setShowFullHistory(true)}
                             className="w-full mt-6 py-2 border-2 border-dashed border-slate-100 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 hover:border-slate-200 transition-all"
                          >
                             + {data.approvalHistories.length - 8} bước xử lý khác
                          </button>
                      )}
                  </div>
              </div>

              {/* Box 5: Approval Steps (Config) */}
              {data.approvalSteps && data.approvalSteps.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col shrink-0">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tuyến Duyệt Cấu Hình</h3>
                  <div className="space-y-4">
                    {data.approvalSteps.map((step: any) => (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          step.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                          step.status === 'REJECTED' ? 'bg-rose-100 text-rose-600' :
                          step.stepNo === data.currentApprovalStep && data.status === 'PENDING_MANAGER' ? 'bg-amber-100 text-amber-600 animate-pulse' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          {step.stepNo}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${step.status === 'APPROVED' ? 'text-slate-800' : 'text-slate-500'}`}>
                            {step.approver?.fullName || 'N/A'}
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{step.status}</p>
                        </div>
                        {step.status === 'APPROVED' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                      </div>
                    ))}
                    <div className="flex items-center gap-3 opacity-60">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${data.status === 'PENDING_ADMIN' ? 'bg-amber-100 text-amber-600 animate-pulse' : data.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            {data.approvalSteps.length + 1}
                         </div>
                         <div className="flex-1">
                            <p className="text-sm font-bold text-slate-500">Hành chính (Duyệt cuối)</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Final Approval</p>
                         </div>
                    </div>
                  </div>
                </div>
              )}
                  </div>
              </div>

      {/* MODAL PHÊ DUYỆT (Manager) */}
      {showApproveModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] animate-slide-up">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-500 text-white shrink-0">
                      <div>
                        <h3 className="text-xl font-black">{data.status === 'PENDING_MANAGER' ? 'Phê duyệt Cấp 1 – Trưởng bộ phận' : 'Phê duyệt Cấp 2 – Hành chính (Admin)'}</h3>
                        <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest mt-1">Kiểm tra từng mặt hàng, chỉnh số lượng duyệt nếu cần, sau đó xác nhận phê duyệt.</p>
                      </div>
                      <button onClick={()=>setShowApproveModal(false)} className="text-emerald-100 hover:text-white transition p-2 hover:bg-white/10 rounded-full"><XCircle className="w-7 h-7"/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto flex flex-col">
                      {/* SUMMARY BLOCK */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 bg-slate-50 border-b border-slate-200 shrink-0">
                          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mặt hàng</p>
                             <p className="text-xl font-black text-slate-800">{data.lines.length}</p>
                          </div>
                          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Được chọn</p>
                             <p className="text-xl font-black text-emerald-600">{approvals.filter(a => a.selected).length}</p>
                          </div>
                          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thiếu tồn</p>
                             <p className="text-xl font-black text-rose-500">{data.lines.filter((l:any) => l.qtyRequested > (l.item.stocks?.find((s:any)=>s.warehouseCode===data.warehouseCode)?.quantityOnHand || 0)).length}</p>
                          </div>
                          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng SL Xin</p>
                             <p className="text-xl font-black text-indigo-600">{data.lines.reduce((s:number, l:any) => s + l.qtyRequested, 0)}</p>
                          </div>
                          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng SL Duyệt</p>
                             <p className="text-xl font-black text-emerald-600">{approvals.reduce((s:number, a:any) => s + (a.selected ? a.qtyApproved : 0), 0)}</p>
                          </div>
                      </div>

                      <div className="p-6">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-500 sticky top-0 z-10">
                               <tr>
                                  <th className="p-4 rounded-tl-xl w-12 text-center">Chọn</th>
                                  <th className="p-4">Hàng Hóa</th>
                                  <th className="p-4 text-center">Tồn Kho</th>
                                  <th className="p-4 text-center">SL Yêu cầu</th>
                                  <th className="p-4 text-center">SL Duyệt</th>
                                   <th className="p-4 text-right">Đơn giá</th>
                                   <th className="p-4 text-right">Thành tiền</th>
                                  <th className="p-4 rounded-tr-xl text-center">Trạng Thái</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.lines.map((l:any) => {
                                    const approval = approvals.find((a:any)=>a.lineId===l.id) || { selected: false, qtyApproved: 0, note: '' };
                                    const currentStock = l.item.stocks?.find((s:any)=>s.warehouseCode===data.warehouseCode)?.quantityOnHand || 0;
                                    const overStock = (approval.selected && approval.qtyApproved > currentStock);
                                    const isChanged = approval.qtyApproved !== l.qtyRequested;
                                    const noteRequired = isChanged && !approval.note.trim();
                                    
                                    const getStatusBadge = () => {
                                      if (!approval.selected) return <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest">Bỏ qua</span>;
                                      if (approval.qtyApproved === 0) return <span className="px-3 py-1 bg-rose-100 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest">Không duyệt</span>;
                                      if (currentStock === 0) return <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest">Hết hàng</span>;
                                      if (approval.qtyApproved >= l.qtyRequested) return <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">Duyệt đủ</span>;
                                      return <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest">Duyệt 1 phần</span>;
                                    };

                                    return (
                                    <tr key={l.id} className={`transition-colors border-b border-slate-50 ${!approval.selected ? 'opacity-50 grayscale' : 'hover:bg-slate-50/50'}`}>
                                        <td className="px-3 py-3 text-center align-top pt-5">
                                            <button 
                                              onClick={() => setApprovals(approvals.map(a => a.lineId === l.id ? {...a, selected: !a.selected} : a))}
                                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${approval.selected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-transparent'}`}
                                            >
                                              <Check className="w-4 h-4 stroke-[4]" />
                                            </button>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col">
                                              <span className="font-bold text-slate-700 text-sm whitespace-normal max-w-[300px]">{l.item.name}</span>
                                              <span className="text-[10px] font-black text-slate-400 uppercase mt-0.5">{l.item.mvpp}</span>
                                              
                                              {approval.selected && (isChanged || currentStock === 0) && (
                                                <div className={`mt-3 p-3 rounded-xl border-2 transition-all ${noteRequired ? 'bg-rose-50 border-rose-200 ring-2 ring-rose-100' : 'bg-slate-50 border-slate-200'}`}>
                                                   <div className="flex justify-between items-center mb-1.5">
                                                      <p className={`text-[10px] font-black uppercase tracking-widest ${noteRequired ? 'text-rose-500' : 'text-slate-400'}`}>Lý do điều chỉnh {noteRequired && ' (Bắt buộc)'}</p>
                                                      <div className="flex gap-1">
                                                         {['Hết hàng', 'Không đủ tồn', 'Thay thế'].map(preset => (
                                                            <button 
                                                               key={preset}
                                                               onClick={() => setApprovals(approvals.map(a => a.lineId === l.id ? {...a, note: preset} : a))}
                                                               className="text-[8px] font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
                                                            >
                                                               {preset}
                                                            </button>
                                                         ))}
                                                      </div>
                                                   </div>
                                                   <textarea 
                                                      value={approval.note}
                                                      onChange={(e) => setApprovals(approvals.map(a => a.lineId === l.id ? {...a, note: e.target.value} : a))}
                                                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium outline-none focus:border-indigo-400 h-16 resize-none"
                                                      placeholder="Nhập lý do tại sao thay đổi số lượng..."
                                                   />
                                                </div>
                                              )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center align-top pt-5">
                                            <div className={`inline-flex items-center px-3 py-1 rounded-xl font-black text-xs ${currentStock === 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                                              {currentStock}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center font-black text-indigo-600 bg-indigo-50/30 align-top pt-5">{l.qtyRequested}</td>
                                        <td className="p-4 align-top pt-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                  disabled={!approval.selected || approval.qtyApproved <= 0}
                                                  onClick={() => setApprovals(approvals.map(a => a.lineId === l.id ? {...a, qtyApproved: Math.max(0, a.qtyApproved - 1)} : a))}
                                                  className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center disabled:opacity-30 transition-colors"
                                                >
                                                  <Minus className="w-4 h-4" />
                                                </button>
                                                <input 
                                                   type="number" min="0" value={approval.qtyApproved} disabled={!approval.selected}
                                                   onChange={(e:any) => setApprovals(approvals.map((a:any) => a.lineId === l.id ? {...a, qtyApproved: Math.max(0, parseInt(e.target.value)||0)} : a))}
                                                   className={`w-16 text-center py-1.5 bg-white border-2 outline-none rounded-xl font-black text-base transition ${overStock ? 'text-rose-600 border-rose-300 ring-4 ring-rose-50' : isChanged ? 'text-amber-600 border-amber-200 bg-amber-50/30' : 'text-slate-700 border-slate-200 focus:border-emerald-400'}`}
                                                />
                                                <button 
                                                  disabled={!approval.selected || approval.qtyApproved >= l.qtyRequested}
                                                  onClick={() => setApprovals(approvals.map(a => a.lineId === l.id ? {...a, qtyApproved: a.qtyApproved + 1} : a))}
                                                  className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center disabled:opacity-30 transition-colors"
                                                >
                                                  <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {overStock && <p className="text-[9px] font-bold text-rose-500 text-center mt-1 animate-pulse">Duyệt vượt tồn!</p>}
                                            {isChanged && <p className="text-[9px] font-bold text-amber-500 text-center mt-1">Đã điều chỉnh</p>}
                                        </td>

                                        <td className="p-4 text-right font-medium align-top pt-5">

                                            {(l.item.price || 0).toLocaleString('vi-VN')}

                                        </td>

                                        <td className="p-4 text-right font-black text-slate-800 align-top pt-5">

                                            {((l.item.price || 0) * (approval.selected ? approval.qtyApproved : 0)).toLocaleString('vi-VN')}

                                        </td>
                                        <td className="px-3 py-3 text-center align-top pt-5">
                                            {getStatusBadge()}
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                      </div>
                  </div>

                  <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col gap-6 shrink-0">
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                          <div className="flex-1 w-full">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ghi chú chung (Optional)</p>
                             <textarea 
                                value={globalApproveReason}
                                onChange={(e) => setGlobalApproveReason(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-indigo-400 h-20 resize-none"
                                placeholder="Nhập ghi chú tổng thể cho toàn bộ phiếu..."
                             />
                             {currentUser.role === 'ADMIN' && data.status === 'PENDING_ADMIN' && (
                               <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                 <input 
                                   type="checkbox" 
                                   id="autoBackorder"
                                   checked={autoCreateBackorder}
                                   onChange={(e) => setAutoCreateBackorder(e.target.checked)}
                                   className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                 />
                                 <label htmlFor="autoBackorder" className="text-xs font-bold text-amber-700 cursor-pointer flex items-center gap-1.5">
                                   <ShoppingCart className="w-3.5 h-3.5"/> Tự động tạo Đơn mua sắm (Backorder) cho các mặt hàng thiếu/giảm SL
                                 </label>
                               </div>
                             )}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 italic md:w-80">
                            * {data.status === 'PENDING_MANAGER' ? 'Trưởng bộ phận' : 'Hành chính'} vui lòng chọn mặt hàng cần phê duyệt và điều chỉnh số lượng duyệt nếu cần. <br/><br/>
                            <span className="text-rose-500 font-bold">Lưu ý: Bắt buộc nhập lý do nếu số lượng duyệt khác với số lượng xin.</span>
                          </div>
                      </div>
                      <div className="flex flex-col md:flex-row justify-end items-center gap-4">
                          <div className="flex gap-3 w-full md:w-auto">
                              <button onClick={()=>setShowApproveModal(false)} className="flex-1 md:flex-none px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">Hủy Bỏ</button>
                              <button 
                                onClick={() => {
                                  setShowApproveModal(false);
                                  setShowRejectModal(true);
                                }} 
                                className="flex-1 md:flex-none px-6 py-3 font-bold text-rose-500 hover:bg-rose-50 border border-rose-200 rounded-xl transition"
                              >
                                Từ Chối
                              </button>
                              <button 
                                disabled={approvals.filter(a => a.selected).some(a => {
                                   const line = data.lines.find((l:any)=>l.id === a.lineId);
                                   return a.qtyApproved !== line.qtyRequested && !a.note.trim();
                                })}
                                onClick={() => {
                                  const selectedApprovals = approvals.filter(a => a.selected);
                                  if (selectedApprovals.length === 0) {
                                      if (!window.confirm('Bạn chưa chọn mặt hàng nào để duyệt. Hành động này sẽ từ chối toàn bộ các mặt hàng trong phiếu. Tiếp tục?')) return;
                                  }
                                  
                                  const missingNotes = selectedApprovals.filter(a => {
                                     const line = data.lines.find((l:any)=>l.id === a.lineId);
                                     return a.qtyApproved !== line.qtyRequested && !a.note.trim();
                                  });

                                  if (missingNotes.length > 0) {
                                     showToast('Vui lòng nhập lý do điều chỉnh cho các mặt hàng đã đổi số lượng', 'error');
                                     return;
                                  }

                                  if (data.status === 'PENDING_ADMIN') {
                                      const hasOverStock = data.lines.some((l:any) => {
                                          const app = approvals.find((a:any)=>a.lineId===l.id);
                                          return app?.selected && app.qtyApproved > (l.item.stocks?.find((s:any)=>s.warehouseCode===data.warehouseCode)?.quantityOnHand || 0);
                                      });
                                      if (hasOverStock) {
                                          if (!window.confirm('Cảnh báo: Bạn đang duyệt Số lượng vượt quá Tồn Kho thực tế. Hệ thống sẽ báo nợ (Backorder) hoặc Kho không thể xuất dòng này. Vẫn tiếp tục?')) return;
                                      }
                                  }
                                  // Khi Admin/Manager phê duyệt, nếu bỏ qua dòng nào thì mặc định là Reject dòng đó (SL duyệt = 0)
                                  const finalApprovals = approvals.map(a => {
                                      if (!a.selected) {
                                          return { ...a, qtyApproved: 0, note: a.note || 'Admin/Manager bỏ qua (Reject)' };
                                      }
                                      return a;
                                  });

                                  handleAction('/approve', { 
                                      lineApprovals: finalApprovals, 
                                      reason: globalApproveReason,
                                      createBackorder: autoCreateBackorder 
                                   }, 'Đã duyệt thành công!');
                                  setShowApproveModal(false);
                               }} className={`flex-1 md:flex-none px-10 py-3 font-black rounded-xl transition shadow-lg flex items-center justify-center ${
                                  approvals.filter(a => a.selected).some(a => {
                                     const line = data.lines.find((l:any)=>l.id === a.lineId);
                                     return a.qtyApproved !== line.qtyRequested && !a.note.trim();
                                  }) ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/30'
                               }`}><CheckCircle className="w-5 h-5 mr-2"/> XÁC NHẬN PHÊ DUYỆT</button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL TỪ CHỐI */}
      {showRejectModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-md overflow-hidden animate-slide-up">
                  <div className="p-6 border-b border-slate-100 flex items-center bg-rose-50 text-rose-600">
                      <StopCircle className="w-7 h-7 mr-3"/>
                      <h3 className="text-xl font-black">Từ chối Yêu Cầu</h3>
                  </div>
                  <div className="p-6">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Lý do từ chối (Bắt buộc)</label>
                      <textarea autoFocus value={rejectReason} onChange={(e:any)=>setRejectReason(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white resize-none h-32 font-medium transition" placeholder="Ví dụ: Không hợp lý..."/>
                  </div>
                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={()=>setShowRejectModal(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">Hủy</button>
                      <button onClick={() => {
                          if (!rejectReason.trim()) return showToast('Bắt buộc nhập lý do!', 'error');
                          handleAction('/reject', { reason: rejectReason }, 'Đã từ chối phiếu');
                          setShowRejectModal(false);
                      }} className="px-6 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition shadow-lg shadow-rose-500/30">Xác Nhận Từ Chối</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL XUẤT KHO (New Upgrade) */}
      {showIssueModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] animate-slide-up">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-indigo-500 rounded-lg"><Archive className="w-6 h-6"/></div>
                         <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Thao tác Xuất kho & Giao hàng</h3>
                            <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest">Bảng kê chi tiết xuất thực tế</p>
                         </div>
                      </div>
                      <button onClick={()=>setShowIssueModal(false)} className="text-indigo-200 hover:text-white transition"><XCircle className="w-7 h-7"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-0 flex flex-col lg:flex-row">
                      {/* Left: Settings & Meta */}
                      <div className="w-full lg:w-72 bg-slate-50 border-r border-slate-200 p-6 shrink-0">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Chọn Kho Xuất Hàng</label>
                          <select 
                            value={selectedWarehouse}
                            onChange={(e) => setSelectedWarehouse(e.target.value)}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition mb-6"
                          >
                            <option value="MAIN">Kho Chính (MAIN)</option>
                            <option value="SUPPLY">Kho Vật Tư (SUPPLY)</option>
                            <option value="SCRAP">Kho Phế Liệu (SCRAP)</option>
                          </select>

                          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl mb-6">
                             <p className="text-[10px] font-black text-amber-600 uppercase mb-2 flex items-center"><AlertTriangle className="w-3.5 h-3.5 mr-1"/> Lưu ý vận hành</p>
                             <ul className="text-[10px] text-amber-700 space-y-1.5 font-medium italic">
                                <li>• Kiểm tra kỹ SL vật lý trước khi nhập.</li>
                                <li>• Hệ thống sẽ trừ tồn ngay lập tức.</li>
                                <li>• SL nợ sẽ được theo dõi tự động.</li>
                             </ul>
                          </div>

                          <div className="mt-auto pt-6 space-y-3">
                             <button 
                               disabled={data.lines.some((l:any) => {
                                 const qtyIssue = issues.find((a:any)=>a.lineId===l.id)?.qtyDelivered ?? (l.qtyApproved ?? l.qtyRequested);
                                 const stock = l.item.stocks?.find((s:any) => s.warehouseCode === selectedWarehouse)?.quantityOnHand ?? 0;
                                 return qtyIssue > stock;
                               })}
                               onClick={() => setIsConfirmingIssue(true)}
                               className={`w-full py-4 rounded-2xl font-black shadow-xl transition transform hover:scale-[1.02] ${
                                  data.lines.some((l:any) => {
                                    const qtyIssue = issues.find((a:any)=>a.lineId===l.id)?.qtyDelivered ?? (l.qtyApproved ?? l.qtyRequested);
                                    const stock = l.item.stocks?.find((s:any) => s.warehouseCode === selectedWarehouse)?.quantityOnHand ?? 0;
                                    return qtyIssue > stock;
                                  }) ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white shadow-indigo-500/30 hover:bg-indigo-700'
                               }`}
                             >
                               {data.lines.some((l:any) => {
                                    const qtyIssue = issues.find((a:any)=>a.lineId===l.id)?.qtyDelivered ?? (l.qtyApproved ?? l.qtyRequested);
                                    const stock = l.item.stocks?.find((s:any) => s.warehouseCode === selectedWarehouse)?.quantityOnHand ?? 0;
                                    return qtyIssue > stock;
                                  }) ? 'KHÔNG ĐỦ TỒN ĐỂ XUẤT' : 'XÁC NHẬN XUẤT'}
                             </button>
                             
                             {data.lines.some((l:any) => {
                                const target = l.qtyApproved ?? l.qtyRequested;
                                const stock = l.item.stocks?.find((s:any) => s.warehouseCode === selectedWarehouse)?.quantityOnHand ?? 0;
                                return target > stock;
                             }) && (
                                <button 
                                  onClick={() => {
                                    if(window.confirm('Hệ thống sẽ tạo Đơn mua sắm (PO) cho các mặt hàng thiếu và chuyển trạng thái phiếu sang BACKORDER. Tiếp tục?')) {
                                      handleAction('/create_po', {}, 'Đã tạo yêu cầu Backorder thành công!');
                                      setShowIssueModal(false);
                                    }
                                  }}
                                  className="w-full py-3 bg-amber-500 text-white rounded-2xl font-black shadow-lg shadow-amber-500/30 hover:bg-amber-600 transition flex items-center justify-center"
                                >
                                  <ShoppingCart className="w-4 h-4 mr-2"/> TẠO BACKORDER
                                </button>
                             )}
                          </div>
                      </div>

                      {/* Right: Table */}
                      <div className="flex-1 overflow-x-auto p-6">
                         <table className="w-full text-left whitespace-nowrap min-w-[600px]">
                            <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-400 sticky top-0 z-10">
                               <tr>
                                  <th className="p-4 rounded-tl-xl">Vật tư</th>
                                  <th className="p-4 text-center">Tồn Kho</th>
                                  <th className="p-4 text-center bg-indigo-50/50">SL Duyệt</th>
                                  <th className="p-4 text-center bg-emerald-50/50 border-x border-emerald-100">THỰC XUẤT</th>
                                  <th className="p-4 rounded-tr-xl">ĐVT</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.lines.map((l:any) => {
                                    const qtyIssue = issues.find((a:any)=>a.lineId===l.id)?.qtyDelivered ?? (l.qtyApproved ?? l.qtyRequested);
                                    const stock = l.item.stocks?.find((s:any) => s.warehouseCode === selectedWarehouse) || { quantityOnHand: 0 };
                                    const overStock = qtyIssue > stock.quantityOnHand;
                                    const isDone = l.qtyDelivered >= (l.qtyApproved ?? l.qtyRequested);

                                    return (
                                    <tr key={l.id} className={isDone ? 'opacity-40 bg-slate-50' : ''}>
                                        <td className="p-4">
                                            <p className="font-bold text-slate-800 text-sm whitespace-normal max-w-[250px]">{l.item.name}</p>
                                            <p className="text-[10px] font-black text-slate-400 mt-1 uppercase">{l.item.mvpp}</p>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <span className={`font-black text-sm ${stock.quantityOnHand === 0 ? 'text-rose-500' : 'text-slate-600'}`}>{stock.quantityOnHand}</span>
                                        </td>
                                        <td className="p-4 text-center bg-indigo-50/20">
                                            <span className="font-black text-indigo-600">{l.qtyApproved ?? l.qtyRequested}</span>
                                        </td>
                                        <td className="p-4 bg-emerald-50/10 border-x border-emerald-50">
                                            <input 
                                               type="number" min="0" value={qtyIssue} disabled={isDone}
                                               onChange={(e:any) => setIssues(issues.map((a:any) => a.lineId === l.id ? {...a, qtyDelivered: Math.max(0, parseInt(e.target.value)||0)} : a))}
                                               className={`w-28 text-center mx-auto block py-2.5 bg-white border-2 outline-none rounded-xl font-black text-lg transition ${overStock ? 'text-rose-600 border-rose-400 ring-4 ring-rose-50 shadow-inner' : 'text-emerald-700 border-emerald-100 focus:border-emerald-400 focus:ring-emerald-50 shadow-sm'}`}
                                            />
                                            {overStock && <p className="text-[9px] font-bold text-rose-500 text-center mt-1 animate-pulse">Vượt tồn kho {selectedWarehouse}!</p>}
                                        </td>
                                        <td className="p-4 font-bold text-[10px] text-slate-400 uppercase">{l.item.unit}</td>
                                    </tr>
                                )})}
                            </tbody>
                         </table>
                      </div>
                  </div>
              </div>

              {/* Confirmation Overlay */}
              {isConfirmingIssue && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                   <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in">
                      <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Archive className="w-10 h-10"/>
                      </div>
                      <h4 className="text-xl font-black text-slate-800 mb-2">Xác nhận cấp phát?</h4>
                      <p className="text-sm text-slate-500 mb-8 font-medium">Bạn đang thực hiện cấp phát hàng từ kho <b>{selectedWarehouse}</b>. Hành động này không thể hoàn tác.</p>
                      <div className="flex flex-col gap-3">
                         <button 
                           onClick={() => {
                              const hasErr = data.lines.some((l:any) => {
                                 const qtyIssue = issues.find((a:any)=>a.lineId===l.id)?.qtyDelivered ?? 0;
                                 const stock = l.item.stocks?.find((s:any) => s.warehouseCode === selectedWarehouse)?.quantityOnHand ?? 0;
                                 return qtyIssue > stock;
                              });
                              if (hasErr) {
                                 showToast('Có dòng vượt tồn kho. Vui lòng kiểm tra lại!', 'error');
                                 setIsConfirmingIssue(false);
                                 return;
                              }
                              handleAction('/issue', { warehouseCode: selectedWarehouse, lineIssues: issues }, 'CẤP PHÁT VẬT TƯ THÀNH CÔNG! ĐANG CHỜ NHÂN SỰ XÁC NHẬN.');
                              setIsConfirmingIssue(false);
                              setShowIssueModal(false);
                           }}
                           className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/30"
                         >
                           XÁC NHẬN CẤP PHÁT
                         </button>
                         <button onClick={()=>setIsConfirmingIssue(false)} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600">Quay lại chỉnh sửa</button>
                      </div>
                   </div>
                </div>
              )}
          </div>
      )}
      {/* FORMAL PRINT-ONLY SECTION (A4 Standard) */}
      <div className="hidden print:block print-area">
          <div className="print-sheet text-black font-sans leading-tight">
              <div className="flex justify-between items-start mb-8 w-full print-header">
                  <div className="w-[35%] text-left">
                      <p className="font-bold text-[13px] uppercase">CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO</p>
                      <p className="text-[10px] italic mt-1 font-bold">Số phiếu: {data.id}</p>
                      <p className="text-[9px] text-slate-500 mt-1">Ban Hành chính Nhân sự</p>
                  </div>
                  <div className="w-[20%] flex flex-col items-center text-center">
                      <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(data.id)}`} 
                          alt="QR Code" 
                          className="w-16 h-16 border border-slate-100"
                      />
                      <p className="text-[8px] font-bold mt-1 uppercase text-slate-400">Scan to Verify</p>
                  </div>
                  <div className="w-[45%] text-center">
                      <p className="text-[14px] font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                      <p className="text-[13px] font-bold underline decoration-[1.5px] underline-offset-[5px] mt-1">Độc lập - Tự do - Hạnh phúc</p>
                      <p className="text-[11px] mt-3 text-slate-600 italic">Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
                  </div>
              </div>

          <div className="text-center mb-10">
              <h1 className="text-[22px] font-black uppercase tracking-widest break-words leading-tight underline underline-offset-8 decoration-slate-300">
                  {['APPROVED', 'READY_TO_ISSUE', 'PARTIALLY_ISSUED', 'WAITING_HANDOVER', 'COMPLETED', 'PARTIALLY_APPROVED'].includes(data.status) 
                      ? 'PHIẾU CẤP PHÁT VĂN PHÒNG PHẨM' 
                      : 'PHIẾU ĐỀ XUẤT VĂN PHÒNG PHẨM'}
              </h1>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-2 gap-y-4 gap-x-12 mb-10 text-sm">
              <div className="flex items-end"><span className="w-40 font-bold shrink-0">Người đề xuất:</span> <span className="flex-1 border-b border-dotted border-black pb-0.5">{data.requester?.fullName}</span></div>
              <div className="flex items-end"><span className="w-40 font-bold shrink-0">Phòng ban:</span> <span className="flex-1 border-b border-dotted border-black pb-0.5">{data.department}</span></div>
              <div className="flex items-end"><span className="w-40 font-bold shrink-0">Ngày lập phiếu:</span> <span className="flex-1 border-b border-dotted border-black pb-0.5">{new Date(data.createdAt).toLocaleDateString('vi-VN')}</span></div>
              <div className="flex items-end"><span className="w-40 font-bold shrink-0">Loại yêu cầu:</span> <span className="flex-1 border-b border-dotted border-black pb-0.5">{data.requestType}</span></div>
              <div className="col-span-2 flex items-end"><span className="w-40 font-bold shrink-0">Lý do / Mục đích:</span> <span className="flex-1 border-b border-dotted border-black pb-0.5 italic">"{data.purpose || 'Không có ghi chú'}"</span></div>
          </div>

          <table className="w-full border-collapse border border-black text-[13px] mb-12 print-table">
              <thead className="bg-slate-100">
                  <tr>
                      <th className="border border-black p-2 text-center font-bold uppercase" style={{width: '5%'}}>STT</th>
                      <th className="border border-black p-2 text-center font-bold uppercase" style={{width: '10%'}}>Mã VT</th>
                      <th className="border border-black p-2 text-left font-bold uppercase" style={{width: '30%'}}>Tên Văn Phòng Phẩm</th>
                      <th className="border border-black p-2 text-center font-bold uppercase" style={{width: '7%'}}>ĐVT</th>
                      <th className="border border-black p-2 text-center font-bold uppercase" style={{width: '8%'}}>S.Lượng</th>
                      <th className="border border-black p-2 text-right font-bold uppercase" style={{width: '12%'}}>Đơn giá</th>
                      <th className="border border-black p-2 text-right font-bold uppercase" style={{width: '14%'}}>Thành tiền</th>
                      <th className="border border-black p-2 text-left font-bold uppercase" style={{width: '14%'}}>Ghi chú</th>
                  </tr>
              </thead>
               <tbody>
                  {sortLinesForPrinting(data.lines)
                    .filter((l: any) => {
                      if (selectedPrintType === 'ALL') return true;
                      const type = l.item.itemType || (l.item.mvpp.startsWith('VPP') ? 'VPP' : 'VE_SINH');
                      return type === selectedPrintType;
                    })
                    .map((l: any, idx: number) => {
                      const displayItem = l.replacementItem || l.item;
                      const isReplaced = !!l.replacementItemId;
                      const displayQtyRequested = l.qtyRequested;
                      const displayQtyApproved = l.replacementQty ?? l.qtyApproved;

                      return (
                      <tr key={l.id} className="h-10">
                          <td className="border border-black p-2 text-center font-medium">{idx + 1}</td>
                          <td className="border border-black p-2 text-center font-bold">{displayItem.mvpp}</td>
                          <td className="border border-black p-2 font-medium">
                              <div className="flex flex-col">
                                  <span>{displayItem.name}</span>
                                  {isReplaced && (
                                      <span className="text-[10px] text-slate-500 italic mt-0.5">
                                          (Thay cho: {l.item.name})
                                      </span>
                                  )}
                              </div>
                          </td>
                          <td className="border border-black p-2 text-center">{displayItem.unit}</td>
                          <td className="border border-black p-2 text-center font-black text-base">
                              {displayQtyApproved !== null && (displayQtyApproved !== displayQtyRequested || l.qtyManagerApproved !== displayQtyRequested) ? (
                                  <div className="flex flex-col items-center leading-none">
                                      <span className="text-[9px] text-slate-400 line-through mb-1">{displayQtyRequested}</span>
                                      <span>{displayQtyApproved}</span>
                                      {l.qtyManagerApproved !== null && l.qtyManagerApproved !== displayQtyApproved && !isReplaced && (
                                        <span className="text-[8px] font-bold text-slate-400 mt-1 italic">
                                          (TBP: {l.qtyManagerApproved})
                                        </span>
                                      )}
                                  </div>
                              ) : (
                                  displayQtyApproved ?? displayQtyRequested
                              )}
                          </td>
                          <td className="border border-black p-2 text-right font-medium">
                              {(displayItem.price || 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="border border-black p-2 text-right font-bold">
                              {((displayItem.price || 0) * (displayQtyApproved ?? displayQtyRequested)).toLocaleString('vi-VN')}
                          </td>
                          <td className="border border-black p-2 text-[10px] italic leading-tight">{l.note || '—'}</td>
                      </tr>
                    )})}
                  <tr className="bg-slate-50 h-10 font-black">
                      <td colSpan={4} className="border border-black p-2 text-right uppercase text-xs">Tổng cộng:</td>
                      <td className="border border-black p-2 text-center text-lg">
                          {data.lines.reduce((sum: number, line: any) => sum + (line.qtyApproved ?? line.qtyRequested), 0)}
                      </td>
                      <td className="border border-black p-2 text-right" colSpan={2}>
                          {data.lines.reduce((sum: number, line: any) => {
                            const item = line.replacementItem || line.item;
                            const qty = line.qtyApproved ?? line.qtyRequested;
                            return sum + ((item.price || 0) * qty);
                          }, 0).toLocaleString('vi-VN')} VNĐ
                      </td>
                      <td className="border border-black p-2"></td>
                  </tr>
              </tbody>
          </table>

          <div className="grid grid-cols-3 gap-y-12 gap-x-4 text-center text-[12px] font-bold mt-8 print-signatures">
              <div className="flex flex-col h-full">
                  <p className="mb-2 uppercase">Người đề xuất</p>
                  <p className="text-[11px] font-normal italic mb-4">(Ký và ghi họ tên)</p>
                  <div className="mt-20 border-t border-dotted border-black w-[80%] mx-auto pt-2 relative">
                      <p className="font-black text-xs uppercase">{data.requester?.fullName}</p>
                      <p className="text-[9px] font-bold text-blue-600 mt-1">
                        {new Date(data.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} (Đã ký số)
                      </p>
                  </div>
              </div>
              
              <div className="flex flex-col h-full">
                  <p className="mb-2 uppercase text-slate-600">Trưởng bộ phận</p>
                  <p className="text-[11px] font-normal italic mb-4">(Ký xác nhận)</p>
                  <div className="mt-20 border-t border-dotted border-black w-[80%] mx-auto pt-2">
                     {(() => {
                        const h = data.approvalHistories?.slice().reverse().find((x:any) => 
                          (x.action.includes('APPROVE') || x.action === 'APPROVED') && 
                          (x.approver?.role === 'MANAGER' || x.action.includes('TBP') || x.reason?.toLowerCase().includes('quản lý'))
                        );
                        return (
                          <>
                            {h && <p className="text-[10px] font-bold text-blue-600 mb-1">(Đã ký số)</p>}
                            <p className="font-black text-xs uppercase">{h?.approver?.fullName || '............................'}</p>
                            {h && (
                              <p className="text-[9px] font-normal text-slate-500 mt-1">
                                {new Date(h.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </>
                        );
                     })()}
                  </div>
              </div>

              <div className="flex flex-col h-full">
                  <p className="mb-2 uppercase">Người duyệt</p>
                  <p className="text-[11px] font-normal italic mb-4">(Hành chính/Lãnh đạo)</p>
                  <div className="mt-20 border-t border-dotted border-black w-[80%] mx-auto pt-2">
                     {(() => {
                        const h = data.approvalHistories?.slice().reverse().find((x:any) => 
                          (x.action.includes('APPROVE') || x.action === 'APPROVED') && 
                          (x.approver?.role === 'ADMIN' || x.action.includes('ADMIN') || x.reason?.toLowerCase().includes('hành chính'))
                        );
                        return (
                          <>
                            {h && <p className="text-[10px] font-bold text-blue-600 mb-1">(Đã ký số)</p>}
                            <p className="font-black text-xs uppercase">{h?.approver?.fullName || '............................'}</p>
                            {h && (
                              <p className="text-[9px] font-normal text-slate-500 mt-1">
                                {new Date(h.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </>
                        );
                     })()}
                  </div>
              </div>

              <div className="flex flex-col h-full">
                  <p className="mb-2 uppercase">Thủ kho / Xuất</p>
                  <p className="text-[11px] font-normal italic mb-4">(Ký và ghi tên)</p>
                  <div className="mt-20 border-t border-dotted border-black w-[80%] mx-auto pt-2">
                     {(() => {
                        const h = data.approvalHistories?.slice().reverse().find((x:any) => x.action === 'ISSUE' || x.action === 'ISSUED');
                        return (
                          <>
                            {h && <p className="text-[10px] font-bold text-blue-600 mb-1">(Đã ký số)</p>}
                            <p className="font-black text-xs uppercase">{h?.approver?.fullName || '............................'}</p>
                            {h && (
                              <p className="text-[9px] font-normal text-slate-500 mt-1">
                                {new Date(h.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </>
                        );
                     })()}
                  </div>
              </div>

              <div className="flex flex-col h-full">
                  <p className="mb-2 uppercase text-indigo-700">Người nhận</p>
                  <p className="text-[11px] font-normal italic mb-4">(Ký nhận đủ hàng)</p>
                  <div className="mt-24 border-t border-dotted border-black w-[70%] mx-auto pt-2">
                     <p className="font-black text-xs uppercase">
                        {data.status === 'COMPLETED' ? data.requester?.fullName : '............................'}
                     </p>
                     {data.status === 'COMPLETED' && (
                         <p className="text-[9px] font-normal text-slate-400 italic">Đã nhận đủ hàng</p>
                     )}
                  </div>
              </div>
              
              <div className="flex flex-col h-full">
                  {/* Empty Spacer */}
              </div>
          </div>

          {/* Audit Trail Section for Print */}
          <div className="mt-12 border-t border-slate-300 pt-6">
              <h3 className="text-[11px] font-black uppercase mb-3 text-slate-800 tracking-widest flex items-center">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mr-2"></span>
                  Lịch sử Xử lý (Audit Trail)
              </h3>
              <table className="w-full border-collapse text-[10px] print-table">
                  <thead>
                      <tr className="bg-slate-50">
                          <th className="border border-slate-300 p-1.5 text-left font-bold uppercase w-32">Thời gian</th>
                          <th className="border border-slate-300 p-1.5 text-left font-bold uppercase w-48">Người thực hiện</th>
                          <th className="border border-slate-300 p-1.5 text-left font-bold uppercase w-32">Hành động</th>
                          <th className="border border-slate-300 p-1.5 text-left font-bold uppercase">Ghi chú / Nội dung</th>
                      </tr>
                  </thead>
                  <tbody>
                      {/* Creation Event manually prepended to match the UI full audit trail */}
                      <tr className="hover:bg-slate-50/50">
                          <td className="border border-slate-300 p-1.5 whitespace-nowrap">
                              {new Date(data.createdAt).toLocaleString('vi-VN', { 
                                  day: '2-digit', month: '2-digit', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                              })}
                          </td>
                          <td className="border border-slate-300 p-1.5 font-bold uppercase text-slate-700">
                              {data.requester?.fullName}
                          </td>
                          <td className="border border-slate-300 p-1.5">
                              <span className="px-1.5 py-0.5 rounded-sm font-bold text-[9px] bg-slate-100 text-slate-600">
                                  Tạo phiếu
                              </span>
                          </td>
                          <td className="border border-slate-300 p-1.5 italic text-slate-600">
                              Khởi tạo yêu cầu
                          </td>
                      </tr>
                      {data.approvalHistories?.map((h: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="border border-slate-300 p-1.5 whitespace-nowrap">
                                  {new Date(h.createdAt).toLocaleString('vi-VN', { 
                                      day: '2-digit', month: '2-digit', year: 'numeric',
                                      hour: '2-digit', minute: '2-digit'
                                  })}
                              </td>
                              <td className="border border-slate-300 p-1.5 font-bold uppercase text-slate-700">
                                  {h.approver?.fullName} {h.approver?.role === 'ADMIN' ? '(ADM)' : ''}
                              </td>
                              <td className="border border-slate-300 p-1.5">
                                  <span className={`px-1.5 py-0.5 rounded-sm font-bold text-[9px] ${
                                      h.action.includes('REJECT') ? 'bg-rose-50 text-rose-700' :
                                      h.action.includes('APPROVE') ? 'bg-emerald-50 text-emerald-700' :
                                      'bg-slate-100 text-slate-600'
                                  }`}>
                                      {getActionLabel(h.action)}
                                  </span>
                              </td>
                              <td className="border border-slate-300 p-1.5 italic text-slate-600">
                                  {h.reason || '—'}
                              </td>
                          </tr>
                      ))}
                      {(!data.approvalHistories || data.approvalHistories.length === 0) && (
                          <tr>
                              <td colSpan={4} className="border border-slate-300 p-4 text-center text-slate-400 italic">
                                  Chưa có lịch sử xử lý.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
              <p className="mt-2 text-[8px] text-slate-400 text-right italic">HỆ THỐNG TRÍCH XUẤT LÚC {new Date().toLocaleTimeString('vi-VN')}</p>
          </div>
          
          <div className="mt-auto pt-4 border-t border-slate-200 text-[11px] text-[#555] flex justify-between print-info">
              <p>Ngày in: {new Date().toLocaleString('vi-VN')} • Mã tra cứu: {data.id}</p>
              <p>Hệ thống Quản lý VPP - {data.id} • Trang 1/1</p>
          </div>
        </div>
      </div>

      {/* MODAL: FULL AUDIT TRAIL */}
      {showFullHistory && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white shrink-0">
                      <div>
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase">Chi tiết Lịch sử Xử lý</h3>
                        <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-[0.2em] mt-1 italic">Audit Trail for {data.id}</p>
                      </div>
                      <button onClick={()=>setShowFullHistory(false)} className="text-indigo-100 hover:text-white transition p-2 hover:bg-white/10 rounded-full">
                          <XCircle className="w-8 h-8"/>
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                      <div className="relative pl-8 border-l-4 border-slate-100 space-y-12">
                          {/* Start Point */}
                          <div className="relative">
                              <div className="absolute -left-[42px] top-0 w-8 h-8 rounded-full bg-slate-200 ring-8 ring-white flex items-center justify-center">
                                  <Plus className="w-4 h-4 text-slate-500" />
                              </div>
                              <div>
                                  <p className="text-base font-black text-slate-800 uppercase tracking-tight">Khởi tạo phiếu đề xuất</p>
                                  <p className="text-xs font-bold text-slate-400 mt-1">{new Date(data.createdAt).toLocaleString('vi-VN')} • <span className="text-indigo-600 font-black">{data.requester?.fullName}</span></p>
                                  <p className="mt-3 text-sm text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">"Hệ thống ghi nhận việc tạo mới phiếu yêu cầu định kỳ"</p>
                              </div>
                          </div>

                          {/* Full History */}
                           {data.approvalHistories?.map((audit: any) => {
                              const getActionColor = (action: string) => {
                                if (action.includes('REJECT') || action === 'CANCEL') return 'bg-rose-500 text-white';
                                if (action.includes('APPROVE')) return 'bg-emerald-500 text-white';
                                if (action.includes('RETURN')) return 'bg-orange-500 text-white';
                                if (action === 'ISSUE') return 'bg-blue-500 text-white';
                                if (action === 'SUBMIT') return 'bg-indigo-500 text-white';
                                return 'bg-slate-400 text-white';
                              };

                              return (
                                  <div key={audit.id} className="relative">
                                      <div className={`absolute -left-[42px] top-0 w-8 h-8 rounded-full ring-8 ring-white flex items-center justify-center shadow-lg ${getActionColor(audit.action)}`}>
                                          <Check className="w-4 h-4 stroke-[3]" />
                                      </div>
                                      <div>
                                          <div className="flex items-center gap-3">
                                              <p className="text-base font-black text-slate-800 uppercase tracking-tight">{getActionLabel(audit.action)}</p>
                                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${getActionColor(audit.action).split(' ')[0]} bg-opacity-10 text-opacity-100`}>
                                                  Verified
                                              </span>
                                          </div>
                                          <p className="text-xs font-bold text-slate-400 mt-1">{new Date(audit.createdAt).toLocaleString('vi-VN')} • <span className="text-indigo-600 font-black">{audit.approver?.fullName}</span></p>
                                          {audit.reason && (
                                              <div className="mt-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 relative overflow-hidden">
                                                  <div className="absolute left-0 top-0 w-1 h-full bg-slate-200"></div>
                                                  <p className="text-sm font-bold text-slate-600 leading-relaxed italic break-words">
                                                      "{audit.reason}"
                                                  </p>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}

                          {data.status === 'COMPLETED' && (
                              <div className="relative">
                                  <div className="absolute -left-[42px] top-0 w-8 h-8 rounded-full bg-emerald-500 ring-8 ring-white flex items-center justify-center shadow-lg shadow-emerald-200 text-white">
                                      <CheckCircle className="w-5 h-5" />
                                  </div>
                                  <div>
                                      <p className="text-base font-black text-emerald-600 uppercase tracking-widest italic">Quy trình hoàn tất</p>
                                      <p className="text-xs font-bold text-slate-400 mt-1">Hệ thống đã tự động đóng phiếu sau khi các bên xác nhận.</p>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
                  
                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                      <button onClick={()=>setShowFullHistory(false)} className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg">Đóng lại</button>
                  </div>
              </div>
          </div>
      )}
      </div>
    );
}
