import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, Plus, Search, Filter, History, Download, Upload, 
  RefreshCw, MoreHorizontal, CheckSquare, Square, XCircle, 
  Edit2, Copy, Trash2, ShieldBan, ShieldCheck, ChevronDown
} from 'lucide-react';
import api from '../lib/api';
import * as XLSX from 'xlsx';

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
  updatedAt: string;
};

export default function Items() {
  const [items, setItems] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [tabFilter, setTabFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemData | null>(null);
  const [formData, setFormData] = useState({
    mvpp: '', name: '', category: '', unit: '', price: 0, quota: 100, itemType: 'VPP', isActive: true
  });

  // Action Menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Status Confirm Modal
  const [statusModal, setStatusModal] = useState<{ isOpen: boolean; item: ItemData | null; reason: string; targetStatus: boolean }>({
    isOpen: false, item: null, reason: '', targetStatus: false
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/items?all=true'); 
      setItems(res.data);
      setSelectedIds(new Set()); // Reset selection on refresh
      setActiveMenuId(null);
    } catch (error) {
      console.error('Lỗi tải danh mục:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  // Handle Form Save
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, price: Number(formData.price), quota: Number(formData.quota) };
      if (editingItem) {
        await api.patch(`/items/${editingItem.id}`, payload);
      } else {
        await api.post('/items', payload);
      }
      setShowItemForm(false);
      fetchItems();
    } catch (error: any) {
      alert('Lỗi: ' + (error.response?.data?.error || 'Không thể lưu. Mã VPP có thể bị trùng.'));
    }
  };

  // Tự động sinh mã
  const generateCode = () => {
    const prefix = formData.itemType === 'VPP' ? 'VPP' : 'VS';
    // Đếm số lượng item hiện có của prefix này để sinh mã tiếp theo, hoặc random
    const count = items.filter(i => i.mvpp.startsWith(prefix)).length + 1;
    const newCode = `${prefix}${String(count).padStart(3, '0')}`;
    setFormData({ ...formData, mvpp: newCode });
  };

  // Thay đổi trạng thái
  const confirmChangeStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModal.item) return;
    
    // Nếu ngừng cấp, yêu cầu lý do
    if (!statusModal.targetStatus && !statusModal.reason.trim()) {
      alert('Vui lòng nhập lý do ngừng cấp/lưu trữ.');
      return;
    }

    try {
      await api.patch(`/items/${statusModal.item.id}`, { 
        isActive: statusModal.targetStatus 
      });
      // Optionally log reason to audit log API if available
      setStatusModal({ isOpen: false, item: null, reason: '', targetStatus: false });
      fetchItems();
    } catch (error) {
      alert('Lỗi khi đổi trạng thái');
    }
  };

  // Xuất Excel
  const handleExport = () => {
    const dataToExport = filteredItems.length > 0 ? filteredItems : items;
    const exportData = dataToExport.map((d, index) => ({
      'STT': index + 1,
      'Mã VPP': d.mvpp,
      'Tên Hàng Hóa': d.name,
      'Phân loại': d.category,
      'ĐVT': d.unit,
      'Đơn giá': d.price,
      'Định mức': d.quota,
      'Trạng thái': d.isActive ? 'Đang cấp' : 'Ngừng cấp'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Muc");
    XLSX.writeFile(wb, `Danh_Muc_VPP_${new Date().getTime()}.xlsx`);
  };

  // Selection Logic
  const filteredItems = items.filter(i => {
    if (tabFilter !== 'ALL' && i.itemType !== tabFilter) return false;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE' && !i.isActive) return false;
      if (statusFilter === 'INACTIVE' && i.isActive) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return i.name.toLowerCase().includes(q) || i.mvpp.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
    }
    return true;
  });

  const toggleAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  // Bulk Actions
  const handleBulkStatusChange = async (targetStatus: boolean) => {
    if (!confirm(`Xác nhận chuyển ${selectedIds.size} mặt hàng sang trạng thái ${targetStatus ? 'ĐANG CẤP' : 'NGỪNG CẤP'}?`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map(id => api.patch(`/items/${id}`, { isActive: targetStatus })));
      fetchItems();
    } catch (error) {
      alert('Có lỗi xảy ra khi thực hiện hàng loạt.');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] p-4 md:p-8 bg-slate-50 relative overflow-hidden" onClick={() => setActiveMenuId(null)}>
      {/* 1. Header & Top Bar Actions */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
             <Package className="w-7 h-7 mr-3 text-indigo-600" />
             Danh mục Hàng hoá
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Quản lý định mức, thông tin VPP / Vệ sinh</p>
        </div>

        {/* Action Right Bar */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          <button className="flex items-center px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition" onClick={() => alert('Chức năng Lịch sử chỉnh sửa đang phát triển...')}>
            <History className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Lịch sử</span>
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          
          <button onClick={handleExport} className="flex items-center px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition">
            <Download className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Export Excel</span>
          </button>
          
          <button className="flex items-center px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 rounded-xl transition" onClick={() => alert('Tính năng Import Excel sẽ được mở sớm.')}>
            <Upload className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Import Excel</span>
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <button className="flex items-center px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition">
            <Filter className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Bộ lọc</span>
          </button>
          
          <button onClick={fetchItems} className="flex items-center px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition" title="Làm mới">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button 
            onClick={() => {
              setEditingItem(null);
              setFormData({ mvpp: '', name: '', category: '', unit: '', price: 0, quota: 100, itemType: 'VPP', isActive: true });
              setShowItemForm(true);
            }}
            className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition transform hover:-translate-y-0.5 ml-2"
          >
            <Plus className="w-5 h-5 mr-2" /> Thêm hàng hóa mới
          </button>
        </div>
      </div>

      {/* 2. Bulk Action Bar (Overlay) */}
      {selectedIds.size > 0 && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-50 animate-in fade-in slide-in-from-top-4">
           <span className="font-bold border-r border-slate-600 pr-4">{selectedIds.size} mục được chọn</span>
           <button onClick={() => handleBulkStatusChange(true)} className="text-sm font-bold flex items-center hover:text-emerald-400 transition"><ShieldCheck className="w-4 h-4 mr-1"/> Kích hoạt</button>
           <button onClick={() => handleBulkStatusChange(false)} className="text-sm font-bold flex items-center hover:text-amber-400 transition"><ShieldBan className="w-4 h-4 mr-1"/> Ngừng cấp</button>
           <button className="text-sm font-bold flex items-center hover:text-blue-400 transition"><Download className="w-4 h-4 mr-1"/> Export</button>
           <button className="text-sm font-bold text-rose-400 flex items-center hover:text-rose-300 transition ml-2"><Trash2 className="w-4 h-4 mr-1"/> Xóa mềm</button>
           <button onClick={() => setSelectedIds(new Set())} className="ml-4 text-slate-400 hover:text-white"><XCircle className="w-5 h-5"/></button>
        </div>
      )}

      {/* 3. Filter Area under Header */}
      <div className="bg-white p-4 rounded-t-2xl shadow-sm border border-slate-200 border-b-0 flex gap-4 flex-wrap shrink-0 items-center justify-between z-10">
         <div className="flex bg-slate-100 p-1 rounded-xl">
           <button onClick={() => setTabFilter('ALL')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${tabFilter === 'ALL' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tất cả</button>
           <button onClick={() => setTabFilter('VPP')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${tabFilter === 'VPP' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Văn phòng phẩm</button>
           <button onClick={() => setTabFilter('VE_SINH')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${tabFilter === 'VE_SINH' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Đồ vệ sinh</button>
         </div>

         <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 min-w-[200px]">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tra cứu tên / mã VT..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm outline-none transition-all" 
               />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2 font-bold outline-none cursor-pointer">
               <option value="ALL">Mọi trạng thái</option>
               <option value="ACTIVE">Đang cấp</option>
               <option value="INACTIVE">Ngừng cấp</option>
            </select>
            {(searchQuery || statusFilter !== 'ALL' || tabFilter !== 'ALL') && (
              <button 
                onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setTabFilter('ALL'); }}
                className="px-3 py-2 text-rose-500 hover:bg-rose-50 text-sm font-bold rounded-xl transition whitespace-nowrap"
              >
                 Xóa lọc
              </button>
            )}
         </div>
      </div>

      {/* 4. Table Area */}
      <div className="bg-white rounded-b-2xl shadow-[0_0_15px_rgba(0,0,0,0.03)] border border-slate-200 flex-1 overflow-hidden flex flex-col">
         <div className="overflow-auto flex-1 relative">
            <table className="w-full text-left whitespace-nowrap min-w-max">
               <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                  <tr className="text-xs uppercase font-black text-slate-500 tracking-wider">
                     <th className="p-4 w-12 text-center">
                        <button onClick={toggleAll} className="text-slate-400 hover:text-indigo-600 transition">
                          {filteredItems.length > 0 && selectedIds.size === filteredItems.length ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5" />}
                        </button>
                     </th>
                     <th className="p-4">Mã VT</th>
                     <th className="p-4">Tên hàng hóa</th>
                     <th className="p-4">Phân loại</th>
                     <th className="p-4 text-center">ĐVT</th>
                     <th className="p-4 text-right">Đơn giá</th>
                     <th className="p-4 text-right">Định mức</th>
                     <th className="p-4 text-center">Trạng thái</th>
                     <th className="p-4 text-center">Tồn Kho</th>
                     <th className="p-4 text-right pr-6 w-20">Thao tác</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {loading ? (
                     <tr><td colSpan={10} className="p-12 text-center text-slate-400 font-bold animate-pulse">Đang tải danh mục...</td></tr>
                  ) : filteredItems.length === 0 ? (
                     <tr><td colSpan={10} className="p-12 text-center text-slate-400 font-medium">Không tìm thấy mã hàng hoá nào.</td></tr>
                  ) : (
                     filteredItems.map(item => {
                        const isSelected = selectedIds.has(item.id);
                        return (
                           <tr key={item.id} className={`hover:bg-indigo-50/30 transition-colors group ${!item.isActive ? 'bg-slate-50/50 opacity-75' : ''} ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                              <td className="p-4 text-center">
                                 <button onClick={() => toggleSelect(item.id)} className="text-slate-300 hover:text-indigo-600 focus:outline-none">
                                    {isSelected ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5" />}
                                 </button>
                              </td>
                              <td className="p-4 font-black tracking-wide text-slate-600">{item.mvpp}</td>
                              <td className="p-4 font-bold text-slate-800">
                                <span className={`w-2 h-2 rounded-full inline-block mr-2 ${item.itemType === 'VPP' ? 'bg-blue-500' : 'bg-emerald-500'}`}></span>
                                {item.name}
                              </td>
                              <td className="p-4 text-slate-600 font-medium">{item.category}</td>
                              <td className="p-4 text-center text-slate-500 font-medium">{item.unit}</td>
                              <td className="p-4 text-right font-bold text-amber-700">{item.price.toLocaleString('vi-VN')} đ</td>
                              <td className="p-4 text-right font-black text-slate-700">{item.quota}</td>
                              <td className="p-4 text-center">
                                 <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-black rounded-full ${item.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                                    {item.isActive ? 'ĐANG CẤP' : 'NGỪNG CẤP'}
                                 </span>
                              </td>
                              <td className="p-4 text-center font-bold text-indigo-600">{item.stock}</td>
                              
                              <td className="p-4 text-right relative pr-6">
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }}
                                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                 >
                                    <MoreHorizontal className="w-5 h-5" />
                                 </button>

                                 {/* 5. Dropdown Menu (⋯) */}
                                 {activeMenuId === item.id && (
                                   <div className="absolute right-8 top-10 w-48 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 py-2 z-50 transform origin-top-right animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                                      <button className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-bold text-slate-700 flex items-center">
                                         <Package className="w-4 h-4 mr-2" /> Xem chi tiết
                                      </button>
                                      <button onClick={() => {
                                           setEditingItem(item);
                                           setFormData({ ...item });
                                           setShowItemForm(true);
                                           setActiveMenuId(null);
                                        }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-bold text-blue-700 flex items-center">
                                         <Edit2 className="w-4 h-4 mr-2" /> Chỉnh sửa
                                      </button>
                                      <button onClick={() => {
                                           setEditingItem(null); // Create new
                                           setFormData({ ...item, mvpp: `${item.mvpp}_COPY` });
                                           setShowItemForm(true);
                                           setActiveMenuId(null);
                                        }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-bold text-indigo-700 flex items-center">
                                         <Copy className="w-4 h-4 mr-2" /> Nhân bản mã hàng
                                      </button>
                                      <div className="h-px bg-slate-100 my-1"></div>
                                      <button onClick={() => {
                                          setStatusModal({ isOpen: true, item, targetStatus: !item.isActive, reason: '' });
                                          setActiveMenuId(null);
                                        }} className={`w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-bold flex items-center ${item.isActive ? 'text-amber-600' : 'text-emerald-600'}`}>
                                         {item.isActive ? <><ShieldBan className="w-4 h-4 mr-2" /> Đổi sang Ngừng cấp</> : <><ShieldCheck className="w-4 h-4 mr-2" /> Cấp phát lại</>}
                                      </button>
                                      <button className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-bold text-slate-500 flex items-center">
                                         <History className="w-4 h-4 mr-2" /> Xem lịch sử
                                      </button>
                                      <div className="h-px bg-slate-100 my-1"></div>
                                      <button className="w-full text-left px-4 py-2 hover:bg-rose-50 text-sm font-bold text-rose-600 flex items-center">
                                         <Trash2 className="w-4 h-4 mr-2" /> Xóa mềm
                                      </button>
                                   </div>
                                 )}
                              </td>
                           </tr>
                        );
                     })
                  )}
               </tbody>
            </table>
         </div>
         <div className="bg-slate-50 p-3 border-t border-slate-200 text-xs font-bold text-slate-500 shrink-0 text-center">
             Hiển thị {filteredItems.length} hàng hoá (Chọn: {selectedIds.size})
         </div>
      </div>

      {/* MODAL: Thêm/Sửa Hàng Hóa */}
      {showItemForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm shadow-2xl">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-bold text-slate-800">{editingItem ? 'Sửa thông tin hàng hoá' : 'Thêm hàng hóa mới'}</h2>
              <button type="button" onClick={() => setShowItemForm(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><XCircle className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveItem} className="p-8 overflow-y-auto bg-slate-50/50">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Mã hàng *</label>
                  <div className="flex gap-2">
                     <input required disabled={!!editingItem} value={formData.mvpp} onChange={e => setFormData({...formData, mvpp: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 uppercase font-mono text-sm shadow-sm" placeholder="Nhập mã hoặc sinh tự động..." />
                     {!editingItem && (
                        <button type="button" onClick={generateCode} className="px-4 py-2.5 bg-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-200 transition text-sm whitespace-nowrap">Sinh mã</button>
                     )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Thuộc Kho *</label>
                  <div className="relative">
                    <select value={formData.itemType} onChange={e => setFormData({...formData, itemType: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium appearance-none shadow-sm">
                      <option value="VPP">Văn phòng phẩm</option>
                      <option value="VE_SINH">Đồ vệ sinh</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Tên hàng hoá *</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm" placeholder="Giấy in A4, Bút bi..." />
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Phân loại (Nhóm) *</label>
                  <input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm" placeholder="Bút, Giấy, Tẩy..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Đơn vị tính *</label>
                  <input required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm" placeholder="Cái, Hộp, Ram..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Đơn giá (VNĐ) *</label>
                  <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-mono text-lg text-amber-600 shadow-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Định mức tồn kho *</label>
                  <input required type="number" min="0" value={formData.quota} onChange={e => setFormData({...formData, quota: Number(e.target.value)})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm" />
                </div>
              </div>
              
              <div className="pt-4 flex gap-4 mt-8 border-t border-slate-200 pt-6">
                <button type="button" onClick={() => setShowItemForm(false)} className="flex-1 py-3.5 font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-sm">Huỷ bỏ</button>
                <button type="submit" className="flex-[2] py-3.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-lg shadow-indigo-500/30 flex items-center justify-center">
                  {editingItem ? 'Lưu chỉnh sửa' : 'Tạo mới Hàng Hóa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Đổi Phân Loại/Trạng Thái Confirm */}
      {statusModal.isOpen && statusModal.item && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
              <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
                 {statusModal.targetStatus ? <ShieldCheck className="w-6 h-6 mr-2 text-emerald-600" /> : <ShieldBan className="w-6 h-6 mr-2 text-amber-600" />}
                 Xác nhận {statusModal.targetStatus ? 'Cấp phát lại' : 'Ngừng cấp hàng'}
              </h3>
              <p className="text-sm text-slate-600 mb-6 font-medium">Bạn có chắc chắn muốn <strong className={statusModal.targetStatus ? 'text-emerald-600' : 'text-amber-600'}>{statusModal.targetStatus ? 'ĐANG CẤP' : 'NGỪNG CẤP'}</strong> mặt hàng <strong>{statusModal.item.mvpp} ({statusModal.item.name})</strong>?</p>
              
              {!statusModal.targetStatus && (
                 <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Lý do ngừng cấp / lưu trữ *</label>
                    <textarea autoFocus value={statusModal.reason} onChange={e => setStatusModal({...statusModal, reason: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm h-24" placeholder="Nhập lý do... (bắt buộc)"></textarea>
                 </div>
              )}

              <div className="flex gap-3">
                 <button className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition" onClick={() => setStatusModal({ isOpen: false, item: null, reason: '', targetStatus: false })}>Hủy thao tác</button>
                 <button className={`flex-1 py-2.5 font-bold text-white rounded-xl transition shadow-md ${statusModal.targetStatus ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30'}`} onClick={confirmChangeStatus}>
                   Xác nhận
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
