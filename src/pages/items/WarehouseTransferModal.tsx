import React, { useState } from 'react';
import { X, ArrowLeftRight, ChevronDown } from 'lucide-react';
import api from '../../lib/api';

interface WarehouseTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: { id: string; name: string; mvpp: string; currentType: string }[];
  onSuccess: (message: string) => void;
}

export default function WarehouseTransferModal({ isOpen, onClose, selectedItems, onSuccess }: WarehouseTransferModalProps) {
  const [targetWarehouse, setTargetWarehouse] = useState<'VPP' | 'VE_SINH'>(
    selectedItems.length === 1 && selectedItems[0].currentType === 'VPP' ? 'VE_SINH' : 'VPP'
  );
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // If all selected items are from one warehouse, default the target to the other
  React.useEffect(() => {
    if (selectedItems.length > 0) {
      const allVPP = selectedItems.every(i => i.currentType === 'VPP');
      const allVS = selectedItems.every(i => i.currentType === 'VE_SINH');
      if (allVPP) setTargetWarehouse('VE_SINH');
      else if (allVS) setTargetWarehouse('VPP');
    }
  }, [selectedItems]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.patch('/items/bulk-transfer-warehouse', {
        itemIds: selectedItems.map(i => i.id),
        warehouseType: targetWarehouse,
        note
      });
      onSuccess(res.data.message || `Đã chuyển kho thành công ${selectedItems.length} hàng hóa.`);
      onClose();
    } catch (error: any) {
      alert('Lỗi: ' + (error.response?.data?.error || 'Không thể chuyển kho.'));
    } finally {
      setLoading(false);
    }
  };

  const currentWarehouseLabel = (type: string) => type === 'VPP' ? 'Văn phòng phẩm' : 'Vệ sinh';

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <ArrowLeftRight className="w-6 h-6 mr-3 text-indigo-600" />
            Chuyển kho hàng hóa
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
              <p className="text-sm font-bold text-indigo-800">
                Đang thực hiện chuyển cho {selectedItems.length} hàng hóa đã chọn.
              </p>
              {selectedItems.length === 1 && (
                <p className="text-xs text-indigo-600 mt-1">
                  Mặt hàng: <span className="font-bold">{selectedItems[0].mvpp} - {selectedItems[0].name}</span>
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-indigo-200/50">
                <p className="text-[11px] leading-relaxed text-indigo-600 flex items-start">
                  <span className="mr-1.5 mt-0.5 inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0"></span>
                  Lưu ý: Sau khi chuyển kho, các báo cáo tổng hợp và lệnh in sẽ lấy dữ liệu theo kho mới.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Chuyển sang kho *</label>
              <div className="relative">
                <select 
                  value={targetWarehouse} 
                  onChange={(e) => setTargetWarehouse(e.target.value as 'VPP' | 'VE_SINH')}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold appearance-none shadow-sm"
                >
                  <option value="VPP">Kho Văn phòng phẩm</option>
                  <option value="VE_SINH">Kho Vệ sinh</option>
                </select>
                <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Ghi chú (Không bắt buộc)</label>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm h-24"
                placeholder="Nhập lý do chuyển kho..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-lg shadow-indigo-500/30 flex items-center justify-center disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận chuyển'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
