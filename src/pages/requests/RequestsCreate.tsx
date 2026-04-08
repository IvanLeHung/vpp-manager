import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, XCircle, Save, Send, Search, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { useAppContext } from '../../context/AppContext';
import type { VPPRequest, VPPItem } from '../../context/AppContext';
import type { ViewMode } from '../Requests';

interface Props {
  setViewMode: (mode: ViewMode) => void;
  refreshData: () => Promise<void>;
  showToast: (m: string, t?: 'success' | 'error' | 'warning') => void;
  activeRequest: VPPRequest | null;
}

export default function RequestsCreate({ setViewMode, refreshData, showToast, activeRequest }: Props) {
  const { items } = useAppContext();
  
  const [reqType, setReqType] = useState('Định kỳ');
  const [priority, setPriority] = useState('Thường');
  const [purpose, setPurpose] = useState('');
  const [neededByDate, setNeededByDate] = useState('');
  const [targetItems, setTargetItems] = useState<{item: VPPItem, quantity: number, note: string}[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize if editing drafted
  useEffect(() => {
     if (activeRequest && (activeRequest.status === 'DRAFT' || activeRequest.status === 'RETURNED')) {
        setReqType(activeRequest.requestType);
        setPriority(activeRequest.priority);
        setPurpose(activeRequest.purpose);
        setNeededByDate(activeRequest.neededByDate ? new Date(activeRequest.neededByDate).toISOString().split('T')[0] : '');
        const prefilled = activeRequest.lines.map((line: any) => ({
           item: items.find((i: VPPItem) => i.id === line.itemId) || {...line.item, id: line.itemId, stock: 0, price: 0, quota: 0} as unknown as VPPItem,
           quantity: line.qtyRequested,
           note: line.note || ''
        }));
        setTargetItems(prefilled);
     }
  }, [activeRequest, items]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = items.filter((i: VPPItem) => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.mvpp.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10);

  const handleAddItem = (i: VPPItem) => {
    if (i.stock === 0) {
        showToast('Mặt hàng này hiện đang hết tồn kho. Nếu đưa vào phiếu, hệ thống sẽ đẩy thành Yêu Cầu Chờ Mua Hàng.', 'warning');
    }
    const existing = targetItems.find((t: any) => t.item.id === i.id);
    if (existing) {
       setTargetItems(targetItems.map((t: any) => t.item.id === i.id ? {...t, quantity: t.quantity + 1} : t));
    } else {
       setTargetItems([...targetItems, {item: i, quantity: 1, note: ''}]);
    }
    setSearchTerm('');
    setShowDropdown(false);
  };

  const submitForm = async (status: 'DRAFT' | 'PENDING') => {
    if (targetItems.length === 0) {
        showToast('Chưa có mặt hàng VPP nào trong danh sách', 'error');
        return;
    }
    if (!purpose.trim()) {
        showToast('Bắt buộc nhập Lý do sử dụng', 'error');
        return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        requestType: reqType, priority, purpose, warehouseCode: 'MAIN',
        neededByDate: neededByDate ? new Date(neededByDate).toISOString() : undefined,
        lines: targetItems.map((t: any) => ({ itemId: t.item.id, qtyRequested: t.quantity, note: t.note }))
      };

      if (activeRequest && (activeRequest.status === 'DRAFT' || activeRequest.status === 'RETURNED')) {
         await api.patch(`/requests/${activeRequest.id}`, payload);
         if (status === 'PENDING') {
            await api.post(`/requests/${activeRequest.id}/submit`);
         }
      } else {
         const res = await api.post('/requests', payload);
         if (status === 'PENDING') {
            await api.post(`/requests/${res.data.id}/submit`);
         }
      }
      
      showToast(status === 'PENDING' ? 'Đã gửi trình kế toán thành công!' : 'Đã lưu nháp!');
      await refreshData();
      setViewMode('LIST');
    } catch(e: any) { 
        showToast(e.response?.data?.error || 'Lỗi khi lưu phiếu', 'error'); 
    } finally {
        setIsSubmitting(false);
    }
  };

  const totalAmount = useMemo(() => targetItems.reduce((acc: number, curr: any) => acc + (curr.item.price * curr.quantity), 0), [targetItems]);
  const warningsCount = useMemo(() => targetItems.filter((t: any) => t.quantity > t.item.quota).length, [targetItems]);

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden relative print:bg-white print:overflow-auto">
        {/* Header Toolbar */}
        <div className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-4 md:px-8 shrink-0 z-20 shadow-sm print:hidden">
            <div className="flex items-center gap-4">
                <button onClick={() => setViewMode('LIST')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition"><XCircle className="w-6 h-6"/></button>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">{activeRequest ? 'Cập nhật Phiếu' : 'Lập Phiếu Đề Xuất Trực Tuyến'}</h2>
            </div>
            <div className="flex items-center gap-3">
                <button disabled={isSubmitting} onClick={() => submitForm('DRAFT')} className="flex items-center px-4 py-2 border-2 border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl font-bold transition shadow-sm disabled:opacity-50">
                    <Save className="w-4 h-4 mr-2 text-slate-500"/> Lưu Nháp
                </button>
                <button disabled={isSubmitting} onClick={() => submitForm('PENDING')} className="flex items-center px-5 py-2 border-2 border-indigo-700 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold transition shadow-md shadow-indigo-500/30 disabled:opacity-50">
                    <Send className="w-4 h-4 mr-2"/> Gửi Trình Duyệt
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 w-full max-w-6xl mx-auto">
            {/* ZONE 1: THÔNG TIN ĐẦU PHIẾU */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                <h3 className="text-[11px] font-black text-indigo-700 uppercase tracking-widest flex items-center mb-6">
                   <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center mr-2">1</div> Thông tin chung & Pháp lý
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Mã phiếu (Auto-gen)</label>
                        <input type="text" value={activeRequest?.id || "PDX-Tự động tạo"} disabled className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 font-extrabold cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Loại hình xin cấp</label>
                        <select value={reqType} onChange={(e: any) => setReqType(e.target.value)} className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none font-bold text-slate-700 transition">
                            <option>Định kỳ</option><option>Bổ sung đột xuất</option><option>Dự án mới</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Mức độ ưu tiên (SLA)</label>
                        <select value={priority} onChange={(e: any) => setPriority(e.target.value)} className={`w-full p-3 bg-white border-2 rounded-xl outline-none font-bold transition focus:ring-4 ${priority === 'Khẩn cấp' ? 'text-rose-600 border-rose-300 ring-rose-100' : priority === 'Cao' ? 'text-amber-600 border-amber-300 ring-amber-100' : 'text-slate-700 border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'}`}>
                            <option value="Thường">Thường (Xử lý 24h)</option>
                            <option value="Cao">Cao (Xử lý 8h)</option>
                            <option value="Khẩn cấp">Khẩn cấp (ASAP)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Ngày Cần Cấp</label>
                        <input type="date" value={neededByDate} onChange={(e: any) => setNeededByDate(e.target.value)} className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none font-bold text-slate-700 transition" />
                    </div>
                    <div className="md:col-span-4">
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center justify-between">
                            <span>Mục đích/Lý do sử dụng <span className="text-rose-500">*</span></span>
                            {(priority === 'Khẩn cấp' || warningsCount > 0) && <span className="text-rose-600 animate-pulse text-[10px] bg-rose-50 px-2 py-1 rounded-md border border-rose-200 flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Bắt buộc giải trình vì ưu tiên Khẩn hoặc Vượt mức</span>}
                        </label>
                        <textarea value={purpose} onChange={(e: any)=>setPurpose(e.target.value)} placeholder="Nhập lý do xuất kho chi tiết (Ví dụ: Cấp phát cho nhân sự mới phòng IT, Dự án ra mắt Web T4...)" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none min-h-[100px] font-medium resize-y transition shadow-inner" />
                    </div>
                </div>
            </div>

            {/* ZONE 2: DANH SÁCH CHI TIẾT */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-[450px]">
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between rounded-t-2xl">
                    <h3 className="text-[11px] font-black text-indigo-700 uppercase tracking-widest flex items-center">
                        <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center mr-2">2</div> Lưới vật tư / Hàng hóa
                    </h3>
                    <div className="text-xs font-bold flex gap-4 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-slate-500">Mục: <strong className="text-indigo-600 text-[14px]">{targetItems.length}</strong></span>
                        <div className="w-px h-auto bg-slate-200"></div>
                        <span className="text-slate-500">Cảnh báo: <strong className="text-rose-500 text-[14px]">{warningsCount}</strong></span>
                    </div>
                </div>
                
                {/* Search Header */}
                <div className="p-4 border-b border-slate-100" ref={searchRef}>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={(e: any) => {setSearchTerm(e.target.value); setShowDropdown(true);}}
                            onFocus={() => setShowDropdown(true)}
                            placeholder="Nhập Mã hoặc Tên VPP để thêm vào lưới (Hiển thị ngay số tồn kho)..." 
                            className="w-full pl-12 pr-4 py-3.5 bg-indigo-50 border-2 border-indigo-100 rounded-xl focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-indigo-900 transition-all shadow-inner"
                        />
                        {showDropdown && searchTerm && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-2xl rounded-xl z-50 max-h-72 overflow-y-auto overflow-hidden divide-y divide-slate-50 p-1">
                                {searchResults.length === 0 ? <div className="p-4 text-slate-500 text-center text-sm font-medium">Không tìm thấy vật tư "{searchTerm}".</div> : searchResults.map((item: any) => (
                                    <div key={item.id} onClick={() => handleAddItem(item)} className="p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition flex items-center justify-between group">
                                        <div>
                                            <p className="font-extrabold text-slate-800 text-sm group-hover:text-indigo-700">{item.name}</p>
                                            <div className="flex gap-2 mt-1 -ml-0.5">
                                                <span className="bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-bold">{item.mvpp}</span>
                                                <span className={`${item.stock === 0 ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'} px-1.5 py-0.5 rounded text-[10px] font-bold`}>Tồn: {item.stock} {item.unit}</span>
                                            </div>
                                        </div>
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 transition"><Plus className="w-5 h-5"/></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Grid */}
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left whitespace-nowrap min-w-max">
                        <thead className="bg-slate-50 border-b border-slate-200 relative">
                            <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                                <th className="p-3 w-12 text-center border-r border-slate-100">STT</th>
                                <th className="p-3">Hàng hoá (VPP)</th>
                                <th className="p-3 text-center border-l border-slate-100 hidden md:table-cell">Hệ lượng</th>
                                <th className="p-3 text-center w-40 border-x-2 border-indigo-100 bg-indigo-50/50">SL YÊU CẦU</th>
                                <th className="p-3 max-w-[200px]">Ghi chú & Thuyết minh</th>
                                <th className="p-3 text-center w-12">Xóa</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {targetItems.length === 0 && <tr><td colSpan={6} className="p-16 text-center text-slate-400 font-medium bg-slate-50/50"><Search className="w-12 h-12 text-slate-300 mx-auto mb-3 opacity-50"/>Lưới chứng từ đang trống. Sử dụng thanh tìm kiếm phía trên để thêm hàng.</td></tr>}
                            {targetItems.map((t: any, idx: number) => {
                                const isOverQuota = t.quantity > t.item.quota;
                                const isOutStock = t.item.stock === 0;
                                return (
                                <tr key={t.item.id} className={`hover:bg-slate-50 transition group ${isOverQuota ? 'bg-rose-50/30' : ''}`}>
                                    <td className="p-3 text-center font-bold text-slate-400 border-r border-slate-100">{idx+1}</td>
                                    <td className="p-3">
                                        <p className="font-bold text-slate-800 text-sm max-w-[250px] whitespace-normal leading-tight">{t.item.name}</p>
                                        <p className="text-[10px] font-black tracking-widest text-slate-400 mt-1">{t.item.mvpp}</p>
                                    </td>
                                    <td className="p-3 text-center border-l border-slate-100 hidden md:table-cell">
                                        <div className="flex gap-1 justify-center">
                                            <div className="text-center px-2 py-1 bg-slate-50 rounded border border-slate-100 flex-1">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tồn Kho</p>
                                                <p className={`text-xs font-black ${isOutStock ? 'text-rose-500' : 'text-emerald-600'}`}>{t.item.stock}</p>
                                            </div>
                                            <div className="text-center px-2 py-1 bg-slate-50 rounded border border-slate-100 flex-1">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Quota</p>
                                                <p className="text-xs font-black text-indigo-600">{t.item.quota}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 border-x-2 border-indigo-100 relative bg-white group-hover:bg-slate-50 transition-colors align-middle">
                                        <input 
                                            type="number" min="1" value={t.quantity || ''} 
                                            onChange={(e: any) => setTargetItems(targetItems.map((ti: any) => ti.item.id === t.item.id ? {...ti, quantity: parseInt(e.target.value.replace(/\D/g, ''))||0} : ti))}
                                            className={`w-full text-center py-2.5 bg-slate-100/50 border outline-none rounded-lg focus:ring-4 focus:ring-indigo-100 focus:bg-white font-black text-lg transition ${isOverQuota ? 'text-rose-600 border-rose-300 ring-4 ring-rose-50' : 'text-indigo-700 border-slate-200 focus:border-indigo-400'}`}
                                        />
                                        {isOverQuota && <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2" title="Vượt định mức kỷ luật"><AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse bg-white border border-rose-200 rounded-full p-0.5" /></div>}
                                    </td>
                                    <td className="p-3 align-middle">
                                        <input type="text" value={t.note} onChange={(e: any)=>setTargetItems(targetItems.map((ti: any) => ti.item.id === t.item.id ? {...ti, note: e.target.value} : ti))} placeholder="Ghi chú thêm..." className="w-full bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 hover:border-slate-300 transition text-sm text-slate-700 p-2.5 font-medium" />
                                    </td>
                                    <td className="p-3 text-center align-middle">
                                        <button onClick={() => setTargetItems(targetItems.filter((ti: any) => ti.item.id !== t.item.id))} className="p-2 border border-slate-200 bg-white hover:bg-rose-500 hover:border-rose-500 hover:text-white text-slate-400 rounded-xl transition shadow-sm"><Trash2 className="w-4 h-4"/></button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ZONE 3: CHỐT SỐ (FOOTER) */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl p-6 flex flex-col md:flex-row justify-between items-center shrink-0 border border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                <div className="text-slate-300 font-medium mb-4 md:mb-0 relative z-10 flex items-center">
                    <span className="text-sm font-bold opacity-80 uppercase tracking-widest mr-4">Tổng ngân sách tạm tính</span>
                    <strong className="text-3xl text-white font-black tracking-tight">{totalAmount.toLocaleString('vi-VN')} <span className="text-sm text-slate-400 font-bold ml-1">VND</span></strong>
                </div>
                {warningsCount > 0 && (
                    <div className="bg-rose-500/10 text-rose-300 border border-rose-500/30 px-5 py-3 rounded-xl font-bold flex items-center text-sm shadow-inner relative z-10">
                        <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 animate-pulse text-rose-400"/> Quá <span className="text-white mx-1 bg-rose-500 px-1.5 rounded">{warningsCount}</span> mặt hàng VƯỢT ĐỊNH MỨC QUOTA
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
