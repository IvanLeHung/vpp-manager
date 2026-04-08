import { useState, useEffect } from 'react';
import { Droplets } from 'lucide-react';
import api from '../../lib/api';
import { useAppContext } from '../../context/AppContext';
import { X, Save, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function JanitorialWarehouse() {
  const { currentUser } = useAppContext();
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [metrics, setMetrics] = useState<any>({ pending: 0, executedToday: 0 });
  
  // Modal states
  const [showModal, setShowModal] = useState<'RECEIVE' | 'ADJUSTMENT' | null>(null);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [modalForm, setModalForm] = useState({ qty: 0, reason: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const isEmployee = currentUser?.role === 'EMPLOYEE';
  const isAdmin = currentUser?.role === 'ADMIN';

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/janitorial/stocks');
      setStocks(res.data);
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

  const handleActionSubmit = async () => {
    if (!selectedStock || !showModal) return;
    try {
      setSubmitting(true);
      const payload = {
        ticketType: showModal,
        warehouseCode: 'VE_SINH',
        reason: modalForm.reason,
        note: modalForm.note,
        lines: [
          {
            itemId: selectedStock.itemId,
            qty: modalForm.qty
          }
        ]
      };

      await api.post('/warehouse-tickets', payload);
      
      setToast({ type: 'success', message: 'Thực hiện thao tác kho thành công!' });
      setShowModal(null);
      fetchStocks();
      fetchMetrics();
    } catch (error: any) {
      console.error('Action failed', error);
      setToast({ type: 'error', message: error.response?.data?.error || 'Thao tác thất bại. Vui lòng thử lại.' });
    } finally {
      setSubmitting(false);
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
                           <button 
                             onClick={() => {
                               setSelectedStock(stock);
                               setShowModal('RECEIVE');
                               setModalForm({ qty: 0, reason: 'Nhập hàng trực tiếp (Admin)', note: '' });
                             }}
                             className="p-1 px-2 text-xs bg-emerald-50 text-emerald-700 font-bold rounded hover:bg-emerald-100 transition-colors" 
                             title="Admin Tự nhập"
                           >
                             Nhập trực tiếp
                           </button>
                           <button 
                             onClick={() => {
                               setSelectedStock(stock);
                               setShowModal('ADJUSTMENT');
                               setModalForm({ qty: 0, reason: 'Điều chỉnh số lượng bàn giao/kiểm kê', note: '' });
                             }}
                             className="p-1 px-2 text-xs bg-amber-50 text-amber-700 font-bold rounded hover:bg-amber-100 transition-colors"
                           >
                             Điều chỉnh
                           </button>
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

      {showModal && (
        <ActionModal 
          type={showModal}
          stock={selectedStock}
          form={modalForm}
          setForm={setModalForm}
          submitting={submitting}
          onClose={() => setShowModal(null)}
          onSubmit={handleActionSubmit}
        />
      )}

      {toast && (
        <Toast 
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Modal Component
// ──────────────────────────────────────────────────────────────────────────────
function ActionModal({ type, stock, form, setForm, onClose, onSubmit, submitting }: any) {
  if (!stock) return null;
  const isReceive = type === 'RECEIVE';
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
        <div className={`p-6 flex justify-between items-center ${isReceive ? 'bg-emerald-600' : 'bg-amber-500'} text-white`}>
          <h3 className="text-lg font-black uppercase tracking-tight">
            {isReceive ? 'Nhập hàng trực tiếp' : 'Điều chỉnh tồn kho'}
          </h3>
          <button onClick={onClose} className="hover:rotate-90 transition-transform duration-300">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-dotted border-slate-300">
            <p className="text-xs font-bold text-slate-400 uppercase">Sản phẩm</p>
            <p className="font-bold text-slate-800 text-lg mt-1">{stock.item.name}</p>
            <p className="text-sm text-slate-500">{stock.item.mvpp} • Tồn hiện tại: <span className="font-black">{stock.quantityOnHand}</span></p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Số lượng {isReceive ? 'nhập' : 'điều chỉnh (+/-)'}</label>
              <div className="relative">
                <input 
                  type="number"
                  value={form.qty}
                  onChange={e => setForm({ ...form, qty: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-500 outline-none text-xl font-black transition-all"
                  placeholder="0"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold uppercase text-xs">
                  {stock.item.unit}
                </div>
              </div>
              {!isReceive && <p className="text-[10px] text-amber-600 mt-2 font-medium italic">Sử dụng dấu (-) để giảm tồn kho (ví dụ: -5)</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lý do thực hiện</label>
              <input 
                type="text"
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-500 outline-none font-medium transition-all"
                placeholder="Nhập lý do..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ghi chú (Tùy chọn)</label>
              <textarea 
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-500 outline-none font-medium transition-all min-h-[80px]"
                placeholder="Thêm thông tin chi tiết..."
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 flex gap-4 border-t border-slate-200">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-white text-slate-600 font-bold rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all uppercase text-xs tracking-widest"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={onSubmit}
            disabled={submitting || !form.qty || !form.reason}
            className={`flex-[2] py-3 ${isReceive ? 'bg-emerald-600' : 'bg-amber-500'} text-white font-bold rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:opacity-50 disabled:pointer-events-none`}
          >
            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ type, message, onClose }: any) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${
      type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
    } text-white`}>
      {type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
      <span className="font-bold">{message}</span>
    </div>
  );
}
