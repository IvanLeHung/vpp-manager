import { useState, useEffect } from 'react';
import { XCircle, Printer, CheckCircle, RefreshCw, ArrowLeft, Archive, CheckSquare, Trash2, StopCircle, AlertTriangle, ShoppingCart, Minus, Plus, Check, FileSpreadsheet, ChevronLeft, ChevronRight, Search, Filter, Package, History as HistoryIcon, Layers, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../lib/api';
import { GoodsNameWithPreview } from '../../components/GoodsNameWithPreview';
import LinkedDocumentReferences from '../../components/LinkedDocumentReferences';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DocumentChainMap from '../../components/DocumentChainMap';
import type { User } from '../../context/AppContext';
import type { ViewMode } from '../Requests';
import { Layout, Card, Table, Tooltip, Avatar } from 'antd';


interface Props {
  requestId: string;
  navigationIds?: string[];
  onNavigate?: (id: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveRequest?: (req: any) => void;
  refreshData: () => Promise<void>;
  showToast: (m: string, t?: 'success' | 'error' | 'warning') => void;
  currentUser: User;
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

function sortLinesForPrinting(lines: any[]) {
  return [...lines].sort((a, b) => {
    const itemA = a.item || {};
    const itemB = b.item || {};
    const groupA = itemA.printSortGroup || getItemSortGroupName(itemA.name || '');
    const groupB = itemB.printSortGroup || getItemSortGroupName(itemB.name || '');
    if (groupA !== groupB) return groupA.localeCompare(groupB, "vi");
    if (itemA.name !== itemB.name) return (itemA.name || '').localeCompare(itemB.name || '', "vi");
    return (itemA.mvpp || '').localeCompare(itemB.mvpp || '', "vi");
  });
}

interface InfoCardProps {
  label: string;
  value: React.ReactNode;
  subValue?: string;
  tone?: 'green' | 'blue' | 'rose' | 'violet' | 'slate';
  isTooltip?: boolean;
  tooltipText?: string;
}

function InfoCard({ label, value, subValue, tone, isTooltip, tooltipText }: InfoCardProps) {
  const getToneClasses = () => {
    switch (tone) {
      case 'green':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 ring-1 ring-emerald-100';
      case 'blue':
        return 'bg-blue-50 text-blue-700 border-blue-100 ring-1 ring-blue-100';
      case 'rose':
        return 'bg-rose-50 text-rose-700 border-rose-100 ring-1 ring-rose-100';
      case 'violet':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100 ring-1 ring-indigo-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 ring-1 ring-slate-100';
    }
  };

  const cardContent = (
    <div className={`p-3 rounded-xl border ${getToneClasses()} flex flex-col justify-between h-full min-w-0 shadow-sm hover:shadow-md transition-all`}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
      <div className="min-w-0">
        <div className="text-xs font-black truncate leading-tight text-slate-800">{value}</div>
        {subValue && <div className="text-[10px] font-bold text-slate-500 mt-0.5 truncate leading-none">{subValue}</div>}
      </div>
    </div>
  );

  if (isTooltip && tooltipText) {
    return (
      <Tooltip title={tooltipText} classNames={{ root: 'max-w-xs' }}>
        <div className="cursor-help h-full">{cardContent}</div>
      </Tooltip>
    );
  }

  return cardContent;
}

const getEffectiveWarehouseCode = (item: any, defaultWh: string): string => {
  if (!item) return defaultWh;
  const isVeSinh = item.itemType === 'VE_SINH' || item.mvpp?.startsWith('VS-') || item.category === 'VE_SINH';
  return isVeSinh ? 'VE_SINH' : defaultWh;
};

export default function RequestsDetail({ requestId, navigationIds, onNavigate, setViewMode, setActiveRequest, refreshData, showToast, currentUser }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');
  const ref = searchParams.get('ref');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chainData, setChainData] = useState<any>(null);

  // Navigation Logic
  const currentIndex = navigationIds ? navigationIds.indexOf(requestId) : -1;
  const total = navigationIds?.length || 0;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < total - 1 && currentIndex !== -1;

  const goPrev = () => {
    if (canGoPrev && onNavigate && navigationIds) {
      onNavigate(navigationIds[currentIndex - 1]);
    }
  };

  const goNext = () => {
    if (canGoNext && onNavigate && navigationIds) {
      onNavigate(navigationIds[currentIndex + 1]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, navigationIds, onNavigate]);

  // Modals state
  const [rejectReason, setRejectReason] = useState('');
  const [globalApproveReason, setGlobalApproveReason] = useState('');
  const [comparison, setComparison] = useState<any>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  
  // Custom approvals
  const [approvals, setApprovals] = useState<{lineId: string, qtyApproved: number, selected: boolean, note: string, replacementItemId?: string | null, replacementItemName?: string | null, replacementItem?: any | null}[]>([]);
  const [approvalSwapMode, setApprovalSwapMode] = useState<boolean>(false);
  // Custom issues
  const [issues, setIssues] = useState<{
    lineId: string;
    qtyDelivered: number;
    warehouseCode?: string;
    selected?: boolean;
    issueItemId?: string;
    issueItemData?: any;
    replacementSource?: string;
  }[]>([]);
  
  // Swap Item modal states
  const [swapModalLineId, setSwapModalLineId] = useState<string | null>(null);
  const [swapSearch, setSwapSearch] = useState<string>('');
  const [swapSearchResults, setSwapSearchResults] = useState<any[]>([]);
  const [swapSelectedItem, setSwapSelectedItem] = useState<any | null>(null);
  const [loadingSwapSearch, setLoadingSwapSearch] = useState<boolean>(false);

  const closeSwapModal = () => {
    setSwapModalLineId(null);
    setApprovalSwapMode(false);
  };

  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState('MAIN');
  const [selectedPrintType, setSelectedPrintType] = useState<'ALL' | 'VPP' | 'VE_SINH'>('ALL');
  const [isConfirmingIssue, setIsConfirmingIssue] = useState(false);
  const [autoCreateBackorder, setAutoCreateBackorder] = useState(true);
  const [activeTab, setActiveTab] = useState<'items' | 'deliveries' | 'history' | 'links'>('items');
  const [batchToPrint, setBatchToPrint] = useState<any>(null);


  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/requests/${requestId}`);
      setData(res.data);
      try {
        const chainRes = await api.get(`/procurement-chain/by-request/${requestId}`);
        setChainData(chainRes.data);
      } catch (e) {
        console.error("Failed to load chain data", e);
      }
      // Init modal states
      setApprovals(res.data.lines.map((l:any) => {
        let initialQty = l.qtyRequested;
        let isSelected = l.status !== 'REJECTED';
        
        if (res.data.status === 'PENDING_ADMIN') {
          initialQty = l.qtyAdminApproved !== null ? l.qtyAdminApproved : (l.qtyManagerApproved !== null ? l.qtyManagerApproved : (l.qtyApproved ?? l.qtyRequested));
          isSelected = l.qtyAdminApproved !== null ? l.qtyAdminApproved > 0 : (l.status !== 'REJECTED');
        } else if (res.data.status === 'PENDING_MANAGER') {
          initialQty = l.qtyManagerApproved !== null ? l.qtyManagerApproved : l.qtyRequested;
          isSelected = l.qtyManagerApproved !== null ? l.qtyManagerApproved > 0 : (l.status !== 'REJECTED');
        } else {
          initialQty = l.qtyApproved ?? l.qtyRequested;
          isSelected = l.status !== 'REJECTED';
        }

        return { 
          lineId: l.id, 
          qtyApproved: initialQty,
          selected: isSelected,
          note: l.approvalNote || '',
          replacementItemId: l.replacementItemId || null,
          replacementItemName: l.replacementItem?.name || null,
          replacementItem: l.replacementItem || null
        };
      }));
      setIssues(res.data.lines.map((l:any) => {
        const primaryWh = getEffectiveWarehouseCode(l.issue_item || l.item, res.data.warehouseCode || 'MAIN');
        const hasStockPrimary = l.issue_item?.stocks?.find((s:any) => s.warehouseCode === primaryWh)?.quantityOnHand > 0;
        // Find first warehouse with stock if primary has 0
        const firstWhWithStock = l.issue_item?.stocks?.find((s:any) => s.quantityOnHand > 0)?.warehouseCode;
        const wh = hasStockPrimary ? primaryWh : (firstWhWithStock || primaryWh);
        const stock = l.issue_item?.stocks?.find((s: any) => s.warehouseCode === wh)?.quantityOnHand ?? 0;
        const remaining = (l.qtyApproved ?? l.qtyRequested) - (l.qtyDelivered || 0);

        return { 
          lineId: l.id, 
          qtyDelivered: Math.min(remaining, stock),
          warehouseCode: wh,
          selected: remaining > 0 && stock > 0
        };
      }));
      setSelectedWarehouse(res.data.warehouseCode || 'MAIN');
      // Load comparison for Admin Level 2
      if (currentUser?.role === 'ADMIN' && res.data.status === 'PENDING_ADMIN') {
        try {
          setLoadingComparison(true);
          const compRes = await api.get(`/requests/${requestId}/comparison`);
          setComparison(compRes.data);
        } catch (e) {
          console.error("Failed to load comparison info", e);
        } finally {
          setLoadingComparison(false);
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi tải phiếu', 'error');
      setViewMode('LIST');
    } finally {
      setLoading(true); // Keep loading false only after all async work
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [requestId]);

  const openIssueModal = async () => {
    try {
      setLoading(true);
      const previewRes = await api.get(`/requests/${requestId}/delivery-preview`);
      const preview = previewRes.data;
      
      setIssues(preview.lines.map((l: any) => {
        return {
          lineId: l.lineId,
          qtyDelivered: l.issueQty,
          warehouseCode: l.issueItem?.warehouse || 'MAIN',
          selected: l.remainingQty > 0 && (l.issueItem?.availableQty || 0) > 0,
          issueItemId: l.issueItem?.id,
          issueItemData: {
            id: l.issueItem?.id,
            name: l.issueItem?.name,
            mvpp: l.issueItem?.code,
            unit: l.issueItem?.unit,
            stocks: l.issueItem?.stocks || []
          },
          replacementSource: l.replacementSource
        };
      }));
      setShowIssueModal(true);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi tải dữ liệu xuất kho', 'error');
    } finally {
      setLoading(false);
    }
  };

  const searchSwapItems = async (query: string) => {
    if (!query.trim()) {
      setSwapSearchResults([]);
      return;
    }
    try {
      setLoadingSwapSearch(true);
      const res = await api.get('/items', { params: { q: query } });
      setSwapSearchResults(res.data || []);
    } catch (err: any) {
      showToast('Lỗi tìm kiếm vật tư thay thế', 'error');
    } finally {
      setLoadingSwapSearch(false);
    }
  };

  const autoSelectWarehouses = () => {
    const updatedIssues = issues.map(issue => {
      const line = data.lines.find((l: any) => l.id === issue.lineId);
      if (!line) return issue;

      const qtyNeeded = issue.qtyDelivered;
      const stocks = line.issue_item?.stocks || [];

      // Try current selection first
      const currentWh = issue.warehouseCode || selectedWarehouse;
      const currentStock = stocks.find((s: any) => s.warehouseCode === currentWh)?.quantityOnHand ?? 0;
      if (currentStock >= qtyNeeded) return issue;

      // Try MAIN
      const mainStock = stocks.find((s: any) => s.warehouseCode === 'MAIN')?.quantityOnHand ?? 0;
      if (mainStock >= qtyNeeded) return { ...issue, warehouseCode: 'MAIN' };

      // Try SUPPLY
      const supplyStock = stocks.find((s: any) => s.warehouseCode === 'SUPPLY')?.quantityOnHand ?? 0;
      if (supplyStock >= qtyNeeded) return { ...issue, warehouseCode: 'SUPPLY' };

      // Try SCRAP
      const scrapStock = stocks.find((s: any) => s.warehouseCode === 'SCRAP')?.quantityOnHand ?? 0;
      if (scrapStock >= qtyNeeded) return { ...issue, warehouseCode: 'SCRAP' };

      // Try VE_SINH
      const veSinhStock = stocks.find((s: any) => s.warehouseCode === 'VE_SINH')?.quantityOnHand ?? 0;
      if (veSinhStock >= qtyNeeded) return { ...issue, warehouseCode: 'VE_SINH' };

      return issue; // Keep original if nowhere has enough
    });

    setIssues(updatedIssues);
    showToast('Đã tự động tối ưu kho xuất hàng', 'success');
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'APPROVED': case 'READY_TO_ISSUE': case 'COMPLETED': return 'bg-emerald-500 text-white shadow-emerald-500/30';
      case 'REJECTED': case 'CANCELLED': return 'bg-rose-500 text-white shadow-rose-500/30';
      case 'DRAFT': return 'bg-slate-400 text-white shadow-slate-400/30';
      case 'PARTIALLY_ISSUED': case 'PARTIALLY_APPROVED': 
      case 'PARTIAL_TBP_APPROVED': case 'PARTIAL_ADMIN_APPROVED':
      case 'PARTIALLY_DELIVERED': case 'PENDING_REMAINING_DELIVERY':
        return 'bg-teal-500 text-white shadow-teal-500/30';
      case 'RETURNED': case 'NEED_REVISION': return 'bg-orange-500 text-white shadow-orange-500/30';
      case 'WAITING_HANDOVER': return 'bg-blue-500 text-white shadow-blue-500/30';
      case 'PENDING_MANAGER': case 'PENDING_ADMIN': return 'bg-amber-500 text-white shadow-amber-500/30';
      case 'TBP_APPROVED': return 'bg-indigo-500 text-white shadow-indigo-500/30';
      default: return 'bg-slate-500 text-white cursor-help';
    }
  };

  const handleAction = async (actionPath: string, payload: any = {}, successMsg: string) => {
    try {
      await api.post(`/requests/${requestId}${actionPath}`, payload);
      showToast(successMsg);
      
      // Auto navigate to next if approved/rejected/cancelled/returned
      const nextActions = ['/approve', '/tbp_approve', '/admin_approve', '/reject', '/tbp_reject', '/admin_reject', '/return', '/cancel', '/confirm_receipt'];
      if (canGoNext && nextActions.includes(actionPath)) {
          goNext();
      } else {
          await refreshData();
          if (['/submit', '/withdraw'].includes(actionPath)) {
            setViewMode('LIST');
          } else {
            await fetchDetail();
          }
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Thao tác thất bại', 'error');
    }
  };

  const printDocument = async (printType: 'ALL' | 'VPP' | 'VE_SINH' = 'ALL') => {
      const hasPendingReplacement = data.lines.some((l: any) => l.status === 'REPLACEMENT_PENDING_ADMIN');
      if (hasPendingReplacement) {
          showToast('Không thể in: Có vật tư đang chờ Admin duyệt thay thế.', 'warning');
          return;
      }
      setSelectedPrintType(printType);
      window.open(`/requests/${requestId}/print?printType=${printType}`, '_blank');
      try { await api.post(`/requests/${requestId}/print`, { printType }); } catch(e) {}
  };

  const handlePrintBatch = (batch: any) => {
      setBatchToPrint(batch);
      setTimeout(() => {
          window.print();
          setBatchToPrint(null);
      }, 300);
  };

  const handleExportExcel = () => {
      if (!data) return;

      const headerInfo = [
          ["PHIẾU YÊU CẦU CẤP PHÁT VẬN PHÒNG PHẨM"],
          [`Mã phiếu: ${data.id}`],
          [`Người đề xuất: ${data.requester.fullName} (${data.department})`],
          [`Lý do/Mục đích: ${data.purpose || "—"}`],
          [`Ngày tạo: ${new Date(data.createdAt).toLocaleString('vi-VN')}`],
          [`Trạng thái: ${data.status}`],
          [],
          ["STT", "Mã VT", "Tên Vật tư / Hàng hóa", "ĐVT", "SL Xin", "TBP Duyệt", "Admin Duyệt", "Lấy Thực", "Ghi chú"]
      ];

      const lineData = data.lines.map((l: any, idx: number) => {
          return [
              idx + 1,
              l.item.mvpp,
              l.item.name,
              l.item.unit,
              l.qtyRequested,
              l.qtyManagerApproved ?? "—",
              l.qtyAdminApproved ?? l.qtyApproved ?? "Chưa duyệt",
              l.qtyDelivered,
              l.approvalNote || ""
          ];
      });

      const worksheet = XLSX.utils.aoa_to_sheet([...headerInfo, ...lineData]);
      worksheet['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 25 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Chi tiết yêu cầu");
      XLSX.writeFile(workbook, `VPP_${data.id}.xlsx`);
  };

  const getWorkflowProgress = () => {
    if (!data) return 0;
    
    let basePercent = 0;
    switch(data.status) {
      case 'DRAFT': basePercent = 0; break;
      case 'PENDING_MANAGER': basePercent = 25; break;
      case 'PENDING_ADMIN': 
      case 'PARTIAL_TBP_APPROVED': basePercent = 50; break;
      case 'APPROVED':
      case 'READY_TO_ISSUE':
      case 'PARTIAL_ADMIN_APPROVED':
      case 'BACKORDER':
        basePercent = 75; break;
      case 'COMPLETED': basePercent = 100; break;
      case 'PARTIALLY_ISSUED':
      case 'PARTIALLY_DELIVERED':
      case 'PENDING_REMAINING_DELIVERY':
      case 'WAITING_HANDOVER':
        basePercent = 85; break;
      default: basePercent = 0;
    }

    const totalTarget = data.lines.reduce((s:number, l:any) => s + (l.qtyApproved || l.qtyRequested), 0) || 1;
    const totalDelivered = data.lines.reduce((s:number, l:any) => s + l.qtyDelivered, 0);
    const deliveryPercent = Math.round((totalDelivered / totalTarget) * 100);

    return Math.min(100, Math.max(basePercent, deliveryPercent));
  };

  const getActionLabel = (action: string) => {
    if (!action) return '—';
    switch(action.toUpperCase()) {
      case 'SUBMIT': return 'Gửi trình duyệt';
      case 'TBP_APPROVE': return 'Trưởng bộ phận Duyệt';
      case 'ADMIN_APPROVE': return 'Hành chính Duyệt';
      case 'RETURN_FOR_REVISION': case 'RETURN_FOR_EDIT': return 'Trả lại chỉnh sửa';
      case 'REJECT': return 'Từ chối toàn bộ';
      case 'CANCEL': return 'Hủy phiếu';
      case 'ISSUE': case 'ISSUED': return 'Xuất kho / Giao hàng';
      case 'PARTIAL_DELIVERY_CONFIRMED': return 'Xác nhận Giao hàng Một phần';
      case 'CONFIRM_RECEIPT': return 'Đã nhận hàng';
      case 'APPROVE': return 'Duyệt (Approve)';
      case 'TBP_REJECT': return 'Trưởng bộ phận Từ chối';
      case 'ADMIN_REJECT': return 'Hành chính Từ chối';
      case 'WITHDRAW': return 'Rút phiếu';
      case 'URGE_DELIVERY': return 'Hối thúc giao hàng';
      default: return action;
    }
  };

  if (loading || !data || !currentUser) {
    return (
      <div className="flex flex-col h-full bg-slate-50 relative items-center justify-center">
         <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
         <p className="font-bold text-slate-500">Đang tải dữ liệu...</p>
      </div>
    );
  }

  const currentUid = currentUser?.userId || currentUser?.id;
  const isApprover = data.currentApproverId === currentUid || (currentUser?.role === 'ADMIN' && (data.status === 'PENDING_ADMIN' || data.status === 'PENDING_MANAGER'));
  const isWarehouse = (currentUser?.role === 'WAREHOUSE' || currentUser?.role === 'ADMIN') && ['APPROVED', 'READY_TO_ISSUE', 'PARTIALLY_ISSUED', 'PARTIALLY_APPROVED', 'PARTIAL_ADMIN_APPROVED', 'BACKORDER'].includes(data.status);
  const isOwnerDraft = currentUid === data.requesterId && (data.status === 'DRAFT' || data.status === 'RETURNED' || data.status === 'NEED_REVISION');
  const isOwnerPending = currentUid === data.requesterId && (data.status === 'PENDING_MANAGER' || data.status === 'PENDING_ADMIN');
  const canCancel = ['DRAFT', 'PENDING_MANAGER', 'PENDING_ADMIN', 'RETURNED', 'NEED_REVISION', 'APPROVED', 'READY_TO_ISSUE'].includes(data.status) && (currentUser?.role !== 'EMPLOYEE' || currentUid === data.requesterId);
  const isHandover = (currentUid === data.requesterId || currentUser?.role === 'ADMIN') && data.status === 'WAITING_HANDOVER';
  const isFutureApprover = currentUser?.role === 'MANAGER' && data.approvalSteps?.some((s: any) => s.approverId === currentUid) && data.status === 'PENDING_MANAGER' && data.currentApproverId !== currentUid;

  const handleBack = () => {
    if (from && ref) {
      if (from === 'request') {
        navigate(`/requests/${ref}`);
      } else if (from === 'po') {
        navigate(`/purchase-orders/${ref}`);
      } else if (from === 'receipt') {
        navigate(`/receipts/${ref}`);
      }
    } else {
      setViewMode('LIST');
    }
  };

  const hasRemaining = data?.lines?.some((l: any) => (l.qtyApproved ?? l.qtyRequested) > (l.qtyDelivered || 0));
  const canUrge = (['PARTIALLY_ISSUED', 'APPROVED', 'READY_TO_ISSUE', 'BACKORDER'].includes(data.status)) && currentUid === data.requesterId && hasRemaining;

  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 50,
      align: 'center' as const,
      className: 'border-r border-slate-100 font-bold text-slate-400',
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Vật tư / Hàng hóa',
      key: 'item',
      render: (l: any) => {
        return (
          <div className="min-w-[150px]">
            {l.issue_item || l.item ? (
              <GoodsNameWithPreview 
                itemId={l.issue_item?.id || l.item.id}
                itemCode={l.issue_item?.mvpp || l.item.mvpp}
                itemName={l.issue_item?.name || l.item.name}
                imageUrl={l.issue_item?.imageUrl || l.item.imageUrl}
                thumbnailUrl={l.issue_item?.thumbnailUrl || l.item.thumbnailUrl}
                categoryName={l.issue_item?.category || l.item.category}
                unit={l.issue_item?.unit || l.item.unit}
              />
            ) : (
              <p className="font-bold text-slate-800 text-sm whitespace-normal">N/A</p>
            )}
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black tracking-widest">{l.issue_item?.mvpp || l.item.mvpp}</span>
               {l.issue_item?.id !== l.item.id && (
                   <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded uppercase">
                       {l.replacement_source === 'receipt_replacement' || l.replacement_source === 'receipt' ? 'Đã đổi ở kho' : 'Đã thay thế'}
                   </span>
               )}
               <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1"><Archive className="w-3 h-3"/> Kho: {getEffectiveWarehouseCode(l.issue_item || l.item, data.warehouseCode || 'MAIN')}</span>
            </div>
            {l.issue_item?.id !== l.item.id && (
                 <div className="text-[10px] text-slate-400 italic mt-0.5">
                     Thay thế cho: {l.item.name} ({l.item.mvpp})
                 </div>
             )}
          </div>
        );
      }
    },
    {
      title: 'Tồn / Khả dụng',
      key: 'stocks',
      align: 'center' as const,
      render: (l: any) => {
        const displayItem = l.issue_item || l.item;
        const stocks = displayItem?.stocks || [];
        const whCode = getEffectiveWarehouseCode(displayItem, data.warehouseCode || 'MAIN');
        const reqStock = stocks.find((s:any) => s.warehouseCode === whCode) || { quantityOnHand: 0, quantityReserved: 0 };
        const totalOnHand = stocks.reduce((sum:number, s:any) => sum + s.quantityOnHand, 0);
        const available = reqStock.quantityOnHand - reqStock.quantityReserved;
        return (
          <div className="flex flex-col items-center gap-1">
             <div className="flex gap-1">
                <div className="text-center px-1 py-0.5 bg-slate-50 border border-slate-200 rounded">
                   <p className="text-[7px] font-black text-slate-400 uppercase">Tồn</p>
                   <p className="text-[10px] font-black text-slate-700">{reqStock.quantityOnHand}</p>
                </div>
                <div className="text-center px-1 py-0.5 bg-emerald-50 border border-emerald-100 rounded">
                   <p className="text-[7px] font-black text-emerald-400 uppercase">Khả dụng</p>
                   <p className="text-[10px] font-black text-emerald-700">{available}</p>
                </div>
                <div className="text-center px-1 py-0.5 bg-amber-50 border border-amber-100 rounded">
                   <p className="text-[7px] font-black text-amber-400 uppercase">Đã giữ</p>
                   <p className="text-[10px] font-black text-amber-700">{reqStock.quantityReserved}</p>
                </div>
             </div>
             {totalOnHand > reqStock.quantityOnHand && (
                <p className="text-[9px] font-bold text-slate-400 italic">Tổng tồn: {totalOnHand}</p>
             )}
          </div>
        );
      }
    },
    {
      title: 'SL Xin',
      key: 'qtyRequested',
      align: 'center' as const,
      className: 'border-x border-slate-100',
      render: (l: any) => (
        <div>
          <span className="font-black text-base text-slate-700">{l.qtyRequested}</span>{' '}
          <span className="text-[9px] font-bold text-slate-400 uppercase">{l.item.unit}</span>
        </div>
      )
    },
    {
      title: 'TBP Duyệt',
      key: 'qtyManagerApproved',
      align: 'center' as const,
      className: 'text-amber-600 bg-amber-50/30 border-r border-slate-100',
      render: (l: any) => {
        return l.qtyManagerApproved !== null ? (
            <div className="flex flex-col items-center">
                <span className="font-black text-base text-amber-600">{l.qtyManagerApproved}</span>
            </div>
        ) : (
            <span className="text-[9px] font-bold text-slate-400 uppercase">Chờ TBP</span>
        );
      }
    },
    {
      title: 'Admin Duyệt',
      key: 'qtyAdminApproved',
      align: 'center' as const,
      className: 'text-emerald-600 bg-emerald-50/30 border-r border-slate-100',
      render: (l: any) => {
        return l.qtyAdminApproved !== null || l.qtyApproved !== null || l.replacementQty !== null ? (
            <div className="flex flex-col items-center">
                <span className="font-black text-base text-emerald-600">{l.replacementQty ?? l.qtyAdminApproved ?? l.qtyApproved}</span>
            </div>
        ) : (
            <span className="text-[9px] font-bold text-slate-400 uppercase">Chờ Admin</span>
        );
      }
    },
    {
      title: 'Lấy thực',
      key: 'qtyDelivered',
      align: 'center' as const,
      className: 'text-blue-600 bg-blue-50/30',
      render: (l: any) => {
        return (
          <div>
            <span className="font-black text-base text-blue-600">{l.qtyDelivered ?? 0}</span>
            {l.qtyDelivered > 0 && l.qtyDelivered < (l.qtyApproved ?? l.qtyRequested) && (
                <p className="text-[9px] font-bold text-rose-500 bg-rose-50 rounded px-1 mt-1">Còn nợ: {(l.qtyApproved ?? l.qtyRequested) - l.qtyDelivered}</p>
            )}
          </div>
        );
      }
    },
    {
      title: 'Đơn giá',
      key: 'price',
      align: 'right' as const,
      render: (l: any) => (
        <span className="text-xs font-bold text-slate-500">{((l.issue_item || l.item).price || 0).toLocaleString('vi-VN')}</span>
      )
    },
    {
      title: 'Thành tiền',
      key: 'totalPrice',
      align: 'right' as const,
      render: (l: any) => (
        <span className="text-xs font-black text-slate-800">{(((l.issue_item || l.item).price || 0) * (l.qtyApproved ?? l.qtyRequested)).toLocaleString('vi-VN')}</span>
      )
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center' as const,
      render: (l: any) => {
        const getLineStatusColor = (status: string) => {
             switch(status) {
                 case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
                 case 'PARTIALLY_ISSUED': return 'bg-blue-50 text-blue-700 ring-blue-200';
                 case 'READY_TO_ISSUE': return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
                 case 'TBP_APPROVED': return 'bg-emerald-50 text-emerald-600 ring-emerald-100';
                 case 'TBP_PARTIAL': return 'bg-amber-50 text-amber-600 ring-amber-100';
                 case 'TBP_REJECTED': return 'bg-rose-50 text-rose-600 ring-rose-100';
                 case 'ADMIN_APPROVED': return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
                 case 'ADMIN_PARTIAL': return 'bg-teal-50 text-teal-700 ring-teal-100';
                 case 'ADMIN_REJECTED': return 'bg-rose-50 text-rose-700 ring-rose-200';
                 case 'NEED_REVISION': return 'bg-orange-50 text-orange-700 ring-orange-200';
                 default: return 'bg-slate-50 text-slate-600 ring-slate-200';
             }
        };
        return (
          <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ring-1 ${getLineStatusColor(l.status)}`}>
              {l.status.replace(/_/g, ' ')}
          </span>
        );
      }
    },
    {
      title: 'Ghi chú',
      key: 'note',
      render: (l: any) => (
        <div className="max-w-[180px] whitespace-normal">
           <p className="text-[11px] font-medium text-slate-600 italic leading-tight">
              {l.note || '—'}
           </p>
        </div>
      )
    }
  ];

  return (
    <>
      <Layout className="flex-1 min-h-0 overflow-visible bg-slate-100 RequestsDetail print:bg-white print:overflow-visible print:h-auto flex flex-row items-start">
        
        {/* LEFT COLUMN: Main Info & Lines */}
        <Layout.Content className="no-print flex-1 min-h-0 overflow-visible p-6 pb-24 flex flex-col gap-6">
          
          {/* TITLE BLOCK CARD */}
          <Card size="small" styles={{ body: { padding: '16px 24px' } }} className="shadow-sm border-slate-200">
            <div className="flex flex-col gap-3">
              {/* Ticket row */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <button onClick={handleBack} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition shadow-inner">
                    <ArrowLeft className="w-4 h-4"/>
                  </button>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center">
                      {data.id}
                      {navigationIds && navigationIds.length > 0 && (
                        <div className="flex items-center bg-slate-100 rounded-lg p-1 ml-4 border border-slate-200">
                          <button 
                            onClick={goPrev} 
                            disabled={!canGoPrev} 
                            className={`p-1 rounded transition-all ${canGoPrev ? 'hover:bg-white text-indigo-600 shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}
                            title="Phiếu trước (Arrow Left)"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="px-2.5 text-[10px] font-black text-slate-500 min-w-[50px] text-center">
                            {currentIndex + 1} / {total}
                          </span>
                          <button 
                            onClick={goNext} 
                            disabled={!canGoNext} 
                             className={`p-1 rounded transition-all ${canGoNext ? 'hover:bg-white text-indigo-600 shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}
                            title="Phiếu sau (Arrow Right)"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {data.priority === 'Khẩn cấp' && <span className="ml-3 text-[9px] bg-rose-500 text-white px-2 py-0.5 rounded uppercase tracking-wider animate-pulse font-bold">Khẩn cấp</span>}
                    </h2>
                    <span className="text-xs font-semibold text-slate-400">({data.requestType} • Lập lúc {new Date(data.createdAt).toLocaleString('vi-VN')})</span>
                  </div>
                </div>
                <div>
                  <span className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-md ${getStatusColor(data.status)}`}>
                    {data.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* References Row */}
              {chainData && (
                <div className="border-t border-slate-100 pt-3">
                  <LinkedDocumentReferences
                    request={chainData.request ? { id: chainData.request.id, code: chainData.request.id } : undefined}
                    purchaseOrder={chainData.purchaseOrder ? { id: chainData.purchaseOrder.id, code: chainData.purchaseOrder.id } : undefined}
                    receipt={chainData.receipts?.length === 1 ? { id: chainData.receipts[0].id, code: chainData.receipts[0].id } : undefined}
                    receipts={chainData.receipts?.length > 1 ? chainData.receipts.map((r: any) => ({ id: r.id, code: r.id })) : undefined}
                    warehouse={chainData.warehouse ? { id: chainData.warehouse.id, name: chainData.warehouse.name } : undefined}
                    supplier={chainData.supplier ? { id: chainData.supplier.id, name: chainData.supplier.name } : undefined}
                  />
                </div>
              )}
            </div>
          </Card>          {/* OVERVIEW ROW CARD */}
          {/* OVERVIEW GRID */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <InfoCard 
              label="Người Đề Xuất" 
              value={data.requester?.fullName} 
              subValue={data.department}
            />
            <InfoCard 
              label="Lý do & Mục đích" 
              value={data.purpose || 'Không có ghi chú'} 
              isTooltip 
              tooltipText={data.purpose || 'Không có ghi chú'}
            />
            <InfoCard 
              label="Hạng mục" 
              value={`${data.lines.length} mặt hàng`}
            />
            <InfoCard 
              label="Đã Duyệt" 
              value={`${data.lines.reduce((sum: number, l: any) => sum + (l.qtyApproved ?? 0), 0)} chiếc`}
              tone="green"
            />
            <InfoCard 
              label="Bị Từ Chối" 
              value={`${data.lines.reduce((sum: number, l: any) => sum + Math.max(0, l.qtyRequested - (l.qtyApproved ?? 0)), 0)} chiếc`}
              tone="rose"
            />
            <InfoCard 
              label="Đã Xuất/giao" 
              value={`${data.lines.reduce((sum: number, l: any) => sum + (l.qtyDelivered ?? 0), 0)} chiếc`}
              tone="blue"
            />
            <InfoCard 
              label="Tiến độ" 
              value={
                <div className="flex flex-col gap-1 w-full mt-0.5">
                  <div className="flex justify-between items-center text-[10px] font-black text-indigo-700 leading-none">
                    <span>{getWorkflowProgress()}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-200/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-500 rounded-full" 
                      style={{ width: `${getWorkflowProgress()}%` }}
                    ></div>
                  </div>
                </div>
              }
              tone="violet"
            />
          </div>

          {/* REJECTION / RETURN BANNER CARD */}
          {['REJECTED', 'RETURNED', 'CANCELLED', 'NEED_REVISION'].includes(data.status) && (
            <Card size="small" className="bg-rose-50/50 border-rose-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Lý do {data.status.replace(/_/g, ' ')}</h4>
                  <p className="text-sm font-bold text-rose-700 leading-tight">
                    {data.rejectReason || data.returnReason || data.cancelReason || data.revisionReason || 'Không rõ lý do'}
                  </p>
                </div>
              </div>
            </Card>
          )}

               {/* Decision Support Panel for Admin */}
               {currentUser?.role === 'ADMIN' && data.status === 'PENDING_ADMIN' && (
                   <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                       {!comparison ? (
                           loadingComparison ? (
                               <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-3 animate-pulse">
                                   <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đang đối soát lịch sử phòng ban...</p>
                               </div>
                           ) : null
                       ) : (
                           <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                               <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                           <RefreshCw className="w-5 h-5"/>
                                       </div>
                                       <div>
                                           <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Đối soát lịch sử cấp phát</h3>
                                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Decision Support System</p>
                                       </div>
                                   </div>
                                   <div className="flex gap-6">
                                       {!comparison.lastRequest ? (
                                           <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5"/> Lịch sử trống</span>
                                       ) : (
                                           <>
                                               <div className="text-right">
                                                   <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Mã phiếu gần nhất</p>
                                                   <a 
                                                      href={`/requests/${comparison.lastRequest.id}`} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer"
                                                      className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer inline-block"
                                                    >
                                                      {comparison.lastRequest.code}
                                                    </a>
                                               </div>
                                               <div className="text-right border-l border-slate-200 pl-6">
                                                   <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Khoảng cách ngày</p>
                                                   <p className={`text-xs font-black flex items-center gap-1.5 ${comparison.gapDays < 7 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
                                                       {comparison.gapDays} ngày 
                                                       {comparison.gapDays < 7 && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
                                                   </p>
                                               </div>
                                           </>
                                       )}
                                   </div>
                               </div>

                               <div className="p-5">
                                   {!comparison.lastRequest ? (
                                       <div className="bg-indigo-50/50 rounded-2xl p-8 border border-indigo-100 border-dashed text-center">
                                           <p className="text-indigo-600 font-bold">Chưa có lịch sử cấp phát nào được ghi nhận cho phòng ban này.</p>
                                           <p className="text-[11px] text-indigo-400 mt-1">Hệ thống không thể thực hiện đối chiếu tự động.</p>
                                       </div>
                                   ) : (
                                       <>
                                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                               <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tổng SL đã duyệt cũ</p>
                                                   <h4 className="text-2xl font-black text-slate-700">{comparison.lastRequest.totalQty}</h4>
                                               </div>
                                               <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                                                   <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Tổng SL đang yêu cầu</p>
                                                   <h4 className="text-2xl font-black text-indigo-600">{comparison.currentRequest.totalQty}</h4>
                                               </div>
                                               <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex flex-col justify-center">
                                                   <p className="text-[10px] font-black text-amber-500 uppercase mb-1.5 flex justify-between">Tỷ lệ so với cũ <span>{Math.round((comparison.currentRequest.totalQty / (comparison.lastRequest.totalQty || 1)) * 100)}%</span></p>
                                                   <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
                                                      <div 
                                                        className={`h-full transition-all duration-700 ${comparison.currentRequest.totalQty > comparison.lastRequest.totalQty ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                        style={{width: `${Math.min(100, (comparison.currentRequest.totalQty / (comparison.lastRequest.totalQty || 1)) * 100)}%`}}
                                                      ></div>
                                                   </div>
                                               </div>
                                           </div>

                                           <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                               <table className="w-full text-left">
                                                   <thead className="bg-slate-50 border-b border-slate-100 text-[9px] uppercase font-black text-slate-400 tracking-widest">
                                                       <tr>
                                                           <th className="px-5 py-3">Tên vật tư hàng hóa</th>
                                                           <th className="px-5 py-3 text-center bg-slate-100/30">Cũ (Duyệt)</th>
                                                           <th className="px-5 py-3 text-center bg-indigo-50/30">Mới (Xin)</th>
                                                           <th className="px-5 py-3 text-center">Chênh lệch</th>
                                                           <th className="px-5 py-3 text-right">Phát hiện thông minh</th>
                                                       </tr>
                                                   </thead>
                                                   <tbody className="divide-y divide-slate-50">
                                                       {comparison.comparison.map((item: any) => (
                                                           <tr key={item.itemId} className={`hover:bg-slate-50/50 transition-colors ${item.isSurge || item.isNew ? 'bg-rose-50/10' : ''}`}>
                                                               <td className="px-5 py-3">
                                                                   <p className="text-xs font-bold text-slate-800">{item.itemName}</p>
                                                               </td>
                                                               <td className="px-5 py-3 text-center font-bold text-slate-500 bg-slate-100/10">{item.prevApprovedQty}</td>
                                                               <td className="px-5 py-3 text-center font-black text-indigo-600 bg-indigo-50/10">{item.currentQty}</td>
                                                               <td className={`px-5 py-3 text-center font-black text-sm ${item.diff > 0 ? 'text-rose-500' : (item.diff < 0 ? 'text-emerald-500' : 'text-slate-400')}`}>
                                                                   {item.diff > 0 ? `+${item.diff}` : (item.diff === 0 ? '--' : item.diff)}
                                                               </td>
                                                               <td className="px-5 py-3 text-right">
                                                                   <div className="flex gap-2 justify-end">
                                                                       {item.isNew && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 border border-indigo-200 rounded text-[8px] font-black uppercase tracking-tighter shadow-sm animate-bounce">Mới tinh</span>}
                                                                       {item.isSurge && <span className="px-2 py-0.5 bg-rose-500 text-white rounded text-[8px] font-black uppercase tracking-tighter shadow-lg shadow-rose-200 animate-pulse">Tăng vọt</span>}
                                                                       {!item.isNew && !item.isSurge && item.diff === 0 && <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[8px] font-bold uppercase tracking-tighter">Ổn định</span>}
                                                                       {item.diff < 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[8px] font-bold uppercase tracking-tighter">Giảm SL</span>}
                                                                   </div>
                                                               </td>
                                                           </tr>
                                                       ))}
                                                   </tbody>
                                               </table>
                                           </div>
                                           {comparison.gapDays < 7 && (
                                               <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3">
                                                   <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce"/>
                                                   <p className="text-[11px] font-bold text-rose-700">CẢNH BÁO: Đề xuất lặp lại quá nhanh (Dưới 7 ngày). Vui lòng kiểm tra kỹ lý do cần gấp trước khi duyệt.</p>
                                               </div>
                                           )}
                                       </>
                                   )}
                               </div>
                           </div>
                       )}
                   </div>
               )}

               {/* Box 2: Tabbed Content */}
                <div className="no-print bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
                    <div className="p-1 border-b border-slate-200 bg-slate-50 flex items-center gap-1">
                        {[
                            { id: 'items', label: 'Vật tư yêu cầu', icon: Archive },
                            { id: 'deliveries', label: 'Lịch sử giao hàng', icon: Package },
                            { id: 'history', label: 'Lịch sử xử lý', icon: HistoryIcon },
                            { id: 'links', label: 'Liên kết chứng từ', icon: FileText }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === tab.id 
                                    ? 'bg-white text-indigo-600 border-b-2 border-indigo-600 shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {tab.id === 'deliveries' && data.deliveryBatches?.length > 0 && (
                                    <span className="ml-1 bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px]">{data.deliveryBatches.length}</span>
                                )}
                            </button>
                        ))}
                    </div>
                    
                    {activeTab === 'items' && (
                        <>
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Chi tiết Vật tư Xin Cấp</h3>
                                {data.lines.some((l:any) => {
                                  const displayItem = l.issue_item || l.item;
                                  const wh = getEffectiveWarehouseCode(displayItem, data.warehouseCode || 'MAIN');
                                  const stock = displayItem?.stocks?.find((s:any)=>s.warehouseCode===wh)?.quantityOnHand || 0;
                                  return (l.qtyApproved ?? l.qtyRequested) > stock;
                                }) && <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-3 py-1 rounded border border-rose-200 flex items-center print:hidden"><AlertTriangle className="w-3.5 h-3.5 mr-1"/> Cảnh báo thiếu Tồn Kho (Kho yêu cầu)</span>}
                            </div>
                            <div className="p-4 overflow-visible">
                                <Table
                                    dataSource={data.lines}
                                    columns={columns}
                                    rowKey="id"
                                    pagination={false}
                                    sticky={false}
                                    scroll={{ x: 'max-content' }}
                                    rowClassName={(record: any) => {
                                         const displayItem = record.issue_item || record.item;
                                         const stocks = displayItem?.stocks || [];
                                         const wh = getEffectiveWarehouseCode(displayItem, data.warehouseCode || 'MAIN');
                                         const reqStock = stocks.find((s: any) => s.warehouseCode === wh) || { quantityOnHand: 0, quantityReserved: 0 };
                                        const available = reqStock.quantityOnHand - reqStock.quantityReserved;
                                        const outOfStock = (record.qtyApproved ?? record.qtyRequested) > available;
                                        return `hover:bg-slate-50 transition border-l-4 ${outOfStock && data.status.startsWith('PENDING') ? 'border-l-rose-500 bg-rose-50/30' : 'border-l-transparent'}`;
                                    }}
                                    className="RequestsDetailTable"
                                />
                            </div>
                        </>
                    )}

                    {activeTab === 'deliveries' && (
                        <div className="p-6">
                            {(!data.deliveryBatches || data.deliveryBatches.length === 0) ? (
                                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <Package className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Chưa có dữ liệu giao hàng</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {data.deliveryBatches.map((batch: any) => (
                                        <div key={batch.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-black uppercase">Lần {batch.batchNo}</div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{batch.deliveryCode}</h4>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(batch.createdAt).toLocaleString('vi-VN')} • Giao bởi: {batch.createdBy?.fullName}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handlePrintBatch(batch)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 transition flex items-center gap-1.5">
                                                        <Printer className="w-3.5 h-3.5" /> In Phiếu
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left whitespace-nowrap">
                                                    <thead className="bg-white border-b border-slate-100">
                                                        <tr className="text-[9px] uppercase font-black text-slate-400 tracking-wider">
                                                            <th className="px-4 py-2">Vật tư</th>
                                                            <th className="px-4 py-2 text-center">Duyệt</th>
                                                            <th className="px-4 py-2 text-center">Đã giao trước</th>
                                                            <th className="px-4 py-2 text-center text-indigo-600 bg-indigo-50/30">Giao lần này</th>
                                                            <th className="px-4 py-2 text-center">Còn lại sau đó</th>
                                                            <th className="px-4 py-2">Ghi chú</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {batch.items.map((bi: any) => {
                                                            const line = data.lines.find((l: any) => l.id === bi.requestLineId);
                                                            return (
                                                                <tr key={bi.id} className="text-xs">
                                                                    <td className="px-4 py-2 font-bold text-slate-700">
                                                                       {line?.issue_item ? (
                                                                         <GoodsNameWithPreview 
                                                                           itemId={line.issue_item.id}
                                                                           itemCode={line.issue_item.mvpp}
                                                                           itemName={line.issue_item.name}
                                                                           imageUrl={line.issue_item.imageUrl}
                                                                           thumbnailUrl={line.issue_item.thumbnailUrl}
                                                                           categoryName={line.issue_item.category}
                                                                           unit={line.issue_item.unit}
                                                                         />
                                                                       ) : (
                                                                         <span>{line?.issue_item?.name || 'Vật tư đã xóa'}</span>
                                                                       )}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-center font-bold">{bi.approvedQty}</td>
                                                                    <td className="px-4 py-2 text-center text-slate-400">{bi.deliveredBeforeQty}</td>
                                                                    <td className="px-4 py-2 text-center font-black text-indigo-600 bg-indigo-50/10">{bi.issueQty}</td>
                                                                    <td className="px-4 py-2 text-center font-bold text-slate-600">{bi.remainingAfterQty}</td>
                                                                    <td className="px-4 py-2 text-[10px] text-slate-400 italic">{bi.note || '—'}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="p-8">
                            <div className="relative pl-8 border-l-2 border-slate-100 space-y-8">
                                <div className="relative">
                                    <div className="absolute -left-[41px] top-1 w-5 h-5 rounded-full bg-slate-300 ring-4 ring-white shadow-sm flex items-center justify-center">
                                        <Plus className="w-3 h-3 text-white" />
                                    </div>
                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tighter">Tạo đề xuất</p>
                                    <p className="text-[11px] font-bold text-slate-400 mt-1 tracking-tight">
                                        {new Date(data.createdAt).toLocaleString('vi-VN')} • <span className="text-slate-600 font-black italic">{data.requester?.fullName}</span>
                                    </p>
                                </div>

                                {data.approvalHistories?.map((audit: any) => {
                                    const getActionColor = (action: string) => {
                                        if (action.includes('REJECT') || action === 'CANCEL') return 'bg-rose-500';
                                        if (action.includes('APPROVE')) return 'bg-emerald-500';
                                        if (action.includes('RETURN')) return 'bg-orange-500';
                                        if (action === 'ISSUE' || action === 'PARTIAL_DELIVERY_CONFIRMED') return 'bg-blue-500';
                                        if (action === 'SUBMIT') return 'bg-indigo-500';
                                        return 'bg-slate-400';
                                    };
                                    return (
                                        <div key={audit.id} className="relative group">
                                            <div className={`absolute -left-[41px] top-1 w-5 h-5 rounded-full ring-4 ring-white shadow-sm transition-transform group-hover:scale-125 flex items-center justify-center ${getActionColor(audit.action)}`}>
                                                <HistoryIcon className="w-3 h-3 text-white" />
                                            </div>
                                            <p className="text-sm font-black text-slate-800 uppercase tracking-tighter">{getActionLabel(audit.action)}</p>
                                            <p className="text-[11px] font-bold text-slate-400 mt-1 tracking-tight">
                                                {new Date(audit.createdAt).toLocaleString('vi-VN')} • <span className="text-slate-600 font-black italic">{audit.approver?.fullName}</span>
                                            </p>
                                            {audit.reason && (
                                                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 relative max-w-2xl">
                                                    <p className="text-xs font-bold text-slate-500 italic leading-relaxed break-words">
                                                        "{audit.reason}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {data.status === 'COMPLETED' && (
                                    <div className="relative">
                                        <div className="absolute -left-[41px] top-1 w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-emerald-50 shadow-sm animate-pulse flex items-center justify-center">
                                            <CheckCircle className="w-3 h-3 text-white" />
                                        </div>
                                        <p className="text-sm font-black text-emerald-600 uppercase tracking-widest italic">Phiếu Đã Đóng (Hoàn tất toàn bộ)</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'links' && (
                        <div className="p-8">
                            {chainData ? (
                                <DocumentChainMap chainData={chainData} currentDocType="request" currentDocId={requestId} />
                            ) : (
                                <div className="text-center py-10 text-slate-400 font-medium">Đang tải dữ liệu liên kết...</div>
                            )}
                        </div>
                    )}
                </div>
            </Layout.Content>

          {/* RIGHT COLUMN: Actions & History */}
          <Layout.Sider width={260} theme="light" className="no-print border-l border-slate-200 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
              <div className="p-6 flex flex-col gap-6">
                  <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200 relative overflow-hidden text-slate-800">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-10 transform translate-x-1/2 -translate-y-1/2"></div>
                      
                      {/* Tiêu đề & Avatar cá nhân */}
                      <div className="flex items-center gap-3 mb-5 relative z-10 border-b border-slate-100 pb-3">
                          <Avatar size={40} className="bg-indigo-600 text-white font-bold border border-indigo-200 flex-shrink-0 flex items-center justify-center">
                              {currentUser?.fullName?.charAt(0).toUpperCase() || currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5 leading-none">
                                  TRUNG TÂM LỆNH
                              </h3>
                              <span className="self-start text-[8px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded mt-1.5 leading-none">
                                  Role: {currentUser?.role}
                              </span>
                          </div>
                      </div>

                      <div className="flex flex-col gap-4 relative z-10">
                      
                      {/* --- THAO TÁC CỦA NGƯỜI LẬP --- */}
                      {isOwnerDraft && (
                          <button onClick={() => {
                            if (setActiveRequest) setActiveRequest(data);
                            setViewMode('CREATE');
                          }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20">Tiếp Tục Chỉnh Sửa</button>
                      )}
                      {isOwnerPending && (
                           <button onClick={() => handleAction('/withdraw', {reason:'Xin rút lại để sửa'}, 'Đã rút phiếu thành công')} className="w-full py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 transition border border-slate-200 rounded-xl font-bold">Thu hồi sửa đổi</button>
                      )}

                      {/* --- THAO TÁC CỦA QUẢN LÝ --- */}
                      {isApprover && (
                          <>
                             <button onClick={() => setShowApproveModal(true)} className="w-full py-3.5 bg-emerald-500 text-white rounded-xl font-black hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center transform hover:scale-[1.02]"><CheckSquare className="w-5 h-5 mr-2"/> {(currentUser?.role === 'MANAGER' && data.status === 'PENDING_MANAGER') ? 'DUYỆT CẤP 1 (TRƯỞNG BP)' : 'PHÊ DUYỆT CẤP 2 (Admin)' }</button>
                             <div className="flex gap-3">
                                <button onClick={() => setShowRejectModal(true)} className="flex-1 py-2.5 bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-xl font-bold transition">Từ Chối</button>
                                <button onClick={() => handleAction('/return', {reason: prompt('Lý do yêu cầu làm lại?')}, 'Đã trả lại')} className="flex-1 py-2.5 bg-white text-amber-600 hover:bg-amber-50 border border-amber-200 hover:border-amber-300 rounded-xl font-bold transition">Trả Lại Sửa</button>
                             </div>
                          </>
                      )}

                      {/* --- THAO TÁC CỦA KHO --- */}
                      {(isWarehouse || currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && ['APPROVED', 'READY_TO_ISSUE', 'PARTIALLY_ISSUED', 'PARTIALLY_APPROVED', 'PARTIAL_ADMIN_APPROVED', 'BACKORDER', 'PARTIALLY_DELIVERED', 'PENDING_REMAINING_DELIVERY'].includes(data.status) && (
                           <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex flex-col gap-2.5">
                               <p className="text-[8px] font-black text-slate-450 uppercase tracking-widest leading-none mb-0.5">Các chức năng chính</p>
                               
                               <button onClick={() => openIssueModal()} className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-black hover:bg-emerald-700 transition shadow-sm flex items-center justify-center transform hover:scale-[1.01] border border-emerald-600 text-xs"><Archive className="w-4 h-4 mr-2"/> CẤP PHÁT CHO NHÂN SỰ</button>
                               
                                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && ['PARTIALLY_ISSUED', 'PARTIALLY_DELIVERED', 'WAITING_HANDOVER', 'READY_TO_ISSUE', 'APPROVED', 'BACKORDER'].includes(data.status) && (
                                    <button 
                                      onClick={() => {
                                        if (window.confirm('Xác nhận hoàn thành phiếu này? Phần còn lại chưa giao sẽ được đóng và phiếu chuyển sang Hoàn tất.')) {
                                          handleAction('/close-remaining', { reason: 'Hoàn thành phiếu thủ công' }, 'Hoàn thành phiếu thành công!');
                                        }
                                      }} 
                                      className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-black text-xs transition flex items-center justify-center gap-1.5 border border-teal-600 shadow-sm shadow-teal-600/20"
                                    >
                                      <CheckCircle className="w-4 h-4"/> HOÀN THÀNH PHIẾU
                                    </button>
                                )}
                           </div>
                      )}
                      {currentUser?.role === 'ADMIN' && 
                       ['APPROVED', 'READY_TO_ISSUE', 'PARTIALLY_ISSUED', 'PARTIALLY_APPROVED'].includes(data.status) &&
                       data.lines.some((l:any) => l.qtyRequested > (l.qtyApproved ?? 0)) &&
                       (!data.revisionReason?.includes('Đã tạo PO')) && (
                           <button onClick={() => {
                               if(window.confirm('Tạo tự động Đơn mua sắm (PO) cho các mặt hàng báo thiếu?')) {
                                   handleAction('/create_po', {}, 'Đã tạo Đơn đặt hàng (PO) thành công!');
                               }
                           }} className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-black hover:bg-amber-600 transition shadow-lg shadow-amber-500/20 flex items-center justify-center transform hover:scale-[1.02] mt-2 border border-amber-500"><ShoppingCart className="w-5 h-5 mr-2"/> TẠO ĐƠN MUA SẮM (BACKORDER)</button>
                      )}

                      {/* --- XÁC NHẬN BÀN GIAO --- */}
                      {isHandover && (
                          <button onClick={() => {
                              if(window.confirm('Xác nhận bạn đã nhận đủ vật tư từ kho theo đúng số lượng thực giao?')) {
                                  handleAction('/confirm_receipt', {}, 'Bàn giao thành công. Phiếu đã được đóng!');
                              }
                          }} className="w-full py-4 bg-indigo-500 text-white rounded-xl font-black hover:bg-indigo-600 transition shadow-lg shadow-indigo-500/20 flex items-center justify-center transform hover:scale-[1.02] mt-2 border border-indigo-500"><CheckCircle className="w-6 h-6 mr-2"/> XÁC NHẬN ĐÃ NHẬN HÀNG</button>
                      )}

                      {/* --- HỐI THÚC GIAO HÀNG --- */}
                      {canUrge && (
                          <button onClick={() => handleAction('/urge_delivery', {}, 'Đã gửi yêu cầu hối thúc giao hàng')} className="w-full py-4 bg-amber-500 text-white rounded-xl font-black hover:bg-amber-600 transition shadow-lg shadow-amber-500/20 flex items-center justify-center transform hover:scale-[1.02] mt-2 border border-amber-400">
                             <RefreshCw className="w-6 h-6 mr-2 animate-spin-slow"/> HỐI THÚC GIAO HÀNG
                          </button>
                      )}

                      <hr className="border-slate-100 my-2" />
                      
                      {canCancel && <button onClick={() => handleAction('/cancel', {reason: prompt('Nhập lý do hủy phiếu:')}, 'Đã Hủy phiếu')} className="w-full py-2.5 bg-transparent text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center rounded-xl font-bold transition"><Trash2 className="w-4 h-4 mr-2"/> Hủy Bỏ Phiếu Này</button>}
                      
                      {/* TÙY CHỌN IN VÀ XUẤT */}
                      {(() => {
                        const hasPendingReplacement = data.lines.some((l: any) => l.status === 'REPLACEMENT_PENDING_ADMIN');
                        return (
                          <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-dashed border-slate-200">
                              <p className="text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5 text-center">Tùy chọn in & xuất</p>
                              
                              <div className="flex flex-col gap-2">
                                  {/* In lẻ VPP / Vệ sinh */}
                                  <div className="flex gap-2">
                                      <button
                                          disabled={hasPendingReplacement}
                                          onClick={() => printDocument('VPP')}
                                          className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 border border-blue-100 disabled:opacity-50"
                                      >
                                          <Printer className="w-3.5 h-3.5"/> In VPP
                                      </button>
                                      <button
                                          disabled={hasPendingReplacement}
                                          onClick={() => printDocument('VE_SINH')}
                                          className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 border border-blue-100 disabled:opacity-50"
                                      >
                                          <Printer className="w-3.5 h-3.5"/> In Vệ sinh
                                      </button>
                                  </div>

                                  {/* In cả phiếu */}
                                  <button
                                      disabled={hasPendingReplacement}
                                      onClick={() => printDocument('ALL')}
                                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm shadow-blue-500/10"
                                  >
                                      <Printer className="w-4 h-4"/> In cả phiếu (A4 Full)
                                  </button>

                                  {/* Xuất file Excel (Đồng màu xanh dương) */}
                                  <button 
                                    onClick={handleExportExcel}
                                    className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 flex items-center justify-center rounded-lg font-bold transition text-xs"
                                  >
                                    <FileSpreadsheet className="w-4 h-4 mr-1.5 text-blue-500"/> Xuất File Excel
                                  </button>
                              </div>
                          </div>
                        );
                      })()}

                      <div className="mt-4 pt-4 border-t border-slate-100">
                          <div className="flex justify-between items-center mb-2">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ xử lý</p>
                             <span className="text-xs font-black text-emerald-400">{getWorkflowProgress()}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                             <div 
                               className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-1000" 
                               style={{width: `${getWorkflowProgress()}%`}}
                             ></div>
                          </div>
                      </div>
                  </div>
              </div>

                      {isFutureApprover && (
                          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/50 rounded-xl">
                              <p className="text-xs font-bold text-amber-500 flex items-center">
                                  <AlertTriangle className="w-4 h-4 mr-2"/> Chờ phê duyệt cấp dưới
                              </p>
                              <p className="text-[10px] text-amber-200/70 mt-1">Bạn có tên trong danh sách duyệt nhưng hiện tại chưa đến lượt của bạn.</p>
                          </div>
                      )}



              {/* Box 5: Approval Steps (Config) */}
              {data.approvalSteps && data.approvalSteps.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col shrink-0">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tuyến Duyệt Cấu Hình</h3>
                  <div className="space-y-4">
                    {data.approvalSteps.map((step: any) => (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          step.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                          step.status === 'REJECTED' ? 'bg-rose-100 text-rose-600' :
                          step.stepNo === data.currentApprovalStep && data.status === 'PENDING_MANAGER' ? 'bg-amber-100 text-amber-600 animate-pulse' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          {step.stepNo}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${step.status === 'APPROVED' ? 'text-slate-800' : 'text-slate-500'}`}>
                            {step.approver?.fullName || 'N/A'}
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{step.status}</p>
                        </div>
                        {step.status === 'APPROVED' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                      </div>
                    ))}
                    <div className="flex items-center gap-3 opacity-60">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${data.status === 'PENDING_ADMIN' ? 'bg-amber-100 text-amber-600 animate-pulse' : data.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            {data.approvalSteps.length + 1}
                         </div>
                         <div className="flex-1">
                            <p className="text-sm font-bold text-slate-500">Hành chính (Duyệt cuối)</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Final Approval</p>
                         </div>
                    </div>
                  </div>
                </div>
              )}
              </div>
          </Layout.Sider>

      {/* MODAL PHÊ DUYỆT (Manager) */}
      {showApproveModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] animate-slide-up">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-500 text-white shrink-0">
                      <div>
                        <h3 className="text-xl font-black">{data.status === 'PENDING_MANAGER' ? 'Phê duyệt Cấp 1 – Trưởng bộ phận' : 'Phê duyệt Cấp 2 – Hành chính (Admin)'}</h3>
                        <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest mt-1">Kiểm tra từng mặt hàng, chỉnh số lượng duyệt nếu cần, sau đó xác nhận phê duyệt.</p>
                      </div>
                      <button onClick={()=>setShowApproveModal(false)} className="text-emerald-100 hover:text-white transition p-2 hover:bg-white/10 rounded-full"><XCircle className="w-7 h-7"/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto flex flex-col">
                      {/* SUMMARY BLOCK */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 bg-slate-50 border-b border-slate-200 shrink-0">
                          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mặt hàng</p>
                             <p className="text-xl font-black text-slate-800">{data.lines.length}</p>
                          </div>
                          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Được chọn</p>
                             <p className="text-xl font-black text-emerald-600">{approvals.filter(a => a.selected).length}</p>
                          </div>
                          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thiếu tồn</p>
                              <p className="text-xl font-black text-rose-500">{data.lines.filter((l:any) => {
                                const displayItem = l.issue_item || l.item;
                                const wh = getEffectiveWarehouseCode(displayItem, data.warehouseCode || 'MAIN');
                                const stock = displayItem?.stocks?.find((s:any)=>s.warehouseCode===wh)?.quantityOnHand || 0;
                                return l.qtyRequested > stock;
                              }).length}</p>
                          </div>
                          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng SL Xin</p>
                             <p className="text-xl font-black text-indigo-600">{data.lines.reduce((s:number, l:any) => s + l.qtyRequested, 0)}</p>
                          </div>
                          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng SL Duyệt</p>
                             <p className="text-xl font-black text-emerald-600">{approvals.reduce((s:number, a:any) => s + (a.selected ? a.qtyApproved : 0), 0)}</p>
                          </div>
                      </div>

                      <div className="p-6">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-500 sticky top-0 z-10">
                               <tr>
                                  <th className="p-4 rounded-tl-xl w-12 text-center">Chọn</th>
                                  <th className="p-4 min-w-[280px] max-w-[360px]">Hàng Hóa</th>
                                  <th className="p-4 text-center">Tồn Kho</th>
                                  <th className="p-4 text-center">SL Yêu cầu</th>
                                  <th className="p-4 text-center">SL Duyệt</th>
                                   <th className="p-4 text-right">Đơn giá</th>
                                   <th className="p-4 text-right">Thành tiền</th>
                                  <th className="p-4 rounded-tr-xl text-center">Trạng Thái</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.lines.map((l:any) => {
                                    const approval = approvals.find((a:any)=>a.lineId===l.id) || { selected: false, qtyApproved: 0, note: '', replacementItemId: null, replacementItemName: null, replacementItem: null };
                                    const effectivePrice = (approval.replacementItemId && approval.replacementItem)
                                      ? (approval.replacementItem.price || 0)
                                      : (l.item.price || 0);
                                    const displayItem = (approval.replacementItemId && approval.replacementItem) ? approval.replacementItem : l.item;
                                    const wh = getEffectiveWarehouseCode(displayItem, data.warehouseCode || 'MAIN');
                                    const currentStock = displayItem.stocks?.find((s:any)=>s.warehouseCode===wh)?.quantityOnHand || 0;
                                    const overStock = (approval.selected && approval.qtyApproved > currentStock);
                                    const isChanged = approval.qtyApproved !== l.qtyRequested;
                                    const noteRequired = isChanged && !approval.note.trim() && !approval.replacementItemId;
                                    
                                    const getStatusBadge = () => {
                                      if (!approval.selected) return <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest">Bỏ qua</span>;
                                      if (approval.qtyApproved === 0) return <span className="px-3 py-1 bg-rose-100 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest">Không duyệt</span>;
                                      if (approval.replacementItemId) return <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">⇄ Thay thế</span>;
                                      if (currentStock === 0) return <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest">Hết hàng</span>;
                                      if (approval.qtyApproved >= l.qtyRequested) return <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">Duyệt đủ</span>;
                                      return <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest">Duyệt 1 phần</span>;
                                    };

                                    return (
                                    <tr key={l.id} className={`transition-colors border-b border-slate-50 ${!approval.selected ? 'opacity-50 grayscale' : 'hover:bg-slate-50/50'}`}>
                                        <td className="px-3 py-3 text-center align-top pt-5">
                                            <button 
                                              onClick={() => setApprovals(approvals.map(a => a.lineId === l.id ? {...a, selected: !a.selected} : a))}
                                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${approval.selected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-transparent'}`}
                                            >
                                              <Check className="w-4 h-4 stroke-[4]" />
                                            </button>
                                        </td>
                                        <td className="p-4 align-top whitespace-normal min-w-[280px] max-w-[360px]">
                                             <div className="flex flex-col">
                                               {approval.replacementItemId && (approval.replacementItem || approval.replacementItemName) ? (
                                                 <GoodsNameWithPreview 
                                                   itemId={approval.replacementItemId}
                                                   itemCode={approval.replacementItem?.mvpp || ''}
                                                   itemName={approval.replacementItemName || approval.replacementItem?.name}
                                                   imageUrl={approval.replacementItem?.imageUrl}
                                                   thumbnailUrl={approval.replacementItem?.thumbnailUrl}
                                                   categoryName={approval.replacementItem?.category}
                                                   unit={approval.replacementItem?.unit}
                                                 />
                                               ) : l.item ? (
                                                 <GoodsNameWithPreview 
                                                   itemId={l.item.id}
                                                   itemCode={l.item.mvpp}
                                                   itemName={l.item.name}
                                                   imageUrl={l.item.imageUrl}
                                                   thumbnailUrl={l.item.thumbnailUrl}
                                                   categoryName={l.item.category}
                                                   unit={l.item.unit}
                                                 />
                                               ) : (
                                                 <span className="font-bold text-slate-700 text-sm whitespace-normal max-w-[300px]">{l.item?.name || 'N/A'}</span>
                                               )}
                                              
                                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                 <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                                   {approval.replacementItemId && approval.replacementItem ? approval.replacementItem.mvpp : l.item.mvpp}
                                                 </span>
                                                {currentUser?.role === 'ADMIN' && approval.selected && (
                                                  <button 
                                                    type="button"
                                                    onClick={() => {
                                                      setApprovalSwapMode(true);
                                                      setSwapModalLineId(l.id);
                                                      setSwapSearch('');
                                                      setSwapSearchResults([]);
                                                      setSwapSelectedItem(null);
                                                    }}
                                                    className="text-[9px] font-black bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-150 transition-all flex items-center gap-0.5 shadow-sm"
                                                  >
                                                    ⇄ Đổi vật tư
                                                  </button>
                                                )}
                                              </div>

                                              {/* Replacement badge if selected */}
                                               {approval.replacementItemId && (
                                                 <div className="mt-1.5 flex items-center gap-1.5 p-1.5 px-2 bg-slate-100 border border-slate-200 rounded-xl max-w-fit shadow-sm animate-fade-in self-start text-[10px] font-semibold text-slate-400">
                                                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">← Thay cho:</span>
                                                   <span className="text-[10px] font-bold text-slate-500">{l.item?.name || 'Vật tư gốc'}</span>
                                                   <button 
                                                     type="button"
                                                     onClick={() => setApprovals(approvals.map(a => a.lineId === l.id ? {...a, replacementItemId: null, replacementItemName: null, replacementItem: null, note: a.note === 'Thay thế' ? '' : a.note} : a))}
                                                    className="ml-1 text-[11px] font-black text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                                                    title="Hủy đổi vật tư"
                                                  >✕</button>
                                                </div>
                                              )}
                                              
                                              {approval.selected && (isChanged || currentStock === 0) && (
                                                <div className={`mt-3.5 p-2.5 rounded-xl border transition-all ${noteRequired ? 'bg-rose-50/70 border-rose-200 ring-2 ring-rose-100/50' : 'bg-slate-50 border-slate-200'}`}>
                                                   <div className="flex justify-between items-center mb-1.5">
                                                       <p className={`text-[9px] font-black uppercase tracking-wider ${noteRequired ? 'text-rose-500' : 'text-slate-400'}`}>Lý do điều chỉnh {noteRequired && ' (Bắt buộc)'}</p>
                                                       <div className="flex gap-1">
                                                          {['Hết hàng', 'Không đủ tồn'].map(preset => (
                                                             <button 
                                                                key={preset}
                                                                type="button"
                                                                onClick={() => setApprovals(approvals.map(a => a.lineId === l.id ? {...a, note: preset} : a))}
                                                                className="text-[8px] font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded-md hover:bg-indigo-50 hover:text-indigo-600 transition"
                                                             >
                                                                {preset}
                                                             </button>
                                                          ))}
                                                       </div>
                                                    </div>
                                                    <textarea 
                                                       value={approval.note}
                                                       onChange={(e) => setApprovals(approvals.map(a => a.lineId === l.id ? {...a, note: e.target.value} : a))}
                                                       className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium outline-none focus:border-indigo-400 h-14 resize-none shadow-inner"
                                                       placeholder="Nhập lý do tại sao thay đổi số lượng..."
                                                    />
                                                 </div>
                                              )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center align-top pt-5">
                                            <div className={`inline-flex items-center px-3 py-1 rounded-xl font-black text-xs ${currentStock === 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                                              {currentStock}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center font-black text-indigo-600 bg-indigo-50/30 align-top pt-5">{l.qtyRequested}</td>
                                        <td className="p-4 align-top pt-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                  disabled={!approval.selected || approval.qtyApproved <= 0}
                                                  onClick={() => setApprovals(approvals.map(a => a.lineId === l.id ? {...a, qtyApproved: Math.max(0, a.qtyApproved - 1)} : a))}
                                                  className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center disabled:opacity-30 transition-colors"
                                                >
                                                  <Minus className="w-4 h-4" />
                                                </button>
                                                <input 
                                                   type="number" min="0" value={approval.qtyApproved} disabled={!approval.selected}
                                                   onChange={(e:any) => setApprovals(approvals.map((a:any) => a.lineId === l.id ? {...a, qtyApproved: Math.max(0, parseInt(e.target.value)||0)} : a))}
                                                   className={`w-16 text-center py-1.5 bg-white border-2 outline-none rounded-xl font-black text-base transition ${overStock ? 'text-rose-600 border-rose-300 ring-4 ring-rose-50' : isChanged ? 'text-amber-600 border-amber-200 bg-amber-50/30' : 'text-slate-700 border-slate-200 focus:border-emerald-400'}`}
                                                />
                                                <button 
                                                  disabled={!approval.selected || approval.qtyApproved >= l.qtyRequested}
                                                  onClick={() => setApprovals(approvals.map(a => a.lineId === l.id ? {...a, qtyApproved: a.qtyApproved + 1} : a))}
                                                  className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center disabled:opacity-30 transition-colors"
                                                >
                                                  <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {overStock && <p className="text-[9px] font-bold text-rose-500 text-center mt-1 animate-pulse">Duyệt vượt tồn!</p>}
                                            {isChanged && <p className="text-[9px] font-bold text-amber-500 text-center mt-1">Đã điều chỉnh</p>}
                                        </td>

                                        <td className="p-4 text-right font-medium align-top pt-5">
                                            {effectivePrice.toLocaleString('vi-VN')}
                                        </td>
                                        <td className="p-4 text-right font-black text-slate-800 align-top pt-5">
                                            {(effectivePrice * (approval.selected ? approval.qtyApproved : 0)).toLocaleString('vi-VN')}
                                        </td>
                                        <td className="px-3 py-3 text-center align-top pt-5">
                                            {getStatusBadge()}
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                      </div>
                  </div>

                  <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col gap-6 shrink-0">
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                          <div className="flex-1 w-full">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ghi chú chung (Optional)</p>
                             <textarea 
                                value={globalApproveReason}
                                onChange={(e) => setGlobalApproveReason(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-indigo-400 h-20 resize-none"
                                placeholder="Nhập ghi chú tổng thể cho toàn bộ phiếu..."
                             />
                             {currentUser?.role === 'ADMIN' && data.status === 'PENDING_ADMIN' && (
                               <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                 <input 
                                   type="checkbox" 
                                   id="autoBackorder"
                                   checked={autoCreateBackorder}
                                   onChange={(e) => setAutoCreateBackorder(e.target.checked)}
                                   className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                 />
                                 <label htmlFor="autoBackorder" className="text-xs font-bold text-amber-700 cursor-pointer flex items-center gap-1.5">
                                   <ShoppingCart className="w-3.5 h-3.5"/> Tự động tạo Đơn mua sắm (Backorder) cho các mặt hàng thiếu/giảm SL
                                 </label>
                               </div>
                             )}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 italic md:w-80">
                            * {data.status === 'PENDING_MANAGER' ? 'Trưởng bộ phận' : 'Hành chính'} vui lòng chọn mặt hàng cần phê duyệt và điều chỉnh số lượng duyệt nếu cần. <br/><br/>
                            <span className="text-rose-500 font-bold">Lưu ý: Bắt buộc nhập lý do nếu số lượng duyệt khác với số lượng xin.</span>
                          </div>
                      </div>
                      <div className="flex flex-col md:flex-row justify-end items-center gap-4">
                          <div className="flex gap-3 w-full md:w-auto">
                              <button onClick={()=>setShowApproveModal(false)} className="flex-1 md:flex-none px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">Hủy Bỏ</button>
                              <button 
                                onClick={() => {
                                  setShowApproveModal(false);
                                  setShowRejectModal(true);
                                }} 
                                className="flex-1 md:flex-none px-6 py-3 font-bold text-rose-500 hover:bg-rose-50 border border-rose-200 rounded-xl transition"
                              >
                                Từ Chối
                              </button>
                              <button 
                                type="button"
                                onClick={() => {
                                  const finalApprovals = approvals.map(a => {
                                      if (!a.selected) {
                                          return { ...a, qtyApproved: 0, note: a.note || 'Bỏ qua (Reject)' };
                                      }
                                      return a;
                                  });

                                  handleAction('/save-draft-approval', { 
                                      lineApprovals: finalApprovals.map(a => ({
                                        lineId: a.lineId,
                                        qtyApproved: a.qtyApproved,
                                        selected: a.selected,
                                        note: a.note,
                                        replacementItemId: a.replacementItemId || null
                                      }))
                                   }, 'Đã lưu nháp phê duyệt thành công!');
                                  setShowApproveModal(false);
                                }}
                                className="flex-1 md:flex-none px-6 py-3 font-bold text-indigo-650 hover:bg-indigo-50 border border-indigo-200 rounded-xl transition"
                              >
                                Lưu Nháp
                              </button>
                              <button 
                                disabled={approvals.filter(a => a.selected).some(a => {
                                   const line = data.lines.find((l:any)=>l.id === a.lineId);
                                   return a.qtyApproved !== line.qtyRequested && !a.note.trim() && !a.replacementItemId;
                                })}
                                onClick={() => {
                                  const selectedApprovals = approvals.filter(a => a.selected);
                                  if (selectedApprovals.length === 0) {
                                      if (!window.confirm('Bạn chưa chọn mặt hàng nào để duyệt. Hành động này sẽ từ chối toàn bộ các mặt hàng trong phiếu. Tiếp tục?')) return;
                                  }
                                  
                                  const missingNotes = selectedApprovals.filter(a => {
                                     const line = data.lines.find((l:any)=>l.id === a.lineId);
                                     return a.qtyApproved !== line.qtyRequested && !a.note.trim() && !a.replacementItemId;
                                  });

                                  if (missingNotes.length > 0) {
                                     showToast('Vui lòng nhập lý do điều chỉnh cho các mặt hàng đã đổi số lượng', 'error');
                                     return;
                                  }

                                  if (data.status === 'PENDING_ADMIN') {
                                      const hasOverStock = data.lines.some((l:any) => {
                                          const app = approvals.find((a:any)=>a.lineId===l.id);
                                          const displayItem = (app?.replacementItemId && app.replacementItem) ? app.replacementItem : l.item;
                                          const wh = getEffectiveWarehouseCode(displayItem, data.warehouseCode || 'MAIN');
                                          const stock = displayItem.stocks?.find((s:any)=>s.warehouseCode===wh)?.quantityOnHand || 0;
                                          return app?.selected && app.qtyApproved > stock;
                                      });
                                      if (hasOverStock) {
                                          if (!window.confirm('Cảnh báo: Bạn đang duyệt Số lượng vượt quá Tồn Kho thực tế. Hệ thống sẽ báo nợ (Backorder) hoặc Kho không thể xuất dòng này. Vẫn tiếp tục?')) return;
                                      }
                                  }
                                  // Khi Admin/Manager phê duyệt, nếu bỏ qua dòng nào thì mặc định là Reject dòng đó (SL duyệt = 0)
                                  const finalApprovals = approvals.map(a => {
                                      if (!a.selected) {
                                          return { ...a, qtyApproved: 0, note: a.note || 'Admin/Manager bỏ qua (Reject)' };
                                      }
                                      return a;
                                  });

                                  handleAction('/approve', { 
                                      lineApprovals: finalApprovals.map(a => ({
                                        lineId: a.lineId,
                                        qtyApproved: a.qtyApproved,
                                        selected: a.selected,
                                        note: a.note,
                                        replacementItemId: a.replacementItemId || null
                                      })), 
                                      reason: globalApproveReason,
                                      createBackorder: autoCreateBackorder 
                                   }, 'Đã duyệt thành công!');
                                  setShowApproveModal(false);
                               }} className={`flex-1 md:flex-none px-10 py-3 font-black rounded-xl transition shadow-lg flex items-center justify-center ${
                                  approvals.filter(a => a.selected).some(a => {
                                     const line = data.lines.find((l:any)=>l.id === a.lineId);
                                     return a.qtyApproved !== line.qtyRequested && !a.note.trim();
                                  }) ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/30'
                               }`}><CheckCircle className="w-5 h-5 mr-2"/> XÁC NHẬN PHÊ DUYỆT</button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL TỪ CHỐI */}
      {showRejectModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[160] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-md overflow-hidden animate-slide-up">
                  <div className="p-6 border-b border-slate-100 flex items-center bg-rose-50 text-rose-600">
                      <StopCircle className="w-7 h-7 mr-3"/>
                      <h3 className="text-xl font-black">Từ chối Yêu Cầu</h3>
                  </div>
                  <div className="p-6">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Lý do từ chối (Bắt buộc)</label>
                      <textarea autoFocus value={rejectReason} onChange={(e:any)=>setRejectReason(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white resize-none h-32 font-medium transition" placeholder="Ví dụ: Không hợp lý..."/>
                  </div>
                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={()=>setShowRejectModal(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">Hủy</button>
                      <button onClick={() => {
                          if (!rejectReason.trim()) return showToast('Bắt buộc nhập lý do!', 'error');
                          handleAction('/reject', { reason: rejectReason }, 'Đã từ chối phiếu');
                          setShowRejectModal(false);
                      }} className="px-6 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition shadow-lg shadow-rose-500/30">Xác Nhận Từ Chối</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL XUẤT KHO (New Upgrade) */}
      {showIssueModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] animate-slide-up">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-indigo-500 rounded-lg"><Archive className="w-6 h-6"/></div>
                         <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Thao tác Xuất kho & Giao hàng</h3>
                            <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest">Bảng kê chi tiết xuất thực tế</p>
                         </div>
                      </div>
                      <button onClick={()=>setShowIssueModal(false)} className="text-indigo-200 hover:text-white transition"><XCircle className="w-7 h-7"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-0 flex flex-col lg:flex-row">
                      {/* Left: Settings & Meta */}
                      <div className="w-full lg:w-72 bg-slate-50 border-r border-slate-200 p-6 shrink-0">
                          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl mb-4 text-center">
                              <p className="text-[10px] font-black text-indigo-600 uppercase">Xuất kho theo từng dòng</p>
                          </div>

                          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl mb-6">
                             <p className="text-[10px] font-black text-amber-600 uppercase mb-2 flex items-center"><AlertTriangle className="w-3.5 h-3.5 mr-1"/> Lưu ý vận hành</p>
                             <ul className="text-[10px] text-amber-700 space-y-1.5 font-medium italic">
                                <li>• Kiểm tra kỹ SL vật lý trước khi nhập.</li>
                                <li>• Hệ thống sẽ trừ tồn ngay lập tức.</li>
                                <li>• SL nợ sẽ được theo dõi tự động.</li>
                             </ul>
                          </div>

                          <div className="flex flex-col gap-2 mb-6">
                               <button 
                                 onClick={autoSelectWarehouses}
                                 className="w-full py-2.5 bg-white border border-indigo-200 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-50 transition flex items-center justify-center gap-2"
                               >
                                 <Search className="w-4 h-4"/> TỰ ĐỘNG CHỌN KHO
                               </button>
                               <button 
                                 onClick={() => {
                                    const newIssues = data.lines.map((l: any) => {
                                      const issue = issues.find((a: any) => a.lineId === l.id);
                                      const wh = issue?.warehouseCode || selectedWarehouse;
                                      const issueItem = issue?.issueItemData || l.issue_item || l.item;
                                      const stock = issueItem?.stocks?.find((s: any) => s.warehouseCode === wh)?.quantityOnHand ?? 0;
                                      const targetQty = l.final_approved_qty ?? l.qtyApproved ?? l.qtyRequested;
                                      const remaining = targetQty - (l.qtyDelivered || 0);
                                      return {
                                        ...issue,
                                        lineId: l.id,
                                        qtyDelivered: Math.min(remaining, stock),
                                        selected: remaining > 0 && stock > 0,
                                        warehouseCode: wh
                                      };
                                    });
                                    setIssues(newIssues);
                                    showToast('Đã tự động điền số lượng theo tồn thực tế', 'success');
                                 }}
                                 className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-100 transition flex items-center justify-center gap-2"
                               >
                                 <CheckCircle className="w-4 h-4"/> TỰ ĐIỀN THEO TỒN
                               </button>
                               
                               <div className="grid grid-cols-2 gap-2 mt-2">
                                  <button 
                                    onClick={() => {
                                      const newIssues = issues.map(i => {
                                        const line = data.lines.find((l: any) => l.id === i.lineId);
                                        const issueItem = i.issueItemData || line?.issue_item || line?.item;
                                        const stock = issueItem?.stocks?.find((s: any) => s.warehouseCode === i.warehouseCode)?.quantityOnHand ?? 0;
                                        const targetQty = line?.final_approved_qty ?? line?.qtyApproved ?? line?.qtyRequested;
                                        const remaining = targetQty - (line?.qtyDelivered || 0);
                                        return { ...i, selected: remaining > 0 && stock >= remaining };
                                      });
                                      setIssues(newIssues);
                                    }}
                                    className="py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-[9px] hover:bg-slate-200"
                                  >CHỌN DÒNG ĐỦ TỒN</button>
                                  <button 
                                    onClick={() => {
                                      const newIssues = issues.map(i => {
                                        const line = data.lines.find((l: any) => l.id === i.lineId);
                                        const issueItem = i.issueItemData || line?.issue_item || line?.item;
                                        const stock = issueItem?.stocks?.find((s: any) => s.warehouseCode === i.warehouseCode)?.quantityOnHand ?? 0;
                                        return { ...i, selected: stock > 0 };
                                      });
                                      setIssues(newIssues);
                                    }}
                                    className="py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-[9px] hover:bg-slate-200"
                                  >CHỈ DÒNG CÓ TỒN</button>
                                  <button onClick={() => setIssues(issues.map(i => ({...i, selected: true})))} className="py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-[9px] hover:bg-slate-200">CHỌN TẤT CẢ</button>
                                  <button onClick={() => setIssues(issues.map(i => ({...i, selected: false})))} className="py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-[9px] hover:bg-slate-200">BỎ CHỌN HẾT</button>
                               </div>

                               <button 
                                 onClick={() => setShowOnlyErrors(!showOnlyErrors)}
                                 className={`w-full mt-4 py-2.5 border rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${showOnlyErrors ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-500/30' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                               >
                                 <Filter className="w-4 h-4"/> {showOnlyErrors ? 'LỌC DÒNG THIẾU TỒN' : 'HIỆN TẤT CẢ'}
                               </button>
                           </div>

                          <div className="mb-6 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center">
                                <Archive className="w-3 h-3 mr-1 text-indigo-500"/> Kho xuất chính (Áp dụng nhanh)
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {['MAIN', 'SUPPLY', 'SCRAP', 'VE_SINH'].map(wh => (
                                  <button
                                    key={wh}
                                    onClick={() => {
                                  setSelectedWarehouse(wh);
                                      setIssues(issues.map(i => ({...i, warehouseCode: wh})));
                                    }}
                                    className={`py-2 rounded-xl text-[10px] font-black transition border ${selectedWarehouse === wh ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                                  >
                                    {wh}
                                  </button>
                                ))}
                              </div>
                          </div>
                          
                          <div className="space-y-3">
                              <button 
                                onClick={() => {
                                  const selectedIssues = issues.filter(i => i.selected);
                                  if (selectedIssues.length === 0) {
                                    showToast('Vui lòng chọn ít nhất một dòng để giao!', 'warning');
                                    return;
                                  }

                                  const hasAnyToIssue = selectedIssues.some(i => (i.qtyDelivered || 0) > 0);
                                  if (!hasAnyToIssue) {
                                    showToast('Các dòng đã chọn không có tồn khả dụng để giao. Vui lòng chọn dòng khác hoặc tạo backorder.', 'warning');
                                    return;
                                  }

                                  // Auto-fix qtyDelivered for selected items based on stock just in case
                                  const fixedIssues = issues.map(i => {
                                    if (!i.selected) return {...i, qtyDelivered: 0};
                                    const line = data.lines.find((l: any) => l.id === i.lineId);
                                    const issueItem = i.issueItemData || line?.issue_item || line?.item;
                                    const stock = issueItem?.stocks?.find((s: any) => s.warehouseCode === i.warehouseCode)?.quantityOnHand ?? 0;
                                    const targetQty = line?.final_approved_qty ?? line?.qtyApproved ?? line?.qtyRequested;
                                    const remaining = targetQty - (line?.qtyDelivered || 0);
                                    return {
                                      ...i,
                                      qtyDelivered: Math.min(i.qtyDelivered, stock, remaining)
                                    };
                                  });
                                  setIssues(fixedIssues);
                                  setIsConfirmingIssue(true);
                                }}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition transform hover:scale-[1.02] flex items-center justify-center"
                              >
                                <Package className="w-5 h-5 mr-2"/> GIAO PHẦN CÓ SẴN
                              </button>

                             
                              {data.lines.some((l: any) => {
                                 const target = l.final_approved_qty ?? l.qtyApproved ?? l.qtyRequested;
                                 const delivered = l.qtyDelivered || 0;
                                 return target > delivered;
                              }) && (
                                 <button 
                                   onClick={() => {
                                     if(window.confirm('Hệ thống sẽ tạo Đơn mua sắm (PO) cho phần còn thiếu và chuyển trạng thái phiếu sang BACKORDER. Tiếp tục?')) {
                                       handleAction('/create_po', {}, 'Đã tạo yêu cầu Backorder thành công!');
                                       setShowIssueModal(false);
                                     }
                                   }}
                                   className="w-full py-3 bg-amber-500 text-white rounded-2xl font-black shadow-lg shadow-amber-500/30 hover:bg-amber-600 transition flex items-center justify-center"
                                 >
                                   <ShoppingCart className="w-4 h-4 mr-2"/> TẠO BACKORDER PHẦN THIẾU
                                 </button>
                              )}

                          </div>
                      </div>

                      {/* Right: Table */}
                      <div className="flex-1 overflow-x-auto p-6">
                         <table className="w-full text-left whitespace-nowrap min-w-[600px]">
                            <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-400 sticky top-0 z-10">
                               <tr>
                                  <th className="p-4 rounded-tl-xl w-10">
                                      <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={issues.length > 0 && issues.every(i => i.selected)}
                                        onChange={(e) => setIssues(issues.map(i => ({...i, selected: e.target.checked})))}
                                      />
                                   </th>
                                  <th className="p-4">Vật tư / Kho xuất</th>
                                  <th className="p-4 text-center">SL Duyệt</th>
                                  <th className="p-4 text-center">Đã Giao</th>
                                  <th className="p-4 text-center bg-indigo-50/50">Cần Giao</th>
                                  <th className="p-4 text-center bg-emerald-50/50 border-x border-emerald-100">THỰC XUẤT</th>
                                  <th className="p-4 text-center">Còn Thiếu</th>
                                  <th className="p-4 rounded-tr-xl">Trạng thái</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.lines
                                  .filter((l: any) => {
                                    const issue = issues.find((a: any) => a.lineId === l.id);
                                    const targetQty = l.final_approved_qty ?? l.qtyApproved ?? l.qtyRequested;
                                    const qtyIssue = issue?.qtyDelivered ?? targetQty;
                                    if (!showOnlyErrors) return true;
                                    const wh = issue?.warehouseCode || selectedWarehouse;
                                    const issueItem = issue?.issueItemData || l.issue_item || l.item;
                                    const stock = issueItem?.stocks?.find((s: any) => s.warehouseCode === wh)?.quantityOnHand ?? 0;
                                    return qtyIssue > stock;
                                  })
                                  .map((l:any) => {
                                     const issue = issues.find((a:any)=>a.lineId===l.id);
                                     const targetQty = l.final_approved_qty ?? l.qtyApproved ?? l.qtyRequested;
                                     const qtyIssue = issue?.qtyDelivered ?? targetQty;
                                     const wh = issue?.warehouseCode || selectedWarehouse;
                                     
                                     const issueItem = issue?.issueItemData || l.issue_item || l.item;
                                     const stock = issueItem?.stocks?.find((s: any) => s.warehouseCode === wh) || { quantityOnHand: 0 };
                                     const source = issue?.replacementSource || l.replacement_source || 'original';
 
                                     const isReplaced = source !== 'original' || l.is_replaced;
                                     const overStock = qtyIssue > (stock?.quantityOnHand ?? 0);
                                     const deliveredBefore = l.qtyDelivered || 0;
                                     const remaining = targetQty - deliveredBefore;
                                     const shortAfter = remaining - qtyIssue;
                                     
                                     const isDone = deliveredBefore >= targetQty;
 
                                     const getSourceBadge = (src: string) => {
                                       switch(src) {
                                         case 'request':
                                           return <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-650 text-[9px] font-black uppercase border border-indigo-150">Thủ công</span>;
                                         case 'receipt':
                                           return <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-650 text-[9px] font-black uppercase border border-emerald-150">Nhập kho</span>;
                                         case 'purchase':
                                           return <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-600 text-[9px] font-black uppercase border border-sky-150">Mua hàng</span>;
                                         default:
                                           return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-black uppercase border border-slate-200">Gốc</span>;
                                       }
                                     };
 
                                     return (
                                     <tr key={l.id} className={`${isDone ? 'opacity-40 bg-slate-50' : ''} ${overStock ? 'bg-rose-50/30' : ''}`}>
                                         <td className="p-4">
                                           <input 
                                             type="checkbox"
                                             className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                             checked={issue?.selected || false}
                                             onChange={(e) => setIssues(issues.map(a => a.lineId === l.id ? {...a, selected: e.target.checked} : a))}
                                           />
                                         </td>
                                         <td className="p-4">
                                             <div className="flex flex-col">
                                               <p className="font-bold text-slate-800 text-sm whitespace-normal max-w-[250px]">{issueItem?.name || l.item?.name}</p>
                                               <div className="flex items-center gap-4 mt-2">
                                                 <select 
                                                   value={wh}
                                                   onChange={(e) => setIssues(issues.map(a => a.lineId === l.id ? {...a, warehouseCode: e.target.value} : a))}
                                                   className={`text-[10px] font-black p-1 rounded border ${overStock ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-slate-500'}`}
                                                 >
                                                   <option value="MAIN">MAIN</option>
                                                   <option value="SUPPLY">SUPPLY</option>
                                                   <option value="SCRAP">SCRAP</option>
                                                   <option value="VE_SINH">VE_SINH</option>
                                                 </select>
                                                 <span className={`font-black text-[10px] uppercase ${stock.quantityOnHand === 0 ? 'text-rose-500' : 'text-slate-400'}`}>Tồn: {stock.quantityOnHand} {issueItem?.unit || l.item?.unit}</span>
                                                 
                                                 <button 
                                                   type="button"
                                                   onClick={() => {
                                                     setSwapModalLineId(l.id);
                                                     setSwapSearch('');
                                                     setSwapSearchResults([]);
                                                     setSwapSelectedItem(null);
                                                   }}
                                                   className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded text-[9px] font-black transition"
                                                 >
                                                   ĐỔI ITEM
                                                 </button>
                                               </div>
                                               <div className="flex items-center gap-2 mt-2">
                                                 {getSourceBadge(source)}
                                                 {isReplaced && (
                                                   <p className="text-[9px] font-bold text-slate-400">
                                                     Thay cho: {l.original_item?.name || l.item?.name}
                                                   </p>
                                                 )}
                                               </div>
                                             </div>
                                         </td>
                                        <td className="p-4 text-center font-bold text-slate-600">{targetQty}</td>
                                        <td className="p-4 text-center font-bold text-slate-400">{deliveredBefore}</td>
                                        <td className="p-4 text-center bg-indigo-50/20 font-black text-indigo-600">{remaining}</td>
                                        <td className="p-4 bg-emerald-50/10 border-x border-emerald-50">
                                            <input 
                                               type="number" min="0" max={remaining} value={qtyIssue} disabled={isDone}
                                               onChange={(e:any) => setIssues(issues.map((a:any) => a.lineId === l.id ? {...a, qtyDelivered: Math.min(remaining, Math.max(0, parseInt(e.target.value)||0))} : a))}
                                               className={`w-20 text-center mx-auto block py-2 bg-white border-2 outline-none rounded-lg font-black text-base transition ${overStock ? 'text-rose-600 border-rose-400 ring-2 ring-rose-50' : 'text-emerald-700 border-emerald-100 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50'}`}
                                            />
                                        </td>
                                        <td className="p-4 text-center">
                                          <span className={`font-black text-xs ${shortAfter > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                                            {shortAfter > 0 ? `Thiếu ${shortAfter}` : 'Đủ'}
                                          </span>
                                        </td>
                                        <td className="p-4">
                                          {isDone ? (
                                            <span className="px-2 py-1 bg-slate-100 text-slate-400 text-[9px] font-black rounded-full uppercase">Hoàn tất</span>
                                          ) : qtyIssue > 0 ? (
                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-600 text-[9px] font-black rounded-full uppercase">Giao {qtyIssue}</span>
                                          ) : (
                                            <span className="px-2 py-1 bg-amber-100 text-amber-600 text-[9px] font-black rounded-full uppercase">Chờ tồn</span>
                                          )}
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                         </table>
                      </div>
                  </div>
              </div>

              {/* Confirmation Overlay */}
              {isConfirmingIssue && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[160] flex items-center justify-center p-4">
                   <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in">
                      <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Archive className="w-10 h-10"/>
                      </div>
                      <h4 className="text-xl font-black text-slate-800 mb-2">Xác nhận cấp phát?</h4>
                      <p className="text-sm text-slate-500 mb-8 font-medium">Bạn đang thực hiện cấp phát hàng từ kho <b>{selectedWarehouse}</b>. Hành động này không thể hoàn tác.</p>
                      <div className="flex flex-col gap-3">
                         <button 
                            type="button"
                            onClick={() => {
                               const selectedIssues = issues.filter(i => i.selected);
                               const hasErr = data.lines.some((l:any) => {
                                  const issue = issues.find((a:any)=>a.lineId===l.id);
                                  if (!issue?.selected) return false;
                                  const qtyIssue = issue?.qtyDelivered ?? 0;
                                  const wh = issue?.warehouseCode || selectedWarehouse;
                                  const issueItem = issue?.issueItemData || l.issue_item || l.item;
                                  const stock = issueItem?.stocks?.find((s:any) => s.warehouseCode === wh)?.quantityOnHand ?? 0;
                                  return qtyIssue > stock;
                               });
                               if (hasErr) {
                                  showToast('Có dòng vượt tồn kho ở các mục đã chọn. Vui lòng kiểm tra lại!', 'error');
                                  setIsConfirmingIssue(false);
                                  return;
                               }
                               handleAction('/issue', { 
                                  warehouseCode: selectedWarehouse, 
                                  lineIssues: selectedIssues.map((i: any) => ({
                                     lineId: i.lineId,
                                     qtyDelivered: i.qtyDelivered,
                                     warehouseCode: i.warehouseCode,
                                     issueItemId: i.issueItemId
                                  })) 
                               }, 'CẤP PHÁT VẬT TƯ THÀNH CÔNG! ĐANG CHỜ NHÂN SỰ XÁC NHẬN.');
                               setIsConfirmingIssue(false);
                               setShowIssueModal(false);
                            }}
                         >
                           XÁC NHẬN CẤP PHÁT
                         </button>
                         <button onClick={()=>setIsConfirmingIssue(false)} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600">Quay lại chỉnh sửa</button>
                      </div>
                   </div>
                </div>
              )}
          </div>
      )}

              {/* SWAP ITEM MODAL */}
              {swapModalLineId && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[170] flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-700 text-white">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-lg"><Layers className="w-5 h-5"/></div>
                        <div>
                          <h3 className="text-lg font-black uppercase tracking-tight text-white">Thay đổi vật tư thực xuất</h3>
                          <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest">Chọn vật tư thay thế cho dòng hiện tại</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={closeSwapModal} 
                        className="text-indigo-200 hover:text-white transition"
                      >
                        <XCircle className="w-6 h-6"/>
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 overflow-y-auto space-y-4">
                      {/* Target line info */}
                      {(() => {
                        const line = data.lines.find((l: any) => l.id === swapModalLineId);
                        if (!line) return null;
                        return (
                          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex justify-between items-center">
                            <div>
                              <p className="text-[10px] font-black text-indigo-500 uppercase">Vật tư gốc yêu cầu</p>
                              <p className="text-sm font-bold text-slate-800 mt-1">{line.item?.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Mã: {line.item?.mvpp} | ĐVT: {line.item?.unit}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-indigo-500 uppercase">SL Duyệt thực tế</p>
                              <p className="text-lg font-black text-indigo-700 mt-0.5">{line.final_approved_qty ?? line.qtyApproved ?? line.qtyRequested}</p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Search input */}
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                        <input
                          type="text"
                          value={swapSearch}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSwapSearch(val);
                            searchSwapItems(val);
                          }}
                          placeholder="Nhập tên hoặc mã vật tư cần tìm..."
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-sm outline-none transition-all placeholder:text-slate-400"
                        />
                      </div>

                      {/* Search results */}
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {loadingSwapSearch ? (
                          <div className="text-center py-8 text-slate-400 font-bold text-sm flex items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-indigo-600"/> Đang tra cứu danh mục...
                          </div>
                        ) : swapSearchResults.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 font-bold text-xs italic">
                            {swapSearch.trim() ? 'Không tìm thấy vật tư phù hợp.' : 'Nhập từ khóa để bắt đầu tìm kiếm.'}
                          </div>
                        ) : (
                          swapSearchResults.map((item) => {
                            const isSelected = swapSelectedItem?.id === item.id;
                            return (
                              <div
                                key={item.id}
                                onClick={() => setSwapSelectedItem(item)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${isSelected ? 'border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-500' : 'border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200'}`}
                              >
                                <div>
                                  <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">Mã: {item.mvpp} | ĐVT: {item.unit}</p>
                                </div>
                                {/* Stocks per warehouse */}
                                <div className="flex flex-wrap gap-1.5 md:justify-end">
                                  {item.stocks?.map((st: any) => (
                                    <span 
                                      key={st.warehouseCode}
                                      className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${st.quantityOnHand > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 'bg-slate-100 text-slate-400'}`}
                                    >
                                      {st.warehouseCode}: {st.quantityOnHand}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50">
                       <button
                        type="button"
                        onClick={closeSwapModal}
                        className="flex-1 py-3 bg-white border border-slate-200 text-slate-500 font-bold rounded-2xl text-sm hover:bg-slate-100 hover:text-slate-700 transition"
                      >
                        HỦY BỎ
                      </button>
                      <button
                        type="button"
                        disabled={!swapSelectedItem}
                        onClick={() => {
                          if (!swapSelectedItem || !swapModalLineId) return;
                          
                          if (approvalSwapMode) {
                            // ── Approval mode: save replacement item into approvals state ──
                            setApprovals(approvals.map(a => a.lineId === swapModalLineId ? {
                              ...a,
                              replacementItemId: swapSelectedItem.id,
                              replacementItemName: swapSelectedItem.name,
                              replacementItem: swapSelectedItem,
                              note: a.note || 'Thay thế'
                            } : a));
                            closeSwapModal();
                            showToast(`Đã chọn "${swapSelectedItem.name}" làm hàng thay thế!`, 'success');
                            return;
                          }

                          // ── Issue mode: update issues state (original behavior) ──
                          const line = data.lines.find((l: any) => l.id === swapModalLineId);
                          const firstWhWithStock = swapSelectedItem.stocks?.find((s: any) => s.quantityOnHand > 0)?.warehouseCode || 'MAIN';
                          const primaryWh = data.warehouseCode || 'MAIN';
                          const hasStockPrimary = swapSelectedItem.stocks?.find((s: any) => s.warehouseCode === primaryWh)?.quantityOnHand > 0;
                          const wh = hasStockPrimary ? primaryWh : firstWhWithStock;
                          
                          const stock = swapSelectedItem.stocks?.find((s: any) => s.warehouseCode === wh)?.quantityOnHand ?? 0;
                          const remaining = (line?.final_approved_qty ?? line?.qtyApproved ?? line?.qtyRequested) - (line?.qtyDelivered || 0);

                          const updatedIssues = issues.map((i) => {
                            if (i.lineId === swapModalLineId) {
                              return {
                                ...i,
                                issueItemId: swapSelectedItem.id,
                                issueItemData: {
                                  id: swapSelectedItem.id,
                                  name: swapSelectedItem.name,
                                  mvpp: swapSelectedItem.mvpp,
                                  unit: swapSelectedItem.unit,
                                  stocks: swapSelectedItem.stocks || []
                                },
                                qtyDelivered: Math.min(remaining, stock),
                                warehouseCode: wh,
                                selected: remaining > 0 && stock > 0,
                                replacementSource: 'request'
                              };
                            }
                            return i;
                          });

                          setIssues(updatedIssues);
                          closeSwapModal();
                          showToast('Đã đổi sang vật tư thay thế thành công!', 'success');
                        }}
                        className={`flex-1 py-3 font-black rounded-2xl text-sm transition flex items-center justify-center gap-2 ${swapSelectedItem ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                      >
                        <Check className="w-4 h-4"/> XÁC NHẬN ĐỔI
                      </button>
                    </div>
                  </div>
                </div>
              )}
      {/* FORMAL PRINT-ONLY SECTION (A4 Standard) */}
      <div className="hidden print:block print-area">
          <div className="print-sheet text-black font-sans leading-tight">
              <div className="flex justify-between items-start mb-8 w-full print-header">
                  <div className="w-[35%] text-left">
                      <p className="font-bold text-[13px] uppercase">CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO</p>
                      <p className="text-[10px] italic mt-1 font-bold">Số phiếu: {data.id}</p>
                      <p className="text-[9px] text-slate-500 mt-1">Ban Hành chính Nhân sự</p>
                  </div>
                  <div className="w-[20%] flex flex-col items-center text-center">
                      <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(data.id)}`} 
                          alt="QR Code" 
                          className="w-16 h-16 border border-slate-100"
                      />
                      <p className="text-[8px] font-bold mt-1 uppercase text-slate-400">Scan to Verify</p>
                  </div>
                  <div className="w-[45%] text-center">
                      <p className="text-[14px] font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                      <p className="text-[13px] font-bold underline decoration-[1.5px] underline-offset-[5px] mt-1">Độc lập - Tự do - Hạnh phúc</p>
                      <p className="text-[11px] mt-3 text-slate-600 italic">Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
                  </div>
              </div>

          <div className="text-center mb-6">
              <h1 className="text-[22px] font-black uppercase tracking-widest break-words leading-tight underline underline-offset-8 decoration-slate-300">
                  {(() => {
                    if (selectedPrintType === 'VE_SINH') return 'PHIẾU ĐỀ XUẤT VỆ SINH';
                    if (selectedPrintType === 'VPP') return 'PHIẾU ĐỀ XUẤT VĂN PHÒNG PHẨM';
                    return 'PHIẾU ĐỀ XUẤT TỔNG HỢP VĂN PHÒNG PHẨM VÀ ĐỒ VỆ SINH';
                  })()}
              </h1>
          </div>

              <div className="grid grid-cols-2 lg:grid-cols-2 gap-y-2 gap-x-12 mb-6 text-sm">
              <div className="flex items-end"><span className="w-40 font-bold shrink-0">Người đề xuất:</span> <span className="flex-1 border-b border-dotted border-black pb-0.5">{data.requester?.fullName}</span></div>
              <div className="flex items-end"><span className="w-40 font-bold shrink-0">Phòng ban:</span> <span className="flex-1 border-b border-dotted border-black pb-0.5">{data.department}</span></div>
              <div className="flex items-end"><span className="w-40 font-bold shrink-0">Ngày lập phiếu:</span> <span className="flex-1 border-b border-dotted border-black pb-0.5">{new Date(data.createdAt).toLocaleDateString('vi-VN')}</span></div>
              <div className="flex items-end"><span className="w-40 font-bold shrink-0">Loại yêu cầu:</span> <span className="flex-1 border-b border-dotted border-black pb-0.5">{data.requestType}</span></div>
              <div className="col-span-2 flex items-end"><span className="w-40 font-bold shrink-0">Lý do / Mục đích:</span> <span className="flex-1 border-b border-dotted border-black pb-0.5 italic">"{data.purpose || 'Không có ghi chú'}"</span></div>
          </div>

          <table className="w-full border-collapse border border-black text-[13px] mb-2 print-table">
              <thead className="bg-slate-100">
                  <tr>
                      <th className="border border-black p-2 text-center font-bold uppercase whitespace-nowrap" style={{width: '6%'}}>STT</th>
                      <th className="border border-black p-2 text-center font-bold uppercase" style={{width: '10%'}}>Mã VT</th>
                      <th className="border border-black p-2 text-left font-bold uppercase" style={{width: '30%'}}>Tên Văn Phòng Phẩm</th>
                      <th className="border border-black p-2 text-center font-bold uppercase" style={{width: '7%'}}>ĐVT</th>
                      <th className="border border-black p-2 text-center font-bold uppercase" style={{width: '6%'}}>SL</th>
                      <th className="border border-black p-2 text-right font-bold uppercase" style={{width: '12%'}}>Đơn giá</th>
                      <th className="border border-black p-2 text-right font-bold uppercase" style={{width: '14%'}}>Thành tiền</th>
                      <th className="border border-black p-2 text-left font-bold uppercase" style={{width: '14%'}}>Ghi chú</th>
                  </tr>
              </thead>
                              <tbody>
                  {(() => {
                    const filteredLines = sortLinesForPrinting(data.lines).filter((l: any) => {
                      if (selectedPrintType === 'ALL') return true;
                      const type = l.item.itemType || (l.item.mvpp.startsWith('VPP') ? 'VPP' : 'VE_SINH');
                      return type === selectedPrintType;
                    });

                    return (
                      <>
                        {filteredLines.map((l: any, idx: number) => {
                           const displayItem = l.issue_item || l.item;
                            const isReplaced = l.issue_item?.id !== l.item.id;
                            const displayQtyRequested = l.qtyRequested;
                            const displayQtyApproved = l.replacementQty ?? l.qtyApproved;

                           return (
                           <tr key={l.id} className="h-10">
                               <td className="border border-black p-2 text-center font-medium">{idx + 1}</td>
                               <td className="border border-black p-2 text-center font-bold">{displayItem.mvpp}</td>
                               <td className="border border-black p-2 font-medium">
                                   <div className="flex flex-col">
                                       <span>{displayItem.name}</span>
                                       {isReplaced && (
                                           <span className="text-[10px] text-slate-500 italic mt-0.5">
                                               (Thay cho: {l.item.name})
                                           </span>
                                       )}
                                   </div>
                               </td>
                               <td className="border border-black p-2 text-center">{displayItem.unit}</td>
                               <td className="border border-black p-2 text-center font-black text-base">
                                   {displayQtyApproved !== null && (displayQtyApproved !== displayQtyRequested || l.qtyManagerApproved !== displayQtyRequested) ? (
                                       <div className="flex flex-col items-center leading-none">
                                           <span className="text-[9px] text-slate-400 line-through mb-1">{displayQtyRequested}</span>
                                           <span>{displayQtyApproved}</span>
                                           {l.qtyManagerApproved !== null && l.qtyManagerApproved !== displayQtyApproved && !isReplaced && (
                                             <span className="text-[8px] font-bold text-slate-400 mt-1 italic">
                                               (TBP: {l.qtyManagerApproved})
                                             </span>
                                           )}
                                       </div>
                                   ) : (
                                       displayQtyApproved ?? displayQtyRequested
                                   )}
                               </td>
                               <td className="border border-black p-2 text-right font-medium">
                                   {(displayItem.price || 0).toLocaleString('vi-VN')}
                               </td>
                               <td className="border border-black p-2 text-right font-bold">
                                   {((displayItem.price || 0) * (displayQtyApproved ?? displayQtyRequested)).toLocaleString('vi-VN')}
                               </td>
                               <td className="border border-black p-2 text-[10px] italic leading-tight">{l.note || '—'}</td>
                           </tr>
                         )})}
                        <tr className="bg-slate-50 h-10 font-black">
                            <td colSpan={4} className="border border-black p-2 text-right uppercase text-xs">Tổng cộng:</td>
                            <td className="border border-black p-2 text-center text-lg">
                                {filteredLines.reduce((sum: number, line: any) => sum + (line.replacementQty ?? line.qtyApproved ?? line.qtyRequested), 0)}
                            </td>
                            <td className="border border-black p-2 text-right" colSpan={2}>
                                {filteredLines.reduce((sum: number, line: any) => {
                                  const item = line.issue_item || line.item;
                                  const qty = line.replacementQty ?? line.qtyApproved ?? line.qtyRequested;
                                  return sum + ((item.price || 0) * qty);
                                }, 0).toLocaleString('vi-VN')} VNĐ
                            </td>
                            <td className="border border-black p-2"></td>
                        </tr>
                      </>
                    );
                  })()}
               </tbody>
          </table>

          <div className="grid grid-cols-3 gap-y-12 gap-x-4 text-center text-[12px] font-bold mt-2 print-signatures">
              <div className="print-signature-block">
                  <p className="mb-2 uppercase">Người đề xuất</p>
                  <p className="text-[11px] font-normal italic mb-4">(Ký và ghi họ tên)</p>
                  <div className="mt-12 border-t border-dotted border-black w-[80%] mx-auto pt-2 relative">
                      <p className="font-black text-xs uppercase">{data.requester?.fullName}</p>
                      <p className="text-[9px] font-bold text-blue-600 mt-1">
                        {new Date(data.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} (Đã ký số)
                      </p>
                  </div>
              </div>
              
              <div className="print-signature-block">
                  <p className="mb-2 uppercase text-slate-600">Trưởng bộ phận</p>
                  <p className="text-[11px] font-normal italic mb-4">(Ký xác nhận)</p>
                  <div className="mt-12 border-t border-dotted border-black w-[80%] mx-auto pt-2">
                     {(() => {
                        const h = data.approvalHistories?.slice().reverse().find((x:any) => 
                          (x.action.includes('APPROVE') || x.action === 'APPROVED') && 
                          (x.approver?.role === 'MANAGER' || x.action.includes('TBP') || x.reason?.toLowerCase().includes('quản lý'))
                        );
                        return (
                          <>
                            {h && <p className="text-[10px] font-bold text-blue-600 mb-1">(Đã ký số)</p>}
                            <p className="font-black text-xs uppercase">{h?.approver?.fullName || '............................'}</p>
                            {h && (
                              <p className="text-[9px] font-normal text-slate-500 mt-1">
                                {new Date(h.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </>
                        );
                     })()}
                  </div>
              </div>

              <div className="print-signature-block">
                  <p className="mb-2 uppercase">Người duyệt</p>
                  <p className="text-[11px] font-normal italic mb-4">(Hành chính/Lãnh đạo)</p>
                  <div className="mt-12 border-t border-dotted border-black w-[80%] mx-auto pt-2">
                     {(() => {
                        const h = data.approvalHistories?.slice().reverse().find((x:any) => 
                          (x.action.includes('APPROVE') || x.action === 'APPROVED') && 
                          (x.approver?.role === 'ADMIN' || x.action.includes('ADMIN') || x.reason?.toLowerCase().includes('hành chính'))
                        );
                        return (
                          <>
                            {h && <p className="text-[10px] font-bold text-blue-600 mb-1">(Đã ký số)</p>}
                            <p className="font-black text-xs uppercase">{h?.approver?.fullName || '............................'}</p>
                            {h && (
                              <p className="text-[9px] font-normal text-slate-500 mt-1">
                                {new Date(h.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </>
                        );
                     })()}
                  </div>
              </div>

              <div className="print-signature-block">
                  <p className="mb-2 uppercase">Thủ kho / Xuất</p>
                  <p className="text-[11px] font-normal italic mb-4">(Ký và ghi tên)</p>
                  <div className="mt-12 border-t border-dotted border-black w-[80%] mx-auto pt-2">
                     {(() => {
                        const h = data.approvalHistories?.slice().reverse().find((x:any) => x.action === 'ISSUE' || x.action === 'ISSUED');
                        return (
                          <>
                            {h && <p className="text-[10px] font-bold text-blue-600 mb-1">(Đã ký số)</p>}
                            <p className="font-black text-xs uppercase">{h?.approver?.fullName || '............................'}</p>
                            {h && (
                              <p className="text-[9px] font-normal text-slate-500 mt-1">
                                {new Date(h.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </>
                        );
                     })()}
                  </div>
              </div>

              <div className="print-signature-block">
                  <p className="mb-2 uppercase text-indigo-700">Người nhận</p>
                  <p className="text-[11px] font-normal italic mb-4">(Ký nhận đủ hàng)</p>
                  <div className="mt-14 border-t border-dotted border-black w-[70%] mx-auto pt-2">
                     <p className="font-black text-xs uppercase">
                        {data.status === 'COMPLETED' ? data.requester?.fullName : '............................'}
                     </p>
                     {data.status === 'COMPLETED' && (
                         <p className="text-[9px] font-normal text-slate-400 italic">Đã nhận đủ hàng</p>
                     )}
                  </div>
              </div>
              
              
          </div>

          {/* Audit Trail Section for Print */}
          <div className="mt-12 border-t border-slate-300 pt-6">
              <h3 className="text-[11px] font-black uppercase mb-3 text-slate-800 tracking-widest flex items-center">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mr-2"></span>
                  Lịch sử Xử lý (Audit Trail)
              </h3>
              <table className="w-full border-collapse text-[10px] print-table">
                  <thead>
                      <tr className="bg-slate-50">
                          <th className="border border-slate-300 p-1.5 text-left font-bold uppercase w-32">Thời gian</th>
                          <th className="border border-slate-300 p-1.5 text-left font-bold uppercase w-48">Người thực hiện</th>
                          <th className="border border-slate-300 p-1.5 text-left font-bold uppercase w-32">Hành động</th>
                          <th className="border border-slate-300 p-1.5 text-left font-bold uppercase">Ghi chú / Nội dung</th>
                      </tr>
                  </thead>
                  <tbody>
                      {/* Creation Event manually prepended to match the UI full audit trail */}
                      <tr className="hover:bg-slate-50/50">
                          <td className="border border-slate-300 p-1.5 whitespace-nowrap">
                              {new Date(data.createdAt).toLocaleString('vi-VN', { 
                                  day: '2-digit', month: '2-digit', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                              })}
                          </td>
                          <td className="border border-slate-300 p-1.5 font-bold uppercase text-slate-700">
                              {data.requester?.fullName}
                          </td>
                          <td className="border border-slate-300 p-1.5">
                              <span className="px-1.5 py-0.5 rounded-sm font-bold text-[9px] bg-slate-100 text-slate-600">
                                  Tạo phiếu
                              </span>
                          </td>
                          <td className="border border-slate-300 p-1.5 italic text-slate-600">
                              Khởi tạo yêu cầu
                          </td>
                      </tr>
                      {data.approvalHistories?.map((h: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="border border-slate-300 p-1.5 whitespace-nowrap">
                                  {new Date(h.createdAt).toLocaleString('vi-VN', { 
                                      day: '2-digit', month: '2-digit', year: 'numeric',
                                      hour: '2-digit', minute: '2-digit'
                                  })}
                              </td>
                              <td className="border border-slate-300 p-1.5 font-bold uppercase text-slate-700">
                                  {h.approver?.fullName} {h.approver?.role === 'ADMIN' ? '(ADM)' : ''}
                              </td>
                              <td className="border border-slate-300 p-1.5">
                                  <span className={`px-1.5 py-0.5 rounded-sm font-bold text-[9px] ${
                                      h.action.includes('REJECT') ? 'bg-rose-50 text-rose-700' :
                                      h.action.includes('APPROVE') ? 'bg-emerald-50 text-emerald-700' :
                                      'bg-slate-100 text-slate-600'
                                  }`}>
                                      {getActionLabel(h.action)}
                                  </span>
                              </td>
                              <td className="border border-slate-300 p-1.5 italic text-slate-600">
                                  {h.reason || '—'}
                              </td>
                          </tr>
                      ))}
                      {(!data.approvalHistories || data.approvalHistories.length === 0) && (
                          <tr>
                              <td colSpan={4} className="border border-slate-300 p-4 text-center text-slate-400 italic">
                                  Chưa có lịch sử xử lý.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
              <p className="mt-2 text-[8px] text-slate-400 text-right italic">HỆ THỐNG TRÍCH XUẤT LÚC {new Date().toLocaleTimeString('vi-VN')}</p>
          </div>
          
          <div className="mt-auto pt-4 border-t border-slate-200 text-[11px] text-[#555] flex justify-between print-info">
              <p>Ngày in: {new Date().toLocaleString('vi-VN')} • Mã tra cứu: {data.id}</p>
              <p>Hệ thống Quản lý VPP - {data.id} • Trang 1/1</p>
          </div>
        </div>
      </div>

      {/* MODAL: FULL AUDIT TRAIL */}
      {showFullHistory && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white shrink-0">
                      <div>
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase">Chi tiết Lịch sử Xử lý</h3>
                        <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-[0.2em] mt-1 italic">Audit Trail for {data.id}</p>
                      </div>
                      <button onClick={()=>setShowFullHistory(false)} className="text-indigo-100 hover:text-white transition p-2 hover:bg-white/10 rounded-full">
                          <XCircle className="w-8 h-8"/>
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                      <div className="relative pl-8 border-l-4 border-slate-100 space-y-12">
                          {/* Start Point */}
                          <div className="relative">
                              <div className="absolute -left-[42px] top-0 w-8 h-8 rounded-full bg-slate-200 ring-8 ring-white flex items-center justify-center">
                                  <Plus className="w-4 h-4 text-slate-500" />
                              </div>
                              <div>
                                  <p className="text-base font-black text-slate-800 uppercase tracking-tight">Khởi tạo phiếu đề xuất</p>
                                  <p className="text-xs font-bold text-slate-400 mt-1">{new Date(data.createdAt).toLocaleString('vi-VN')} • <span className="text-indigo-600 font-black">{data.requester?.fullName}</span></p>
                                  <p className="mt-3 text-sm text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">"Hệ thống ghi nhận việc tạo mới phiếu yêu cầu định kỳ"</p>
                              </div>
                          </div>

                          {/* Full History */}
                           {data.approvalHistories?.map((audit: any) => {
                              const getActionColor = (action: string) => {
                                if (action.includes('REJECT') || action === 'CANCEL') return 'bg-rose-500 text-white';
                                if (action.includes('APPROVE')) return 'bg-emerald-500 text-white';
                                if (action.includes('RETURN')) return 'bg-orange-500 text-white';
                                if (action === 'ISSUE') return 'bg-blue-500 text-white';
                                if (action === 'SUBMIT') return 'bg-indigo-500 text-white';
                                return 'bg-slate-400 text-white';
                              };

                              return (
                                  <div key={audit.id} className="relative">
                                      <div className={`absolute -left-[42px] top-0 w-8 h-8 rounded-full ring-8 ring-white flex items-center justify-center shadow-lg ${getActionColor(audit.action)}`}>
                                          <Check className="w-4 h-4 stroke-[3]" />
                                      </div>
                                      <div>
                                          <div className="flex items-center gap-3">
                                              <p className="text-base font-black text-slate-800 uppercase tracking-tight">{getActionLabel(audit.action)}</p>
                                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${getActionColor(audit.action).split(' ')[0]} bg-opacity-10 text-opacity-100`}>
                                                  Verified
                                              </span>
                                          </div>
                                          <p className="text-xs font-bold text-slate-400 mt-1">{new Date(audit.createdAt).toLocaleString('vi-VN')} • <span className="text-indigo-600 font-black">{audit.approver?.fullName}</span></p>
                                          {audit.reason && (
                                              <div className="mt-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 relative overflow-hidden">
                                                  <div className="absolute left-0 top-0 w-1 h-full bg-slate-200"></div>
                                                  <p className="text-sm font-bold text-slate-600 leading-relaxed italic break-words">
                                                      "{audit.reason}"
                                                  </p>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}

                          {data.status === 'COMPLETED' && (
                              <div className="relative">
                                  <div className="absolute -left-[42px] top-0 w-8 h-8 rounded-full bg-emerald-500 ring-8 ring-white flex items-center justify-center shadow-lg shadow-emerald-200 text-white">
                                      <CheckCircle className="w-5 h-5" />
                                  </div>
                                  <div>
                                      <p className="text-base font-black text-emerald-600 uppercase tracking-widest italic">Quy trình hoàn tất</p>
                                      <p className="text-xs font-bold text-slate-400 mt-1">Hệ thống đã tự động đóng phiếu sau khi các bên xác nhận.</p>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
                  
                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                      <button onClick={()=>setShowFullHistory(false)} className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg">Đóng lại</button>
                  </div>
              </div>
          </div>
       )}
       
       {/* BATCH PRINT TEMPLATE (Only visible during batch printing) */}
       {batchToPrint && (
         <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-10 text-black">
           <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
             <div>
               <h1 className="text-2xl font-black uppercase">PHIẾU XUẤT KHO</h1>
               <p className="text-lg font-bold">Lần giao: {batchToPrint.batchNo}</p>
               <p className="text-sm font-medium">Mã vận đơn: {batchToPrint.deliveryCode}</p>
             </div>
             <div className="text-right">
               <p className="text-sm font-bold">Mã phiếu: {data.id}</p>
               <p className="text-sm">Ngày giao: {new Date(batchToPrint.createdAt).toLocaleString('vi-VN')}</p>
             </div>
           </div>
           
           <div className="mb-8">
             <p className="mb-2"><strong>Người yêu cầu:</strong> {data.requester?.fullName} ({data.department})</p>
             <p className="mb-2"><strong>Người xuất kho:</strong> {batchToPrint.createdBy?.fullName}</p>
             <p><strong>Ghi chú:</strong> {batchToPrint.note || '—'}</p>
           </div>
 
           <table className="w-full border-collapse border border-black text-sm">
             <thead>
               <tr className="bg-slate-100">
                 <th className="border border-black p-2 text-center w-10">STT</th>
                 <th className="border border-black p-2 text-left">Vật tư / Hàng hóa</th>
                 <th className="border border-black p-2 text-center">ĐVT</th>
                 <th className="border border-black p-2 text-center">Duyệt</th>
                 <th className="border border-black p-2 text-center">Đã giao trước</th>
                 <th className="border border-black p-2 text-center font-bold">GIAO LẦN NÀY</th>
                 <th className="border border-black p-2 text-center">Còn lại</th>
               </tr>
             </thead>
             <tbody>
               {batchToPrint.items.map((bi: any, idx: number) => {
                 const line = data.lines.find((l: any) => l.id === bi.requestLineId);
                 return (
                   <tr key={bi.id}>
                     <td className="border border-black p-2 text-center">{idx + 1}</td>
                     <td className="border border-black p-2 font-bold">{line?.issue_item?.name || 'Vật tư'}</td>
                     <td className="border border-black p-2 text-center">{line?.issue_item?.unit}</td>
                     <td className="border border-black p-2 text-center">{bi.approvedQty}</td>
                     <td className="border border-black p-2 text-center">{bi.deliveredBeforeQty}</td>
                     <td className="border border-black p-2 text-center font-bold">{bi.issueQty}</td>
                     <td className="border border-black p-2 text-center">{bi.remainingAfterQty}</td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
 
           <div className="mt-12 grid grid-cols-3 gap-8 text-center">
             <div>
               <p className="font-bold uppercase mb-16 text-xs">Người nhận hàng</p>
               <p className="text-xs italic">(Ký, họ tên)</p>
             </div>
             <div>
               <p className="font-bold uppercase mb-16 text-xs">Người giao hàng</p>
               <p className="text-xs italic">(Ký, họ tên)</p>
             </div>
             <div>
               <p className="font-bold uppercase mb-16 text-xs">Thủ kho</p>
               <p className="text-xs italic">(Ký, họ tên)</p>
             </div>
           </div>
         </div>
       )}
      </Layout>
    </>
   );
 }
