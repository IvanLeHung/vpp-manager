import { useState, useEffect } from 'react';
import { 
  Filter, Calendar, 
  ChevronLeft, ChevronRight, Eye, RefreshCw,
  Database, Download, AlertTriangle, CheckSquare
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/api';

const ACTION_LABELS: Record<string, { label: string, level: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL' | 'SYSTEM' }> = {
  'LOGIN': { label: 'Đăng nhập', level: 'INFO' },
  'LOGOUT': { label: 'Đăng xuất', level: 'INFO' },
  'CREATE': { label: 'Tạo mới', level: 'SUCCESS' },
  'UPDATE': { label: 'Cập nhật', level: 'INFO' },
  'DELETE': { label: 'Xóa', level: 'CRITICAL' },
  'APPROVE': { label: 'Phê duyệt', level: 'SUCCESS' },
  'REJECT': { label: 'Từ chối', level: 'WARNING' },
  'CANCEL': { label: 'Hủy bỏ', level: 'CRITICAL' },
  'SUBMIT': { label: 'Trình duyệt', level: 'INFO' },
  'RETURN': { label: 'Trả lại', level: 'WARNING' },
  'ISSUE': { label: 'Cấp phát', level: 'SUCCESS' },
  'RECEIVE': { label: 'Nhập kho', level: 'SUCCESS' },
  'REPLACE_ITEM': { label: 'Thay thế vật tư', level: 'WARNING' },
  'REPLACEMENT_ADMIN_ACTION': { label: 'Admin duyệt thay thế', level: 'CRITICAL' },
  'AUTO_EXECUTE': { label: 'Tự động thực thi', level: 'SYSTEM' },
};

const ENTITY_BADGES: Record<string, { label: string, color: string }> = {
  'User': { label: 'Người dùng', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  'Request': { label: 'Phiếu cấp phát', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'WarehouseTicket': { label: 'Phiếu kho', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'PurchaseOrder': { label: 'Phiếu mua sắm', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  'Department': { label: 'Phòng ban', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  'Item': { label: 'Vật tư', color: 'bg-teal-100 text-teal-700 border-teal-200' },
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
    level: ''
  });
  const [timelineLogs, setTimelineLogs] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'TIMELINE' | 'JSON'>('DETAILS');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showLocalToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };


  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        q: searchQuery,
        ...filters
      });
      const res = await api.get(`/reports/audit-logs?${params.toString()}`);

      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async (entityType: string, entityId: string) => {
    try {
      setLoadingTimeline(true);
      const res = await api.get(`/reports/audit-logs?entityType=${entityType}&entityId=${entityId}&limit=50`);
      setTimelineLogs(res.data.data);
    } catch (err) {
      console.error('Failed to fetch timeline', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters, searchQuery]);

  useEffect(() => {
    if (selectedLog && selectedLog.entityId) {
      fetchTimeline(selectedLog.entityType, selectedLog.entityId);
    }
  }, [selectedLog]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPagination({ ...pagination, page: 1 });
  };

  const getLevelColor = (level: string) => {
    switch(level) {
      case 'CRITICAL': return 'bg-rose-500 text-white shadow-rose-500/30';
      case 'WARNING': return 'bg-amber-500 text-white shadow-amber-500/30';
      case 'SUCCESS': return 'bg-emerald-500 text-white shadow-emerald-500/30';
      case 'SYSTEM': return 'bg-purple-600 text-white shadow-purple-600/30';
      case 'INFO': default: return 'bg-blue-500 text-white shadow-blue-500/30';
    }
  };

  const renderDiff = (oldValues: any, newValues: any) => {
    if (!oldValues && !newValues) return <p className="text-xs text-slate-400 italic">Không có dữ liệu thay đổi cụ thể.</p>;
    
    // Filter out internal fields
    const keys = Array.from(new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]))
      .filter(k => !['updatedAt', 'id', 'createdAt'].includes(k));
    
    if (keys.length === 0) return <p className="text-xs text-slate-400 italic">Không có thay đổi đáng kể.</p>;

    return (
      <div className="space-y-2 mt-4">
        {keys.map(key => {
          const oldVal = oldValues?.[key];
          const newVal = newValues?.[key];
          if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return null;
          
          return (
            <div key={key} className="group">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{key}</p>
              <div className="flex flex-col gap-0.5">
                {oldVal !== undefined && (
                  <div className="flex items-start gap-2 text-rose-500 bg-rose-50/50 px-2 py-1 rounded border border-rose-100/50 line-through text-[11px] font-medium italic">
                    <span className="font-bold shrink-0">-</span>
                    <span className="break-all">{typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal)}</span>
                  </div>
                )}
                {newVal !== undefined && (
                  <div className="flex items-start gap-2 text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200/50 text-[11px] font-bold">
                    <span className="font-black shrink-0">+</span>
                    <span className="break-all">{typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };


  const handleExportExcel = async (mode: 'CURRENT' | 'TODAY' | 'ALL' = 'CURRENT') => {
    try {
      setLoading(true);
      let exportParams = new URLSearchParams({ ...filters, q: searchQuery, limit: '5000' });
      
      if (mode === 'TODAY') {
        const today = new Date().toISOString().split('T')[0];
        exportParams.set('startDate', today);
        exportParams.set('endDate', today);
      } else if (mode === 'ALL') {
        exportParams = new URLSearchParams({ limit: '10000' });
      }

      const res = await api.get(`/reports/audit-logs?${exportParams.toString()}`);
      const allLogs = res.data.data;

      const exportData = allLogs.map((log: any, index: number) => {
        const act = ACTION_LABELS[log.action] || { label: log.action, level: 'INFO' };
        return {
          'STT': index + 1,
          'Thời gian': new Date(log.createdAt).toLocaleString('vi-VN'),
          'Mức độ': act.level,
          'Người thực hiện': log.user?.fullName || 'Hệ thống',
          'Username': log.user?.username || 'system',
          'Hành động (Mã)': log.action,
          'Hành động (VN)': act.label,
          'Đối tượng': log.entityType,
          'ID Đối tượng': log.entityId,
          'IP': log.ip || '',
          'Thay đổi': JSON.stringify(log.oldValues || {}) + ' -> ' + JSON.stringify(log.newValues || {})
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "AuditLogs");
      XLSX.writeFile(wb, `AuditLog_${mode}_${new Date().toISOString().slice(0,10)}.xlsx`);
      showLocalToast('Xuất file thành công');
    } catch (err) {
      console.error('Export failed', err);
      showLocalToast('Lỗi khi xuất file', 'error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Top Header */}
      <div className="bg-white px-10 py-6 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm relative z-20">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                  <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Nhật ký hệ thống</h1>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Truy vết & Giám sát vận hành</p>
              </div>
          </div>

          <div className="flex items-center gap-3">
              <div className="relative w-64 md:w-80 group">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Tìm theo ID, User, Mã phiếu..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all"
                />
              </div>
              
              <button 
                onClick={() => handleExportExcel()}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all transform active:scale-95"
              >
                  <Download className="w-4 h-4" /> <span className="hidden md:inline">Xuất Excel</span>
              </button>
              
              <button 
                onClick={() => fetchLogs(pagination.page)} 
                className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-white hover:shadow-md transition-all active:scale-90"
              >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
          </div>
      </div>

      {/* Quick Filters & Advanced Bar */}
      <div className="bg-white px-10 py-3 flex flex-col gap-3 shrink-0 border-b border-slate-100 relative z-10 no-print">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                { label: 'Tất cả', action: '', entity: '' },
                { label: '🔥 Quan trọng', action: '', entity: '', level: 'CRITICAL' },
                { label: '👤 Đăng nhập', action: 'LOGIN', entity: '' },
                { label: '📦 Phiếu kho', action: '', entity: 'WarehouseTicket' },
                { label: '📜 Cấp phát', action: '', entity: 'Request' },
                { label: '⚡ Tự động', action: 'AUTO_EXECUTE', entity: '' }
              ].map(chip => (
                <button 
                  key={chip.label}
                  onClick={() => {
                    setFilters({ ...filters, action: chip.action, entityType: chip.entity, level: chip.level || '' });
                  }}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                    (filters.action === chip.action && filters.entityType === chip.entity && (filters.level || '') === (chip.level || ''))
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2" />
                <input 
                  type="date" 
                  name="startDate" 
                  value={filters.startDate} 
                  onChange={handleFilterChange}
                  className="bg-transparent border-none text-[10px] font-black text-slate-600 focus:ring-0 w-28 uppercase"
                />
                <span className="text-slate-300">→</span>
                <input 
                  type="date" 
                  name="endDate" 
                  value={filters.endDate} 
                  onChange={handleFilterChange}
                  className="bg-transparent border-none text-[10px] font-black text-slate-600 focus:ring-0 w-28 uppercase"
                />
              </div>
            </div>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Main Table List (60%) */}
        <div className={`flex flex-col transition-all duration-500 ${selectedLog ? 'w-[60%]' : 'w-full'}`}>


          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden mx-8 mb-8 flex flex-col flex-1">
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] uppercase font-black text-slate-400 tracking-widest">
                        <th className="px-6 py-4">Thời gian</th>
                        <th className="px-6 py-4">Người thực hiện</th>
                        <th className="px-6 py-4 text-center">Hành động</th>
                        <th className="px-6 py-4">Đối tượng</th>
                        <th className="px-6 py-4 text-right">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading && logs.length === 0 ? (
                        <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold animate-pulse uppercase tracking-widest">Đang nạp nhật ký...</td></tr>
                      ) : logs.length === 0 ? (
                        <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-300 font-bold italic">Không tìm thấy bản ghi nào</td></tr>
                      ) : logs.map((log) => {
                        const actInfo = ACTION_LABELS[log.action] || { label: log.action, level: 'INFO' };
                        const entityInfo = ENTITY_BADGES[log.entityType] || { label: log.entityType, color: 'bg-slate-100 text-slate-600 border-slate-200' };
                        const isSelected = selectedLog?.id === log.id;
                        
                        return (
                          <tr 
                            key={log.id} 
                            onClick={() => setSelectedLog(isSelected ? null : log)}
                            className={`transition-all cursor-pointer group ${isSelected ? 'bg-indigo-50 border-l-[4px] border-l-indigo-600' : 'hover:bg-slate-50/70 border-l-[4px] border-l-transparent'}`}
                          >
                            <td className="px-6 py-4 text-[11px] text-slate-400 font-bold whitespace-nowrap">
                                <p>{new Date(log.createdAt).toLocaleDateString('vi-VN')}</p>
                                <p className="text-slate-500 font-black">{new Date(log.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</p>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-black text-[10px] overflow-hidden">
                                        {log.user?.fullName?.charAt(0)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-black text-slate-800 uppercase truncate">{log.user?.fullName || 'Hệ thống'}</span>
                                        <span className="text-[9px] font-bold text-slate-400 italic">@{log.user?.username || 'system'}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${getLevelColor(actInfo.level)}`}>
                                      {actInfo.label}
                                  </span>
                                  <span className="text-[7px] font-black text-slate-300 tracking-widest">{log.action}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className={`inline-flex self-start px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${entityInfo.color}`}>
                                    {entityInfo.label}
                                  </div>
                                  <span className="font-mono text-[10px] text-slate-400">{log.entityId.slice(0,12)}...</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className={`p-2 rounded-lg transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-300 bg-slate-50 group-hover:bg-white group-hover:shadow-md group-hover:text-indigo-600'}`}>
                                    <Eye className="w-4 h-4" />
                                </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-slate-50/80 p-4 border-t border-slate-100 flex justify-between items-center no-print">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hiển thị {logs.length} / {pagination.total}</span>
                  <div className="flex gap-1.5">
                      <button 
                        disabled={pagination.page <= 1}
                        onClick={() => fetchLogs(pagination.page - 1)}
                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
                      >
                          <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="px-3 flex items-center font-black text-[10px] text-slate-600 uppercase">
                          {pagination.page} / {pagination.totalPages}
                      </div>
                      <button 
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchLogs(pagination.page + 1)}
                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
                      >
                          <ChevronRight className="w-4 h-4" />
                      </button>
                  </div>
              </div>
          </div>
        </div>

        {/* RIGHT: Detail Panel (40%) */}
        {selectedLog && (
          <div className="w-[40%] bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 relative z-30">
            {/* Panel Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${getLevelColor(ACTION_LABELS[selectedLog.action]?.level || 'INFO')}`}>
                    {ACTION_LABELS[selectedLog.action]?.label || selectedLog.action}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${ENTITY_BADGES[selectedLog.entityType]?.color || 'bg-slate-100'}`}>
                    {ENTITY_BADGES[selectedLog.entityType]?.label || selectedLog.entityType}
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight break-all">{selectedLog.entityId}</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(selectedLog.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-2 bg-white text-slate-400 hover:text-rose-500 rounded-xl transition-colors shadow-sm"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-6 bg-white shrink-0">
              {[
                { id: 'DETAILS', label: 'Chi tiết thay đổi' },
                { id: 'TIMELINE', label: 'Timeline đối tượng' },
                { id: 'JSON', label: 'Dữ liệu thô' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                    activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
              {activeTab === 'DETAILS' && (
                <div className="space-y-6">
                  {/* User Info Section */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Người thực hiện</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-black shadow-sm">
                        {selectedLog.user?.fullName?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase">{selectedLog.user?.fullName || 'Hệ thống'}</p>
                        <p className="text-[10px] font-bold text-slate-400 italic">@{selectedLog.user?.username || 'system'}</p>
                        <p className="text-[9px] font-medium text-slate-400 mt-1">IP: {selectedLog.ip || '0.0.0.0'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Changes Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nội dung cập nhật</p>
                    </div>
                    {renderDiff(selectedLog.oldValues, selectedLog.newValues)}
                  </div>

                  {/* Metadata */}
                  <div className="pt-6 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Request ID</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 rounded">{selectedLog.requestId?.slice(0,16)}...</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase">User Agent</span>
                      <span className="text-[9px] text-slate-400 truncate max-w-[200px]" title={selectedLog.userAgent}>{selectedLog.userAgent}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'TIMELINE' && (
                <div className="space-y-6">
                   {loadingTimeline ? (
                     <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                        <p className="text-xs font-black text-slate-400 uppercase animate-pulse">Đang nạp timeline...</p>
                     </div>
                   ) : (
                     <div className="relative pl-4 border-l-2 border-slate-100 space-y-8 ml-2">
                        {timelineLogs.map((tLog) => (
                          <div key={tLog.id} className="relative group">
                             <div className={`absolute -left-[25px] top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white shadow-sm transition-transform group-hover:scale-125 ${getLevelColor(ACTION_LABELS[tLog.action]?.level || 'INFO')}`}></div>
                             <div>
                               <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{ACTION_LABELS[tLog.action]?.label || tLog.action}</p>
                               <p className="text-[9px] font-bold text-slate-400 mt-0.5 italic">{new Date(tLog.createdAt).toLocaleString('vi-VN')}</p>
                               <p className="text-[10px] font-bold text-slate-500 mt-1">Bởi: <span className="text-indigo-600">@{tLog.user?.username || 'system'}</span></p>
                             </div>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              )}

              {activeTab === 'JSON' && (
                <div className="bg-slate-900 rounded-2xl p-6 overflow-x-auto shadow-inner h-full">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                     <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Raw Log JSON Data</span>
                     <button 
                        onClick={() => { navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2)); alert('Copied!'); }}
                        className="text-[9px] font-black text-white bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20 transition-all uppercase tracking-widest"
                     >
                       Copy JSON
                     </button>
                  </div>
                  <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed custom-scrollbar">
                    {JSON.stringify(selectedLog, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Local Toast UI */}
      {toast && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[1000] animate-in fade-in slide-in-from-bottom-4 duration-300 flex items-center gap-3 border ${
          toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckSquare className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

