import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { TrendingUp, DollarSign, Package, AlertTriangle, FileText, Download, Clock, ShoppingCart, CheckCircle, Inbox, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/api';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface DashboardData {
  totalRequests: number;
  totalPurchases: { count: number; amount: number };
  slaPerformance: number;
  pendingActions: { requests: number; purchases: number; receipts: number };
  lowStockItems: any[];
}

export default function Analytics() {
  const { items, requests } = useAppContext();
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [loadingDash, setLoadingDash] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoadingDash(true);
      const res = await api.get('/reports/dashboard');
      setDashData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard KPI', err);
    } finally {
      setLoadingDash(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // 1. Tổng quan giá trị kho
  const totalValue = items.reduce((acc, curr) => acc + (curr.stock * curr.price), 0);
  const totalStock = items.reduce((acc, curr) => acc + curr.stock, 0);
  
  // 2. Tỷ trọng VPP và Vệ sinh
  const categoryData = [
    { name: 'Văn Phòng Phẩm', value: items.filter(i => i.itemType === 'VPP').reduce((a,c)=>a+c.stock*c.price, 0) },
    { name: 'Đồ Vệ Sinh', value: items.filter(i => i.itemType === 'VE_SINH').reduce((a,c)=>a+c.stock*c.price, 0) }
  ];

  // 3. Phân bổ chi phí theo phòng ban
  const approvedReqs = requests.filter(r => r.status === 'Đã duyệt' || r.status === 'Hoàn tất');
  
  const deptCostMap = new Map<string, number>();
  approvedReqs.forEach(req => {
     let reqCost = 0;
     req.items.forEach((it: any) => {
        reqCost += it.quantity * it.item.price;
     });
     const current = deptCostMap.get(req.department) || 0;
     deptCostMap.set(req.department, current + reqCost);
  });
  
  const deptData = Array.from(deptCostMap.entries()).map(([name, value]) => ({name, value}));
  if (deptData.length === 0) {
      deptData.push({name: 'Trống (Chưa duyệt đề xuất nào)', value: 1});
  }

  // 4. Các mặt hàng cạn kho (Dưới 20)
  const lowStockItems = items.filter(i => i.stock < 20).sort((a,b) => a.stock - b.stock).slice(0, 5);

  const handleExportExcel = () => {
    const ws1Data = deptData.map((d, index) => ({
      'STT': index + 1,
      'Phòng Ban': d.name,
      'Tổng Chi Phí Cấp Phát (VNĐ)': d.value
    }));
    const ws1 = XLSX.utils.json_to_sheet(ws1Data);
    ws1['!cols'] = [{wch: 5}, {wch: 30}, {wch: 30}];

    const ws2Data = lowStockItems.map((item, index) => ({
      'STT': index + 1,
      'Mã VPP': item.mvpp,
      'Tên Hàng': item.name,
      'Loại': item.itemType,
      'Định Mức': item.quota,
      'Tồn Thực Tế': item.stock
    }));
    const ws2 = XLSX.utils.json_to_sheet(ws2Data);
    ws2['!cols'] = [{wch: 5}, {wch: 15}, {wch: 30}, {wch: 15}, {wch: 15}, {wch: 15}];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Chi_Phi_Phong_Ban");
    XLSX.utils.book_append_sheet(wb, ws2, "Canh_Bao_Ton_Kho");
    
    XLSX.writeFile(wb, `Bao_Cao_Nhanh_VPP_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const totalPending = dashData
    ? dashData.pendingActions.requests + dashData.pendingActions.purchases + dashData.pendingActions.receipts
    : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] p-4 md:p-8 bg-slate-50 relative overflow-y-auto w-full">
        <div className="flex justify-between items-center mb-8 shrink-0">
            <div>
               <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard Tổng Hợp & KPI</h2>
               <p className="text-slate-500 font-medium text-sm mt-1">Giám sát toàn cảnh nghiệp vụ: Tồn kho, Mua sắm, Cấp phát, và Hiệu suất xử lý.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={fetchDashboard} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition flex items-center cursor-pointer" title="Tải lại dữ liệu">
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingDash ? 'animate-spin' : ''}`}/> Cập nhật
              </button>
              <button onClick={handleExportExcel} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition flex items-center cursor-pointer">
                  <Download className="w-5 h-5 mr-2 text-indigo-500"/> Xuất Excel
              </button>
            </div>
        </div>

        {/* ============================== */}
        {/* SECTION 1: Real-time KPI Cards from API */}
        {/* ============================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 mb-8 shrink-0">
            {/* Card 1: Yêu cầu VPP tháng này */}
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-5 text-white shadow-xl shadow-indigo-500/20 border border-indigo-400 relative overflow-hidden">
               <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-lg"></div>
               <div className="flex justify-between items-start relative z-10">
                 <div>
                    <p className="text-indigo-200 font-bold text-xs uppercase tracking-wider mb-1">Phiếu VPP Tháng Này</p>
                    <h3 className="text-3xl font-black leading-none">{loadingDash ? '...' : dashData?.totalRequests ?? 0}</h3>
                 </div>
                 <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md"><FileText className="w-5 h-5"/></div>
               </div>
               <div className="mt-4 text-xs font-semibold bg-white/10 inline-flex px-2.5 py-1 rounded-lg border border-white/10">Tổng số Requests</div>
            </div>

            {/* Card 2: Giá trị Mua Sắm (PO) tháng này */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-5 text-white shadow-xl shadow-emerald-500/20 border border-emerald-400 relative overflow-hidden">
               <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-lg"></div>
               <div className="flex justify-between items-start relative z-10">
                 <div>
                    <p className="text-emerald-200 font-bold text-xs uppercase tracking-wider mb-1">Mua Sắm Tháng Này</p>
                    <h3 className="text-2xl font-black leading-none">{loadingDash ? '...' : (dashData?.totalPurchases?.amount ?? 0).toLocaleString('vi-VN')} đ</h3>
                    <p className="text-emerald-200 text-xs mt-1 font-semibold">{dashData?.totalPurchases?.count ?? 0} đơn PO</p>
                 </div>
                 <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md"><ShoppingCart className="w-5 h-5"/></div>
               </div>
            </div>

            {/* Card 3: SLA Performance */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
               <div className="flex justify-between items-start">
                 <div>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Hiệu Suất SLA</p>
                    <h3 className="text-3xl font-black text-sky-600 leading-none">{loadingDash ? '...' : `${dashData?.slaPerformance ?? 0}%`}</h3>
                 </div>
                 <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center"><Clock className="w-5 h-5"/></div>
               </div>
               <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                 <div className="bg-gradient-to-r from-sky-400 to-sky-600 h-full rounded-full transition-all duration-1000" style={{width: `${dashData?.slaPerformance ?? 0}%`}}></div>
               </div>
               <p className="text-xs text-slate-400 mt-1.5 font-medium">Tỉ lệ xử lý đúng hạn</p>
            </div>

            {/* Card 4: Việc cần làm ngay */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
               <div className="flex justify-between items-start">
                 <div>
                    <p className="text-amber-600 font-bold text-xs uppercase tracking-wider mb-1">Cần Xử Lý Gấp</p>
                    <h3 className="text-3xl font-black text-amber-600 leading-none">{loadingDash ? '...' : totalPending}</h3>
                 </div>
                 <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center"><Inbox className="w-5 h-5"/></div>
               </div>
               <div className="mt-3 space-y-1">
                 {dashData && dashData.pendingActions.requests > 0 && <p className="text-xs text-slate-500 font-medium">• {dashData.pendingActions.requests} phiếu chờ duyệt</p>}
                 {dashData && dashData.pendingActions.purchases > 0 && <p className="text-xs text-slate-500 font-medium">• {dashData.pendingActions.purchases} đơn mua chờ duyệt</p>}
                 {dashData && dashData.pendingActions.receipts > 0 && <p className="text-xs text-slate-500 font-medium">• {dashData.pendingActions.receipts} lô chờ nhập kho</p>}
                 {totalPending === 0 && !loadingDash && <p className="text-xs text-emerald-500 font-bold flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Không có việc gấp</p>}
               </div>
            </div>

            {/* Card 5: Cảnh báo hàng cạn kho */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
               <div className="flex justify-between items-start">
                 <div>
                    <p className="text-rose-600 font-bold text-xs uppercase tracking-wider mb-1">Hàng Sắp Hết</p>
                    <h3 className="text-3xl font-black text-rose-600 leading-none">{lowStockItems.length} <span className="text-lg text-rose-400 font-medium">mã</span></h3>
                 </div>
                 <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center"><AlertTriangle className="w-5 h-5"/></div>
               </div>
               {lowStockItems.length > 0 && <div className="mt-3 text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded inline-block animate-pulse">⚠ Cần nhập bổ sung</div>}
               {lowStockItems.length === 0 && <div className="mt-3 text-xs font-bold text-emerald-500 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Kho an toàn</div>}
            </div>
        </div>

        {/* ============================== */}
        {/* SECTION 2: Existing Charts (Unchanged Logic, Refined Layout) */}
        {/* ============================== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 shrink-0">
            <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-5 text-white shadow-lg border border-slate-600 relative overflow-hidden">
               <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full blur-lg"></div>
               <div className="flex justify-between items-start relative z-10">
                 <div>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Tổng Giá Trị Tồn Kho</p>
                    <h3 className="text-2xl font-black leading-none">{totalValue.toLocaleString('vi-VN')} đ</h3>
                 </div>
                 <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><DollarSign className="w-5 h-5"/></div>
               </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
               <div className="flex justify-between items-start">
                 <div>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Hàng Tồn Kho</p>
                    <h3 className="text-3xl font-black text-slate-800 leading-none">{totalStock} <span className="text-sm text-slate-400">đơn vị</span></h3>
                 </div>
                 <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center"><Package className="w-5 h-5"/></div>
               </div>
               <div className="mt-3 text-xs font-bold text-emerald-600 flex items-center"><TrendingUp className="w-3.5 h-3.5 mr-1"/> Sẵn sàng cung ứng</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
               <div className="flex justify-between items-start">
                 <div>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Phiếu Chờ Xử Lý</p>
                    <h3 className="text-3xl font-black text-amber-500 leading-none">{requests.filter(r=>r.status==='Chờ duyệt').length} <span className="text-sm text-slate-400">phiếu</span></h3>
                 </div>
                 <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5"/></div>
               </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
               <div className="flex justify-between items-start">
                 <div>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Tổng Mã Hàng</p>
                    <h3 className="text-3xl font-black text-indigo-600 leading-none">{items.length}</h3>
                 </div>
                 <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center"><Package className="w-5 h-5"/></div>
               </div>
            </div>
        </div>

        {/* Charts Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 mb-8">
            {/* Chi tiêu phòng ban Chart (Bar Chart) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:col-span-2 flex flex-col">
                <h3 className="font-extrabold text-slate-800 text-lg mb-6 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-3 text-indigo-500"/>
                    Chi Phí VPP Đã Duyệt Theo Phòng Ban (VNĐ)
                </h3>
                <div className="flex-1 w-full min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deptData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 13, fontWeight: 700}} axisLine={false} tickLine={false} tickMargin={10} />
                            <YAxis tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `${(val/1000).toLocaleString('vi-VN')}k`} />
                            <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'}} formatter={(val: any) => [Number(val).toLocaleString('vi-VN') + ' đ', 'Chi phí']} />
                            <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={50}>
                                {deptData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Cơ cấu kho Pie Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                <h3 className="font-extrabold text-slate-800 text-lg mb-6 text-center">Tỷ Trọng Cơ Cấu Kho</h3>
                <div className="flex-1 min-h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                                {categoryData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#10b981'} />
                                ))}
                            </Pie>
                            <RechartsTooltip formatter={(val: any) => Number(val).toLocaleString('vi-VN') + ' đ'} contentStyle={{borderRadius: '16px', border:'none', boxShadow:'0 10px 15px rgba(0,0,0,0.1)'}}/>
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontWeight: 'bold', fontSize: '13px', paddingTop: '20px'}}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* ============================== */}
        {/* SECTION 3: Low Stock Alert Table + Low Stock from API */}
        {/* ============================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
          {/* Table: Hàng cạn kho (từ dữ liệu cục bộ) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-0 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-800 flex items-center text-base">
                      <AlertTriangle className="w-5 h-5 mr-2 text-rose-500" />
                      Cảnh Báo Tồn Kho Thấp (Tồn &lt; 20)
                  </h3>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-extrabold text-slate-400">
                          <tr>
                              <th className="p-4">Mã VPP</th>
                              <th className="p-4">Tên Hàng</th>
                              <th className="p-4 text-center">Tồn</th>
                              <th className="p-4 text-center">Mức độ</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/50">
                          {lowStockItems.length === 0 && (
                              <tr><td colSpan={4} className="p-8 text-center text-emerald-500 font-bold">✨ Kho an toàn. Chưa có sản phẩm nào chạm ngưỡng.</td></tr>
                          )}
                          {lowStockItems.map((item) => (
                              <tr key={item.mvpp} className="hover:bg-rose-50/30 transition-colors">
                                  <td className="p-4 font-bold text-slate-600">{item.mvpp}</td>
                                  <td className="p-4 font-bold text-slate-800 text-sm">{item.name}</td>
                                  <td className="p-4 text-center">
                                      <span className={`px-3 py-1 font-black text-lg border-b-2 rounded ${item.stock===0?'text-rose-600 border-rose-500':'text-amber-500 border-amber-400'}`}>{item.stock}</span>
                                  </td>
                                  <td className="p-4 text-xs font-bold text-center">
                                      {item.stock === 0 
                                          ? <span className="text-rose-600 bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg inline-flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Đứt gãy</span>
                                          : <span className="text-amber-600 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg">Sắp hết</span>
                                      }
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Table: Hàng cạn kho (từ API - Top 5 tồn thấp nhất trong DB) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-0 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-800 flex items-center text-base">
                      <Package className="w-5 h-5 mr-2 text-indigo-500" />
                      Top 5 Hàng Tồn Kho Thấp Nhất (Từ DB)
                  </h3>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-extrabold text-slate-400">
                          <tr>
                              <th className="p-4">Mã VPP</th>
                              <th className="p-4">Tên Hàng</th>
                              <th className="p-4 text-center">Tồn DB</th>
                              <th className="p-4">Đơn vị</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/50">
                          {loadingDash && (
                              <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-medium animate-pulse">Đang tải dữ liệu từ server...</td></tr>
                          )}
                          {!loadingDash && (!dashData?.lowStockItems || dashData.lowStockItems.length === 0) && (
                              <tr><td colSpan={4} className="p-8 text-center text-emerald-500 font-bold">✨ Kho an toàn.</td></tr>
                          )}
                          {!loadingDash && dashData?.lowStockItems?.map((item: any) => (
                              <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                                  <td className="p-4 font-bold text-indigo-600">{item.mvpp}</td>
                                  <td className="p-4 font-bold text-slate-800 text-sm">{item.name}</td>
                                  <td className="p-4 text-center">
                                      <span className="px-3 py-1 font-black text-lg text-slate-700 bg-slate-100 rounded">{item.quantity}</span>
                                  </td>
                                  <td className="p-4 text-slate-500 font-medium text-sm">{item.unit}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
        </div>
    </div>
  );
}
