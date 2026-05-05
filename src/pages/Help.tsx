import { 
  HelpCircle,
  MessageSquare,
  ChevronRight,
  PlusCircle,
  ClipboardList,
  Activity,
  Users,
  CheckCircle,
  Eye,
  FileSearch
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function Help() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const isManager = currentUser?.role === 'MANAGER';

  const employeeFaqs = [
    {
      q: "Tôi gửi yêu cầu xong thì ai duyệt?",
      a: "Yêu cầu của bạn trước hết sẽ được Trưởng bộ phận của bạn duyệt, sau đó sẽ chuyển qua bộ phận Hành chính/Kho để xử lý và cấp phát."
    },
    {
      q: "Tôi có thể sửa yêu cầu đã gửi không?",
      a: "Bạn chỉ có thể sửa yêu cầu khi nó đang ở trạng thái 'Nháp' hoặc bị 'Trả lại'. Nếu yêu cầu đã gửi đi và đang chờ duyệt, bạn cần liên hệ người duyệt để từ chối hoặc thu hồi."
    },
    {
      q: "Vì sao yêu cầu của tôi bị từ chối?",
      a: "Lý do từ chối thường được ghi rõ trong mục chi tiết yêu cầu. Thông thường có thể do sai quy cách, vượt định mức hoặc kho đang hết hàng."
    },
    {
      q: "Tôi cần hỗ trợ kỹ thuật thì liên hệ ai?",
      a: "Mọi thắc mắc về sử dụng phần mềm và quy trình cấp phát, bạn vui lòng vào mục 'Liên hệ hành chính' để xem thông tin chuyên viên phụ trách."
    }
  ];

  const managerFaqs = [
    {
      q: "Tôi cần xử lý yêu cầu ở đâu?",
      a: "Vào mục Chờ tôi duyệt. Các yêu cầu đang chờ Trưởng bộ phận duyệt sẽ hiển thị tại đây."
    },
    {
      q: "Tôi có thể xem yêu cầu của nhân viên trong bộ phận không?",
      a: "Có. Vào mục Yêu cầu bộ phận để xem danh sách yêu cầu của các nhân sự thuộc phạm vi quản lý của bạn."
    },
    {
      q: "Khi nào nên từ chối yêu cầu?",
      a: "Bạn nên từ chối khi: Yêu cầu không phù hợp nhu cầu thực tế, Số lượng đề nghị không hợp lý, Lý do sử dụng chưa rõ ràng, Yêu cầu bị trùng, hoặc Nhân sự gửi sai loại yêu cầu."
    },
    {
      q: "Nếu yêu cầu thiếu thông tin thì làm gì?",
      a: "Không nên từ chối ngay nếu chỉ thiếu thông tin. Hãy chọn Yêu cầu bổ sung và ghi rõ nhân viên cần bổ sung nội dung nào (Ví dụ: Vui lòng bổ sung lý do sử dụng)."
    },
    {
      q: "Sau khi tôi duyệt thì yêu cầu đi đâu?",
      a: "Sau khi Trưởng bộ phận duyệt, yêu cầu sẽ được chuyển sang bước xử lý tiếp theo như: Hành chính xử lý, Kho chuẩn bị hàng, hoặc Mua sắm tiếp nhận."
    }
  ];

  const faqs = isManager ? managerFaqs : employeeFaqs;

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-full">
      <div className="mb-10">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic flex items-center gap-3">
          <HelpCircle className="w-8 h-8 text-indigo-600" /> Hướng dẫn sử dụng
        </h1>
        <p className="text-slate-500 font-bold mt-1">
          {isManager 
            ? 'Cẩm nang nhanh dành cho Trưởng bộ phận khi phê duyệt yêu cầu.' 
            : 'Cẩm nang nhanh giúp bạn làm quen với hệ thống quản trị VPP.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Guide Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">4 Bước cơ bản</h2>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                   {isManager ? 'DÀNH CHO TRƯỞNG BỘ PHẬN' : 'DÀNH CHO NHÂN VIÊN'}
                </span>
            </div>
            
            <div className="p-8 space-y-8">
                {isManager ? (
                  <>
                    <GuideStep 
                      number="01"
                      icon={<ClipboardList className="w-6 h-6 text-amber-500" />}
                      title="KIỂM TRA YÊU CẦU CHỜ DUYỆT"
                      desc="Vào mục 'Chờ tôi duyệt' để xem các yêu cầu đang chờ bạn xử lý."
                      onClick={() => navigate('/requests?status=PENDING_MANAGER')}
                    />
                    <GuideStep 
                      number="02"
                      icon={<Eye className="w-6 h-6 text-indigo-500" />}
                      title="XEM CHI TIẾT YÊU CẦU"
                      desc="Kiểm tra người đề xuất, danh sách mặt hàng, số lượng, lý do và ngày cần hàng."
                      onClick={() => navigate('/requests')}
                    />
                    <GuideStep 
                      number="03"
                      icon={<CheckCircle className="w-6 h-6 text-emerald-500" />}
                      title="PHÊ DUYỆT / TỪ CHỐI"
                      desc="Chọn Duyệt nếu yêu cầu hợp lệ. Nếu chưa phù hợp, chọn Từ chối hoặc Yêu cầu bổ sung và nhập lý do."
                      onClick={() => navigate('/requests')}
                    />
                    <GuideStep 
                      number="04"
                      icon={<FileSearch className="w-6 h-6 text-rose-500" />}
                      title="THEO DÕI YÊU CẦU BỘ PHẬN"
                      desc="Vào mục 'Yêu cầu bộ phận' để theo dõi trạng thái các yêu cầu của nhân sự trong bộ phận."
                      onClick={() => navigate('/requests')}
                    />
                  </>
                ) : (
                  <>
                    <GuideStep 
                      number="01"
                      icon={<PlusCircle className="w-6 h-6 text-emerald-500" />}
                      title="TẠO YÊU CẦU CẤP PHÁT"
                      desc="Vào mục 'Tạo yêu cầu', chọn mặt hàng từ danh mục, nhập số lượng và lý do cần dùng. Bạn có thể lưu nháp hoặc gửi duyệt ngay."
                      onClick={() => navigate('/requests?mode=CREATE')}
                    />
                    <GuideStep 
                      number="02"
                      icon={<ClipboardList className="w-6 h-6 text-amber-500" />}
                      title="THEO DÕI TRẠNG THÁI"
                      desc="Vào 'Yêu cầu của tôi' để xem phiếu đang ở bước nào (Chờ duyệt, Đang chuẩn bị hàng, Sẵn sàng nhận)."
                      onClick={() => navigate('/requests')}
                    />
                    <GuideStep 
                      number="03"
                      icon={<Activity className="w-6 h-6 text-indigo-500" />}
                      title="XEM LỊCH SỬ CẤP PHÁT"
                      desc="Sau khi nhận hàng thành công, thông tin vật tư sẽ được lưu vào 'Lịch sử cấp phát' để bạn dễ dàng tra cứu lại."
                      onClick={() => navigate('/allocation-history')}
                    />
                    <GuideStep 
                      number="04"
                      icon={<Users className="w-6 h-6 text-rose-500" />}
                      title="HỖ TRỢ & LIÊN HỆ"
                      desc="Nếu gặp khó khăn, hãy vào mục 'Liên hệ hành chính' để liên hệ trực tiếp với chuyên viên quản lý tài sản."
                      onClick={() => navigate('/contact')}
                    />
                  </>
                )}
             </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-8 flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-indigo-600" /> Câu hỏi thường gặp (FAQ)
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-indigo-200 transition-all">
                  <h4 className="text-sm font-black text-slate-800 mb-2 flex items-start gap-3">
                    <span className="text-indigo-600">Q:</span> {faq.q}
                  </h4>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed pl-7">
                    <span className="text-emerald-600 font-black mr-2">A:</span> {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar help */}
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200">
               <h3 className="text-xl font-black tracking-tight mb-4 uppercase italic">
                 {isManager ? 'BẠN CẦN HỖ TRỢ PHÊ DUYỆT?' : 'Bạn cần hỗ trợ ngay?'}
               </h3>
               <p className="text-xs font-bold text-indigo-100 mb-8 leading-relaxed">
                 {isManager 
                   ? 'Nếu gặp khó khăn trong quá trình duyệt yêu cầu, vui lòng liên hệ Hành chính để được hỗ trợ.'
                   : 'Đừng ngần ngại liên hệ với chúng tôi nếu bạn gặp bất kỳ vấn đề nào trong quá trình sử dụng hệ thống.'}
               </p>
               <button 
                 onClick={() => navigate('/contact')}
                 className="w-full py-4 bg-white text-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
               >
                 Xem thông tin liên hệ <ChevronRight className="w-4 h-4" />
               </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Mẹo nhỏ</h3>
               <ul className="space-y-4">
                 {isManager ? (
                   <>
                     <TipItem text="Kiểm tra kỹ số lượng và lý do trước khi duyệt." />
                     <TipItem text="Ưu tiên xử lý các yêu cầu có trạng thái khẩn cấp hoặc sắp quá hạn." />
                     <TipItem text="Nếu thông tin chưa rõ, hãy yêu cầu bổ sung thay vì từ chối ngay." />
                     <TipItem text="Theo dõi 'Yêu cầu bộ phận' để nắm tình trạng cấp phát/mua sắm của nhân sự." />
                     <TipItem text="Ghi lý do rõ ràng khi từ chối để nhân viên dễ chỉnh sửa." />
                   </>
                 ) : (
                   <>
                     <TipItem text="Nên kiểm tra kỹ số lượng và đơn vị tính trước khi gửi yêu cầu." />
                     <TipItem text="Bạn có thể tạo yêu cầu làm khách nếu chưa có tài khoản đăng nhập." />
                     <TipItem text="Lưu nháp yêu cầu nếu bạn chưa chọn đủ danh sách vật tư." />
                   </>
                 )}
               </ul>
            </div>
        </div>

      </div>
    </div>
  );
}

function GuideStep({ number, icon, title, desc, onClick }: any) {
  return (
    <div onClick={onClick} className="flex gap-6 group cursor-pointer">
       <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:border-indigo-300 group-hover:bg-indigo-50 transition-all">
             {icon}
          </div>
          <div className="w-px flex-1 bg-slate-100 my-2"></div>
       </div>
       <div className="pb-2">
          <div className="flex items-center gap-3 mb-1">
             <span className="text-[10px] font-black text-slate-300 tracking-widest font-mono">{number}</span>
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{title}</h3>
          </div>
          <p className="text-[11px] font-bold text-slate-500 leading-relaxed max-w-lg">{desc}</p>
       </div>
    </div>
  );
}
function TipItem({ text }: { text: string }) {
  return (
    <li className="flex gap-3 items-start">
       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
       <p className="text-[11px] font-bold text-slate-500 leading-tight">{text}</p>
    </li>
  );
}
