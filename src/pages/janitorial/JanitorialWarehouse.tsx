import { useState, useEffect } from 'react';
import { Droplets } from 'lucide-react';
import api from '../../lib/api';
import { useAppContext } from '../../context/AppContext';

export default function JanitorialWarehouse() {
  const { currentUser } = useAppContext();
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [metrics, setMetrics] = useState<any>({ pending: 0, executedToday: 0 });

  const isEmployee = currentUser?.role === 'EMPLOYEE';
  const isAdmin = currentUser?.role === 'ADMIN';

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/stocks');
      // Filter for VE_SINH only
      const veSinhStocks = res.data.filter((s: any) => 
        s.item.itemType === 'VE_SINH' || s.item.category.toLowerCase().includes('vệ sinh')
      );
      setStocks(veSinhStocks);
    } catch (error) {
      console.error('Failed to fetch stocks', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/warehouse-tickets/summary/kpi?warehouseCode=VE_SINH');
      setMetrics(res.data);
    } catch (error) {
      console.error('Failed to fetch metrics', error);
    }
  };

  useEffect(() => {
    fetchStocks();
    fetchMetrics();
  }, []);

  const displayedStocks = stocks.filter(stock => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return stock.item.name.toLowerCase().includes(q) || stock.item.mvpp.toLowerCase().includes(q);
  });

  const formatCurrency = (val: number) => val.toLocaleString('vi-VN') + ' đ';

  // KPI Calculations
  const totalItems = displayedStocks.length;
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalValue = 0;

  displayedStocks.forEach(s => {
    if (s.quantityOnHand > 15) inStockCount++;
    else if (s.quantityOnHand > 0) lowStockCount++;
    else outOfStockCount++;
    totalValue += (s.quantityOnHand * Number(s.item.price));
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white px-8 pt-4 pb-4 border-b border-slate-200 shrink-0 sticky top-0 z-10 w-full shadow-sm">
        <h1 className="text-xl font-bold flex items-center text-emerald-700">
           <Droplets className="w-5 h-5 mr-3" /> Tồn kho Đồ vệ sinh hiện tại
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
               <p className="text-xs text-slate-500 font-bold uppercase">Tổng mặt hàng</p>
               <p className="text-2xl font-black text-slate-800 mt-1">{totalItems}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
               <p className="text-xs text-slate-500 font-bold uppercase">Sẵn sàng cấp</p>
               <p className="text-2xl font-black text-emerald-600 mt-1">{inStockCount}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
               <p className="text-xs text-slate-500 font-bold uppercase">Sắp hết</p>
               <p className="text-2xl font-black text-amber-500 mt-1">{lowStockCount}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 items-center justify-between">
               <p className="text-xs text-slate-500 font-bold uppercase">Hết hàng</p>
               <p className="text-2xl font-black text-rose-600 mt-1">{outOfStockCount}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
               <p className="text-xs text-slate-500 font-bold uppercase">Giá trị tồn</p>
               <p className="text-xl font-black text-blue-700 mt-1">{totalValue.toLocaleString('vi-VN')}đ</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-4 rounded-xl shadow-md text-white">
               <p className="text-xs text-indigo-100 font-bold uppercase">Phiếu chờ duyệt</p>
               <p className="text-2xl font-black mt-1">{metrics.pending}</p>
            </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
           <input 
             type="text" 
             placeholder="Tra cứu MVPP / tên đồ vệ sinh..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             className="w-full md:w-96 px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" 
           />
           {(!isEmployee) && (
              <button className="px-4 py-2 bg-white text-emerald-700 border border-emerald-300 rounded-xl font-bold hover:bg-emerald-50 whitespace-nowrap">
                Xuất Excel
              </button>
           )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Mã hàng</th>
                <th className="px-4 py-3">Tên hàng</th>
                <th className="px-4 py-3">Nhóm hàng</th>
                <th className="px-4 py-3">Quy cách/Dung tích</th>
                <th className="px-4 py-3">ĐVT</th>
                <th className="px-4 py-3 text-center">Tồn TT</th>
                <th className="px-4 py-3 text-center">Tạm giữ</th>
                <th className="px-4 py-3 text-center">Khả dụng</th>
                <th className="px-4 py-3 text-right">Đơn giá</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={11} className="p-8 text-center text-slate-400 font-bold animate-pulse">Đang tải dữ liệu...</td></tr>
              ) : displayedStocks.map(stock => {
                const item = stock.item;
                const quyCach = item.specification || item.volume || 'N/A';
                const khadung = stock.quantityOnHand - stock.quantityReserved;
                const isLow = khadung <= 15;
                
                return (
                  <tr key={stock.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-emerald-700">{item.mvpp}</td>
                    <td className="px-4 py-3 font-bold">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.category}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 font-medium">{quyCach}</td>
                    <td className="px-4 py-3 text-slate-500">{item.unit}</td>
                    <td className="px-4 py-3 text-center font-bold">{stock.quantityOnHand}</td>
                    <td className="px-4 py-3 text-center font-bold text-amber-500">{stock.quantityReserved}</td>
                    <td className="px-4 py-3 text-center">
                       <span className={`px-2 py-1 text-xs font-black rounded-lg ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                         {khadung}
                       </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 font-medium">{formatCurrency(Number(item.price))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isAdmin ? (
                        <div className="flex justify-center gap-2">
                           <button className="p-1 px-2 text-xs bg-emerald-50 text-emerald-700 font-bold rounded" title="Admin Tự nhập">Nhập trực tiếp</button>
                           <button className="p-1 px-2 text-xs bg-amber-50 text-amber-700 font-bold rounded">Điều chỉnh</button>
                        </div>
                      ) : (
                         <span className="text-xs text-slate-400">Tạo phiếu kho</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
