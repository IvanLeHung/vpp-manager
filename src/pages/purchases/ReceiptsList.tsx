import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { 
  Search, Filter, Calendar, Package, 
  CheckCircle, Clock, XCircle, ChevronRight, AlertTriangle, PlusCircle
} from 'lucide-react';

interface ReceiptsListProps {
  onViewDetail: (id: string) => void;
}

const ReceiptsList: React.FC<ReceiptsListProps> = ({ onViewDetail }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/receipts');
      setData(res.data);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'PENDING': return <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 font-bold text-[10px] uppercase border border-amber-200">Chờ Kiểm Hàng</span>;
          case 'COMPLETED': return <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase border border-emerald-200">Đã Nhập Kho</span>;
          case 'DISCREPANCY': return <span className="px-2 py-1 rounded bg-rose-100 text-rose-700 font-bold text-[10px] uppercase border border-rose-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Lệch / Lỗi</span>;
          case 'CANCELLED': return <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 font-bold text-[10px] uppercase border border-slate-200 line-through">Đã Hủy</span>;
          default: return <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 font-bold text-[10px] uppercase">{status}</span>;
      }
  };

  const filteredData = data.filter(d => {
      const matchSearch = d.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (d.poId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (d.supplier || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchTab = true;
      if (activeTab === 'ALL') matchTab = true;
      else matchTab = d.status === activeTab;

      return matchSearch && matchTab;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
        <div className="p-6 md:p-8 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2 flex items-center"><Package className="w-8 h-8 mr-3 text-indigo-600"/> Phiếu Nhập Kho (GRN)</h1>
                    <p className="text-sm font-medium text-slate-500">Theo dõi tiếp nhận, kiểm đếm và lưu kho từ các đơn mua hàng (PO).</p>
                </div>
                <button 
                  onClick={() => {
                    const poId = window.prompt('Nhập Mã PO muốn tạo Phiếu Nhập:');
                    if (poId) {
                        api.post('/receipts/from_po', { poId })
                           .then(res => {
                               fetchData();
                               onViewDetail(res.data.id);
                           })
                           .catch(err => alert(err.response?.data?.error || 'Không thể tạo phiếu từ PO này'));
                    }
                  }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center transition active:scale-95"
                >
                    <PlusCircle className="w-5 h-5 mr-2" /> Tạo Phiếu Nhập
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition group" onClick={()=>setActiveTab('PENDING')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 text-amber-500 rounded-xl group-hover:scale-110 transition shrink-0"><Clock className="w-6 h-6"/></div>
                        <h3 className="text-3xl font-black text-slate-800">{data.filter(d => d.status === 'PENDING').length}</h3>
                    </div>
                    <p className="font-bold text-slate-500 text-sm">Chờ Kiểm Hàng / Nhập</p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition group" onClick={()=>setActiveTab('DISCREPANCY')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-rose-50 text-rose-500 rounded-xl group-hover:scale-110 transition shrink-0"><AlertTriangle className="w-6 h-6"/></div>
                        <h3 className="text-3xl font-black text-rose-600">{data.filter(d => d.status === 'DISCREPANCY').length}</h3>
                    </div>
                    <p className="font-bold text-slate-500 text-sm">Nhập Kho Có Lệch/Lỗi</p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition group" onClick={()=>setActiveTab('COMPLETED')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl group-hover:scale-110 transition shrink-0"><CheckCircle className="w-6 h-6"/></div>
                        <h3 className="text-3xl font-black text-slate-800">{data.filter(d => d.status === 'COMPLETED').length}</h3>
                    </div>
                    <p className="font-bold text-slate-500 text-sm">Đã Nhập Kho</p>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col px-6 md:px-8 pb-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        {[
                          { id: 'PENDING', label: 'Chờ Nhập' },
                          { id: 'DISCREPANCY', label: 'Báo Lệch / Lỗi' },
                          { id: 'COMPLETED', label: 'Đã Nhập Đủ' },
                          { id: 'ALL', label: 'Tất Cả Phiếu' }
                        ].map(t => (
                            <button 
                               key={t.id} 
                               onClick={() => setActiveTab(t.id)}
                               className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                        <div className="relative flex-1 md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                              type="text" placeholder="Tra cứu Phiếu Nhập / Mã PO..." 
                              value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto rounded-b-3xl relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4"></div>
                            <p className="text-sm font-bold text-slate-500">Đang tải Phiếu Nhập kho...</p>
                        </div>
                    )}
                    
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 sticky top-0 z-0">
                            <tr>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Mã Phiếu Nhập</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Chứng từ gốc (PO)</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 w-48">Nhà Cung Cấp</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center w-32">Trạng Thái</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 w-40">Ngày nhập</th>
                                <th className="p-4 border-b border-slate-100 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredData.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-slate-500">
                                        <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                        <p className="font-bold">Không tìm thấy Phiếu Nhập Kho nào</p>
                                    </td>
                                </tr>
                            )}
                            {filteredData.map(d => (
                                <tr key={d.id} onClick={() => onViewDetail(d.id)} className="hover:bg-indigo-50/30 cursor-pointer transition group">
                                    <td className="p-4 border-l-2 border-transparent group-hover:border-indigo-500">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-black shrink-0 border border-orange-100 shadow-sm">RC</div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm flex items-center gap-2">{d.id}</p>
                                                <p className="text-xs font-semibold text-slate-500 mt-0.5">{d.lineCount} Loại Hàng</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-xs font-black tracking-widest bg-slate-100 text-slate-600 px-2 py-1 rounded inline-block border border-slate-200">{d.poId || 'Nhập khác'}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-bold text-slate-700 text-sm max-w-[200px] truncate">{d.supplier || <span className="text-slate-400 italic">No supplier info</span>}</p>
                                    </td>
                                    <td className="p-4 text-center">
                                        {getStatusBadge(d.status)}
                                    </td>
                                    <td className="p-4">
                                        <p className="text-xs font-bold text-slate-600 flex items-center"><Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400"/> {new Date(d.createdAt).toLocaleDateString('vi-VN')}</p>
                                        {d.receiveDate && <p className="text-[10px] font-black text-emerald-600 flex items-center mt-1"><CheckCircle className="w-3 h-3 mr-1"/> Chốt: {new Date(d.receiveDate).toLocaleDateString('vi-VN')}</p>}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition ml-auto">
                                            <ChevronRight className="w-5 h-5"/>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ReceiptsList;

