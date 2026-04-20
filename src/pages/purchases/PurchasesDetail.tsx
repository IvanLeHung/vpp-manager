import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAppContext as useApp } from '../../context/AppContext';
import { 
  ArrowLeft, CheckSquare, XCircle, CheckCircle, 
  ShoppingCart, Send, Info, Printer,
  TrendingUp, Coins, FileText, AlertTriangle, Download, Trash2,
  ExternalLink, User as UserIcon, Building, Clock, Paperclip,
  Truck, Package
} from 'lucide-react';
import WorkflowStepper from '../../components/purchases/WorkflowStepper';

interface PurchasesDetailProps {
  poId: string;
  onBack: () => void;
  showToast: (m: string, t?: 'success' | 'error' | 'warning') => void;
}

const PurchasesDetail: React.FC<PurchasesDetailProps> = ({ poId, onBack, showToast }) => {
  const { currentUser } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvals, setApprovals] = useState<any[]>([]);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSupplier, setOrderSupplier] = useState('');
  const [orderExpectedDate, setOrderExpectedDate] = useState('');
  const [vat, setVat] = useState(0);
  const [discount, setDiscount] = useState(0);

  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelFiles, setCancelFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const refreshData = async () => {
    try {
      const res = await api.get(`/purchases/${poId}`);
      setData(res.data);
      if (res.data) {
          setApprovals(res.data.lines.map((l:any) => ({
              lineId: l.id,
              qtyApproved: l.qtyApproved ?? l.qtyRequested,
              unitPrice: l.unitPrice,
              supplier: l.supplier || res.data.supplier || ''
          })));
          setOrderSupplier(res.data.supplier || '');
          setOrderExpectedDate(res.data.expectedDate ? res.data.expectedDate.substring(0, 10) : '');
          setVat(Number(res.data.vat || 0));
          setDiscount(Number(res.data.discount || 0));
      }
    } catch(err) {
      console.error(err);
      showToast('Không thể tải chi tiết Phiếu', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [poId]);

  const handleAction = async (actionPath: string, payload: any = {}, msg: string) => {
    try {
      await api.post(`/purchases/${poId}${actionPath}`, payload);
      showToast(msg, 'success');
      await refreshData();
      setShowApproveModal(false);
      setShowOrderModal(false);
      setShowDeliveryModal(false);
      setShowCancelModal(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Thao tác thất bại', 'error');
    }
  };

  if (!currentUser) return null;
  if (loading || !data) return <div className="p-10 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div></div>;

  const status = data.status;
  const isDRAFT = status === 'DRAFT';
  const isPENDING = status === 'PENDING_APPROVAL';
  const isAPPROVED = status === 'APPROVED';
  const isORDERED = status === 'ORDERED';
  const isDELIVERING = status === 'DELIVERING' || status === 'PARTIALLY_DELIVERED';
  const isCOMPLETED = status === 'COMPLETED';
  const isCANCELLED = status === 'CANCELLED' || status === 'REJECTED';

  const currentUid = currentUser.userId || currentUser.id;
  const isAdmin = currentUser.role === 'ADMIN';
  const isManager = currentUser.role === 'MANAGER';

  const canSubmit = (currentUid === data.requesterId || isAdmin) && isDRAFT;
  const canApprove = (isManager || isAdmin) && isPENDING;
  const canOrder = (isManager || isAdmin) && (isAPPROVED || (isDRAFT && data.type === 'PO'));
  const canConfirmDelivery = (isManager || isAdmin) && isORDERED;
  const canCancel = isAdmin && !isCOMPLETED && !isCANCELLED;

  // Financial Stats
  const totalAmount = Number(data.totalAmount || 0);
  const vatAmount = totalAmount * (Number(data.vat || 0) / 100);
  const discountAmount = Number(data.discount || 0);
  const finalTotal = totalAmount + vatAmount - discountAmount;

  const totalReceivedValue = data.lines.reduce((acc: number, l: any) => acc + (Number(l.qtyReceived || 0) * Number(l.unitPrice || 0)), 0);
  const remainingValue = totalAmount - totalReceivedValue;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] relative print:bg-white print:overflow-auto">
      {/* HEADER BAR */}
      <div className="bg-white border-b border-slate-200 flex flex-col pt-4 shrink-0 z-20 shadow-sm print:hidden">
          <div className="flex justify-between items-center px-6 md:px-10 pb-4">
              <div className="flex items-center gap-6">
                  <button onClick={onBack} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition shadow-inner">
                      <ArrowLeft className="w-5 h-5"/>
                  </button>
                  <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
                          {data.id} 
                        </h2>
                        <span className="text-[10px] tracking-widest bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black uppercase">{data.type}</span>
                        {isCANCELLED && <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-black uppercase">ĐÃ HỦY</span>}
                      </div>
                      <p className="text-sm font-semibold text-slate-500 mt-0.5 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5"/> 
                        {data.source} • Lập lúc {new Date(data.createdAt).toLocaleString('vi-VN')}
                      </p>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition shadow-sm">
                      <Printer className="w-4 h-4"/> In Chứng Từ
                  </button>
                  <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg ${isORDERED ? 'bg-indigo-500 text-white' : isAPPROVED ? 'bg-emerald-500 text-white' : isPENDING ? 'bg-amber-500 text-white' : isDELIVERING ? 'bg-blue-500 text-white' : isCOMPLETED ? 'bg-teal-600 text-white' : 'bg-slate-400 text-white'}`}>
                     {status.replace('_', ' ')}
                  </div>
              </div>
          </div>

          <WorkflowStepper currentStatus={status} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col xl:flex-row gap-8 w-full max-w-[1600px] mx-auto print:hidden">
          
          <div className="flex-1 flex flex-col gap-8 min-w-0">
              
              {/* TOP SUMMARY GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* General Info */}
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 relative overflow-hidden lg:col-span-2">
                      <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Thông Tin Tổng Quan</p>
                        <FileText className="w-5 h-5 text-indigo-200"/>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 leading-tight">{data.title || 'Đề nghị Mua sắm'}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-2 line-clamp-2">{data.purpose || 'Không có ghi chú thêm'}</p>
                      <div className="mt-6 flex items-center gap-8 border-t border-slate-50 pt-4">
                        <div>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Người Yêu Cầu</p>
                           <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center"><UserIcon className="w-3.5 h-3.5 text-indigo-500"/></div>
                             <p className="text-xs font-bold text-slate-700">{data.requester?.fullName || 'Hệ thống'}</p>
                           </div>
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking_widest mb-1">Bộ Phận</p>
                           <p className="text-xs font-bold text-indigo-600">{data.department || 'N/A'}</p>
                        </div>
                      </div>
                  </div>

                  {/* Vendor Info */}
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Nhà Cung Cấp</p>
                        <Building className="w-5 h-5 text-teal-200"/>
                      </div>
                      <h3 className="text-lg font-black text-slate-800 leading-tight">{data.supplier || 'Chờ cập nhật'}</h3>
                      {data.supplier === 'Đang chờ cập nhật' && (
                        <div className="mt-2 flex items-center gap-1.5 text-amber-500">
                          <AlertTriangle className="w-4 h-4"/>
                          <p className="text-[11px] font-bold uppercase">Cần chỉ định NCC</p>
                        </div>
                      )}
                      <div className="mt-auto pt-6">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ngày dự kiến nhận (ETA)</p>
                         <p className="text-xs font-bold text-teal-600">{data.expectedDate ? new Date(data.expectedDate).toLocaleDateString('vi-VN') : 'Tùy chọn'}</p>
                      </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px) font-black text-slate-400 uppercase tracking-widest leading-none">Giá Trị Đơn Hàng</p>
                        <TrendingUp className="w-5 h-5 text-emerald-200"/>
                      </div>
                      <p className="text-2xl font-black text-emerald-600 tracking-tight">{finalTotal.toLocaleString('vi-VN')} <span className="text-xs font-bold">đ</span></p>
                      
                      <div className="mt-6 space-y-2 border-t border-slate-50 pt-4">
                         <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-slate-400">Đã nhận:</span>
                            <span className="text-blue-600">{totalReceivedValue.toLocaleString('vi-VN')} đ</span>
                         </div>
                         <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-slate-400">Còn lại:</span>
                            <span className={remainingValue > 0 ? 'text-rose-500' : 'text-slate-500'}>{remainingValue.toLocaleString('vi-VN')} đ</span>
                         </div>
                         {(data.vat > 0 || data.discount > 0) && (
                           <div className="flex justify-between text-[10px] font-black border-t border-slate-50 pt-1 uppercase">
                              <span className="text-slate-400">Thuế/CK:</span>
                              <span className="text-indigo-400">+{data.vat}% / -{data.discount.toLocaleString()} đ</span>
                           </div>
                         )}
                      </div>
                  </div>
              </div>

              {/* Box 2: Item Table */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 italic font-black">L</div>
                        <div>
                           <h3 className="text-sm font-black text-slate-800">Danh Mục Mặt Hàng</h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Tổng số {data.lines.length} loại hàng</p>
                        </div>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left whitespace-nowrap min-w-max border-collapse">
                          <thead className="bg-white border-b border-slate-100">
                              <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                                  <th className="p-5 w-12 text-center border-r border-slate-50">#</th>
                                  <th className="p-5">Hàng hoá & Quy cách</th>
                                  <th className="p-5 text-center bg-slate-50/50">ĐVT</th>
                                  <th className="p-5 text-center border-x border-slate-50">Duyệt Mua</th>
                                  <th className="p-5 text-center bg-blue-50/30">Đã Nhập</th>
                                  <th className="p-5 text-center">% Hoàn Tất</th>
                                  <th className="p-5 text-right">Đơn giá / Thành tiền</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {data.lines.map((l:any, idx:number) => {
                                  const qtyReq = l.qtyOrdered ?? l.qtyApproved ?? l.qtyRequested;
                                  const progress = qtyReq > 0 ? Math.min(100, Math.round((l.qtyReceived / qtyReq) * 100)) : 0;
                                  return (
                                  <tr key={l.id} className="hover:bg-slate-50/50 transition">
                                      <td className="p-5 text-center font-bold text-slate-300 border-r border-slate-50">{idx+1}</td>
                                      <td className="p-5">
                                          <p className="font-bold text-slate-800 text-sm whitespace-normal leading-tight max-w-xs">{l.item.name}</p>
                                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                             <span className="text-[10px] bg-slate-100 text-slate-500 pr-1.5 pl-4 py-0.5 rounded-full font-black tracking-widest relative">
                                                <div className="absolute left-1 top-1 w-2 h-2 rounded-full bg-slate-400"></div>
                                                {l.item.mvpp}
                                             </span>
                                             {l.supplier && <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">NCC: {l.supplier}</span>}
                                          </div>
                                      </td>
                                      <td className="p-5 text-center bg-slate-50/50">
                                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{l.item.unit}</span>
                                      </td>
                                      <td className="p-5 text-center border-x border-slate-50">
                                          <span className="font-black text-lg text-slate-700">{qtyReq}</span>
                                      </td>
                                      <td className="p-5 text-center bg-blue-50/30">
                                          <span className="font-black text-lg text-blue-600">{isORDERED || isDELIVERING || isCOMPLETED ? l.qtyReceived : '-'}</span>
                                      </td>
                                      <td className="p-5 w-40">
                                          <div className="flex flex-col gap-1.5">
                                             <div className="flex justify-between items-end">
                                                <span className={`text-[10px] font-black leading-none ${progress === 100 ? 'text-emerald-500' : 'text-slate-400'}`}>{progress}%</span>
                                             </div>
                                             <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                                             </div>
                                          </div>
                                      </td>
                                      <td className="p-5 text-right">
                                          <p className="font-bold text-sm text-slate-700">{Number(l.unitPrice||0).toLocaleString('vi-VN')} đ</p>
                                          <p className="text-[10px] font-black tracking-widest text-slate-400 mt-1 uppercase">∑ {Number(l.lineAmount||0).toLocaleString('vi-VN')}</p>
                                      </td>
                                  </tr>
                                )})}
                          </tbody>
                      </table>
                  </div>
              </div>

              {/* Tracking & Attachments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  {/* Receipts List */}
                  <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
                      <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Package className="w-4 h-4 mr-2 text-indigo-500"/> Phiếu Nhập Kho (GRNs)</h3>
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{data.receipts?.length || 0} Phiếu</span>
                      </div>
                      
                      {data.receipts && data.receipts.length > 0 ? (
                        <div className="space-y-4">
                            {data.receipts.map((rc:any) => (
                                <div key={rc.id} className="group relative flex justify-between items-center p-4 rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer">
                                    <div className="flex gap-4 items-center">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${rc.status==='COMPLETED'?'bg-emerald-50 text-emerald-600':'bg-amber-50 text-amber-600'}`}>
                                           {rc.status === 'COMPLETED' ? <CheckCircle className="w-6 h-6"/> : <Clock className="w-6 h-6"/>}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 flex items-center gap-1.5">{rc.id} <ExternalLink className="w-3 h-3 text-slate-300"/></p>
                                            <p className="text-[10px] font-black text-slate-400 mt-1 tracking-widest uppercase flex items-center gap-1.5"><UserIcon className="w-3 h-3"/> {rc.receiver?.fullName}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${rc.status==='COMPLETED'?'text-emerald-500':'text-amber-500'}`}>{rc.status}</p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(rc.createdAt).toLocaleDateString('vi-VN')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                      ) : (
                        <div className="py-12 flex flex-col items-center text-slate-300">
                           <ShoppingCart className="w-12 h-12 mb-3 opacity-20"/>
                           <p className="text-xs font-bold uppercase tracking-widest">Chưa có phiếu nhập</p>
                        </div>
                      )}
                  </div>

                  {/* Audit Trail */}
                  <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
                           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-indigo-500"/> Lịch Sử Xử Lý</h3>
                        </div>
                        <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
                            {data.auditLogs?.map((audit:any) => (
                               <div key={audit.id} className="relative">
                                 <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-indigo-500 shadow-sm z-10"></div>
                                 <div className="flex justify-between items-start">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{audit.action}</h4>
                                    <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{new Date(audit.createdAt).toLocaleDateString('vi-VN')}</span>
                                 </div>
                                 <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                                    <UserIcon className="w-3 h-3"/> {audit.user?.fullName || 'Hệ thống'} • {new Date(audit.createdAt).toLocaleTimeString('vi-VN')}
                                 </p>
                                 {audit.newValues?.reason && (
                                   <div className="mt-2.5 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 text-[11px] font-medium text-slate-700 leading-relaxed italic relative">
                                      {audit.newValues.reason}
                                   </div>
                                 )}
                               </div>
                            ))}
                        </div>
                  </div>
              </div>

               {/* Attachments Section */}
               <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 mb-10">
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Paperclip className="w-4 h-4 mr-2 text-indigo-500"/> Chứng Từ Đính Kèm (PO PDF / Invoice / Delivery Note)</h3>
                    <button className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition">Thêm Đính Kèm</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                     {data.attachments && data.attachments.length > 0 ? (
                       data.attachments.map((file: any) => (
                         <div key={file.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3 group border-dashed hover:border-indigo-400 hover:bg-white transition-all">
                            <div className="flex justify-between items-start">
                               <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-500"><FileText className="w-5 h-5"/></div>
                               <button className="p-1.5 text-slate-300 hover:text-rose-500 transition opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                            </div>
                            <div>
                               <p className="text-[11px] font-black text-slate-700 truncate" title={file.fileName}>{file.fileName}</p>
                               <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{(file.fileSize / 1024).toFixed(0)} KB • {file.mimeType.split('/')[1]}</p>
                            </div>
                            <a href={file.fileUrl} target="_blank" rel="noreferrer" className="w-full mt-2 py-2 bg-white text-indigo-600 text-[10px] font-black uppercase text-center rounded-xl border border-slate-200 hover:bg-indigo-600 hover:text-white transition flex items-center justify-center gap-2">
                               <Download className="w-3 h-3"/> Download
                            </a>
                         </div>
                       ))
                     ) : (
                        <div className="col-span-full py-12 flex flex-col items-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                           <Paperclip className="w-10 h-10 text-slate-200 mb-2"/>
                           <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kéo thả hoặc bấm Thêm Đính Kèm</p>
                        </div>
                     )}
                  </div>
               </div>
          </div>

          {/* RIGHT SIDEBAR: ADMIN ACTION CENTER */}
          <div className="w-full xl:w-[400px] flex flex-col gap-8 shrink-0 print:hidden sticky top-8 h-fit">
              <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-200/20 p-8 border border-slate-200 relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-[80px] opacity-30 transform translate-x-1/2 -translate-y-1/2"></div>
                  
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20"><Building className="w-7 h-7"/></div>
                     <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Trung Tâm Lệnh</h3>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Quyền Hạn: {currentUser.role}</p>
                     </div>
                  </div>

                  <div className="flex flex-col gap-4 relative z-10">
                      
                      {/* Submit PR */}
                      {canSubmit && (
                        <div className="group">
                           <button onClick={() => handleAction('/submit', {}, 'Đã trình duyệt thành công!')} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black hover:bg-indigo-700 transition shadow-xl shadow-indigo-600/30 flex flex-col items-center gap-1 group-active:scale-95 transform">
                              <span className="flex items-center gap-2 text-sm uppercase tracking-wider"><Send className="w-5 h-5"/> Gửi Trình Duyệt</span>
                              <span className="text-[9px] font-bold text-indigo-200 opacity-60 group-hover:opacity-100 transition uppercase">Chuyển PR thành Trạng thái Chờ Duyệt</span>
                           </button>
                        </div>
                      )}

                      {/* Approve PR */}
                      {canApprove && (
                          <div className="space-y-3">
                              <button onClick={() => setShowApproveModal(true)} className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black hover:bg-emerald-600 transition shadow-xl shadow-emerald-500/30 flex flex-col items-center gap-1 group-active:scale-95 transform">
                                 <span className="flex items-center gap-2 text-sm uppercase tracking-wider"><CheckSquare className="w-5 h-5"/> Duyệt & Chốt Khối Lượng</span>
                                 <span className="text-[9px] font-bold text-emerald-100 opacity-60 uppercase tracking-widest">Xác nhận Số Lượng & Giá cuối</span>
                              </button>
                              <button onClick={() => { if(window.confirm('Chuyển đề nghị này về Trạng thái bị Từ Chối?')) handleAction('/reject', {reason: 'Không hợp lệ'}, 'Đã từ chối Đề nghị') }} className="w-full py-4 bg-rose-50 text-rose-600 rounded-3xl font-black hover:bg-rose-500 hover:text-white transition uppercase tracking-widest text-[11px] border border-rose-100 border-dashed">
                                 Từ Chối Đề Nghị
                              </button>
                          </div>
                      )}

                      {/* Issue PO */}
                      {canOrder && (
                          <button onClick={() => setShowOrderModal(true)} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black hover:bg-blue-700 transition shadow-xl shadow-blue-500/30 flex flex-col items-center gap-1 group-active:scale-95 transform border-b-4 border-blue-800">
                             <span className="flex items-center gap-2 text-sm uppercase tracking-wider"><ShoppingCart className="w-5 h-5"/> Phát Hành Đơn Đặt Hàng (PO)</span>
                             <span className="text-[9px] font-bold text-blue-100 opacity-60 uppercase tracking-widest">Chốt NCC & Xuất File PO chính thức</span>
                          </button>
                      )}

                      {/* Deliver Confirm */}
                      {canConfirmDelivery && (
                          <button onClick={() => setShowDeliveryModal(true)} className="w-full py-5 bg-[#7c3aed] text-white rounded-3xl font-black hover:bg-[#6d28d9] transition shadow-xl shadow-purple-500/30 flex flex-col items-center gap-1 group-active:scale-95 transform">
                             <span className="flex items-center gap-2 text-sm uppercase tracking-wider"><Truck className="w-5 h-5"/> Xác Nhận NCC Đang Giao</span>
                             <span className="text-[9px] font-bold text-purple-100 opacity-60 uppercase tracking-widest">Khởi tạo Phiếu Nhập Kho GRN</span>
                          </button>
                      )}

                      {/* Cancel PO */}
                      {canCancel && (
                        <div className="mt-4 pt-8 border-t border-slate-100">
                           <button onClick={() => setShowCancelModal(true)} className="w-full py-4 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-3xl font-black transition border-2 border-dashed border-slate-100 hover:border-rose-200 uppercase tracking-widest text-[11px] flex items-center justify-center gap-2">
                             <XCircle className="w-4 h-4"/> Hủy / Đóng Đơn Toàn Phần
                           </button>
                           <p className="text-[9px] font-bold text-slate-400 text-center mt-3 leading-relaxed uppercase">Lưu ý: Chỉ thực hiện khi Đơn hàng bị sự cố hoặc NCC từ chối cung cấp.</p>
                        </div>
                      )}

                      {/* Placeholder for no actions */}
                      {!canSubmit && !canApprove && !canOrder && !canConfirmDelivery && !canCancel && (
                        <div className="py-10 flex flex-col items-center justify-center opacity-40">
                           <AlertTriangle className="w-12 h-12 text-slate-300 mb-3"/>
                           <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Tạm thời hết <br/> Thao tác khả dụng</p>
                        </div>
                      )}
                  </div>
              </div>

              {/* Quick Summary Card */}
              <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/40">
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-[60px]"></div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 mb-6 flex items-center gap-2">
                     <Coins className="w-4 h-4"/> Diễn Giải Tài Chính
                  </h4>
                  <div className="space-y-5">
                     <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                        <span className="text-xs font-bold text-indigo-200">Giá trị tạm tính:</span>
                        <span className="text-sm font-black">{totalAmount.toLocaleString()} đ</span>
                     </div>
                     <div className="flex justify-between items-center text-xs px-3">
                        <span className="font-bold text-indigo-400 text-[10px] uppercase tracking-widest">VAT ({data.vat}%)</span>
                        <span className="font-black">+{vatAmount.toLocaleString()} đ</span>
                     </div>
                     <div className="flex justify-between items-center text-xs px-3">
                        <span className="font-bold text-rose-400 text-[10px] uppercase tracking-widest">Chiết khấu</span>
                        <span className="font-black">-{discountAmount.toLocaleString()} đ</span>
                     </div>
                     <div className="pt-4 mt-4 border-t border-white/10 flex justify-between items-start">
                        <span className="text-sm font-black uppercase tracking-widest pt-1">Tổng Quyết Toán</span>
                        <div className="text-right">
                           <p className="text-2xl font-black text-white leading-none mb-1">{finalTotal.toLocaleString()} đ</p>
                           <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest italic">Bao gồm thuế phí</p>
                        </div>
                     </div>
                  </div>
              </div>
          </div>
      </div>

      {/* MODAL PHÊ DUYỆT */}
      {showApproveModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-emerald-500 text-white">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white"><CheckSquare className="w-7 h-7"/></div>
                         <div>
                            <h4 className="text-xl font-black tracking-tight leading-none mb-1">Xác Nhận Phê Duyệt</h4>
                            <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Chốt Khối Lượng và Đơn Giá Cuối</p>
                         </div>
                      </div>
                      <button onClick={()=>setShowApproveModal(false)} className="text-emerald-100 hover:text-white transition"><XCircle className="w-8 h-8"/></button>
                  </div>
                  <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50">
                      <div className="grid grid-cols-1 gap-4 mb-4">
                        <p className="text-sm font-medium text-slate-600 bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-emerald-800 leading-relaxed shadow-sm">
                          Hệ thống cho phép Quản lý điều chỉnh trực tiếp <b>Số lượng duyệt mua</b> (theo kho thực tế), cập nhật <b>Đơn giá thực tế</b> và gán <b>Nhà cung cấp</b> chi tiết cho từng hạng mục mặt hàng. 
                        </p>
                      </div>
                      
                      <table className="w-full text-left whitespace-nowrap bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200">
                          <thead className="bg-slate-50/80 text-[10px] uppercase font-black text-slate-400">
                             <tr>
                                <th className="p-5 border-b border-slate-100">Mặt Hàng</th>
                                <th className="p-5 border-b border-slate-100 w-24 text-center">Xin Mua</th>
                                <th className="p-5 border-b border-slate-100 bg-emerald-50/30 w-32 border-l border-emerald-100 text-center">SL Duyệt</th>
                                <th className="p-5 border-b border-slate-100 bg-emerald-50/30 w-44 text-right">Đơn Giá NCC (đ)</th>
                                <th className="p-5 border-b border-slate-100 bg-emerald-50/30 w-48 border-r border-emerald-100 text-center">Chỉ Định NCC</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {data.lines.map((l:any) => {
                                  const approx = approvals.find((a:any)=>a.lineId===l.id);
                                  const currentApprove = approx?.qtyApproved ?? l.qtyRequested;
                                  return (
                                  <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="p-5 font-bold text-slate-800 text-sm whitespace-normal leading-tight">{l.item.name}</td>
                                      <td className="p-5 text-center font-black text-slate-400 text-lg bg-slate-50/30">{l.qtyRequested}</td>
                                      <td className="p-5 border-l border-emerald-100 bg-white">
                                          <input type="number" min="0" value={currentApprove} 
                                             onChange={(e:any) => setApprovals(approvals.map((a:any) => a.lineId === l.id ? {...a, qtyApproved: parseInt(e.target.value)||0} : a))}
                                             className="w-full text-center py-3 bg-slate-50 border-2 border-slate-100 outline-none rounded-2xl focus:border-emerald-400 focus:bg-white font-black text-xl transition text-emerald-700 shadow-inner"
                                          />
                                      </td>
                                      <td className="p-5 bg-white">
                                          <input type="number" min="0" value={approx?.unitPrice} 
                                             onChange={(e:any) => setApprovals(approvals.map((a:any) => a.lineId === l.id ? {...a, unitPrice: parseInt(e.target.value)||0} : a))}
                                             className="w-full pr-4 pl-3 text-right py-2.5 bg-slate-50 border-2 border-slate-100 outline-none rounded-2xl focus:border-emerald-400 focus:bg-white font-bold transition text-slate-700 shadow-inner"
                                          />
                                      </td>
                                      <td className="p-5 border-r border-emerald-100 bg-white">
                                          <input type="text" placeholder="Tên NCC..." value={approx?.supplier} 
                                             onChange={(e:any) => setApprovals(approvals.map((a:any) => a.lineId === l.id ? {...a, supplier: e.target.value} : a))}
                                             className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 outline-none rounded-2xl focus:border-emerald-400 focus:bg-white font-bold text-sm transition placeholder:text-slate-300 shadow-inner"
                                          />
                                      </td>
                                  </tr>
                              )})}
                          </tbody>
                      </table>
                  </div>
                  <div className="p-8 bg-white border-t border-slate-100 flex justify-end gap-4 shrink-0">
                      <button onClick={()=>setShowApproveModal(false)} className="px-8 py-3.5 font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition uppercase tracking-widest text-xs">Hủy Bỏ</button>
                      <button onClick={() => {
                          handleAction('/approve', { lines: approvals }, 'Đã Phê Duyệt Đề Nghị Mua thành công!');
                      }} className="px-12 py-3.5 bg-emerald-500 text-white font-black tracking-widest uppercase text-sm rounded-2xl hover:bg-emerald-600 transition shadow-xl shadow-emerald-500/40">Ghi Nhận & Phê Duyệt</button>
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
                        onChange={e=>setCancelReason(e.target.value)} 
                        placeholder="VD: Nhà cung cấp báo hết hàng, Thay đổi quy cách hàng hóa..."
                        className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-rose-400 transition mb-6"
                      ></textarea>

                      {/* Attachment Section In Modal */}
                      <div className="mb-6">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tài liệu đính kèm (nếu có)</label>
                        <div className="space-y-3">
                           {cancelFiles.map((file, idx) => (
                             <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2 overflow-hidden">
                                   <FileText className="w-4 h-4 text-indigo-500 shrink-0"/>
                                   <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                                </div>
                                <button onClick={() => setCancelFiles(prev => prev.filter((_, i) => i !== idx))} className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition">
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
              <div className="p-8 space-y-6">
                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">NGÀY GIAO HÀNG DỰ KIẾN</label>
                      <input type="date" value={orderExpectedDate} onChange={e=>setOrderExpectedDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-3xl outline-none focus:border-purple-400 transition font-black text-slate-800"/>
                  </div>
                  <div className="p-5 bg-purple-50 rounded-2xl border border-purple-100 flex gap-4 italic font-bold text-xs text-purple-800">
                     <Info className="w-5 h-5 text-purple-400 flex-shrink-0"/>
                     <p>Chuyển trạng thái sang ĐANG GIAO HÀNG. Sẵn sàng lệnh để Kho kiểm hàng & nhập kho.</p>
                  </div>
                  <div className="flex gap-3">
                     <button onClick={()=>setShowDeliveryModal(false)} className="flex-1 py-3.5 font-black text-slate-400 hover:bg-slate-100 rounded-2xl transition uppercase text-xs">Hủy</button>
                     <button onClick={() => handleAction('/confirm_delivery', { expectedDate: orderExpectedDate }, 'Chuyển trạng thái Đang giao hàng thành công!')} className="flex-[2] py-3.5 bg-[#7c3aed] text-white font-black uppercase text-xs rounded-2xl hover:bg-[#6d28d9] transition shadow-lg shadow-purple-500/30">Xác Nhận Hẹn Giao</button>
                  </div>
              </div>
          </div>
        </div>
      )}

      {/* FORMAL PRINT-ONLY SECTION (A4 Standard) */}
      <div className="hidden print:block print-container">
          <div className="text-center text-[22px] font-black uppercase mb-1 border-b-4 border-slate-900 pb-2">ĐƠN ĐẶT HÀNG / MUA SẮM (PO)</div>
          <div className="text-center text-[11px] font-bold tracking-[0.3em] text-slate-500 mb-8 uppercase italic">Bản gốc dành cho đối tác & nhà cung cấp</div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8 text-[13px] bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div className="flex justify-between border-b border-slate-200 pb-1"><strong>Mã Chứng Từ:</strong> <span className="font-black text-indigo-700">{data.id}</span></div>
              <div className="flex justify-between border-b border-slate-200 pb-1"><strong>Ngày Lập Đơn:</strong> <span className="font-bold">{new Date(data.createdAt).toLocaleDateString('vi-VN')}</span></div>
              <div className="flex justify-between border-b border-slate-200 pb-1"><strong>Hẹn Giao:</strong> <span className="font-bold underline decoration-indigo-300">{data.expectedDate ? new Date(data.expectedDate).toLocaleDateString('vi-VN') : 'Dự kiến 3-5 ngày'}</span></div>
              <div className="flex justify-between border-b border-slate-200 pb-1"><strong>Nhà Cung Cấp:</strong> <span className="font-black">{data.supplier || '....................'}</span></div>
              <div className="col-span-2 flex justify-between border-b border-slate-200 pb-1"><strong>Mục Đích Sử Dụng:</strong> <span className="font-medium italic text-slate-600">{data.purpose || 'Mua hàng bổ sung văn phòng'}</span></div>
          </div>

          <table className="print-table w-full mb-8">
              <thead className="bg-slate-900 text-white">
                  <tr>
                      <th className="text-center font-black p-3" style={{width: '6%'}}>STT</th>
                      <th className="text-left font-black p-3" style={{width: '44%'}}>Tên Văn Phòng Phẩm / Quy Cách</th>
                      <th className="text-center font-black p-3" style={{width: '10%'}}>ĐVT</th>
                      <th className="text-center font-black p-3" style={{width: '10%'}}>SL</th>
                      <th className="text-right font-black p-3" style={{width: '15%'}}>Đơn Giá</th>
                      <th className="text-right font-black p-3" style={{width: '15%'}}>Thành Tiền</th>
                  </tr>
              </thead>
              <tbody className="border-2 border-slate-900">
                  {data.lines.map((l: any, idx: number) => (
                      <tr key={l.id} className="border-b border-slate-200">
                          <td className="text-center p-3 font-bold">{idx + 1}</td>
                          <td className="p-3">
                            <p className="font-black mb-0.5">{l.item.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">{l.item.mvpp}</p>
                          </td>
                          <td className="text-center p-3 text-slate-500 font-bold uppercase">{l.item.unit}</td>
                          <td className="text-center p-3 font-black text-lg">{l.qtyOrdered ?? l.qtyApproved ?? l.qtyRequested}</td>
                          <td className="text-right p-3 font-bold">{l.unitPrice?.toLocaleString('vi-VN')} đ</td>
                          <td className="text-right p-3 font-black">{l.lineAmount?.toLocaleString('vi-VN')} đ</td>
                      </tr>
                  ))}
                  <tr className="bg-slate-50">
                      <td colSpan={5} className="text-right p-3 font-bold uppercase tracking-widest text-slate-500">Tiền hàng tạm tính:</td>
                      <td className="text-right p-3 font-black">{totalAmount.toLocaleString('vi-VN')} đ</td>
                  </tr>
                  {data.vat > 0 && (
                    <tr className="bg-slate-50 border-t border-slate-200 border-dashed">
                        <td colSpan={5} className="text-right p-2 font-bold uppercase tracking-widest text-[#7c3aed]">Thuế VAT ({data.vat}%):</td>
                        <td className="text-right p-2 font-black">+{vatAmount.toLocaleString('vi-VN')} đ</td>
                    </tr>
                  )}
                  {data.discount > 0 && (
                    <tr className="bg-slate-50 border-t border-slate-200 border-dashed">
                        <td colSpan={5} className="text-right p-2 font-bold uppercase tracking-widest text-rose-500">Chiết khấu / Giảm giá:</td>
                        <td className="text-right p-2 font-black">-{discountAmount.toLocaleString('vi-VN')} đ</td>
                    </tr>
                  )}
                  <tr className="bg-slate-100 border-t-4 border-slate-900 border-double">
                      <td colSpan={5} className="text-right p-4 font-black uppercase tracking-[0.2em] text-lg">Tổng giá trị quyết toán:</td>
                      <td className="text-right p-4 font-black text-xl text-indigo-900">{finalTotal.toLocaleString('vi-VN')} đ</td>
                  </tr>
              </tbody>
          </table>

          <div className="signature-section mt-16 grid grid-cols-3 gap-12">
              <div className="text-center min-h-[160px]">
                  <p className="font-black uppercase mb-1 text-[13px]">Bên Đặt Hàng (Cửa Hàng)</p>
                  <p className="text-[10px] italic mb-20 text-slate-400">(Ký, ghi rõ họ tên & đóng dấu)</p>
                  <p className="font-black uppercase text-[14px] text-indigo-900 border-t border-slate-200 pt-2">{data.requester?.fullName}</p>
              </div>
              <div className="text-center min-h-[160px]">
                  <p className="font-black uppercase mb-1 text-[13px]">Ban Quản Lý / Kế Toán</p>
                  <p className="text-[10px] italic mb-20 text-slate-400">(Ký và xác nhận thanh toán)</p>
                  <p className="font-black uppercase text-[14px]">....................................</p>
              </div>
              <div className="text-center min-h-[160px]">
                  <p className="font-black uppercase mb-1 text-[13px]">Bên Cung Cấp (Vendor)</p>
                  <p className="text-[10px] italic mb-20 text-slate-400">(Ký và xác nhận ngày giao)</p>
                  <p className="font-black uppercase text-[14px] text-slate-300">Xác nhận giao hàng</p>
              </div>
          </div>
      </div>

    </div>
  );
};

export default PurchasesDetail;
