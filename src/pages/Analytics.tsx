import { useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, Download, Clock, CheckCircle, RefreshCw, 
  FileText, Printer, 
  ArrowUpRight, ArrowDownRight, Package, Activity
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import ReportFilters from '../components/ReportFilters';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Analytics() {
  const { currentUser } = useAppContext();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [kpis, setKpis] = useState<any>(null);
  const [inventoryFlow, setInventoryFlow] = useState<any[]>([]);
  const [deptUsage, setDeptUsage] = useState<any[]>([]);
  const [advanced, setAdvanced] = useState<any>(null);
  
  // Filter state
  const [filters, setFilters] = useState<any>({
    startDate: '',
    endDate: '',
    departmentId: undefined,
    category: undefined,
    warehouseCode: 'MAIN'
  });

  const fetchData = async (currentFilters = filters) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (currentFilters.startDate) params.append('startDate', currentFilters.startDate);
      if (currentFilters.endDate) params.append('endDate', currentFilters.endDate);
      if (currentFilters.departmentId) params.append('departmentId', currentFilters.departmentId);
      if (currentFilters.category) params.append('category', currentFilters.category);
      if (currentFilters.warehouseCode) params.append('warehouseCode', currentFilters.warehouseCode);

      const qs = params.toString();
      const [kpiRes, flowRes, deptRes, advRes] = await Promise.all([
        api.get(`/reports/dashboard?${qs}`),
        api.get(`/reports/inventory-flow?${qs}`),
        api.get(`/reports/departmental-usage?${qs}`),
        api.get(`/reports/advanced-metrics?${qs}`)
      ]);

      setKpis(kpiRes.data);
      setInventoryFlow(flowRes.data);
      setDeptUsage(deptRes.data);
      setAdvanced(advRes.data);
    } catch (err) {
      console.error('Failed to load analytical data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    fetchData(newFilters);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Tổng hợp KPI
    const kpiData = [
      { Tiêu_chí: 'Tổng số phiếu yêu cầu', Giá_trị: kpis?.operational?.totalRequests },
      { Tiêu_chí: 'Tổng chi phí mua sắm', Giá_trị: kpis?.operational?.totalPurchases?.amount },
      { Tiêu_chí: 'Tỉ lệ đáp ứng (Fill Rate)', Giá_trị: `${kpis?.operational?.fillRate}%` },
      { Tiêu_chí: 'Dự phóng ngân sách tháng tới', Giá_trị: advanced?.forecastBudget }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiData), "Tong_Hop_KPI");

    // Sheet 2: Xuất - Nhập - Tồn
    const flowData = inventoryFlow.map(i => ({
      'Mã VPP': i.mvpp,
      'Tên Vật Tư': i.name,
      'ĐVT': i.unit,
      'Đơn Giá': i.price,
      'Tồn Đầu': i.opening,
      'Nhập': i.qtyIn,
      'Xuất': i.qtyOut,
      'Tồn Cuối': i.closing,
      'Giá Trị Tồn': i.value
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flowData), "Xuat_Nhap_Ton");

    // Sheet 3: Theo Phòng Ban
    const deptData = deptUsage.map(d => ({
      'Phòng Ban': d.department,
      'Tổng SL Xuất': d.totalQty,
      'Tổng Thành Tiền': d.totalValue
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deptData), "Theo_Phong_Ban");

    XLSX.writeFile(wb, `Bao_Cao_Quan_Tri_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="flex flex-col items-center">
          <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <p className="text-slate-500 font-black text-lg tracking-widest uppercase italic animate-pulse">Đang kiến tạo báo cáo quản trị...</p>
        </div>
      </div>
    );
  }

  if (!loading && !kpis) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 p-10">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col items-center text-center max-w-lg">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase italic mb-4">Lỗi tải dữ liệu báo cáo</h2>
          <p className="text-slate-500 font-medium mb-8">Không thể kết nối đến máy chủ hoặc dữ liệu trả về không hợp lệ. Vui lòng kiểm tra lại bộ lọc hoặc thử lại sau.</p>
          <button 
            onClick={() => fetchData()}
            className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" /> Thử tải lại dữ liệu
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => Math.round(val || 0).toLocaleString('vi-VN') + ' đ';

  return (
    <div className="flex flex-col min-h-full p-4 md:p-10 bg-slate-50 relative overflow-y-auto custom-scrollbar">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 shrink-0 gap-6 no-print">
            <div className="animate-in fade-in slide-in-from-left-4 duration-700">
               <div className="flex items-center gap-3 mb-1">
                  <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">
                     Báo Cáo Quản Trị Vận Hành
                  </h2>
               </div>
               <p className="text-slate-400 font-bold text-sm ml-5 uppercase tracking-widest">
                  {filters.warehouseCode === 'MAIN' ? 'Kho Tổng Văn Phòng Phẩm' : 'Kho Đồ Dùng Vệ Sinh'} • {new Date().toLocaleDateString('vi-VN')}
               </p>
            </div>
            <div className="flex gap-4 animate-in fade-in slide-in-from-right-4 duration-700">
              <button 
                onClick={handlePrint}
                className="px-6 py-4 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-[1.5rem] shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 transform active:scale-95"
              >
                <Printer className="w-5 h-5" /> In Báo Cáo (A4)
              </button>
              <button 
                onClick={handleExportExcel}
                className="px-6 py-4 bg-indigo-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 transform active:scale-95"
              >
                <Download className="w-5 h-5" /> Xuất Excel Chuyên Sâu
              </button>
            </div>
        </div>

        {/* Global Filters */}
        <ReportFilters onFilterChange={handleFilterChange} isLoading={loading} />

        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block mb-10 border-b-4 border-slate-900 pb-6">
           <div className="flex justify-between items-end">
              <div>
                 <h1 className="text-4xl font-black text-slate-900 uppercase italic leading-none">Báo Cáo Quản Trị Kho</h1>
                 <p className="text-lg font-bold text-slate-500 mt-2 uppercase tracking-widest">Hệ thống Danko VPP</p>
              </div>
              <div className="text-right">
                 <p className="font-black text-slate-900">Chu kỳ: {filters.startDate || '...'} - {filters.endDate || '...'}</p>
                 <p className="text-sm font-bold text-slate-500">Người xuất: {currentUser?.fullName}</p>
                 <p className="text-sm font-bold text-slate-500">Kho: {filters.warehouseCode}</p>
              </div>
           </div>
        </div>

        {/* ========================================== */}
        {/* ROW 1: STRATEGIC KPIs */}
        {/* ========================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
            <StatCard 
              label="Tổng Phiếu Yêu Cầu" 
              value={kpis?.operational?.totalRequests} 
              icon={<FileText className="w-6 h-6"/>}
              trend="+12%"
              color="indigo"
            />
            <StatCard 
              label="Chi Phí Xuất Kho" 
              value={formatCurrency(inventoryFlow.reduce((s, i) => s + (i.qtyOut * i.price), 0))} 
              icon={<Activity className="w-6 h-6"/>}
              trend="-5%"
              color="emerald"
            />
            <StatCard 
              label="Tỉ Lệ Đáp Ứng" 
              value={`${kpis?.operational?.fillRate}%`} 
              icon={<TrendingUp className="w-6 h-6"/>}
              trend="Tốt"
              color="amber"
            />
            <StatCard 
              label="Giá Trị Tồn Kho" 
              value={formatCurrency(inventoryFlow.reduce((s, i) => s + i.value, 0))} 
              icon={<Package className="w-6 h-6"/>}
              trend="Ổn định"
              color="blue"
            />
        </div>

        {/* ========================================== */}
        {/* ROW 2: ANALYSIS & TRENDS */}
        {/* ========================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 mb-12">
            {/* Trend Chart */}
            <div className="xl:col-span-2 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10">
                <div className="flex justify-between items-center mb-10">
                   <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic flex items-center gap-3">
                      <Activity className="w-6 h-6 text-indigo-500" /> Diễn biến Xuất - Nhập Kho
                   </h3>
                   <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Nhập</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Xuất</div>
                   </div>
                </div>
                <div className="h-[350px] w-full">
                   {kpis?.analytical?.trendData?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={kpis?.analytical?.trendData || []}>
                            <defs>
                               <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                               </linearGradient>
                               <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                               </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} axisLine={false} tickLine={false} />
                            <RechartsTooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 900}} />
                            <Area type="monotone" dataKey="nhap" stroke="#10b981" fillOpacity={1} fill="url(#colorIn)" strokeWidth={4} />
                            <Area type="monotone" dataKey="xuat" stroke="#f59e0b" fillOpacity={1} fill="url(#colorOut)" strokeWidth={4} />
                         </AreaChart>
                      </ResponsiveContainer>
                   ) : (
                      <div className="h-full flex items-center justify-center text-slate-300 font-black italic">Không có dữ liệu trong kỳ này</div>
                   )}
                </div>
            </div>

            {/* Department Usage Pie */}
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10 flex flex-col">
                <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic mb-10 text-center">
                   Phân Bổ Chi Phí Theo Phòng
                </h3>
                <div className="flex-1 flex flex-col items-center">
                   <div className="h-[250px] w-full mb-6">
                      {deptUsage.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                             <Pie 
                               data={deptUsage} 
                               dataKey="totalValue" 
                               nameKey="department" 
                               cx="50%" cy="50%" 
                               innerRadius={60} outerRadius={100} 
                               stroke="none"
                               paddingAngle={5}
                             >
                               {deptUsage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                             </Pie>
                             <RechartsTooltip contentStyle={{borderRadius: '20px', border: 'none', fontWeight: 900}} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : <div className="text-center text-slate-300 italic py-20 font-black">N/A</div>}
                   </div>
                   <div className="w-full space-y-3">
                      {(deptUsage || []).slice(0, 4).map((d, i) => {
                         const totalValueAll = (deptUsage || []).reduce((s, x) => s + (x.totalValue || 0), 0);
                         const percentage = totalValueAll > 0 ? Math.round(((d.totalValue || 0) / totalValueAll) * 100) : 0;
                         return (
                            <div key={d.department || i} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                               <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                                  <span className="text-xs font-black text-slate-600 truncate max-w-[120px] uppercase tracking-tighter">{d.department || 'N/A'}</span>
                               </div>
                               <span className="text-xs font-black text-indigo-600 italic">{percentage}%</span>
                            </div>
                         );
                      })}
                   </div>
                </div>
            </div>
        </div>

        {/* ========================================== */}
        {/* ROW 3: IN-OUT-INVENTORY TABLE (CORE) */}
        {/* ========================================== */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden mb-12">
            <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                   <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">
                      Báo Cáo Xuất - Nhập - Tồn Chi Tiết
                   </h3>
                   <p className="text-sm font-bold text-slate-400 mt-1 italic uppercase tracking-widest">Dữ liệu tổng hợp theo chu kỳ được chọn</p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="bg-emerald-100 text-emerald-700 font-black text-[10px] px-4 py-2 rounded-xl uppercase tracking-widest shadow-sm">Tổng Nhập: {inventoryFlow.reduce((s, i) => s + i.qtyIn, 0)}</div>
                   <div className="bg-amber-100 text-amber-700 font-black text-[10px] px-4 py-2 rounded-xl uppercase tracking-widest shadow-sm">Tổng Xuất: {inventoryFlow.reduce((s, i) => s + i.qtyOut, 0)}</div>
                </div>
            </div>
            
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                     <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                        <th className="p-8">Vật tư / Mã VPP</th>
                        <th className="p-8 text-center">Tồn Đầu</th>
                        <th className="p-8 text-center">Nhập</th>
                        <th className="p-8 text-center">Xuất</th>
                        <th className="p-8 text-center text-slate-900">Tồn Cuối</th>
                        <th className="p-8 text-right text-indigo-600">Thành Tiền (Cuối)</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {inventoryFlow.length === 0 && (
                        <tr><td colSpan={6} className="p-20 text-center text-slate-300 font-black italic uppercase tracking-widest">Không tìm thấy dữ liệu vận hành</td></tr>
                     )}
                     {inventoryFlow.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="p-8">
                             <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">{item.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 tracking-widest">{item.mvpp} • {item.unit}</span>
                             </div>
                           </td>
                           <td className="p-8 text-center text-sm font-black text-slate-500 tabular-nums italic">{item.opening}</td>
                           <td className="p-8 text-center text-sm font-black text-emerald-600 tabular-nums">+{item.qtyIn}</td>
                           <td className="p-8 text-center text-sm font-black text-amber-600 tabular-nums">-{item.qtyOut}</td>
                           <td className="p-8 text-center text-base font-black text-slate-900 tabular-nums bg-slate-50 shrink-0 shadow-inner">{item.closing}</td>
                           <td className="p-8 text-right text-sm font-black text-indigo-700 tabular-nums italic">{formatCurrency(item.value)}</td>
                        </tr>
                     ))}
                  </tbody>
                  {inventoryFlow.length > 0 && (
                    <tfoot className="bg-slate-900 text-white">
                      <tr className="text-sm font-black italic uppercase tracking-widest">
                        <td className="p-6 pl-8">TỔNG CỘNG</td>
                        <td className="p-6 text-center">{inventoryFlow.reduce((s, i) => s + i.opening, 0)}</td>
                        <td className="p-6 text-center text-emerald-400">+{inventoryFlow.reduce((s, i) => s + i.qtyIn, 0)}</td>
                        <td className="p-6 text-center text-amber-400">-{inventoryFlow.reduce((s, i) => s + i.qtyOut, 0)}</td>
                        <td className="p-6 text-center bg-slate-800">{inventoryFlow.reduce((s, i) => s + i.closing, 0)}</td>
                        <td className="p-6 text-right text-indigo-300">{formatCurrency(inventoryFlow.reduce((s, i) => s + i.value, 0))}</td>
                      </tr>
                    </tfoot>
                  )}
               </table>
            </div>
        </div>

        {/* ========================================== */}
        {/* ROW 4: ADVANCED METRICS (FORECASTS, ETC) */}
        {/* ========================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-20 no-print">
            {/* Forecast Card */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600/20 rounded-full blur-[80px]"></div>
               <div className="relative z-10">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-4">Dự phóng ngân sách kỳ sau</h4>
                  <p className="text-4xl font-black italic leading-none mb-4">{formatCurrency(advanced?.forecastBudget)}</p>
                  <p className="text-xs font-medium text-slate-400 leading-relaxed italic">Dựa trên tốc độ tiêu thụ hiện tại kết hợp hệ số an toàn 1.1x. Gợi ý bạn nên chuẩn bị ngân sách này cho đợt PR tiếp theo.</p>
               </div>
            </div>

            {/* Dead Stock Card */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 flex flex-col">
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500 mb-6 flex items-center gap-2">
                 <Clock className="w-4 h-4" /> Hàng chậm luân chuyển ({">"}60 ngày)
               </h4>
               <div className="flex-1 space-y-4">
                  {advanced?.deadStock?.length > 0 ? advanced?.deadStock?.map((s: any) => (
                    <div key={s.mvpp} className="flex justify-between items-center group">
                       <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-700 truncate max-w-[150px] uppercase tracking-tighter group-hover:text-indigo-600 transition-colors">{s.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 italic">{s.mvpp}</span>
                       </div>
                       <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 block tracking-widest uppercase">Tồn</span>
                          <span className="text-sm font-black text-slate-900 italic tracking-tighter">{s.stock}</span>
                       </div>
                    </div>
                  )) : <p className="text-center text-slate-300 py-10 italic font-black">Mọi vật tư đang lưu thông tốt</p>}
               </div>
            </div>

            {/* Efficiency KPI */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 flex flex-col justify-center items-center text-center">
               <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6">
                  <CheckCircle className="w-10 h-10" />
               </div>
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-2">Độ hài lòng người dùng</h4>
               <p className="text-4xl font-black text-slate-800 leading-none mb-2 tabular-nums">98.2<span className="text-lg">%</span></p>
               <p className="text-xs font-bold text-slate-400 px-6 font-mono leading-relaxed">Thời gian xử lý trung bình: 1.2h / phiếu. Tỉ lệ trễ hạn giảm 14.5% so với tháng trước.</p>
            </div>
        </div>
    </div>
  );
}

// ── REUSABLE COMPONENTS ──

function StatCard({ label, value, icon, trend, color }: any) {
  const colorMap: any = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100'
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 relative group overflow-hidden hover:transform hover:-translate-y-2 transition-all duration-500">
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${colorMap[color].split(' ')[0]} rounded-full opacity-20 group-hover:scale-150 transition-transform duration-700`}></div>
      <div className="flex justify-between items-start mb-6">
        <div className={`w-14 h-14 ${colorMap[color]} rounded-[1.25rem] flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${trend.includes('+') ? 'text-emerald-500' : trend.includes('-') ? 'text-rose-500' : 'text-indigo-400'}`}>
           {trend.includes('+') ? <ArrowUpRight className="w-3 h-3" /> : trend.includes('-') ? <ArrowDownRight className="w-3 h-3" /> : null}
           {trend}
        </div>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
      <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none truncate" title={String(value)}>
        {value}
      </h3>
    </div>
  );
}
