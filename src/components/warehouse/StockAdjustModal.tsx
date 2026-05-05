import { useState, useEffect } from 'react';
import { X, Scale, AlertTriangle, Calendar, Loader2 } from 'lucide-react';
import api from '../../lib/api';

type AdjustStockModalProps = {
  isOpen: boolean;
  onClose: () => void;
  stock: any;
  onSuccess: () => void;
};

export function StockAdjustModal({ isOpen, onClose, stock, onSuccess }: AdjustStockModalProps) {
  const [actualQty, setActualQty] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [adjType, setAdjType] = useState('KIEM_KE_THIEU');
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && stock) {
      setActualQty(stock.quantityOnHand);
      setReason('');
      setShowConfirm(false);
    }
  }, [isOpen, stock]);

  if (!isOpen || !stock) return null;

  const currentQty = stock.quantityOnHand;
  const diff = typeof actualQty === 'number' ? actualQty - currentQty : 0;
  const diffValue = diff * Number(stock.item.price);

  const ADJUSTMENT_TYPES = [
    { id: 'KIEM_KE_THUA', label: 'Kiểm kê thừa' },
    { id: 'KIEM_KE_THIEU', label: 'Kiểm kê thiếu' },
    { id: 'HU_HONG', label: 'Hư hỏng / Hết hạn' },
    { id: 'MAT_MAT', label: 'Mất mát' },
    { id: 'SAI_SO_LIEU', label: 'Sai số liệu nhập/xuất' },
    { id: 'DOI_DVT', label: 'Thay đổi đơn vị tính' },
    { id: 'TON_DAU_KY', label: 'Khởi tạo tồn đầu kỳ' },
    { id: 'KHAC', label: 'Khác (Ghi chú)' },
  ];

  const handleAdjust = async () => {
    if (actualQty === '' || actualQty < 0) return alert('Vui lòng nhập tồn thực tế hợp lệ');
    if (diff === 0) return alert('Số tồn thực tế bằng số tồn hệ thống. Không cần điều chỉnh.');
    if (!reason.trim()) return alert('Vui lòng nhập lý do điều chỉnh');

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      setLoading(true);
      await api.post('/warehouse-tickets', {
        ticketType: 'ADJUSTMENT',
        reason: `[${adjType}] ${reason}`,
        warehouseCode: stock.warehouseCode || 'MAIN',
        ticketDate: auditDate,
        lines: [{ 
          itemId: stock.item.id, 
          qty: diff, // Signed difference
        }]
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('Lỗi: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-600 shadow-lg shadow-amber-100">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Điều chỉnh tồn kho</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Cập nhật sau kiểm kê hoặc sai sót</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 relative overflow-hidden group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Mặt hàng đang điều chỉnh</p>
                <h3 className="text-lg font-black text-slate-800 leading-tight">{stock.item.name}</h3>
                <p className="text-xs font-bold text-indigo-500 mt-1 uppercase tracking-wider">{stock.item.mvpp} • {stock.item.category} • {stock.item.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Giá tham chiếu</p>
                <p className="text-lg font-black text-slate-600">{new Intl.NumberFormat('vi-VN').format(Number(stock.item.price))}đ</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 text-center shadow-sm">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Tồn hệ thống</p>
                  <p className="text-3xl font-black text-slate-700">{currentQty}</p>
                  <p className="text-[10px] font-bold text-slate-400">{stock.item.unit}</p>
                </div>
                <div className="bg-indigo-50 p-5 rounded-3xl border-2 border-indigo-200 text-center shadow-sm ring-4 ring-indigo-500/5">
                  <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest mb-2">Tồn thực tế *</p>
                  <input 
                    type="number"
                    value={actualQty}
                    onChange={e => setActualQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-transparent text-3xl font-black text-indigo-700 text-center outline-none"
                    autoFocus
                  />
                  <p className="text-[10px] font-bold text-indigo-400">{stock.item.unit}</p>
                </div>
              </div>

              <div className={`p-5 rounded-3xl border-2 flex items-center justify-between transition-all ${diff > 0 ? 'bg-emerald-50 border-emerald-200 shadow-emerald-50' : diff < 0 ? 'bg-rose-50 border-rose-200 shadow-rose-50' : 'bg-slate-50 border-slate-100'}`}>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>Chênh lệch</p>
                  <p className={`text-2xl font-black ${diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                    {diff > 0 ? `+${diff}` : diff}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>Giá trị lệch</p>
                  <p className={`text-xl font-black ${diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                    {new Intl.NumberFormat('vi-VN').format(Math.abs(diffValue))}đ
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Phân loại *</label>
                <select 
                  value={adjType} 
                  onChange={e => setAdjType(e.target.value)}
                  className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none font-bold text-slate-700 transition-all"
                >
                  {ADJUSTMENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Ngày kiểm kê *</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
                  <input 
                    type="date" 
                    value={auditDate} 
                    onChange={e => setAuditDate(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Lý do điều chỉnh *</label>
            <textarea 
              rows={3} 
              value={reason} 
              onChange={e => setReason(e.target.value)}
              placeholder="Nhập lý do chi tiết (VD: Kiểm kê cuối kỳ phát hiện thiếu...)"
              className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all placeholder:text-slate-300 placeholder:font-medium resize-none"
            />
          </div>

          {showConfirm && (
             <div className="p-5 bg-rose-50 border border-rose-100 rounded-3xl animate-in zoom-in-95 duration-200">
                <div className="flex gap-4">
                  <div className="bg-rose-500 text-white w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-100">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-rose-800">Xác nhận thực thi điều chỉnh?</h4>
                    <p className="text-sm text-rose-600 font-medium mt-1">
                      Hệ thống sẽ thực hiện {diff > 0 ? 'TĂNG' : 'GIẢM'} tồn kho của mặt hàng này thêm {Math.abs(diff)} {stock.item.unit}. Hành động này không thể hoàn tác.
                    </p>
                  </div>
                </div>
             </div>
          )}
        </div>

        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 px-8 py-4 bg-white text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all active:scale-95 border border-slate-200"
          >
            HỦY BỎ
          </button>
          <button 
            onClick={handleAdjust}
            disabled={loading}
            className={`flex-[2] px-8 py-4 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${loading ? 'bg-slate-300' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'}`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : showConfirm ? 'XÁC NHẬN THỰC THI' : 'KIỂM TRA & XÁC NHẬN'}
          </button>
        </div>
      </div>
    </div>
  );
}
