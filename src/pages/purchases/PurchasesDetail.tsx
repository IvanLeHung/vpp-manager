import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAppContext as useApp } from '../../context/AppContext';
import { 
  ArrowLeft, CheckSquare, XCircle, CheckCircle, Clock, 
  ShoppingCart, Send, Box, MessageSquare, Printer, MapPin, Search
} from 'lucide-react';

interface PurchasesDetailProps {
  poId: string;
  onBack: () => void;
  onEdit: () => void;
}

const PurchasesDetail: React.FC<PurchasesDetailProps> = ({ poId, onBack, onEdit }) => {
  const { currentUser, showToast } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Approval Modal States
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvals, setApprovals] = useState<any[]>([]);

  // Order Config Modal States
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSupplier, setOrderSupplier] = useState('');
  const [orderExpectedDate, setOrderExpectedDate] = useState('');

  const refreshData = async () => {
    try {
      const res = await api.get(`/purchases/${poId}`);
      setData(res.data);
      if (res.data) {
          setApprovals(res.data.lines.map((l:any) => ({
              lineId: l.id,
              qtyApproved: l.qtyRequested, // default full
              unitPrice: l.unitPrice,
              supplier: l.supplier || res.data.supplier || ''
          })));
          setOrderSupplier(res.data.supplier || '');
          setOrderExpectedDate(res.data.expectedDate ? res.data.expectedDate.substring(0, 10) : '');
      }
    } catch(err) {
      console.error(err);
      showToast('Không thể tải chi tiết Đề nghị', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [poId]);

  const handleAction = async (actionPath: string, payload: any = {}, msg: string) => {
    try {
      await api.post(`/purchases/${poId}${actionPath}`, payload);
      showToast(msg);
      await refreshData();
      setShowApproveModal(false);
      setShowOrderModal(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Thao tác thất bại', 'error');
    }
  };

  if (loading || !data) return <div className="p-10 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div></div>;

  const isDRAFT = data.status === 'DRAFT';
  const isPENDING = data.status === 'PENDING_APPROVAL';
  const isAPPROVED = data.status === 'APPROVED';
  
  const canApprove = (currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN') && isPENDING;
  const canSubmit = (currentUser.userId === data.requesterId || currentUser.role === 'ADMIN') && isDRAFT;
  const canOrder = (currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN') && (isAPPROVED || (isDRAFT && data.type === 'PO')); // Auto PO can be ordered directly

  return (
    <div className="flex flex-col h-full bg-slate-50 relative print:bg-white print:overflow-auto">
      {/* HEADER BAR */}
      <div className="h-20 bg-white border-b border-slate-200 flex justify-between items-center px-6 md:px-10 shrink-0 z-20 shadow-sm print:hidden">
          <div className="flex items-center gap-6">
              <button onClick={onBack} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition shadow-inner">
                  <ArrowLeft className="w-5 h-5"/>
              </button>
              <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
                    {data.id} <span className="ml-3 text-xs tracking-widest bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black">{data.type}</span>
                  </h2>
                  <p className="text-sm font-semibold text-slate-500 mt-0.5">{data.source} • Lập lúc {new Date(data.createdAt).toLocaleString('vi-VN')}</p>
              </div>
          </div>
          <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg ${data.status === 'ORDERED' ? 'bg-indigo-500 text-white shadow-indigo-500/30' : data.status === 'APPROVED' ? 'bg-emerald-500 text-white shadow-emerald-500/30' : data.status === 'PENDING_APPROVAL' ? 'bg-amber-500 text-white shadow-amber-500/30' : data.status === 'DELIVERING' || data.status === 'PARTIALLY_DELIVERED' ? 'bg-blue-500 text-white shadow-blue-500/30' : 'bg-slate-400 text-white shadow-slate-400/30'}`}>
                 {data.status.replace('_', ' ')}
              </span>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col xl:flex-row gap-6 w-full max-w-[1400px] mx-auto print:p-0">
          
          <div className="flex-1 flex flex-col gap-6 min-w-0">
              {/* Box 1: Info */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-teal-500"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pl-4">
                      <div className="lg:col-span-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tiêu đề / Mục đích</p>
                          <p className="text-lg font-bold text-slate-800 leading-tight">{data.title || 'Đề nghị Mua sắm'}</p>
                          <p className="text-sm font-medium text-slate-500 mt-1">{data.purpose || 'Không có ghi chú thêm'}</p>
                      </div>
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Người Yêu Cầu</p>
                          <p className="text-sm font-bold text-slate-800">{data.requester?.fullName || 'Hệ thống tự động'}</p>
                          {data.department && <p className="text-xs font-semibold text-indigo-600 mt-0.5">{data.department}</p>}
                      </div>
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nhà Cung Cấp Tổng</p>
                          <p className="text-sm font-bold text-slate-800">{data.supplier || 'Đang chờ cập nhật'}</p>
                          <p className="text-xs font-semibold text-teal-600 mt-0.5">Giá trị: {Number(data.totalAmount).toLocaleString('vi-VN')} đ</p>
                      </div>
                  </div>
              </div>

              {/* Box 2: Lines Grid */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                     <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center"><Box className="w-4 h-4 inline mr-2 text-indigo-500"/> Danh sách mặt hàng</h3>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left whitespace-nowrap min-w-max">
                          <thead className="bg-white border-b border-slate-100">
                              <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                                  <th className="p-4 w-12 text-center border-r border-slate-50">STT</th>
                                  <th className="p-4">Hàng hoá</th>
                                  <th className="p-4 text-center border-x border-slate-50 bg-slate-50/30">Xin Mua</th>
                                  <th className="p-4 text-center text-teal-600 bg-teal-50/30">Đã Duyệt (Đặt)</th>
                                  <th className="p-4 text-center text-blue-600 bg-blue-50/30 border-r border-slate-50">Đã Nhận</th>
                                  <th className="p-4 text-right">Đơn giá / Thành tiền</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {data.lines.map((l:any, idx:number) => {
                                  let showDeliv = data.status === 'ORDERED' || data.status === 'DELIVERING' || data.status === 'PARTIALLY_DELIVERED' || data.status === 'COMPLETED';
                                  let backorderQty = (l.qtyOrdered || l.qtyApproved || l.qtyRequested) - l.qtyReceived;
                                  return (
                                  <tr key={l.id} className="hover:bg-slate-50 transition">
                                      <td className="p-4 text-center font-bold text-slate-400 border-r border-slate-50">{idx+1}</td>
                                      <td className="p-4">
                                          <p className="font-bold text-slate-800 text-sm whitespace-normal leading-tight">{l.item.name}</p>
                                          <div className="flex items-center gap-2 mt-1.5">
                                             <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black tracking-widest">{l.item.mvpp}</span>
                                             <span className="text-[10px] font-bold text-slate-400 uppercase">{l.item.unit}</span>
                                             {l.supplier && <span className="text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">NCC: {l.supplier}</span>}
                                          </div>
                                      </td>
                                      <td className="p-4 text-center border-x border-slate-50 bg-slate-50/30">
                                          <span className="font-black text-lg text-slate-600">{l.qtyRequested}</span>
                                      </td>
                                      <td className="p-4 text-center bg-teal-50/30">
                                          <span className="font-black text-lg text-teal-600">{l.qtyOrdered ?? l.qtyApproved ?? '-'}</span>
                                      </td>
                                      <td className="p-4 text-center bg-blue-50/30 border-r border-slate-50">
                                          <span className="font-black text-lg text-blue-600">{showDeliv ? l.qtyReceived : '-'}</span>
                                          {showDeliv && l.qtyReceived < (l.qtyOrdered || 0) && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-widest">Nợ: {backorderQty}</p>}
                                      </td>
                                      <td className="p-4 text-right">
                                          <p className="font-bold text-sm text-slate-600">{Number(l.unitPrice||0).toLocaleString('vi-VN')} đ</p>
                                          <p className="text-[10px] font-black tracking-widest text-slate-400 mt-1 uppercase">∑ {Number(l.lineAmount||0).toLocaleString('vi-VN')}</p>
                                      </td>
                                  </tr>
                              )})}
                          </tbody>
                      </table>
                  </div>
              </div>

               {/* Tracking Details */}
               {data.receipts && data.receipts.length > 0 && (
                   <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col flex-1">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Lịch sử Nhận Hàng (Phiếu Nhập)</h3>
                      <div className="space-y-4">
                          {data.receipts.map((rc:any) => (
                              <div key={rc.id} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition cursor-pointer">
                                  <div className="flex gap-4 items-center">
                                      <div className={`p-3 rounded-xl ${rc.status==='COMPLETED'?'bg-emerald-100 text-emerald-600':'bg-amber-100 text-amber-600'}`}><CheckCircle className="w-5 h-5"/></div>
                                      <div>
                                          <p className="font-bold text-sm text-slate-800">{rc.id}</p>
                                          <p className="text-[10px] font-semibold text-slate-500 mt-0.5 tracking-widest uppercase">Người nhận: {rc.receiver?.fullName}</p>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <p className={`text-xs font-black uppercase tracking-widest ${rc.status==='COMPLETED'?'text-emerald-500':'text-amber-500'}`}>{rc.status}</p>
                                      <p className="text-[10px] font-semibold text-slate-400 mt-1">{new Date(rc.createdAt).toLocaleDateString('vi-VN')}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                   </div>
               )}
          </div>

          <div className="w-full xl:w-96 flex flex-col gap-6 shrink-0 print:hidden">
              <div className="bg-gradient-to-br from-indigo-800 to-indigo-900 rounded-3xl shadow-xl p-6 border border-indigo-700 relative overflow-hidden text-white">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-[80px] opacity-10 transform translate-x-1/2 -translate-y-1/2"></div>
                  <h3 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-5 flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse"></div>Thao tác Role: {currentUser.role}</h3>
                  <div className="flex flex-col gap-3 relative z-10">
                      
                      {/* Submit PR */}
                      {canSubmit && (
                          <button onClick={() => handleAction('/submit', {}, 'Đã gửi Đề nghị Mua hàng!')} className="w-full py-4 bg-teal-500 text-white rounded-2xl font-black hover:bg-teal-600 transition shadow-lg shadow-teal-500/30 transform hover:scale-[1.02] uppercase tracking-wider text-sm"><Send className="w-5 h-5 inline mr-2 mb-0.5"/> Gửi Trình Duyệt Thực Tế</button>
                      )}

                      {/* Approve/Reject PR */}
                      {canApprove && (
                          <>
                              <button onClick={() => setShowApproveModal(true)} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/30 transform hover:scale-[1.02] uppercase tracking-wider text-sm"><CheckSquare className="w-5 h-5 inline mr-2 mb-0.5"/> PHÊ DUYỆT ĐỀ NGHỊ MUA</button>
                              <button onClick={() => { if(window.confirm('Chắc chắn từ chối?')) handleAction('/reject', {reason: 'Không hợp lệ'}, 'Đã từ chối') }} className="w-full py-3 bg-white/10 text-rose-300 rounded-2xl font-bold hover:bg-rose-500 hover:text-white transition  border border-white/20 uppercase tracking-wider text-xs">Từ chối Đề nghị</button>
                          </>
                      )}

                      {/* Place Order (To PO) */}
                      {canOrder && (
                          <button onClick={() => setShowOrderModal(true)} className="w-full py-4 bg-blue-500 text-white rounded-2xl font-black hover:bg-blue-600 transition shadow-lg shadow-blue-500/30 transform hover:scale-[1.02] uppercase tracking-wider text-sm mt-4 border border-blue-400"><ShoppingCart className="w-5 h-5 inline mr-2 mb-0.5"/> PHÁT HÀNH ĐƠN ĐẶT HÀNG (PO)</button>
                      )}

                  </div>
              </div>
          </div>
      </div>

      {/* MODAL PHÊ DUYỆT */}
      {showApproveModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-500 text-white">
                      <h3 className="text-xl font-black">Xác nhận Phê duyệt & Chốt Khối lượng</h3>
                      <button onClick={()=>setShowApproveModal(false)} className="text-emerald-100 hover:text-white transition"><XCircle className="w-7 h-7"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                      <p className="text-sm font-medium text-slate-600 mb-4 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-emerald-800">Quản lý có thể điều chỉnh <b>Số lượng duyệt mua</b> trực tiếp tại đây, cũng như cập nhật <b>Đơn giá thực tế</b> và phân <b>Nhà cung cấp</b> chi tiết cho từng dòng (nếu cần).</p>
                      
                      <table className="w-full text-left whitespace-nowrap bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                          <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400">
                             <tr>
                                <th className="p-4 border-b border-slate-100">Hàng Hóa</th>
                                <th className="p-4 border-b border-slate-100 w-24 text-center">SL Xin</th>
                                <th className="p-4 border-b border-slate-100 bg-emerald-50/50 w-32 border-l border-emerald-100 text-center">SL Duyệt Mua</th>
                                <th className="p-4 border-b border-slate-100 bg-emerald-50/50 w-36 text-center">Đơn Giá</th>
                                <th className="p-4 border-b border-slate-100 bg-emerald-50/50 w-48 border-r border-emerald-100 text-center">NCC</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {data.lines.map((l:any) => {
                                  const approx = approvals.find((a:any)=>a.lineId===l.id);
                                  const currentApprove = approx?.qtyApproved ?? l.qtyRequested;
                                  return (
                                  <tr key={l.id}>
                                      <td className="p-4 font-bold text-slate-700 text-sm whitespace-normal leading-tight">{l.item.name}</td>
                                      <td className="p-4 text-center font-black text-slate-500 text-lg bg-slate-50/50">{l.qtyRequested}</td>
                                      <td className="p-4 border-l border-emerald-100 bg-white">
                                          <input type="number" min="0" value={currentApprove} 
                                             onChange={(e:any) => setApprovals(approvals.map((a:any) => a.lineId === l.id ? {...a, qtyApproved: parseInt(e.target.value)||0} : a))}
                                             className="w-full text-center py-2.5 bg-slate-50 border border-slate-200 outline-none rounded-xl focus:border-emerald-400 focus:bg-white font-black text-lg transition text-emerald-700"
                                          />
                                      </td>
                                      <td className="p-4 bg-white">
                                          <input type="number" min="0" value={approx?.unitPrice} 
                                             onChange={(e:any) => setApprovals(approvals.map((a:any) => a.lineId === l.id ? {...a, unitPrice: parseInt(e.target.value)||0} : a))}
                                             className="w-full pr-6 pl-3 text-right py-2 bg-slate-50 border border-slate-200 outline-none rounded-xl focus:border-emerald-400 focus:bg-white font-bold transition text-slate-700"
                                          />
                                      </td>
                                      <td className="p-4 border-r border-emerald-100 bg-white">
                                          <input type="text" placeholder="Chung..." value={approx?.supplier} 
                                             onChange={(e:any) => setApprovals(approvals.map((a:any) => a.lineId === l.id ? {...a, supplier: e.target.value} : a))}
                                             className="w-full px-3 py-2 bg-slate-50 border border-slate-200 outline-none rounded-xl focus:border-emerald-400 focus:bg-white font-medium text-sm transition"
                                          />
                                      </td>
                                  </tr>
                              )})}
                          </tbody>
                      </table>
                  </div>
                  <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
                      <button onClick={()=>setShowApproveModal(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition">Hủy Bỏ</button>
                      <button onClick={() => {
                          handleAction('/approve', { lines: approvals }, 'Đã Phê Duyệt Đề Nghị Mua thành công!');
                      }} className="px-8 py-3 bg-emerald-500 text-white font-black tracking-wider uppercase text-sm rounded-xl hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/30">Xác Nhận Chốt Duyệt Đơn</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL PHÁT HÀNH ĐƠN TỚI NCC */}
      {showOrderModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-slide-up">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
                      <h3 className="text-xl font-black">Phát hành Thành Đơn Đặt Hàng (PO)</h3>
                      <button onClick={()=>setShowOrderModal(false)} className="text-blue-200 hover:text-white transition"><XCircle className="w-7 h-7"/></button>
                  </div>
                  <div className="p-6 space-y-5 bg-slate-50">
                      <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">NHÀ CUNG CẤP CHÍNH CỦA ĐƠN</label>
                          <input type="text" value={orderSupplier} onChange={e=>setOrderSupplier(e.target.value)} placeholder="Tên Công ty NCC..." className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition font-bold text-slate-800"/>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">THỜI GIAN GIAO HÀNG HẸN</label>
                          <input type="date" value={orderExpectedDate} onChange={e=>setOrderExpectedDate(e.target.value)} className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition font-bold text-slate-800"/>
                      </div>
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3 mt-2">
                          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5"/>
                          <p className="text-sm font-medium text-blue-800">Sau khi xác nhận, Phiếu đề nghị này sẽ chính thức thành <b>ĐƠN ĐẶT HÀNG (PO)</b> với trạng thái <b>ĐÃ ĐẶT (ORDERED)</b>. Kho có thể dựa vào dữ liệu này để nhập hàng.</p>
                      </div>
                  </div>
                  <div className="p-5 bg-white border-t border-slate-100 flex justify-end gap-3 flex-wrap">
                      <button onClick={()=>setShowOrderModal(false)} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition">Hủy</button>
                      <button onClick={() => {
                          handleAction('/place_order', { supplier: orderSupplier, expectedDate: orderExpectedDate }, 'Phát hành PO Thành Công!');
                      }} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black tracking-wider uppercase text-sm rounded-xl transition shadow-lg shadow-blue-500/30 flex items-center">Chốt Phát Hành PO <Send className="w-4 h-4 ml-2"/></button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default PurchasesDetail;

