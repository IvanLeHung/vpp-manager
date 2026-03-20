import { useState, useEffect } from 'react';
import { Package, Plus, Edit2, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';
import api from '../lib/api';

type ItemData = {
  id: string;
  mvpp: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  quota: number;
  itemType: string;
  isActive: boolean;
  stock: number;
};

export default function Items() {
  const [items, setItems] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemData | null>(null);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    mvpp: '', name: '', category: '', unit: '', price: 0, quota: 100, itemType: 'VPP', isActive: true
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/items?all=true'); // Fetch all including inactive
      setItems(res.data);
    } catch (error) {
      console.error('Lỗi tải danh mục:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, price: Number(formData.price), quota: Number(formData.quota) };
      if (editingItem) {
        await api.patch(`/items/${editingItem.id}`, payload);
      } else {
        await api.post('/items', payload);
      }
      setShowModal(false);
      fetchItems();
    } catch (error: any) {
      alert('Lỗi: ' + (error.response?.data?.error || 'Không thể lưu. Mã VPP có thể bị trùng hoặc máy chủ chưa nhận Code.'));
    }
  };

  const toggleStatus = async (item: ItemData) => {
    if (!confirm(`Bạn muốn ${item.isActive ? 'ngừng' : 'cho phép'} cấp phát mã ${item.mvpp}?`)) return;
    try {
      await api.patch(`/items/${item.id}`, { isActive: !item.isActive });
      fetchItems();
    } catch (error) {
      alert('Lỗi khi đổi trạng thái');
    }
  };

  const filteredItems = items.filter(i => {
    if (filterType !== 'ALL' && i.itemType !== filterType) return false;
    if (searchQuery && !i.name.toLowerCase().includes(searchQuery.toLowerCase()) && !i.mvpp.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Package className="w-7 h-7 mr-3 text-indigo-600" />
            Danh mục Hàng hoá
          </h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý định mức, giá phòng, thông tin VPP / Vệ sinh</p>
        </div>
        <button 
          onClick={() => {
            setEditingItem(null);
            setFormData({ mvpp: '', name: '', category: '', unit: '', price: 0, quota: 100, itemType: 'VPP', isActive: true });
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Thêm mã mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
           <div className="flex bg-slate-100 p-1 rounded-lg">
             {['ALL', 'VPP', 'VS'].map(type => (
               <button 
                 key={type}
                 onClick={() => setFilterType(type)}
                 className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${filterType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 {type === 'ALL' ? 'Tất cả' : type === 'VPP' ? 'Văn phòng phẩm' : 'Đồ vệ sinh'}
               </button>
             ))}
           </div>
           <div className="relative">
             <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
             <input type="text" placeholder="Tìm tên hoặc mã..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 w-64 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
           </div>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider sticky top-0">
              <tr>
                <th className="px-6 py-4">Mã VT</th>
                <th className="px-6 py-4">Tên hàng hoá</th>
                <th className="px-6 py-4">Phân loại</th>
                <th className="px-6 py-4">ĐVT</th>
                <th className="px-6 py-4 text-right">Đơn giá</th>
                <th className="px-6 py-4 text-right">Định mức</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Đang tải dữ liệu...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Không tìm thấy mã nào</td></tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className={`hover:bg-slate-50/50 transition ${!item.isActive ? 'opacity-60 bg-slate-50/50' : ''}`}>
                    <td className="px-6 py-3 font-bold text-slate-700">{item.mvpp}</td>
                    <td className="px-6 py-3 font-medium cursor-pointer text-indigo-600 hover:underline" onClick={() => {
                        setEditingItem(item);
                        setFormData({ ...item });
                        setShowModal(true);
                      }}>{item.name}</td>
                    <td className="px-6 py-3 text-slate-600 flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${item.itemType === 'VPP' ? 'bg-blue-500' : 'bg-emerald-500'}`}></span>
                       {item.category}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{item.unit}</td>
                    <td className="px-6 py-3 text-right font-medium text-amber-600">{item.price.toLocaleString('vi-VN')} đ</td>
                    <td className="px-6 py-3 text-right font-bold text-slate-700">{item.quota}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {item.isActive ? 'HOẠT ĐỘNG' : 'NGỪNG CẤP'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right space-x-2">
                       <button onClick={() => {
                          setEditingItem(item);
                          setFormData({ ...item });
                          setShowModal(true);
                       }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Sửa thông tin">
                         <Edit2 className="w-4 h-4" />
                       </button>
                       <button onClick={() => toggleStatus(item)} className={`p-1.5 rounded transition ${item.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`} title={item.isActive ? 'Ngừng cấp phát' : 'Trở lại cấp phát'}>
                         {item.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-lg font-bold text-slate-800">{editingItem ? 'Sửa thông tin hàng hoá' : 'Thêm mã hàng mới'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mã hàng *</label>
                  <input required disabled={!!editingItem} value={formData.mvpp} onChange={e => setFormData({...formData, mvpp: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 uppercase font-mono text-sm" placeholder="VD: VPP123" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Thuộc kho *</label>
                  <select value={formData.itemType} onChange={e => setFormData({...formData, itemType: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                    <option value="VPP">Văn phòng phẩm</option>
                    <option value="VS">Đồ vệ sinh</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tên hàng hoá *</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Giấy in A4, Bút bi..." />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nhóm danh mục *</label>
                  <input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Bút, Giấy, Tẩy..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Đơn vị tính *</label>
                  <input required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Cái, Hộp, Ram..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Đơn giá (VNĐ) *</label>
                  <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Định mức tồn *</label>
                  <input required type="number" min="0" value={formData.quota} onChange={e => setFormData({...formData, quota: Number(e.target.value)})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Huỷ</button>
                <button type="submit" className="flex-1 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md">Lưu dữ liệu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
