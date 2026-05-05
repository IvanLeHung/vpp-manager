import { useState, useEffect } from 'react';
import { X, Loader2, User, Building2, Calendar, ClipboardList, Info, AlertCircle, Trash2 } from 'lucide-react';
import api from '../../lib/api';

type ItemLine = {
  id: string;
  mvpp: string;
  name: string;
  unit: string;
  stock: number;
  khadung: number;
  qty: number;
  note: string;
};

type QuickHandoverModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedStocks: any[];
  warehouseCode: string;
  itemType: 'VPP' | 'VE_SINH';
  onSuccess: () => void;
};

export default function QuickHandoverModal({ isOpen, onClose, selectedStocks, warehouseCode, itemType, onSuccess }: QuickHandoverModalProps) {
  const [lines, setLines] = useState<ItemLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Form fields
  const [ticketDate, setTicketDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiverName, setReceiverName] = useState('');
  const [receiverDept, setReceiverDept] = useState(''); // Dept for VPP, Area for VE_SINH
  const [issueType, setIssueType] = useState(itemType === 'VPP' ? 'INTERNAL' : 'PERIODIC');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen && selectedStocks.length > 0) {
      const initialLines = selectedStocks
        .map(s => {
          const khadung = s.quantityOnHand - s.quantityReserved;
          return {
            id: s.item.id,
            mvpp: s.item.mvpp,
            name: s.item.name,
            unit: s.item.unit,
            stock: s.quantityOnHand,
            khadung: khadung,
            qty: khadung > 0 ? 1 : 0,
            note: ''
          };
        })
        .filter(l => l.khadung > 0);

      if (initialLines.length === 0) {
        alert('Các mặt hàng đã chọn hiện không còn tồn kho để bàn giao.');
        onClose();
        return;
      }

      setLines(initialLines);
      setReason(`Bàn giao nhanh ${itemType === 'VPP' ? 'văn phòng phẩm' : 'đồ vệ sinh'} cho ${itemType === 'VPP' ? 'phòng ban' : 'khu vực'}`);
      setShowConfirm(false);
    }
  }, [isOpen, selectedStocks, itemType, onClose]);

  if (!isOpen) return null;

  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);
  const totalItems = lines.length;

  const handleUpdateQty = (index: number, val: number) => {
    const newLines = [...lines];
    const line = newLines[index];
    const newQty = Math.max(1, Math.min(val, line.khadung));
    newLines[index].qty = newQty;
    setLines(newLines);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) {
      alert('Phải có ít nhất một mặt hàng để bàn giao.');
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleHandover = async () => {
    if (!receiverName || !receiverDept || !reason.trim()) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      setLoading(true);
      await api.post('/warehouse-tickets', {
        ticketType: 'ISSUE',
        warehouseCode,
        ticketDate,
        receiverName,
        receiverDept,
        issueType,
        reason,
        lines: lines.map(l => ({
          itemId: l.id,
          qty: -l.qty, // Negative for Issue
          note: l.note
        }))
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('Lỗi: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const ISSUE_TYPES = itemType === 'VPP' ? [
    { id: 'INTERNAL', label: 'Cấp phát văn phòng phẩm' },
    { id: 'NEW_EMP', label: 'Cấp cho nhân sự mới' },
    { id: 'DEPT_ADD', label: 'Cấp bổ sung phòng ban' },
    { id: 'EVENT', label: 'Cấp cho sự kiện/cuộc họp' },
    { id: 'OTHER', label: 'Khác' },
  ] : [
    { id: 'PERIODIC', label: 'Cấp phát vệ sinh định kỳ' },
    { id: 'AD_HOC', label: 'Bổ sung đột xuất' },
    { id: 'HANDOVER_CLEANER', label: 'Bàn giao cho tạp vụ' },
    { id: 'BRANCH_TRANSFER', label: 'Bàn giao cho chi nhánh' },
    { id: 'EVENT_CLEAN', label: 'Vệ sinh sự kiện' },
    { id: 'OTHER', label: 'Khác' },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Bàn giao nhanh</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Cấp phát & Trừ kho ngay lập tức</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Col: Info */}
            <div className="lg:col-span-5 space-y-6 border-r border-slate-50 pr-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Info className="w-3 h-3"/> Thông tin bàn giao</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Ngày bàn giao *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input type="date" value={ticketDate} onChange={e => setTicketDate(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Loại bàn giao *</label>
                  <select value={issueType} onChange={e => setIssueType(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-all">
                    {ISSUE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Người nhận / Phụ trách *</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input placeholder="Họ và tên người thực nhận..." value={receiverName} onChange={e => setReceiverName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{itemType === 'VPP' ? 'Phòng ban nhận *' : 'Khu vực nhận *'}</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input placeholder={itemType === 'VPP' ? "Tên phòng ban / bộ phận..." : "Khu vực / Tòa nhà / Tầng..."} value={receiverDept} onChange={e => setReceiverDept(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lý do / Mục đích *</label>
                <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-all resize-none" placeholder="Nhập lý do chi tiết..." />
              </div>

              <div className="bg-indigo-50 rounded-2xl p-5 space-y-3 border border-indigo-100">
                <div className="flex justify-between text-xs"><span className="text-indigo-600/70 font-black uppercase tracking-wider">Mặt hàng:</span> <span className="font-black text-indigo-900">{totalItems}</span></div>
                <div className="flex justify-between text-xs"><span className="text-indigo-600/70 font-black uppercase tracking-wider">Tổng số lượng:</span> <span className="font-black text-indigo-900">{totalQty}</span></div>
                <div className="flex justify-between text-xs border-t border-indigo-200/50 pt-2"><span className="text-indigo-600 font-black uppercase tracking-wider">Kho xuất:</span> <span className="font-black text-indigo-900">{warehouseCode}</span></div>
              </div>
            </div>

            {/* Right Col: Items List */}
            <div className="lg:col-span-7 space-y-4">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ClipboardList className="w-3 h-3"/> Danh sách vật tư đã chọn</h3>
               <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-4 py-3">Mặt hàng</th>
                        <th className="px-4 py-3 text-center">Khả dụng</th>
                        <th className="px-4 py-3 text-center w-24">SL Cấp</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lines.map((line, idx) => (
                        <tr key={line.id} className="bg-white">
                          <td className="px-4 py-3">
                            <p className="font-black text-slate-700 text-xs line-clamp-1">{line.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{line.mvpp} • {line.unit}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-black text-slate-500">{line.khadung}</span>
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="number" 
                              min="1" 
                              max={line.khadung}
                              value={line.qty} 
                              onChange={e => handleUpdateQty(idx, Number(e.target.value))}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-black text-indigo-600 outline-none focus:border-indigo-400"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleRemoveLine(idx)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>

               {showConfirm && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 animate-in slide-in-from-right-4 duration-300">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-amber-800">Xác nhận thực hiện bàn giao?</p>
                    <p className="text-[11px] font-bold text-amber-600 mt-1">Hành động này sẽ TRỪ KHO ngay lập tức và tạo phiếu xuất kho cho các mặt hàng trên.</p>
                  </div>
                </div>
               )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-8 py-4 bg-white text-slate-600 font-black rounded-2xl hover:bg-slate-100 border border-slate-200">HỦY BỎ</button>
          <button onClick={handleHandover} disabled={loading} className={`flex-[2] px-8 py-4 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center ${loading ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : showConfirm ? 'XÁC NHẬN THỰC THI' : 'KIỂM TRA & XÁC NHẬN'}
          </button>
        </div>
      </div>
    </div>
  );
}
