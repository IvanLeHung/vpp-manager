import { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  History, 
  Calendar,
  Package,
  ArrowRight
} from 'lucide-react';
import api from '../lib/api';

export default function AllocationHistory() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        // In real app, we might have a specific endpoint for this
        // For now, let's fetch completed requests
        const res = await api.get('/requests?status=COMPLETED');
        setData(res.data);
      } catch (error) {
        console.error('Failed to fetch allocation history', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredData = data.filter(item => {
    const matchesSearch = item.mvpp?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.items?.some((i: any) => i.item?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filter === 'ALL') return matchesSearch;
    // Add more filters if needed
    return matchesSearch;
  });

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic flex items-center gap-3">
            <History className="w-8 h-8 text-indigo-600" /> Lịch sử cấp phát
          </h1>
          <p className="text-slate-500 font-bold mt-1">Xem các vật tư đã được cấp phát cho bạn hoặc phòng ban của bạn.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
          <Download className="w-4 h-4" /> Xuất báo cáo (Excel)
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
           <input 
             type="text" 
             placeholder="Tìm mã phiếu / tên mặt hàng..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all font-bold placeholder:text-slate-300"
           />
        </div>
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
           <FilterBtn active={filter === 'ALL'} label="Tất cả" onClick={() => setFilter('ALL')} />
           <FilterBtn active={filter === 'MONTH'} label="Tháng này" onClick={() => setFilter('MONTH')} />
           <FilterBtn active={filter === 'VPP'} label="VPP" onClick={() => setFilter('VPP')} />
           <FilterBtn active={filter === 'VESINH'} label="Đồ vệ sinh" onClick={() => setFilter('VESINH')} />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative z-0">
        {loading ? (
          <div className="py-40 text-center">
             <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
             <p className="text-slate-400 font-black uppercase tracking-widest italic">Đang tải lịch sử...</p>
          </div>
        ) : filteredData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] italic">
                  <th className="px-10 py-6">Ngày cấp</th>
                  <th className="px-10 py-6">Mã phiếu</th>
                  <th className="px-10 py-6">Mặt hàng</th>
                  <th className="px-10 py-6 text-center">Số lượng</th>
                  <th className="px-10 py-6">Người bàn giao</th>
                  <th className="px-10 py-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-10 py-6">
                       <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
                          <Calendar className="w-3 h-3" /> {new Date(req.updatedAt).toLocaleDateString('vi-VN')}
                       </div>
                    </td>
                    <td className="px-10 py-6">
                       <span className="font-black text-indigo-600 uppercase tracking-tighter">#{req.id.substring(0,8).toUpperCase()}</span>
                    </td>
                    <td className="px-10 py-6">
                       <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">
                            {req.items?.[0]?.item?.name || 'Vật tư tổng hợp'}
                            {req.items?.length > 1 && <span className="text-indigo-600 ml-1">+{req.items.length - 1}</span>}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 italic uppercase">
                            {req.requestType === 'STATIONERY' ? 'Văn phòng phẩm' : 'Đồ vệ sinh'}
                          </span>
                       </div>
                    </td>
                    <td className="px-10 py-6 text-center">
                       <span className="px-4 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-black text-sm">
                          {req.items?.[0]?.quantity || 0} {req.items?.[0]?.item?.unit}
                       </span>
                    </td>
                    <td className="px-10 py-6">
                       <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-600 font-black">AD</div>
                          <span className="text-xs font-bold text-slate-700">Admin / Kho</span>
                       </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                       <button className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                          <ArrowRight className="w-5 h-5" />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-32 text-center">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-slate-200" />
             </div>
             <h3 className="text-lg font-black text-slate-400 uppercase tracking-tight">Chưa có lịch sử cấp phát</h3>
             <p className="text-sm font-bold text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">Khi yêu cầu của bạn được cấp phát hoàn tất, dữ liệu sẽ hiển thị tại đây.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterBtn({ active, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}
    >
      {label}
    </button>
  );
}
