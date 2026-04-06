import { useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, Download, Clock, ShoppingCart, CheckCircle, Inbox, RefreshCw, 
  AlertTriangle, FileText, LayoutDashboard, ShieldAlert, Zap
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/api';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  const { currentUser } = useAppContext();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard KPI', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleExportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    
    if (data.analytical?.trendData?.length) {
      const ws = XLSX.utils.json_to_sheet(data.analytical.trendData);
      XLSX.utils.book_append_sheet(wb, ws, "Xu_Huong_30_Ngay");
    }
    
    if (data.predictive?.stockoutRisks?.length) {
      const ws = XLSX.utils.json_to_sheet(data.predictive.stockoutRisks);
      XLSX.utils.book_append_sheet(wb, ws, "Canh_Bao_Het_Hang");
    }

    XLSX.writeFile(wb, `Bao_Cao_KPI_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="flex flex-col items-center">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
          <p className="text-slate-500 font-bold">Đang tổng hợp dữ liệu {currentUser?.role}...</p>
        </div>
      </div>
    );
  }

  const { operational, analytical, predictive, role } = data;
  const isEmployee = role === 'EMPLOYEE';
  const isManager = role === 'MANAGER';

  // Format Helpers
  const formatCurrency = (val: number) => Math.round(val).toLocaleString('vi-VN') + ' đ';
  const totalPending = operational.pendingActions.requests + operational.pendingActions.purchases + operational.pendingActions.receipts;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] p-4 md:p-8 bg-slate-50 relative overflow-y-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 shrink-0 gap-4">
            <div>
               <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
                  <LayoutDashboard className="w-6 h-6 mr-3 text-indigo-600" />
                  Đài Chỉ Huy (Dashboard)
               </h2>
               <p className="text-slate-500 font-medium text-sm mt-1">
                 {isEmployee ? 'Theo dõi Yêu cầu & Cấp phát cá nhân' : 'Giám sát Vận hành, Phân tích Hiệu suất & Dự báo Tương lai'}
               </p>
            </div>
            <div className="flex gap-3">
              <button onClick={fetchDashboard} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition flex items-center">
                <RefreshCw className="w-4 h-4 mr-2" /> Làm mới
              </button>
              {!isEmployee && (
                <button onClick={handleExportExcel} className="px-5 py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-xl shadow-sm hover:bg-indigo-100 transition flex items-center">
                    <Download className="w-5 h-5 mr-2" /> Xuất Báo Cáo
                </button>
              )}
            </div>
        </div>

        {/* ========================================== */}
        {/* LAYER 1: OPERATIONAL (Việc Cần Xử Lý Ngay) */}
        {/* ========================================== */}
        <div className="mb-2 flex items-center">
           <Zap className="w-4 h-4 text-amber-500 mr-2" />
           <h3 className="text-sm font-bold tracking-wider uppercase text-slate-400">KPI Vận Hành & Việc Của Tôi</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8 shrink-0">
            {/* 1. Requests Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => alert('Drill-down: Mở danh sách Phiếu')}>
               <div className="flex justify-between items-start">
                 <div>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Phiếu VPP Gần Đây</p>
                    <h3 className="text-3xl font-black text-indigo-600 leading-none">{operational.totalRequests}</h3>
                 </div>
                 <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5"/></div>
               </div>
               <p className="text-xs text-slate-400 mt-3 font-medium">Trong kỳ 30 ngày</p>
            </div>

            {/* 2. Bottleneck / Backlog */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200 shadow-sm relative overflow-hidden cursor-pointer">
               <div className="flex justify-between items-start">
                 <div>
                    <p className="text-amber-700 font-bold text-xs uppercase tracking-wider mb-1">Cần Xử Lý Ngay (Backlog)</p>
                    <h3 className="text-3xl font-black text-amber-600 leading-none">{totalPending}</h3>
                 </div>
                 <div className="w-10 h-10 bg-amber-200 text-amber-700 rounded-xl flex items-center justify-center"><Inbox className="w-5 h-5"/></div>
               </div>
               <div className="mt-3 space-y-1">
                 {operational.pendingActions.requests > 0 && <p className="text-xs text-amber-700 font-medium">• {operational.pendingActions.requests} phiếu chờ / trễ SLA</p>}
                 {operational.pendingActions.purchases > 0 && <p className="text-xs text-amber-700 font-medium">• {operational.pendingActions.purchases} đơn PR/PO chờ</p>}
                 {totalPending === 0 && <p className="text-xs text-emerald-600 font-bold flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Đã hroàn tất mọi việc</p>}
               </div>
            </div>

            {/* 3. Fill Rate / SLA */}
            {!isEmployee && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
                 <div className="flex justify-between items-start">
                   <div>
                      <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Tỉ lệ Đáp Ưng (Fill Rate)</p>
                      <h3 className="text-3xl font-black text-emerald-600 leading-none">{operational.fillRate}%</h3>
                   </div>
                   <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><TrendingUp className="w-5 h-5"/></div>
                 </div>
                 <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                   <div className="bg-emerald-500 h-full rounded-full transition-all" style={{width: `${operational.fillRate}%`}}></div>
                 </div>
                 <p className="text-xs text-slate-400 mt-1.5 font-medium">Lượng xuất kho / Lượng Y/Cầu</p>
              </div>
            )}

            {/* 4. Purchases / Budgets */}
            {(!isEmployee && !isManager) && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                 <div className="flex justify-between items-start">
                   <div>
                      <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Chi Phí Mua Sắm (Tháng)</p>
                      <h3 className="text-2xl font-black text-slate-800 leading-none">{formatCurrency(operational.totalPurchases.amount)}</h3>
                   </div>
                   <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><ShoppingCart className="w-5 h-5"/></div>
                 </div>
                 <p className="text-xs text-slate-400 mt-3 font-medium">{operational.totalPurchases.count} đơn Purchase Orders</p>
              </div>
            )}
        </div>

        {/* ========================================== */}
        {/* LAYER 2: ANALYTICAL (For non-employees) */}
        {/* ========================================== */}
        {!isEmployee && (
          <>
            <div className="mb-2 flex items-center mt-4">
               <TrendingUp className="w-4 h-4 text-emerald-500 mr-2" />
               <h3 className="text-sm font-bold tracking-wider uppercase text-slate-400">Phân Tích Chuyên Sâu</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 mb-8">
                {/* Trend Chart (Area) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:col-span-2 flex flex-col">
                    <h3 className="font-extrabold text-slate-800 text-base mb-6 flex items-center">
                        Xu Hướng Giao Dịch Kho (30 Ngày Qua)
                    </h3>
                    <div className="flex-1 w-full min-h-[300px]">
                        {analytical.trendData?.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={analytical.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="colorNhap" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorXuat" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="date" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} tickMargin={10} minTickGap={30} />
                                  <YAxis tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                                  <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                  <Legend verticalAlign="top" height={36}/>
                                  <Area type="monotone" dataKey="nhap" stroke="#10b981" fillOpacity={1} fill="url(#colorNhap)" name="(+) Nhập kho" strokeWidth={2}/>
                                  <Area type="monotone" dataKey="xuat" stroke="#f59e0b" fillOpacity={1} fill="url(#colorXuat)" name="(-) Xuất kho" strokeWidth={2}/>
                              </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-400 font-medium">Chưa đủ dữ liệu giao dịch.</div>
                        )}
                    </div>
                </div>

                {/* ABC Analysis / Pie */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                    <h3 className="font-extrabold text-slate-800 text-base mb-6 text-center" title="Phân loại theo Giá trị tiêu thụ">
                       Cơ Cấu Vật Tư Theo ABC
                    </h3>
                    <div className="flex-1 min-h-[250px] w-full">
                        {analytical.abcAnalysis ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={[
                                      {name: 'Nhóm A (Giá trị cao)', value: analytical.abcAnalysis.A},
                                      {name: 'Nhóm B (Trung bình)', value: analytical.abcAnalysis.B},
                                      {name: 'Nhóm C (Thấp/Lặt vặt)', value: analytical.abcAnalysis.C}
                                    ]} 
                                    cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                                      {COLORS.map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
                                  </Pie>
                                  <RechartsTooltip contentStyle={{borderRadius: '12px', border:'none', boxShadow:'0 10px 15px rgba(0,0,0,0.1)'}}/>
                                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '12px'}}/>
                              </PieChart>
                          </ResponsiveContainer>
                        ) : <div className="text-center text-slate-400 mt-10">Không có dữ liệu</div>}
                    </div>
                </div>
            </div>
          </>
        )}

        {/* ========================================== */}
        {/* LAYER 3: PREDICTIVE & ALERTS */}
        {/* ========================================== */}
        {!isEmployee && (
          <>
            <div className="mb-2 flex items-center mt-4">
               <ShieldAlert className="w-4 h-4 text-rose-500 mr-2" />
               <h3 className="text-sm font-bold tracking-wider uppercase text-slate-400">Dự Báo & Cảnh Báo Sớm</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 gap-6 shrink-0 pb-10">
              
              {/* Widget: Dự báo Ngày Hết Hàng */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden lg:col-span-2">
                  <div className="p-5 border-b border-slate-100 bg-rose-50/30 flex justify-between items-center">
                      <h3 className="font-extrabold text-slate-800 flex items-center text-base">
                          <AlertTriangle className="w-5 h-5 mr-2 text-rose-500" /> Stockout Risks (Cảnh báo cạn kho &lt; 15 ngày)
                      </h3>
                  </div>
                  <div className="p-0 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-extrabold text-slate-500">
                              <tr>
                                  <th className="p-4">Sản phẩm</th>
                                  <th className="p-4 text-center">Tồn T.Tế</th>
                                  <th className="p-4 text-center">Tốc độ xuất (Ngày)</th>
                                  <th className="p-4 text-right">Dự báo cạn (Ngày)</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {predictive.stockoutRisks?.length === 0 && (
                                  <tr><td colSpan={4} className="p-8 text-center text-emerald-500 font-bold">An toàn, không có mã nào có nguy cơ đứt gãy sơm.</td></tr>
                              )}
                              {predictive.stockoutRisks?.map((risk: any) => (
                                  <tr key={risk.mvpp} className="hover:bg-rose-50/20 transition-colors">
                                      <td className="p-4 font-bold text-slate-700">
                                          {risk.name} <span className="block text-xs font-normal text-slate-400">{risk.mvpp}</span>
                                      </td>
                                      <td className="p-4 text-center font-black text-rose-600">{risk.stock}</td>
                                      <td className="p-4 text-center text-slate-500">~{risk.dailyAvg} đv/ngày</td>
                                      <td className="p-4 text-right">
                                          <span className="bg-rose-100 text-rose-700 font-bold px-3 py-1.5 rounded-lg border border-rose-200 shadow-sm">
                                            {risk.daysLeft === 0 ? 'Hết ngay' : `Còn ~${risk.daysLeft} ngày`}
                                          </span>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>

              {/* Widget: Ngân sách & Chậm luân chuyển */}
              <div className="flex flex-col gap-6">
                 {/* Budget Forecast */}
                 {(!isManager) && (
                   <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700 p-6 text-white relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
                      <h3 className="font-extrabold text-slate-300 text-sm mb-2 flex items-center uppercase tracking-wider">
                          <TrendingUp className="w-4 h-4 mr-2" /> Dự phóng Ngân sách tháng tiếp
                      </h3>
                      <div className="text-3xl font-black text-white mt-1 mb-2">
                        {formatCurrency(predictive.budgetForecast)}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">Được tính toán tự động dựa trên tốc độ tiêu hao của 30 ngày gần nhất + 5% dự phòng an toàn.</p>
                   </div>
                 )}

                 {/* Slow Moving */}
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-0 flex-1 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-extrabold text-slate-800 text-sm flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-slate-400" /> Hàng Chậm Luân Chuyển
                        </h3>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {analytical.slowMoving?.length === 0 ? (
                        <li className="p-4 text-xs text-slate-400 text-center font-medium">Lưu thông kho khoẻ mạnh.</li>
                      ) : (
                        analytical.slowMoving?.map((item: any) => (
                           <li key={item.mvpp} className="p-4 flex justify-between items-center hover:bg-slate-50">
                             <div className="flex flex-col">
                               <span className="text-sm font-bold text-slate-700 truncate w-40" title={item.name}>{item.name}</span>
                               <span className="text-xs text-slate-400">{item.mvpp}</span>
                             </div>
                             <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">Tồn: {item.stock}</span>
                           </li>
                        ))
                      )}
                    </ul>
                 </div>
              </div>

            </div>
          </>
        )}
    </div>
  );
}
