import { Phone, Mail, MapPin, Globe, ExternalLink } from 'lucide-react';

export default function Contact() {
  const contactInfo = {
    name: 'LÊ THANH HÙNG',
    position: 'Chuyên viên Quản lý Tài sản',
    phone: '0968.294.592',
    email: 'Hung.lt@dankogroup.com.vn',
    address: 'Tòa nhà C6, Đường Trần Hữu Dực, KĐT Mỹ Đình 1, Quận Nam Từ Liêm, Hà Nội',
    officePhone: '19003135',
    fax: '024 6666 3639',
    website: 'https://dankogroup.com.vn'
  };

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-full">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Liên hệ hành chính</h1>
        <p className="text-slate-500 font-bold mt-1">Thông tin hỗ trợ về yêu cầu cấp phát, văn phòng phẩm và tài sản.</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative group">
          {/* Header/Logo section */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 text-white relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
            <div className="relative z-10 flex justify-between items-start">
               <div>
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-2xl mb-4 border border-white/30">D</div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic leading-none">Danko Group</h2>
               </div>
               <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Thẻ liên hệ hỗ trợ</span>
               </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="p-10 space-y-8">
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none mb-1">{contactInfo.name}</h3>
              <p className="text-indigo-600 font-black text-xs uppercase tracking-widest">{contactInfo.position}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <a href={`tel:${contactInfo.phone.replace(/\./g, '')}`} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Điện thoại di động</span>
                  <span className="text-sm font-black text-slate-700">{contactInfo.phone}</span>
                </div>
              </a>

              <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Địa chỉ Email</span>
                  <span className="text-sm font-black text-slate-700 truncate max-w-[180px]">{contactInfo.email}</span>
                </div>
              </a>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="mt-1 text-slate-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Địa chỉ văn phòng</span>
                  <p className="text-sm font-bold text-slate-700 leading-relaxed">{contactInfo.address}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="flex flex-col">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hotline</span>
                   <span className="text-sm font-black text-slate-700">{contactInfo.officePhone}</span>
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fax</span>
                   <span className="text-sm font-black text-slate-700">{contactInfo.fax}</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <a 
                href={contactInfo.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
              >
                <Globe className="w-4 h-4" /> Truy cập Website Danko Group <ExternalLink className="w-3 h-3 ml-2" />
              </a>
            </div>
          </div>

          <div className="bg-slate-50 px-10 py-4 flex justify-center border-t border-slate-100">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">&copy; 2025 Danko Group Administrative Services</span>
          </div>
        </div>
      </div>
    </div>
  );
}
