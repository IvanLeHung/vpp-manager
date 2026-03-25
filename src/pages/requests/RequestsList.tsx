import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Download, Search, FileText, CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight, Eye, CheckSquare, StopCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { VPPRequest, User } from '../../context/AppContext';
import api from '../../lib/api';
import type { ViewMode } from '../Requests';

interface Props {
  requests: VPPRequest[];
  currentUser: User;
  setViewMode: (mode: ViewMode) => void;
  setActiveRequest: (req: VPPRequest | null) => void;
  refreshData: () => Promise<void>;
  showToast: (m: string, t?: 'success' | 'error' | 'warning') => void;
}

export default function RequestsList({ requests, currentUser, setViewMode, setActiveRequest, refreshData, showToast }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const itemsPerPage = 15;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'APPROVED': case 'READY_TO_ISSUE': case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'REJECTED': case 'CANCELLED': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'DRAFT': return 'bg-slate-200 text-slate-700 border-slate-300';
      case 'PARTIALLY_ISSUED': case 'PARTIALLY_APPROVED': return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'RETURNED': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'WAITING_HANDOVER': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PENDING_MANAGER': case 'PENDING_ADMIN': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredRequests = useMemo(() => {
    let filtered = requests;
    if (currentUser.role === 'MANAGER') {
        filtered = filtered.filter(req => req.department === currentUser.department);
    } else if (currentUser.role === 'EMPLOYEE') {
        filtered = filtered.filter(req => req.requesterId === currentUser.userId || req.requester?.fullName === currentUser.name);
    }
    
    if (statusFilter !== 'ALL') {
        if (statusFilter === 'MY_ACTION') {
            if (currentUser.role === 'MANAGER') filtered = filtered.filter(r => r.status === 'PENDING_MANAGER');
            else if (currentUser.role === 'ADMIN') filtered = filtered.filter(r => r.status === 'PENDING_ADMIN');
            else if (currentUser.role === 'WAREHOUSE') filtered = filtered.filter(r => r.status === 'READY_TO_ISSUE');
            else filtered = filtered.filter(r => r.status === 'WAITING_HANDOVER'); // For Employee
        }
        else if (statusFilter === 'COMPLETED') filtered = filtered.filter(r => r.status === 'COMPLETED');
        else filtered = filtered.filter(r => r.status === statusFilter);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.id.toLowerCase().includes(lower) || 
        r.requester?.fullName.toLowerCase().includes(lower) ||
        r.purpose?.toLowerCase().includes(lower)
      );
    }
    return filtered.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests, statusFilter, searchTerm, currentUser]);

  // Handle row selection changes when data changes
  useEffect(() => {
    setSelectedIds([]);
  }, [statusFilter, searchTerm, currentPage]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status.startsWith('PENDING')).length,
      approved: requests.filter(r => r.status === 'APPROVED' || r.status === 'READY_TO_ISSUE').length,
      rejected: requests.filter(r => r.status === 'REJECTED').length
    }
  }, [requests]);

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const currentData = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getSlaStatus = (req: VPPRequest) => {
      // Logic SLA cơ bản: nếu quá SLA hours mà chưa sang APPROVED
      if (['COMPLETED', 'REJECTED', 'CANCELLED', 'READY_TO_ISSUE', 'WAITING_HANDOVER'].includes(req.status)) return null;
      const hoursElapsed = (new Date().getTime() - new Date(req.createdAt).getTime()) / (1000 * 60 * 60);
      const isOverdue = hoursElapsed > (req.prioritySlaHours || 24);
      return isOverdue ? 'Khẩn / Quá Hạn' : 'Trong hạn';
  };

  const getActionName = (req: VPPRequest) => {
      if (currentUser.role === 'MANAGER' && req.status === 'PENDING_MANAGER') return 'Duyệt (BP)';
      if (currentUser.role === 'ADMIN' && (req.status === 'PENDING_ADMIN' || req.status === 'PENDING_MANAGER')) return 'Duyệt (HChính)';
      if (currentUser.role === 'WAREHOUSE' && req.status === 'READY_TO_ISSUE') return 'Xuất Kho';
      if (currentUser.userId === req.requesterId && req.status === 'WAITING_HANDOVER') return 'Xác nhận Bàn giao';
      if (currentUser.userId === req.requesterId && (req.status === 'DRAFT' || req.status === 'RETURNED')) return 'Chỉnh sửa';
      return 'Chi tiết';
  };

  const isApprovable = (req: VPPRequest) => {
    if (currentUser.role === 'MANAGER' && req.status === 'PENDING_MANAGER') return true;
    if (currentUser.role === 'ADMIN' && (req.status === 'PENDING_MANAGER' || req.status === 'PENDING_ADMIN')) return true;
    return false;
  };

  const currentApprovableRequests = useMemo(() => {
     return currentData.filter(isApprovable);
  }, [currentData, currentUser]);

  const toggleSelectAll = () => {
     if (selectedIds.length === currentApprovableRequests.length && currentApprovableRequests.length !== 0) {
        setSelectedIds([]);
     } else {
        setSelectedIds(currentApprovableRequests.map(r => r.id));
     }
  };

  const toggleSelect = (id: string) => {
     setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Xác nhận duyệt ${selectedIds.length} phiếu đã chọn?`)) return;
    
    try {
       setIsSubmittingBatch(true);
       await api.post('/requests/batch/approve', { requestIds: selectedIds });
       showToast(`Đã duyệt thành công ${selectedIds.length} phiếu!`);
       setSelectedIds([]);
       await refreshData();
    } catch (err: any) {
       showToast(err.response?.data?.error || 'Lỗi duyệt hàng loạt', 'error');
    } finally {
       setIsSubmittingBatch(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredRequests.map((req, index) => ({
       'STT': index + 1,
       'Mã Phiếu': req.id,
       'Thời gian lập': new Date(req.createdAt).toLocaleString('vi-VN'),
       'Người đề xuất': req.requester?.fullName || '',
       'Bộ phận': req.department,
       'Loại Phiếu': req.requestType,
       'Mức ưu tiên': req.priority,
       'Lý do': req.purpose,
       'Trạng thái': req.status
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Phieu");
    XLSX.writeFile(wb, `Danh_Sach_Phieu_VPP_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-8 relative print:p-0">
      <div className="flex justify-between items-center mb-6 shrink-0 print:hidden">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Cổng Yêu cầu Cấp phát</h2>
           <p className="text-slate-500 font-medium text-sm mt-1">Quản lý duyệt luồng đa cấp, cấp phát và giao nhận.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={handleExportExcel} className="flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition font-bold shadow-sm">
               <Download className="w-5 h-5 mr-2 text-slate-400"/> Tải Excel
            </button>
            <button onClick={() => { setActiveRequest(null); setViewMode('CREATE'); }} className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-500/30">
               <Plus className="w-5 h-5 mr-2"/> Tạo Đề Xuất
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 shrink-0 print:hidden">
         <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mr-4"><FileText className="w-6 h-6 text-slate-600"/></div>
            <div>
               <p className="text-sm font-bold text-slate-500">Tổng số phiếu</p>
               <h3 className="text-2xl font-black text-slate-800">{stats.total}</h3>
            </div>
         </div>
         <div className="bg-white p-5 rounded-2xl shadow-sm border border-amber-200 relative overflow-hidden flex items-center">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mr-4"><Clock className="w-6 h-6 text-amber-500"/></div>
            <div>
               <p className="text-sm font-bold text-amber-700">Đang chờ duyệt</p>
               <h3 className="text-2xl font-black text-amber-600">{stats.pending}</h3>
            </div>
         </div>
         <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-200 flex items-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mr-4"><CheckCircle className="w-6 h-6 text-emerald-500"/></div>
            <div>
               <p className="text-sm font-bold text-emerald-700">Kho sẵn sàng cấp</p>
               <h3 className="text-2xl font-black text-emerald-600">{stats.approved}</h3>
            </div>
         </div>
         <div className="bg-white p-5 rounded-2xl shadow-sm border border-rose-200 flex items-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-rose-400"></div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center mr-4"><XCircle className="w-6 h-6 text-rose-500"/></div>
            <div>
               <p className="text-sm font-bold text-rose-700">Phiếu bị từ chối</p>
               <h3 className="text-2xl font-black text-rose-600">{stats.rejected}</h3>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.03)] border border-slate-200 flex flex-col flex-1 overflow-hidden print:border-none print:shadow-none">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col xl:flex-row gap-4 justify-between items-center print:hidden">
            <div className="flex flex-wrap gap-2 overflow-x-auto w-full xl:w-auto">
               <button onClick={() => setStatusFilter('ALL')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition ${statusFilter==='ALL'?'bg-indigo-600 text-white shadow-md':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>Tất cả</button>
               <button onClick={() => setStatusFilter('MY_ACTION')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition flex items-center relative ${statusFilter==='MY_ACTION'?'bg-amber-500 text-white shadow-md':'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'}`}>
                   Cần tôi xử lý <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping"></span><span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full"></span>
               </button>
               <button onClick={() => setStatusFilter('WAITING_HANDOVER')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${statusFilter==='WAITING_HANDOVER'?'bg-slate-700 text-white shadow-md':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>Chờ lấy hàng</button>
               <button onClick={() => setStatusFilter('COMPLETED')} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${statusFilter==='COMPLETED'?'bg-emerald-600 text-white shadow-md':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>Đã hoàn tất</button>
               <button onClick={() => setStatusFilter('DRAFT')} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${statusFilter==='DRAFT'?'bg-slate-700 text-white shadow-md':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>Lưu nháp</button>
            </div>
            <div className="relative w-full xl:w-80 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Tra mã phiếu, tên người lập..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm transition"
                />
            </div>
            {(currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN') && selectedIds.length > 0 && (
                <button 
                  disabled={isSubmittingBatch}
                  onClick={handleBatchApprove}
                  className="shrink-0 flex items-center px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition disabled:opacity-70"
                >
                  {isSubmittingBatch ? <StopCircle className="w-5 h-5 mr-2 animate-spin"/> : <CheckSquare className="w-5 h-5 mr-2"/>} Duyệt {selectedIds.length} phiếu
                </button>
            )}
        </div>

        <div className="flex-1 overflow-auto relative">
            <table className="w-full text-left whitespace-nowrap min-w-max">
                <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
                    <tr className="text-[11px] uppercase font-bold text-slate-400 tracking-widest bg-slate-50/80 backdrop-blur-sm">
                        {(currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN') && (
                           <th className="p-4 pl-6 w-12 text-center">
                              <input 
                                type="checkbox"
                                disabled={currentApprovableRequests.length === 0}
                                checked={selectedIds.length > 0 && selectedIds.length === currentApprovableRequests.length}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                           </th>
                        )}
                        <th className={`p-4 ${(currentUser.role !== 'MANAGER' && currentUser.role !== 'ADMIN') ? 'pl-6' : ''}`}>Mã YC</th>
                        <th className="p-4">Ngày tạo / SLA</th>
                        <th className="p-4">Thông tin</th>
                        <th className="p-4">Mục đích (Rút gọn)</th>
                        <th className="p-4 text-center">Trạng thái flow</th>
                        <th className="p-4 text-right pr-6">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {currentData.length === 0 ? (
                        <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-medium">Không tìm thấy yêu cầu nào phù hợp.</td></tr>
                    ) : (
                        currentData.map(req => {
                            const actName = getActionName(req);
                            const isActionable = actName !== 'Chi tiết';
                            const sla = getSlaStatus(req);
                            return (
                            <tr key={req.id} className={`hover:bg-indigo-50/30 transition-colors group ${selectedIds.includes(req.id) ? 'bg-indigo-50 border-indigo-200' : ''}`}>
                                {(currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN') && (
                                   <td className="p-4 pl-6 text-center">
                                      <input 
                                        type="checkbox"
                                        disabled={!isApprovable(req)}
                                        checked={selectedIds.includes(req.id)}
                                        onChange={() => toggleSelect(req.id)}
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                      />
                                   </td>
                                )}
                                <td className={`p-4 ${(currentUser.role !== 'MANAGER' && currentUser.role !== 'ADMIN') ? 'pl-6' : ''}`}>
                                    <span className="font-extrabold text-indigo-700">{req.id}</span>
                                    {req.priority === 'Khẩn cấp' && <span className="ml-2 inline-flex animate-pulse items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white uppercase tracking-wider">Khẩn</span>}
                                </td>
                                <td className="p-4">
                                    <p className="font-bold text-slate-700 text-sm">{new Date(req.createdAt).toLocaleDateString('vi-VN')} <span className="text-xs font-normal text-slate-400 ml-1">{new Date(req.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span></p>
                                    {sla && <p className={`text-[10px] uppercase font-black tracking-widest mt-1 ${sla==='Trong hạn'?'text-emerald-500':'text-rose-600 bg-rose-50 inline-block px-1 rounded'}`}>{sla}</p>}
                                </td>
                                <td className="p-4">
                                    <p className="font-bold text-slate-800 text-sm">{req.requester?.fullName}</p>
                                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{req.department}</p>
                                </td>
                                <td className="p-4">
                                    <p className="text-slate-600 font-medium text-sm truncate max-w-[200px]" title={req.purpose}>{req.purpose || <span className="italic text-slate-400">Không có lý do</span>}</p>
                                    <p className="text-[11px] font-bold text-slate-400 mt-1">{req.lines?.length || 0} mục yêu cầu</p>
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border inline-block uppercase tracking-wider ${getStatusColor(req.status)}`}>{req.status.replace(/_/g, ' ')}</span>
                                </td>
                                <td className="p-4 pr-6 text-right">
                                    <button 
                                        onClick={() => { setActiveRequest(req); setViewMode('VIEW'); }} 
                                        className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-all flex items-center justify-end w-full max-w-max ml-auto opacity-80 hover:opacity-100 ${isActionable ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 ring-2 ring-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                        {isActionable ? <span className="w-1.5 h-1.5 bg-white rounded-full mr-2 animate-pulse"></span> : <Eye className="w-4 h-4 mr-1.5"/>}
                                        {actName}
                                    </button>
                                </td>
                            </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>

        {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center print:hidden shrink-0">
                <span className="text-sm font-medium text-slate-500">Hiển thị {currentData.length} / {filteredRequests.length}</span>
                <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <button disabled={currentPage===1} onClick={()=>setCurrentPage(c=>Math.max(1,c-1))} className="p-2 hover:bg-slate-50 disabled:opacity-50 border-r border-slate-200"><ChevronLeft className="w-5 h-5 text-slate-600"/></button>
                    <span className="px-4 py-2 text-sm font-bold text-slate-700">Trang {currentPage} / {totalPages}</span>
                    <button disabled={currentPage===totalPages} onClick={()=>setCurrentPage(c=>Math.min(totalPages,c+1))} className="p-2 hover:bg-slate-50 disabled:opacity-50 border-l border-slate-200"><ChevronRight className="w-5 h-5 text-slate-600"/></button>
                </div>
            </div>
        )}
      </div>
    </div>
  )
}
