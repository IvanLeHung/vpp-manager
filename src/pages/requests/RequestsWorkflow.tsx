import { 
  ArrowLeft, FileText, Users, ShieldCheck, 
  Package, Truck, CheckCircle2, ShoppingCart, 
  AlertCircle, Info, GitBranch, ArrowRight,
  RotateCcw, XCircle, MousePointer2, ListChecks
} from 'lucide-react';

interface Props {
  onBack: () => void;
}

export default function RequestsWorkflow({ onBack }: Props) {
  const steps = [
    {
      id: 1,
      title: 'Khởi tạo Yêu cầu',
      role: 'EMPLOYEE / MANAGER',
      desc: 'Người dùng chọn vật tư từ danh mục, nhập số lượng và mục đích sử dụng.',
      actions: ['Chọn mã VPP', 'Nhập SL dự kiến', 'Ghi chú mục đích'],
      rules: 'Có thể lưu nháp (DRAFT) để chỉnh sửa sau; Tự động tính tổng tiền dự toán.',
      outcome: 'Trình duyệt lên Quản lý trực tiếp.',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-slate-500',
      status: 'DRAFT'
    },
    {
      id: 2,
      title: 'Duyệt Tuyến Quản lý',
      role: 'MANAGER',
      desc: 'Quản lý trực tiếp tiếp nhận thông báo và xem xét tính hợp lý của nhu cầu.',
      actions: ['Phê duyệt', 'Trả lại sửa', 'Từ chối (Reject)'],
      rules: 'Dựa trên sơ đồ tổ chức (ManagerId); Duyệt tuần tự nếu có nhiều lãnh đạo.',
      outcome: 'Chuyển thông tin cho bộ phận Hành chính.',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-amber-500',
      status: 'PENDING_MANAGER'
    },
    {
      id: 3,
      title: 'Phê duyệt Hành chính',
      role: 'ADMIN',
      desc: 'Admin kiểm tra tồn kho, hạn mức và ra quyết định cấp phát chính thức.',
      actions: ['Điều chỉnh SL duyệt', 'Phân bổ kho xuất', 'Chỉ định vật tư thay thế'],
      rules: 'Ưu tiên đơn vị khẩn cấp; Kiểm tra hạn mức tiêu dùng của phòng ban.',
      outcome: 'Phiếu sẵn sàng xuất kho (APPROVED).',
      icon: <ShieldCheck className="w-6 h-6" />,
      color: 'bg-indigo-500',
      status: 'PENDING_ADMIN'
    },
    {
      id: 4,
      title: 'Xử lý Kho vận',
      role: 'WAREHOUSE',
      desc: 'Thủ kho thực hiện lệnh soạn hàng và trừ tồn kho thực tế trên hệ thống.',
      actions: ['Soạn hàng (Picking)', 'Đóng gói', 'Xác nhận xuất thực tế'],
      rules: 'Tồn kho trừ ngay khi xuất; Tự động tạo mã StockMovement để đối soát.',
      outcome: 'Hàng sẵn sàng chờ bàn giao.',
      icon: <Package className="w-6 h-6" />,
      color: 'bg-blue-600',
      status: 'READY_TO_ISSUE'
    },
    {
      id: 5,
      title: 'Bàn giao & Xác nhận',
      role: 'RECIPIENT',
      desc: 'Người yêu cầu nhận hàng và xác nhận khớp với số lượng thực tế bàn giao.',
      actions: ['Kiểm đếm vật tư', 'Ký nhận kỹ thuật số', 'Phản hồi khiếu nại (nếu có)'],
      rules: 'Xác nhận đúng SL đã nhận tại kho hoặc điểm giao; Không thể sửa sau xác nhận.',
      outcome: 'Phiếu chuẩn bị đóng lại.',
      icon: <Truck className="w-6 h-6" />,
      color: 'bg-emerald-500',
      status: 'WAITING_HANDOVER'
    },
    {
      id: 6,
      title: 'Hoàn tất',
      role: 'SYSTEM',
      desc: 'Hệ thống tự động lưu trữ dữ liệu và đóng hồ sơ phiếu.',
      actions: ['Lưu lịch sử Audit', 'Cập nhật báo cáo', 'Thông báo hoàn thành'],
      rules: 'Dữ liệu được lưu trữ vĩnh viễn; Tự động tổng hợp vào báo cáo Analytics tháng.',
      outcome: 'Kết thúc chu kỳ xử lý.',
      icon: <CheckCircle2 className="w-6 h-6" />,
      color: 'bg-teal-600',
      status: 'COMPLETED'
    }
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-10 gap-6 shrink-0 z-10 sticky top-0">
        <button 
          onClick={onBack}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition shadow-inner group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform"/>
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <GitBranch className="w-7 h-7 text-indigo-600" />
             Bản Đồ Quy Trình Hệ Thống Chi Tiết
          </h2>
          <p className="text-sm font-semibold text-slate-500">Hướng dẫn vận hành chuẩn hóa nội bộ Danko Group.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-16 relative z-10">
        <div className="max-w-7xl mx-auto pb-20">
          
          {/* Main Flow Diagram */}
          <section>
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-10 bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)]"></div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-wider">1. Luồng Cấp Phát Vật Tư (Main Flow)</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5"><MousePointer2 className="w-3 h-3"/> Rê chuột vào từng bước để xem chi tiết nghiệp vụ</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 relative">
              {/* Connector lines (Desktop) - Improved design */}
              <div className="hidden xl:block absolute top-[60px] left-[15%] right-[15%] h-0.5 border-t-2 border-dashed border-slate-200 -z-0"></div>
              <div className="hidden xl:block absolute top-[450px] left-[15%] right-[15%] h-0.5 border-t-2 border-dashed border-slate-200 -z-0"></div>

              {steps.map((step, idx) => (
                <div key={step.id} className="relative z-10 group h-full">
                  <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl shadow-slate-200/40 hover:shadow-indigo-500/15 transition-all duration-500 hover:-translate-y-3 group-hover:border-indigo-400 flex flex-col h-full bg-gradient-to-b from-white to-slate-50/30">
                    
                    <div className="flex justify-between items-start mb-6">
                        <div className={`w-16 h-16 ${step.color} text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-${step.color.split('-')[1]}-500/30 transform rotate-3 group-hover:rotate-12 transition-transform duration-500`}>
                            {step.icon}
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[32px] font-black text-slate-100 group-hover:text-indigo-50 leading-none transition-colors">0{step.id}</span>
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase tracking-widest mt-1 border border-indigo-100">{step.role}</span>
                        </div>
                    </div>
                    
                    <h4 className="text-xl font-black text-slate-800 mb-3 tracking-tight group-hover:text-indigo-600 transition-colors">{step.title}</h4>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">{step.desc}</p>
                    
                    <div className="flex-1 space-y-4">
                        <div className="p-4 bg-white/50 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5"/> Hành động chính</p>
                            <ul className="grid grid-cols-1 gap-1.5">
                                {step.actions.map((act, i) => (
                                    <li key={i} className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> {act}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Chính sách & Quy tắc</p>
                            <p className="text-xs font-semibold text-slate-600 leading-snug">{step.rules}</p>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Kết quả</p>
                            <p className="text-xs font-black text-slate-700">{step.outcome}</p>
                         </div>
                         <div className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase">{step.status}</div>
                    </div>

                    {/* Mobile/Tablet Arrow */}
                    {idx < steps.length - 1 && (
                      <div className="xl:hidden absolute -bottom-6 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-slate-400 z-20">
                         <ArrowRight className="w-5 h-5 rotate-90" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* New Section 2: Exception Flows */}
          <section className="mt-16">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-2 h-10 bg-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.3)]"></div>
               <h3 className="text-2xl font-black text-slate-800 uppercase tracking-wider">2. Luồng Ngoại Lệ & Xử Lý Sự Cố</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center text-center gap-4 hover:border-rose-300 transition-colors">
                    <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shadow-inner">
                        <RotateCcw className="w-7 h-7" />
                    </div>
                    <div>
                        <h5 className="font-black text-slate-800 text-lg">Yêu cầu làm lại (Return)</h5>
                        <p className="text-sm text-slate-500 mt-2 font-medium">Phiếu bị trả lại bước Khởi tạo để sửa đổi nội dung. Người lập có thể chỉnh sửa và Gửi duyệt lại.</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center text-center gap-4 hover:border-slate-400 transition-colors">
                    <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center shadow-inner">
                        <XCircle className="w-7 h-7" />
                    </div>
                    <div>
                        <h5 className="font-black text-slate-800 text-lg">Từ Chối (Reject)</h5>
                        <p className="text-sm text-slate-500 mt-2 font-medium">Phiếu bị đóng vĩnh viễn và không thể thực hiện thêm thao tác. Người lập được thông báo lý do cụ thể.</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center text-center gap-4 hover:border-blue-300 transition-colors">
                    <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner">
                        <MousePointer2 className="w-7 h-7" />
                    </div>
                    <div>
                        <h5 className="font-black text-slate-800 text-lg">Tự thu hồi (Withdraw)</h5>
                        <p className="text-sm text-slate-500 mt-2 font-medium">Người lập có quyền rút phiếu để sửa chữa trước khi có người duyệt thực hiện thao tác đầu tiên.</p>
                    </div>
                </div>
            </div>
          </section>

          {/* Backorder Flow Section */}
          <section className="mt-16 bg-white/60 backdrop-blur-xl border border-indigo-100 rounded-[3.5rem] p-8 md:p-12 shadow-2xl shadow-indigo-500/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]"></div>
             
             <div className="flex items-center gap-3 mb-12 relative">
               <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-lg shadow-amber-500/30">
                  <ShoppingCart className="w-7 h-7" />
               </div>
               <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-wider">3. Quy trình Mua sắm (Nếu kho báo thiếu)</h3>
                  <p className="text-sm font-semibold text-amber-600 mt-0.5">Tự động kết nối với quy trình Thu mua (Procurement flow)</p>
               </div>
             </div>

             <div className="flex flex-col xl:flex-row items-stretch gap-8 relative">
                 <div className="flex-1 bg-white p-8 rounded-3xl border border-slate-100 flex flex-col gap-6 shadow-sm border-b-4 border-b-rose-500">
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center shrink-0">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded uppercase">Trigger</span>
                    </div>
                    <div>
                        <p className="font-black text-slate-800 text-lg italic">"Duyệt xong nhưng kho báo thiếu"</p>
                        <p className="text-sm text-slate-500 mt-3 font-medium leading-relaxed">Khi số lượng duyệt &gt; Tồn kho khả dụng (Available Stock), hệ thống tự ghi nhận nợ (BACKORDER) cho những dòng hàng này.</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center justify-center text-slate-300">
                    <div className="p-3 bg-white rounded-full border border-slate-100 shadow-sm">
                        <ArrowRight className="w-8 h-8 xl:rotate-0 rotate-90" />
                    </div>
                 </div>

                 <div className="flex-1 bg-white p-8 rounded-3xl border border-slate-100 flex flex-col gap-6 shadow-sm border-b-4 border-b-amber-500">
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
                            <ShoppingCart className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded uppercase">Action</span>
                    </div>
                    <div>
                        <p className="font-black text-slate-800 text-lg italic">"Admin khởi tạo Đơn Mua (PO)"</p>
                        <p className="text-sm text-slate-500 mt-3 font-medium leading-relaxed">Admin thực hiện chức năng "Tạo PO báo thiếu". Các mặt hàng này sẽ được đẩy sang luồng mua sắm chuyên biệt.</p>
                    </div>
                 </div>

                 <div className="flex items-center justify-center text-slate-300">
                    <div className="p-3 bg-white rounded-full border border-slate-100 shadow-sm">
                        <ArrowRight className="w-8 h-8 xl:rotate-0 rotate-90" />
                    </div>
                 </div>

                 <div className="flex-1 bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-8 rounded-3xl shadow-xl shadow-emerald-500/20 flex flex-col gap-6 border-b-4 border-b-emerald-700">
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-sm">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-100 bg-white/10 px-2 py-0.5 rounded uppercase backdrop-blur-md">Final</span>
                    </div>
                    <div>
                        <p className="font-black text-lg">"Nhập kho & Tự động trả hàng"</p>
                        <p className="text-sm text-emerald-50 mt-3 font-medium leading-relaxed">Ngay khi PO được nhập kho, hệ thống tự động thông báo và hướng dẫn người dùng nhận hàng Backorder.</p>
                    </div>
                 </div>
             </div>
          </section>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex gap-6 shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                   <Info className="w-8 h-8" />
                </div>
                <div>
                   <h5 className="font-black text-slate-800 mb-3 uppercase tracking-wide text-sm">Tài liệu & Chứng từ</h5>
                   <p className="text-sm text-slate-500 font-medium leading-relaxed">Mọi phiếu sau khi qua bước 2 đều có thể "In phiếu yêu cầu" theo định dạng chuẩn A4 có mã QR xác thực. Các chữ ký được thu thập điện tử qua nhật ký hệ thống.</p>
                </div>
             </div>

             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex gap-6 shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-500">
                   <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                   <h5 className="font-black text-slate-800 mb-3 uppercase tracking-wide text-sm">Bảo mật & Phân quyền</h5>
                   <p className="text-sm text-slate-500 font-medium leading-relaxed">Hệ thống phân quyền Role-based Access Control (RBAC). Chỉ người được định danh chính xác mới có quyền thực hiện Phê duyệt hoặc Xuất kho trên phiếu.</p>
                </div>
             </div>
          </div>

          <div className="mt-20 text-center">
                <div className="inline-flex items-center gap-2 px-6 py-2 bg-slate-800 text-slate-300 rounded-full text-xs font-bold ring-8 ring-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400"/>
                    Hệ thống vận hành tiêu chuẩn &ndash; Phiên bản 2.0
                </div>
          </div>

        </div>
      </div>
    </div>
  );
}
