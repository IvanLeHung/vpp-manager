import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, RefreshCw, FileText, CheckCircle, XCircle, Calendar, DollarSign, Layers, User, ShieldAlert } from 'lucide-react';
import api from '../../lib/api';

interface HistoryItem {
  id: string;
  reportCode: string;
  reportName: string;
  reportType: 'SUMMARY' | 'DETAIL';
  format: 'PDF' | 'EXCEL';
  selectedPoIds: string[];
  validPoIds: string[];
  excludedPoIds: string[];
  configJson: any;
  classificationOverrideJson: any[];
  totalPo: number;
  totalAmount: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  status: 'SUCCESS' | 'FAILED';
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  createdBy: {
    fullName: string;
    username: string;
  };
}

interface PurchaseReportHistoryProps {
  onBack: () => void;
  onRecreate: (config: any) => void;
}

const PurchaseReportHistory: React.FC<PurchaseReportHistoryProps> = ({ onBack, onRecreate }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get('/purchase-report/history');
      setHistory(res.data);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử báo cáo:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getDownloadUrl = (fileUrl: string) => {
    const base = api.defaults.baseURL || 'http://localhost:3001/api';
    return base.replace('/api', '') + fileUrl;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 md:p-8 no-print">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-3 bg-white hover:bg-slate-50 text-slate-600 rounded-2xl border border-slate-200 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-800">Lịch sử xuất báo cáo mua sắm</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Quản lý và tải lại các báo cáo đã tạo</p>
          </div>
        </div>
        <button 
          onClick={() => fetchHistory(true)} 
          disabled={loading || refreshing}
          className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      {/* Main Table Panel */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-2xl border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-4 shadow-xl"></div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Đang tải lịch sử...</p>
          </div>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap border-separate border-spacing-0">
            <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10">
              <tr className="text-[9px] uppercase font-black text-slate-400 tracking-wider">
                <th className="p-4 border-b border-slate-200 pl-6 w-32">Mã / Ngày tạo</th>
                <th className="p-4 border-b border-slate-200">Tên báo cáo</th>
                <th className="p-4 border-b border-slate-200 text-center w-24">Loại</th>
                <th className="p-4 border-b border-slate-200 text-center w-24">Định dạng</th>
                <th className="p-4 border-b border-slate-200 text-center w-24">Số phiếu</th>
                <th className="p-4 border-b border-slate-200 text-right w-32">Tổng tiền</th>
                <th className="p-4 border-b border-slate-200 text-center w-32">Người tạo</th>
                <th className="p-4 border-b border-slate-200 text-center w-32">Trạng thái</th>
                <th className="p-4 border-b border-slate-200 pr-6 text-center w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {history.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="p-20 text-center text-slate-300">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <FileText className="w-10 h-10 opacity-30" />
                    </div>
                    <p className="font-black uppercase tracking-widest text-xs">Chưa có lịch sử xuất báo cáo nào</p>
                  </td>
                </tr>
              )}
              {history.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/50 transition-all border-b border-slate-100 last:border-0">
                  <td className="p-4 pl-6">
                    <p className="font-black text-slate-800 text-xs">{item.reportCode}</p>
                    <p className="text-[9px] font-bold text-slate-400 flex items-center mt-0.5"><Calendar className="w-2.5 h-2.5 mr-1" /> {new Date(item.createdAt).toLocaleDateString('vi-VN')} {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="p-4">
                    <div className="max-w-[280px] truncate">
                      <p className="font-black text-slate-800 text-xs">{item.reportName}</p>
                      {item.fileName && (
                        <p className="text-[9px] font-bold text-indigo-400 mt-0.5 truncate">{item.fileName} ({formatBytes(item.fileSize)})</p>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border ${
                      item.reportType === 'SUMMARY' 
                        ? 'bg-blue-50 text-blue-600 border-blue-100' 
                        : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`}>
                      {item.reportType === 'SUMMARY' ? 'Tổng hợp' : 'Chi tiết'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                      item.format === 'PDF' 
                        ? 'bg-rose-100 text-rose-700' 
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {item.format}
                    </span>
                  </td>
                  <td className="p-4 text-center font-bold text-slate-700 text-xs">
                    {item.totalPo} phiếu
                  </td>
                  <td className="p-4 text-right font-black text-indigo-600 text-xs">
                    {item.totalAmount.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <User className="w-3 text-slate-400" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">{item.createdBy.fullName}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {item.status === 'SUCCESS' ? (
                        <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-100">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> 🟢 Hoàn thành
                        </span>
                      ) : (
                        <span className="flex flex-col items-center gap-0.5 text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-xl border border-rose-100" title={item.errorMessage}>
                          <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-rose-500" /> 🔴 Lỗi: {item.errorCode}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 pr-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {item.status === 'SUCCESS' ? (
                        <>
                          <button
                            onClick={() => window.open(getDownloadUrl(item.fileUrl), '_blank')}
                            className="p-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Tải xuống
                          </button>
                          <button
                            onClick={() => onRecreate(item)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Tạo lại
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onRecreate(item)}
                          className="p-2 bg-rose-55 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Thử lại
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseReportHistory;
