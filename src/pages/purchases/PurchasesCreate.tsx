import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, Search, Plus, Trash2, Calendar, Target,
  FileText, ShoppingCart, Info, AlertTriangle, Save
} from 'lucide-react';

interface PurchasesCreateProps {
  onBack: () => void;
  poId?: string | null;
  onSuccess: () => void;
}

const PurchasesCreate: React.FC<PurchasesCreateProps> = ({ onBack, poId, onSuccess }) => {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
     title: '',
     purpose: '',
     expectedDate: ''
  });

  const [lines, setLines] = useState<any[]>([]);

  useEffect(() => {
    fetchItems();
    if (poId) {
        // Load existing PR details if editing
        // Left out for MVP brevity, handled manually via Create for now
    }
  }, [poId]);

  const fetchItems = async () => {
    try {
      const res = await api.get('/items');
      setItems(res.data.filter((i:any) => i.isActive));
    } catch(e) {}
  };

  const addItem = (item: any) => {
    if (lines.find(l => l.itemId === item.id)) return showToast('Mặt hàng đã có trong danh sách', 'error');
    setLines([...lines, { itemId: item.id, item, qtyRequested: 1, unitPrice: item.price||0, supplier: '', note: '' }]);
    setSearchTerm('');
  };

  const removeLine = (itemId: string) => {
    setLines(lines.filter(l => l.itemId !== itemId));
  };

  const handleSubmit = async () => {
      if (!formData.title) return showToast('Vui lòng nhập Tên Đề Nghị', 'error');
      if (lines.length === 0) return showToast('Vui lòng chọn ít nhất 1 mặt hàng', 'error');

      setLoading(true);
      try {
          await api.post('/purchases', {
              ...formData,
              lines: lines.map(l => ({
                  itemId: l.itemId,
                  qtyRequested: l.qtyRequested,
                  unitPrice: l.unitPrice,
                  supplier: l.supplier,
                  note: l.note
              }))
          });
          showToast('Đã lưu Nháp Đề Nghị Mua Hàng thành công!');
          onSuccess();
      } catch (err: any) {
          showToast(err.response?.data?.error || 'Lỗi lưu dữ liệu', 'error');
      }
      setLoading(false);
  };

  const catalogHits = items.filter(i => 
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.mvpp.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  const totalEstimate = lines.reduce((sum, l) => sum + (Number(l.unitPrice||0) * Number(l.qtyRequested||0)), 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* HEADER */}
      <div className="h-20 bg-white border-b border-slate-200 flex justify-between items-center px-6 md:px-10 shrink-0 z-20 shadow-sm print:hidden">
          <div className="flex items-center gap-6">
              <button disabled={loading} onClick={onBack} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition shadow-inner">
                  <ArrowLeft className="w-5 h-5"/>
              </button>
              <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tạo Đề Nghị Mua Sắm (PR)</h2>
                  <p className="text-sm font-semibold text-slate-500 mt-0.5">Lập phiếu yêu cầu mua sắm vật tư, công cụ dụng cụ mới.</p>
              </div>
          </div>
          <div>
              <button disabled={loading} onClick={handleSubmit} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-500/30 transition flex items-center">
                  <Save className="w-5 h-5 mr-2" /> Lưu Nháp Đề Nghị
              </button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="flex flex-col xl:flex-row gap-6 max-w-[1400px] mx-auto">
              
              {/* LEFT COLUMN: Info & Search */}
              <div className="w-full xl:w-96 flex flex-col gap-6 shrink-0">
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Thông Tin Chung</h3>
                      
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1">Tiêu đề đợt mua <span className="text-rose-500">*</span></label>
                              <input value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} placeholder="VD: Mua VPP Tháng 10..." className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition font-bold text-slate-700"/>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1">Kỳ vọng ngày nhận hàng</label>
                              <div className="relative">
                                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                  <input type="date" value={formData.expectedDate} onChange={e=>setFormData({...formData, expectedDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-3 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition font-bold text-slate-700"/>
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1">Mục đích / Lý do mua chi tiết</label>
                              <textarea value={formData.purpose} onChange={e=>setFormData({...formData, purpose: e.target.value})} placeholder="Diễn giải chi tiết lý do cần mua bổ sung..." className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition font-medium text-slate-700 resize-none h-24"/>
                          </div>
                      </div>
                  </div>

                  {/* CATALOG SEARCH */}
                  <div className="bg-gradient-to-br from-indigo-800 to-indigo-900 rounded-3xl shadow-lg p-6 relative overflow-hidden text-white">
                      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                      <h3 className="text-xs font-black text-indigo-200 uppercase tracking-widest mb-4 flex items-center relative z-10"><Search className="w-4 h-4 mr-2"/> Tìm vật tư vào Đề nghị</h3>
                      
                      <div className="relative z-10 mb-4">
                          <input 
                             type="text" placeholder="Gõ tên hoặc MVPP..." 
                             value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
                             className="w-full bg-white/10 border border-white/20 px-4 py-3 pb-3 rounded-xl outline-none focus:bg-white focus:text-slate-800 focus:border-indigo-400 transition font-bold placeholder-indigo-200 text-white"
                          />
                      </div>

                      {searchTerm && (
                          <div className="bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden relative z-20">
                              {catalogHits.length === 0 ? (
                                  <div className="p-4 text-center text-slate-500 font-medium text-sm">Không tìm thấy mã nào hợp lệ.</div>
                              ) : (
                                  <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                                      {catalogHits.map(i => (
                                          <div key={i.id} onClick={()=>addItem(i)} className="p-3 hover:bg-indigo-50 flex items-center justify-between cursor-pointer transition group">
                                              <div className="flex-1 min-w-0 pr-3">
                                                  <p className="font-bold text-slate-800 text-sm truncate">{i.name}</p>
                                                  <p className="text-[10px] font-black tracking-widest text-slate-400 mt-0.5">{i.mvpp}</p>
                                              </div>
                                              <button className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition"><Plus className="w-5 h-5"/></button>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>

              {/* RIGHT COLUMN: Table Lines */}
              <div className="flex-1 min-w-0 flex flex-col gap-6">
                  
                  {/* Summary Box */}
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-wrap gap-6 items-center justify-between">
                     <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dự toán Tạm tính</p>
                         <p className="text-3xl font-black text-teal-600">{totalEstimate.toLocaleString('vi-VN')} đ</p>
                     </div>
                     <div className="flex gap-4">
                         <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng số Khoản</p>
                             <p className="text-xl font-black text-slate-700">{lines.length} dòng</p>
                         </div>
                     </div>
                  </div>

                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                      <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                          <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest"><ShoppingCart className="w-4 h-4 inline mr-2 text-indigo-500"/> Danh Sách Hàng Hoá Cần Mua</h3>
                      </div>
                      <div className="flex-1 overflow-x-auto">
                          <table className="w-full text-left whitespace-nowrap min-w-max">
                              <thead className="bg-white">
                                  <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100">
                                      <th className="p-4 w-12 text-center">STT</th>
                                      <th className="p-4">Hàng hoá</th>
                                      <th className="p-4 text-center w-32 border-x border-slate-100">SL Cần mua</th>
                                      <th className="p-4 w-40">Đơn giá dự kiến</th>
                                      <th className="p-4 w-48">Gợi ý NCC</th>
                                      <th className="p-4 w-12 text-center"></th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                  {lines.length === 0 ? (
                                      <tr>
                                          <td colSpan={6} className="p-16 text-center text-slate-400">
                                              <Target className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                                              <p className="font-bold text-lg text-slate-500">Chưa có vật tư nào</p>
                                              <p className="text-sm font-medium mt-1">Sử dụng ô tìm kiếm màu xanh bên trái để thêm vào Đề nghị.</p>
                                          </td>
                                      </tr>
                                  ) : lines.map((l, idx) => (
                                      <tr key={l.itemId} className="hover:bg-slate-50/50 transition">
                                          <td className="p-4 text-center font-bold text-slate-400">{idx+1}</td>
                                          <td className="p-4">
                                              <p className="font-bold text-slate-800 text-sm whitespace-normal leading-tight">{l.item.name}</p>
                                              <div className="flex items-center gap-2 mt-1.5">
                                                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black tracking-widest">{l.item.mvpp}</span>
                                                  <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded uppercase">{l.item.unit}</span>
                                              </div>
                                          </td>
                                          <td className="p-4 border-x border-slate-100 bg-white">
                                              <input 
                                                 type="number" min="1" value={l.qtyRequested} 
                                                 onChange={e => setLines(lines.map(x => x.itemId===l.itemId ? {...x, qtyRequested: Number(e.target.value)} : x))}
                                                 className="w-full text-center py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:bg-white font-black text-lg transition text-indigo-700"
                                              />
                                          </td>
                                          <td className="p-4">
                                              <div className="relative">
                                                  <input 
                                                    type="number" value={l.unitPrice}
                                                    onChange={e => setLines(lines.map(x => x.itemId===l.itemId ? {...x, unitPrice: Number(e.target.value)} : x))}
                                                    className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-400 focus:bg-white font-bold text-sm transition text-slate-700" 
                                                  />
                                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Đ</span>
                                              </div>
                                              <p className="text-[10px] font-bold text-teal-600 mt-1 pr-2 text-right">={(Number(l.unitPrice||0)*Number(l.qtyRequested||0)).toLocaleString('vi-VN')} đ</p>
                                          </td>
                                          <td className="p-4">
                                              <input 
                                                type="text" placeholder="Tên NCC..." value={l.supplier}
                                                onChange={e => setLines(lines.map(x => x.itemId===l.itemId ? {...x, supplier: e.target.value} : x))}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:bg-white font-medium text-sm transition" 
                                              />
                                          </td>
                                          <td className="p-4 text-center">
                                              <button onClick={()=>removeLine(l.itemId)} className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 hover:text-rose-600 text-rose-400 flex items-center justify-center transition ml-auto"><Trash2 className="w-4 h-4"/></button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
};

export default PurchasesCreate;
