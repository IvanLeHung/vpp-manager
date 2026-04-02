import { useState, useEffect } from 'react';
import { X, History, Box, RefreshCw, ArrowRight, Save, UploadCloud } from 'lucide-react';
import api from '../../lib/api';

type AuditLog = {
  id: string;
  action: string;
  oldValues: any;
  newValues: any;
  createdAt: string;
  batchId?: string;
  user: { fullName: string; username: string } | null;
  importBatch: { fileName: string } | null;
};

export default function ItemHistoryModal({
  isOpen,
  onClose,
  itemId = '',
  itemMvpp = ''
}: {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  itemMvpp?: string;
}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const url = `/items/history?limit=200${itemId ? `&itemId=${itemId}` : ''}`;
      const res = await api.get(url);
      setLogs(res.data);
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchHistory();
  }, [isOpen, itemId]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(l => filterAction === 'ALL' || l.action.includes(filterAction));

  const formatAction = (action: string) => {
    if (action === 'MANUAL_CREATE') return { text: 'Tạo thủ công', color: 'text-indigo-600 bg-indigo-100', icon: Save };
    if (action === 'MANUAL_UPDATE') return { text: 'Sửa thủ công', color: 'text-amber-600 bg-amber-100', icon: Save };
    if (action === 'IMPORT_CREATE') return { text: 'Thêm từ Import', color: 'text-emerald-600 bg-emerald-100', icon: UploadCloud };
    if (action === 'IMPORT_UPDATE') return { text: 'Sửa từ Import', color: 'text-orange-600 bg-orange-100', icon: UploadCloud };
    return { text: action, color: 'text-slate-600 bg-slate-100', icon: Box };
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <History className="w-6 h-6 mr-3 text-indigo-600" />
              Lịch sử thay đổi Danh mục {itemMvpp && <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-800 rounded font-black text-sm">{itemMvpp}</span>}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchHistory} className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-rose-500 bg-white p-2 border border-slate-200 rounded-full shadow-sm hover:bg-rose-50 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-white flex gap-4 shrink-0">
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm text-slate-700 bg-white outline-none">
            <option value="ALL">Mọi thao tác</option>
            <option value="CREATE">Chỉ Thêm mới</option>
            <option value="UPDATE">Chỉ Cập nhật</option>
            <option value="IMPORT">Chỉ Import Excel</option>
          </select>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main List */}
          <div className={`flex-1 overflow-y-auto ${selectedLog ? 'border-r border-slate-200' : ''}`}>
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Đang tải lịch sử...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500">Chưa có lịch sử thay đổi nào cấu hình với bộ lọc trên.</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                  <tr className="text-slate-500 font-bold uppercase text-xs tracking-wider">
                    <th className="p-4">Thời gian</th>
                    <th className="p-4">Thao tác</th>
                    {!itemId && <th className="p-4">Mã VT</th>}
                    <th className="p-4">Người thực hiện</th>
                    <th className="p-4">Theo Lô</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map(log => {
                    const act = formatAction(log.action);
                    const isSelected = selectedLog?.id === log.id;
                    const Icon = act.icon;
                    return (
                      <tr key={log.id} onClick={() => setSelectedLog(log)} className={`cursor-pointer transition hover:bg-indigo-50/50 ${isSelected ? 'bg-indigo-50' : ''}`}>
                        <td className="p-4 text-slate-500 font-medium">{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded flex w-fit items-center ${act.color}`}>
                            <Icon className="w-3 h-3 mr-1" /> {act.text}
                          </span>
                        </td>
                        {!itemId && (
                          <td className="p-4 font-black text-slate-700">
                            {log.newValues?.mvpp || log.oldValues?.mvpp || 'N/A'}
                          </td>
                        )}
                        <td className="p-4 text-slate-700 font-bold">{log.user?.fullName || log.user?.username || 'Hệ thống'}</td>
                        <td className="p-4 text-slate-500 text-xs font-mono">{log.importBatch?.fileName || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Details Sidebar / Diff View */}
          {selectedLog && (
            <div className="w-96 bg-slate-50 p-6 overflow-y-auto flex flex-col shrink-0 animate-in slide-in-from-right-2">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 text-lg">Chi tiết thay đổi</h3>
                <button onClick={() => setSelectedLog(null)} className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"><X className="w-5 h-5"/></button>
              </div>

              <div className="space-y-4 flex-1">
                 {/* Diff Engine Logic */}
                 {(() => {
                   const oldV = selectedLog.oldValues || {};
                   const newV = selectedLog.newValues || {};
                   // Compare fields
                   const fields = ['mvpp', 'name', 'category', 'unit', 'price', 'quota', 'isActive', 'itemType'];
                   const fieldLabels: Record<string, string> = {
                     mvpp: 'Mã VT', name: 'Tên hàng', category: 'Nhóm', unit: 'ĐVT', price: 'Đơn giá', quota: 'Định mức', isActive: 'Trạng thái', itemType: 'Kho'
                   };

                   return fields.map(k => {
                     const isChanged = oldV[k] !== newV[k];
                     if (!oldV[k] && !newV[k]) return null;
                     if (!isChanged && selectedLog.action.includes('CREATE')) return (
                       <div key={k} className="bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
                         <p className="text-xs text-slate-400 uppercase font-bold mb-1">{fieldLabels[k]}</p>
                         <p className="font-bold text-emerald-600">{String(newV[k])}</p>
                       </div>
                     );
                     if (!isChanged) return null; // Don't show unchanged fields on UPDATE

                     return (
                       <div key={k} className="bg-white p-3 border border-amber-200 rounded-xl shadow-sm relative overflow-hidden">
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                         <p className="text-xs text-slate-400 uppercase font-bold mb-1 ml-1">{fieldLabels[k]}</p>
                         <div className="flex items-center gap-2 ml-1">
                            {oldV[k] !== undefined && <span className="line-through text-slate-400 font-medium decoration-rose-400/50">{String(oldV[k])}</span>}
                            {oldV[k] !== undefined && <ArrowRight className="w-3 h-3 text-slate-300" />}
                            <span className="font-bold text-slate-800">{String(newV[k])}</span>
                         </div>
                       </div>
                     );
                   });
                 })()}

                 <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 font-mono break-all">
                    ID: {selectedLog.id}<br/>
                    Batch: {selectedLog.batchId || 'N/A'}<br/>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
