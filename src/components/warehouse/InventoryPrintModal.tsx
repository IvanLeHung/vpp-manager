import React, { useState } from 'react';
import { X, Printer, Loader2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import api from '../../lib/api';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  stocks: any[];
};

export default function InventoryPrintModal({ isOpen, onClose, stocks }: Props) {
  const { addToast } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    onlyInStock: true,
    includeReserved: true,
    showPrice: true,
  });

  if (!isOpen) return null;

  const handlePrint = async () => {
    setLoading(true);
    let filtered = stocks;
    if (config.onlyInStock) {
       filtered = filtered.filter(s => s.quantityOnHand > 0);
    }
    
    const lines = filtered.map(s => ({
       itemId: s.itemId,
       uom: s.item.unit,
       qty: s.quantityOnHand,
       unitPrice: s.item.price,
       totalAmount: s.quantityOnHand * (s.item.price || 0),
       reason: JSON.stringify({ reserved: s.quantityReserved, available: s.quantityOnHand - s.quantityReserved }),
    }));

    try {
      const res = await api.post('/warehouse-tickets', {
        ticketType: 'INVENTORY_REPORT',
        warehouseCode: 'VE_SINH',
        itemGroup: 'VE_SINH',
        status: 'EXECUTED',
        lines,
        reason: 'Báo cáo tồn kho tại thời điểm',
        metadata: {
          totalItems: filtered.length,
          totalValue: config.showPrice ? filtered.reduce((a, b) => a + b.quantityOnHand * (b.item.price || 0), 0) : 0,
          onlyInStock: config.onlyInStock,
          includeReserved: config.includeReserved,
          showPrice: config.showPrice,
        }
      });
      window.open(`/warehouse-tickets/${res.data.id}?autoprint=true`, '_blank');
      onClose();
    } catch (e) {
      addToast('Lỗi tạo phiếu tồn', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-3 uppercase tracking-tight">
             <Printer className="w-5 h-5 text-indigo-500" /> Tùy chọn In phiếu tồn
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 space-y-4">
           <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 transition-colors">
              <input type="checkbox" checked={config.onlyInStock} onChange={e => setConfig({...config, onlyInStock: e.target.checked})} className="w-5 h-5 accent-indigo-600 rounded" />
              <span className="font-bold text-slate-700">Chỉ in hàng còn tồn kho</span>
           </label>
           <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 transition-colors">
              <input type="checkbox" checked={config.includeReserved} onChange={e => setConfig({...config, includeReserved: e.target.checked})} className="w-5 h-5 accent-indigo-600 rounded" />
              <span className="font-bold text-slate-700">Bao gồm cột Tạm giữ / Khả dụng</span>
           </label>
           <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 transition-colors">
              <input type="checkbox" checked={config.showPrice} onChange={e => setConfig({...config, showPrice: e.target.checked})} className="w-5 h-5 accent-indigo-600 rounded" />
              <div className="flex flex-col">
                 <span className="font-bold text-slate-700">Hiển thị Đơn giá và Giá trị tồn</span>
                 <span className="text-xs font-medium text-slate-500 mt-0.5">Dành cho báo cáo tài chính</span>
              </div>
           </label>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">Hủy</button>
          <button onClick={handlePrint} disabled={loading} className="px-6 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />} In Phiếu Tồn
          </button>
        </div>
      </div>
    </div>
  );
}
