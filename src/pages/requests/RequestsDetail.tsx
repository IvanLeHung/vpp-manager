import { useState, useEffect } from 'react';
import { XCircle, CheckCircle, RefreshCw, ArrowLeft, Archive, StopCircle, AlertTriangle, CornerUpLeft, Clock, ShieldCheck, User as UserIcon, Zap } from 'lucide-react';
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

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'APPROVED': return 'Đã duyệt';
      case 'REJECTED': return 'Từ chối';
      case 'DRAFT': return 'Bản nháp';
      case 'PARTIALLY_ISSUED': return 'Cấp phát một phần';
      case 'PARTIALLY_APPROVED': return 'Duyệt một phần';
      case 'RETURNED': return 'Trả lại';
      case 'WAITING_HANDOVER': return 'Chờ bàn giao';
      case 'READY_TO_ISSUE': return 'Sẵn sàng cấp phát';
      case 'PENDING_MANAGER': return 'Chờ Quản lý duyệt';
      case 'PENDING_ADMIN': return 'Chờ Hành chính duyệt';
      case 'COMPLETED': return 'Hoàn tất';
      case 'CANCELLED': return 'Đã hủy';
      default: return status.replace(/_/g, ' ');
    }
  };

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
  const isHandover = (userId === data.requesterId || currentUser.role === 'ADMIN') && data.status === 'WAITING_HANDOVER';

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
              <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg ${getStatusColor(data.status)}`}>{getStatusLabel(data.status)}</span>
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
                         {getStatusLabel(data.status)}
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
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200 p-6 relative overflow-hidden">
                    {(isApprover || isWarehouse) && <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 z-20"></div>}
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 relative z-10 flex items-center">
                        THAO TÁC XỬ LÝ
                    </h3>
                    <div className="flex flex-col gap-4 relative z-10">
                        {/* 1. APPROVER ACTIONS */}
                        {isApprover ? (
                            <div className="p-0 bg-white flex flex-col gap-4">
                                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-100 mb-2">
                                    <ShieldCheck className="w-5 h-5"/>
                                    <p className="text-[11px] font-black uppercase tracking-wider">Bạn đang là người duyệt hiện tại</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ghi chú xử lý (tùy chọn)</label>
                                    <textarea 
                                        value={rejectReason}
                                        onChange={(e:any)=>setRejectReason(e.target.value)}
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 focus:bg-white transition min-h-[100px] shadow-inner"
                                        placeholder="Nhập ghi chú hướng dẫn hoặc lý do..."
                                    />
                                </div>

                                <button 
                                    disabled={loading}
                                    onClick={() => setShowApproveModal(true)} 
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-base hover:bg-indigo-700 transition shadow-xl shadow-indigo-500/30 flex items-center justify-center transform active:scale-95 border-b-4 border-indigo-800"
                                >
                                    <CheckCircle className="w-5 h-5 mr-2"/> PHÊ DUYỆT
                                </button>
                                
                                <div className="grid grid-cols-2 gap-3">
                                   <button 
                                       disabled={loading}
                                       onClick={() => handleAction('/return', {reason: rejectReason || prompt('Lý do yêu cầu làm lại?')}, 'Đã trả lại')} 
                                       className="py-3 bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 rounded-xl font-bold transition flex justify-center items-center shadow-sm"
                                   >
                                       <CornerUpLeft className="w-4 h-4 mr-2"/> Trả Lại
                                   </button>
                                   <button 
                                       disabled={loading}
                                       onClick={() => { if(!rejectReason.trim()) { setShowRejectModal(true); } else { handleAction('/reject', {reason: rejectReason}, 'Đã từ chối'); } }} 
                                       className="py-3 bg-white text-rose-500 hover:bg-rose-50 border-2 border-rose-100 rounded-xl font-bold transition flex justify-center items-center shadow-sm"
                                   >
                                       <XCircle className="w-4 h-4 mr-2"/> Từ Chối
                                   </button>
                                </div>
                            </div>
                        ) : isFutureApprover ? (
                            <div className="p-5 bg-amber-50 border-2 border-amber-100 rounded-2xl flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-amber-700">
                                    <Clock className="w-5 h-5 animate-pulse"/>
                                    <p className="text-xs font-black uppercase tracking-wider">Phiếu chưa đến lượt bạn xử lý</p>
                                </div>
                                <div className="p-3 bg-white/60 rounded-xl border border-amber-200/50">
                                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tight mb-1">Hiện đang chờ:</p>
                                    <p className="text-xs text-amber-900 font-black flex items-center">
                                        <Zap className="w-3 h-3 mr-1.5"/> 
                                        {data.status === 'PENDING_MANAGER' ? 'Quản lý (Cấp 1)' : 'Hành chính (Duyệt cuối)'}
                                    </p>
                                </div>
                            </div>
                        ) : isOwnerDraft ? (
                            <button onClick={() => setViewMode('CREATE')} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                                <RefreshCw className="w-5 h-5 mr-2"/> TIẾP TỤC CHỈNH SỬA
                            </button>
                        ) : isWarehouse ? (
                             <button onClick={() => setShowIssueModal(true)} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition shadow-xl shadow-blue-500/30 flex items-center justify-center border-b-4 border-blue-800">
                                 <Archive className="w-5 h-5 mr-2"/> XUẤT KHO THỰC TẾ
                             </button>
                        ) : isOwnerPending ? (
                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col gap-3">
                                <p className="text-xs font-bold text-indigo-700 text-center">Phiếu đã gửi, đang chờ phê duyệt</p>
                                <button onClick={() => handleAction('/withdraw', {reason:'Xin rút lại để sửa'}, 'Đã rút phiếu thành công')} className="w-full py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition text-sm">Thu hồi phiếu</button>
                            </div>
                        ) : isHandover ? (
                            <button onClick={() => { if(window.confirm('Xác nhận bạn đã nhận đủ vật tư?')) handleAction('/confirm_receipt', {}, 'Bàn giao thành công'); }} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition shadow-xl shadow-emerald-500/30 flex items-center justify-center border-b-4 border-emerald-800">
                                <CheckCircle className="w-5 h-5 mr-2"/> XÁC NHẬN NHẬN HÀNG
                            </button>
                        ) : (
                            <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center text-center gap-3">
                                <Archive className="w-10 h-10 text-slate-300"/>
                                <div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Phiếu đang được xử lý</p>
                                    <p className="text-[10px] text-slate-400 font-medium mt-1">Vui lòng quay lại sau khi có cập nhật mới.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

              {/* Card 3: Tuyến Phê Duyệt (Vertical Stepper) */}
              {data.approvalSteps && data.approvalSteps.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Zap className="w-16 h-16 text-indigo-500" />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 relative z-10">Tuyến Phê Duyệt</h3>
                  <div className="space-y-0 relative z-10">
                    {data.approvalSteps.map((step: any, idx: number) => {
                       const isCurrent = step.status === 'PENDING' && step.stepNo === data.currentApprovalStep && data.status === 'PENDING_MANAGER';
                       const isDone = step.status === 'APPROVED';
                       const isBypassed = step.status === 'SKIPPED';
                       
                       return (
                      <div key={step.id} className="relative flex gap-4 pb-8 last:pb-0 items-start">
                        {/* Connector Line */}
                        {idx < data.approvalSteps.length && (
                             <div className={`absolute left-4 top-8 bottom-0 w-[2.5px] transition-all duration-700 ${isDone ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>
                        )}
                        
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 z-20 transition-all duration-500 ${
                          isDone ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100' :
                          isCurrent ? 'bg-white border-indigo-600 text-indigo-700 ring-4 ring-indigo-50 shadow-xl' :
                          isBypassed ? 'bg-slate-100 border-slate-200 text-slate-400' :
                          'bg-white border-slate-200 text-slate-400'
                        }`}>
                           {isDone ? <CheckCircle className="w-4 h-4"/> : <span>{step.stepNo}</span>}
                        </div>
                        
                        <div className="flex-1 min-w-0 pt-1">
                           <div className="flex items-center justify-between mb-0.5">
                               <p className={`text-sm font-black truncate ${isCurrent ? 'text-indigo-900 drop-shadow-sm' : isDone ? 'text-slate-800' : 'text-slate-500'}`}>
                                   {step.approver?.fullName || 'Chưa chỉ định'}
                               </p>
                               {isCurrent && <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter animate-pulse border border-indigo-700">Đang xử lý</span>}
                           </div>
                           <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5 opacity-80">
                               {step.stepNo === 1 ? 'Quản lý trực tiếp' : `Quản lý cấp ${step.stepNo}`}
                           </p>
                           {isDone && step.actedAt && (
                               <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-flex items-center">
                                   <Clock className="w-3 h-3 mr-1"/> Đã duyệt {new Date(step.actedAt).toLocaleString('vi-VN', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}
                               </p>
                           )}
                        </div>
                        {isCurrent && <div className="absolute left-4 top-4 w-5 h-5 bg-indigo-200 rounded-full animate-ping opacity-30"></div>}
                      </div>
                    )})}
                    
                    {/* Final Step Agent */}
                    <div className="relative flex gap-4 items-start">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 z-20 transition-all ${
                          data.status === 'PENDING_ADMIN' ? 'bg-amber-500 border-amber-500 text-white ring-4 ring-amber-50 shadow-xl' :
                          ['APPROVED','READY_TO_ISSUE','PARTIALLY_ISSUED','WAITING_HANDOVER','COMPLETED'].includes(data.status) ? 'bg-emerald-500 border-emerald-500 text-white ring-4 ring-emerald-50' :
                          'bg-white border-slate-200 text-slate-400'
                        }`}>
                           {['APPROVED', 'READY_TO_ISSUE', 'WAITING_HANDOVER', 'COMPLETED', 'PARTIALLY_ISSUED'].includes(data.status) ? <CheckCircle className="w-4 h-4"/> : <ShieldCheck className="w-4 h-4"/>}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                           <div className="flex items-center justify-between mb-0.5">
                               <p className={`text-sm font-black truncate ${data.status === 'PENDING_ADMIN' ? 'text-amber-900' : ['APPROVED','READY_TO_ISSUE','WAITING_HANDOVER','COMPLETED'].includes(data.status) ? 'text-slate-800' : 'text-slate-500'}`}>Bộ phận Hành chính</p>
                               {data.status === 'PENDING_ADMIN' && <span className="text-[9px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter animate-pulse border border-amber-700">Duyệt cuối</span>}
                           </div>
                           <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest opacity-80">Xác nhận cấp phát & điều phối kho</p>
                        </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card 4: Nhật ký xử lý (Audit Trail) */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col flex-1 min-h-[400px]">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Nhật ký xử lý (Audit Trail)</h3>
                  <div className="relative pl-6 space-y-8 flex-1 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                      
                      {/* START POINT */}
                      <div className="relative group">
                          <div className="absolute -left-[23px] top-1 w-4 h-4 rounded-full bg-slate-200 ring-4 ring-white shadow-sm group-hover:scale-125 transition-transform"></div>
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Tạo đề xuất</p>
                                <span className="text-[10px] font-bold text-slate-400">{new Date(data.createdAt).toLocaleString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                             </div>
                             <div className="flex items-center gap-2 mt-1 py-1.5 px-3 bg-slate-50 rounded-xl border border-slate-100 w-fit">
                                 <UserIcon className="w-3.5 h-3.5 text-slate-400"/>
                                 <p className="text-xs font-black text-indigo-700">{data.requester?.fullName}</p>
                             </div>
                          </div>
                      </div>

                      {data.approvalHistories?.map((audit:any) => {
                          const actionColor = audit.action==='APPROVED'?'text-emerald-700':audit.action.includes('ISSUED')?'text-blue-700':audit.action==='COMPLETED'?'text-indigo-700':audit.action==='REJECTED'||audit.action==='CANCELLED'?'text-rose-700':'text-amber-700';
                          const dotColor = audit.action==='APPROVED'?'bg-emerald-500':audit.action.includes('ISSUED')?'bg-blue-500':audit.action==='COMPLETED'?'bg-indigo-500':audit.action==='REJECTED'||audit.action==='CANCELLED'?'bg-rose-500':'bg-amber-500';
                          const actLabel = audit.action === 'APPROVED' ? 'Phê Duyệt' : audit.action.includes('ISSUED') ? 'Xuất kho' : audit.action === 'COMPLETED' ? 'Hoàn Tất' : audit.action === 'REJECTED' ? 'Từ chối' : audit.action === 'RETURNED' ? 'Trả lại' : audit.action;
                          
                          return (
                          <div key={audit.id} className="relative group">
                              <div className={`absolute -left-[23px] top-1 w-4 h-4 rounded-full ring-4 ring-white shadow-md transition-transform group-hover:scale-150 ${dotColor}`}></div>
                              <div className="flex flex-col gap-2">
                                 <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${actionColor}`}>{actLabel}</p>
                                        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                        <p className="text-xs font-black text-slate-700">{audit.approver?.fullName || 'Hệ thống'}</p>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400">{new Date(audit.createdAt).toLocaleString('vi-VN', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}</span>
                                 </div>
                                 {audit.reason && (
                                     <div className={`p-4 rounded-2xl border-l-4 italic shadow-sm bg-slate-50 border-white/50 border-l-${audit.action==='APPROVED'?'emerald':audit.action==='REJECTED'?'rose':'amber'}-500`}>
                                         <p className="text-xs leading-relaxed font-medium text-slate-600 opacity-90">“{audit.reason}”</p>
                                     </div>
                                 )}
                              </div>
                          </div>
                      )})}
                      
                      {data.status === 'COMPLETED' && (
                          <div className="relative">
                              <div className="absolute -left-[23px] top-1 w-4 h-4 rounded-full bg-emerald-500 ring-8 ring-emerald-50 animate-pulse shadow-lg"></div>
                              <div className="bg-emerald-600 py-2.5 px-4 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                                 <CheckCircle className="w-4 h-4 text-white mr-2"/>
                                 <p className="text-[10px] font-black text-white uppercase tracking-[0.25em]">Quy trình hoàn tất</p>
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
