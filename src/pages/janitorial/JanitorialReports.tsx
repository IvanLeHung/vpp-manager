import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingDown, AlertTriangle, ShieldCheck, FileText, Printer, Download, History, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../lib/api';
import { GoodsNameWithPreview } from '../../components/GoodsNameWithPreview';

export default function JanitorialReports() {
  const [metrics, setMetrics] = useState<any>({});
  const [consumption, setConsumption] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Note: These APIs are specific to 'VE_SINH' warehouse.
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resMetrics, resConsumption, resHistory] = await Promise.all([
        api.get('/janitorial/metrics'),
        api.get('/janitorial/consumption'),
        api.get('/janitorial/history')
      ]);
      setMetrics(resMetrics.data);
      setConsumption(resConsumption.data);
      setHistory(resHistory.data);
    } catch (error) {
      console.error('Failed to fetch Janitorial reports', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const chartData = consumption
    .filter(c => c.item) // Ensure item exists
    .map(c => ({
      name: c.item.name,
      Tiêu_Hao: c.totalQtyConsumed,
      Ngưỡng: c.item.standardConsumption || 0
    })).slice(0, 10); // Display Top 10

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const exportData = consumption.map((c, i) => ({
       'STT': i + 1,
       'Mã Vật Tư': c.item.mvpp,
       'Tên Vật Tư': c.item.name,
       'Đơn Vị Tính': c.item.unit,
       'Số Lượng Tiêu Hao': c.totalQtyConsumed,
       'Định Mức Chuẩn (Tháng)': c.item.standardConsumption || 0,
       'Cảnh Báo': c.item.standardConsumption > 0 && c.totalQtyConsumed > c.item.standardConsumption ? 'Vượt định mức' : 'Bình thường'
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{wch: 5}, {wch: 15}, {wch: 40}, {wch: 15}, {wch: 20}, {wch: 25}, {wch: 20}];
    XLSX.utils.book_append_sheet(wb, ws, "Tieu_Hao_Do_Ve_Sinh");
    XLSX.writeFile(wb, `Bao_Cao_Tieu_Hao_Ve_Sinh_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative print-area">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; height: auto; overflow: visible !important; }
          .no-print { display: none !important; }
          .bg-white { background: transparent !important; border: none !important; box-shadow: none !important; }
        }
      `}</style>
      <div className="bg-white px-8 pt-4 pb-4 border-b border-slate-200 shrink-0 sticky top-0 z-10 w-full shadow-sm flex justify-between items-center no-print">
        <h1 className="text-xl font-bold flex items-center text-rose-700">
           <TrendingDown className="w-5 h-5 mr-3" /> Báo cáo tiêu hao Đồ vệ sinh (30 ngày qua)
        </h1>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm">
             <Printer className="w-4 h-4 mr-2" /> In Báo Cáo
          </button>
          <button onClick={handleExportExcel} className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm">
             <Download className="w-4 h-4 mr-2" /> Tải Excel
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 flex items-center">
               <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mr-4">
                  <AlertTriangle className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-sm text-slate-500 font-bold uppercase">Hết hàng</p>
                  <p className="text-3xl font-black text-rose-600 mt-1">{loading ? '...' : metrics.outOfStock}</p>
               </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100 flex items-center">
               <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mr-4">
                  <FileText className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-sm text-slate-500 font-bold uppercase">Sắp hết hàng</p>
                  <p className="text-3xl font-black text-amber-600 mt-1">{loading ? '...' : metrics.lowStock}</p>
               </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center">
               <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mr-4">
                  <ShieldCheck className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-sm text-slate-500 font-bold uppercase">Tổng danh mục</p>
                  <p className="text-3xl font-black text-slate-800 mt-1">{loading ? '...' : metrics.totalItems}</p>
               </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 flex items-center">
               <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mr-4">
                  <TrendingDown className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-sm text-slate-500 font-bold uppercase">Cảnh báo tiêu hao nhanh</p>
                  <p className="text-3xl font-black text-indigo-600 mt-1">{loading ? '...' : metrics.fastConsuming}</p>
               </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Top 10 Hàng Tiêu Hao Nhanh Nhất (30 Ngày)</h2>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12, fontWeight: 'bold'}} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} wrapperStyle={{ outline: 'none' }} />
                  <Legend />
                  <Bar dataKey="Tiêu_Hao" name="SL Xuất Kho" fill="#e11d48" radius={[0, 4, 4, 0]} barSize={20} />
                  <Bar dataKey="Ngưỡng" name="Mức tiêu hao chuẩn" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <h2 className="text-lg font-bold text-slate-800 mb-6">Chi tiết Số Lượng Tiêu Hao</h2>
             <div className="overflow-auto max-h-96 pr-2">
                 {consumption.length === 0 ? (
                   <p className="text-center text-slate-400 py-10 font-medium">Bạn chưa phát sinh phiếu xuất nào trong 30 ngày qua.</p>
                 ) : (
                   <ul className="space-y-3">
                     {consumption.map((c, i) => (
                       <li key={i} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            {c.item ? (
                              <GoodsNameWithPreview 
                                itemId={c.item.id}
                                itemCode={c.item.mvpp}
                                itemName={c.item.name}
                                imageUrl={c.item.imageUrl}
                                thumbnailUrl={c.item.thumbnailUrl}
                                categoryName={c.item.category}
                                unit={c.item.unit}
                              />
                            ) : (
                              <p className="font-bold text-slate-800">N/A</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-black text-rose-600 text-lg">{c.totalQtyConsumed} <span className="text-xs font-medium text-slate-500">{c.item.unit}</span></p>
                            <p className="text-xs text-slate-400 mt-1">Định mức chuẩn: {c.item.standardConsumption || 0}</p>
                          </div>
                       </li>
                     ))}
                   </ul>
                 )}
             </div>
          </div>
        </div>

        {/* Lịch sử xuất nhập */}
        <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <History className="w-5 h-5 mr-2 text-indigo-500" /> Lịch sử Xuất/Nhập gần đây (30 Ngày)
           </h2>
           <div className="overflow-x-auto">
             <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-3 font-bold px-4">Thời gian</th>
                    <th className="pb-3 font-bold px-4">Loại GD</th>
                    <th className="pb-3 font-bold px-4">Vật tư</th>
                    <th className="pb-3 font-bold text-right px-4">Số lượng</th>
                    <th className="pb-3 font-bold px-4">Người thực hiện</th>
                    <th className="pb-3 font-bold px-4">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400">Không có giao dịch nào</td></tr>
                  ) : (
                    history.map((h, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-slate-600">{new Date(h.createdAt).toLocaleString('vi-VN')}</td>
                        <td className="py-3 px-4">
                           {h.movementType === 'RECEIPT' ? (
                             <span className="flex items-center text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md w-fit"><ArrowDownRight className="w-4 h-4 mr-1"/> Nhập kho</span>
                           ) : h.movementType === 'ISSUE' ? (
                             <span className="flex items-center text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-md w-fit"><ArrowUpRight className="w-4 h-4 mr-1"/> Xuất kho</span>
                           ) : (
                             <span className="flex items-center text-slate-600 font-bold bg-slate-100 px-2 py-1 rounded-md w-fit">Khác</span>
                           )}
                        </td>
                        <td className="py-3 px-4">
                           {h.item ? (
                             <GoodsNameWithPreview 
                               itemId={h.item.id}
                               itemCode={h.item.mvpp}
                               itemName={h.item.name}
                               imageUrl={h.item.imageUrl}
                               thumbnailUrl={h.item.thumbnailUrl}
                               categoryName={h.item.category}
                               unit={h.item.unit}
                             />
                           ) : (
                             <p className="font-bold text-slate-800">N/A</p>
                           )}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-700">
                           <span className={h.movementType === 'ISSUE' ? 'text-rose-600' : 'text-emerald-600'}>{h.movementType === 'ISSUE' ? '-' : '+'}</span>{Math.abs(h.qty)} <span className="text-xs font-normal text-slate-400">{h.item?.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{h.createdBy?.fullName || h.createdBy?.username || 'Hệ thống'}</td>
                        <td className="py-3 px-4 text-slate-500 italic text-xs max-w-[200px] truncate" title={h.reason || ''}>{h.reason || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
             </table>
           </div>
        </div>

      </div>
    </div>
  );
}
