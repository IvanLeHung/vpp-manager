import { useState, useEffect } from 'react';
import { 
  Filter, Calendar, 
  ChevronLeft, ChevronRight, Eye, RefreshCw,
  Database, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: ''
  });

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
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

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPagination({ ...pagination, page: 1 });
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      // Fetch all matching logs (up to 5000 for safety)
      const params = new URLSearchParams({
        page: '1',
        limit: '5000',
        ...filters
      });
      const res = await api.get(`/reports/audit-logs?${params.toString()}`);

      const allLogs = res.data.data;

      const exportData = allLogs.map((log: any, index: number) => ({
        'STT': index + 1,
        'Thời gian': new Date(log.createdAt).toLocaleString('vi-VN'),
        'Người thực hiện': log.user?.fullName || 'Hệ thống',
        'Username': log.user?.username || 'system',
        'Hành động': log.action,
        'Đối tượng': log.entityType,
        'ID Đối tượng': log.entityId,
        'Nội dung thay đổi (Raw)': JSON.stringify(log.oldValues || {}) + ' -> ' + JSON.stringify(log.newValues || {})
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "AuditLogs");
      XLSX.writeFile(wb, `NhatKyHeThong_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Top Header */}
      <div className="bg-white px-10 py-8 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm relative z-20">
          <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic flex items-center gap-3">
                  <Database className="w-8 h-8 text-indigo-600" /> Nhật ký hệ thống
              </h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-11">Truy vết mọi biến động trên Danko VPP</p>
          </div>
          <div className="flex items-center gap-4">
              <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all transform hover:scale-105 active:scale-95"
              >
                  <Download className="w-5 h-5" /> Xuất Excel
              </button>
              <button 
                onClick={() => fetchLogs(pagination.page)} 
                className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer"
              >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
          </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white px-10 py-4 flex flex-wrap gap-6 items-center shrink-0 border-b border-slate-100 relative z-10 no-print">
          <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bộ lọc:</span>
          </div>
          
          <select 
            name="action" 
            value={filters.action} 
            onChange={handleFilterChange}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
              <option value="">Tất cả hành động</option>
              <option value="CREATE">Khởi tạo</option>
              <option value="UPDATE">Cập nhật</option>
              <option value="APPROVE">Phê duyệt</option>
              <option value="REJECT">Từ chối</option>
              <option value="LOGIN">Đăng nhập</option>
          </select>

          <select 
            name="entityType" 
            value={filters.entityType} 
            onChange={handleFilterChange}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
              <option value="">Tất cả đối tượng</option>
              <option value="Request">Phiếu yêu cầu</option>
              <option value="User">Nhân sự</option>
              <option value="Stock">Kho hàng</option>
              <option value="PurchaseOrder">Mua sắm</option>
          </select>

          <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                name="startDate" 
                value={filters.startDate} 
                onChange={handleFilterChange}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
              />
              <span className="text-slate-300">-</span>
              <input 
                type="date" 
                name="endDate" 
                value={filters.endDate} 
                onChange={handleFilterChange}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
              />
          </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-y-auto p-8 relative custom-scrollbar">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative z-0">
              <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] italic">
                      <th className="px-8 py-6">Thời gian</th>
                      <th className="px-8 py-6">Người thực hiện</th>
                      <th className="px-8 py-6 text-center">Hành động</th>
                      <th className="px-8 py-6">Nội dung thay đổi</th>
                      <th className="px-8 py-6 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading && logs.length === 0 ? (
                      <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold animate-pulse uppercase tracking-[0.2em]">Đang nạp nhật ký truy vết...</td></tr>
                    ) : logs.length === 0 ? (
                      <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-300 font-bold italic">Không tìm thấy bản ghi truy vết nào</td></tr>
                    ) : logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6 text-xs text-slate-400 font-bold whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[10px]">
                                    {log.user?.fullName?.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">{log.user?.fullName || 'Hệ thống'}</span>
                                    <span className="text-[10px] font-bold text-slate-400 italic">@{log.user?.username || 'system'}</span>
                                </div>
                            </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                                log.action === 'DELETE' ? 'bg-rose-100 text-rose-700' :
                                log.action === 'APPROVE' ? 'bg-indigo-100 text-indigo-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>
                                {log.action}
                            </span>
                        </td>
                        <td className="px-8 py-6 max-w-sm truncate">
                            <span className="text-xs font-bold text-slate-600">
                                {log.entityType} 
                                <span className="text-slate-300 mx-2">|</span> 
                                <span className="font-mono text-slate-400">{log.entityId.slice(0,8)}...</span>
                            </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                            <button className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm group-hover:shadow-lg">
                                <Eye className="w-5 h-5" />
                            </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
              </table>

              {/* Pagination */}
              <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-between items-center no-print">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Hiển thị {logs.length} / {pagination.total} bản ghi</span>
                  <div className="flex gap-2">
                      <button 
                        disabled={pagination.page <= 1}
                        onClick={() => fetchLogs(pagination.page - 1)}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
                      >
                          <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div className="px-6 flex items-center font-black text-xs text-slate-800">
                          Trang {pagination.page} / {pagination.totalPages}
                      </div>
                      <button 
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchLogs(pagination.page + 1)}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
                      >
                          <ChevronRight className="w-5 h-5" />
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}
