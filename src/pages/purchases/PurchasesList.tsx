import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { 
  Search, Plus, Calendar, DollarSign,
  ShoppingCart, Package, Clock, ChevronRight, Truck, RefreshCw
} from 'lucide-react';

interface PurchasesListProps {
  onCreateNew: () => void;
  onViewDetail: (id: string) => void;
}

const PurchasesList: React.FC<PurchasesListProps> = ({ onCreateNew, onViewDetail }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [procurementNeeds, setProcurementNeeds] = useState<any[]>([]);
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [submittingPR, setSubmittingPR] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'NEEDS') {
        const res = await api.get('/purchases/procurement-needs');
        setProcurementNeeds(res.data);
      } else {
        const res = await api.get('/purchases');
        setData(res.data);
      }
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleCreatePRFromNeeds = async () => {
    if (selectedNeeds.length === 0) return;
    setSubmittingPR(true);
    try {
      await api.post('/purchases/create-from-requests', {
        requestLineIds: selectedNeeds,
        title: `Tự động tạo từ ${selectedNeeds.length} nhu cầu Backorder`
      });
      alert('Đã tạo Đề nghị mua sắm (PR) thành công!');
      setSelectedNeeds([]);
      setActiveTab('PENDING');
    } catch (e) {
      console.error(e);
      alert('Lỗi khi tạo PR');
    }
    setSubmittingPR(false);
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'DRAFT': return <span className="px-2 py-1 rounded bg-slate-200 text-slate-600 font-bold text-[10px] uppercase">Nháp</span>;
          case 'PENDING_APPROVAL': return <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 font-bold text-[10px] uppercase border border-amber-200">Chờ Duyệt</span>;
          case 'APPROVED': return <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase border border-emerald-200">Đã Duyệt</span>;
          case 'ORDERED': return <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-700 font-bold text-[10px] uppercase border border-indigo-200">Đã Đặt Hàng</span>;
          case 'DELIVERING': 
          case 'PARTIALLY_DELIVERED': return <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 font-bold text-[10px] uppercase border border-blue-200">Đang Giao</span>;
          case 'COMPLETED': return <span className="px-2 py-1 rounded bg-teal-100 text-teal-700 font-bold text-[10px] uppercase border border-teal-200">Hoàn Tất</span>;
          case 'REJECTED':
          case 'CANCELLED': return <span className="px-2 py-1 rounded bg-rose-100 text-rose-700 font-bold text-[10px] uppercase border border-rose-200">Hủy / Từ chối</span>;
          default: return <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 font-bold text-[10px] uppercase">{status}</span>;
      }
  };

  const filteredData = data.filter(d => {
      const matchSearch = d.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (d.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (d.supplier || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchTab = true;
      if (activeTab === 'DRAFT') matchTab = d.status === 'DRAFT';
      if (activeTab === 'PENDING') matchTab = d.status === 'PENDING_APPROVAL';
      if (activeTab === 'APPROVED') matchTab = d.status === 'APPROVED';
      if (activeTab === 'ORDERED') matchTab = d.status === 'ORDERED';
      if (activeTab === 'DELIVERING') matchTab = ['DELIVERING', 'PARTIALLY_DELIVERED'].includes(d.status);
      if (activeTab === 'COMPLETED') matchTab = d.status === 'COMPLETED';

      return matchSearch && matchTab;
  });

  // KPI Cards logic
  const kpiPending = data.filter(d => d.status === 'PENDING_APPROVAL').length;
  const kpiOrdered = data.filter(d => d.status === 'ORDERED').length;
  const kpiDelivering = data.filter(d => ['DELIVERING', 'PARTIALLY_DELIVERED'].includes(d.status)).length;
  const totalAmount = data.filter(d => ['ORDERED', 'DELIVERING', 'PARTIALLY_DELIVERED', 'COMPLETED'].includes(d.status)).reduce((sum, d) => sum + Number(d.totalAmount||0), 0);

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
        {/* TOP KPI CARDS */}
        <div className="p-6 md:p-8 shrink-0">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-6">Quản lý Mua sắm (Purchasing)</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition group" onClick={()=>setActiveTab('PENDING')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 text-amber-500 rounded-xl group-hover:scale-110 transition shrink-0"><Clock className="w-6 h-6"/></div>
                        <h3 className="text-3xl font-black text-slate-800">{kpiPending}</h3>
                    </div>
                    <p className="font-bold text-slate-500 text-sm">Chờ Duyệt Mua</p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition group" onClick={()=>setActiveTab('ORDERED')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl group-hover:scale-110 transition shrink-0"><ShoppingCart className="w-6 h-6"/></div>
                        <h3 className="text-3xl font-black text-slate-800">{kpiOrdered}</h3>
                    </div>
                    <p className="font-bold text-slate-500 text-sm">Chờ NCC Xác Nhận</p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition group" onClick={()=>setActiveTab('DELIVERING')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 text-blue-500 rounded-xl group-hover:scale-110 transition shrink-0"><Truck className="w-6 h-6"/></div>
                        <h3 className="text-3xl font-black text-slate-800">{kpiDelivering}</h3>
                    </div>
                    <p className="font-bold text-slate-500 text-sm">Đang Giao Hàng</p>
                </div>

                <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-5 rounded-2xl shadow-lg shadow-teal-500/30 text-white relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-white/20 rounded-xl shrink-0"><DollarSign className="w-6 h-6"/></div>
                        <h3 className="text-2xl font-black">{totalAmount.toLocaleString('vi-VN')}đ</h3>
                    </div>
                    <p className="font-bold text-teal-50 text-sm relative z-10">Tổng chi Mua Sắm / Đặt hàng</p>
                </div>
            </div>
        </div>

        {/* MAIN LIST SECTION */}
        <div className="flex-1 overflow-hidden flex flex-col px-6 md:px-8 pb-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                
                {/* TOOLBAR */}
                <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        {[
                          { id: 'ALL', label: 'Tất Cả' },
                          { id: 'DRAFT', label: 'Nháp' },
                          { id: 'PENDING', label: 'Chờ Duyệt' },
                          { id: 'APPROVED', label: 'Đã Duyệt (Chờ Đặt)' },
                          { id: 'ORDERED', label: 'Đã Đặt (Chờ Giao)' },
                          { id: 'DELIVERING', label: 'Đang Giao' },
                          { id: 'COMPLETED', label: 'Hoàn Tất' },
                          { id: 'NEEDS', label: 'Nhu Cầu Mua Sắm' }
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
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                              type="text" placeholder="Tìm PO, NCC, hoặc tiêu đề..." 
                              value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition"
                            />
                        </div>
                        {activeTab === 'NEEDS' ? (
                            <button 
                                onClick={handleCreatePRFromNeeds}
                                disabled={selectedNeeds.length === 0 || submittingPR}
                                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold transition flex items-center shadow-lg shadow-amber-500/30 whitespace-nowrap"
                            >
                                {submittingPR ? <RefreshCw className="w-4 h-4 mr-2 animate-spin"/> : <ShoppingCart className="w-4 h-4 mr-2" />}
                                Tạo Đề Nghị ({selectedNeeds.length})
                            </button>
                        ) : (
                            <button onClick={onCreateNew} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition flex items-center shadow-lg shadow-indigo-500/30 whitespace-nowrap">
                                <Plus className="w-4 h-4 mr-2" /> Tạo Đề Nghị
                            </button>
                        )}
                    </div>
                </div>

                {/* TABLE */}
                <div className="flex-1 overflow-auto rounded-b-3xl relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4"></div>
                            <p className="text-sm font-bold text-slate-500">Đang tải Đơn mua sắm...</p>
                        </div>
                    )}
                    
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 sticky top-0 z-0">
                            <tr>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Mã Đơn / Tiêu đề</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 w-48">Nhà Cung Cấp</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right w-32">Tổng Tiền</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center w-32">Trạng Thái</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 w-40">Timeline</th>
                                <th className="p-4 border-b border-slate-100 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {(activeTab === 'NEEDS' ? procurementNeeds : filteredData).length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-slate-500">
                                        <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                        <p className="font-bold">Không tìm thấy {activeTab === 'NEEDS' ? 'nhu cầu' : 'Đơn mua sắm'} nào</p>
                                    </td>
                                </tr>
                            )}
                            {activeTab === 'NEEDS' ? (
                                procurementNeeds.map(n => (
                                    <tr key={n.id} className="hover:bg-amber-50/30 transition group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <input 
                                                   type="checkbox" 
                                                   checked={selectedNeeds.includes(n.id)}
                                                   onChange={() => {
                                                       if (selectedNeeds.includes(n.id)) setSelectedNeeds(selectedNeeds.filter(id => id !== n.id));
                                                       else setSelectedNeeds([...selectedNeeds, n.id]);
                                                   }}
                                                   className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                                />
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{n.item.name}</p>
                                                    <p className="text-xs font-semibold text-slate-500">{n.item.mvpp}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-xs font-bold text-slate-700">{n.request.department}</p>
                                            <p className="text-[10px] text-slate-500">{n.request.requester.fullName} • {n.request.id}</p>
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className="font-black text-slate-800 text-sm">{n.qtyRequested - (n.qtyDelivered || 0)} {n.item.unit}</p>
                                            <p className="text-[10px] text-slate-400">Cần mua thêm</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded font-bold text-[10px] uppercase border ${n.status === 'BACKORDER' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                               {n.status === 'BACKORDER' ? 'Hết hàng' : 'Đang xử lý'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-[10px] font-bold text-slate-500 italic">Chưa có PO</p>
                                        </td>
                                        <td className="p-4"></td>
                                    </tr>
                                ))
                            ) : filteredData.map(d => (
                                <tr key={d.id} onClick={() => onViewDetail(d.id)} className="hover:bg-indigo-50/30 cursor-pointer transition group">
                                    <td className="p-4 border-l-2 border-transparent group-hover:border-indigo-500">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black shrink-0 border border-indigo-100 shadow-sm">{d.type}</div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm flex items-center gap-2">{d.id}</p>
                                                <p className="text-xs font-semibold text-slate-500 mt-0.5 max-w-[200px] truncate">{d.title || 'Mua sắm VPP'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-bold text-slate-700 text-sm max-w-[200px] truncate">{d.supplier || <span className="text-slate-400 italic font-medium">Chưa xác định</span>}</p>
                                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-0.5">{d.lineCount} Mặt hàng</p>
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="font-black text-indigo-700 text-sm">{Number(d.totalAmount).toLocaleString('vi-VN')} đ</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        {getStatusBadge(d.status)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <p className="text-xs font-bold text-slate-600 flex items-center justify-center"><Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400"/> {new Date(d.createdAt).toLocaleDateString('vi-VN')}</p>
                                        {d.expectedDate && <p className="text-[10px] font-black text-amber-600 flex items-center justify-center mt-1"><Truck className="w-3 h-3 mr-1"/> GD: {new Date(d.expectedDate).toLocaleDateString('vi-VN')}</p>}
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

export default PurchasesList;

