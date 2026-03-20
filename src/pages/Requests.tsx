import React, { useState, useRef, useEffect } from 'react';
import { Plus, CheckCircle, XCircle, Printer, Eye, Trash2, FileText, Search, AlertCircle, Save, Send, AlertTriangle, Download } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import api from '../lib/api';
import type { VPPRequest, VPPItem } from '../context/AppContext';
import * as XLSX from 'xlsx';

export default function Requests() {
  const { currentUser, requests, items, refreshData } = useAppContext();
  
  const [viewMode, setViewMode] = useState<'LIST' | 'CREATE' | 'VIEW'>('LIST');
  const [activeRequest, setActiveRequest] = useState<VPPRequest | null>(null);

  // Form State (New Request)
  const [reqType, setReqType] = useState<'Định kỳ' | 'Bổ sung đột xuất' | 'Dự án mới'>('Định kỳ');
  const [priority, setPriority] = useState<'Thường' | 'Cao' | 'Khẩn cấp'>('Thường');
  const [purpose, setPurpose] = useState('');
  const [targetItems, setTargetItems] = useState<{item: VPPItem, quantity: number, note: string}[]>([]);
  
  // Reject Form State
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReasonText, setRejectReasonText] = useState('');

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  const resetForm = () => {
    setReqType('Định kỳ');
    setPriority('Thường');
    setPurpose('');
    setTargetItems([]);
    setSearchTerm('');
  };

  const handleAddItem = (i: VPPItem) => {
    if (i.stock === 0) {
        if (!window.confirm('Cảnh báo: Mặt hàng này hiện đang hết tồn kho (0). Nếu đưa vào phiếu, hệ thống sẽ đẩy thành Yêu Cầu Chờ Mua Hàng. Bạn có chắc chắn thêm?')) return;
    }
    const existing = targetItems.find(t => t.item.mvpp === i.mvpp);
    if (existing) {
       // Auto gộp dòng
       setTargetItems(targetItems.map(t => t.item.mvpp === i.mvpp ? {...t, quantity: (t.qtyRequested) + 1} : t));
    } else {
       setTargetItems([...targetItems, {item: i, quantity: 1, note: ''}]);
    }
    setSearchTerm('');
    setShowDropdown(false);
  };

  const updateLineQty = (mvpp: string, val: string) => {
    const parsed = parseInt(val.replace(/\D/g, '')); // Chỉ chặn nhập chữ ngay lập tức
    const qty = isNaN(parsed) ? 0 : parsed;
    setTargetItems(targetItems.map(t => t.item.mvpp === mvpp ? {...t, quantity: qty} : t));
  };
  
  const updateLineNote = (mvpp: string, text: string) => {
    setTargetItems(targetItems.map(t => t.item.mvpp === mvpp ? {...t, note: text} : t));
  };

  const removeItem = (mvpp: string) => {
    setTargetItems(targetItems.filter(t => t.item.mvpp !== mvpp));
  };

  const submitForm = async (status: 'Nháp' | 'Chờ duyệt') => {
    if (targetItems.length === 0) return alert('Lỗi: Chưa có mặt hàng VPP nào.');
    const realStatus = status === 'Nháp' ? 'DRAFT' : 'PENDING';
    try {
      const res = await api.post('/requests', {
        requestType: reqType, priority, purpose, warehouseCode: 'MAIN',
        lines: targetItems.map(t => ({ itemId: t.item.id, qtyRequested: (t.qtyRequested), note: t.note }))
      });
      if (realStatus === 'PENDING') {
        await api.post(`/requests/${res.data.id}/submit`);
      }
      alert('Đã lưu thành công!');
      resetForm();
      setViewMode('LIST');
      refreshData();
    } catch(e: any) { alert(e.response?.data?.error || 'Lỗi'); }
  };
  
  const handleApprove = async (id: string) => {
    try {
      await api.post(`/requests/${id}/approve`, {});
      alert('Đã duyệt!'); setViewMode('LIST'); refreshData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
  };

  const handleReject = async (id: string) => {
    try {
      await api.post(`/requests/${id}/reject`, { reason: rejectReasonText });
      alert('Đã từ chối!'); setViewMode('LIST'); refreshData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
  };
  
  const handleIssue = async (id: string, lines: any[]) => {
    try {
      await api.post(`/requests/${id}/issue`, {
        lineIssues: lines.map(l => ({ lineId: l.id, qtyDelivered: l.qtyApproved || l.qtyRequested }))
      });
      alert('Đã xuất kho!'); setViewMode('LIST'); refreshData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
  };

  const getStatusColor = (status: string) => {
    if (status === 'APPROVED' || status === 'READY_TO_ISSUE' || status === 'COMPLETED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (status === 'REJECTED' || status === 'CANCELLED') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (status === 'DRAFT') return 'bg-slate-200 text-slate-700 border-slate-300';
    if (status === 'PARTIALLY_ISSUED' || status === 'PARTIALLY_APPROVED') return 'bg-teal-100 text-teal-700';
    if (status === 'RETURNED') return 'bg-orange-100 text-orange-700';
    return 'bg-amber-100 text-amber-700 border-amber-200';
  };

  const handleExportExcel = () => {
    const exportData = requests.map((req, index) => ({
       'STT': index + 1,
       'Mã Phiếu': req.id,
       'Thời gian lập': new Date(req.createdAt).toLocaleString('vi-VN'),
       'Người đề xuất': req.requester?.fullName || '',
       'Bộ phận': req.department,
       'Loại Phiếu': req.requestType,
       'Mức ưu tiên': req.priority,
       'Lý do': req.purpose,
       'Trạng thái': req.status
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [ {wch: 5}, {wch: 15}, {wch: 20}, {wch: 25}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 40}, {wch: 20} ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Phieu");
    XLSX.writeFile(wb, `Danh_Sach_Phieu_VPP_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (viewMode === 'CREATE') {
      const totalAmount = targetItems.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0);
      const warningsCount = targetItems.filter(t => (t.qtyRequested) > t.item.quota).length;

      return (
        <div className="flex flex-col h-full bg-slate-100 overflow-hidden relative print:bg-white print:overflow-auto">
            {/* Header Toolbar */}
            <div className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-6 shrink-0 z-20 shadow-sm print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => setViewMode('LIST')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition"><XCircle className="w-6 h-6"/></button>
                    <h2 className="text-xl font-bold text-slate-800">Lập Phiếu Đề Xuất Trực Tuyến</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => submitForm('Nháp')} className="flex items-center px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg font-bold transition shadow-sm">
                        <Save className="w-4 h-4 mr-2"/> Lưu Nháp
                    </button>
                    <button onClick={() => submitForm('Chờ duyệt')} className="flex items-center px-5 py-2.5 bg-indigo-600 border border-indigo-700 text-white hover:bg-indigo-700 rounded-lg font-bold transition shadow-md">
                        <Send className="w-4 h-4 mr-2"/> Gửi Trình Kế Toán (Submit)
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 w-full max-w-6xl mx-auto">
                
                {/* ZONE 1: THÔNG TIN ĐẦU PHIẾU */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-sm font-black text-indigo-700 mb-4 uppercase tracking-wider border-b border-indigo-100 pb-2">1. Thông tin chung & Pháp lý</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">Mã phiếu (Auto-gen)</label>
                            <input type="text" value="PDX-[YYYY]..." disabled className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Loại hình xin cấp</label>
                            <select value={reqType} onChange={e => setReqType(e.target.value as any)} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium">
                                <option>Định kỳ</option><option>Bổ sung đột xuất</option><option>Dự án mới</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Mức độ ưu tiên (SLA)</label>
                            <select value={priority} onChange={e => setPriority(e.target.value as any)} className={`w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold outline-none transition-colors ${priority === 'Khẩn cấp' ? 'text-rose-600 bg-rose-50 border-rose-300' : priority === 'Cao' ? 'text-amber-600' : 'text-slate-700'}`}>
                                <option value="Thường">Thường (Xử lý 24h)</option>
                                <option value="Cao">Cao (Xử lý 8h)</option>
                                <option value="Khẩn cấp">Khẩn cấp (ASAP)</option>
                            </select>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                                <span>Mục đích/Lý do sử dụng <span className="text-rose-500">*</span></span>
                                {(priority === 'Khẩn cấp' || warningsCount > 0) && <span className="text-rose-500 animate-pulse text-[10px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">Bắt buộc giải trình vì ưu tiên Khẩn hoặc Vượt mức</span>}
                            </label>
                            <textarea value={purpose} onChange={e=>setPurpose(e.target.value)} placeholder="Nhập lý do chi tiết..." className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px] font-medium resize-none transition-shadow" />
                        </div>
                    </div>
                </div>

                {/* ZONE 2: DANH SÁCH CHI TIẾT */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-0 flex flex-col flex-1 min-h-[400px]">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between rounded-t-2xl">
                        <h3 className="text-sm font-black text-indigo-700 uppercase tracking-wider">2. Bảng kê Vật tư / Hàng hóa</h3>
                        <div className="text-xs font-bold text-slate-500 flex gap-4">
                            <span>Tổng số món: <strong className="text-indigo-600 text-base">{targetItems.length}</strong></span>
                            <span>Có <strong className="text-rose-500 text-base">{warningsCount}</strong> cảnh báo</span>
                        </div>
                    </div>
                    
                    {/* Inline Search Auto-complete */}
                    <div className="p-4 border-b border-slate-200" ref={searchRef}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                            <input 
                               type="text" 
                               value={searchTerm} 
                               onChange={e => {setSearchTerm(e.target.value); setShowDropdown(true);}}
                               onFocus={() => setShowDropdown(true)}
                               placeholder="🔍 Nhập Tên hoặc Mã VPP để tìm kiếm và đưa vào lưới (Ví dụ: Giấy A4)..." 
                               className="w-full pl-10 pr-4 py-3 bg-indigo-50/50 border-2 border-indigo-100 rounded-xl focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-indigo-900 transition-all shadow-inner"
                            />
                            
                            {showDropdown && searchTerm && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-2xl rounded-xl z-50 max-h-64 overflow-y-auto overflow-hidden divide-y divide-slate-100">
                                    {searchResults.length === 0 ? <div className="p-4 text-slate-500 text-center text-sm font-medium">Không tìm thấy vật tư hợp lệ.</div> : searchResults.map(item => (
                                        <div key={item.mvpp} onClick={() => handleAddItem(item)} className="p-3 hover:bg-indigo-50 cursor-pointer transition flex items-center justify-between group">
                                            <div>
                                                <p className="font-bold text-slate-800 group-hover:text-indigo-700">{item.name}</p>
                                                <div className="flex gap-2 mt-1 text-[10px] font-bold">
                                                    <span className="bg-slate-100 text-slate-500 px-1.5 rounded">{item.mvpp}</span>
                                                    <span className={`${item.stock === 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'} px-1.5 rounded`}>Tồn: {item.stock} {item.unit}</span>
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-400 font-bold opacity-0 group-hover:opacity-100 flex items-center">Nhấn chèn <Plus className="w-4 h-4 ml-1"/></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Data Grid */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">
                                    <th className="p-3 w-12 text-center">STT</th>
                                    <th className="p-3 w-32">Mã Kho</th>
                                    <th className="p-3">Tên sản phẩm</th>
                                    <th className="p-3 text-center">Tồn / Quota</th>
                                    <th className="p-3 text-center w-32 border-x-2 border-indigo-100 bg-indigo-50/50">SL Yêu Cầu</th>
                                    <th className="p-3 max-w-[200px]">Thuyết minh dòng</th>
                                    <th className="p-3 text-center w-16">Xóa</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {targetItems.length === 0 && <tr><td colSpan={7} className="p-16 text-center text-slate-400 font-medium">Lưới chứng từ đang trống. Sử dụng thanh tìm kiếm phía trên để thêm hàng.</td></tr>}
                                {targetItems.map((t, idx) => {
                                    const isOverQuota = (t.qtyRequested) > t.item.quota;
                                    const isOutStock = (0) === 0;
                                    return (
                                    <tr key={t.item.mvpp} className={`hover:bg-slate-50 transition group ${isOverQuota ? 'bg-rose-50/30' : ''}`}>
                                        <td className="p-3 text-center font-medium text-slate-400">{idx+1}</td>
                                        <td className="p-3 font-bold text-slate-600 text-sm">{t.item.mvpp}</td>
                                        <td className="p-3">
                                            <p className="font-bold text-slate-800">{t.item.name}</p>
                                        </td>
                                        <td className="p-3 text-center">
                                            <p className="text-[10px] font-bold text-slate-400">TỒN: <span className={isOutStock ? 'text-rose-500' : 'text-emerald-600'}>{(0)}</span></p>
                                            <p className="text-[10px] font-bold text-slate-400 border-t mt-1 pt-1 mx-2">ĐM THÁNG: <span className="text-indigo-600">{t.item.quota}</span></p>
                                        </td>
                                        <td className="p-2 border-x-2 border-indigo-100 relative bg-white">
                                            <input 
                                                type="number" min="1" value={(t.qtyRequested) === 0 ? '' : (t.qtyRequested)} 
                                                onChange={e => updateLineQty(t.item.mvpp, e.target.value)}
                                                className={`w-full text-center py-2 bg-slate-50 border border-slate-200 outline-none rounded focus:ring-2 focus:ring-indigo-500 focus:bg-white font-extrabold text-lg transition ${isOverQuota ? 'text-rose-600 border-rose-300 bg-rose-50 ring-2 ring-rose-200' : 'text-indigo-700'}`}
                                            />
                                            {isOverQuota && <div className="absolute top-1 right-1" title="Vượt định mức kỷ luật"><AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" /></div>}
                                        </td>
                                        <td className="p-3">
                                            <input type="text" value={t.note} onChange={e=>updateLineNote(t.item.mvpp, e.target.value)} placeholder="Ghi chú cụ thể..." className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none hover:border-slate-300 transition text-sm text-slate-600 p-1" />
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => removeItem(t.item.mvpp)} className="p-2 bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-400 rounded transition"><Trash2 className="w-4 h-4"/></button>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ZONE 3: CHỐT SỐ (FOOTER) */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl shadow-xl p-6 flex justify-between items-center shrink-0">
                    <div className="text-slate-300 font-medium text-sm">
                        Tổng giá trị tạm tính (Internal Cost): <strong className="text-2xl text-white ml-2">{(totalAmount || 0).toLocaleString('vi-VN')} VNĐ</strong>
                    </div>
                    {warningsCount > 0 && <div className="bg-rose-500/20 text-rose-300 border border-rose-500/50 px-4 py-2 rounded-lg font-bold flex items-center text-sm"><AlertCircle className="w-5 h-5 mr-2"/> Hệ thống phát hiện Cảnh Báo Lỗi logic. Vui lòng kiểm tra lại.</div>}
                </div>
            </div>
        </div>
      );
  }

  if (viewMode === 'VIEW' && activeRequest) {
      const isApprover = currentUser.role !== 'EMPLOYEE' && activeRequest.status === 'PENDING';
      const canPrint = (activeRequest.status === 'APPROVED' || activeRequest.status === 'READY_TO_ISSUE') || activeRequest.status === 'Hoàn tất';
      const isOverStockWarning = activeRequest.lines.some(t => (t.qtyRequested) > (0));

      return (
         <div className="flex flex-col h-full bg-slate-100 overflow-hidden relative print:bg-white print:overflow-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-6 print:hidden shrink-0">
               <button onClick={() => setViewMode('LIST')} className="flex items-center text-slate-500 hover:text-indigo-600 font-bold transition">
                   Hủy / Quay Lại
               </button>
               {canPrint && (
                   <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition font-bold shadow">
                       <Printer className="w-4 h-4 mr-2"/> In Phiếu
                   </button>
               )}
            </div>

            <div className="flex-1 overflow-y-auto w-full max-w-5xl mx-auto space-y-6 print:p-0">
                {/* Header info */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 flex items-center">{activeRequest.id} 
                                <span className={`ml-4 px-3 py-1 text-[11px] font-bold rounded-full border uppercase tracking-wider ${getStatusColor(activeRequest.status)}`}>{activeRequest.status}</span>
                            </h2>
                            <p className="text-slate-500 font-medium mt-2">Ngày lập: {activeRequest.createdAt.toLocaleDateString('vi-VN')} {activeRequest.createdAt.toLocaleTimeString('vi-VN')}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-slate-800 text-lg uppercase tracking-wider">{activeRequest.requester?.fullName}</p>
                            <p className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded inline-block mt-2">{activeRequest.department}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Loại Phiếu / Ưu tiên</p>
                            <p className="font-bold text-slate-700">{activeRequest.requestType} - <span className={`px-2 py-0.5 rounded text-xs ml-2 ${activeRequest.priority === 'Khẩn cấp' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-700'}`}>{activeRequest.priority}</span></p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Mục đích / Lý do</p>
                            <p className="font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">{activeRequest.purpose || 'Không có ghi chú.'}</p>
                        </div>
                        {activeRequest.status === 'REJECTED' && (
                            <div className="md:col-span-2 bg-rose-50 border border-rose-200 rounded-lg p-4">
                                <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Lý do Từ chối</p>
                                <p className="font-bold text-rose-700">{(activeRequest as any).rejectReason || 'Không có phản hồi'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Table items */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <h3 className="text-sm font-black text-indigo-700 uppercase tracking-wider">Chi tiết Yêu cầu Cấp phát</h3>
                        {isApprover && isOverStockWarning && <span className="text-xs font-bold text-rose-500 flex items-center bg-rose-100 px-3 py-1 rounded-full border border-rose-200"><AlertTriangle className="w-4 h-4 mr-1"/> Cảnh báo thiếu Tồn kho thực tế (Không đủ xuất)</span>}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-white border-b border-slate-200">
                                <tr className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">
                                    <th className="p-4 text-center w-12">STT</th>
                                    <th className="p-4">Danh mục VPP / Mã</th>
                                    <th className="p-4 text-center">Tồn Hiện Tại</th>
                                    <th className="p-4 text-center border-x-2 border-indigo-50 bg-slate-50">Số lượng Xin Cấp</th>
                                    <th className="p-4">Ghi Chú bổ sung</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeRequest.lines.map((t, idx) => {
                                    const outOfStock = (t.qtyRequested) > (0);
                                    return (
                                    <tr key={idx} className={`hover:bg-slate-50 transition border-l-4 ${outOfStock && isApprover ? 'border-l-rose-400 bg-rose-50/20' : 'border-l-transparent'}`}>
                                        <td className="p-4 text-center font-bold text-slate-400">{idx+1}</td>
                                        <td className="p-4">
                                            <p className="font-bold text-slate-800">{t.item.name}</p>
                                            <p className="text-[10px] bg-slate-100 text-slate-500 px-2 mt-1 rounded inline-block font-bold">{t.item.mvpp}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`font-black tracking-tighter text-xl ${(0) === 0 ? 'text-rose-500 bg-rose-50 px-3 py-1 rounded-lg' : 'text-slate-700'}`}>{(0)}</span> <span className="text-xs font-bold text-slate-400 ml-1">{t.item.unit}</span>
                                        </td>
                                        <td className="p-4 text-center border-x-2 border-indigo-50 bg-slate-50">
                                            <span className={`font-black text-2xl px-5 py-2 rounded-xl inline-block shadow-sm ${outOfStock && isApprover ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-white text-indigo-700 border border-slate-200'}`}>{(t.qtyRequested)}</span>
                                        </td>
                                        <td className="p-4 text-slate-600 text-sm font-medium">{t.note || '-'}</td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Approver Toolbar */}
                {isApprover && (
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-6 print:hidden border border-slate-700">
                        {!rejectMode ? (
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div>
                                    <p className="text-slate-300 font-medium text-sm">Action Group (Vai trò: <strong className="text-white bg-slate-700 px-2 py-1 rounded mx-1">{currentUser.role === 'ADMIN' ? 'Quản Trị Viên' : 'Trưởng Bộ Phận'}</strong>)</p>
                                    <p className="text-slate-400 text-xs mt-1">Hệ thống sẽ tự động trừ Tồn Kho ngay lập tức nếu Phiếu được Duyệt.</p>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => setRejectMode(true)} className="px-6 py-3 font-bold text-rose-400 hover:text-white hover:bg-rose-500 border border-rose-500/50 rounded-xl transition cursor-pointer bg-slate-800/50">Từ chối Phiếu</button>
                                    <button onClick={() => { handleApprove(activeRequest.id); setViewMode('LIST'); }} className="px-8 py-3 font-black bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:scale-[1.02] transform transition flex items-center cursor-pointer border border-emerald-400">
                                        <CheckCircle className="w-5 h-5 mr-2" /> PHÊ DUYỆT CẤP PHÁT
                                    </button>
{currentUser.role === 'WAREHOUSE' && (activeRequest.status === 'APPROVED' || activeRequest.status === 'READY_TO_ISSUE') && (
   <button onClick={() => handleIssue(activeRequest.id, activeRequest.lines)} className="px-8 py-3 font-black bg-blue-500 text-white rounded-xl shadow-lg hover:bg-blue-600 flex items-center">
      THỰC HIỆN XUẤT KHO
   </button>
)}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 animate-fadeIn">
                                <label className="text-rose-400 font-bold uppercase tracking-widest text-xs flex items-center"><AlertCircle className="w-4 h-4 mr-2"/> Cung cấp phản hồi Lý do Từ chối:</label>
                                <textarea autoFocus value={rejectReasonText} onChange={e=>setRejectReasonText(e.target.value)} className="w-full p-4 bg-slate-950/50 border border-rose-500/50 rounded-xl text-white outline-none focus:border-rose-400 focus:bg-slate-900 resize-none h-24 font-medium transition" placeholder="Ví dụ: Vượt quá định mức ngân sách của phòng tháng này..."/>
                                <div className="flex justify-end gap-3 mt-2">
                                    <button onClick={() => setRejectMode(false)} className="px-6 py-2.5 font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer">Hủy Bỏ</button>
                                    <button onClick={() => { 
                                        if(!rejectReasonText.trim()) return alert('Bắt buộc nhập lý do!');
                                        handleReject(activeRequest.id);
                                        setViewMode('LIST');
                                    }} className="px-8 py-2.5 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition shadow-lg shadow-rose-600/30 cursor-pointer">Xác Nhận Từ Chối</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
         </div>
      );
  }

  // LIST VIEW Render below
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] p-4 md:p-8 bg-slate-50 relative print:bg-white print:p-0 overflow-hidden">
      {/* Title */}
      <div className="flex justify-between items-center mb-6 print:hidden shrink-0">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Cổng Yêu cầu Cấp phát VPP</h2>
           <p className="text-slate-500 font-medium text-sm mt-1">Quản lý và xét duyệt các chứng từ nội bộ.</p>
        </div>
        <div className="flex gap-3">
            <button 
               onClick={handleExportExcel}
               className="flex items-center px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition font-bold shadow-sm cursor-pointer">
               <Download className="w-5 h-5 mr-2"/> Tải Excel
            </button>
            <button 
               onClick={() => setViewMode('CREATE')}
               className="flex items-center px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-500/30 cursor-pointer">
               <Plus className="w-5 h-5 mr-2"/> Tạo Đề Xuất
            </button>
        </div>
      </div>

       {/* Detailed Logic cho ActiveRequest Modal và Grid View... Tối giản render để tập trung Specs UI mới */}
       <div className="bg-white rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.03)] border border-slate-200 overflow-hidden flex-1 flex flex-col print:hidden">
            <div className="overflow-auto flex-1 relative">
                <table className="w-full text-left whitespace-nowrap min-w-max">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 shadow-sm z-10">
                    <tr className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">
                        <th className="p-5">Mã Phiếu YC</th>
                        <th className="p-5">Loại & Ưu Tiên</th>
                        <th className="p-5">Thời gian lập</th>
                        <th className="p-5">Người đề xuất / Bộ phận</th>
                        <th className="p-5">Lý do</th>
                        <th className="p-5 text-center">Trạng thái (Status)</th>
                        <th className="p-5 text-right"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {requests.filter(req => {
                        if (currentUser.role === 'ADMIN') return true;
                        if (currentUser.role === 'MANAGER') return req.department === currentUser.department;
                        return req.requester?.fullName === currentUser.name;
                    }).map(req => (
                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-5 font-black text-indigo-700">{req.id}</td>
                            <td className="p-5">
                                <p className="font-bold text-slate-700 text-sm">{req.requestType}</p>
                                <p className={`text-[10px] uppercase font-bold text-white px-2 mt-1 rounded inline-block ${req.priority==='Khẩn cấp'?'bg-rose-500':req.priority==='Cao'?'bg-amber-500':'bg-slate-400'}`}>{req.priority}</p>
                            </td>
                            <td className="p-5 font-bold text-slate-600 text-sm">{new Date(req.createdAt).toLocaleDateString('vi-VN')}</td>
                            <td className="p-5">
                            <p className="font-bold text-slate-800">{req.requester?.fullName}</p>
                            <p className="text-xs font-semibold text-slate-500 mt-1">{req.department}</p>
                            </td>
                            <td className="p-5 text-slate-600 font-medium truncate max-w-[150px] text-sm">{req.purpose}</td>
                            <td className="p-5 text-center">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border flex w-max mx-auto justify-center items-center ${getStatusColor(req.status)}`}>{req.status}</span>
                            </td>
                            <td className="p-5 text-right">
                            <button onClick={() => { setActiveRequest(req); setViewMode('VIEW'); setRejectMode(false); setRejectReasonText(''); }} className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg font-bold text-sm cursor-pointer hover:bg-indigo-600 hover:text-white transition shadow-sm">
                                {currentUser.role !== 'EMPLOYEE' && req.status === 'PENDING' ? 'Duyệt / Xử lý »' : 'Xem Chi tiết'}
                            </button>
                            </td>
                        </tr>
                    ))}
                    {requests.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-slate-500">Trống.</td></tr>}
                </tbody>
                </table>
            </div>
       </div>
    </div>
  );
}
