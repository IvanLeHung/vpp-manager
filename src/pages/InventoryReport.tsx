import React, { useState } from 'react';
import { FileText, Download, Calendar, Search, Filter } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import * as XLSX from 'xlsx';

export default function InventoryReport() {
   const { items, requests } = useAppContext();
   const [searchTerm, setSearchTerm] = useState('');

   // Calculate metrics per item based on approved requests
   const reportData = items.map(item => {
      const approvedRequests = requests.filter(r => r.status === 'Đã duyệt' || r.status === 'Hoàn tất');
      let totalExported = 0;
      
      approvedRequests.forEach(req => {
         const reqItem = req.items.find(i => i.item.mvpp === item.mvpp);
         if (reqItem) totalExported += reqItem.quantity;
      });

      // Tồn đầu kỳ giả định (do chưa chạy DB thật có bảng kỳ kế toán)
      const tonDauKy = item.stock + totalExported;

      return {
         ...item,
         tonDauKy,
         xuatTrongKy: totalExported,
         tonCuoiKy: item.stock
      };
   }).filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.mvpp.toLowerCase().includes(searchTerm.toLowerCase()));

   const handleExportExcel = () => {
      const exportData = reportData.map((d, index) => ({
         'STT': index+1,
         'Mã VPP': d.mvpp,
         'Tên Hàng Hóa': d.name,
         'Nhóm': d.category,
         'ĐVT': d.unit,
         'Tồn Đầu Kỳ': d.tonDauKy,
         'Nhập Trong Kỳ': 0, // Mock for now
         'Xuất Trong Kỳ': d.xuatTrongKy,
         'Tồn Cuối Kỳ': d.tonCuoiKy,
         'Giá Trị Tồn Cuối (VNĐ)': d.tonCuoiKy * d.price
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-size columns slightly
      ws['!cols'] = [ {wch: 5}, {wch: 15}, {wch: 35}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 20} ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bao_Cao_XNT");
      XLSX.writeFile(wb, `Bao_Cao_XNT_Thang_${new Date().getMonth() + 1}_${new Date().getFullYear()}.xlsx`);
   };

   return (
      <div className="flex flex-col h-[calc(100vh-64px)] p-4 md:p-8 bg-slate-50 relative overflow-hidden">
         {/* Head Area */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
            <div>
               <h2 className="text-2xl font-bold text-slate-800 flex items-center"><FileText className="w-6 h-6 mr-3 text-emerald-600"/> Báo Cáo Xuất - Nhập - Tồn VPP</h2>
               <p className="text-slate-500 font-medium text-sm mt-1">Sổ cái tổng hợp luân chuyển vật tư hàng hoá tại kho (Real-time).</p>
            </div>
            
            <div className="flex gap-3">
               <button 
                  onClick={handleExportExcel}
                  className="flex items-center px-5 py-2.5 bg-white border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 transition font-bold shadow-sm">
                  <Download className="w-5 h-5 mr-2"/> Tải Báo Cáo (Excel)
               </button>
            </div>
         </div>

         {/* Filters */}
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex gap-4 flex-wrap shrink-0">
            <div className="relative flex-1 min-w-[250px]">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tra cứu mã / tên VPP..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium text-sm outline-none transition-all" 
               />
            </div>
            <button className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 flex items-center font-bold text-sm cursor-pointer">
               <Calendar className="w-4 h-4 mr-2"/> Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
            </button>
            <button className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 flex items-center font-bold text-sm cursor-pointer">
               <Filter className="w-4 h-4 mr-2"/> Trạng thái Kho
            </button>
         </div>

         {/* Data Table */}
         <div className="bg-white rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.03)] border border-slate-200 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1 relative">
               <table className="w-full text-left whitespace-nowrap min-w-max">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 shadow-sm z-10">
                     <tr className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">
                        <th className="p-4 text-center border-r border-slate-100">STT</th>
                        <th className="p-4 border-r border-slate-100">Mã Kho</th>
                        <th className="p-4">Tên Sản Phẩm VPP</th>
                        <th className="p-4 text-center border-x border-slate-100">ĐVT</th>
                        <th className="p-4 text-right bg-slate-100/50">Tồn Đầu Kỳ</th>
                        <th className="p-4 text-right bg-blue-50 text-blue-700">Nhập Trong Kỳ</th>
                        <th className="p-4 text-right bg-rose-50 text-rose-700">Xuất Trong Kỳ</th>
                        <th className="p-4 text-right bg-emerald-50 text-emerald-700">Tồn Cuối Kỳ</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {reportData.map((row, idx) => (
                        <tr key={row.mvpp} className="hover:bg-slate-50 transition-colors">
                           <td className="p-4 text-center font-medium text-slate-400 border-r border-slate-50">{idx + 1}</td>
                           <td className="p-4 font-bold text-slate-600 border-r border-slate-50">{row.mvpp}</td>
                           <td className="p-4 font-bold text-slate-800">
                              {row.name} 
                              <span className="text-[10px] uppercase ml-2 text-slate-400 font-bold border border-slate-200 bg-slate-50 px-1.5 py-0.5 rounded">{row.itemType === 'VPP' ? 'VPP' : 'Vệ Sinh'}</span>
                           </td>
                           <td className="p-4 text-center font-medium text-slate-500 border-x border-slate-50">{row.unit}</td>
                           <td className="p-4 text-right font-bold text-slate-600 bg-slate-50/30">{row.tonDauKy}</td>
                           <td className="p-4 text-right font-bold text-blue-600 bg-blue-50/10">-</td>
                           <td className="p-4 text-right font-bold text-rose-600 bg-rose-50/10">{row.xuatTrongKy > 0 ? `-${row.xuatTrongKy}` : '-'}</td>
                           <td className="p-4 text-right font-black text-emerald-600 bg-emerald-50/30 text-lg">{row.tonCuoiKy}</td>
                        </tr>
                     ))}
                     {reportData.length === 0 && (
                        <tr><td colSpan={8} className="p-12 text-center text-slate-400 font-medium">Không tìm thấy dữ liệu. Thử thay đổi bộ lọc tìm kiếm.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
               <p className="text-sm font-bold text-slate-500">Tổng số danh mục kiểm soát: <span className="text-slate-800">{reportData.length}</span></p>
               <p className="text-sm font-bold text-slate-800">
                  Tổng lượng Tồn Kho vật lý: <span className="text-emerald-600 text-xl font-black ml-2">{reportData.reduce((acc, curr) => acc + curr.tonCuoiKy, 0)}</span> <span className="text-slate-500 text-xs">(Đơn vị quy đổi)</span>
               </p>
            </div>
         </div>
      </div>
   );
}
