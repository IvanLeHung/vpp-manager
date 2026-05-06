import { useState, useMemo, useEffect } from 'react';
import { Plus, Download, Search, FileText, CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight, Eye, CheckSquare, GitBranch, Printer, ListChecks, ChevronDown, RotateCcw, FileSpreadsheet, CornerUpLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { VPPRequest, User } from '../../context/AppContext';
import { useAppContext } from '../../context/AppContext';
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

function getItemSortGroupName(itemName: string) {
  if (!itemName) return '';
  return itemName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(a4|a5|a3|den|xanh|do|be|to|nho|lon)\b/g, "")
    .replace(/\b\d+(\.\d+)?\s*(ml|l|kg|g|cm|mm|m)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sortItemsForPrinting(items: any[]) {
  return [...items].sort((a, b) => {
    const groupA = a.printSortGroup || getItemSortGroupName(a.name || '');
    const groupB = b.printSortGroup || getItemSortGroupName(b.name || '');
    if (groupA !== groupB) return groupA.localeCompare(groupB, "vi");
    if (a.name !== b.name) return (a.name || '').localeCompare(b.name || '', "vi");
    return (a.mvpp || '').localeCompare(b.mvpp || '', "vi");
  });
}

export default function RequestsList({ requests, currentUser, setViewMode, setActiveRequest, refreshData, showToast }: Props) {
  const { items: masterItems } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedPrintType, setSelectedPrintType] = useState<'ALL' | 'VPP' | 'VE_SINH'>('ALL');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [previewReq, setPreviewReq] = useState<VPPRequest | null>(null);
  const itemsPerPage = 15;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'APPROVED': case 'READY_TO_ISSUE': case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'REJECTED': case 'CANCELLED': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'DRAFT': return 'bg-slate-200 text-slate-700 border-slate-300';
      case 'PARTIALLY_ISSUED': case 'PARTIALLY_APPROVED': 
      case 'PARTIAL_TBP_APPROVED': case 'PARTIAL_ADMIN_APPROVED':
        return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'RETURNED': case 'NEED_REVISION': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'WAITING_HANDOVER': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PENDING_MANAGER': case 'PENDING_ADMIN': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'TBP_APPROVED': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'BACKORDER': return 'bg-slate-100 text-slate-800 border-slate-300 shadow-sm';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const currentUid = currentUser.userId || currentUser.id;

  const filteredRequests = useMemo(() => {
    let filtered = requests;
    if (currentUser.role === 'EMPLOYEE') {
        filtered = filtered.filter(req => req.requesterId === currentUid || req.requester?.fullName === currentUser.name);
    }
    
    if (statusFilters.length > 0) {
        if (statusFilters.includes('MY_ACTION')) {
            // MY_ACTION logic
            const myActionReqs = requests.filter(r => {
                if (currentUser.role === 'MANAGER') return r.currentApproverId === currentUid;
                if (currentUser.role === 'ADMIN') return r.currentApproverId === currentUid || r.status === 'PENDING_ADMIN' || r.status === 'PENDING_MANAGER';
                if (currentUser.role === 'WAREHOUSE') return r.status === 'READY_TO_ISSUE';
                return r.status === 'WAITING_HANDOVER';
            });
            
            if (statusFilters.length === 1) {
                filtered = myActionReqs;
            } else {
                // Combine MY_ACTION with other explicit status filters
                const otherStatuses = statusFilters.filter(s => s !== 'MY_ACTION');
                filtered = filtered.filter(r => otherStatuses.includes(r.status) || myActionReqs.some(mar => mar.id === r.id));
            }
        } else {
            filtered = filtered.filter(r => statusFilters.includes(r.status));
        }
    }

    if (deptFilter !== 'ALL') {
        filtered = filtered.filter(r => r.department === deptFilter);
    }

    if (priorityFilter !== 'ALL') {
        filtered = filtered.filter(r => r.priority === priorityFilter);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        (r.id?.toLowerCase().includes(lower)) || 
        (r.requester?.fullName?.toLowerCase().includes(lower)) ||
        (r.purpose?.toLowerCase().includes(lower)) ||
        (r.department?.toLowerCase().includes(lower))
      );
    }
    return filtered.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests, statusFilters, deptFilter, priorityFilter, searchTerm, currentUser]);

  // Handle row selection changes when data changes
  useEffect(() => {
    setSelectedIds([]);
  }, [statusFilters, searchTerm]);

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


  const getActionName = (req: VPPRequest) => {
      if (currentUser.role === 'MANAGER' && req.status === 'PENDING_MANAGER' && req.currentApproverId === currentUid) return 'Duyệt (BP)';
      if (currentUser.role === 'ADMIN' && (req.status === 'PENDING_ADMIN' || req.status === 'PENDING_MANAGER')) return 'Duyệt (HChính)';
      if (currentUser.role === 'WAREHOUSE' && req.status === 'READY_TO_ISSUE') return 'Xuất Kho';
      if (currentUid === req.requesterId && req.status === 'WAITING_HANDOVER') return 'Xác nhận Bàn giao';
      if (currentUid === req.requesterId && (req.status === 'DRAFT' || req.status === 'RETURNED' || req.status === 'NEED_REVISION')) return 'Chỉnh sửa';
      return 'Chi tiết';
  };

  const isApprovable = (req: VPPRequest) => {
    if (currentUser.role === 'MANAGER' && req.status === 'PENDING_MANAGER' && req.currentApproverId === currentUid) return true;
    if (currentUser.role === 'ADMIN' && (req.status === 'PENDING_MANAGER' || req.status === 'PENDING_ADMIN')) return true;
    return false;
  };


  const toggleSelectAll = () => {
     if (selectedIds.length === currentData.length && currentData.length !== 0) {
        setSelectedIds([]);
     } else {
        setSelectedIds(currentData.map(r => r.id));
     }
  };

  const selectAllFiltered = () => {
    setSelectedIds(filteredRequests.map(r => r.id));
    setShowHeaderMenu(false);
  };

  const selectByStatus = (status: string) => {
    setSelectedIds(filteredRequests.filter(r => r.status === status).map(r => r.id));
    setShowHeaderMenu(false);
  };

  const toggleSelect = (id: string) => {
     setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleBulkMode = () => {
    if (isBulkMode && selectedIds.length > 0) {
      if (window.confirm(`Bạn đang chọn ${selectedIds.length} phiếu. Ẩn ô chọn sẽ bỏ chọn tất cả phiếu. Bạn có muốn tiếp tục?`)) {
        setSelectedIds([]);
        setIsBulkMode(false);
      }
    } else {
      setIsBulkMode(!isBulkMode);
      if (!isBulkMode) setSelectedIds([]);
    }
  };


  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Xác nhận duyệt ${selectedIds.length} phiếu đã chọn?`)) return;
    
    try {
       setIsSubmittingBatch(true);
       await api.post('/requests/batch/approve', { requestIds: selectedIds });
       showToast(`Đã duyệt thành công ${selectedIds.length} phiếu!`);
       setSelectedIds([]);
       setIsBulkMode(false);
       await refreshData();
    } catch (err: any) {
       showToast(err.response?.data?.error || 'Lỗi duyệt hàng loạt', 'error');
    } finally {
       setIsSubmittingBatch(false);
    }
  };

  const handleBatchReject = async () => {
    const reason = prompt(`Nhập lý do từ chối cho ${selectedIds.length} phiếu:`);
    if (reason === null) return;
    if (!reason.trim()) return showToast('Bắt buộc nhập lý do từ chối', 'warning');

    try {
      setIsSubmittingBatch(true);
      await api.post('/requests/batch/reject', { requestIds: selectedIds, reason });
      showToast(`Đã từ chối ${selectedIds.length} phiếu!`);
      setSelectedIds([]);
      setIsBulkMode(false);
      await refreshData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi từ chối hàng loạt', 'error');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const handleBatchReturn = async () => {
    const reason = prompt(`Nhập lý do trả lại cho ${selectedIds.length} phiếu:`);
    if (reason === null) return;
    if (!reason.trim()) return showToast('Bắt buộc nhập lý do trả lại', 'warning');

    try {
      setIsSubmittingBatch(true);
      await api.post('/requests/batch/return', { requestIds: selectedIds, reason });
      showToast(`Đã trả lại ${selectedIds.length} phiếu!`);
      setSelectedIds([]);
      setIsBulkMode(false);
      await refreshData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi trả lại hàng loạt', 'error');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const handleExportExcel = () => {
    const targetRequests = selectedIds.length > 0 
      ? requests.filter(r => selectedIds.includes(r.id))
      : filteredRequests;

    const exportData = targetRequests.map((req, index) => ({
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

  const summaryGroups = useMemo(() => {
    const groups = new Map<string, Map<string, any>>();
    const unclassified: string[] = [];

    const targetRequests = selectedIds.length > 0 
      ? requests.filter(r => selectedIds.includes(r.id))
      : filteredRequests;

    targetRequests.forEach(req => {
        if (['REJECTED', 'CANCELLED', 'COMPLETED'].includes(req.status)) return;
        
        req.lines?.forEach((line: any) => {
            if (!line.item) return;
            const mvpp = line.item.mvpp || '';
            
            // Cross-reference with master goods category for accurate classification
            const masterItem = masterItems.find(i => i.mvpp === mvpp);
            let type = masterItem?.itemType || line.item.itemType || 'UNKNOWN';
            
            // Fallback to prefix if still unknown
            if (type === 'UNKNOWN') {
                if (mvpp.startsWith('VPP')) type = 'VPP';
                else if (mvpp.startsWith('VS')) type = 'VE_SINH';
            }

            if (type === 'UNKNOWN' && !unclassified.includes(line.item.name)) unclassified.push(line.item.name);

            if (!groups.has(type)) groups.set(type, new Map());
            const typeMap = groups.get(type)!;
            
            const key = line.item.mvpp;
            const current = typeMap.get(key) || {
                mvpp: line.item.mvpp,
                name: line.item.name,
                unit: line.item.unit,
                price: line.item.price || 0,
                qtyRequested: 0,
                qtyDelivered: 0,
                deptBreakdown: new Map<string, { qty: number, notes: string[] }>(),
                printSortGroup: (masterItem as any)?.printSortGroup || (line.item as any).printSortGroup
            };
            
            const pendingQty = (line.qtyApproved ?? line.qtyRequested) - (line.qtyDelivered || 0);
            if (pendingQty > 0) {
              const deptName = req.department || 'Khác';
              const existingDept = current.deptBreakdown.get(deptName) || { qty: 0, notes: [], replacements: [] };
              existingDept.qty += pendingQty;
              if (line.note && line.note.trim() && !existingDept.notes.includes(line.note)) {
                existingDept.notes.push(line.note);
              }
              if (line.replacementItemId) {
                existingDept.replacements.push({
                  name: line.replacementItem?.name || 'Vật tư thay thế',
                  qty: line.replacementQty,
                  price: line.replacementPrice,
                  reason: line.replacementReason,
                  status: line.status
                });
              }
              current.deptBreakdown.set(deptName, existingDept);
            }

            current.qtyRequested += (line.qtyApproved ?? line.qtyRequested);
            current.qtyDelivered += (line.qtyDelivered || 0);
            
            if (line.note && line.note.trim()) {
              // Note already handled in deptBreakdown
            }
            
            typeMap.set(key, current);
        });
    });

    return {
        groups: Array.from(groups.entries()).map(([type, itemsMap]) => ({
            type,
            label: (type.toUpperCase() === 'VPP') ? 'VĂN PHÒNG PHẨM' : 
                   (type.toUpperCase() === 'VE_SINH') ? 'VỆ SINH' : 'HÀNG HÓA KHÁC',
            items: sortItemsForPrinting(Array.from(itemsMap.values())
                .filter(i => (i.qtyRequested - i.qtyDelivered) > 0)
                .map(item => ({
                    ...item,
                    deptEntries: (Array.from(item.deptBreakdown.entries()) as [string, any][])
                      .map(([dept, data]) => ({
                        dept,
                        qty: data.qty,
                        note: data.notes.join('; '),
                        replacements: data.replacements
                      }))
                      .sort((a: any, b: any) => b.qty - a.qty)
                })))
        })).filter(g => g.items.length > 0),
        unclassified
    };
  }, [requests, filteredRequests, selectedIds, masterItems]);

  const handlePrintSummary = (type: 'ALL' | 'VPP' | 'VE_SINH' = 'ALL') => {
    setSelectedPrintType(type);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportSummaryExcel = () => {
    if (summaryGroups.groups.length === 0) {
        return showToast('Không có vật tư nào cần tổng hợp cấp phát.', 'warning');
    }
    
    const wb = XLSX.utils.book_new();
    
    summaryGroups.groups.forEach(group => {
        const exportData = group.items.map((item, index) => ({
            'STT': index + 1,
            'Mã Vật Tư': item.mvpp,
            'Tên Vật Tư': item.name,
            'Đơn Vị Tính': item.unit,
            'Đơn Giá': item.price,
            'Tổng Cầu (Duyệt)': item.qtyRequested,
            'Đã Cấp': item.qtyDelivered,
            'Cần Xuất (Còn Nợ)': item.qtyRequested - item.qtyDelivered,
            'Thành Tiền': item.price * (item.qtyRequested - item.qtyDelivered)
        }));
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wscols = [
            {wch: 5}, {wch: 15}, {wch: 35}, {wch: 10}, {wch: 12}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 18}
        ];
        ws['!cols'] = wscols;
        XLSX.utils.book_append_sheet(wb, ws, group.label.slice(0, 31));
    });

    XLSX.writeFile(wb, `Tong_Hop_Con_No_${new Date().toISOString().slice(0,10)}.xlsx`);
  };



  return (
    <div className="flex flex-col h-full p-4 md:p-8 relative print:p-0 print:h-auto print:block">
      <div className="no-print flex justify-between items-center mb-6 shrink-0">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">
             {currentUser.role === 'EMPLOYEE' ? 'Yêu cầu của tôi' : 'Cổng Yêu cầu Cấp phát'}
           </h2>
           <p className="text-slate-500 font-medium text-sm mt-1">
             {currentUser.role === 'EMPLOYEE' 
               ? 'Theo dõi các yêu cầu cấp phát văn phòng phẩm và đồ dùng nội bộ của bạn.' 
               : 'Quản lý duyệt luồng đa cấp, cấp phát và giao nhận.'}
           </p>
        </div>
        <div className="flex gap-3">
            {currentUser.role !== 'EMPLOYEE' && (
              <div className="flex gap-2">
                  <button onClick={handleExportExcel} className="flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition font-bold shadow-sm">
                    <Download className="w-5 h-5 mr-1.5 text-slate-400"/> Tải Excel
                  </button>
                  <button onClick={handleExportSummaryExcel} className="flex items-center px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-100 transition font-bold shadow-sm">
                    <FileText className="w-5 h-5 mr-1.5 text-emerald-500"/> Excel Tổng Hợp (Owed)
                  </button>
                   <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <button 
                        onClick={() => handlePrintSummary('VPP')} 
                        className="flex items-center px-4 py-2.5 text-indigo-700 hover:bg-indigo-50 border-r border-slate-100 transition font-bold"
                        title="In tổng hợp đồ Văn phòng phẩm"
                      >
                        <Printer className="w-5 h-5 mr-1.5 text-indigo-400"/> In VPP
                      </button>
                      <button 
                        onClick={() => handlePrintSummary('VE_SINH')} 
                        className="flex items-center px-4 py-2.5 text-cyan-700 hover:bg-cyan-50 transition font-bold"
                        title="In tổng hợp đồ Vệ sinh"
                      >
                        <Printer className="w-5 h-5 mr-1.5 text-cyan-400"/> In Vệ sinh
                      </button>
                   </div>
              </div>
            )}
            <button onClick={() => { setActiveRequest(null); setViewMode('CREATE'); }} className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-500/30">
               <Plus className="w-5 h-5 mr-2"/> {currentUser.role === 'EMPLOYEE' ? 'Tạo yêu cầu' : 'Tạo Đề Xuất'}
            </button>
        </div>
      </div>

      <div className="no-print grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 shrink-0">
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

      {/* SPLIT PANEL */}
      <div className="no-print flex flex-1 gap-4 overflow-hidden">
        {/* LEFT: Request List */}
        <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" style={{width: previewReq ? '55%' : '100%', transition: 'width 0.3s'}}>
          <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex flex-col xl:flex-row gap-3 justify-between items-center">
            <div className="flex flex-wrap gap-1.5 overflow-x-auto w-full xl:w-auto">
               <button onClick={() => setStatusFilters([])} className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition ${statusFilters.length === 0 ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>Tất cả</button>
               <button onClick={() => setStatusFilters(['MY_ACTION'])} className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition flex items-center relative ${statusFilters.includes('MY_ACTION') ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'}`}>Cần xử lý <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span><span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full"></span></button>
               <button onClick={() => setStatusFilters(['COMPLETED'])} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${statusFilters.includes('COMPLETED') && statusFilters.length === 1 ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>Hoàn tất</button>
               <button onClick={() => setStatusFilters(['DRAFT'])} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${statusFilters.includes('DRAFT') && statusFilters.length === 1 ? 'bg-slate-700 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>Nháp</button>
               <button onClick={() => setViewMode('WORKFLOW')} className="px-3 py-1.5 rounded-lg font-bold text-xs transition bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" /> QUY TRÌNH</button>
            </div>
            <div className="flex items-center gap-2 w-full xl:w-auto">
                <div className="relative flex-1 xl:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Tra mã phiếu..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm transition" />
                </div>
                <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 ${showAdvancedFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                   <ListChecks className="w-4 h-4" /> 
                   Bộ lọc
                   {(deptFilter !== 'ALL' || priorityFilter !== 'ALL') && <span className="w-2 h-2 bg-rose-500 rounded-full"></span>}
                </button>
                {(currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN') && (
                  <button 
                    onClick={toggleBulkMode}
                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition ${isBulkMode ? 'bg-rose-50 border border-rose-200 text-rose-600' : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {isBulkMode ? <XCircle className="w-4 h-4"/> : <CheckSquare className="w-4 h-4"/>}
                    {isBulkMode ? 'Ẩn ô chọn' : 'Chọn nhiều'}
                  </button>
                )}
            </div>
          </div>
          {showAdvancedFilters && (
             <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
                 <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lọc theo trạng thái phiếu (Chọn nhiều)</label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                      {[
                        { val: 'MY_ACTION', lab: '🚩 Cần xử lý', color: 'amber' },
                        { val: 'BACKORDER', lab: '📦 Backorder (Nợ)', color: 'slate' },
                        { val: 'PENDING_MANAGER', lab: '⏳ Chờ QL BP', color: 'amber' },
                        { val: 'PENDING_ADMIN', lab: '⏳ Chờ Hành chính', color: 'amber' },
                        { val: 'APPROVED', lab: '✅ Đã duyệt', color: 'emerald' },
                        { val: 'READY_TO_ISSUE', lab: '🚚 Sẵn sàng xuất', color: 'emerald' },
                        { val: 'COMPLETED', lab: '🏁 Hoàn thành', color: 'emerald' },
                        { val: 'REJECTED', lab: '❌ Từ chối', color: 'rose' },
                        { val: 'RETURNED', lab: '↩️ Trả lại', color: 'orange' },
                        { val: 'DRAFT', lab: '📝 Bản nháp', color: 'slate' }
                      ].map(st => (
                        <button 
                          key={st.val}
                          onClick={() => {
                            setStatusFilters(prev => 
                              prev.includes(st.val) ? prev.filter(v => v !== st.val) : [...prev, st.val]
                            );
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 ${
                            statusFilters.includes(st.val) 
                              ? `bg-${st.color}-600 border-${st.color}-600 text-white shadow-md` 
                              : `bg-white border-slate-200 text-slate-600 hover:bg-slate-50`
                          }`}
                        >
                          {statusFilters.includes(st.val) && <CheckSquare className="w-3.5 h-3.5" />}
                          {st.lab}
                        </button>
                      ))}
                      {statusFilters.length > 0 && (
                        <button 
                          onClick={() => setStatusFilters([])}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-[11px] font-black uppercase hover:bg-rose-100 transition"
                        >
                          Xóa chọn
                        </button>
                      )}
                    </div>
                 </div>
                 
                 <div className="flex flex-wrap gap-6 border-t border-slate-100 pt-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Phòng ban</label>
                        <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setCurrentPage(1); }} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none min-w-[200px] hover:bg-slate-100 transition"><option value="ALL">Tất cả phòng ban</option>{Array.from(new Set(requests.map(r => r.department).filter(Boolean))).sort().map(d => <option key={d} value={d}>{d}</option>)}</select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Mức độ ưu tiên</label>
                        <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setCurrentPage(1); }} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none min-w-[150px] hover:bg-slate-100 transition"><option value="ALL">Tất cả mức độ</option><option value="Bình thường">Bình thường</option><option value="Khẩn cấp">Khẩn cấp</option></select>
                    </div>
                    <div className="flex items-end pb-0.5 ml-auto">
                        <button onClick={() => { setDeptFilter('ALL'); setPriorityFilter('ALL'); setSearchTerm(''); setStatusFilters([]); setCurrentPage(1); }} className="text-[10px] font-black text-rose-500 uppercase hover:text-rose-600 flex items-center gap-1">
                          <RotateCcw className="w-3.5 h-3.5"/> Đặt lại tất cả
                        </button>
                    </div>
                 </div>
             </div>
          )}
          {/* Batch actions redesigned */}
          {(currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN') && selectedIds.length > 0 && isBulkMode && (
            <div className="px-6 py-3 bg-indigo-600 text-white flex flex-col md:flex-row justify-between items-center gap-4 animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-4">
                <span className="text-sm font-black tracking-tight">{selectedIds.length} phiếu đã chọn</span>
                <div className="h-4 w-[1px] bg-white/20"></div>
                <button onClick={() => setSelectedIds([])} className="text-xs font-bold hover:underline flex items-center gap-1.5 opacity-90 hover:opacity-100">
                  <RotateCcw className="w-3.5 h-3.5"/> Bỏ chọn tất cả
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedIds.every(id => isApprovable(requests.find(r => r.id === id)!)) && (
                  <button disabled={isSubmittingBatch} onClick={handleBatchApprove} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition shadow-sm">
                    <CheckSquare className="w-3.5 h-3.5"/> Duyệt hàng loạt
                  </button>
                )}
                <button disabled={isSubmittingBatch} onClick={handleBatchReturn} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white font-black rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition shadow-sm">
                  <CornerUpLeft className="w-3.5 h-3.5"/> Trả lại sửa
                </button>
                <button disabled={isSubmittingBatch} onClick={handleBatchReject} className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white font-black rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition shadow-sm">
                  <XCircle className="w-3.5 h-3.5"/> Từ chối
                </button>
                <button onClick={handleExportExcel} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-black rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition">
                  <FileSpreadsheet className="w-3.5 h-3.5"/> Xuất Excel
                </button>
                <button onClick={() => window.print()} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-black rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition">
                  <Printer className="w-3.5 h-3.5"/> In phiếu
                </button>
                <div className="h-4 w-[1px] bg-white/20 mx-1"></div>
                <button onClick={toggleBulkMode} className="p-1.5 hover:bg-white/10 rounded-lg transition" title="Ẩn ô chọn">
                  <XCircle className="w-4 h-4"/>
                </button>
              </div>
            </div>
          )}
          {/* Table */}
          <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
                      <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-widest bg-slate-50/80">
                          {isBulkMode && (
                            <th className="p-3 pl-4 w-12 text-center relative">
                               <div className="flex items-center justify-center gap-1">
                                  <input 
                                    type="checkbox" 
                                    disabled={currentData.length === 0} 
                                    checked={selectedIds.length > 0 && currentData.every(r => selectedIds.includes(r.id))} 
                                    onChange={toggleSelectAll} 
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer" 
                                  />
                                  <button onClick={() => setShowHeaderMenu(!showHeaderMenu)} className="p-0.5 hover:bg-slate-200 rounded transition">
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                               </div>

                               {showHeaderMenu && (
                                 <>
                                   <div className="fixed inset-0 z-20" onClick={() => setShowHeaderMenu(false)}></div>
                                   <div className="absolute top-full left-4 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-2 text-left normal-case tracking-normal">
                                      <button onClick={() => { toggleSelectAll(); setShowHeaderMenu(false); }} className="w-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between">
                                        Chọn trang hiện tại <span className="text-[10px] text-slate-400">{currentData.length}</span>
                                      </button>
                                      <button onClick={selectAllFiltered} className="w-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                                        Chọn tất cả phiếu <span className="text-[10px] text-slate-400">{filteredRequests.length}</span>
                                      </button>
                                      <button onClick={() => selectByStatus('PENDING_ADMIN')} className="w-full px-4 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div> Chỉ chọn Pending Admin
                                      </button>
                                      <button onClick={() => selectByStatus('DRAFT')} className="w-full px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div> Chỉ chọn Draft
                                      </button>
                                      <button onClick={() => { setSelectedIds([]); setShowHeaderMenu(false); }} className="w-full px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2 mt-1 border-t border-slate-100 pt-2">
                                        <RotateCcw className="w-3 h-3"/> Bỏ chọn tất cả
                                      </button>
                                   </div>
                                 </>
                               )}
                            </th>
                          )}
                          <th className={`p-3 ${!isBulkMode ? 'pl-6' : ''}`}>Mã phiếu</th>
                          <th className="p-3">Người đề xuất</th>
                          <th className="p-3 text-center w-14">Mục</th>
                          <th className="p-3 text-center">Trạng thái</th>
                          <th className="p-3 text-right pr-4 w-28">Thao tác</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {currentData.length === 0 ? (
                          <tr><td colSpan={6} className="p-10 text-center text-slate-400 font-medium text-sm">Không tìm thấy yêu cầu nào.</td></tr>
                      ) : currentData.map(req => {
                          const actName = getActionName(req);
                          const isActionable = actName !== 'Chi tiết';
                          const isPreviewing = previewReq?.id === req.id;
                          return (
                          <tr key={req.id} onClick={() => setPreviewReq(isPreviewing ? null : req)}
                            className={`transition-all cursor-pointer group ${isPreviewing ? 'bg-indigo-50 border-l-[3px] border-l-indigo-500' : 'hover:bg-slate-50/70 border-l-[3px] border-l-transparent'}`}>
                              {isBulkMode && (
                                 <td className="p-3 pl-4 text-center" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-center">
                                      <input 
                                        type="checkbox" 
                                        checked={selectedIds.includes(req.id)} 
                                        onChange={() => toggleSelect(req.id)} 
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer transition-all" 
                                      />
                                    </div>
                                 </td>
                              )}
                              <td className={`p-3 ${!isBulkMode ? 'pl-6' : ''}`}>
                                  <button onClick={e => { e.stopPropagation(); setActiveRequest(req); setViewMode('VIEW'); }} className="font-extrabold text-indigo-700 hover:text-indigo-900 hover:underline text-xs text-left">{req.id}</button>
                                  {req.priority === 'Khẩn cấp' && <span className="ml-1 inline-flex animate-pulse px-1 py-0.5 rounded text-[8px] font-bold bg-rose-500 text-white uppercase">Khẩn</span>}
                                  <p className="text-[10px] text-slate-400 mt-0.5">{new Date(req.createdAt).toLocaleDateString('vi-VN')} {new Date(req.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'})}</p>
                              </td>
                              <td className="p-3">
                                  <p className="font-bold text-slate-800 text-xs">{req.requester?.fullName}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold">{req.department}</p>
                              </td>
                              <td className="p-3 text-center"><span className="text-xs font-black text-slate-600">{req.lines?.length || 0}</span></td>
                              <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${getStatusColor(req.status)}`}>{req.status.replace(/_/g,' ')}</span></td>
                              <td className="p-3 pr-4 text-right" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => { setActiveRequest(req); actName === 'Chỉnh sửa' ? setViewMode('CREATE') : setViewMode('VIEW'); }}
                                    className={`px-2 py-1 rounded-lg font-bold text-[11px] inline-flex items-center ${isActionable ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                    {isActionable ? <span className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></span> : <Eye className="w-3 h-3 mr-1"/>}{actName}
                                  </button>
                              </td>
                          </tr>);
                      })}
                  </tbody>
              </table>
          </div>
          {totalPages > 1 && (
              <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                  <span className="text-xs font-medium text-slate-500">{currentData.length}/{filteredRequests.length}</span>
                  <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                      <button disabled={currentPage===1} onClick={()=>setCurrentPage(c=>Math.max(1,c-1))} className="p-1.5 hover:bg-slate-50 disabled:opacity-50 border-r border-slate-200"><ChevronLeft className="w-4 h-4 text-slate-600"/></button>
                      <span className="px-3 py-1.5 text-xs font-bold text-slate-700">{currentPage}/{totalPages}</span>
                      <button disabled={currentPage===totalPages} onClick={()=>setCurrentPage(c=>Math.min(totalPages,c+1))} className="p-1.5 hover:bg-slate-50 disabled:opacity-50 border-l border-slate-200"><ChevronRight className="w-4 h-4 text-slate-600"/></button>
                  </div>
              </div>
          )}
        </div>

        {/* RIGHT: Item Detail Panel */}
        {previewReq && (() => {
          const actName = getActionName(previewReq);
          const isActionable = actName !== 'Chi tiết';
          return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden" style={{width:'45%'}}>
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-slate-50 flex justify-between items-start shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-black text-indigo-700">{previewReq.id}</h3>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${getStatusColor(previewReq.status)}`}>{previewReq.status.replace(/_/g,' ')}</span>
                </div>
                <p className="text-xs font-semibold text-slate-600">{previewReq.requester?.fullName} • {previewReq.department}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate" title={previewReq.purpose}>{previewReq.purpose || 'Không có lý do'}</p>
              </div>
              <button onClick={() => setPreviewReq(null)} className="p-1.5 hover:bg-white rounded-lg transition ml-2 shrink-0"><XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr className="text-[9px] uppercase font-black text-slate-400 tracking-widest">
                    <th className="px-4 py-2.5 text-center w-10">STT</th>
                    <th className="px-4 py-2.5">Tên Vật tư / Hàng hóa</th>
                    <th className="px-4 py-2.5 text-center w-20">SL Yêu cầu</th>
                    <th className="px-4 py-2.5 text-center w-14">ĐVT</th>
                    <th className="px-4 py-2.5 text-right w-24">Đơn giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(previewReq.lines || []).map((line: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 text-center text-xs font-bold text-slate-400">{idx+1}</td>
                      <td className="px-4 py-2.5"><p className="font-bold text-slate-800 text-sm whitespace-normal leading-snug">{line.item?.name || 'N/A'}</p><span className="text-[9px] font-black text-slate-400 tracking-wider">{line.item?.mvpp || '—'}</span></td>
                      <td className="px-4 py-2.5 text-center"><span className="font-black text-base text-indigo-600">{line.qtyRequested}</span></td>
                      <td className="px-4 py-2.5 text-center text-xs font-bold text-slate-500">{line.item?.unit || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-600">{line.item?.price ? Number(line.item.price).toLocaleString('vi-VN') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 flex justify-between items-center">
              <div className="flex gap-5">
                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hạng mục</p><p className="text-lg font-black text-slate-800">{previewReq.lines?.length || 0}</p></div>
                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tổng SL</p><p className="text-lg font-black text-indigo-600">{(previewReq.lines||[]).reduce((s:number,l:any)=>s+(l.qtyRequested||0),0)}</p></div>
              </div>
              <div className="flex gap-3">
                {isActionable && (
                  <button onClick={() => { setActiveRequest(previewReq); actName === 'Chỉnh sửa' ? setViewMode('CREATE') : setViewMode('VIEW'); }}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition shadow-md flex items-center gap-1.5 ${actName.includes('Duyệt') || actName.includes('Xuất') ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'}`}>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    {actName}
                  </button>
                )}
                <button onClick={() => { setActiveRequest(previewReq); setViewMode('VIEW'); }} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition flex items-center gap-1.5"><Eye className="w-4 h-4" /> Chi tiết</button>
              </div>
            </div>
          </div>
          );
        })()}
      </div>

      {/* FORMAL SUMMARY PRINT SECTION */}
       <div className="hidden print:block print-area">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            * { background-color: transparent !important; color-adjust: exact; -webkit-print-color-adjust: exact; }
            .print-sheet { font-family: "Times New Roman", Times, serif; color: #000 !important; background: #fff !important; }
            .print-table { width: 100%; border-collapse: collapse; table-layout: fixed; background: #fff !important; }
            .print-table th, .print-table td { 
              border: 0.7px solid #000 !important; 
              padding: 1.5px 3px !important; 
              vertical-align: middle; 
              line-height: 1.15;
              background: #fff !important;
              color: #000 !important;
            }
            .item-main-row td { font-size: 7.8pt !important; }
            .item-name { font-weight: 700 !important; }
            .item-bold { font-weight: 700 !important; }
            .item-regular { font-weight: 400 !important; }
            
            .allocation-header-row td {
              font-size: 7.2pt !important;
              font-weight: 700 !important;
              font-style: italic !important;
              background-color: #fff !important;
              color: #000 !important;
            }
            .allocation-row td {
              font-size: 7.5pt !important;
              font-weight: 400 !important;
              background-color: #fff !important;
              color: #000 !important;
            }
            .allocation-note {
              font-size: 7.2pt !important;
              font-style: italic !important;
              color: #000 !important;
            }
            .col-stt {
              width: 6% !important;
              white-space: nowrap !important;
              text-align: center !important;
            }
            .col-code { width: 15% !important; }
            .col-name { width: 30% !important; }
            .col-unit { width: 7% !important; }
            .col-qty { width: 9% !important; }
            .col-price { width: 13% !important; }
            .col-total { width: 20% !important; }
            
            .avoid-page-break {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}} />
        {summaryGroups.groups
          .filter(g => selectedPrintType === 'ALL' || g.type === selectedPrintType)
          .map((group, gIdx) => (
          <div key={group.type} className={`print-sheet text-black leading-tight p-4 bg-white ${gIdx > 0 ? 'page-break-before' : ''}`}>
              <div className="flex justify-between items-start mb-6 w-full print-header">
                  <div className="w-[40%] text-left">
                      <p className="font-bold text-[11pt] uppercase">CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO</p>
                      <p className="text-[9pt] italic mt-1 font-bold">Báo cáo tổng hợp tồn đọng cấp phát</p>
                      <p className="text-[8pt] text-black mt-1">Ban Hành chính - Quản trị</p>
                  </div>
                  <div className="w-[10%] flex flex-col items-center text-center">
                       <img 
                           src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent('https://vpp.danko.vn/requests')}`} 
                           alt="QR Code" 
                           className="w-10 h-10 border border-slate-100"
                       />
                   </div>
                  <div className="w-[50%] text-center">
                      <p className="text-[11pt] font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                      <p className="text-[10pt] font-bold underline decoration-[1px] underline-offset-[4px] mt-1">Độc lập - Tự do - Hạnh phúc</p>
                      <p className="text-[9pt] mt-3 italic text-right mr-10">Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
                  </div>
              </div>

           <div className="text-center mb-8">
               <h1 className="text-[13pt] font-bold uppercase tracking-wide">
                   PHIẾU TỔNG HỢP ĐỒ {group.label}
               </h1>
               <p className="text-[9pt] italic mt-1 text-black">
                 ({selectedIds.length > 0 
                   ? `Tổng hợp từ ${selectedIds.length} phiếu đã chọn` 
                   : `Tổng hợp từ ${filteredRequests.length} phiếu đang lọc`})
               </p>
           </div>

           <table className="print-table mb-8 bg-white">
               <thead>
                    <tr className="uppercase text-[7.8pt] font-bold text-center">
                        <th className="col-stt text-center">STT</th>
                        <th className="col-code text-center">Mã VT</th>
                        <th className="col-name text-center">Tên vật tư</th>
                        <th className="col-unit text-center">ĐVT</th>
                        <th className="col-qty text-center">Cần xuất</th>
                        <th className="col-price text-center">Đơn giá</th>
                        <th className="col-total text-center">Thành tiền</th>
                    </tr>
               </thead>
               {group.items.map((item, idx) => (
                 <tbody key={item.mvpp} className="avoid-page-break">
                    {/* Main Item Row */}
                    <tr className="item-main-row">
                        <td className="col-stt item-bold">{idx + 1}</td>
                        <td className="col-code text-center item-bold">{item.mvpp}</td>
                        <td className="text-left item-name">{item.name}</td>
                        <td className="text-center item-regular">{item.unit}</td>
                        <td className="text-center item-bold">{item.qtyRequested - item.qtyDelivered}</td>
                        <td className="text-right item-regular">{Number(item.price).toLocaleString('vi-VN')}</td>
                        <td className="text-right item-bold">{(Number(item.price) * (item.qtyRequested - item.qtyDelivered)).toLocaleString('vi-VN')}</td>
                    </tr>
                    {/* Department Sub-header */}
                    <tr className="allocation-header-row">
                        <td className="border-r-0"></td>
                        <td colSpan={3} className="text-left border-l-0">Phòng ban đề xuất</td>
                        <td className="text-center">Sl</td>
                        <td colSpan={2} className="text-left">Ghi chú</td>
                    </tr>
                    {/* Department Sub-rows */}
                    {item.deptEntries.map((de: any, i: number) => (
                      <tr key={i} className="allocation-row">
                          <td className="border-r-0"></td>
                          <td colSpan={3} className="text-left border-l-0 pl-4 text-black">
                            • {de.dept}
                          </td>
                          <td className="text-center font-bold">{de.qty}</td>
                          <td colSpan={2} className="allocation-note">
                            {de.note || '-'}
                            {de.replacements && de.replacements.length > 0 && (
                              <div className="mt-1 text-[7.2pt] border-t border-dotted border-black/30 pt-1 text-black">
                                {de.replacements.map((r:any, ri:number) => (
                                  <div key={ri} className="flex flex-col">
                                    <p className="font-bold">↳ THỰC TẾ MUA: {r.name}</p>
                                    <p className="font-normal text-[6.8pt] opacity-80 italic">Lý do: {r.reason} • {r.status === 'REPLACEMENT_PENDING_ADMIN' ? 'TRẠNG THÁI: CHỜ ADMIN DUYỆT' : 'TRẠNG THÁI: ĐÃ CHẤP THUẬN'}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                      </tr>
                    ))}
                 </tbody>
               ))}
               <tbody>
                    <tr className="font-bold text-[9pt]">
                        <td colSpan={4} className="p-1 text-right border border-black">Tổng cộng ({group.items.length} mặt hàng):</td>
                        <td className="p-1 text-center text-[11pt] border border-black">{group.items.reduce((s, i) => s + (i.qtyRequested - i.qtyDelivered), 0)}</td>
                        <td className="p-1 border border-black"></td>
                        <td className="p-1 text-right text-[11pt] border border-black">
                          {group.items.reduce((s, i) => s + (i.price * (i.qtyRequested - i.qtyDelivered)), 0).toLocaleString('vi-VN')} đ
                        </td>
                    </tr>
               </tbody>
           </table>

          {/* SIGNATURE SECTION */}
          <div className="mt-8 print-signatures avoid-page-break">
              <div className="grid grid-cols-2 gap-8 text-center text-[10pt] font-bold">
                  <div className="flex flex-col items-center">
                      <p className="uppercase mb-1 whitespace-nowrap">Người lập biểu</p>
                      <p className="text-[9pt] font-normal italic mb-4">(Ký và ghi họ tên)</p>
                      <div className="mt-16 border-t border-dotted border-black w-[70%] pt-2">
                         <p className="font-bold uppercase">{currentUser.name || '............................'}</p>
                         <p className="text-[8pt] font-normal text-black italic">Trích xuất: {new Date().toLocaleTimeString('vi-VN')}</p>
                      </div>
                  </div>
                  <div className="flex flex-col items-center">
                      <p className="uppercase mb-1 whitespace-nowrap">Phụ trách HC/KHO</p>
                      <p className="text-[9pt] font-normal italic mb-4">(Ký xác nhận)</p>
                      <div className="mt-16 border-t border-dotted border-black w-[70%] pt-2">
                         <p className="font-bold uppercase">............................</p>
                      </div>
                  </div>
              </div>
          </div>
          
          <div className="mt-auto pt-4 border-t border-black text-[8pt] text-black flex justify-between print-info">
              <p>Ngày in: {new Date().toLocaleString('vi-VN')} • VPP-Manager Dashboard</p>
              <p>Trang <span className="sheet-page-number"></span></p>
          </div>
        </div>
        ))}
      </div>
    </div>
  );
}