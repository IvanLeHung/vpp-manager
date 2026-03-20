import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Search, Filter, History, ArrowDownToLine, ArrowUpFromLine, Settings2 } from 'lucide-react';
import api from '../lib/api';
import * as XLSX from 'xlsx';

export default function InventoryReport() {
   const [movements, setMovements] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchTerm, setSearchTerm] = useState('');
   const [filterType, setFilterType] = useState('ALL'); // ALL, RECEIVE, ISSUE, ADJUSTMENT

   const fetchMovements = async () => {
      try {
         setLoading(true);
         const typeQuery = filterType !== 'ALL' ? `?type=${filterType}` : '';
         const res = await api.get(`/inventory/movements${typeQuery}`);
         setMovements(res.data);
      } catch (err) {
         console.error(err);
         alert('Lỗi khi tải lịch sử biến động kho.');
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchMovements();
   }, [filterType]);

   const filteredMovements = movements.filter(m => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const itemName = m.item?.name?.toLowerCase() || '';
      const itemMvpp = m.item?.mvpp?.toLowerCase() || '';
      const ref = m.refId?.toLowerCase() || '';
      return itemName.includes(q) || itemMvpp.includes(q) || ref.includes(q);
   });

   const handleExportExcel = () => {
      const exportData = filteredMovements.map((d, index) => ({
         'STT': index+1,
         'Mã VPP': d.item?.mvpp,
         'Tên Hàng Hóa': d.item?.name,
         'Thời gian': new Date(d.createdAt).toLocaleString('vi-VN'),
         'Loại GD': d.movementType,
         'SL Thay đổi': d.qty,
         'Tồn trước': d.beforeQty,
         'Tồn sau': d.afterQty,
         'Người thao tác': d.createdBy?.fullName || d.createdBy?.username,
         'Lý do / Tham chiếu': d.reason || d.refId || ''
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [ {wch: 5}, {wch: 15}, {wch: 30}, {wch: 20}, {wch: 15}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 20}, {wch: 30} ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Lich_Su_Kho");
      XLSX.writeFile(wb, `Lich_Su_Kho_${new Date().getTime()}.xlsx`);
   };

   const getTypeIcon = (type: string) => {
      if (type === 'RECEIVE') return <ArrowDownToLine className="w-4 h-4 text-blue-600 mr-2" />;
      if (type === 'ISSUE') return <ArrowUpFromLine className="w-4 h-4 text-rose-600 mr-2" />;
      if (type === 'ADJUSTMENT') return <Settings2 className="w-4 h-4 text-amber-600 mr-2" />;
      return <History className="w-4 h-4 text-slate-400 mr-2" />;
   };

   const getTypeLabel = (type: string) => {
      if (type === 'RECEIVE') return <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded font-bold text-xs">NHẬP KHO</span>;
      if (type === 'ISSUE') return <span className="text-rose-700 bg-rose-50 px-2 py-1 rounded font-bold text-xs">XUẤT KHO</span>;
      if (type === 'ADJUSTMENT') return <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded font-bold text-xs">ĐIỀU CHÍNH</span>;
      if (type === 'RESERVE') return <span className="text-purple-700 bg-purple-50 px-2 py-1 rounded font-bold text-xs">TẠM GIỮ</span>;
      if (type === 'UNRESERVE') return <span className="text-slate-700 bg-slate-100 px-2 py-1 rounded font-bold text-xs">HỦY GIỮ</span>;
      return <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded font-bold text-xs">{type}</span>;
   };

   return (
      <div className="flex flex-col h-[calc(100vh-64px)] p-4 md:p-8 bg-slate-50 relative overflow-hidden">
         {/* Head Area */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
            <div>
               <h2 className="text-2xl font-bold text-slate-800 flex items-center"><History className="w-6 h-6 mr-3 text-indigo-600"/> Lịch sử Biến động Kho</h2>
               <p className="text-slate-500 font-medium text-sm mt-1">Ghi nhận chi tiết mọi hoạt động nhập, xuất, kiểm kê tại kho tổng.</p>
            </div>
            
            <div className="flex gap-3">
               <button 
                  onClick={handleExportExcel}
                  className="flex items-center px-5 py-2.5 bg-white border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-50 transition font-bold shadow-sm">
                  <Download className="w-5 h-5 mr-2"/> Xuất Excel Lịch sử
               </button>
            </div>
         </div>

         {/* Filters */}
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 shrink-0 justify-between items-center">
            <div className="flex bg-slate-100 p-1 rounded-lg">
               {['ALL', 'RECEIVE', 'ISSUE', 'ADJUSTMENT'].map(type => (
                 <button 
                   key={type}
                   onClick={() => setFilterType(type)}
                   className={`px-4 py-2 rounded-md text-sm font-bold transition flex items-center ${filterType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   {type === 'ALL' ? 'Tất cả' : type === 'RECEIVE' ? 'Phiếu Nhập' : type === 'ISSUE' ? 'Phiếu Xuất' : 'Kiểm kê'}
                 </button>
               ))}
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
               <div className="relative flex-1 min-w-[250px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                     type="text" 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     placeholder="Tìm mã MH, Tên, Mã Phiếu..." 
                     className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm outline-none transition-all" 
                  />
               </div>
               <button className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 flex items-center font-bold text-sm cursor-pointer whitespace-nowrap">
                  <Calendar className="w-4 h-4 mr-2"/> 30 Ngày qua
               </button>
            </div>
         </div>

         {/* Data Table */}
         <div className="bg-white rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.03)] border border-slate-200 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1 relative">
               <table className="w-full text-left whitespace-nowrap min-w-max">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 shadow-sm z-10">
                     <tr className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">
                        <th className="p-4 text-center border-r border-slate-100 w-16">ID</th>
                        <th className="p-4">Thời gian</th>
                        <th className="p-4 text-center">Giao dịch</th>
                        <th className="p-4">Sản Phẩm</th>
                        <th className="p-4 text-right">SL Đổi</th>
                        <th className="p-4 text-right text-slate-400">Tồn Trước</th>
                        <th className="p-4 text-right text-emerald-600">Tồn Sau</th>
                        <th className="p-4">Người thực hiện</th>
                        <th className="p-4">Tham chiếu / Ghi chú</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {loading ? (
                        <tr><td colSpan={9} className="p-12 text-center text-slate-400 font-bold animate-pulse">Đang tải lịch sử...</td></tr>
                     ) : filteredMovements.length === 0 ? (
                        <tr><td colSpan={9} className="p-12 text-center text-slate-400 font-medium">Không có dữ liệu giao dịch nào khớp bộ lọc.</td></tr>
                     ) : (
                        filteredMovements.map((m, idx) => (
                           <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 text-center font-bold text-slate-300 border-r border-slate-50 text-xs">#{filteredMovements.length - idx}</td>
                              <td className="p-4 font-bold text-slate-600 text-sm">{new Date(m.createdAt).toLocaleString('vi-VN')}</td>
                              <td className="p-4 text-center flex items-center justify-center">
                                 {getTypeIcon(m.movementType)}
                                 {getTypeLabel(m.movementType)}
                              </td>
                              <td className="p-4 font-bold text-slate-800">
                                 <span className="text-blue-600 mr-2">{m.item?.mvpp}</span>
                                 {m.item?.name}
                              </td>
                              <td className={`p-4 text-right font-black text-lg ${m.qty > 0 ? 'text-blue-600' : m.qty < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                                 {m.qty > 0 ? `+${m.qty}` : m.qty}
                              </td>
                              <td className="p-4 text-right font-medium text-slate-400">{m.beforeQty}</td>
                              <td className="p-4 text-right font-black text-emerald-600">{m.afterQty}</td>
                              <td className="p-4 font-bold text-slate-600 text-sm">{m.createdBy?.fullName || m.createdBy?.username}</td>
                              <td className="p-4 text-slate-500 font-medium text-sm">
                                 {m.refId && <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs mr-2 font-mono text-slate-600">{m.refType}:{m.refId}</span>}
                                 {m.reason}
                              </td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
               <p className="text-sm font-bold text-slate-500">Hiển thị <span className="text-slate-800">{filteredMovements.length}</span> / <span className="text-slate-800">{movements.length}</span> giao dịch kho</p>
            </div>
         </div>
      </div>
   );
}
