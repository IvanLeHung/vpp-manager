const fs = require('fs');

const replacement = `          {/* RIGHT COLUMN: Actions & History */}
          <div className="w-full xl:w-96 flex flex-col gap-6 shrink-0 print:hidden">
              
              {/* Card 1: Trạng thái hiện tại */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Trạng thái hiện tại</h3>
                  <div className="flex items-center justify-between mb-4">
                      <span className={\`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest shadow-sm \${getStatusColor(data.status)}\`}>
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
              {(isApprover || isOwnerDraft || isWarehouse || isOwnerPending || canCancel || isHandover || isFutureApprover || (currentUser.role==='ADMIN' && ['APPROVED', 'READY_TO_ISSUE', 'PARTIALLY_ISSUED'].includes(data.status) && data.lines.some((l:any) => l.qtyRequested > (l.qtyApproved ?? 0)))) && (
               <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-200 p-6 relative overflow-hidden">
                   {(isApprover || isWarehouse) && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>}
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Thao tác xử lý</h3>
                   <div className="flex flex-col gap-3 relative z-10">
                       
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
                           <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col gap-3">
                              <p className="text-[11px] font-black text-indigo-800 text-center uppercase tracking-wider mb-1">Bạn đang là người duyệt hiện tại</p>
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

              {/* Box 3: Tuyến Duyệt Cấu Hình */}
              {data.approvalSteps && data.approvalSteps.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col relative overflow-hidden">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">Tuyến Phê Duyệt</h3>
                  <div className="space-y-0 relative before:absolute before:inset-0 before:-translate-x-[7.5px] before:ml-5 md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
                    {data.approvalSteps.map((step: any, index: number) => {
                       const isCurrent = step.status === 'PENDING' && step.stepNo === data.currentApprovalStep && data.status === 'PENDING_MANAGER';
                       const isDone = step.status === 'APPROVED';
                       const isBypassed = step.status === 'SKIPPED';
                       
                       return (
                      <div key={step.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-6 last:mb-0">
                        {/* Status Point */}
                        <div className={\`flex items-center justify-center w-8 h-8 rounded-full border-4 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 \${
                          isDone ? 'bg-emerald-500 border-white text-white' :
                          isCurrent ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-4 ring-indigo-50' :
                          isBypassed ? 'bg-slate-200 border-white text-slate-400' :
                          'bg-white border-slate-200 text-slate-400'
                        }\`}>
                           {isDone ? <CheckCircle className="w-4 h-4"/> : <span className="font-bold text-xs">{step.stepNo}</span>}
                        </div>
                        {/* Content */}
                        <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
                           <p className={\`font-bold text-sm \${isCurrent ? 'text-indigo-700' : isDone ? 'text-slate-800' : 'text-slate-500'}\`}>{step.approver?.fullName || 'Người duyệt'}</p>
                           <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">{step.status}</p>
                           {isCurrent && <p className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded inline-block mt-1 font-bold animate-pulse">Đang chờ xử lý</p>}
                        </div>
                      </div>
                    )})}
                    {/* Final Step (Admin) */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mt-6">
                        <div className={\`flex items-center justify-center w-8 h-8 rounded-full border-4 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 \${
                          data.status === 'PENDING_ADMIN' ? 'bg-amber-500 border-white text-white ring-4 ring-amber-50 animate-pulse' :
                          ['APPROVED','READY_TO_ISSUE','PARTIALLY_ISSUED','WAITING_HANDOVER','COMPLETED'].includes(data.status) ? 'bg-emerald-500 border-white text-white' :
                          'bg-white border-slate-200 text-slate-400'
                        }\`}>
                           {['APPROVED', 'READY_TO_ISSUE', 'WAITING_HANDOVER', 'COMPLETED', 'PARTIALLY_ISSUED'].includes(data.status) ? <CheckCircle className="w-4 h-4"/> : <span className="font-bold text-[10px]"><CheckSquare className="w-3 h-3"/></span>}
                        </div>
                        <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
                           <p className={\`font-bold text-sm \${data.status === 'PENDING_ADMIN' ? 'text-amber-700' : ['APPROVED','READY_TO_ISSUE','WAITING_HANDOVER','COMPLETED'].includes(data.status) ? 'text-slate-800' : 'text-slate-500'}\`}>Hành chính (Admin)</p>
                           <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Duyệt cấp cuối</p>
                           {data.status === 'PENDING_ADMIN' && <p className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded inline-block mt-1 font-bold animate-pulse">Đang chờ xử lý</p>}
                        </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Box 4: Approval Timeline */}
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
                              <div className={\`absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white \${actionColor}\`}></div>
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
          </div>`;

const file = 'd:/APP VPP/vpp-manager-main/src/pages/requests/RequestsDetail.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Find start line
let startIdx = 216;
let endIdx = 351;
lines.splice(startIdx, endIdx - startIdx + 1, replacement);

fs.writeFileSync(file, lines.join('\n'));
console.log('Update successful');
