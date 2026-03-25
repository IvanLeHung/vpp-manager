import React, { useState, useEffect } from 'react';
import { Package, Search, Download, Droplets, LayoutDashboard, FileText, ArrowDownToLine, Settings2, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/api';

const TAX_RATE = 0.08;

export default function Dashboard() {
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const addToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({message: msg, type}); setTimeout(() => setToast(null), 3000); };
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentInventoryTab, setCurrentInventoryTab] = useState('VPP'); // 'VPP' | 'VE_SINH'
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'RECEIVE' | 'ADJUST'>('RECEIVE');
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [qtyInput, setQtyInput] = useState<number | ''>('');
  const [reasonInput, setReasonInput] = useState('');

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/stocks');
      setStocks(res.data);
    } catch (error) {
      console.error('Failed to fetch stocks', error);
      addToast?.('Không thể tải dữ liệu kho.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const displayedStocks = stocks.filter(stock => {
    const item = stock.item;
    const isVS = item.category.toLowerCase().includes('vệ sinh') || item.category.toLowerCase().includes('hóa phẩm') || item.itemType === 'VE_SINH' || item.itemType === 'VS';
    const matchesTab = currentInventoryTab === 'VPP' ? !isVS : isVS;
    if (!matchesTab) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.mvpp.toLowerCase().includes(q);
    }
    return true;
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN') + ' đ';
  };

  const handleExport = () => {
    const exportData = displayedStocks.map((stock, index) => {
      const item = stock.item;
      const price = Number(item.price);
      const giaVAT = Math.round(price + (price * TAX_RATE));
      return {
        'STT': index + 1,
        'MVPP': item.mvpp,
        'SP': item.name,
        'Nhóm': item.category,
        'ĐVT': item.unit,
        'Tồn kho (TT)': stock.quantityOnHand,
        'Giá': price,
        'Thuế': '8%',
        'Giá VAT': giaVAT
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [ { wch: 5 }, { wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 } ];
    const workbook = XLSX.utils.book_new();
    const sheetName = currentInventoryTab === 'VPP' ? 'TonKho_VPP' : 'TonKho_Ve_Sinh';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${sheetName}.xlsx`);
  };

  const openModal = (mode: 'RECEIVE' | 'ADJUST', stockItem: any) => {
    setModalMode(mode);
    setSelectedStock(stockItem);
    setQtyInput(mode === 'ADJUST' ? stockItem.quantityOnHand : '');
    setReasonInput('');
    setShowModal(true);
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qtyInput === '' || Number(qtyInput) < 0) {
      addToast?.('Số lượng không hợp lệ', 'error');
      return;
    }

    try {
      if (modalMode === 'RECEIVE') {
        if (!reasonInput) {
           addToast?.('Lý do/Nguồn gốc nhập là bắt buộc', 'error');
           return;
        }
        await api.post('/inventory/receive', {
          itemId: selectedStock.item.id,
          qty: Number(qtyInput),
          reason: reasonInput,
          refType: 'TRUC_TIEP'
        });
        addToast?.('Nhập kho thành công!');
      } else {
        if (!reasonInput) {
           addToast?.('Vui lòng giải trình lý do điều chỉnh', 'error');
           return;
        }
        await api.post('/inventory/adjust', {
          itemId: selectedStock.item.id,
          newQty: Number(qtyInput),
          reason: reasonInput
        });
        addToast?.('Điều chỉnh kho thành công!');
      }
      setShowModal(false);
      fetchStocks(); // reload stock limits
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Lỗi hệ thống';
      addToast(`Thao tác thất bại: ${msg}`, 'error');
      console.error('adjust stock error:', err?.response?.data || err);
    }
  };

  const totalStockTypes = displayedStocks.length;
  let totalPhysicalItems = 0;
  let inStockTypes = 0;
  let outOfStockOrLow = 0;

  displayedStocks.forEach(s => {
     totalPhysicalItems += s.quantityOnHand;
     if (s.quantityOnHand > 15) inStockTypes++;
     else outOfStockOrLow++;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl text-white font-bold shadow-2xl z-50 ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'} animate-fade-in`}>
          {toast.message}
        </div>
      )}
      {/* Tabs Group Local to Dashboard */}
      <div className="bg-white px-8 pt-4 flex gap-8 border-b border-slate-200 shrink-0 sticky top-0 z-10 w-full shadow-sm">
          <button 
            onClick={() => setCurrentInventoryTab('VPP')}
            className={`pb-4 flex items-center font-bold text-sm transition-colors relative cursor-pointer ${currentInventoryTab === 'VPP' ? 'text-blue-700' : 'text-slate-400 hover:text-slate-700'}`}>
            <Package className="w-4 h-4 mr-2"/> Quản lý Tồn kho VPP
            {currentInventoryTab === 'VPP' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full shadow-[0_-2px_8px_rgba(37,99,235,0.4)]"></div>}
          </button>
          <button 
            onClick={() => setCurrentInventoryTab('VE_SINH')}
            className={`pb-4 flex items-center font-bold text-sm transition-colors relative cursor-pointer ${currentInventoryTab === 'VE_SINH' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'}`}>
            <Droplets className="w-4 h-4 mr-2"/> Quản lý Tồn kho Tạp hóa / Vệ sinh
            {currentInventoryTab === 'VE_SINH' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full shadow-[0_-2px_8px_rgba(16,185,129,0.4)]"></div>}
          </button>
      </div>

      {/* Internal Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 shadow-inner ${currentInventoryTab === 'VPP' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  <Package className="w-6 h-6"/>
              </div>
              <div>
                  <p className="text-sm text-slate-500 font-medium">Tổng đầu mục SP / TS Lượng Tồn</p>
                  <p className="text-3xl font-bold text-slate-800">{totalStockTypes} <span className="text-sm text-slate-400 font-normal">/ {totalPhysicalItems} món</span></p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 shadow-inner ${currentInventoryTab === 'VPP' ? 'bg-indigo-100 text-indigo-600' : 'bg-teal-100 text-teal-600'}`}>
                  <LayoutDashboard className="w-6 h-6"/>
              </div>
              <div>
                  <p className="text-sm text-slate-500 font-medium">Sẵn sàng cấp phát (&gt;15)</p>
                  <p className="text-3xl font-bold text-slate-800">{inStockTypes}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 shadow-inner ${currentInventoryTab === 'VPP' ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'}`}>
                  <FileText className="w-6 h-6"/>
              </div>
              <div>
                  <p className="text-sm text-slate-500 font-medium">Cảnh báo tồn kho (&le;15)</p>
                  <p className="text-3xl font-bold text-rose-600">{outOfStockOrLow}</p>
              </div>
            </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 sticky top-0 bg-slate-50 py-2 z-10 w-full">
          <div className="relative w-full xl:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Tra cứu VPP theo mã / Tên...`}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition-all"
            />
          </div>
          <div className="flex gap-2 w-full xl:w-auto flex-wrap">
            <button 
              onClick={handleExport}
              className="flex items-center justify-center px-4 py-2 bg-white border border-emerald-300 text-emerald-700 hover:text-emerald-800 rounded-xl hover:bg-emerald-50 max-sm:w-full border-2 transition-all shadow-sm font-semibold cursor-pointer">
              <Download className="w-4 h-4 mr-2" /> Trích xuất Kho hiện tại
            </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="bg-white rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.02)] border border-slate-100 overflow-x-auto relative z-0">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="px-5 py-4">MVPP</th>
                <th className="px-6 py-4">SP (Sản Phẩm)</th>
                <th className="px-5 py-4">Nhóm</th>
                <th className="px-4 py-4">ĐVT</th>
                <th className="px-4 py-4 text-center">Tồn kho TT</th>
                <th className="px-4 py-4 text-center">Tạm giữ</th>
                <th className="px-4 py-4 text-right">Đơn giá</th>
                <th className="px-5 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan={8} className="p-8 text-center text-slate-400 font-bold animate-pulse">Đang nạp dữ liệu từ kho...</td></tr>
              ) : displayedStocks.length > 0 ? displayedStocks.map((stock) => {
                const item = stock.item;
                const isLow = stock.quantityOnHand <= 15;
                return (
                  <tr key={stock.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className={`px-5 py-4 font-bold ${currentInventoryTab === 'VPP' ? 'text-blue-700' : 'text-emerald-700'}`}>{item.mvpp}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                    <td className="px-5 py-4 text-slate-600 text-sm font-medium">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">{item.category}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-500 font-medium">{item.unit}</td>
                    <td className="px-4 py-4 text-center">
                        <span className={`px-3 py-1 text-sm font-black rounded-full ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {stock.quantityOnHand}
                        </span>
                    </td>
                    <td className="px-4 py-4 text-center text-amber-500 font-bold">{stock.quantityReserved}</td>
                    <td className="px-4 py-4 text-right text-slate-500 font-medium">{formatCurrency(Number(item.price))}</td>
                    <td className="px-5 py-4 text-center space-x-2">
                      <button 
                        onClick={() => openModal('RECEIVE', stock)}
                        className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg transition-colors font-bold text-xs" title="Ghi sổ Biên bản nhập kho">
                         <ArrowDownToLine className="w-4 h-4 inline mr-1" /> Nhập kho
                      </button>
                      <button 
                        onClick={() => openModal('ADJUST', stock)}
                        className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white rounded-lg transition-colors font-bold text-xs" title="Ghi sổ kiểm kê kho">
                         <Settings2 className="w-4 h-4 inline mr-1" /> Điều chỉnh
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-3">
                        {currentInventoryTab === 'VPP' ? <Package className="w-16 h-16 opacity-30" /> : <Droplets className="w-16 h-16 opacity-30" />}
                        <span>Kho trống, không tìm thấy vật tư.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className={`text-lg font-bold flex items-center ${modalMode === 'RECEIVE' ? 'text-blue-700' : 'text-amber-600'}`}>
                {modalMode === 'RECEIVE' ? <ArrowDownToLine className="w-5 h-5 mr-2" /> : <Settings2 className="w-5 h-5 mr-2" />}
                {modalMode === 'RECEIVE' ? 'Phiếu Nhập Kho' : 'Kiểm Kê Kho'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmitModal} className="p-6">
              <div className="mb-4">
                 <p className="text-xs font-bold text-slate-400 uppercase">Mặt Hàng</p>
                 <p className="font-bold text-slate-800 text-base">{selectedStock.item.name} ({selectedStock.item.mvpp})</p>
                 <p className="text-sm text-slate-500 mt-1">Tồn hiện tại: <span className="font-bold text-emerald-600">{selectedStock.quantityOnHand}</span> {selectedStock.item.unit}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-1">
                   {modalMode === 'RECEIVE' ? 'Số lượng NHẬP THÊM *' : 'SỐ LƯỢNG THỰC TẾ tại kho *'}
                </label>
                <input 
                  type="number" 
                  autoFocus
                  required
                  min={0}
                  step={1}
                  value={qtyInput} 
                  onChange={e => setQtyInput(e.target.value ? Number(e.target.value) : '')} 
                  className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-bold text-xl text-center" 
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-1">
                   {modalMode === 'RECEIVE' ? 'Nguồn gốc/Lý do nhập *' : 'Biên bản/Lý do thay đổi *'}
                </label>
                <input 
                  type="text" 
                  required
                  value={reasonInput} 
                  onChange={e => setReasonInput(e.target.value)} 
                  placeholder={modalMode === 'RECEIVE' ? 'Ví dụ: NCC chuyển hàng T5...' : 'Ví dụ: Hư hỏng, mất mát, kiểm kê thừa...'}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                />
              </div>

              <div className="flex gap-3">
                 <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Hủy</button>
                 <button type="submit" className={`flex-1 py-3 font-bold text-white rounded-xl transition shadow-md ${modalMode === 'RECEIVE' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                    Lưu sổ kho
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
