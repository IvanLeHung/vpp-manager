import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingDown, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';
import api from '../../lib/api';

export default function JanitorialReports() {
  const [metrics, setMetrics] = useState<any>({});
  const [consumption, setConsumption] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Note: These APIs are specific to 'VE_SINH' warehouse.
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resMetrics, resConsumption] = await Promise.all([
        api.get('/janitorial/metrics'),
        api.get('/janitorial/consumption')
      ]);
      setMetrics(resMetrics.data);
      setConsumption(resConsumption.data);
    } catch (error) {
      console.error('Failed to fetch Janitorial reports', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const chartData = consumption.map(c => ({
    name: c.item.name,
    Tiêu_Hao: c.totalQtyConsumed,
    Ngưỡng: c.item.standardConsumption || 0
  })).slice(0, 10); // Display Top 10

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white px-8 pt-4 pb-4 border-b border-slate-200 shrink-0 sticky top-0 z-10 w-full shadow-sm">
        <h1 className="text-xl font-bold flex items-center text-rose-700">
           <TrendingDown className="w-5 h-5 mr-3" /> Báo cáo tiêu hao Đồ vệ sinh (30 ngày qua)
        </h1>
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
                            <p className="font-bold text-slate-800">{c.item.name}</p>
                            <p className="text-xs text-slate-500">{c.item.mvpp}</p>
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
      </div>
    </div>
  );
}
