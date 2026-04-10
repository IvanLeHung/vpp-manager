import { useState, useEffect } from 'react';
import {
  XCircle, CheckCircle, RefreshCw, ArrowLeft, Archive,
  StopCircle, AlertTriangle, Clock, ShieldCheck, Shield,
  Activity, CornerUpLeft, User as UserIcon, Zap, Send, FileText,
  AlertCircle,
  Save
} from 'lucide-react';
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

export default function RequestsDetail({
  requestId,
  setViewMode,
  refreshData,
  showToast,
  currentUser,
}: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // States handling logic
  const [processNote, setProcessNote] = useState('');
  const [lineActions, setLineActions] = useState<{lineId: string, approvedQty: number, decision: 'APPROVE'|'REJECT'|'DECREASE', reason: string}[]>([]);
  const [nextAssigneeId, setNextAssigneeId] = useState<string>('');
  
  // Specific modale states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [returnReason, setReturnReason] = useState('');

  const [usersToForward, setUsersToForward] = useState<any[]>([]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/requests/${requestId}`);
      setData(res.data);
      
      // Initialize Line Actions from draft or default
      const draft = res.data.processingDraft;
      if (draft && draft.lineActions) {
         setLineActions(draft.lineActions);
         if (draft.note) setProcessNote(draft.note);
      } else {
         setLineActions(
          res.data.lines.map((l: any) => ({
             lineId: l.id,
             approvedQty: l.qtyRequested,
             decision: 'APPROVE' as const,
             reason: ''
          }))
         );
      }

      // Pre-fetch managers for forward dropdown if allowed
      if (res.data.permissions?.canApprove) {
         fetchUsers();
      }

    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi tải phiếu', 'error');
      setViewMode('LIST');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
     try {
       const uRes = await api.get('/users?limit=100');
       setUsersToForward(uRes.data?.data?.filter((u:any) => u.isActive && ['ADMIN', 'MANAGER', 'WAREHOUSE'].includes(u.role)) || []);
     } catch(e) { }
  }

  useEffect(() => {
    fetchDetail();
  }, [requestId]);

  const updateLine = (lineId: string, key: string, value: any) => {
     setLineActions(prev => prev.map(a => {
        if (a.lineId === lineId) {
            const updated = { ...a, [key]: value };
            // Auto decision update based on qty if touching qty
            if (key === 'approvedQty') {
                const originalL = data.lines.find((l:any) => l.id === lineId);
                if (value === 0) updated.decision = 'REJECT';
                else if (value < originalL.qtyRequested) updated.decision = 'DECREASE';
                else updated.decision = 'APPROVE';
            }
            return updated;
        }
        return a;
     }));
  }

  const handleAction = async (actionPath: string, payload: any = {}, successMsg: string) => {
    try {
      setLoading(true);
      await api.post(`/requests/${requestId}${actionPath}`, payload);
      showToast(successMsg);
      await refreshData();
      setViewMode('LIST');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Thao tác thất bại', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
     try {
       setLoading(true);
       await api.patch(`/requests/${requestId}/processing-draft`, { note: processNote, lineActions });
       showToast('Đã lưu nháp xử lý thành công');
       fetchDetail();
     } catch (err: any) {
       showToast(err.response?.data?.error || 'Không thể lưu nháp', 'error');
       setLoading(false);
     }
  }

  const submitApprove = () => {
     // Validate
     const invalidLine = lineActions.find(a => (a.decision === 'DECREASE' || a.decision === 'REJECT') && !a.reason.trim());
     if (invalidLine) {
         return showToast('Vui lòng nhập lý do dòng cho các vật tư bị giảm số lượng hoặc từ chối', 'error');
     }
     
     handleAction('/approve', { note: processNote, lineActions, nextAssigneeId: nextAssigneeId || undefined }, 'Đã duyệt phiếu thành công!');
     setShowApproveModal(false);
  }

  if (loading || !data) {
    return (
      <div className="flex flex-col h-full bg-slate-50 relative items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="font-bold text-slate-500">Đang tải dữ liệu phiếu...</p>
      </div>
    );
  }

  const currentUserTurn = data.permissions?.isMyTurn;
  // warnings from API
  const apiWarnings = data.warnings || [];
  
  // Calculate specific warning derived
  const outOfStockLines = data.lines.filter((l:any) => l.qtyRequested > (l.item.stocks?.[0]?.quantityOnHand || 0));

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden relative">
      {/* FIXED TOP ACTION BAR */}
      <div className="h-24 bg-white border-b border-slate-200 flex flex-col justify-center px-6 md:px-10 shrink-0 z-20 shadow-sm sticky top-0">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
              <button onClick={() => setViewMode('LIST')} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition shadow-inner">
                 <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                 <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">{data.id}</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500">{data.status}</span>
                 </div>
                 <p className="text-xs font-bold text-slate-500 mt-1">
                    Người tạo: {data.requester?.fullName} • {new Date(data.createdAt).toLocaleString('vi-VN')}
                 </p>
              </div>
           </div>

           <div className="flex items-center gap-3">
              {!currentUserTurn ? (
                 <div className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl flex items-center gap-3">
                    <Clock className="w-5 h-5 animate-pulse" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider">Chưa đến lượt xử lý của bạn</p>
                        <p className="text-xs font-bold mt-0.5">Xin vui lòng chờ</p>
                    </div>
                 </div>
              ) : (
                 <>
                    <button onClick={handleSaveDraft} className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold flex items-center transition">
                       <Save className="w-4 h-4 mr-2" /> Lưu Nháp
                    </button>
                    <button onClick={() => setShowReturnModal(true)} className="px-4 py-2.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl font-bold flex items-center transition">
                       <CornerUpLeft className="w-4 h-4 mr-2" /> Yêu Cầu Bổ Sung
                    </button>
                    <button onClick={() => setShowRejectModal(true)} className="px-4 py-2.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-xl font-bold flex items-center transition">
                       <XCircle className="w-4 h-4 mr-2" /> Từ Chối
                    </button>
                    <button onClick={() => setShowApproveModal(true)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black flex items-center shadow-lg hover:bg-indigo-700 transition">
                       <CheckCircle className="w-5 h-5 mr-2" /> PHÊ DUYỆT
                    </button>
                 </>
              )}
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col xl:flex-row gap-6 w-full max-w-[1500px] mx-auto">
        {/* L EF T P A N E L */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
           {/* Info Block */}
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-black text-slate-800 mb-4 border-b border-slate-100 pb-3 flex items-center"><FileText className="w-4 h-4 mr-2 text-indigo-500" /> Thông Tin Đề Xuất</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                 <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Phòng Ban</label>
                    <p className="text-sm font-bold text-slate-700 mt-1">{data.department}</p>
                 </div>
                 <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Mục đích</label>
                    <p className="text-sm font-bold text-slate-700 mt-1">{data.purpose || 'Không có ghi chú'}</p>
                 </div>
                 <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Độ ưu tiên</label>
                    <p className="text-sm font-bold mt-1">
                       <span className={`px-2 py-1 rounded inline-block ${data.priority === 'Khẩn cấp' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>{data.priority}</span>
                    </p>
                 </div>
              </div>
           </div>

           {/* Line Items Block */}
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                 <h3 className="text-sm font-black text-slate-800">Danh Mục Vật Tư Yêu Cầu ({data.lines.length})</h3>
                 {outOfStockLines.length > 0 && <span className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-600 rounded text-[10px] font-black shadow-sm flex items-center"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Phát hiện {outOfStockLines.length} vật tư TỒN KHO THIẾU</span>}
              </div>

              <div className="overflow-x-auto">
                 <table className="w-full text-left whitespace-nowrap min-w-max">
                   <thead className="bg-white border-b border-slate-200">
                     <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                       <th className="p-4 w-10 text-center">STT</th>
                       <th className="p-4">Vật Tư</th>
                       <th className="p-4 text-center bg-slate-50 border-l border-slate-100">SL Xin</th>
                       <th className="p-4 text-center">Tồn Khả Dụng</th>
                       <th className="p-4 text-center bg-indigo-50 border-l border-indigo-100 w-32">SL Duyệt</th>
                       <th className="p-4 w-40">Lý Do Điều Chỉnh (Quyết định)</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {data.lines.map((l:any, ix:number) => {
                         const qoh = l.item.stocks?.[0]?.quantityOnHand || 0;
                         const isLack = l.qtyRequested > qoh;
                         const draftMod = lineActions.find(a => a.lineId === l.id);
                         const decisionColor = draftMod?.decision === 'REJECT' ? 'text-rose-500' : draftMod?.decision === 'DECREASE' ? 'text-amber-500' : 'text-emerald-500';

                         return (
                            <tr key={l.id} className={`hover:bg-slate-50 ${isLack ? 'bg-rose-50/20' : ''}`}>
                               <td className="p-4 text-center font-bold text-slate-400">{ix+1}</td>
                               <td className="p-4">
                                  <p className="font-bold text-slate-800 text-sm">{l.item.name}</p>
                                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-black">{l.item.mvpp}</span>
                               </td>
                               <td className="p-4 text-center bg-slate-50 border-l border-slate-100 font-black text-lg text-slate-700">{l.qtyRequested}</td>
                               <td className="p-4 text-center">
                                  <span className={`font-black text-base px-2 py-1 rounded ${isLack ? 'bg-rose-100 text-rose-700' : 'text-slate-600'}`}>{qoh}</span>
                               </td>
                               <td className="p-4 text-center bg-indigo-50 border-l border-indigo-100">
                                  {currentUserTurn ? (
                                      <input type="number" min="0" value={draftMod?.approvedQty ?? 0} onChange={(e) => updateLine(l.id, 'approvedQty', parseInt(e.target.value) || 0)} className={`w-20 text-center py-1.5 bg-white border border-indigo-200 rounded-lg font-black text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-400 ${draftMod?.decision==='REJECT'? 'opacity-50 line-through' : ''}`} />
                                  ) : (
                                      <span className="font-black text-lg text-emerald-600">{l.qtyApproved ?? '-'}</span>
                                  )}
                               </td>
                               <td className="p-4 relative">
                                  {currentUserTurn ? (
                                     <div className="flex flex-col gap-1">
                                        <span className={`text-[10px] font-black uppercase ${decisionColor}`}>{draftMod?.decision === 'APPROVE' ? 'ĐỒNG Ý CẤP' : draftMod?.decision === 'DECREASE' ? 'GIẢM SỐ LƯỢNG' : 'TỪ CHỐI'}</span>
                                        <input type="text" placeholder="Nhập lý do nếu giảm/từ chối..." value={draftMod?.reason || ''} onChange={(e) => updateLine(l.id, 'reason', e.target.value)} className={`w-full text-xs p-1.5 border border-slate-200 rounded bg-white outline-none focus:border-indigo-400 ${(draftMod?.decision === 'DECREASE' || draftMod?.decision === 'REJECT') && !draftMod?.reason.trim() ? 'border-rose-400 ring-2 ring-rose-100' : ''}`} />
                                     </div>
                                  ) : (
                                     <span className="text-xs text-slate-500">{l.approvalNote || l.status}</span>
                                  )}
                               </td>
                            </tr>
                         )
                      })}
                   </tbody>
                 </table>
              </div>
           </div>

           {/* Timeline Context Bottom */}
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Nhật ký xử lý hệ thống</h3>
            <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
               {data.approvalHistories?.map((audit: any) => (
                  <div key={audit.id} className="relative group">
                     <div className="absolute -left-[23px] top-1 w-4 h-4 rounded-full ring-4 ring-white shadow-sm bg-indigo-200 border-2 border-indigo-500"></div>
                     <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                           <p className="text-[10px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-600">{audit.action}</p>
                           <p className="text-xs font-bold text-slate-800">{audit.approver?.fullName}</p>
                           <span className="text-[10px] text-slate-400 font-bold">{new Date(audit.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                        {audit.reason && (
                           <p className="text-xs italic text-slate-600 mt-1 pl-1 border-l-2 border-slate-200 bg-slate-50 p-2 rounded">"{audit.reason}"</p>
                        )}
                     </div>
                  </div>
               ))}
            </div>
           </div>

        </div>

        {/* R I G H T P A N E L => "Khối Xử Lý" */}
        <div className="w-full xl:w-96 flex flex-col gap-6 shrink-0 relative mt-0">
           
           {currentUserTurn && (
              <div className="bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20 p-6 text-white border-b-4 border-indigo-800 animate-slide-up relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap className="w-24 h-24" />
                 </div>
                 <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-200 mb-2">Trạng thái hiện tại</h2>
                 <p className="text-2xl font-black mb-4">ĐẾN LƯỢT BẠN XỬ LÝ</p>

                 <div className="bg-white/10 rounded-xl p-4 mb-4 backdrop-blur-sm border border-white/20">
                    <p className="text-xs font-bold text-indigo-100 uppercase mb-1">Bước duyệt hiện tại</p>
                    <p className="text-base font-black">{data.permissions?.currentStep?.approverRole || data.status}</p>
                    
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-indigo-500/50 text-indigo-100">
                       <Clock className="w-4 h-4" />
                       <span className="text-xs font-bold">Hạn mức SLA: {data.prioritySlaHours || 24}h</span>
                    </div>
                 </div>

                 {apiWarnings.length > 0 && (
                    <div className="bg-rose-500 rounded-xl p-3 mb-4 shadow-inner">
                       <p className="text-[10px] font-black uppercase mb-2 flex items-center"><AlertCircle className="w-4 h-4 mr-1.5" /> Có {apiWarnings.length} Cảnh Báo Nghiệp Vụ</p>
                       <ul className="text-xs space-y-1 list-disc pl-4 font-medium opacity-90">
                          {apiWarnings.slice(0,3).map((w:any, idx:number) => <li key={idx}>[{w.type}] {w.message}</li>)}
                          {apiWarnings.length > 3 && <li>...</li>}
                       </ul>
                    </div>
                 )}

                 <div className="space-y-2 mt-2 relative z-10">
                    <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block w-full">Ghi chú Nội Bộ khi xử lý</label>
                    <textarea value={processNote} onChange={e => setProcessNote(e.target.value)} className="w-full text-sm bg-white/10 text-white placeholder-indigo-200 p-3 rounded-xl border border-indigo-400 outline-none focus:bg-white focus:text-indigo-900 transition min-h-[80px]" placeholder="Ghi chú, ý kiến cá nhân..."/>
                 </div>
                 <div className="space-y-2 mt-4 relative z-10">
                    <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block w-full">Chuyển tiếp cho người khác (Tuỳ chọn)</label>
                    <select value={nextAssigneeId} onChange={e => setNextAssigneeId(e.target.value)} className="w-full text-sm bg-white text-slate-800 p-2.5 rounded-xl border-none outline-none font-bold cursor-pointer">
                        <option value="">-- Để hệ thống tự điều phối theo line duyệt --</option>
                        {usersToForward.map(u => (
                           <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                        ))}
                    </select>
                 </div>
              </div>
           )}

           {!currentUserTurn && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center py-10">
                 <ShieldCheck className="w-12 h-12 text-slate-300 mb-4" />
                 <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Tiến trình phiếu</p>
                 <p className="text-lg font-black text-indigo-700 mt-2">{data.status.replace(/_/g, ' ')}</p>
                 <p className="text-sm font-medium text-slate-500 mt-3 max-w-[250px] leading-relaxed">
                    Phiếu đang nằm ở bước xử lý của người khác phòng ban khác. Bạn được cấp phép chỉ xem (Read-only view).
                 </p>
              </div>
           )}

        </div>
      </div>

      {/* MODALS ACTIONS SECTION */}
      {/* APPROVE PREVIEW MODAL */}
      {showApproveModal && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col">
                <div className="p-6 bg-indigo-600 text-white flex items-center justify-between border-b-4 border-indigo-800">
                    <h3 className="text-xl font-black flex items-center"><CheckCircle className="w-6 h-6 mr-3" /> Xem lại trước khi Duyệt</h3>
                    <button onClick={() => setShowApproveModal(false)} className="text-indigo-200 hover:text-white"><XCircle className="w-6 h-6"/></button>
                </div>
                <div className="p-6 space-y-4">
                   <p className="text-sm font-bold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      Bạn đang chuẩn bị chốt duyệt <span className="text-indigo-600 mx-1">{lineActions.filter(a => a.decision === 'APPROVE').length} dòng toàn bộ</span>, 
                      giảm SL <span className="text-amber-600 mx-1">{lineActions.filter(a => a.decision === 'DECREASE').length} dòng</span>, 
                      từ chối <span className="text-rose-600 mx-1">{lineActions.filter(a => a.decision === 'REJECT').length} dòng</span>.
                   </p>
                   {nextAssigneeId && (
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3 text-blue-800">
                         <Send className="w-5 h-5 shrink-0" />
                         <p className="text-sm font-bold">Lưu ý: Bạn chọn Explicit Override, luồng duyệt sẽ được bẻ qua để chuyển trực tiếp cho người được chỉ định ngay sau bước này.</p>
                      </div>
                   )}
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-3xl">
                    <button onClick={() => setShowApproveModal(false)} className="px-6 py-2.5 font-bold text-slate-500">Quay lại sửa</button>
                    <button onClick={submitApprove} className="px-8 py-2.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-md transition flex items-center">
                       <CheckCircle className="w-5 h-5 mr-2" /> TÔI CHẮC CHẮN ĐÃ XONG
                    </button>
                </div>
             </div>
         </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-100 flex items-center bg-rose-50 text-rose-600">
              <StopCircle className="w-7 h-7 mr-3" />
              <h3 className="text-xl font-black">Từ chối Yêu Cầu Hàng Loạt</h3>
            </div>
            <div className="p-6 flex flex-col gap-4">
               <p className="text-sm font-bold text-slate-500">Hành động này sẽ từ chối toàn bộ phiếu và đóng luồng duyệt hiện tại.</p>
               <div>
                 <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">
                   Lý do từ chối chung (Bắt buộc)
                 </label>
                 <textarea
                   autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                   className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white resize-none h-32 font-medium transition"
                 />
               </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowRejectModal(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">Hủy</button>
              <button 
                onClick={() => {
                   if (!rejectReason.trim()) return showToast('Bắt buộc nhập lý do!', 'error');
                   handleAction('/reject', { reason: rejectReason }, 'Đã từ chối phiếu hoàn toàn');
                   setShowRejectModal(false);
                }} 
                className="px-6 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition shadow-lg shadow-rose-500/30">
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RETURN MODAL */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-100 flex items-center bg-amber-50 text-amber-600">
              <CornerUpLeft className="w-7 h-7 mr-3" />
              <h3 className="text-xl font-black">Yêu cầu bổ sung dữ liệu</h3>
            </div>
            <div className="p-6">
              <p className="text-sm font-bold text-slate-500 mb-4">Trả lại phiếu về bước xin cấp để nhân viên thay đổi Số Lượng / Vật Tư và submit lại.</p>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Nhập hướng dẫn (Bắt buộc)</label>
              <textarea
                autoFocus value={returnReason} onChange={e => setReturnReason(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-amber-400 focus:bg-white resize-none h-32 font-medium transition"
              />
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowReturnModal(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">Hủy</button>
              <button 
                onClick={() => {
                   if (!returnReason.trim()) return showToast('Bắt buộc nhập lý do trả lại!', 'error');
                   handleAction('/return', { reason: returnReason }, 'Đã trả phiếu về xin cấp thành công');
                   setShowReturnModal(false);
                }} 
                className="px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-md transition">
                Chuyển Trả Lại
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
