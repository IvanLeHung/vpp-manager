import { useState, useEffect } from 'react';
import { XCircle, Printer, CheckCircle, RefreshCw, ArrowLeft, Archive, CheckSquare, Trash2, StopCircle, AlertTriangle, ShoppingCart, CornerUpLeft, Clock } from 'lucide-react';
import api from '../../lib/api';
import type { User } from '../../context/AppContext';
import type { ViewMode } from '../Requests';

interface Props {
  requestId: string;
  setViewMode: (mode: ViewMode) => void;
  refreshData: () => Promise<void>;
  showToast: (m: string, t?: 'success' | 'error' | 'warning') => void;
  currentUser: User;
}

export default function RequestsDetail({ requestId, setViewMode, refreshData, showToast, currentUser }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  
  // Custom approvals
  const [approvals, setApprovals] = useState<{lineId: string, qtyApproved: number}[]>([]);
  // Custom issues
  const [issues, setIssues] = useState<{lineId: string, qtyDelivered: number}[]>([]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/requests/${requestId}`);
      setData(res.data);
      // Init modal states
      setApprovals(res.data.lines.map((l:any) => ({ lineId: l.id, qtyApproved: l.qtyRequested })));
      setIssues(res.data.lines.map((l:any) => ({ lineId: l.id, qtyDelivered: l.qtyApproved ?? l.qtyRequested })));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi tải phiếu', 'error');
      setViewMode('LIST');
    } finally {
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
      case 'PARTIALLY_ISSUED': case 'PARTIALLY_APPROVED': return 'bg-teal-500 text-white shadow-teal-500/30';
      case 'RETURNED': return 'bg-orange-500 text-white shadow-orange-500/30';
      case 'WAITING_HANDOVER': return 'bg-blue-500 text-white shadow-blue-500/30';
      case 'PENDING_MANAGER': case 'PENDING_ADMIN': return 'bg-amber-500 text-white shadow-amber-500/30';
      default: return 'bg-slate-500 text-white cursor-help';
    }
  };

  const handleAction = async (actionPath: string, payload: any = {}, successMsg: string) => {
    try {
      await api.post(`/requests/${requestId}${actionPath}`, payload);
      showToast(successMsg);
      await refreshData();
      setViewMode('LIST');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Thao tác thất bại', 'error');
    }
  };

  const printDocument = async () => {
      window.print();
      try { await api.post(`/requests/${requestId}/print`, { printType: 'FOR_RECORDS' }); } catch(e) {}
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col h-full bg-slate-50 relative items-center justify-center">
         <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
         <p className="font-bold text-slate-500">Đang tải dữ liệu phiếu...</p>
      </div>
    );
  }

  const userId = currentUser.id || currentUser.userId;
  const isApprover = (data.status === 'PENDING_MANAGER' && data.currentApproverId === userId) || 
                     (data.status === 'PENDING_ADMIN' && currentUser.role === 'ADMIN');
  const isManagerInChain = currentUser.role === 'MANAGER' && data.approvalSteps?.some((s: any) => s.approverId === userId);
  const isFutureApprover = isManagerInChain && data.status === 'PENDING_MANAGER' && data.currentApproverId !== userId;


  const isWarehouse = (currentUser.role === 'WAREHOUSE' || currentUser.role === 'ADMIN') && ['APPROVED', 'READY_TO_ISSUE', 'PARTIALLY_ISSUED', 'PARTIALLY_APPROVED'].includes(data.status);
  const isOwnerDraft = (currentUser.id || currentUser.userId) === data.requesterId && (data.status === 'DRAFT' || data.status === 'RETURNED');
  const isOwnerPending = (currentUser.id || currentUser.userId) === data.requesterId && (data.status === 'PENDING_MANAGER' || data.status === 'PENDING_ADMIN');
  const canCancel = ['DRAFT', 'PENDING_MANAGER', 'PENDING_ADMIN', 'RETURNED', 'APPROVED', 'READY_TO_ISSUE'].includes(data.status) && (currentUser.role !== 'EMPLOYEE' || (currentUser.id || currentUser.userId) === data.requesterId);
  const isHandover = (userId === data.requesterId || currentUser.role === 'ADMIN') && data.status === 'WAITING_HANDOVER';
  const canCreatePO = currentUser.role === 'ADMIN' && 
                      ['APPROVED', 'READY_TO_ISSUE', 'PARTIALLY_ISSUED', 'PARTIALLY_APPROVED'].includes(data.status) &&
                      data.lines.some((l:any) => l.qtyRequested > (l.qtyApproved ?? 0));

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden relative print:bg-white print:overflow-auto">
      {/* HEADER BAR */}
      <div className="h-20 bg-white border-b border-slate-200 flex justify-between items-center px-6 md:px-10 shrink-0 z-20 shadow-sm print:hidden">
          <div className="flex items-center gap-6">
              <button onClick={() => setViewMode('LIST')} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition shadow-inner">
                  <ArrowLeft className="w-5 h-5"/>
              </button>
              <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
                    {data.id} 
                    {data.priority === 'Khẩn cấp' && <span className="ml-3 text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded uppercase tracking-wider animate-pulse shadow-sm shadow-rose-500/50">Khẩn cấp</span>}
                  </h2>
                  <p className="text-sm font-semibold text-slate-500 mt-0.5">{data.requestType} • Lập lúc {new Date(data.createdAt).toLocaleString('vi-VN')}</p>
              </div>
          </div>
          <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg ${getStatusColor(data.status)}`}>{data.status.replace(/_/g, ' ')}</span>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col xl:flex-row gap-6 w-full max-w-[1400px] mx-auto print:p-0">
          
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
                      {['REJECTED', 'RETURNED', 'CANCELLED'].includes(data.status) && (
                          <div className="md:col-span-2 bg-rose-50 border border-rose-200 rounded-xl p-4 mt-2">
                              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Lý do {data.status}</p>
                              <p className="font-bold text-rose-700">{data.rejectReason || data.returnReason || data.cancelReason}</p>
                          </div>
                      )}
                      {/* Hierarchical Warning Alert */}
                      {!isApprover && currentUser.role === 'MANAGER' && data.requester?.managerId === currentUser.userId && data.status === 'PENDING_ADMIN' && (
                          <div className="md:col-span-2 bg-indigo-50 border border-indigo-200 rounded-xl p-4 mt-2 flex items-center gap-3">
                              <CheckCircle className="w-5 h-5 text-indigo-500" />
                              <div>
                                  <p className="text-xs font-black text-indigo-700 uppercase tracking-widest">Bạn đã duyệt phiếu này</p>
                                  <p className="text-[10px] text-indigo-600 font-medium italic">Đang chờ bộ phận Hành chính (Admin) phê duyệt cấp cuối.</p>
                              </div>
                          </div>
                      )}
                      {!isApprover && currentUser.role === 'MANAGER' && data.currentApproverId !== currentUser.userId && data.status === 'PENDING_MANAGER' && (
                          <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4 mt-2 flex items-center gap-3">
                              <AlertTriangle className="w-5 h-5 text-amber-500" />
                              <div>
                                  <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Phiếu chưa đến lượt bạn duyệt hoặc không thuộc quyền xử lý</p>
                                  <p className="text-[10px] text-amber-600 font-medium italic">Chỉ quản lý được chỉ định trong luồng mới có thể thực hiện thao tác duyệt lúc này.</p>
                              </div>
                          </div>
                      )}
                  </div>
              </div>

              {/* Box 2: Lines Grid */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative print:shadow-none print:border-none">
                  <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                     <h3 className="text-[11px] font-black text-indigo-700 uppercase tracking-widest">Chi tiết Vật tư Xin Cấp</h3>
                     {data.lines.some((l:any) => l.qtyRequested > (l.item.stocks?.[0]?.quantityOnHand||0)) && <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-3 py-1 rounded border border-rose-200 flex items-center print:hidden"><AlertTriangle className="w-3.5 h-3.5 mr-1"/> Cảnh báo thiếu Tồn Kho Hiện Tại</span>}
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left whitespace-nowrap min-w-max">
                          <thead className="bg-white border-b border-slate-200">
                              <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                                  <th className="p-4 text-center w-12 border-r border-slate-100">STT</th>
                                  <th className="p-4">Vật tư / Hàng hóa</th>
                                  <th className="p-4 text-center border-x border-slate-100 bg-slate-50/50">SL Xin</th>
                                  <th className="p-4 text-center text-emerald-600 bg-emerald-50/30">SL Duyệt</th>
                                  <th className="p-4 text-center text-blue-600 bg-blue-50/30">Lấy thực</th>
                                  <th className="p-4">Ghi Chú</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {data.lines.map((l:any, idx:number) => {
                                  const currentStock = l.item.stocks?.[0]?.quantityOnHand || 0;
                                  const outOfStock = l.qtyRequested > currentStock;
                                  return (
                                  <tr key={l.id} className={`hover:bg-slate-50 transition border-l-4 ${outOfStock && data.status.startsWith('PENDING') ? 'border-l-rose-500 bg-rose-50/30' : 'border-l-transparent'}`}>
                                      <td className="p-4 text-center font-bold text-slate-400 border-r border-slate-100">{idx+1}</td>
                                      <td className="p-4">
                                          <p className="font-bold text-slate-800 text-sm">{l.item.name}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                             <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black tracking-widest">{l.item.mvpp}</span>
                                             {data.status.startsWith('PENDING') && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${outOfStock ? 'bg-rose-50 text-rose-600 border-rose-200':'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>Tồn: {currentStock}</span>}
                                          </div>
                                      </td>
                                      <td className="p-4 text-center border-x border-slate-100 bg-slate-50/50">
                                          <span className="font-black text-lg text-indigo-700">{l.qtyRequested}</span> <span className="text-[10px] font-bold text-slate-400">{l.item.unit}</span>
                                      </td>
                                      <td className="p-4 text-center bg-emerald-50/30">
                                          <span className="font-black text-lg text-emerald-600">{l.qtyApproved ?? '-'}</span>
                                      </td>
                                      <td className="p-4 text-center bg-blue-50/30">
                                          <span className="font-black text-lg text-blue-600">{l.qtyDelivered ?? 0}</span>
                                          {l.qtyDelivered > 0 && l.qtyDelivered < (l.qtyApproved ?? l.qtyRequested) && <p className="text-[10px] font-bold text-amber-600 mt-1">Nợ: {(l.qtyApproved ?? l.qtyRequested) - l.qtyDelivered}</p>}
                                      </td>
                                      <td className="p-4 text-slate-600 text-sm font-medium">{l.note || '-'}</td>
                                  </tr>
                              )})}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          {/* RIGHT COLUMN: Actions & History */}
          <div className="w-full xl:w-96 flex flex-col gap-6 shrink-0 print:hidden">
              
              {/* Card 1: Trạng thái hiện tại */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Trạng thái hiện tại</h3>
                  <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(data.status)}`}>
                         {data.status.replace(/_/g, ' ')}
                      </span>
                      {/* SLA Check */}
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                         Trong hạn
                      </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mt-2">
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mức độ ưu tiên</p>
                       <p className="text-sm font-black text-slate-800">{data.priority}</p>
                       
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 mt-3">Bộ phận đang xử lý</p>
                       <p className="text-sm font-bold text-indigo-700">{
                           data.status === 'PENDING_MANAGER' ? 'Quản lý (Cấp 1)' :
                           data.status === 'PENDING_ADMIN' ? 'Hành chính (Duyệt cuối)' :
                           ['APPROVED','READY_TO_ISSUE','PARTIALLY_ISSUED'].includes(data.status) ? 'Kho xuất hàng' :
                           data.status === 'WAITING_HANDOVER' ? 'Chờ xác nhận bàn giao' :
                           data.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Đã đóng'
                       }</p>
                  </div>
              </div>

              {/* Card 2: Thao Tác (Action) */}
              {(isApprover || isOwnerDraft || isWarehouse || isOwnerPending || canCancel || isHandover || isFutureApprover || canCreatePO) && (
               <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-200 p-6 relative overflow-hidden">
                    {(isApprover || isWarehouse) && <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-20"></div>}
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 relative z-10">Thao tác xử lý</h3>
                    <div className="flex flex-col gap-4 relative z-10">
                       
                       {/* --- INFO CHO NGƯỜI DUYỆT TƯƠNG LAI --- */}
                       {isFutureApprover && (
                           <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                               <p className="text-xs font-bold text-amber-700 flex items-center mb-1">
                                   <AlertTriangle className="w-4 h-4 mr-1.5"/> Phiếu chưa đến lượt
                               </p>
                               <p className="text-[10px] text-amber-600 font-medium">Bạn có thẩm quyền trong tuyến duyệt của phiếu này, nhưng hiện đang chờ cấp dưới duyệt.</p>
                           </div>
                       )}

                       {/* --- THAO TÁC CỦA NGƯỜI LẬP --- */}
                       {isOwnerDraft && (
                           <button onClick={() => setViewMode('CREATE')} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20">Tiếp Tục Chỉnh Sửa</button>
                       )}
                       {isOwnerPending && (
                            <button onClick={() => handleAction('/withdraw', {reason:'Xin rút lại để sửa'}, 'Đã rút phiếu thành công')} className="w-full py-3 bg-white text-slate-700 border border-slate-300 rounded-xl font-bold hover:bg-slate-50 transition">Thu hồi sửa đổi</button>
                       )}

                       {/* --- THAO TÁC CỦA QUẢN LÝ / ADMIN DUYỆT --- */}
                       {isApprover && (
                           <div className="p-5 bg-indigo-50 rounded-2xl border-2 border-indigo-100 flex flex-col gap-4 shadow-inner">
                              <p className="text-[11px] font-black text-indigo-800 text-center uppercase tracking-[0.2em] mb-2">Bạn là người duyệt hiện tại</p>
                              <button onClick={() => setShowApproveModal(true)} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30 flex items-center justify-center transform hover:scale-[1.02] border border-indigo-500">
                                  <CheckSquare className="w-5 h-5 mr-2"/> PHÊ DUYỆT NGAY
                              </button>
                              <div className="flex gap-3">
                                 <button onClick={() => handleAction('/return', {reason: prompt('Lý do yêu cầu làm lại?')}, 'Đã trả lại')} className="flex-1 py-2.5 bg-white text-amber-600 hover:bg-amber-50 hover:text-amber-700 border border-amber-300 rounded-xl font-bold transition flex justify-center items-center">
                                     <CornerUpLeft className="w-4 h-4 mr-1.5"/> Trả Lại
                                 </button>
                                 <button onClick={() => setShowRejectModal(true)} className="flex-1 py-2.5 bg-white text-rose-500 hover:bg-rose-50 hover:text-rose-600 border border-rose-300 rounded-xl font-bold transition flex justify-center items-center">
                                     <XCircle className="w-4 h-4 mr-1.5"/> Từ Chối
                                 </button>
                              </div>
                           </div>
                       )}

                       {/* --- THAO TÁC CỦA KHO --- */}
                       {isWarehouse && (
                            <button onClick={() => setShowIssueModal(true)} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 flex items-center justify-center transform hover:scale-[1.02] border border-blue-500"><Archive className="w-5 h-5 mr-2"/> XUẤT KHO THỰC TẾ</button>
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
                            }} className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition shadow-md shadow-amber-500/20 flex items-center justify-center border border-amber-500"><ShoppingCart className="w-4 h-4 mr-2"/> TẠO ĐƠN MUA SẮM</button>
                       )}

                       {/* --- XÁC NHẬN BÀN GIAO --- */}
                       {isHandover && (
                           <button onClick={() => {
                               if(window.confirm('Xác nhận bạn đã nhận đủ vật tư từ kho theo đúng số lượng thực giao?')) {
                                   handleAction('/confirm_receipt', {}, 'Bàn giao thành công. Phiếu đã được đóng!');
                               }
                           }} className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/30 flex items-center justify-center transform hover:scale-[1.02] mt-2 border border-emerald-500"><CheckCircle className="w-5 h-5 mr-2"/> ĐÃ NHẬN ĐỦ HÀNG</button>
                       )}

                       {canCancel && <div className="mt-2 pt-4 border-t border-slate-100">
                           <button onClick={() => handleAction('/cancel', {reason: prompt('Nhập lý do hủy phiếu:')}, 'Đã Hủy phiếu')} className="w-full py-2.5 bg-transparent text-slate-500 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center rounded-xl font-semibold transition text-sm">
                               <Trash2 className="w-4 h-4 mr-1.5"/> Hủy Bỏ Phiếu Này
                           </button>
                       </div>}
                       
                       {(data.status === 'APPROVED' || data.status === 'READY_TO_ISSUE' || data.status === 'WAITING_HANDOVER' || data.status === 'COMPLETED') && (
                          <div className="mt-2 pt-4 border-t border-slate-100">
                            <button onClick={printDocument} className="w-full py-2.5 bg-white text-slate-800 hover:bg-slate-100 flex items-center justify-center rounded-xl font-bold transition shadow-sm border border-slate-200"><Printer className="w-4 h-4 mr-2"/> In Lệnh Xuất Kho</button>
                          </div>
                       )}
                   </div>
               </div>
              )}

              {/* Card 3: Tuyến Duyệt Cấu Hình */}
              {data.approvalSteps && data.approvalSteps.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col relative overflow-hidden">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">Tuyến Phê Duyệt</h3>
                  <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                    {data.approvalSteps.map((step: any) => {
                       const isCurrent = step.status === 'PENDING' && step.stepNo === data.currentApprovalStep && data.status === 'PENDING_MANAGER';
                       const isDone = step.status === 'APPROVED';
                       const isBypassed = step.status === 'SKIPPED';
                       
                       return (
                      <div key={step.id} className="relative flex items-center gap-4 z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-4 ${
                          isDone ? 'bg-emerald-500 border-white text-white' :
                          isCurrent ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-4 ring-indigo-50' :
                          isBypassed ? 'bg-slate-200 border-white text-slate-400' :
                          'bg-white border-slate-200 text-slate-400'
                        }`}>
                           {isDone ? <CheckCircle className="w-4 h-4"/> : <span>{step.stepNo}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className={`text-sm font-bold truncate ${isCurrent ? 'text-indigo-700' : isDone ? 'text-slate-800' : 'text-slate-500'}`}>{step.approver?.fullName || 'N/A'}</p>
                           <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">{step.status}</p>
                        </div>
                        {isCurrent && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>}
                      </div>
                    )})}
                    {/* Final Step Agent */}
                    <div className="relative flex items-center gap-4 z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-4 ${
                          data.status === 'PENDING_ADMIN' ? 'bg-amber-500 border-white text-white ring-4 ring-amber-50 animate-pulse' :
                          ['APPROVED','READY_TO_ISSUE','PARTIALLY_ISSUED','WAITING_HANDOVER','COMPLETED'].includes(data.status) ? 'bg-emerald-500 border-white text-white' :
                          'bg-white border-slate-200 text-slate-400'
                        }`}>
                           {['APPROVED', 'READY_TO_ISSUE', 'WAITING_HANDOVER', 'COMPLETED', 'PARTIALLY_ISSUED'].includes(data.status) ? <CheckCircle className="w-4 h-4"/> : <span className="text-[10px] uppercase font-black shrink-0">AD</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className={`text-sm font-bold truncate ${data.status === 'PENDING_ADMIN' ? 'text-amber-700' : ['APPROVED','READY_TO_ISSUE','WAITING_HANDOVER','COMPLETED'].includes(data.status) ? 'text-slate-800' : 'text-slate-500'}`}>Hành chính (Admin)</p>
                           <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Duyệt cấp cuối</p>
                        </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card 4: Approval Timeline */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col flex-1 min-h-[300px]">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Lịch sử (Audit Trail)</h3>
                  <div className="relative pl-4 space-y-6 flex-1 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                      
                      <div className="relative">
                          <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-slate-300 ring-4 ring-white"></div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                             <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Tạo đề xuất</p>
                             <p className="text-[10px] font-medium text-slate-500 mt-1 flex items-center"><Clock className="w-3 h-3 mr-1 opacity-70"/>{new Date(data.createdAt).toLocaleString('vi-VN')}</p>
                             <p className="text-xs font-bold text-indigo-700 mt-1">{data.requester?.fullName}</p>
                          </div>
                      </div>

                      {data.approvalHistories?.map((audit:any) => {
                          const actionColor = audit.action==='APPROVED'?'bg-emerald-500':audit.action.includes('ISSUED')?'bg-blue-500':audit.action==='COMPLETED'?'bg-indigo-500':audit.action==='REJECTED'||audit.action==='CANCELLED'?'bg-rose-500':'bg-amber-500';
                          return (
                          <div key={audit.id} className="relative">
                              <div className={`absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white ${actionColor}`}></div>
                              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                 <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
                                     {audit.action === 'APPROVED' ? 'Phê Duyệt' : audit.action.includes('ISSUED') ? 'Kho đã xuất' : audit.action === 'COMPLETED' ? 'Hoàn Tất' : audit.action === 'REJECTED' ? 'Từ chối' : audit.action}
                                 </p>
                                 <p className="text-[10px] font-medium text-slate-500 mt-1 flex items-center"><Clock className="w-3 h-3 mr-1 opacity-70"/>{new Date(audit.createdAt).toLocaleString('vi-VN')}</p>
                                 <p className="text-xs font-bold text-indigo-700 mt-1">{audit.approver?.fullName || 'Hệ thống'}</p>
                                 {audit.reason && <p className="text-[10px] font-medium text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-2 italic shadow-sm">"{audit.reason}"</p>}
                              </div>
                          </div>
                      )})}
                      
                      {data.status === 'COMPLETED' && (
                          <div className="relative">
                              <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-indigo-500 ring-4 ring-white animate-pulse"></div>
                              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                 <p className="text-[11px] font-black text-indigo-700 uppercase tracking-widest">Quy trình hoàn tất</p>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* MODAL PHÊ DUYỆT (Manager) */}
      {showApproveModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-500 text-white">
                      <h3 className="text-xl font-black">{data.status === 'PENDING_MANAGER' ? 'Trưởng BP Phê Duyệt Cấp 1' : 'Admin Phê Duyệt Cấp 2 (Điều chỉnh số lượng)'}</h3>
                      <button onClick={()=>setShowApproveModal(false)} className="text-emerald-100 hover:text-white transition"><XCircle className="w-7 h-7"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1">
                      {data.status === 'PENDING_ADMIN' && <p className="text-sm font-medium text-slate-600 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">Admin có thể điều chỉnh số lượng duyệt. Số lượng vượt Tồn Kho thực tế sẽ báo đỏ.</p>}
                      {data.status === 'PENDING_MANAGER' && <p className="text-sm font-medium text-slate-600 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">Trưởng phòng phê duyệt chuyển đơn lên bộ phận Hành chính. Việc cấp phát kho sẽ do bộ phận Hành chính quyết định.</p>}
                      
                      <table className="w-full text-left whitespace-nowrap">
                          <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400">
                             <tr>
                                <th className="p-3">Hàng Hóa</th>
                                <th className="p-3 text-center">Tồn Hiện Tại</th>
                                <th className="p-3 text-center">KH Yêu cầu</th>
                                {data.status === 'PENDING_ADMIN' && <th className="p-3 text-center bg-emerald-50 border-x-2 border-emerald-100">QUYẾT ĐỊNH DUYỆT CẤP</th>}
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {data.lines.map((l:any) => {
                                  let currentApprove = approvals.find((a:any)=>a.lineId===l.id)?.qtyApproved ?? l.qtyRequested;
                                  let currentStock = l.item.stocks?.[0]?.quantityOnHand || 0;
                                  let overStock = (currentApprove > currentStock);
                                  return (
                                  <tr key={l.id}>
                                      <td className="p-3 font-bold text-slate-700 text-sm whitespace-normal">{l.item.name}</td>
                                      <td className="p-3 text-center font-black text-slate-600">{currentStock}</td>
                                      <td className="p-3 text-center font-black text-indigo-700 bg-indigo-50 border border-transparent rounded">{l.qtyRequested}</td>
                                      {data.status === 'PENDING_ADMIN' && (
                                          <td className="p-3 border-x-2 border-emerald-100 bg-white">
                                              <input 
                                                 type="number" min="0" value={currentApprove} 
                                                 onChange={(e:any) => setApprovals(approvals.map((a:any) => a.lineId === l.id ? {...a, qtyApproved: parseInt(e.target.value)||0} : a))}
                                                 className={`w-full text-center py-2 bg-slate-100 border outline-none rounded-lg focus:ring-4 focus:bg-white font-black text-lg transition ${overStock ? 'text-rose-600 border-rose-300 ring-4 ring-rose-50':'text-emerald-700 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-100'}`}
                                              />
                                              {overStock && <p className="text-[9px] font-bold text-rose-500 text-center mt-1">Duyệt lố tồn!</p>}
                                          </td>
                                      )}
                                  </tr>
                              )})}
                          </tbody>
                      </table>
                  </div>
                  <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                      <button onClick={()=>setShowApproveModal(false)} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">Hủy Bỏ</button>
                      <button onClick={() => {
                          if (data.status === 'PENDING_ADMIN') {
                              const hasOverStock = data.lines.some((l:any) => (approvals.find((a:any)=>a.lineId===l.id)?.qtyApproved ?? l.qtyRequested) > (l.item.stocks?.[0]?.quantityOnHand || 0));
                              if (hasOverStock) {
                                  if (!window.confirm('Cảnh báo: Bạn đang duyệt Số lượng vượt quá Tồn Kho thực tế. Hệ thống sẽ báo nợ (Backorder) hoặc Kho không thể xuất dòng này. Vẫn tiếp tục?')) return;
                              }
                          }
                          handleAction('/approve', { lineApprovals: approvals }, 'Đã duyệt thành công!');
                          setShowApproveModal(false);
                      }} className="px-8 py-2.5 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/30 flex items-center"><CheckCircle className="w-5 h-5 mr-2"/> XÁC NHẬN PHÊ DUYỆT</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL TỪ CHỐI */}
      {showRejectModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
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

      {/* MODAL XUẤT KHO (Warehouse) */}
      {showIssueModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
                      <h3 className="text-xl font-black">Bảng Kê Xuất Kho Thực Tế & Giao Hàng</h3>
                      <button onClick={()=>setShowIssueModal(false)} className="text-blue-200 hover:text-white transition"><XCircle className="w-7 h-7"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1">
                      <p className="text-sm font-medium text-slate-600 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">Kho thực hiện kiểm hàng đưa cho người nhận. Nhập vào ô "THỰC GIAO" số lượng vật lý anh/chị xuất đi. Hệ thống sẽ ngay lập tức trừ Tồn Kho. Phiếu sẽ chuyển sang trạng thái <b>CHỜ BÀN GIAO</b>.</p>
                      <table className="w-full text-left whitespace-nowrap">
                          <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400">
                             <tr>
                                <th className="p-3">Hàng Hóa</th>
                                <th className="p-3 text-center">Tồn Hiện Kho</th>
                                <th className="p-3 text-center">Đã Duyệt Cấp</th>
                                <th className="p-3 text-center bg-blue-50 border-x-2 border-blue-100">THỰC GIAO LÚC NÀY</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {data.lines.map((l:any) => {
                                  let qtyDeliv = issues.find((a:any)=>a.lineId===l.id)?.qtyDelivered ?? (l.qtyApproved ?? l.qtyRequested);
                                  let currentStock = l.item.stocks?.[0]?.quantityOnHand || 0;
                                  let overStock = (qtyDeliv > currentStock);
                                  return (
                                  <tr key={l.id}>
                                      <td className="p-3 font-bold text-slate-700 text-sm whitespace-normal">{l.item.name}</td>
                                      <td className="p-3 text-center font-black text-slate-600">{currentStock}</td>
                                      <td className="p-3 text-center font-black text-emerald-600">{l.qtyApproved ?? l.qtyRequested}</td>
                                      <td className="p-3 border-x-2 border-blue-100 bg-white">
                                          <input 
                                             type="number" min="0" value={qtyDeliv} 
                                             onChange={(e:any) => setIssues(issues.map((a:any) => a.lineId === l.id ? {...a, qtyDelivered: parseInt(e.target.value)||0} : a))}
                                             className={`w-full text-center py-2 bg-slate-100 border outline-none rounded-lg focus:ring-4 focus:bg-white font-black text-lg transition ${overStock ? 'text-rose-600 border-rose-300 ring-4 ring-rose-50':'text-blue-700 border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`}
                                          />
                                          {overStock && <p className="text-[9px] font-bold text-rose-500 text-center mt-1 border-t px-2 py-0.5 rounded border border-rose-200 bg-rose-50">Lỗi: Vượt quá tồn kho thực tế</p>}
                                      </td>
                                  </tr>
                              )})}
                          </tbody>
                      </table>
                  </div>
                  <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                      <button onClick={()=>setShowIssueModal(false)} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">Hủy Bỏ</button>
                      <button onClick={() => {
                          const hasErr = data.lines.some((l:any) => (issues.find((a:any)=>a.lineId===l.id)?.qtyDelivered ?? (l.qtyApproved ?? l.qtyRequested)) > (l.item.stocks?.[0]?.quantityOnHand || 0));
                          if (hasErr) return showToast('Không thể xuất dòng có số lượng Giao vượt số Tồn kho. Vui lòng nhận đúng hoặc ít hơn tồn kho hiện hữu.', 'error');
                          
                          handleAction('/issue', { lineIssues: issues }, 'ĐÃ XUẤT KHO THÀNH CÔNG VÀ TRỪ TỒN!');
                          setShowIssueModal(false);
                      }} className="px-8 py-2.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 flex items-center"><Archive className="w-5 h-5 mr-2"/> XUẤT KHO & CHUẨN BỊ BÀN GIAO</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
