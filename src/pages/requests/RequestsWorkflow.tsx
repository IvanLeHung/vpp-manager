import { 
  ArrowLeft, FileText, Users, ShieldCheck, 
  Package, Truck, CheckCircle2, ShoppingCart, 
  AlertCircle, Info, GitBranch, ArrowRight
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
      desc: 'Người dùng chọn vật tư từ danh mục, nhập số lượng và mục đích sử dụng. Phiếu được lưu ở trạng thái nháp (DRAFT).',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-slate-500',
      status: 'DRAFT'
    },
    {
      id: 2,
      title: 'Duyệt Tuyến Quản lý',
      role: 'MANAGER',
      desc: 'Quản lý trực tiếp nhận thông báo và phê duyệt cấp 1. Nếu có nhiều quản lý, phiếu sẽ đi tuần tự qua từng người.',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-amber-500',
      status: 'PENDING_MANAGER'
    },
    {
      id: 3,
      title: 'Phê duyệt Hành chính',
      role: 'ADMIN',
      desc: 'Bộ phận Hành chính (Admin) kiểm tra tính hợp lý, điều chỉnh số lượng duyệt dựa trên tồn kho và hạn mức.',
      icon: <ShieldCheck className="w-6 h-6" />,
      color: 'bg-indigo-500',
      status: 'PENDING_ADMIN'
    },
    {
      id: 4,
      title: 'Xử lý Kho vận',
      role: 'WAREHOUSE',
      desc: 'Thủ kho thực hiện lệnh xuất kho thực tế, trừ tồn kho hệ thống và đóng gói hàng hoá chuẩn bị bàn giao.',
      icon: <Package className="w-6 h-6" />,
      color: 'bg-blue-600',
      status: 'READY_TO_ISSUE'
    },
    {
      id: 5,
      title: 'Bàn giao & Xác nhận',
      role: 'RECIPIENT',
      desc: 'Người đề xuất nhận hàng tại kho hoặc điểm nhận, thực hiện "Xác nhận đã nhận đủ hàng" trên ứng dụng.',
      icon: <Truck className="w-6 h-6" />,
      color: 'bg-emerald-500',
      status: 'WAITING_HANDOVER'
    },
    {
      id: 6,
      title: 'Hoàn tất',
      role: 'SYSTEM',
      desc: 'Phiếu đóng lại, lịch sử được lưu trữ phục vụ báo cáo và thống kê tiêu dùng vật tư.',
      icon: <CheckCircle2 className="w-6 h-6" />,
      color: 'bg-teal-600',
      status: 'COMPLETED'
    }
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative">
      <div className="h-20 bg-white border-b border-slate-200 flex items-center px-10 gap-6 shrink-0 z-10">
        <button 
          onClick={onBack}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition shadow-inner"
        >
          <ArrowLeft className="w-5 h-5"/>
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <GitBranch className="w-7 h-7 text-indigo-600" />
             Bản Đồ Quy Trình Hệ Thống
          </h2>
          <p className="text-sm font-semibold text-slate-500">Hướng dẫn luồng vận hành của phiếu đề xuất và mua sắm vật tư.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-slate-50 to-indigo-50/20">
        <div className="max-w-6xl mx-auto space-y-12 pb-20">
          
          {/* Main Flow Diagram */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-8 bg-indigo-600 rounded-full"></div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-wider">1. Luồng Cấp Phát Vật Tư (Main Flow)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
              {/* Connector lines (Desktop) */}
              <div className="hidden lg:block absolute top-[45px] left-[25%] right-[25%] h-0.5 bg-slate-200 -z-0"></div>
              <div className="hidden lg:block absolute top-[345px] left-[25%] right-[25%] h-0.5 bg-slate-200 -z-0"></div>

              {steps.map((step, idx) => (
                <div key={step.id} className="relative z-10 group">
                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-2 group-hover:border-indigo-200 flex flex-col items-center text-center">
                    <div className={`w-20 h-20 ${step.color} text-white rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-${step.color.split('-')[1]}-500/40 transform rotate-3 group-hover:rotate-6 transition-transform`}>
                      {step.icon}
                    </div>
                    
                    <div className="mb-2">
                       <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">{step.role}</span>
                    </div>
                    
                    <h4 className="text-lg font-black text-slate-800 mb-3 tracking-tight">{step.id}. {step.title}</h4>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed leading-snug">{step.desc}</p>
                    
                    <div className="mt-6 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-bold text-slate-400">Trạng thái:</span>
                      <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">{step.status}</span>
                    </div>

                    {idx < steps.length - 1 && (
                      <div className="lg:hidden absolute -bottom-6 left-1/2 -translate-x-1/2 w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                         <ArrowRight className="w-4 h-4 rotate-90" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Backorder Flow Section */}
          <section className="bg-white/60 backdrop-blur-xl border border-indigo-100 rounded-[3rem] p-10 shadow-2xl shadow-indigo-500/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px]"></div>
             
             <div className="flex items-center gap-3 mb-10 relative">
               <ShoppingCart className="w-8 h-8 text-amber-500" />
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-wider">2. Luồng Mua Sắm (Nếu kho hết hàng)</h3>
             </div>

             <div className="flex flex-col md:flex-row items-stretch gap-6 relative">
                 <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-100 flex items-center gap-5 shadow-sm">
                    <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center shrink-0">
                       <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-black text-slate-800 text-sm italic">"Phiếu duyệt xong nhưng Kho báo thiếu"</p>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Hệ thống ghi nhận trạng thái BACKORDER cho các dòng hàng thiếu tồn kho.</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center justify-center text-slate-300">
                    <ArrowRight className="w-8 h-8 md:rotate-0 rotate-90" />
                 </div>

                 <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-100 flex items-center gap-5 shadow-sm">
                    <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
                       <ShoppingCart className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-black text-slate-800 text-sm italic">"Admin khởi tạo Đơn Mua (PO)"</p>
                        <p className="text-xs text-slate-500 mt-1 font-medium"> Admin tạo PO từ phiếu đề xuất ban đầu để mua bổ sung từ nhà cung cấp.</p>
                    </div>
                 </div>

                 <div className="flex items-center justify-center text-slate-300">
                    <ArrowRight className="w-8 h-8 md:rotate-0 rotate-90" />
                 </div>

                 <div className="flex-1 bg-emerald-500 text-white p-6 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-5">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                       <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-black text-sm">"Nhập kho & Trả hàng"</p>
                        <p className="text-[10px] text-emerald-100 mt-1 font-medium uppercase tracking-widest">Tự động báo người dùng lấy hàng</p>
                    </div>
                 </div>
             </div>
          </section>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="bg-white p-8 rounded-3xl border border-slate-200 flex gap-6 shadow-sm">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                   <Info className="w-7 h-7" />
                </div>
                <div>
                   <h5 className="font-black text-slate-800 mb-2 uppercase tracking-wide text-sm">Tuyến Phê Duyệt Cấp 1</h5>
                   <p className="text-sm text-slate-500 font-medium leading-relaxed">Hệ thống sẽ dựa vào sơ đồ tổ chức (ManagerId) để tự động gán người duyệt trực tiếp. Nếu bạn là Manager tự tạo phiếu, bước này sẽ được bỏ qua và chuyển thẳng lên bộ phận Hành chính.</p>
                </div>
             </div>

             <div className="bg-white p-8 rounded-3xl border border-slate-200 flex gap-6 shadow-sm">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                   <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                   <h5 className="font-black text-slate-800 mb-2 uppercase tracking-wide text-sm">Hạn Mức & Tồn Kho</h5>
                   <p className="text-sm text-slate-500 font-medium leading-relaxed">Bộ phận Hành chính (Admin) có toàn quyền điều chỉnh số lượng duyệt để đảm bảo công bằng cho toàn công ty, tránh lãng phí và ưu tiên các đơn vị khẩn cấp.</p>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
