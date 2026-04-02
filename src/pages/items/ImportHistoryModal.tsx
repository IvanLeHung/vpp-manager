import { useState, useEffect } from 'react';
import { X, Clock, User, FileText, Hash } from 'lucide-react';
import api from '../../lib/api';

type ImportBatch = {
  id: string;
  fileName: string;
  createdAt: string;
  importMode: string;
  status: 'VALIDATING' | 'IMPORTED' | 'PARTIAL_SUCCESS' | 'FAILED';
  totalRows: number;
  successRows: number;
  errorRows: number;
  importedBy: { fullName: string; username: string };
};

export default function ImportHistoryModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/items/import/batches');
      setBatches(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchBatches();
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IMPORTED': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-emerald-200 shadow-sm">THÀNH CÔNG</span>;
      case 'PARTIAL_SUCCESS': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-amber-200 shadow-sm">THÀNH CÔNG MỘT PHẦN</span>;
      case 'FAILED': return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-rose-200 shadow-sm">THẤT BẠI</span>;
      default: return <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-slate-200">ĐANG XỬ LÝ</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div className="flex items-center">
             <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white mr-4 shadow-lg shadow-indigo-100">
                <Clock className="w-5 h-5" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-800">Lịch sử Import Excel</h2>
                <p className="text-xs text-slate-400 font-medium italic">Truy vết nguồn gốc dữ liệu danh mục</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto">
           {loading ? (
             <div className="py-20 text-center animate-pulse">
                <Hash className="w-10 h-10 text-indigo-200 mx-auto mb-4 animate-spin" />
                <p className="text-slate-400 font-bold">Đang tải lịch sử import...</p>
             </div>
           ) : batches.length === 0 ? (
             <div className="py-20 text-center">
                <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">Chưa có lượt import nào được thực hiện.</p>
             </div>
           ) : (
             <div className="space-y-4">
               {batches.map(batch => (
                 <div key={batch.id} className="group p-5 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                    <div className="flex justify-between items-start mb-3">
                       <div className="flex items-center">
                          <FileText className="w-4 h-4 text-indigo-500 mr-2" />
                          <h4 className="font-black text-slate-800 text-base">{batch.fileName}</h4>
                       </div>
                       {getStatusBadge(batch.status)}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-3 p-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <div className="text-center border-r border-slate-200">
                           <p className="text-[10px] font-black text-slate-400 uppercase">Tổng dòng</p>
                           <p className="text-lg font-black text-slate-700">{batch.totalRows}</p>
                        </div>
                        <div className="text-center border-r border-slate-200">
                           <p className="text-[10px] font-black text-emerald-500 uppercase">Thành công</p>
                           <p className="text-lg font-black text-emerald-600">{batch.successRows}</p>
                        </div>
                        <div className="text-center">
                           <p className="text-[10px] font-black text-rose-500 uppercase">Lỗi</p>
                           <p className="text-lg font-black text-rose-600">{batch.errorRows}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50 text-xs font-bold">
                       <div className="flex items-center text-slate-500">
                          <User className="w-3.5 h-3.5 mr-1.5" />
                          {batch.importedBy.fullName} (@{batch.importedBy.username})
                       </div>
                       <div className="flex items-center text-slate-400">
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          {new Date(batch.createdAt).toLocaleString('vi-VN')}
                       </div>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        <div className="p-8 bg-slate-50/50 border-t border-slate-100 text-center">
           <button onClick={onClose} className="px-10 py-3 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition shadow-sm">Đóng cửa sổ</button>
        </div>
      </div>
    </div>
  );
}
