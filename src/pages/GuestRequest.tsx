import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Send, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { VPPItem } from '../context/AppContext';

export default function GuestRequest() {
  const navigate = useNavigate();
  const [items, setItems] = useState<VPPItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Form State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [targetItems, setTargetItems] = useState<{item: VPPItem, quantity: number, note: string}[]>([]);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const res = await api.get('/public/items');
        setItems(res.data);
      } catch (err) {
        console.error('Failed to load items', err);
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.mvpp.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItem = (i: VPPItem) => {
    const existing = targetItems.find(t => t.item.mvpp === i.mvpp);
    if (existing) {
       setTargetItems(targetItems.map(t => t.item.mvpp === i.mvpp ? {...t, quantity: t.quantity + 1} : t));
    } else {
       setTargetItems([...targetItems, {item: i, quantity: 1, note: ''}]);
    }
    setSearchTerm('');
    setShowDropdown(false);
  };

  const updateLineQty = (mvpp: string, val: string) => {
    const parsed = parseInt(val.replace(/\D/g, ''));
    const qty = isNaN(parsed) ? 0 : parsed;
    setTargetItems(targetItems.map(t => t.item.mvpp === mvpp ? {...t, quantity: qty} : t));
  };
  
  const updateLineNote = (mvpp: string, text: string) => {
    setTargetItems(targetItems.map(t => t.item.mvpp === mvpp ? {...t, note: text} : t));
  };

  const removeItem = (mvpp: string) => {
    setTargetItems(targetItems.filter(t => t.item.mvpp !== mvpp));
  };

  const submitForm = async () => {
    if (!guestName.trim()) return alert('Vui lòng nhập Họ và Tên!');
    if (!guestPhone.trim()) return alert('Vui lòng nhập SĐT / Phòng ban!');
    if (targetItems.length === 0) return alert('Chưa chọn mặt hàng VPP nào.');

    try {
      await api.post('/public/requests', {
        guestName,
        guestPhone,
        purpose,
        lines: targetItems.map(t => ({ itemId: t.item.id, qtyRequested: t.quantity, note: t.note }))
      });
      alert('Đã gửi yêu cầu thành công! Vui lòng liên hệ Admin để theo dõi.');
      navigate('/');
    } catch(e: any) { alert(e.response?.data?.error || 'Lỗi khi gửi yêu cầu'); }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-8 text-white relative">
          <button onClick={() => navigate('/')} className="absolute top-8 left-8 p-2 bg-white/20 hover:bg-white/30 rounded-full transition">
             <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Tạo Yêu cầu VPP (Khách)</h1>
            <p className="text-indigo-100 opacity-90 font-medium max-w-lg mx-auto">Sử dụng biểu mẫu này để đề xuất cấp phát văn phòng phẩm nếu bạn chưa có tài khoản hệ thống.</p>
          </div>
        </div>

        <div className="p-8">
          {/* Info Section */}
          <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl">
            <h3 className="text-sm font-black text-indigo-700 uppercase tracking-wider mb-4 border-b border-indigo-100 pb-2">1. Thông tin liên hệ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-xs font-bold text-slate-700 mb-1.5">Họ và Tên <span className="text-rose-500">*</span></label>
                 <input type="text" value={guestName} onChange={e=>setGuestName(e.target.value)} placeholder="Nhập họ và tên..." className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition" />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-700 mb-1.5">SĐT / Bộ phận <span className="text-rose-500">*</span></label>
                 <input type="text" value={guestPhone} onChange={e=>setGuestPhone(e.target.value)} placeholder="SĐT hoặc bộ phận công tác..." className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition" />
              </div>
              <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-slate-700 mb-1.5">Lý do sử dụng cụ thể</label>
                 <textarea value={purpose} onChange={e=>setPurpose(e.target.value)} placeholder="Diễn giải thêm..." className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none font-medium transition" />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="mb-8 p-6 border border-slate-200 rounded-2xl">
             <h3 className="text-sm font-black text-indigo-700 uppercase tracking-wider mb-4 pb-2">2. Chọn Vật tư</h3>
             
             {/* Search Auto-complete */}
             <div className="mb-4" ref={searchRef}>
                 <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                     <input 
                         type="text" 
                         value={searchTerm} 
                         onChange={e => {setSearchTerm(e.target.value); setShowDropdown(true);}}
                         onFocus={() => setShowDropdown(true)}
                         placeholder={loadingItems ? "Đang tải danh mục..." : "🔍 Nhập để tìm vật tư (Ví dụ: Giấy A4)..."} 
                         disabled={loadingItems}
                         className="w-full pl-10 pr-4 py-3 bg-indigo-50/50 border-2 border-indigo-100 rounded-xl focus:bg-white focus:border-indigo-400 outline-none font-bold text-indigo-900 transition-all shadow-inner disabled:opacity-50"
                     />
                     
                     {showDropdown && searchTerm && !loadingItems && (
                         <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-xl z-50 max-h-56 overflow-y-auto w-full">
                             {searchResults.length === 0 ? <div className="p-4 text-slate-500 text-center text-sm font-medium">Không tìm thấy vật tư.</div> : searchResults.map(item => (
                                 <div key={item.mvpp} onClick={() => handleAddItem(item)} className="p-3 hover:bg-indigo-50 border-b border-slate-50 cursor-pointer transition flex items-center justify-between group">
                                     <div>
                                         <p className="font-bold text-slate-800">{item.name}</p>
                                         <div className="flex gap-2 mt-1 text-[10px] font-bold">
                                             <span className="bg-slate-100 text-slate-500 px-1.5 rounded">{item.mvpp}</span>
                                             <span className="text-slate-400">{item.unit}</span>
                                         </div>
                                     </div>
                                     <div className="text-xs text-indigo-600 font-bold opacity-0 group-hover:opacity-100 flex items-center">Thêm <Plus className="w-4 h-4 ml-1"/></div>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>
             </div>

             {/* Grid */}
             <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
               <table className="w-full text-left whitespace-nowrap">
                   <thead className="bg-slate-100 border-b border-slate-200">
                       <tr className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">
                           <th className="p-3">Sản phẩm</th>
                           <th className="p-3 text-center w-24">Số lượng</th>
                           <th className="p-3">Ghi chú</th>
                           <th className="p-3 text-center w-12">Xóa</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                       {targetItems.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-medium">Bạn chưa chọn mặt hàng nào.</td></tr>}
                       {targetItems.map((t) => (
                       <tr key={t.item.mvpp} className="hover:bg-white transition bg-slate-50/50">
                           <td className="p-3">
                               <p className="font-bold text-slate-800">{t.item.name}</p>
                               <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded">{t.item.mvpp} - {t.item.unit}</span>
                           </td>
                           <td className="p-2 border-x border-slate-200 bg-white">
                               <input 
                                   type="number" min="1" value={t.quantity === 0 ? '' : t.quantity} 
                                   onChange={e => updateLineQty(t.item.mvpp, e.target.value)}
                                   className="w-full text-center py-1.5 bg-slate-50 border border-slate-200 outline-none rounded font-extrabold text-indigo-700"
                               />
                           </td>
                           <td className="p-3">
                               <input type="text" value={t.note} onChange={e=>updateLineNote(t.item.mvpp, e.target.value)} placeholder="Ghi chú thêm..." className="w-full bg-transparent border-b border-slate-200 focus:border-indigo-400 outline-none text-sm text-slate-700 py-1" />
                           </td>
                           <td className="p-3 text-center">
                               <button onClick={() => removeItem(t.item.mvpp)} className="p-1.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded transition"><Trash2 className="w-4 h-4"/></button>
                           </td>
                       </tr>
                       ))}
                   </tbody>
               </table>
             </div>
          </div>

          <button onClick={submitForm} className="w-full flex justify-center items-center py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 cursor-pointer">
              <Send className="w-5 h-5 mr-2" /> Gửi Yêu Cầu Cấp Phát VPP
          </button>
        </div>
      </div>
    </div>
  );
}
