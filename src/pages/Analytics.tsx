import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { TrendingUp, DollarSign, Package, AlertTriangle, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  const { items, requests } = useAppContext();

  // 1. Tổng quan giá trị kho
  const totalValue = items.reduce((acc, curr) => acc + (curr.stock * curr.price), 0);
  const totalStock = items.reduce((acc, curr) => acc + curr.stock, 0);
  
  // 2. Tỷ trọng VPP và Vệ sinh
  const categoryData = [
    { name: 'Văn Phòng Phẩm', value: items.filter(i => i.itemType === 'VPP').reduce((a,c)=>a+c.stock*c.price, 0) },
    { name: 'Đồ Vệ Sinh', value: items.filter(i => i.itemType === 'VE_SINH').reduce((a,c)=>a+c.stock*c.price, 0) }
  ];

  // 3. Phân bổ chi phí theo phòng ban (Chỉ tính các phiếu Đã duyệt / Hoàn tất)
  const approvedReqs = requests.filter(r => r.status === 'Đã duyệt' || r.status === 'Hoàn tất');
  
  const deptCostMap = new Map<string, number>();
  approvedReqs.forEach(req => {
     let reqCost = 0;
     req.items.forEach(it => {
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

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] p-4 md:p-8 bg-slate-50 relative overflow-y-auto w-full">
        <div className="flex justify-between items-center mb-8 shrink-0">
            <div>
               <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard Phân Tích (Analytics)</h2>
               <p className="text-slate-500 font-medium text-sm mt-1">Lãnh đạo Giám sát toàn cảnh sức khoẻ tồn kho và Phân bổ chi phí thời gian thực.</p>
            </div>
            <button onClick={handleExportExcel} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.03)] hover:bg-slate-50 transition flex items-center cursor-pointer">
                <Download className="w-5 h-5 mr-2 text-indigo-500"/> Xuất Excel Tổng Hợp
            </button>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 shrink-0">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/30 border border-indigo-400">
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-indigo-100 font-bold text-xs uppercase tracking-wider mb-2">Tổng Giá Trị Tồn Kho</p>
                     <h3 className="text-3xl font-black leading-none">{totalValue.toLocaleString('vi-VN')} đ</h3>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md"><DollarSign className="w-6 h-6"/></div>
               </div>
               <div className="mt-6 text-xs font-semibold bg-white/10 inline-flex px-3 py-1.5 rounded-lg border border-white/10">Real-time Data Update</div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Số lượng hàng tồn</p>
                     <h3 className="text-3xl font-black text-slate-800 leading-none">{totalStock} <span className="text-lg text-slate-400 font-medium ml-1">đơn vị</span></h3>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center"><Package className="w-6 h-6"/></div>
               </div>
               <div className="mt-6 text-xs font-bold text-emerald-600 flex items-center"><TrendingUp className="w-4 h-4 mr-1"/> Sẵn sàng cung ứng tốt</div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Đề xuất Chờ xử lý</p>
                     <h3 className="text-3xl font-black text-amber-500 leading-none">{requests.filter(r=>r.status==='Chờ duyệt').length} <span className="text-lg text-slate-400 font-medium ml-1">phiếu</span></h3>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center"><FileText className="w-6 h-6"/></div>
               </div>
               <div className="mt-6 text-xs font-bold text-amber-600 flex items-center">Cần phê duyệt ngay lập tức</div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
               <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-rose-600 font-bold text-xs uppercase tracking-wider mb-2">Mặt hàng Cạn kho</p>
                     <h3 className="text-3xl font-black text-rose-600 leading-none">{lowStockItems.length} <span className="text-lg text-rose-400 font-medium ml-1">mã</span></h3>
                  </div>
                  <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center"><AlertTriangle className="w-6 h-6"/></div>
               </div>
               <div className="mt-6 text-xs font-bold text-rose-600 flex items-center animate-pulse tracking-wide bg-rose-50 inline-block px-2 py-1 rounded">CẢNH BÁO ĐỨT GÃY CHUỖI CUNG ỨNG!</div>
            </div>
        </div>

        {/* Charts Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 mb-8">
            {/* Chi tiêu phòng ban Chart (Bar Chart) */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 lg:col-span-2 flex flex-col">
                <h3 className="font-extrabold text-slate-800 text-lg mb-6 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-3 text-indigo-500"/>
                    Chỉ số Chi Phí VPP Đã Duyệt Lũy Kế Theo Đơn Vị (VNĐ)
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
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col">
                <h3 className="font-extrabold text-slate-800 text-lg mb-6 text-center">Tỷ trọng Cơ cấu Kho (By Value)</h3>
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

        {/* Data Table: Mua sắm khẩn cấp */}
        <div className="bg-white rounded-3xl shadow-[0_0_20px_rgba(0,0,0,0.02)] border border-slate-200 p-0 overflow-hidden shrink-0">
            <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center relative overflow-hidden">
                <h3 className="font-extrabold text-slate-800 flex items-center text-lg z-10 relative">
                    <AlertTriangle className="w-5 h-5 mr-3 text-rose-500" />
                    Báo Cáo Khuyến Nghị: Nhập Mua Bổ Sung Khẩn Cấp
                </h3>
                <div className="z-10 relative bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg text-sm font-bold text-slate-500">Criteria: Tồn Kho &lt; 20</div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-extrabold text-slate-400">
                        <tr>
                            <th className="p-5 text-center">STT</th>
                            <th className="p-5">Mã Sản Phẩm VPP</th>
                            <th className="p-5">Tên Sản Phẩm / Vật Tư</th>
                            <th className="p-5 text-center">Khoảng Hạn Mức An Toàn</th>
                            <th className="p-5 text-center">Tồn Khả dụng</th>
                            <th className="p-5 text-center">Mức độ cảnh báo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50">
                        {lowStockItems.length === 0 && (
                            <tr><td colSpan={6} className="p-10 text-center text-slate-500 font-medium">✨ Mức kho tổng hiện tại cực kỳ an toàn. Chưa có sản phẩm nào chạm ngưỡng phải nhập mua.</td></tr>
                        )}
                        {lowStockItems.map((item, idx) => (
                            <tr key={item.mvpp} className="hover:bg-rose-50/20 transition-colors">
                                <td className="p-5 font-bold text-slate-400 text-center">{idx+1}</td>
                                <td className="p-5 font-bold text-slate-600">{item.mvpp}</td>
                                <td className="p-5 font-bold text-slate-800">{item.name}</td>
                                <td className="p-5 font-bold text-slate-400 text-center">&gt; {Math.min(20, item.quota)} đơn vị</td>
                                <td className="p-5 text-center">
                                    <span className={`px-4 py-1.5 bg-white font-black text-xl border-b-2 rounded ${item.stock===0?'text-rose-600 border-rose-500 shadow-sm':'text-amber-500 border-amber-400'}`}>{item.stock}</span>
                                </td>
                                <td className="p-5 text-xs font-bold text-center">
                                    {item.stock === 0 
                                        ? <span className="text-rose-600 bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center justify-center max-w-max mx-auto"><AlertTriangle className="w-3 h-3 mr-1"/> Đứt Gãy (Đỏ)</span>
                                        : <span className="text-amber-600 bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center justify-center max-w-max mx-auto">Sắp Hết Cần Mua</span>
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}
