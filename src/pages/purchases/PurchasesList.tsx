import React, { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';
import { 
  Plus, DollarSign,
  ShoppingCart, Package, Clock, ChevronRight, Truck, User as UserIcon,
  Printer, CheckSquare, ChevronDown, AlertTriangle, X, CheckCircle, Download, Eye,
  FileText, ArrowLeft, RefreshCw, Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import * as docx from 'docx';
import { saveAs } from 'file-saver';
import { GoodsNameWithPreview } from '../../components/GoodsNameWithPreview';
import { toast } from 'react-toastify';

interface PurchasesListProps {
  onCreateNew: () => void;
  onViewDetail: (id: string, ids?: string[]) => void;
  onShowHistory: () => void;
  recreateConfig: any | null;
  clearRecreateConfig: () => void;
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

const formatDigitalSignatureDate = (date?: string | Date) => {
    const d = date ? new Date(date) : new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
};

export function numberToVietnameseWords(num: number): string {
    if (num === 0) return 'không';
    
    const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
    const digitNames = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    
    function readGroup(n: number): string {
        let s = '';
        const hundreds = Math.floor(n / 100);
        const tens = Math.floor((n % 100) / 10);
        const ones = n % 10;
        
        if (hundreds > 0) {
            s += digitNames[hundreds] + ' trăm ';
        } else if (s !== '') {
            s += 'không trăm ';
        }
        
        if (tens > 1) {
            s += digitNames[tens] + ' mươi ';
        } else if (tens === 1) {
            s += 'mười ';
        } else if (tens === 0 && ones > 0 && hundreds > 0) {
            s += 'linh ';
        }
        
        if (ones > 0) {
            if (ones === 1 && tens > 1) {
                s += 'mốt';
            } else if (ones === 5 && tens > 0) {
                s += 'lăm';
            } else {
                s += digitNames[ones];
            }
        }
        return s.trim();
    }
    
    let str = '';
    let temp = Math.round(num);
    let groupIdx = 0;
    
    while (temp > 0) {
        const groupValue = temp % 1000;
        if (groupValue > 0) {
            const groupStr = readGroup(groupValue);
            str = groupStr + ' ' + (units[groupIdx] ? units[groupIdx] + ' ' : '') + str;
        }
        temp = Math.floor(temp / 1000);
        groupIdx++;
    }
    
    str = str.trim();
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function sortItemsForPrinting(items: any[]) {
  return [...items].sort((a, b) => {
    const groupA = a.printSortGroup || getItemSortGroupName(a.name || '');
    const groupB = b.printSortGroup || getItemSortGroupName(b.name || '');
    if (groupA !== groupB) return groupA.localeCompare(groupB, "vi");
    if (a.name !== b.name) return (a.name || '').localeCompare(b.name || '', "vi");
    if ((a.mvpp || '').startsWith('VS') && !(b.mvpp || '').startsWith('VS')) return 1;
    if (!(a.mvpp || '').startsWith('VS') && (b.mvpp || '').startsWith('VS')) return -1;
    return (a.mvpp || '').localeCompare(b.mvpp || '', "vi");
  });
}

function normalizeClassificationText(val: any): string {
  if (val === null || val === undefined) return '';
  return val.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function isVppItem(item: any): boolean {
  if (!item) return false;

  const mvppNorm = normalizeClassificationText(item.mvpp);
  if (mvppNorm.startsWith('vpp')) return true;

  const fields = [
    item.name,
    item.itemType,
    item.category,
    item.categoryName,
    item.groupName,
    item.warehouseGroup,
    item.materialGroup
  ];

  const vppKeywords = [
    'vpp',
    'van phong pham',
    'dung cu van phong',
    'giay in',
    'bang dinh',
    'keo',
    'bia tai lieu',
    'hop so',
    'ho kho',
    'xoa',
    'do doc',
    'kep bam',
    'kep mau',
    'ghim',
    'so sach'
  ];

  return fields.some(field => {
    const norm = normalizeClassificationText(field);
    if (!norm) return false;
    return vppKeywords.some(keyword => norm.includes(keyword));
  });
}

function isVeSinhItem(item: any): boolean {
  if (!item) return false;

  const mvppNorm = normalizeClassificationText(item.mvpp);
  if (mvppNorm.startsWith('vs')) return true;

  const fields = [
    item.name,
    item.itemType,
    item.category,
    item.categoryName,
    item.groupName,
    item.warehouseGroup,
    item.materialGroup
  ];

  const veSinhKeywords = [
    've sinh',
    'do ve sinh',
    'tap hoa',
    'hoa chat',
    'hoa my pham',
    'nuoc nong',
    'coc',
    'khan',
    'khan lau',
    'cay lau',
    'choi',
    'tui rac',
    'bao rac',
    'thung rac',
    'nuoc rua',
    'nuoc lau',
    'lau san',
    'giay ve sinh',
    'xa phong',
    'rua bat',
    'rua chen',
    'tay rua',
    'diet khuan',
    'gang tay',
    'khau trang',
    'vat tu giay',
    'nuoc uong',
    'thiet bi hanh chinh',
    'bao ho lao dong',
    'y te'
  ];

  return fields.some(field => {
    const norm = normalizeClassificationText(field);
    if (!norm) return false;
    return veSinhKeywords.some(keyword => norm.includes(keyword));
  });
}

function getItemCategoryType(item: any): 'VPP' | 'VE_SINH' | 'OTHER' {
  if (!item) return 'OTHER';
  if (isVeSinhItem(item)) return 'VE_SINH';
  if (isVppItem(item)) return 'VPP';
  return 'OTHER';
}

function firstNumber(...values: any[]): number {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') {
      const numberValue = Number(value);
      if (!Number.isNaN(numberValue)) return numberValue;
    }
  }
  return 0;
}

function getEffectiveLineItem(line: any): any {
  if (!line) return null;
  const hasReplacement = !!line.requestLine?.replacementItemId;
  if (hasReplacement && line.requestLine?.replacementItem) return line.requestLine.replacementItem;
  return line.item || line.requestLine?.replacementItem || line.requestLine?.item || line.replacementItem || null;
}

function getLinePrintQty(line: any): number {
  const hasReplacement = !!line?.requestLine?.replacementItemId;
  return hasReplacement
    ? firstNumber(
        line.effectiveQty,
        line.requestLine?.replacementQty,
        line.qtyDelivered,
        line.qtyOrdered,
        line.qtyApproved,
        line.qtyRequested,
        line.requestLine?.qtyApproved,
        line.requestLine?.qtyRequested
      )
    : firstNumber(
        line.effectiveQty,
        line.qtyDelivered,
        line.qtyOrdered,
        line.qtyApproved,
        line.qtyRequested,
        line.requestLine?.qtyApproved,
        line.requestLine?.qtyRequested
      );
}

function getLinePrintPrice(line: any, effectiveItem?: any): number {
  const hasReplacement = !!line?.requestLine?.replacementItemId;
  return hasReplacement
    ? firstNumber(
        line.effectivePrice,
        line.requestLine?.replacementPrice,
        line.unitPrice,
        effectiveItem?.price,
        line.item?.price,
        line.requestLine?.item?.price
      )
    : firstNumber(
        line.effectivePrice,
        line.unitPrice,
        effectiveItem?.price,
        line.item?.price,
        line.requestLine?.item?.price
      );
}

function getEligibleRequestCount(templateKey: 'VPP' | 'VE_SINH', selectedRequests: any[]): number {
  if (!selectedRequests || selectedRequests.length === 0) return 0;
  
  const eligibleRequests = selectedRequests.filter(po => {
    if (!po.lines) return false;
    return po.lines.some((line: any) => {
      const effectiveItem = getEffectiveLineItem(line);
      if (!effectiveItem) return false;
      return getItemCategoryType(effectiveItem) === templateKey;
    });
  });

  return eligibleRequests.length;
}

function hasPermission(role: string, permission: string): boolean {
  if (role === 'ADMIN') return true;
  
  const permissionsMap: Record<string, string[]> = {
    ADMIN: [
      'REPORT_PRINT', 'REPORT_EXPORT_PDF', 'REPORT_EXPORT_WORD', 'REPORT_EXPORT_EXCEL',
      'PURCHASE_REPORT_VIEW', 'CONSUMPTION_REPORT_VIEW'
    ],
    WAREHOUSE: [
      'REPORT_PRINT', 'REPORT_EXPORT_PDF', 'REPORT_EXPORT_WORD', 'REPORT_EXPORT_EXCEL',
      'PURCHASE_REPORT_VIEW', 'CONSUMPTION_REPORT_VIEW'
    ],
    MANAGER: [
      'REPORT_PRINT', 'REPORT_EXPORT_PDF', 'REPORT_EXPORT_EXCEL',
      'PURCHASE_REPORT_VIEW', 'CONSUMPTION_REPORT_VIEW'
    ],
    EMPLOYEE: []
  };

  return (permissionsMap[role] || []).includes(permission);
}

const PurchasesList: React.FC<PurchasesListProps> = ({ onCreateNew, onViewDetail, onShowHistory, recreateConfig, clearRecreateConfig }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  
  // Bulk Selection & Printing states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedPrintType, setSelectedPrintType] = useState<'ALL' | 'VPP' | 'VE_SINH' | 'DEPT_VPP' | 'DEPT_VS' | 'REQ_DEPT_VPP' | 'REQ_DEPT_VS'>('ALL');
  const [selectedPrintDetailMode, setSelectedPrintDetailMode] = useState<'SUMMARY' | 'DETAIL'>('SUMMARY');
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  // const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [previewPO, setPreviewPO] = useState<any | null>(null);

  // New report setup states
  const [showReportSetupModal, setShowReportSetupModal] = useState(false);
  const [setupReportType, setSetupReportType] = useState<'PURCHASE_SUMMARY' | 'CONSUMPTION_BY_DEPARTMENT' | 'REQUEST_DEPARTMENT_SUMMARY'>('PURCHASE_SUMMARY');
  const [setupCategoryType, setSetupCategoryType] = useState<'VPP' | 'VE_SINH'>('VPP');
  const [setupFormat, setSetupFormat] = useState<'PDF' | 'DOCX' | 'XLSX'>('PDF');
  const [setupDetailMode, setSetupDetailMode] = useState<'SUMMARY' | 'DETAIL'>('SUMMARY');
  const [exportLoading, setExportLoading] = useState(false);

  // Export module states (Task 1, 2, 3)
  const [showExportConfigModal, setShowExportConfigModal] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    report_type: 'SUMMARY',
    group_by: ['MONTH', 'DEPARTMENT', 'CATEGORY'],
    format: 'PDF',
    include_items: true,
    include_signature_block: true
  });

  const [showExportPreviewModal, setShowExportPreviewModal] = useState(false);
  const [previewActiveTab, setPreviewActiveTab] = useState<'SUMMARY' | 'DETAIL' | 'ITEMS' | 'CLASSIFICATION'>('SUMMARY');
  const [itemsClassification, setItemsClassification] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const currentUser = useMemo(() => {
    const saved = localStorage.getItem('vpp_user');
    return saved ? JSON.parse(saved) : null;
  }, []);
  const userRole = currentUser?.role || 'EMPLOYEE';

  const checkHasMatchingItem = (category: 'VPP' | 'VE_SINH'): boolean => {
    const selectedPOs = data.filter(po => selectedIds.includes(po.id));
    return selectedPOs.some(po => {
      if (!po.lines) return false;
      return po.lines.some((line: any) => {
        const effectiveItem = getEffectiveLineItem(line);
        if (!effectiveItem) return false;
        
        const override = itemsClassification?.find((c: any) => c.item_id === effectiveItem.id);
        const classification = override ? override.final_classification : getItemCategoryType(effectiveItem);
        
        const normalizedClass = (classification || '').toString().toUpperCase();
        const normalizedCategory = category.toUpperCase();
        
        if (normalizedCategory === 'VPP') {
          return normalizedClass === 'VPP';
        } else if (normalizedCategory === 'VE_SINH') {
          return normalizedClass === 'VE_SINH' || normalizedClass === 'DO_VE_SINH' || normalizedClass.includes('VỆ SINH');
        }
        return false;
      });
    });
  };

  const getPeriodLabel = (poIds: string[]): string => {
    if (!poIds || poIds.length === 0) return '';
    const selectedPOs = data.filter(po => poIds.includes(po.id));
    const months = selectedPOs.map(po => {
      const date = new Date(po.createdAt);
      return `${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`;
    });
    const uniqueMonths = Array.from(new Set(months));
    return uniqueMonths.length === 1 ? `_Selected_${uniqueMonths[0]}` : '_Selected_MultiMonth';
  };

  const selectedTotal = useMemo(() => {
    return data
      .filter(d => selectedIds.includes(d.id))
      .reduce((sum, d) => sum + Number(d.actualTotal || d.totalAmount || 0), 0);
  }, [data, selectedIds]);

  const checkPOAccess = (po: any) => {
    if (!currentUser) return false;
    const userId = currentUser.userId || currentUser.id;
    if (currentUser.role === 'ADMIN') return true;
    if (po.assignedToId === userId) return true;
    if (currentUser.role === 'MANAGER' && currentUser.departmentId) {
      if (po.requester?.departmentId === currentUser.departmentId) return true;
    }
    if (po.requesterId === userId) return true;
    return false;
  };

  const getFilteredPOsOnFrontend = (pos: any[], user: any) => {
    const valid: any[] = [];
    const excluded: any[] = [];
    pos.forEach(po => {
      if (checkPOAccess(po)) {
        valid.push(po);
      } else {
        excluded.push(po);
      }
    });
    return { valid, excluded };
  };

  const getSelectedItemsFullSnapshot = (selectedPOs: any[]) => {
    const itemMap = new Map<string, any>();
    selectedPOs.forEach(po => {
      if (!po.lines) return;
      po.lines.forEach((line: any) => {
        const item = getEffectiveLineItem(line);
        if (!item) return;
        if (!itemMap.has(item.id)) {
          const nameLower = item.name.toLowerCase();
          const vppKeywords = ['giấy', 'giấy in', 'bút', 'file', 'kẹp', 'ghim', 'sổ', 'bìa', 'hồ sơ', 'văn phòng phẩm', 'giấy note', 'mực in'];
          const vsKeywords = ['nước rửa tay', 'nước lau sàn', 'giấy vệ sinh', 'túi rác', 'chổi', 'cây lau', 'xà phòng', 'dung dịch tẩy rửa', 'khăn lau', 'nước tẩy'];
          let system_classification = 'Khác';
          if (vppKeywords.some(kw => nameLower.includes(kw))) system_classification = 'VPP';
          else if (vsKeywords.some(kw => nameLower.includes(kw))) system_classification = 'Đồ vệ sinh';
          itemMap.set(item.id, {
            item_id: item.id,
            item_name: item.name,
            system_classification,
            final_classification: system_classification,
            changed_by_user: false
          });
        }
      });
    });
    return Array.from(itemMap.values());
  };

  const getSelectedItemsFullSnapshotWithRecreate = (selectedPOs: any[], recreateSnapshot: any[]) => {
    const snapshot = getSelectedItemsFullSnapshot(selectedPOs);
    if (!recreateSnapshot || !Array.isArray(recreateSnapshot)) return snapshot;
    const recreateMap = new Map<string, any>();
    recreateSnapshot.forEach(item => {
      recreateMap.set(item.item_id, item);
    });
    return snapshot.map(item => {
      if (recreateMap.has(item.item_id)) {
        const rec = recreateMap.get(item.item_id);
        return {
          ...item,
          final_classification: rec.final_classification || item.final_classification,
          changed_by_user: rec.changed_by_user || false
        };
      }
      return item;
    });
  };

  useEffect(() => {
    if (recreateConfig && data.length > 0) {
      const poIds = recreateConfig.selectedPoIds || [];
      setSelectedIds(poIds);
      setIsBulkMode(true);
      
      const config = recreateConfig.configJson || {};
      setExportConfig({
        report_type: config.report_type || 'SUMMARY',
        group_by: config.group_by || ['MONTH', 'DEPARTMENT', 'CATEGORY'],
        format: recreateConfig.format || 'PDF',
        include_items: config.include_items !== undefined ? config.include_items : true,
        include_signature_block: config.include_signature_block !== undefined ? config.include_signature_block : true
      });
      
      const overrides = recreateConfig.classificationOverrideJson || [];
      const selectedPOs = data.filter(d => poIds.includes(d.id));
      const snapshot = getSelectedItemsFullSnapshotWithRecreate(selectedPOs, overrides);
      setItemsClassification(snapshot);
      
      setShowExportConfigModal(true);
      clearRecreateConfig();
    }
  }, [recreateConfig, data]);



  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchases');
      setData(res.data);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string, hasReplacement?: boolean, pendingReplacement?: boolean) => {
      let badge = null;
      switch(status) {
          case 'DRAFT': badge = <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 font-black text-[9px] uppercase border border-slate-200">Nháp</span>; break;
          case 'PENDING_APPROVAL': badge = <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-600 font-black text-[9px] uppercase border border-amber-200">Chờ Duyệt</span>; break;
          case 'PARTIALLY_APPROVED': badge = <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700 font-black text-[9px] uppercase border border-amber-300">Duyệt Một Phần</span>; break;
          case 'APPROVED': badge = <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 font-black text-[9px] uppercase border border-indigo-200">Chờ Mua Sắm</span>; break;
          case 'ORDERED': badge = <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 font-black text-[9px] uppercase border border-blue-200">Chờ Giao Hàng</span>; break;
          case 'DELIVERING': badge = <span className="px-2 py-1 rounded-lg bg-cyan-50 text-cyan-600 font-black text-[9px] uppercase border border-cyan-200">Đang Giao</span>; break;
          case 'PARTIALLY_DELIVERED': badge = <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 font-black text-[9px] uppercase border border-blue-300">Giao Một Phần</span>; break;
          case 'COMPLETED': badge = <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 font-black text-[9px] uppercase border border-emerald-200">Hoàn Tất</span>; break;
          case 'REJECTED': badge = <span className="px-2 py-1 rounded-lg bg-rose-50 text-rose-600 font-black text-[9px] uppercase border border-rose-200">Từ Chối</span>; break;
          case 'CANCELLED': badge = <span className="px-2 py-1 rounded-lg bg-slate-50 text-slate-400 font-black text-[9px] uppercase border border-slate-200 line-through">Đã Hủy</span>; break;
          default: badge = <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 font-black text-[9px] uppercase">{status}</span>;
      }

      return (
        <div className="flex flex-col gap-1 items-center">
          {badge}
          {pendingReplacement && (
            <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white font-black text-[8px] uppercase animate-pulse shadow-sm shadow-rose-500/20">Chờ xác nhận thay thế</span>
          )}
          {hasReplacement && !pendingReplacement && (
            <span className="px-2 py-0.5 rounded-md bg-indigo-500 text-white font-black text-[8px] uppercase shadow-sm shadow-indigo-500/20">Có thay thế</span>
          )}
        </div>
      );
  };

  const filteredData = data.filter(d => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchSearch = 
          d.id.toLowerCase().includes(lowerSearch) || 
          (d.title || '').toLowerCase().includes(lowerSearch) ||
          (d.supplier || '').toLowerCase().includes(lowerSearch) ||
          (d.requesterName || '').toLowerCase().includes(lowerSearch) ||
          (d.assignedToName || '').toLowerCase().includes(lowerSearch) ||
          d.topItems?.some((i: string) => i.toLowerCase().includes(lowerSearch)) ||
          d.depts?.some((dp: string) => dp.toLowerCase().includes(lowerSearch)) ||
          d.warehouses?.some((w: string) => w.toLowerCase().includes(lowerSearch));
      
      let matchTab = true;
      if (activeTab === 'DRAFT') matchTab = d.status === 'DRAFT';
      if (activeTab === 'PENDING') matchTab = d.status === 'PENDING_APPROVAL';
      if (activeTab === 'APPROVED') matchTab = d.status === 'APPROVED';
      if (activeTab === 'ORDERED') matchTab = d.status === 'ORDERED';
      if (activeTab === 'DELIVERING') matchTab = ['DELIVERING', 'PARTIALLY_DELIVERED'].includes(d.status);
      if (activeTab === 'COMPLETED') matchTab = d.status === 'COMPLETED';

      let matchMonth = true;
      if (selectedMonth) {
          const poDate = new Date(d.createdAt || d.orderDate);
          const poMonth = `${poDate.getFullYear()}-${String(poDate.getMonth() + 1).padStart(2, '0')}`;
          matchMonth = poMonth === selectedMonth;
      }

      return matchSearch && matchTab && matchMonth;
  });

  // Summary aggregation logic - Optimized for original request tracking
  const summaryGroups = useMemo(() => {
      const groups = new Map<string, Map<string, any>>();
      const processedReqLineIds = new Set();
      const targetData = selectedIds.length > 0 
        ? data.filter(d => selectedIds.includes(d.id))
        : filteredData;

      targetData.forEach(po => {
          if (['CANCELLED', 'REJECTED'].includes(po.status)) return;
          
          po.lines?.forEach((line: any) => {
              const isReplaced = !!line.requestLine?.replacementItemId;
              const effectiveItem = getEffectiveLineItem(line);
              if (!effectiveItem) return;

              const type = getItemCategoryType(effectiveItem);

              if (!groups.has(type)) groups.set(type, new Map());
              const typeMap = groups.get(type)!;
              
              const key = effectiveItem.mvpp || effectiveItem.id;
              const effectiveQty = getLinePrintQty(line);
              const effectivePrice = getLinePrintPrice(line, effectiveItem);
              const effectiveItemName = effectiveItem.name || line.item?.name || '';

              // For Totals comparison
              const originalQty = firstNumber(line.requestLine?.qtyRequested, line.qtyRequested, line.qtyApproved, line.qtyOrdered, line.qtyDelivered);
              const originalPrice = firstNumber(line.requestLine?.unitPrice, line.requestLine?.item?.price, line.unitPrice, line.item?.price, effectiveItem.price);

              const current = typeMap.get(key) || {
                  mvpp: effectiveItem.mvpp || effectiveItem.id,
                  name: effectiveItemName,
                  unit: effectiveItem.unit || line.item?.unit || line.requestLine?.item?.unit || '',
                  price: effectivePrice || 0,
                  qty: 0,
                  originalTotal: 0,
                  actualTotal: 0,
                  deptBreakdown: new Map<string, { qty: number, notes: string[], requestCode: string, dept: string }>(),
                  replacements: [] as any[]
              };
              
              // CRITICAL: Get department, quantity, and notes from ORIGINAL request line
              // PRIORITY for Dept: requestLine.request.department -> requester.department.name -> po.department -> po.requesterDepartment
              const originalRequest = line.requestLine?.request;
              const originalRequestLine = line.requestLine;
              const deptName = line.originalDept || 
                              originalRequest?.department || 
                              originalRequest?.requester?.department?.name ||
                              po.department || 
                              po.requesterDepartment || 
                              null;

              const requestCode = line.fuzzyRequestCode || originalRequest?.id || po.id;
              
              // PRIORITY for Note: line.originalNote (Fuzzy resolved) -> requestLine.note -> requestLine.approvalNote -> request.purpose -> po.purpose -> line.note
              // IMPORTANT: Ignore generic "Backorder" notes if we have a better one
              let specificNote = line.originalNote || 
                                 originalRequestLine?.note || 
                                 originalRequestLine?.approvalNote || 
                                 originalRequest?.purpose || 
                                 po.purpose || 
                                 '';
              
              // If we only have the generic backorder note, keep it as fallback
              if (!specificNote) specificNote = line.note || '';

              const originalUnit = originalRequestLine?.item?.unit || line.item?.unit || effectiveItem.unit;
              const allocationQty = isReplaced
                ? firstNumber(
                    originalRequestLine?.replacementQty,
                    originalRequestLine?.qtyApproved,
                    originalRequestLine?.qtyRequested,
                    line.qtyDelivered,
                    line.qtyRequested,
                    line.qtyApproved,
                    line.qtyOrdered
                  )
                : firstNumber(
                    originalRequestLine?.qtyApproved,
                    originalRequestLine?.qtyRequested,
                    line.qtyDelivered,
                    line.qtyRequested,
                    line.qtyApproved,
                    line.qtyOrdered
                  );

              const allocationKey = `${deptName || 'UNLINKED'}-${requestCode}-${specificNote}`;
              const existingDept = current.deptBreakdown.get(allocationKey) || { 
                qty: 0, 
                notes: [specificNote], 
                requestCode: requestCode, 
                dept: deptName,
                unit: originalUnit
              };
              
              existingDept.qty += allocationQty;
              // If we ever had different notes for the same key (unlikely with this key), we'd append them
              if (specificNote && !existingDept.notes.includes(specificNote)) existingDept.notes.push(specificNote);
              
              current.qty += effectiveQty;
              
              // De-duplicate originalTotal calculation across all PO lines in the summary
              if (line.requestLineId && !processedReqLineIds.has(line.requestLineId)) {
                  processedReqLineIds.add(line.requestLineId);
                  const fullOriginalQty = firstNumber(line.requestLine?.qtyRequested, line.qtyRequested, line.qtyApproved, line.qtyOrdered, line.qtyDelivered);
                  current.originalTotal += (fullOriginalQty * originalPrice);
              } else if (!line.requestLineId) {
                  current.originalTotal += (originalQty * originalPrice);
              }

              current.actualTotal += (effectiveQty * effectivePrice);
              
              // Ensure the displayed price is consistent with the total if possible
              // For the summary, we'll use the price from the latest PO line processed
              if (effectivePrice > 0) current.price = effectivePrice;
              
              current.deptBreakdown.set(allocationKey, existingDept);

              if (isReplaced) {
                const repKey = `${line.item?.mvpp || line.requestLine?.item?.mvpp || effectiveItem.mvpp || effectiveItem.id}-${line.requestLine.replacementReason}`;
                if (!current.replacements.some((r: any) => r.key === repKey)) {
                  current.replacements.push({
                    key: repKey,
                    originalName: line.requestLine?.item?.name || line.item?.name,
                    originalCode: line.requestLine?.item?.mvpp || line.item?.mvpp,
                    originalPrice: originalPrice,
                    originalQty: originalQty,
                    reason: line.requestLine.replacementReason,
                    diff: (originalQty * originalPrice) - (effectiveQty * effectivePrice)
                  });
                }
              }

              typeMap.set(key, current);
          });
      });

      return Array.from(groups.entries()).map(([type, itemsMap]) => {
          const items = sortItemsForPrinting(Array.from(itemsMap.values())
              .map(item => {
                  // Normalize total to ensure consistency with displayed Price * Qty in the summary report
                  // This prevents discrepancies when lines have slightly different prices or fallbacks.
                  const normalizedTotal = Number(item.qty) * Number(item.price);
                  
                  return {
                      ...item,
                      actualTotal: normalizedTotal,
                      deptEntries: Array.from(item.deptBreakdown.values())
                        .map((d: any) => ({ 
                          dept: d.dept, 
                          qty: d.qty, 
                          note: d.notes.filter(Boolean).join('; '), 
                          requestCode: d.requestCode,
                          unit: d.unit
                        }))
                        .sort((a: any, b: any) => b.qty - a.qty)
                  };
              }));
          
          const groupApprovedTotal = items.reduce((s, i) => s + i.originalTotal, 0);
          const groupActualTotal = items.reduce((s, i) => s + i.actualTotal, 0);

          return {
              type,
              label: (type.toUpperCase() === 'VPP') ? 'VĂN PHÒNG PHẨM' : 
                     (type.toUpperCase() === 'VE_SINH') ? 'VỆ SINH' : 'CHƯA PHÂN LOẠI',
              items,
              approvedTotal: groupApprovedTotal,
              actualTotal: groupActualTotal,
              savings: groupApprovedTotal - groupActualTotal,
              poCount: new Set(targetData.map(d => d.id)).size
          };
      }).filter(g => g.items.length > 0);
  }, [data, filteredData, selectedIds]);
  
  const currentPrintGroups = useMemo(() => {
    return summaryGroups.filter(
      g => selectedPrintType === 'ALL' || g.type === selectedPrintType
    );
  }, [summaryGroups, selectedPrintType]);

  const printDashboardSummary = useMemo(() => {
    const proposed = currentPrintGroups.reduce(
      (sum, g) => sum + Number(g.approvedTotal || 0),
      0
    );

    const actual = currentPrintGroups.reduce(
      (sum, g) => sum + Number(g.actualTotal || 0),
      0
    );

    const diff = proposed - actual; // >0 tiết kiệm, <0 tăng chi

    return {
      proposed,
      actual,
      diff,
      absDiff: Math.abs(diff),
      rate: proposed > 0 ? (Math.abs(diff) / proposed) * 100 : 0,
    };
  }, [currentPrintGroups]);

  const printStats = useMemo(() => {
    const selectedRequests = selectedIds.length > 0 
      ? data.filter(po => selectedIds.includes(po.id))
      : [];

    const vppCount = getEligibleRequestCount('VPP', selectedRequests);
    const vsCount = getEligibleRequestCount('VE_SINH', selectedRequests);
    const otherCount = summaryGroups.find(g => !['VPP', 'VE_SINH'].includes(g.type))?.items.length || 0;

    return { vppCount, vsCount, otherCount, total: vppCount + vsCount + otherCount };
  }, [selectedIds, data, summaryGroups]);

  const executiveData = useMemo(() => {
    let deptStats = new Map<string, { proposed: number, actual: number, savings: number }>();
    let optStats = {
        replacement: { count: 0, savings: 0 },
        qtyAdjustment: { count: 0, savings: 0 },
        priceAdjustment: { count: 0, savings: 0 },
        other: { count: 0, savings: 0 }
    };

    let totalProposed = 0;
    let totalActual = 0;
    let totalSavings = 0;
    let optimizedPoCount = 0;

    const targetData = selectedIds.length > 0 
        ? data.filter(d => selectedIds.includes(d.id))
        : data.filter(d => ['ORDERED', 'DELIVERING', 'PARTIALLY_DELIVERED', 'COMPLETED'].includes(d.status));

    targetData.forEach(po => {
        let poProposed = 0;
        let poActual = 0;
        let poHasReplacement = false;
        let poHasQtyAdj = false;
        let poHasPriceAdj = false;
        let poHasOtherAdj = false;

        const dept = po.department || po.requesterDepartment || po.requester?.department?.name || 'Khác';

        po.lines.forEach((line: any) => {
            const reqLine = line.requestLine;
            const effectiveItem = getEffectiveLineItem(line);
            
            const originalPrice = firstNumber(reqLine?.unitPrice, reqLine?.item?.price, line.unitPrice, line.item?.price, effectiveItem?.price);
            const originalQty = firstNumber(reqLine?.qtyRequested, line.qtyRequested, line.qtyApproved, line.qtyOrdered, line.qtyDelivered);
            const lineProposed = originalPrice * originalQty;

            const isReplaced = !!reqLine?.replacementItemId;
            const actualPrice = getLinePrintPrice(line, effectiveItem);
            const actualQty = getLinePrintQty(line);
            const lineActual = actualPrice * actualQty;

            poProposed += lineProposed;
            poActual += lineActual;

            const lineSavings = lineProposed - lineActual;

            if (isReplaced) {
                optStats.replacement.savings += lineSavings;
                poHasReplacement = true;
            } else if (actualQty < originalQty) {
                optStats.qtyAdjustment.savings += lineSavings;
                poHasQtyAdj = true;
            } else if (actualPrice < originalPrice && actualPrice > 0) {
                optStats.priceAdjustment.savings += lineSavings;
                poHasPriceAdj = true;
            } else if (lineSavings > 0) {
                optStats.other.savings += lineSavings;
                poHasOtherAdj = true;
            }
        });

        const diff = poProposed - poActual;
        if (diff > 0) {
            optimizedPoCount++;
        }

        totalProposed += poProposed;
        totalActual += poActual;
        totalSavings += diff;

        if (poHasReplacement) optStats.replacement.count++;
        if (poHasQtyAdj) optStats.qtyAdjustment.count++;
        if (poHasPriceAdj) optStats.priceAdjustment.count++;
        if (poHasOtherAdj) optStats.other.count++;

        const currentDept = deptStats.get(dept) || { proposed: 0, actual: 0, savings: 0 };
        currentDept.proposed += poProposed;
        currentDept.actual += poActual;
        currentDept.savings += diff;
        deptStats.set(dept, currentDept);
    });

    const deptArray = Array.from(deptStats.entries())
        .map(([name, stats]) => ({
            name,
            ...stats,
            percentage: stats.proposed > 0 ? (stats.savings / stats.proposed) * 100 : 0
        }))
        .sort((a, b) => b.savings - a.savings);

    return {
        deptArray,
        optStats,
        totalProposed,
        totalActual,
        totalSavings,
        optimizedPoCount
    };
  }, [data, selectedIds]);

  const getDeptReportData = (printType: 'DEPT_VPP' | 'DEPT_VS') => {
      const targetData = selectedIds.length > 0 
        ? data.filter(d => selectedIds.includes(d.id))
        : filteredData;

      const map = new Map<string, {
          name: string;
          requestCodes: Set<string>;
          items: Set<string>;
          actualTotal: number;
          notes: Set<string>;
      }>();

      targetData.forEach(po => {
          po.lines?.forEach((line: any) => {
              const effectiveItem = getEffectiveLineItem(line);
              if (!effectiveItem) return;

              const categoryType = getItemCategoryType(effectiveItem);

              // Filter based on printType (VPP vs VE_SINH)
              if (printType === 'DEPT_VPP' && categoryType !== 'VPP') return;
              if (printType === 'DEPT_VS' && categoryType !== 'VE_SINH') return;

              const originalRequest = line.requestLine?.request;
              const deptName = line.originalDept || 
                               originalRequest?.department || 
                               originalRequest?.requester?.department?.name ||
                               po.department || 
                               po.requesterDepartment || 
                               'Khác';

              const requestCode = line.fuzzyRequestCode || originalRequest?.id || po.id;

              const effectiveQty = getLinePrintQty(line);
              const effectivePrice = getLinePrintPrice(line, effectiveItem);
              const lineActualTotal = effectiveQty * effectivePrice;

              let specificNote = line.originalNote || 
                                 line.requestLine?.note || 
                                 line.requestLine?.approvalNote || 
                                 originalRequest?.purpose || 
                                 po.purpose || 
                                 line.note ||
                                 '';
              
              if (!map.has(deptName)) {
                  map.set(deptName, {
                      name: deptName,
                      requestCodes: new Set(),
                      items: new Set(),
                      actualTotal: 0,
                      notes: new Set()
                  });
              }

              const deptStats = map.get(deptName)!;
              deptStats.requestCodes.add(requestCode);
              deptStats.items.add(effectiveItem.mvpp || effectiveItem.id);
              deptStats.actualTotal += lineActualTotal;
              if (specificNote && specificNote.trim()) {
                  deptStats.notes.add(specificNote.trim());
              }
          });
      });

      const list = Array.from(map.values()).map(dept => {
          return {
              name: dept.name,
              requestCount: dept.requestCodes.size,
              itemCount: dept.items.size,
              actualTotal: dept.actualTotal,
              notes: Array.from(dept.notes).slice(0, 3).join('; ')
          };
      });

      list.sort((a, b) => b.actualTotal - a.actualTotal);

      const totalActual = list.reduce((sum, d) => sum + d.actualTotal, 0);
      const totalRequests = list.reduce((sum, d) => sum + d.requestCount, 0);
      
      const globalUniqueItems = new Set<string>();
      const globalUniqueRequests = new Set<string>();
      targetData.forEach(po => {
          po.lines?.forEach((line: any) => {
              const effectiveItem = getEffectiveLineItem(line);
              if (!effectiveItem) return;

              const categoryType = getItemCategoryType(effectiveItem);

              if (printType === 'DEPT_VPP' && categoryType !== 'VPP') return;
              if (printType === 'DEPT_VS' && categoryType !== 'VE_SINH') return;

              globalUniqueItems.add(effectiveItem.mvpp || effectiveItem.id);
              
              const originalRequest = line.requestLine?.request;
              const requestCode = line.fuzzyRequestCode || originalRequest?.id || po.id;
              globalUniqueRequests.add(requestCode);
          });
      });

      const listWithPercentage = list.map(d => ({
          ...d,
          percentage: totalActual > 0 ? (d.actualTotal / totalActual) * 100 : 0
      }));

      const highestDept = listWithPercentage.length > 0 ? listWithPercentage[0] : null;
      
      return {
          departments: listWithPercentage,
          totalActual,
          totalRequests,
          totalUniqueItems: globalUniqueItems.size,
          totalUniqueRequests: globalUniqueRequests.size,
          highestDeptName: highestDept ? highestDept.name : '—',
          highestDeptValue: highestDept ? highestDept.actualTotal : 0,
          poCount: targetData.length
      };
  };

  const deptReportDataVPP = useMemo(() => getDeptReportData('DEPT_VPP'), [data, filteredData, selectedIds]);
  const deptReportDataVS = useMemo(() => getDeptReportData('DEPT_VS'), [data, filteredData, selectedIds]);

  const getReqDeptReportData = (categoryType: 'VPP' | 'VE_SINH') => {
    const targetData = selectedIds.length > 0 
      ? data.filter(d => selectedIds.includes(d.id))
      : filteredData;

    const map = new Map<string, {
      name: string;
      requestCodes: Set<string>;
      items: Set<string>;
      qtyRequested: number;
      qtyApproved: number;
      qtyPurchased: number;
      estimatedValue: number;
      notes: Set<string>;
      detailLines: any[];
    }>();

    targetData.forEach(po => {
      po.lines?.forEach((line: any) => {
        const effectiveItem = getEffectiveLineItem(line);
        if (!effectiveItem) return;

        const category = getItemCategoryType(effectiveItem);
        if (category !== categoryType) return;

        const originalRequest = line.requestLine?.request;
        const deptName = line.originalDept || 
                         originalRequest?.department || 
                         originalRequest?.requester?.department?.name ||
                         po.department || 
                         'Khác';

        const requestCode = line.fuzzyRequestCode || originalRequest?.id || po.id;
        
        const qtyRequested = firstNumber(line.requestLine?.qtyRequested, line.qtyRequested, line.qtyApproved, line.qtyOrdered, line.qtyDelivered);
        const qtyApproved = firstNumber(
          line.requestLine?.qtyAdminApproved,
          line.requestLine?.qtyManagerApproved,
          line.requestLine?.qtyApproved,
          line.requestLine?.qtyRequested,
          line.qtyApproved,
          line.qtyRequested,
          line.qtyOrdered,
          line.qtyDelivered
        );
        const qtyPurchased = getLinePrintQty(line);
        const price = getLinePrintPrice(line, effectiveItem);
        const actualValue = qtyPurchased * price;

        const specificNote = line.originalNote || line.requestLine?.note || '';

        if (!map.has(deptName)) {
          map.set(deptName, {
            name: deptName,
            requestCodes: new Set(),
            items: new Set(),
            qtyRequested: 0,
            qtyApproved: 0,
            qtyPurchased: 0,
            estimatedValue: 0,
            notes: new Set(),
            detailLines: []
          });
        }

        const current = map.get(deptName)!;
        current.requestCodes.add(requestCode);
        current.items.add(effectiveItem.mvpp || effectiveItem.id);
        current.qtyRequested += qtyRequested;
        current.qtyApproved += qtyApproved;
        current.qtyPurchased += qtyPurchased;
        current.estimatedValue += actualValue;
        if (specificNote && specificNote.trim()) {
          current.notes.add(specificNote.trim());
        }

        current.detailLines.push({
          requestCode,
          itemName: effectiveItem.name,
          qtyApproved,
          qtyPurchased,
          note: specificNote
        });
      });
    });

    const list = Array.from(map.values()).map(dept => {
      return {
        ...dept,
        requestCodesStr: Array.from(dept.requestCodes).join(', '),
        requestCount: dept.requestCodes.size,
        itemCount: dept.items.size,
        notesStr: Array.from(dept.notes).slice(0, 3).join('; ')
      };
    });

    list.sort((a, b) => b.estimatedValue - a.estimatedValue);
    const totalActual = list.reduce((sum, d) => sum + d.estimatedValue, 0);

    return {
      departments: list,
      totalActual,
      totalCount: list.length
    };
  };

  const reqDeptReportDataVPP = useMemo(() => getReqDeptReportData('VPP'), [data, filteredData, selectedIds]);
  const reqDeptReportDataVS = useMemo(() => getReqDeptReportData('VE_SINH'), [data, filteredData, selectedIds]);

  const handlePrintSummary = (type: 'ALL' | 'VPP' | 'VE_SINH' | 'DEPT_VPP' | 'DEPT_VS' | 'REQ_DEPT_VPP' | 'REQ_DEPT_VS' = 'ALL') => {
      setSelectedPrintType(type);
      setShowPrintMenu(false);
      setShowPrintConfirm(false);
      setTimeout(() => {
          window.print();
      }, 200);
  };

  const handleExportExcel = () => {
    if (summaryGroups.length === 0) {
        return;
    }
    
    const wb = XLSX.utils.book_new();
    
    summaryGroups.forEach(group => {
        const exportData = group.items.map((item, index) => ({
            'STT': index + 1,
            'Mã Vật Tư': item.mvpp,
            'Tên Vật Tư': item.name,
            'Đơn Vị Tính': item.unit,
            'Số Lượng': item.qty,
            'Đơn Giá Thực Tế': item.price,
            'Tổng Thực Tế': item.actualTotal,
            'Tổng Đề Xuất': item.originalTotal,
            'Tiết Kiệm': item.originalTotal - item.actualTotal,
            'Phòng Ban/Đơn vị': item.deptEntries.map((d: any) => `${d.dept} (${d.qty})`).join('; '),
            'Ghi chú': item.deptEntries.map((d: any) => d.note).filter(Boolean).join('; ')
        }));
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        // add total row
        XLSX.utils.sheet_add_json(ws, [{
            'STT': 'TỔNG CỘNG',
            'Mã Vật Tư': '',
            'Tên Vật Tư': '',
            'Đơn Vị Tính': '',
            'Số Lượng': group.items.reduce((s:number, i:any) => s + i.qty, 0),
            'Đơn Giá Thực Tế': '',
            'Tổng Thực Tế': group.actualTotal,
            'Tổng Đề Xuất': group.approvedTotal,
            'Tiết Kiệm': group.savings,
            'Phòng Ban/Đơn vị': '',
            'Ghi chú': ''
        }], {skipHeader: true, origin: -1});

        const wscols = [
            {wch: 5}, {wch: 15}, {wch: 35}, {wch: 10}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 30}, {wch: 30}
        ];
        ws['!cols'] = wscols;
        XLSX.utils.book_append_sheet(wb, ws, group.label.slice(0, 31));
    });

    // BÁO CÁO PHÒNG BAN SHEET
    const deptExportData = executiveData.deptArray.map((d, index) => ({
        'STT': index + 1,
        'Phòng ban': d.name,
        'Giá trị đề xuất': d.proposed,
        'Giá trị mua thực tế': d.actual,
        'Giá trị tối ưu': d.savings,
        'Tỷ lệ tối ưu': d.proposed > 0 ? ((d.savings / d.proposed) * 100).toFixed(2) + '%' : '0%'
    }));
    
    if (deptExportData.length > 0) {
        deptExportData.push({
            'STT': 'TỔNG CỘNG',
            'Phòng ban': '',
            'Giá trị đề xuất': executiveData.totalProposed,
            'Giá trị mua thực tế': executiveData.totalActual,
            'Giá trị tối ưu': executiveData.totalSavings,
            'Tỷ lệ tối ưu': executiveData.totalProposed > 0 ? ((executiveData.totalSavings / executiveData.totalProposed) * 100).toFixed(2) + '%' : '0%'
        } as any);

        const wsDept = XLSX.utils.json_to_sheet(deptExportData);
        wsDept['!cols'] = [{wch: 5}, {wch: 40}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 15}];
        XLSX.utils.book_append_sheet(wb, wsDept, "Báo cáo Phòng ban");
    }

    XLSX.writeFile(wb, `Tong_Hop_Mua_Sam_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleExportExcelTemplate = () => {


      if (summaryGroups.length === 0) {


          return;


      }


      if (selectedIds.length > 0) {


        const hasVPP = checkHasMatchingItem('VPP');


        const hasVS = checkHasMatchingItem('VE_SINH');


        if (!hasVPP && !hasVS) {


          toast.error("Các phiếu đã chọn không có dữ liệu phù hợp với mẫu báo cáo này.");


          return;


        }


      }
    
    const wb = XLSX.utils.book_new();
    
    summaryGroups.forEach(group => {
        const rows: any[] = [];
        
        // Header
        rows.push(["CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO"]);
        rows.push(["Báo cáo tổng hợp đơn mua sắm"]);
        rows.push(["Ban Hành chính Nhân sự"]);
        rows.push([]);
        
        const printTitle = group.type === 'VPP' 
            ? 'PHIẾU TỔNG HỢP MUA SẮM VĂN PHÒNG PHẨM' 
            : group.type === 'VE_SINH' 
                ? 'PHIẾU TỔNG HỢP MUA SẮM VẬT TƯ VỆ SINH' 
                : `PHIẾU TỔNG HỢP MUA SẮM ${group.label}`;
        
        rows.push([printTitle]);
        rows.push([`(Tổng hợp từ ${group.poCount} phiếu mua sắm / đề nghị đang lọc)`]);
        rows.push([]);
        
        const groupCodeShort = group.type === 'VE_SINH' ? 'VS' : group.type;
        const summaryCode = `THMS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${groupCodeShort}`;
        
        rows.push(["Mã tổng hợp:", summaryCode, "", "", "Người lập:", "Quản lý Hành chính"]);
        rows.push(["Kho áp dụng:", group.label, "", "", "Ngày in:", new Date().toLocaleDateString('vi-VN')]);
        rows.push(["Tổng số phiếu:", `${group.poCount} phiếu`, "", "", "Số mặt hàng:", `${group.items.length} mặt hàng`]);
        rows.push([]);
        
        // Table Headers
        rows.push(["STT", "MÃ VT", "TÊN VẬT TƯ MUA", "ĐVT", "SL MUA", "ĐƠN GIÁ", "THÀNH TIỀN"]);
        
        group.items.forEach((item: any, idx: number) => {
            // Main Item Row
            rows.push([
                idx + 1,
                item.mvpp,
                item.name.toUpperCase(),
                item.unit,
                item.qty,
                item.price,
                item.actualTotal
            ]);
            
            // Allocation Rows
            item.deptEntries.forEach((de: any) => {
                rows.push([
                    "",
                    "",
                    `  - ${de.dept} (${de.requestCode})`,
                    de.unit,
                    de.qty,
                    "",
                    de.note ? `Ghi chú: ${de.note}` : ""
                ]);
            });
            
            // Replacements
            item.replacements?.forEach((rep: any) => {
                rows.push([
                    "",
                    "",
                    `  * Thay cho: ${rep.originalName} (Lý do: ${rep.reason || 'Điều chỉnh'})`,
                    "",
                    "",
                    "",
                    `Chênh lệch: ${rep.diff >= 0 ? 'Tiết kiệm' : 'Tăng'} ${Math.abs(rep.diff).toLocaleString('vi-VN')} đ`
                ]);
            });
        });
        
        rows.push([]);
        rows.push(["TỔNG CỘNG", "", "", "", group.items.reduce((s:number, i:any) => s + i.qty, 0), "", group.actualTotal]);
        rows.push(["TỔNG GIÁ TRỊ ĐỀ XUẤT ĐÃ DUYỆT", "", "", "", "", "", group.approvedTotal]);
        rows.push([group.savings >= 0 ? "HIỆU QUẢ TỐI ƯU CHI PHÍ" : "CHÊNH LỆCH CHI PHÍ TĂNG", "", "", "", "", "", Math.abs(group.savings)]);

        const ws = XLSX.utils.aoa_to_sheet(rows);
        
        // Basic column widths
        ws['!cols'] = [
            {wch: 5}, {wch: 15}, {wch: 60}, {wch: 10}, {wch: 10}, {wch: 15}, {wch: 20}
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, group.label.slice(0, 31));
    });
    
    const suffix = getPeriodLabel(selectedIds);
    const fileName = selectedIds.length > 0 
      ? `PhieuTongHopMuaSam${suffix}.xlsx`
      : `Phieu_Tong_Hop_Mua_Sam_Mau_In_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleExportWordTemplate = async (type: 'VPP' | 'VE_SINH') => {


      if (selectedIds.length > 0) {


        const hasMatch = checkHasMatchingItem(type);


        if (!hasMatch) {


          toast.error("Các phiếu đã chọn không có dữ liệu phù hợp với mẫu báo cáo này.");


          return;


        }


      }


      const group = summaryGroups.find(g => g.type === type);
    if (!group) return;

    const groupCodeShort = group.type === 'VE_SINH' ? 'VS' : group.type;
    const summaryCode = `THMS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${groupCodeShort}`;
    const printTitle = group.type === 'VPP' 
        ? 'PHIẾU TỔNG HỢP MUA SẮM VĂN PHÒNG PHẨM' 
        : 'PHIẾU TỔNG HỢP MUA SẮM VẬT TƯ VỆ SINH';

    // Fetch QR code
    let qrImage;
    try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(summaryCode)}`;
        const resp = await fetch(qrUrl);
        const buffer = await resp.arrayBuffer();
        qrImage = new docx.ImageRun({
            data: buffer,
            transformation: { width: 60, height: 60 },
        } as any);
    } catch (e) {
        console.error("Could not load QR code", e);
    }

    const doc = new docx.Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: "Times New Roman",
                    },
                },
            },
        },
        sections: [{
            properties: {
                page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
            },
            children: [
                // Header Table
                new docx.Table({
                    width: { size: 100, type: docx.WidthType.PERCENTAGE },
                    borders: docx.TableBorders.NONE,
                    rows: [
                        new docx.TableRow({
                            children: [
                                new docx.TableCell({
                                    width: { size: 35, type: docx.WidthType.PERCENTAGE },
                                    children: [
                                        new docx.Paragraph({ children: [new docx.TextRun({ text: "CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO", bold: true, size: 20 })] }),
                                        new docx.Paragraph({ children: [new docx.TextRun({ text: "Báo cáo tổng hợp đơn mua sắm", bold: true, italics: true, size: 18 })] }),
                                        new docx.Paragraph({ children: [new docx.TextRun({ text: "Ban Hành chính Nhân sự", size: 18 })] }),
                                    ]
                                }),
                                new docx.TableCell({
                                    width: { size: 15, type: docx.WidthType.PERCENTAGE },
                                    verticalAlign: docx.VerticalAlign.CENTER,
                                    children: qrImage ? [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [qrImage] })] : []
                                }),
                                new docx.TableCell({
                                    width: { size: 50, type: docx.WidthType.PERCENTAGE },
                                    children: [
                                        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true, size: 20 })] }),
                                        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: "Độc lập - Tự do - Hạnh phúc", bold: true, underline: {}, size: 20 })] }),
                                        new docx.Paragraph({ alignment: docx.AlignmentType.RIGHT, children: [new docx.TextRun({ text: `Hà Nội, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`, italics: true, size: 18 })] }),
                                    ]
                                }),
                            ]
                        })
                    ]
                }),
                new docx.Paragraph({ spacing: { before: 400, after: 200 }, alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: printTitle, bold: true, size: 32 })] }),
                new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: `(Tổng hợp từ ${group.poCount} phiếu mua sắm / đề nghị đang lọc)`, italics: true, size: 20 })] }),
                new docx.Paragraph({ spacing: { before: 400 } }),
                
                // Info Grid Table
                new docx.Table({
                    width: { size: 100, type: docx.WidthType.PERCENTAGE },
                    borders: docx.TableBorders.NONE,
                    rows: [
                        new docx.TableRow({
                            children: [
                                new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Mã tổng hợp: ", bold: true }), new docx.TextRun(summaryCode)] })] }),
                                new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Người lập: ", bold: true }), new docx.TextRun("Quản lý Hành chính")] })] }),
                            ]
                        }),
                        new docx.TableRow({
                            children: [
                                new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Kho áp dụng: ", bold: true }), new docx.TextRun(group.label)] })] }),
                                new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Ngày in: ", bold: true }), new docx.TextRun(new Date().toLocaleDateString('vi-VN'))] })] }),
                            ]
                        }),
                        new docx.TableRow({
                            children: [
                                new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Tổng số phiếu: ", bold: true }), new docx.TextRun(`${group.poCount} phiếu`)] })] }),
                                new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Số mặt hàng: ", bold: true }), new docx.TextRun(`${group.items.length} mặt hàng`)] })] }),
                            ]
                        })
                    ]
                }),
                new docx.Paragraph({ spacing: { before: 400 } }),

                // Main Table
                new docx.Table({
                    width: { size: 100, type: docx.WidthType.PERCENTAGE },
                    rows: [
                        new docx.TableRow({
                            tableHeader: true,
                            children: [
                                "STT", "MÃ VT", "TÊN VẬT TƯ MUA", "ĐVT", "SL MUA", "ĐƠN GIÁ", "THÀNH TIỀN"
                            ].map(text => new docx.TableCell({
                                shading: { fill: "F1F5F9" },
                                children: [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text, bold: true, size: 16 })] })]
                            }))
                        }),
                        ...group.items.flatMap((item: any, idx: number) => {
                            const mainRow = new docx.TableRow({
                                children: [
                                    new docx.TableCell({ children: [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: String(idx + 1), size: 16 })] })] }),
                                    new docx.TableCell({ children: [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: item.mvpp, size: 16 })] })] }),
                                    new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: item.name.toUpperCase(), bold: true, size: 16 })] })] }),
                                    new docx.TableCell({ children: [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: item.unit, size: 16 })] })] }),
                                    new docx.TableCell({ children: [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: String(item.qty), size: 16 })] })] }),
                                    new docx.TableCell({ children: [new docx.Paragraph({ alignment: docx.AlignmentType.RIGHT, children: [new docx.TextRun({ text: Number(item.price).toLocaleString('vi-VN'), size: 16 })] })] }),
                                    new docx.TableCell({ children: [new docx.Paragraph({ alignment: docx.AlignmentType.RIGHT, children: [new docx.TextRun({ text: Number(item.actualTotal).toLocaleString('vi-VN'), size: 16 })] })] }),
                                ]
                            });

                            const deptRows = item.deptEntries.map((de: any) => new docx.TableRow({
                                children: [
                                    new docx.TableCell({ children: [] }),
                                    new docx.TableCell({ 
                                        columnSpan: 6,
                                        children: [
                                            new docx.Table({
                                                width: { size: 100, type: docx.WidthType.PERCENTAGE },
                                                borders: docx.TableBorders.NONE,
                                                rows: [
                                                    new docx.TableRow({
                                                        children: [
                                                            new docx.TableCell({
                                                                width: { size: 55, type: docx.WidthType.PERCENTAGE },
                                                                children: [new docx.Paragraph({
                                                                    children: [
                                                                        new docx.TextRun({ text: `- ${de.dept}`, bold: true, size: 15 }),
                                                                        new docx.TextRun({ text: ` (${de.requestCode})`, size: 13, color: "666666" })
                                                                    ]
                                                                })]
                                                            }),
                                                            new docx.TableCell({
                                                                width: { size: 15, type: docx.WidthType.PERCENTAGE },
                                                                children: [new docx.Paragraph({
                                                                    children: [new docx.TextRun({ text: `SL: ${de.qty} ${de.unit}`, bold: true, italics: true, size: 15 })]
                                                                })]
                                                            }),
                                                            new docx.TableCell({
                                                                width: { size: 30, type: docx.WidthType.PERCENTAGE },
                                                                children: [new docx.Paragraph({
                                                                    children: [new docx.TextRun({ text: de.note ? `Ghi chú: ${de.note}` : "", size: 15, italics: true })]
                                                                })]
                                                            }),
                                                        ]
                                                    })
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            }));

                            const replacementRows = (item.replacements || []).map((rep: any) => new docx.TableRow({
                                children: [
                                    new docx.TableCell({ children: [] }),
                                    new docx.TableCell({
                                        columnSpan: 6,
                                        shading: { fill: "F8FAFC" },
                                        children: [
                                            new docx.Paragraph({
                                                indent: { left: 200 },
                                                children: [
                                                    new docx.TextRun({ text: `Thay cho: ${rep.originalName} | Lý do: ${rep.reason || 'Điều chỉnh'}`, italics: true, size: 15, color: "475569" }),
                                                    new docx.TextRun({ text: ` | Chênh lệch: ${rep.diff >= 0 ? 'Tiết kiệm' : 'Tăng'} ${Math.abs(rep.diff).toLocaleString('vi-VN')} đ`, bold: true, color: "4F46E5", size: 15 })
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            }));

                            return [mainRow, ...deptRows, ...replacementRows];
                        })
                    ]
                }),

                // Totals
                new docx.Paragraph({ spacing: { before: 400 }, border: { top: { style: docx.BorderStyle.SINGLE, size: 12 } } }),
                new docx.Paragraph({
                    alignment: docx.AlignmentType.RIGHT,
                    children: [
                        new docx.TextRun({ text: `TỔNG CỘNG (${group.items.length} MẶT HÀNG):  `, bold: true, size: 18 }),
                        new docx.TextRun({ text: `${group.items.reduce((s:number, i:any) => s + i.qty, 0).toLocaleString('vi-VN')}  `, bold: true, size: 18 }),
                        new docx.TextRun({ text: `${Number(group.actualTotal).toLocaleString('vi-VN')} đ`, bold: true, size: 20, color: "4F46E5" })
                    ]
                }),
                new docx.Paragraph({
                    alignment: docx.AlignmentType.RIGHT,
                    children: [
                        new docx.TextRun({ text: `TỔNG GIÁ TRỊ ĐỀ XUẤT ĐÃ DUYỆT:  `, size: 16 }),
                        new docx.TextRun({ text: `${Number(group.approvedTotal).toLocaleString('vi-VN')} đ`, size: 16 })
                    ]
                }),
                new docx.Paragraph({
                    alignment: docx.AlignmentType.RIGHT,
                    children: [
                        new docx.TextRun({ text: group.savings >= 0 ? "HIỆU QUẢ TỐI ƯU CHI PHÍ:  " : "CHÊNH LỆCH CHI PHÍ TĂNG:  ", bold: true, size: 18 }),
                        new docx.TextRun({ text: `${Number(Math.abs(group.savings)).toLocaleString('vi-VN')} đ`, bold: true, size: 18, color: group.savings >= 0 ? "059669" : "E11D48" })
                    ]
                }),

                // Signatures
                new docx.Paragraph({ spacing: { before: 800 } }),
                new docx.Table({
                    width: { size: 100, type: docx.WidthType.PERCENTAGE },
                    borders: docx.TableBorders.NONE,
                    rows: [
                        new docx.TableRow({
                            children: [
                                new docx.TableCell({
                                    children: [
                                        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: "Người lập phiếu".toUpperCase(), bold: true })] }),
                                        new docx.Paragraph({ spacing: { before: 1200 }, alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: "..........................", bold: true })] }),
                                        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: "(Đã ký số)", size: 14, color: "2563EB" })] }),
                                    ]
                                }),
                                new docx.TableCell({
                                    children: [
                                        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: "Trưởng bộ phận".toUpperCase(), bold: true })] }),
                                        new docx.Paragraph({ spacing: { before: 1200 }, alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: "..........................", bold: true })] }),
                                        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: "(Đã ký số)", size: 14, color: "2563EB" })] }),
                                    ]
                                }),
                            ]
                        })
                    ]
                })
            ]
        }]
    });

    const blob = await docx.Packer.toBlob(doc);
    const suffix = getPeriodLabel(selectedIds);
    const categoryLabel = group.type === 'VE_SINH' ? 'VeSinh' : group.type;
    const fileName = selectedIds.length > 0 
      ? `PhieuTongHopMuaSam${categoryLabel}${suffix}.docx`
      : `Phieu_Tong_Hop_Mua_Sam_${group.type}_${new Date().toISOString().slice(0,10)}.docx`;
    saveAs(blob, fileName);
  };

  const toggleSelect = (id: string) => {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
      if (selectedIds.length === filteredData.length && filteredData.length > 0) {
          setSelectedIds([]);
      } else {
          setSelectedIds(filteredData.map(d => d.id));
      }
  };

  // KPI Cards logic
  const kpiPending = data.filter(d => d.status === 'PENDING_APPROVAL').length;
  const kpiOrdered = data.filter(d => d.status === 'ORDERED').length;
  const kpiDelivering = data.filter(d => ['DELIVERING', 'PARTIALLY_DELIVERED'].includes(d.status)).length;
  const totalAmount = data.filter(d => ['ORDERED', 'DELIVERING', 'PARTIALLY_DELIVERED', 'COMPLETED'].includes(d.status)).reduce((sum, d) => sum + Number(d.actualTotal || d.totalAmount || 0), 0);

  // Dashboard Print Helpers
  const dashboardDiffLabel =
    printDashboardSummary.diff > 0
      ? 'Giá trị tối ưu chi phí'
      : printDashboardSummary.diff < 0
        ? 'Chênh lệch chi phí tăng'
        : 'Chênh lệch chi phí';

  const dashboardRateLabel =
    printDashboardSummary.diff > 0
      ? 'Tỷ lệ tối ưu'
      : printDashboardSummary.diff < 0
        ? 'Tỷ lệ tăng chi'
        : 'Tỷ lệ chênh lệch';

  const dashboardDiffClass =
    printDashboardSummary.diff > 0
      ? 'text-emerald-600'
      : printDashboardSummary.diff < 0
        ? 'text-rose-600'
        : 'text-slate-600';

  const dashboardTitle =
    selectedPrintType === 'VPP'
      ? 'TÓM TẮT HIỆU QUẢ MUA SẮM - VĂN PHÒNG PHẨM'
      : selectedPrintType === 'VE_SINH'
        ? 'TÓM TẮT HIỆU QUẢ MUA SẮM - VẬT TƯ VỆ SINH'
        : 'TÓM TẮT HIỆU QUẢ MUA SẮM';

  return (
    <div className="flex flex-col h-full bg-slate-50/50 print:bg-white print:h-auto print:block">
        {/* TOP KPI CARDS */}
        <div className="p-4 md:p-6 shrink-0 no-print">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-4">Quản lý Mua sắm (Purchasing)</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition group" onClick={()=>setActiveTab('PENDING')}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2.5 bg-amber-50 text-amber-500 rounded-lg group-hover:scale-110 transition shrink-0"><Clock className="w-5 h-5"/></div>
                        <h3 className="text-2xl font-black text-slate-800">{kpiPending}</h3>
                    </div>
                    <p className="font-bold text-slate-500 text-[9px] uppercase tracking-widest">Chờ Duyệt Mua</p>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition group" onClick={()=>setActiveTab('ORDERED')}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2.5 bg-indigo-50 text-indigo-500 rounded-lg group-hover:scale-110 transition shrink-0"><ShoppingCart className="w-5 h-5"/></div>
                        <h3 className="text-2xl font-black text-slate-800">{kpiOrdered}</h3>
                    </div>
                    <p className="font-bold text-slate-500 text-[9px] uppercase tracking-widest">Chờ NCC Xác Nhận</p>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition group" onClick={()=>setActiveTab('DELIVERING')}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2.5 bg-blue-50 text-blue-500 rounded-lg group-hover:scale-110 transition shrink-0"><Truck className="w-5 h-5"/></div>
                        <h3 className="text-2xl font-black text-slate-800">{kpiDelivering}</h3>
                    </div>
                    <p className="font-bold text-slate-500 text-[9px] uppercase tracking-widest">Đang Giao Hàng</p>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-4 rounded-xl shadow-lg shadow-indigo-500/30 text-white relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <div className="p-2.5 bg-white/20 rounded-lg shrink-0"><DollarSign className="w-5 h-5"/></div>
                        <h3 className="text-xl font-black">{totalAmount.toLocaleString('vi-VN')} đ</h3>
                    </div>
                    <p className="font-bold text-indigo-50 text-[9px] uppercase tracking-widest relative z-10">Tổng chi Thực Tế</p>
                </div>
            </div>
        </div>

        {/* MAIN LIST SECTION */}
        <div className="flex-1 overflow-hidden flex gap-4 px-4 md:px-6 pb-6 no-print">
            {/* LEFT: Purchase List */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden" style={{ width: previewPO ? '55%' : '100%', transition: 'width 0.3s' }}>

                
                {/* TOOLBAR */}
                <div className="p-3.5 border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                        {[
                          { id: 'ALL', label: 'Tất Cả' },
                          { id: 'DRAFT', label: 'Nháp' },
                          { id: 'PENDING', label: 'Chờ Duyệt' },
                          { id: 'APPROVED', label: 'Chờ Mua Sắm' },
                          { id: 'ORDERED', label: 'Chờ Giao' },
                          { id: 'DELIVERING', label: 'Đang Giao' },
                          { id: 'COMPLETED', label: 'Hoàn Tất' }
                        ].map(t => (
                            <button 
                               key={t.id} 
                               onClick={() => setActiveTab(t.id)}
                               className={`px-4 py-2 rounded-xl text-[9px] uppercase tracking-widest font-black transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 translate-y-[-1px]' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto mt-1.5 md:mt-0">
                        <input 
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 shadow-sm transition"
                            title="Lọc theo tháng báo cáo"
                        />
                                 {/* UNIFIED REPORT PRINT & EXPORT BUTTON */}
                           <div className="relative">
                              <button 
                                onClick={() => setShowPrintMenu(!showPrintMenu)}
                                className={`flex items-center px-4 py-2.5 rounded-xl border transition-all font-black text-[10px] uppercase shadow-sm ${showPrintMenu ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/30' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                              >
                                 <Printer className={`w-4 h-4 mr-2 ${showPrintMenu ? 'text-white' : 'text-indigo-500'}`}/> In / Xuất báo cáo <ChevronDown className={`w-3.5 h-3.5 ml-2 transition-transform ${showPrintMenu ? 'rotate-180' : ''}`}/>
                              </button>

                              {showPrintMenu && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setShowPrintMenu(false)}></div>
                                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 py-3 animate-in fade-in slide-in-from-top-2 duration-200">

                                     {selectedIds.length > 0 && (

                                        <div className="px-4 py-2.5 mb-2 bg-indigo-50/50 border-b border-indigo-100/60 text-left">

                                           <p className="text-[11px] font-black text-indigo-700 flex items-center gap-1.5 uppercase tracking-wide">

                                              📋 Đang chọn: {selectedIds.length} phiếu

                                           </p>

                                           <p className="text-[9px] font-bold text-slate-500 mt-0.5">

                                              Báo cáo sẽ xuất theo phiếu đã chọn.

                                           </p>

                                        </div>

                                     )}

                                     <div className="px-4 pb-2 mb-2 border-b border-slate-100">

                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CHỌN MẪU BÁO CÁO</p>

                                     </div>
                                     
                                     {/* Group 1 */}
                                     <div className="px-4 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Mua sắm theo mặt hàng</div>
                                     <button 
                                       onClick={() => {
                                         setSetupReportType('PURCHASE_SUMMARY');
                                         setSetupCategoryType('VPP');
                                         setShowReportSetupModal(true);
                                         setShowPrintMenu(false);
                                       }}
                                       className="w-full px-4 py-2 text-left flex items-center justify-between hover:bg-indigo-55 transition"
                                     >
                                        <span className="text-xs font-bold text-slate-700">Phiếu tổng hợp mua sắm VPP</span>
                                        <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{printStats.vppCount}</span>
                                     </button>
                                     <button 
                                       onClick={() => {
                                         setSetupReportType('PURCHASE_SUMMARY');
                                         setSetupCategoryType('VE_SINH');
                                         setShowReportSetupModal(true);
                                         setShowPrintMenu(false);
                                       }}
                                       className="w-full px-4 py-2 text-left flex items-center justify-between hover:bg-indigo-55 transition"
                                     >
                                        <span className="text-xs font-bold text-slate-700">Phiếu tổng hợp mua sắm Vệ sinh</span>
                                        <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{printStats.vsCount}</span>
                                     </button>

                                     {/* Group 2 */}
                                     <div className="px-4 py-1.5 mt-2 text-[9px] font-black text-slate-400 uppercase tracking-wider border-t border-slate-100 pt-2">Tiêu thụ theo phòng ban</div>
                                     <button 
                                       disabled={deptReportDataVPP.departments.length === 0}
                                       onClick={() => {
                                         setSetupReportType('CONSUMPTION_BY_DEPARTMENT');
                                         setSetupCategoryType('VPP');
                                         setShowReportSetupModal(true);
                                         setShowPrintMenu(false);
                                       }}
                                       className={`w-full px-4 py-2 text-left flex items-center justify-between transition ${deptReportDataVPP.departments.length === 0 ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:bg-indigo-55'}`}
                                     >
                                        <span className="text-xs font-bold text-slate-700">Tổng hợp tiêu thụ VPP theo phòng ban</span>
                                     </button>
                                     <button 
                                       disabled={deptReportDataVS.departments.length === 0}
                                       onClick={() => {
                                         setSetupReportType('CONSUMPTION_BY_DEPARTMENT');
                                         setSetupCategoryType('VE_SINH');
                                         setShowReportSetupModal(true);
                                         setShowPrintMenu(false);
                                       }}
                                       className={`w-full px-4 py-2 text-left flex items-center justify-between transition ${deptReportDataVS.departments.length === 0 ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:bg-indigo-55'}`}
                                     >
                                        <span className="text-xs font-bold text-slate-700">Tổng hợp tiêu thụ Vệ sinh theo phòng ban</span>
                                     </button>

                                     {/* Group 3 */}
                                     <div className="px-4 py-1.5 mt-2 text-[9px] font-black text-slate-400 uppercase tracking-wider border-t border-slate-100 pt-2">Theo phòng ban của đề xuất</div>
                                     <button 
                                       onClick={() => {
                                         if (selectedIds.length === 0) {
                                           alert("Báo cáo này chỉ xuất theo các phiếu được chọn. Vui lòng chọn ít nhất một phiếu trước khi in.");
                                           return;
                                         }
                                         setSetupReportType('REQUEST_DEPARTMENT_SUMMARY');
                                         setSetupCategoryType('VPP');
                                         setShowReportSetupModal(true);
                                         setShowPrintMenu(false);
                                       }}
                                       className={`w-full px-4 py-2 text-left flex items-center justify-between transition ${selectedIds.length === 0 ? 'opacity-45 hover:bg-slate-50' : 'hover:bg-indigo-55'}`}
                                     >
                                        <span className="text-xs font-bold text-slate-700">Tổng hợp VPP theo phòng ban của đề xuất</span>
                                     </button>
                                     <button 
                                       onClick={() => {
                                         if (selectedIds.length === 0) {
                                           alert("Báo cáo này chỉ xuất theo các phiếu được chọn. Vui lòng chọn ít nhất một phiếu trước khi in.");
                                           return;
                                         }
                                         setSetupReportType('REQUEST_DEPARTMENT_SUMMARY');
                                         setSetupCategoryType('VE_SINH');
                                         setShowReportSetupModal(true);
                                         setShowPrintMenu(false);
                                       }}
                                       className={`w-full px-4 py-2 text-left flex items-center justify-between transition ${selectedIds.length === 0 ? 'opacity-45 hover:bg-slate-50' : 'hover:bg-indigo-55'}`}
                                     >
                                        <span className="text-xs font-bold text-slate-700">Tổng hợp Vệ sinh theo phòng ban của đề xuất</span>
                                     </button>

                                     {/* Group 4 */}
                                     <div className="px-4 py-1.5 mt-2 text-[9px] font-black text-slate-400 uppercase tracking-wider border-t border-slate-100 pt-2">Xuất dữ liệu</div>
                                     <button 
                                       onClick={() => { handleExportExcelTemplate(); setShowPrintMenu(false); }}
                                       className="w-full px-4 py-2 text-left flex items-center hover:bg-emerald-50 transition text-emerald-700 font-bold"
                                     >
                                        <Download className="w-3.5 h-3.5 mr-2 text-emerald-500"/>
                                        <span className="text-xs">Xuất Excel theo mẫu in</span>
                                     </button>
                                     <button 
                                       disabled={printStats.vppCount === 0 && printStats.vsCount === 0}
                                       onClick={() => { handleExportWordTemplate('VPP'); setShowPrintMenu(false); }}
                                       className="w-full px-4 py-2 text-left flex items-center hover:bg-blue-50 transition text-blue-700 font-bold"
                                     >
                                        <Download className="w-3.5 h-3.5 mr-2 text-blue-500"/>
                                        <span className="text-xs">Xuất Word theo mẫu in</span>
                                     </button>
                                     <button 
                                       onClick={() => { handleExportExcel(); setShowPrintMenu(false); }}
                                       className="w-full px-4 py-2 text-left flex items-center hover:bg-slate-100 transition text-slate-700 font-bold"
                                     >
                                        <Download className="w-3.5 h-3.5 mr-2 text-slate-500"/>
                                        <span className="text-xs">Xuất toàn bộ dữ liệu thô Excel</span>
                                     </button>

                                     {printStats.otherCount > 0 && (
                                       <div className="px-4 mt-2 py-2 bg-amber-50 rounded-xl mx-3 border border-amber-100 flex items-start gap-2">
                                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
                                          <p className="text-[10px] font-bold text-amber-800 leading-normal">
                                             Có {printStats.otherCount} hàng hóa chưa phân loại VPP/Vệ sinh. Vui lòng cập nhật danh mục hàng hóa để in báo cáo chính xác.
                                          </p>
                                       </div>
                                     )}
                                  </div>
                                </>
                              )}
                           </div>

                           <button onClick={() => setIsBulkMode(!isBulkMode)} className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 text-[10px] font-black uppercase ${isBulkMode ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500'}`}>
                              <CheckSquare className="w-4 h-4"/> {isBulkMode ? 'Ẩn ô chọn' : 'Chọn nhiều'}
                           </button>
                                                       <button onClick={onShowHistory} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center shadow-sm whitespace-nowrap active:scale-95 uppercase gap-1.5 cursor-pointer">
                                <FileText className="w-4 h-4 text-indigo-600" /> Lịch sử báo cáo
                            </button>
                            <button onClick={onCreateNew} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center shadow-lg shadow-indigo-500/30 whitespace-nowrap active:scale-95 uppercase cursor-pointer">
                                <Plus className="w-4 h-4 mr-1.5" /> Tạo Đề Nghị
                            </button>
                        </div>
                    </div>

                {/* TABLE */}
                <div className="flex-1 overflow-auto rounded-b-3xl relative custom-scrollbar">
                    {loading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 rounded-2xl border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-4 shadow-xl"></div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Đang đồng bộ dữ liệu...</p>
                        </div>
                    )}
                    
                    <table className="w-full text-left whitespace-nowrap border-separate border-spacing-0">
                        <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10">
                            <tr className="text-[9px] uppercase font-black text-slate-400 tracking-wider">
                                {isBulkMode && (
                                   <th className="p-3.5 border-b border-slate-200 pl-6 w-12 text-center">
                                      <input 
                                         type="checkbox" 
                                         className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
                                         checked={selectedIds.length === filteredData.length && filteredData.length > 0}
                                         onChange={toggleSelectAll}
                                      />
                                   </th>
                                )}
                                <th className={`p-3.5 border-b border-slate-200 ${!isBulkMode ? 'pl-6' : ''}`}>Mã đơn / Nội dung</th>
                                <th className="p-3.5 border-b border-slate-200">Vật tư chính</th>
                                <th className="p-3.5 border-b border-slate-200">Phòng ban</th>
                                <th className="p-3.5 border-b border-slate-200">Kho / Nhóm</th>
                                <th className="p-3.5 border-b border-slate-200">Nhà cung cấp / Trạng thái</th>
                                <th className="p-3.5 border-b border-slate-200 text-right">Tổng tiền</th>
                                <th className="p-3.5 border-b border-slate-200 text-center">Phụ trách</th>
                                <th className="p-3.5 border-b border-slate-200">Timeline</th>
                                <th className="p-3.5 border-b border-slate-200 pr-6"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {filteredData.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={isBulkMode ? 10 : 9} className="p-20 text-center text-slate-300">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                           <Package className="w-10 h-10 opacity-30" />
                                        </div>
                                        <p className="font-black uppercase tracking-widest text-xs">Không tìm thấy Đơn mua sắm phù hợp</p>
                                    </td>
                                </tr>
                            )}
                            {filteredData.map(d => {
                                const isDelayed = d.expectedDate && new Date(d.expectedDate) < new Date() && d.status !== 'COMPLETED';
                                const isSelected = selectedIds.includes(d.id);
                                const isPreviewing = previewPO?.id === d.id;
                                return (
                                <tr key={d.id} onClick={() => setPreviewPO(isPreviewing ? null : d)} 
                                  className={`group hover:bg-indigo-50/30 cursor-pointer transition-all border-b border-slate-50 last:border-0 ${d.pendingReplacement ? 'bg-rose-50/20' : ''} ${isSelected ? 'bg-indigo-50/50' : ''} ${isPreviewing ? 'bg-indigo-50 border-l-[3px] border-l-indigo-500' : 'border-l-[3px] border-l-transparent'}`}>

                                    
                                    {isBulkMode && (
                                       <td className="p-3.5 pl-6 text-center" onClick={e => e.stopPropagation()}>
                                          <input 
                                             type="checkbox" 
                                             checked={isSelected}
                                             onChange={() => toggleSelect(d.id)}
                                             className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
                                          />
                                       </td>
                                    )}

                                    <td className={`p-3.5 ${!isBulkMode ? 'pl-6' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0 border transition-all group-hover:scale-110 shadow-sm
                                                ${d.type === 'PR' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                                {d.type}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 text-xs tracking-tight mb-0.5">{d.id}</p>
                                                <p className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]">{d.title || 'Đề xuất mua sắm'}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{d.depts?.[0] || 'Chung'}</span>
                                                   <span className="w-0.5 h-0.5 bg-slate-300 rounded-full"></span>
                                                   <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{d.lineCount} mặt hàng</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-3.5">
                                        <div className="flex flex-col gap-0.5">
                                           <p className="text-[11px] font-bold text-slate-700 max-w-[180px] truncate">
                                              {d.topItems?.join(', ') || 'Chưa có dữ liệu'}
                                           </p>
                                           {d.lineCount > 3 && (
                                              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">+{d.lineCount - 3} mặt hàng khác</p>
                                           )}
                                        </div>
                                    </td>

                                    <td className="p-3.5">
                                        <div className="flex flex-col gap-0.5">
                                           <p className="text-[11px] font-bold text-slate-700">
                                              {d.depts?.slice(0, 2).join(', ') || '—'}
                                           </p>
                                           {d.depts?.length > 2 && (
                                              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">+{d.depts.length - 2} phòng ban</p>
                                           )}
                                        </div>
                                    </td>

                                    <td className="p-3.5">
                                        <div className="flex flex-wrap gap-1">
                                           {d.warehouses?.map((w: string) => (
                                              <span key={w} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black rounded uppercase border border-slate-200">
                                                {w}
                                              </span>
                                           ))}
                                           {(!d.warehouses || d.warehouses.length === 0) && <span className="text-[8px] font-black text-slate-300 italic">N/A</span>}
                                        </div>
                                    </td>

                                    <td className="p-3.5">
                                        <div className="flex flex-col gap-1 items-start">
                                           <p className={`text-[11px] font-black ${d.supplier ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                                              {d.supplier || 'Chưa chọn NCC'}
                                           </p>
                                           {getStatusBadge(d.status, d.hasReplacement, d.pendingReplacement)}
                                        </div>
                                    </td>

                                    <td className="p-3.5 text-right">
                                        <div className="flex flex-col items-end">
                                            <p className="font-black text-indigo-700 text-xs">{Number(d.actualTotal || d.totalAmount).toLocaleString('vi-VN')} đ</p>
                                            {d.hasReplacement && (
                                              <div className="mt-0.5 text-right">
                                                 <p className="text-[8px] font-bold text-slate-400 line-through">Đề xuất: {Number(d.originalTotal).toLocaleString('vi-VN')} đ</p>
                                                 {(() => {
                                                    const savings = Number(d.originalTotal) - Number(d.actualTotal || d.totalAmount);
                                                    return (
                                                      <p className={`text-[8px] font-black uppercase tracking-widest ${savings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                         {savings >= 0 ? `Tiết kiệm ${savings.toLocaleString('vi-VN')}đ` : `Tăng ${(Math.abs(savings)).toLocaleString('vi-VN')}đ`}
                                                      </p>
                                                    );
                                                 })()}
                                              </div>
                                            )}
                                        </div>
                                    </td>

                                    <td className="p-3.5 text-center">
                                       <div className="flex flex-col items-center">
                                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 mb-0.5">
                                             <UserIcon className="w-3.5 h-3.5 text-slate-400"/>
                                          </div>
                                          <p className={`text-[8px] font-black uppercase tracking-widest ${d.assignedToName ? 'text-slate-600' : 'text-slate-300'}`}>
                                             {d.assignedToName || 'Trống'}
                                          </p>
                                       </div>
                                    </td>

                                    <td className="p-3.5">
                                        <div className="flex flex-col gap-0.5">
                                           <p className="text-[9px] font-bold text-slate-500 flex items-center"><Clock className="w-3 h-3 mr-1 opacity-50"/> {new Date(d.createdAt).toLocaleDateString('vi-VN')}</p>
                                           {d.expectedDate && (
                                             <p className={`text-[9px] font-black flex items-center uppercase tracking-widest ${isDelayed ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                <Truck className="w-3 h-3 mr-1 opacity-70"/> {isDelayed ? `Trễ ${Math.floor((new Date().getTime() - new Date(d.expectedDate).getTime()) / 86400000)}N` : `Giao: ${new Date(d.expectedDate).toLocaleDateString('vi-VN')}`}
                                             </p>
                                           )}
                                        </div>
                                    </td>

                                    <td className="p-3.5 pr-6">
                                        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                            <ChevronRight className="w-3.5 h-3.5"/>
                                        </div>
                                    </td>
                                </tr>
                                )})}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RIGHT: Quick View Panel */}
            {previewPO && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4 duration-300" style={{ width: '45%' }}>
                <div key={previewPO.id} className="flex flex-col h-full animate-in fade-in duration-500">
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white flex justify-between items-start shrink-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-sm font-black text-indigo-700 uppercase tracking-tight">{previewPO.id}</h3>
                        {getStatusBadge(previewPO.status)}
                      </div>
                      <p className="text-xs font-bold text-slate-600 truncate">{previewPO.requesterName} • {previewPO.department || 'Phòng ban chung'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate" title={previewPO.title}>{previewPO.title || 'Không có mô tả'}</p>
                    </div>
                    <button onClick={() => setPreviewPO(null)} className="p-2 hover:bg-white rounded-xl transition-all ml-2 text-slate-400 hover:text-slate-600 shadow-sm border border-transparent hover:border-slate-100">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-0">
                      <thead className="bg-slate-50/50 backdrop-blur-md sticky top-0 z-10">
                        <tr className="text-[9px] uppercase font-black text-slate-400 tracking-widest">
                          <th className="px-5 py-3 text-center w-12 border-b border-slate-100">STT</th>
                          <th className="px-5 py-3 border-b border-slate-100">Vật tư / Hàng hóa</th>
                          <th className="px-5 py-3 text-center w-20 border-b border-slate-100">SL</th>
                          <th className="px-5 py-3 text-right w-24 border-b border-slate-100">Đơn giá</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(previewPO.lines || []).map((line: any, idx: number) => {
                          const effectiveItem = getEffectiveLineItem(line);
                          const qty = getLinePrintQty(line);
                          const price = getLinePrintPrice(line, effectiveItem);

                          return (
                          <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-5 py-4 text-center text-[10px] font-black text-slate-300 italic">{idx + 1}</td>
                            <td className="px-5 py-4">
                              {effectiveItem ? (
                                <GoodsNameWithPreview 
                                  itemId={effectiveItem.id}
                                  itemCode={effectiveItem.mvpp}
                                  itemName={effectiveItem.name}
                                  imageUrl={effectiveItem.imageUrl}
                                  thumbnailUrl={effectiveItem.thumbnailUrl}
                                  categoryName={effectiveItem.category}
                                  unit={effectiveItem.unit}
                                />
                              ) : (
                                <p className="font-bold text-slate-700 text-[11px] leading-snug whitespace-normal line-clamp-2">N/A</p>
                              )}
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{effectiveItem?.mvpp || '—'}</span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="font-black text-sm text-indigo-600">
                                {qty}
                              </span>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">{effectiveItem?.unit}</p>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <p className="text-[11px] font-black text-slate-600">{Number(price).toLocaleString('vi-VN')} đ</p>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-5 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-between items-center">
                    <div className="flex gap-6">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Hạng mục</p>
                        <p className="text-xl font-black text-slate-800 italic">{previewPO.lines?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Thành tiền</p>
                        <p className="text-xl font-black text-indigo-600 italic">{Number(previewPO.actualTotal || previewPO.totalAmount).toLocaleString('vi-VN')} đ</p>
                      </div>
                    </div>
                    <button onClick={() => onViewDetail(previewPO.id, filteredData.map(d => d.id))} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200">
                      <Eye className="w-4 h-4" /> Chi tiết
                    </button>
                  </div>
                </div>
              </div>
            )}

        </div>

         {/* REPORT SETUP MODAL */}
         {showReportSetupModal && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
               {/* Header */}
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/20">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/30">
                     <Printer className="w-5 h-5"/>
                   </div>
                   <div>
                     <h3 className="text-base font-black text-slate-800">Tùy chọn xuất báo cáo</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cấu hình định dạng và chế độ in</p>
                   </div>
                 </div>
                 <button onClick={() => setShowReportSetupModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                   <X className="w-5 h-5 text-slate-400"/>
                 </button>
               </div>

               {/* Body */}
               <div className="p-6 space-y-4">
                 {/* Title and Category */}
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Mẫu báo cáo</p>
                   <p className="text-sm font-black text-slate-800">
                     {setupReportType === 'PURCHASE_SUMMARY' && `Phiếu tổng hợp mua sắm ${setupCategoryType}`}
                     {setupReportType === 'CONSUMPTION_BY_DEPARTMENT' && `Tổng hợp tiêu thụ ${setupCategoryType} theo phòng ban`}
                     {setupReportType === 'REQUEST_DEPARTMENT_SUMMARY' && `Tổng hợp ${setupCategoryType} theo phòng ban của đề xuất`}
                   </p>
                   
                   <div className="mt-3 grid grid-cols-2 gap-4 border-t border-slate-200/60 pt-3 text-[11px] font-bold text-slate-500">
                     <div>
                       <span className="block text-[9px] text-slate-400 uppercase font-black">Loại hàng</span>
                       <span className="text-xs font-black text-indigo-600">{setupCategoryType === 'VPP' ? 'Văn Phòng Phẩm' : 'Vật Tư Vệ Sinh'}</span>
                     </div>
                     <div>
                       <span className="block text-[9px] text-slate-400 uppercase font-black">Phiếu đã chọn</span>
                       <span className="text-xs font-black text-slate-700">{selectedIds.length > 0 ? `${selectedIds.length} phiếu` : 'Tất cả (theo bộ lọc)'}</span>
                     </div>
                   </div>
                 </div>

                 {/* Format selection */}
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Định dạng đầu ra (Format)</p>
                   <div className="grid grid-cols-3 gap-2">
                     {[
                       { value: 'PDF', label: 'In PDF', permission: 'REPORT_EXPORT_PDF' },
                       { value: 'DOCX', label: 'Xuất Word', permission: 'REPORT_EXPORT_WORD' },
                       { value: 'XLSX', label: 'Xuất Excel', permission: 'REPORT_EXPORT_EXCEL' }
                     ].map(fmt => {
                       const allowed = hasPermission(userRole, fmt.permission);
                       if (!allowed) return null;
                       return (
                         <button
                           key={fmt.value}
                           onClick={() => setSetupFormat(fmt.value as any)}
                           className={`py-3.5 px-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center border gap-1 ${
                             setupFormat === fmt.value 
                               ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-102' 
                               : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                           }`}
                         >
                           <span className="text-xs uppercase">{fmt.value}</span>
                           <span className="text-[9px] font-bold opacity-80">{fmt.label}</span>
                         </button>
                       );
                     })}
                   </div>
                 </div>

                 {/* Detail mode (Only for REQUEST_DEPARTMENT_SUMMARY) */}
                 {setupReportType === 'REQUEST_DEPARTMENT_SUMMARY' && (
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Tùy chọn hiển thị</p>
                     <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                       <button
                         onClick={() => setSetupDetailMode('SUMMARY')}
                         className={`py-2 rounded-lg text-xs font-black transition-all ${
                           setupDetailMode === 'SUMMARY'
                             ? 'bg-white text-indigo-600 shadow-sm'
                             : 'text-slate-500 hover:text-slate-700'
                         }`}
                       >
                         In gọn (Tổng hợp)
                       </button>
                       <button
                         onClick={() => setSetupDetailMode('DETAIL')}
                         className={`py-2 rounded-lg text-xs font-black transition-all ${
                           setupDetailMode === 'DETAIL'
                             ? 'bg-white text-indigo-600 shadow-sm'
                             : 'text-slate-500 hover:text-slate-700'
                         }`}
                       >
                         In chi tiết (Dòng phiếu con)
                       </button>
                     </div>
                   </div>
                 )}
               </div>

               {/* Footer */}
               <div className="p-6 bg-slate-50 flex gap-3 border-t border-slate-100">
                 <button
                   onClick={() => setShowReportSetupModal(false)}
                   className="flex-1 py-3 bg-white border border-slate-200 text-slate-500 font-black rounded-xl text-xs uppercase tracking-widest hover:bg-slate-100 transition active:scale-95 shadow-sm"
                 >
                   Hủy bỏ
                 </button>
                 <button
                   onClick={async () => {
                     if (selectedIds.length > 0) {

                       const hasMatch = checkHasMatchingItem(setupCategoryType);

                       if (!hasMatch) {

                         toast.error("Các phiếu đã chọn không có dữ liệu phù hợp với mẫu báo cáo này.");

                         return;

                       }

                     }


                     if (setupFormat === 'PDF') {

                       // Trigger client browser printing
                       setSelectedPrintType(
                         setupReportType === 'PURCHASE_SUMMARY' ? setupCategoryType :
                         setupReportType === 'CONSUMPTION_BY_DEPARTMENT' ? (setupCategoryType === 'VPP' ? 'DEPT_VPP' : 'DEPT_VS') :
                         (setupCategoryType === 'VPP' ? 'REQ_DEPT_VPP' : 'REQ_DEPT_VS') as any
                       );
                       setSelectedPrintDetailMode(setupDetailMode);
                       setShowReportSetupModal(false);
                       setTimeout(() => {
                         window.print();
                       }, 250);
                     } else {
                       // Trigger API call for DOCX/XLSX
                       try {
                         setExportLoading(true);
                         const res = await api.post('/reports/generate', {
                            reportType: setupReportType,
                            itemCategoryType: setupCategoryType,
                            ...(selectedIds.length > 0 ? { po_ids: selectedIds } : {}),
                            selectedType: 'PO',
                            outputFormat: setupFormat,
                            detailMode: setupDetailMode,
                            fromDate: selectedMonth && selectedIds.length === 0 ? `${selectedMonth}-01` : undefined,
                            toDate: undefined
                          });
                         if (res.data.fileUrl) {
                           window.open(res.data.fileUrl, '_blank');
                         } else {
                           alert('Không thể tạo file báo cáo. Vui lòng kiểm tra lại.');
                         }
                       } catch (err: any) {
                         alert(err.response?.data?.error || 'Thao tác xuất thất bại');
                       } finally {
                         setExportLoading(false);
                         setShowReportSetupModal(false);
                       }
                     }
                   }}
                   disabled={exportLoading}
                   className="flex-2 flex-[2] py-3 bg-indigo-600 text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 transition active:scale-95 flex items-center justify-center"
                 >
                   {exportLoading ? 'Đang xuất...' : (setupFormat === 'PDF' ? 'Xem trước & In' : 'Tải file')}
                 </button>
               </div>
             </div>
           </div>
         )}
         
         {/* PRINT CONFIRM MODAL */}
         {showPrintConfirm && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                 <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/30"><Printer className="w-5 h-5"/></div>
                       <h3 className="text-lg font-black text-slate-800">In phiếu mua sắm</h3>
                    </div>
                    <button onClick={() => setShowPrintConfirm(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X className="w-5 h-5 text-slate-400"/></button>
                 </div>
                 
                 <div className="p-6">
                    <p className="text-sm font-bold text-slate-500 mb-6">Hệ thống sẽ tạo các phiếu tổng hợp theo từng nhóm. Mỗi phiếu sẽ bắt đầu từ một trang mới.</p>
                    
                    <div className="space-y-3">
                       {summaryGroups.map(g => (
                          <div key={g.type} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-indigo-200 hover:bg-white hover:shadow-md group">
                             <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${g.type === 'VPP' ? 'bg-amber-100 text-amber-600' : g.type === 'VE_SINH' ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-600'}`}>
                                   {g.type.slice(0, 2)}
                                </div>
                                <div>
                                   <p className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{g.label}</p>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{g.items.length} mặt hàng</p>
                                </div>
                             </div>
                             <CheckCircle className="w-5 h-5 text-emerald-500 opacity-60"/>
                          </div>
                       ))}
                    </div>

                    {printStats.otherCount > 0 && (
                       <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"/>
                          <div>
                             <p className="text-xs font-black text-amber-800 uppercase tracking-tight">Cảnh báo phân loại</p>
                             <p className="text-[11px] font-bold text-amber-600 leading-relaxed">Có {printStats.otherCount} vật tư chưa được phân loại vào VPP hay Vệ sinh. Vui lòng kiểm tra lại trước khi in.</p>
                          </div>
                       </div>
                    )}
                 </div>

                 <div className="p-6 bg-slate-50 flex gap-3">
                    <button onClick={() => setShowPrintConfirm(false)} className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-500 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-100 transition active:scale-95 shadow-sm">Hủy bỏ</button>
                    <button onClick={() => handlePrintSummary('ALL')} className="flex-2 flex-[2] py-3.5 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 transition active:scale-95">Bắt đầu in phiếu</button>
                 </div>
              </div>
           </div>
        )}

        {/* PRINT SUMMARY AREA - OVERHAULED FOR PROFESSIONAL REPORTING */}
        <div className="hidden print:block print-area">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { size: A4 portrait; margin: 10mm; }
              * { background-color: transparent !important; color-adjust: exact; -webkit-print-color-adjust: exact; }
              .print-sheet { font-family: "Times New Roman", Times, serif; color: #000 !important; background: #fff !important; page-break-after: always; break-after: page; line-height: 1.3; }
              .print-sheet:last-child { page-break-after: auto; break-after: auto; }
              
              .print-table { width: 100%; border-collapse: collapse; table-layout: fixed; background: #fff !important; }
              .print-table th { padding: 6px 4px; border: 1px solid #000; text-transform: uppercase; background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .print-table td { padding: 6px 4px; border: 1px solid #000; vertical-align: middle; }
              .print-highlight-row td { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              
              .header-text { font-size: 10pt; }
              .title-main { font-size: 16pt; font-weight: bold; text-align: center; margin-top: 20px; }
              .title-sub { font-size: 10pt; font-style: italic; text-align: center; margin-bottom: 15px; }
              
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 9pt; }
              .info-item { display: flex; gap: 5px; }
              .info-label { font-weight: bold; min-width: 100px; }
              
              .item-main-row td { font-size: 8.5pt !important; font-weight: bold; }
              
              .allocation-row td { 
                font-size: 7.2pt !important; 
                line-height: 1.25; 
                font-style: italic; 
                border-top: none !important; 
                border-bottom: none !important; 
              }
              .allocation-department { font-weight: 700; color: #000; }
              .allocation-request-code { font-size: 6.7pt; color: #555; font-weight: normal; }
              .allocation-quantity { font-weight: 700; white-space: nowrap; color: #000; }
              .allocation-note { color: #333; font-weight: normal; }

              .replacement-row td { font-size: 7.5pt !important; font-style: italic; color: #444 !important; background-color: #f9f9f9 !important; border-top: none !important; }
              
              .total-section { margin-top: 20px; font-size: 10pt; border-top: 2px solid #000; padding-top: 10px; }
              .total-row { display: flex; justify-content: flex-end; gap: 40px; margin-bottom: 5px; }
              .total-label { font-weight: bold; min-width: 300px; text-align: right; }
              .total-value { font-weight: bold; min-width: 120px; text-align: right; }
              
              .footer-sign { margin-top: 15px; display: flex; justify-content: space-around; text-align: center; font-size: 9pt; page-break-inside: avoid; break-inside: avoid; }
              .sign-box { height: 80px; }
            }
          `}} />
          
          {summaryGroups
            .filter(g => selectedPrintType === 'ALL' ? (g.type === 'VPP' || g.type === 'VE_SINH') : g.type === selectedPrintType)
            .map((group) => (
            <div key={group.type} className="print-sheet p-4">
                {(() => {
                    const targetData = selectedIds.length > 0 
                      ? data.filter(d => selectedIds.includes(d.id))
                      : filteredData;
                    const printTitle = group.type === 'VPP' 
                        ? 'PHIẾU TỔNG HỢP MUA SẮM VĂN PHÒNG PHẨM' 
                        : group.type === 'VE_SINH' 
                            ? 'PHIẾU TỔNG HỢP MUA SẮM VẬT TƯ VỆ SINH' 
                            : `PHIẾU TỔNG HỢP MUA SẮM ${group.label}`;
                    
                    const groupCodeShort = group.type === 'VE_SINH' ? 'VS' : group.type;
                    const summaryCode = `THMS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${groupCodeShort}`;

                    return (
                        <>
                            {/* HEADER SECTION */}
                            <div className="flex justify-between items-start w-full border-b pb-4 mb-4">
                                <div className="w-[45%] text-left header-text">
                                    <p className="font-bold uppercase">CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO</p>
                                    <p className="font-bold italic">Báo cáo tổng hợp đơn mua sắm</p>
                                    <p>Ban Hành chính Nhân sự</p>
                                </div>
                                <div className="w-[10%] flex flex-col items-center">
                                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=65x65&data=${encodeURIComponent(summaryCode)}`} alt="QR" className="w-12 h-12 border border-slate-100" />
                                 </div>
                                <div className="w-[45%] text-center header-text">
                                    <p className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                                    <p className="font-bold underline underline-offset-[4px] mt-1">Độc lập - Tự do - Hạnh phúc</p>
                                    <p className="mt-3 italic text-right mr-10">Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
                                </div>
                            </div>

                            {/* TITLE */}
                            <h2 className="title-main">{printTitle}</h2>

                            <p className="title-sub">

                              {selectedIds.length > 0

                                ? `Phạm vi: Theo phiếu đã chọn (${group.poCount} phiếu)`

                                : `(Tổng hợp từ ${group.poCount} phiếu mua sắm / đề nghị đang lọc)`}
  <br />
  <span style={{ fontSize: '0.9em', fontStyle: 'italic' }}>
    {(() => {
       let pos = targetData || [];
       if (!pos || pos.length === 0) return '';
       let minD = new Date(pos[0].createdAt);
       let maxD = new Date(pos[0].createdAt);
       pos.forEach((p:any) => {
         const d = new Date(p.createdAt);
         if(d < minD) minD = d;
         if(d > maxD) maxD = d;
       });
       if (minD.toDateString() === maxD.toDateString()) {
          return `Ngày ${minD.getDate()} tháng ${minD.getMonth()+1} năm ${minD.getFullYear()}`;
       }
       return `Từ ngày ${minD.getDate()}/${minD.getMonth()+1}/${minD.getFullYear()} đến ngày ${maxD.getDate()}/${maxD.getMonth()+1}/${maxD.getFullYear()}`;
    })()}
  </span>
</p>

                            {/* OVERVIEW INFO BLOCK */}
                            <div className="info-grid">
                               <div className="info-item"><span className="info-label">Mã tổng hợp:</span> <span>{summaryCode}</span></div>
                               <div className="info-item"><span className="info-label">Người lập:</span> <span>Quản lý Hành chính</span></div>
                               <div className="info-item"><span className="info-label">Kho áp dụng:</span> <span>{group.label}</span></div>
                               <div className="info-item"><span className="info-label">Ngày in:</span> <span>{new Date().toLocaleDateString('vi-VN')}</span></div>
                               <div className="info-item"><span className="info-label">Tổng số phiếu:</span> <span>{group.poCount} phiếu</span></div>
                               <div className="info-item"><span className="info-label">Số mặt hàng:</span> <span>{group.items.length} mặt hàng</span></div>
                            </div>
                        </>
                    );
                })()}

                {/* MAIN TABLE */}
                <table className="print-table">
                    <thead>
                        <tr className="bg-slate-100 font-bold text-[8pt] text-center">
                            <th style={{width: '4%'}}>STT</th>
                            <th style={{width: '12%'}}>MÃ VT</th>
                            <th style={{width: '28%'}}>TÊN VẬT TƯ MUA</th>
                            <th style={{width: '6%'}}>ĐVT</th>
                            <th style={{width: '8%'}}>SL MUA</th>
                            <th style={{width: '12%'}}>ĐƠN GIÁ</th>
                            <th style={{width: '14%'}}>THÀNH TIỀN</th>
                        </tr>
                    </thead>
                    <tbody>
                        {group.items.map((item: any, idx: number) => (
                            <React.Fragment key={item.mvpp}>
                                {/* MAIN ITEM ROW */}
                                <tr className="item-main-row print-highlight-row">
                                    <td className="text-center">{idx + 1}</td>
                                    <td className="text-center">{item.mvpp}</td>
                                    <td className="uppercase">
                                        <div className="font-bold">{item.name}</div>
                                        {item.replacements?.map((rep: any, ri: number) => (
                                           <div key={ri} className="text-[7pt] italic text-slate-500 normal-case mt-0.5">
                                              (Thay cho: {rep.originalName})
                                           </div>
                                        ))}
                                    </td>
                                    <td className="text-center">{item.unit}</td>
                                    <td className="text-center">{item.qty}</td>
                                    <td className="text-right">{Number(item.price).toLocaleString('vi-VN')}</td>
                                    <td className="text-right">{Number(item.actualTotal).toLocaleString('vi-VN')}</td>
                                </tr>
                                
                                {/* ALLOCATION ROWS - OPTIMIZED FOR CLEAR DEPT VIEW */}
                                {item.deptEntries.length > 0 ? item.deptEntries.map((de: any, deIdx: number) => (
                                    <tr key={`de-${deIdx}`} className="allocation-row">
                                       <td style={{borderTop: 'none', borderBottom: 'none'}}></td>
                                       <td colSpan={6} style={{borderTop: 'none', borderBottom: 'none'}}>
                                          <div className="grid grid-cols-12 gap-2 px-2 py-0.5">
                                             <div className="col-span-7 flex flex-col">
                                                <span className="allocation-department">- {de.dept || 'Chưa liên kết được phòng ban'}</span>
                                                <span className="allocation-request-code ml-2">{de.requestCode}</span>
                                             </div>
                                             <div className="col-span-2 text-left">
                                                <span className="allocation-quantity">SL: {de.qty} {de.unit}</span>
                                             </div>
                                             <div className="col-span-3">
                                                <span className="allocation-note">{de.note ? `Ghi chú: ${de.note}` : ''}</span>
                                             </div>
                                          </div>
                                       </td>
                                    </tr>
                                )) : (
                                  <tr className="allocation-row">
                                     <td style={{borderTop: 'none', borderBottom: 'none'}}></td>
                                     <td colSpan={6} style={{borderTop: 'none', borderBottom: 'none'}} className="px-4 py-1 text-rose-500 italic font-bold">
                                        - Chưa liên kết được phòng ban đề xuất
                                     </td>
                                  </tr>
                                )}

                                {/* REPLACEMENT INFO ROW */}
                                {item.replacements.length > 0 && item.replacements.map((rep: any, rIdx: number) => (
                                   <tr key={`rep-${rIdx}`} className="replacement-row">
                                      <td style={{borderTop: 'none'}}></td>
                                      <td colSpan={6} style={{borderTop: 'none', paddingLeft: '20px'}}>
                                         <p className="font-bold text-slate-600">
                                            Thay cho: {rep.originalName} | Mã cũ: {rep.originalCode} | Giá cũ: {Number(rep.originalPrice).toLocaleString('vi-VN')}
                                         </p>
                                         <p className="text-indigo-600 font-bold">
                                            Lý do: {rep.reason || 'Điều chỉnh thực tế'} | Chênh lệch: {rep.diff >= 0 ? `Tiết kiệm ${rep.diff.toLocaleString('vi-VN')} đ` : `Tăng ${Math.abs(rep.diff).toLocaleString('vi-VN')} đ`}
                                         </p>
                                      </td>
                                   </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>

                {/* TOTALS SECTION - OVERHAULED */}
                <div className="total-section">
                   <div className="total-row">
                      <div className="total-label uppercase">TỔNG CỘNG ({group.items.length} MẶT HÀNG):</div>
                      <div className="total-value text-right">{group.items.reduce((s:number, i:any) => s + i.qty, 0).toLocaleString('vi-VN')}</div>
                      <div className="total-value text-right">{Number(group.actualTotal).toLocaleString('vi-VN')} đ</div>
                   </div>
                   
                   <div className="mt-4 border-t pt-2 border-dashed">
                      <div className="total-row text-[9pt]">
                         <div className="total-label uppercase">TỔNG GIÁ TRỊ ĐỀ XUẤT ĐÃ DUYỆT:</div>
                         <div className="total-value text-right">{Number(group.approvedTotal).toLocaleString('vi-VN')} đ</div>
                      </div>
                      <div className="total-row text-[9pt]">
                         <div className="total-label uppercase">TỔNG GIÁ TRỊ MUA THỰC TẾ SAU RÀ SOÁT:</div>
                         <div className="total-value text-right text-indigo-700">{Number(group.actualTotal).toLocaleString('vi-VN')} đ</div>
                      </div>
                      <div className="total-row text-[10pt] font-black border-t border-slate-200 mt-1 pt-1">
                         <div className="total-label uppercase tracking-tight">{group.savings >= 0 ? 'HIỆU QUẢ TỐI ƯU CHI PHÍ MUA SẮM:' : 'CHÊNH LỆCH CHI PHÍ TĂNG:'}</div>
                         <div className={`total-value text-right ${group.savings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {Number(Math.abs(group.savings)).toLocaleString('vi-VN')} đ
                         </div>
                      </div>
                   </div>
                </div>

                {/* FOOTER SIGNATURES */}
                <div className="footer-sign">
                   <div>
                      <p className="font-bold uppercase">Người lập phiếu</p>
                      <div className="mt-6">
                         <p className="font-bold">..........................</p>
                         <p className="text-[9pt] font-black text-blue-600 mt-1">{formatDigitalSignatureDate()} (Đã ký số)</p>
                      </div>
                   </div>
                   <div>
                      <p className="font-bold uppercase">Trưởng bộ phận</p>
                      <div className="mt-6">
                         <p className="font-bold">..........................</p>
                         <p className="text-[9pt] font-black text-blue-600 mt-1">{formatDigitalSignatureDate()} (Đã ký số)</p>
                      </div>
                   </div>
                </div>
            </div>
          ))}

          {/* VPP Department Summary Sheet */}
          {(selectedPrintType === 'DEPT_VPP' || selectedPrintType === 'ALL') && deptReportDataVPP.totalActual > 0 && (
            <div className="print-sheet p-4">
                {(() => {
                    const targetData = selectedIds.length > 0 
                      ? data.filter(d => selectedIds.includes(d.id))
                      : filteredData;
                    
                    let periodLabel = "Tất cả các kỳ";
                    if (selectedMonth) {
                        const [year, month] = selectedMonth.split('-');
                        periodLabel = `Tháng ${month}/${year}`;
                    } else {
                        const dates = targetData.map(d => new Date(d.createdAt || d.orderDate).getTime()).filter(Boolean);
                        if (dates.length > 0) {
                            const minDate = new Date(Math.min(...dates));
                            const maxDate = new Date(Math.max(...dates));
                            if (minDate.toDateString() === maxDate.toDateString()) {
                                periodLabel = minDate.toLocaleDateString('vi-VN');
                            } else {
                                periodLabel = `Từ ${minDate.toLocaleDateString('vi-VN')} đến ${maxDate.toLocaleDateString('vi-VN')}`;
                            }
                        }
                    }

                    const categoryCodeShort = 'VPP';
                    const summaryCode = `THMS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-PB-${categoryCodeShort}`;
                    // const printTitle = 'TỔNG HỢP TIÊU THỤ ĐỒ VĂN PHÒNG PHẨM THEO PHÒNG BAN';
                    // const categoryLabel = 'đồ Văn phòng phẩm';

                    return (
                        <>
                            {/* HEADER SECTION */}
                            <div className="flex justify-between items-start w-full border-b pb-4 mb-4">
                                <div className="w-[45%] text-left header-text">
                                    <p className="font-bold uppercase">CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO</p>
                                    <p className="font-bold italic">Báo cáo tổng hợp đơn mua sắm</p>
                                    <p>Ban Hành chính Nhân sự</p>
                                </div>
                                <div className="w-[10%] flex flex-col items-center">
                                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=65x65&data=${encodeURIComponent(summaryCode)}`} alt="QR" className="w-12 h-12 border border-slate-100" />
                                 </div>
                                <div className="w-[45%] text-center header-text">
                                    <p className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                                    <p className="font-bold underline underline-offset-[4px] mt-1">Độc lập - Tự do - Hạnh phúc</p>
                                    <p className="mt-3 italic text-right mr-10">Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
                                </div>
                            </div>

                            {/* TITLE */}
                            <h2 className="title-main uppercase text-center">
                                TỔNG HỢP TIÊU THỤ ĐỒ VĂN PHÒNG PHẨM <br /> THEO PHÒNG BAN
                            </h2>


                            {/* TỔNG HỢP NHANH SỐ LIỆU */}
                            <table className="print-table mb-4" style={{ fontSize: '8.5pt' }}>
                                <thead>
                                    <tr className="bg-slate-100 font-bold text-center text-[9pt]">
                                        <th colSpan={4} style={{ padding: '4px', border: '1px solid #000' }}>TỔNG HỢP NHANH SỐ LIỆU TIÊU THỤ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="font-bold" style={{ width: '25%' }}>Kỳ tổng hợp:</td>
                                        <td style={{ width: '25%' }}>{periodLabel}</td>
                                        <td className="font-bold" style={{ width: '25%' }}>Phạm vi:</td>
                                        <td style={{ width: '25%' }}>{selectedIds.length > 0 ? `Theo phiếu đã chọn (${deptReportDataVPP.poCount} phiếu)` : "Toàn hệ thống (Bộ lọc)"}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-bold">Số phòng ban phát sinh:</td>
                                        <td>{deptReportDataVPP.departments.length} đơn vị</td>
                                        <td className="font-bold">Tổng số lượt yêu cầu/cấp phát:</td>
                                        <td>{deptReportDataVPP.totalUniqueRequests} lượt</td>
                                    </tr>
                                    <tr>
                                        <td className="font-bold">Tổng số mặt hàng tiêu thụ:</td>
                                        <td>{deptReportDataVPP.totalUniqueItems} mặt hàng</td>
                                        <td className="font-bold">Tổng giá trị tiêu thụ:</td>
                                        <td className="font-bold text-indigo-700">{Number(deptReportDataVPP.totalActual).toLocaleString('vi-VN')} đ</td>
                                    </tr>
                                    <tr>
                                        <td className="font-bold">Phòng ban tiêu thụ cao nhất:</td>
                                        <td className="font-bold text-rose-700">{deptReportDataVPP.highestDeptName}</td>
                                        <td className="font-bold">Giá trị cao nhất:</td>
                                        <td className="font-bold text-rose-700">{Number(deptReportDataVPP.highestDeptValue).toLocaleString('vi-VN')} đ</td>
                                    </tr>
                                </tbody>
                            </table>
                        </>
                    );
                })()}

                {/* MAIN TABLE */}
                <table className="print-table">
                    <thead>
                        <tr className="bg-slate-100 font-bold text-[8pt] text-center">
                            <th style={{width: '5%'}}>STT</th>
                            <th style={{width: '39%'}}>PHÒNG BAN / ĐƠN VỊ</th>
                            <th style={{width: '14%'}}>SỐ LƯỢT YÊU CẦU</th>
                            <th style={{width: '14%'}}>SỐ MẶT HÀNG</th>
                            <th style={{width: '16%'}}>GIÁ TRỊ TIÊU THỤ</th>
                            <th style={{width: '12%'}}>TỶ TRỌNG</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deptReportDataVPP.departments.map((dept: any, idx: number) => (
                            <tr key={dept.name} className="item-main-row text-[8.5pt]">
                                <td className="text-center">{idx + 1}</td>
                                <td className="font-bold">{dept.name}</td>
                                <td className="text-center">{dept.requestCount} lượt</td>
                                <td className="text-center">{dept.itemCount} mặt hàng</td>
                                <td className="text-right font-bold">{Number(dept.actualTotal).toLocaleString('vi-VN')} đ</td>
                                <td className="text-center font-bold">{dept.percentage.toFixed(2)}%</td>
                            </tr>
                        ))}
                        
                        {/* TOTAL ROW */}
                        <tr className="item-main-row print-highlight-row font-bold text-[8.5pt]">
                            <td className="text-center" colSpan={2}>TỔNG CỘNG</td>
                            <td className="text-center">{deptReportDataVPP.departments.reduce((sum: number, d: any) => sum + d.requestCount, 0)} lượt</td>
                            <td className="text-center">{deptReportDataVPP.totalUniqueItems} mặt hàng</td>
                            <td className="text-right text-indigo-700">{Number(deptReportDataVPP.totalActual).toLocaleString('vi-VN')} đ</td>
                            <td className="text-center">100.00%</td>
                        </tr>
                    </tbody>
                </table>

                {/* FOOTER SIGNATURES */}
                <div className="footer-sign">
                   <div>
                      <p className="font-bold uppercase">Người lập báo cáo</p>
                      <p className="text-[7.5pt] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                      <div className="mt-6">
                         <p className="font-bold">..........................</p>
                         <p className="text-[9pt] font-black text-blue-600 mt-1">{formatDigitalSignatureDate()} (Đã ký số)</p>
                      </div>
                   </div>
                   <div>
                      <p className="font-bold uppercase">Trưởng bộ phận HCNS</p>
                      <p className="text-[7.5pt] italic text-slate-500">(Ký và duyệt)</p>
                      <div className="mt-6">
                         <p className="font-bold">..........................</p>
                         <p className="text-[9pt] font-black text-blue-600 mt-1">{formatDigitalSignatureDate()} (Đã ký số)</p>
                      </div>
                   </div>
                </div>
            </div>
          )}

          {/* VE_SINH Department Summary Sheet */}
          {(selectedPrintType === 'DEPT_VS' || selectedPrintType === 'ALL') && deptReportDataVS.totalActual > 0 && (
            <div className="print-sheet p-4">
                {(() => {
                    const targetData = selectedIds.length > 0 
                      ? data.filter(d => selectedIds.includes(d.id))
                      : filteredData;
                    
                    let periodLabel = "Tất cả các kỳ";
                    if (selectedMonth) {
                        const [year, month] = selectedMonth.split('-');
                        periodLabel = `Tháng ${month}/${year}`;
                    } else {
                        const dates = targetData.map(d => new Date(d.createdAt || d.orderDate).getTime()).filter(Boolean);
                        if (dates.length > 0) {
                            const minDate = new Date(Math.min(...dates));
                            const maxDate = new Date(Math.max(...dates));
                            if (minDate.toDateString() === maxDate.toDateString()) {
                                periodLabel = minDate.toLocaleDateString('vi-VN');
                            } else {
                                periodLabel = `Từ ${minDate.toLocaleDateString('vi-VN')} đến ${maxDate.toLocaleDateString('vi-VN')}`;
                            }
                        }
                    }

                    const categoryCodeShort = 'VS';
                    const summaryCode = `THMS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-PB-${categoryCodeShort}`;
                    // const printTitle = 'TỔNG HỢP TIÊU THỤ ĐỒ VỆ SINH THEO PHÒNG BAN';
                    // const categoryLabel = 'đồ vệ sinh';

                    return (
                        <>
                            {/* HEADER SECTION */}
                            <div className="flex justify-between items-start w-full border-b pb-4 mb-4">
                                <div className="w-[45%] text-left header-text">
                                    <p className="font-bold uppercase">CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO</p>
                                    <p className="font-bold italic">Báo cáo tổng hợp đơn mua sắm</p>
                                    <p>Ban Hành chính Nhân sự</p>
                                </div>
                                <div className="w-[10%] flex flex-col items-center">
                                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=65x65&data=${encodeURIComponent(summaryCode)}`} alt="QR" className="w-12 h-12 border border-slate-100" />
                                 </div>
                                <div className="w-[45%] text-center header-text">
                                    <p className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                                    <p className="font-bold underline underline-offset-[4px] mt-1">Độc lập - Tự do - Hạnh phúc</p>
                                    <p className="mt-3 italic text-right mr-10">Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
                                </div>
                            </div>

                            {/* TITLE */}
                            <h2 className="title-main uppercase text-center">
                                TỔNG HỢP TIÊU THỤ ĐỒ VỆ SINH <br /> THEO PHÒNG BAN
                            </h2>


                            {/* TỔNG HỢP NHANH SỐ LIỆU */}
                            <table className="print-table mb-4" style={{ fontSize: '8.5pt' }}>
                                <thead>
                                    <tr className="bg-slate-100 font-bold text-center text-[9pt]">
                                        <th colSpan={4} style={{ padding: '4px', border: '1px solid #000' }}>TỔNG HỢP NHANH SỐ LIỆU TIÊU THỤ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="font-bold" style={{ width: '25%' }}>Kỳ tổng hợp:</td>
                                        <td style={{ width: '25%' }}>{periodLabel}</td>
                                        <td className="font-bold" style={{ width: '25%' }}>Phạm vi:</td>
                                        <td style={{ width: '25%' }}>{selectedIds.length > 0 ? `Theo phiếu đã chọn (${deptReportDataVS.poCount} phiếu)` : "Toàn hệ thống (Bộ lọc)"}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-bold">Số phòng ban phát sinh:</td>
                                        <td>{deptReportDataVS.departments.length} đơn vị</td>
                                        <td className="font-bold">Tổng số lượt yêu cầu/cấp phát:</td>
                                        <td>{deptReportDataVS.totalUniqueRequests} lượt</td>
                                    </tr>
                                    <tr>
                                        <td className="font-bold">Tổng số mặt hàng tiêu thụ:</td>
                                        <td>{deptReportDataVS.totalUniqueItems} mặt hàng</td>
                                        <td className="font-bold">Tổng giá trị tiêu thụ:</td>
                                        <td className="font-bold text-indigo-700">{Number(deptReportDataVS.totalActual).toLocaleString('vi-VN')} đ</td>
                                    </tr>
                                    <tr>
                                        <td className="font-bold">Phòng ban tiêu thụ cao nhất:</td>
                                        <td className="font-bold text-rose-700">{deptReportDataVS.highestDeptName}</td>
                                        <td className="font-bold">Giá trị cao nhất:</td>
                                        <td className="font-bold text-rose-700">{Number(deptReportDataVS.highestDeptValue).toLocaleString('vi-VN')} đ</td>
                                    </tr>
                                </tbody>
                            </table>
                        </>
                    );
                })()}

                {/* MAIN TABLE */}
                <table className="print-table">
                    <thead>
                        <tr className="bg-slate-100 font-bold text-[8pt] text-center">
                            <th style={{width: '5%'}}>STT</th>
                            <th style={{width: '39%'}}>PHÒNG BAN / ĐƠN VỊ</th>
                            <th style={{width: '14%'}}>SỐ LƯỢT YÊU CẦU</th>
                            <th style={{width: '14%'}}>SỐ MẶT HÀNG</th>
                            <th style={{width: '16%'}}>GIÁ TRỊ TIÊU THỤ</th>
                            <th style={{width: '12%'}}>TỶ TRỌNG</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deptReportDataVS.departments.map((dept: any, idx: number) => (
                            <tr key={dept.name} className="item-main-row text-[8.5pt]">
                                <td className="text-center">{idx + 1}</td>
                                <td className="font-bold">{dept.name}</td>
                                <td className="text-center">{dept.requestCount} lượt</td>
                                <td className="text-center">{dept.itemCount} mặt hàng</td>
                                <td className="text-right font-bold">{Number(dept.actualTotal).toLocaleString('vi-VN')} đ</td>
                                <td className="text-center font-bold">{dept.percentage.toFixed(2)}%</td>
                            </tr>
                        ))}
                        
                        {/* TOTAL ROW */}
                        <tr className="item-main-row print-highlight-row font-bold text-[8.5pt]">
                            <td className="text-center" colSpan={2}>TỔNG CỘNG</td>
                            <td className="text-center">{deptReportDataVS.departments.reduce((sum: number, d: any) => sum + d.requestCount, 0)} lượt</td>
                            <td className="text-center">{deptReportDataVS.totalUniqueItems} mặt hàng</td>
                            <td className="text-right text-indigo-700">{Number(deptReportDataVS.totalActual).toLocaleString('vi-VN')} đ</td>
                            <td className="text-center">100.00%</td>
                        </tr>
                    </tbody>
                </table>

                {/* FOOTER SIGNATURES */}
                <div className="footer-sign">
                   <div>
                      <p className="font-bold uppercase">Người lập báo cáo</p>
                      <p className="text-[7.5pt] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                      <div className="mt-6">
                         <p className="font-bold">..........................</p>
                         <p className="text-[9pt] font-black text-blue-600 mt-1">{formatDigitalSignatureDate()} (Đã ký số)</p>
                      </div>
                   </div>
                   <div>
                      <p className="font-bold uppercase">Trưởng bộ phận HCNS</p>
                      <p className="text-[7.5pt] italic text-slate-500">(Ký và duyệt)</p>
                      <div className="mt-6">
                         <p className="font-bold">..........................</p>
                         <p className="text-[9pt] font-black text-blue-600 mt-1">{formatDigitalSignatureDate()} (Đã ký số)</p>
                      </div>
                   </div>
                </div>
            </div>
          )}

          
          {/* REQ_DEPT_VPP Print Sheet */}
          {(selectedPrintType === 'REQ_DEPT_VPP' || selectedPrintType === 'ALL') && reqDeptReportDataVPP.totalActual > 0 && (
            <div className="print-sheet p-4">
                {(() => {
                    const targetData = selectedIds.length > 0 
                      ? data.filter(d => selectedIds.includes(d.id))
                      : filteredData;
                    
                    let periodLabel = "Tất cả các kỳ";
                    if (selectedMonth) {
                        const [year, month] = selectedMonth.split('-');
                        periodLabel = `Tháng ${month}/${year}`;
                    } else {
                        const dates = targetData.map(d => new Date(d.createdAt || d.orderDate).getTime()).filter(Boolean);
                        if (dates.length > 0) {
                            const minDate = new Date(Math.min(...dates));
                            const maxDate = new Date(Math.max(...dates));
                            if (minDate.toDateString() === maxDate.toDateString()) {
                                periodLabel = minDate.toLocaleDateString('vi-VN');
                            } else {
                                periodLabel = `Từ ${minDate.toLocaleDateString('vi-VN')} đến ${maxDate.toLocaleDateString('vi-VN')}`;
                            }
                        }
                    }

                    const categoryCodeShort = 'VPP';
                    const summaryCode = `THMS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-PBDX-${categoryCodeShort}`;
                    const titleText = 'TỔNG HỢP VPP THEO PHÒNG BAN CỦA ĐỀ XUẤT';

                    return (
                        <>
                            <div className="flex justify-between items-start w-full border-b pb-4 mb-4">
                                <div className="w-[45%] text-left header-text">
                                    <p className="font-bold uppercase">CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO</p>
                                    <p className="font-bold italic">Báo cáo tổng hợp đơn mua sắm</p>
                                    <p>Ban Hành chính Nhân sự</p>
                                </div>
                                <div className="w-[10%] flex flex-col items-center">
                                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=65x65&data=${encodeURIComponent(summaryCode)}`} alt="QR" className="w-12 h-12 border border-slate-100" />
                                 </div>
                                <div className="w-[45%] text-center header-text">
                                    <p className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                                    <p className="font-bold underline underline-offset-[4px] mt-1">Độc lập - Tự do - Hạnh phúc</p>
                                    <p className="mt-3 italic text-right mr-10">Hà Nội, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</p>
                                </div>
                            </div>

                            <h2 className="title-main uppercase text-center">{titleText}</h2>
                            <p className="title-sub">

                              {selectedIds.length > 0

                                ? `Phạm vi: Theo phiếu đã chọn (${targetData.length} phiếu)`

                                : `(Tổng hợp từ ${targetData.length} phiếu mua sắm / đề nghị đang lọc)`}
  <br />
  <span style={{ fontSize: '0.9em', fontStyle: 'italic' }}>
    {(() => {
       let pos = targetData || [];
       if (!pos || pos.length === 0) return '';
       let minD = new Date(pos[0].createdAt);
       let maxD = new Date(pos[0].createdAt);
       pos.forEach((p:any) => {
         const d = new Date(p.createdAt);
         if(d < minD) minD = d;
         if(d > maxD) maxD = d;
       });
       if (minD.toDateString() === maxD.toDateString()) {
          return `Ngày ${minD.getDate()} tháng ${minD.getMonth()+1} năm ${minD.getFullYear()}`;
       }
       return `Từ ngày ${minD.getDate()}/${minD.getMonth()+1}/${minD.getFullYear()} đến ngày ${maxD.getDate()}/${maxD.getMonth()+1}/${maxD.getFullYear()}`;
    })()}
  </span>
</p>

                            <table className="print-table mb-4" style={{ fontSize: '8.5pt' }}>
                                <thead>
                                    <tr className="bg-slate-100 font-bold text-center text-[9pt]">
                                        <th colSpan={4} style={{ padding: '4px', border: '1px solid #000' }}>TỔNG HỢP NHANH SỐ LIỆU THEO ĐỀ XUẤT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="font-bold" style={{ width: '25%' }}>Kỳ tổng hợp:</td>
                                        <td style={{ width: '25%' }}>{periodLabel}</td>
                                        <td className="font-bold" style={{ width: '25%' }}>Phạm vi:</td>
                                        <td style={{ width: '25%' }}>{selectedIds.length > 0 ? `Theo phiếu đã chọn (${targetData.length} phiếu)` : "Toàn hệ thống (Bộ lọc)"}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-bold">Số phòng ban đề xuất:</td>
                                        <td>{reqDeptReportDataVPP.totalCount} đơn vị</td>
                                        <td className="font-bold">Tổng số phiếu đề xuất:</td>
                                        <td>{reqDeptReportDataVPP.departments.reduce((sum, d) => sum + d.requestCount, 0)} phiếu</td>
                                    </tr>
                                    <tr>
                                        <td className="font-bold">Tổng giá trị mua thực tế:</td>
                                        <td className="font-bold text-indigo-700" colSpan={3}>{Number(reqDeptReportDataVPP.totalActual).toLocaleString('vi-VN')} đ</td>
                                    </tr>
                                </tbody>
                            </table>
                        </>
                    );
                })()}

                <table className="print-table">
                    <thead>
                        <tr className="bg-slate-100 font-bold text-[8pt] text-center">
                            <th style={{width: '4%'}}>STT</th>
                            <th style={{width: '20%'}}>PHÒNG BAN / ĐƠN VỊ</th>
                            <th style={{width: '18%'}}>SỐ PHIẾU ĐỀ XUẤT</th>
                            <th style={{width: '8%'}}>SỐ MẶT HÀNG</th>
                            <th style={{width: '10%'}}>SL YÊU CẦU</th>
                            <th style={{width: '10%'}}>SL DUYỆT</th>
                            <th style={{width: '10%'}}>SL MUA</th>
                            <th style={{width: '12%'}}>GIÁ TRỊ TẠM TÍNH</th>
                            <th style={{width: '8%'}}>TỶ TRỌNG</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reqDeptReportDataVPP.departments.map((dept, idx) => {
                            const pct = reqDeptReportDataVPP.totalActual > 0 ? (dept.estimatedValue / reqDeptReportDataVPP.totalActual) * 100 : 0;
                            return (
                                <React.Fragment key={dept.name}>
                                    <tr className="item-main-row text-[8.5pt] print-highlight-row">
                                        <td className="text-center">{idx + 1}</td>
                                        <td className="font-bold">{dept.name}</td>
                                        <td className="text-center text-[7.5pt]">{dept.requestCodesStr}</td>
                                        <td className="text-center">{dept.itemCount}</td>
                                        <td className="text-center">{dept.qtyRequested}</td>
                                        <td className="text-center">{dept.qtyApproved}</td>
                                        <td className="text-center font-bold">{dept.qtyPurchased}</td>
                                        <td className="text-right font-bold">{Number(dept.estimatedValue).toLocaleString('vi-VN')}</td>
                                        <td className="text-center font-bold">{pct.toFixed(2)}%</td>
                                    </tr>
                                    {selectedPrintDetailMode === 'DETAIL' && dept.detailLines && dept.detailLines.map((dl, dlIdx) => (
                                        <tr key={`dl-${dlIdx}`} className="allocation-row">
                                            <td style={{borderTop: 'none', borderBottom: 'none'}}></td>
                                            <td colSpan={8} style={{borderTop: 'none', borderBottom: 'none'}}>
                                                <div className="grid grid-cols-12 gap-2 px-2 py-0.5">
                                                    <div className="col-span-5 flex flex-col">
                                                        <span className="font-bold text-slate-700">- {dl.itemName}</span>
                                                        <span className="text-[6.5pt] text-slate-400 ml-2">Phiếu: {dl.requestCode}</span>
                                                    </div>
                                                    <div className="col-span-3 text-left">
                                                        <span className="text-slate-600">Duyệt: {dl.qtyApproved} | Mua: {dl.qtyPurchased}</span>
                                                    </div>
                                                    <div className="col-span-4">
                                                        <span className="text-slate-500 italic">{dl.note ? `Ghi chú: ${dl.note}` : ''}</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                        
                        <tr className="item-main-row print-highlight-row font-bold text-[8.5pt]">
                            <td className="text-center" colSpan={2}>TỔNG CỘNG</td>
                            <td className="text-center">{reqDeptReportDataVPP.departments.reduce((sum, d) => sum + d.requestCount, 0)} phiếu</td>
                            <td className="text-center">{reqDeptReportDataVPP.departments.reduce((sum, d) => sum + d.itemCount, 0)}</td>
                            <td className="text-center">{reqDeptReportDataVPP.departments.reduce((sum, d) => sum + d.qtyRequested, 0)}</td>
                            <td className="text-center">{reqDeptReportDataVPP.departments.reduce((sum, d) => sum + d.qtyApproved, 0)}</td>
                            <td className="text-center">{reqDeptReportDataVPP.departments.reduce((sum, d) => sum + d.qtyPurchased, 0)}</td>
                            <td className="text-right text-indigo-700">{Number(reqDeptReportDataVPP.totalActual).toLocaleString('vi-VN')} đ</td>
                            <td className="text-center">100.00%</td>
                        </tr>
                    </tbody>
                </table>

                <div className="footer-sign">
                   <div>
                      <p className="font-bold uppercase">Người lập báo cáo</p>
                      <p className="text-[7.5pt] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                      <div className="mt-6">
                         <p className="font-bold">..........................</p>
                         <p className="text-[9pt] font-black text-blue-600 mt-1">{formatDigitalSignatureDate()} (Đã ký số)</p>
                      </div>
                   </div>
                   <div>
                      <p className="font-bold uppercase">Trưởng bộ phận HCNS</p>
                      <p className="text-[7.5pt] italic text-slate-500">(Ký và duyệt)</p>
                      <div className="mt-6">
                         <p className="font-bold">..........................</p>
                         <p className="text-[9pt] font-black text-blue-600 mt-1">{formatDigitalSignatureDate()} (Đã ký số)</p>
                      </div>
                   </div>
                </div>
            </div>
          )}

          {/* REQ_DEPT_VS Print Sheet */}
          {(selectedPrintType === 'REQ_DEPT_VS' || selectedPrintType === 'ALL') && reqDeptReportDataVS.totalActual > 0 && (
            <div className="print-sheet p-4">
                {(() => {
                    const targetData = selectedIds.length > 0 
                      ? data.filter(d => selectedIds.includes(d.id))
                      : filteredData;
                    
                    let periodLabel = "Tất cả các kỳ";
                    if (selectedMonth) {
                        const [year, month] = selectedMonth.split('-');
                        periodLabel = `Tháng ${month}/${year}`;
                    } else {
                        const dates = targetData.map(d => new Date(d.createdAt || d.orderDate).getTime()).filter(Boolean);
                        if (dates.length > 0) {
                            const minDate = new Date(Math.min(...dates));
                            const maxDate = new Date(Math.max(...dates));
                            if (minDate.toDateString() === maxDate.toDateString()) {
                                periodLabel = minDate.toLocaleDateString('vi-VN');
                            } else {
                                periodLabel = `Từ ${minDate.toLocaleDateString('vi-VN')} đến ${maxDate.toLocaleDateString('vi-VN')}`;
                            }
                        }
                    }

                    const categoryCodeShort = 'VS';
                    const summaryCode = `THMS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-PBDX-${categoryCodeShort}`;
                    const titleText = 'TỔNG HỢP VỆ SINH THEO PHÒNG BAN CỦA ĐỀ XUẤT';

                    return (
                        <>
                            <div className="flex justify-between items-start w-full border-b pb-4 mb-4">
                                <div className="w-[45%] text-left header-text">
                                    <p className="font-bold uppercase">CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO</p>
                                    <p className="font-bold italic">Báo cáo tổng hợp đơn mua sắm</p>
                                    <p>Ban Hành chính Nhân sự</p>
                                </div>
                                <div className="w-[10%] flex flex-col items-center">
                                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=65x65&data=${encodeURIComponent(summaryCode)}`} alt="QR" className="w-12 h-12 border border-slate-100" />
                                 </div>
                                <div className="w-[45%] text-center header-text">
                                    <p className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                                    <p className="font-bold underline underline-offset-[4px] mt-1">Độc lập - Tự do - Hạnh phúc</p>
                                    <p className="mt-3 italic text-right mr-10">Hà Nội, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</p>
                                </div>
                            </div>

                            <h2 className="title-main uppercase text-center">{titleText}</h2>
                            <p className="title-sub">

                              {selectedIds.length > 0

                                ? `Phạm vi: Theo phiếu đã chọn (${targetData.length} phiếu)`

                                : `(Tổng hợp từ ${targetData.length} phiếu mua sắm / đề nghị đang lọc)`}
  <br />
  <span style={{ fontSize: '0.9em', fontStyle: 'italic' }}>
    {(() => {
       let pos = targetData || [];
       if (!pos || pos.length === 0) return '';
       let minD = new Date(pos[0].createdAt);
       let maxD = new Date(pos[0].createdAt);
       pos.forEach((p:any) => {
         const d = new Date(p.createdAt);
         if(d < minD) minD = d;
         if(d > maxD) maxD = d;
       });
       if (minD.toDateString() === maxD.toDateString()) {
          return `Ngày ${minD.getDate()} tháng ${minD.getMonth()+1} năm ${minD.getFullYear()}`;
       }
       return `Từ ngày ${minD.getDate()}/${minD.getMonth()+1}/${minD.getFullYear()} đến ngày ${maxD.getDate()}/${maxD.getMonth()+1}/${maxD.getFullYear()}`;
    })()}
  </span>
</p>

                            <table className="print-table mb-4" style={{ fontSize: '8.5pt' }}>
                                <thead>
                                    <tr className="bg-slate-100 font-bold text-center text-[9pt]">
                                        <th colSpan={4} style={{ padding: '4px', border: '1px solid #000' }}>TỔNG HỢP NHANH SỐ LIỆU THEO ĐỀ XUẤT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="font-bold" style={{ width: '25%' }}>Kỳ tổng hợp:</td>
                                        <td style={{ width: '25%' }}>{periodLabel}</td>
                                        <td className="font-bold" style={{ width: '25%' }}>Phạm vi:</td>
                                        <td style={{ width: '25%' }}>{selectedIds.length > 0 ? `Theo phiếu đã chọn (${targetData.length} phiếu)` : "Toàn hệ thống (Bộ lọc)"}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-bold">Số phòng ban đề xuất:</td>
                                        <td>{reqDeptReportDataVS.totalCount} đơn vị</td>
                                        <td className="font-bold">Tổng số phiếu đề xuất:</td>
                                        <td>{reqDeptReportDataVS.departments.reduce((sum, d) => sum + d.requestCount, 0)} phiếu</td>
                                    </tr>
                                    <tr>
                                        <td className="font-bold">Tổng giá trị mua thực tế:</td>
                                        <td className="font-bold text-indigo-700" colSpan={3}>{Number(reqDeptReportDataVS.totalActual).toLocaleString('vi-VN')} đ</td>
                                    </tr>
                                </tbody>
                            </table>
                        </>
                    );
                })()}

                <table className="print-table">
                    <thead>
                        <tr className="bg-slate-100 font-bold text-[8pt] text-center">
                            <th style={{width: '4%'}}>STT</th>
                            <th style={{width: '20%'}}>PHÒNG BAN / ĐƠN VỊ</th>
                            <th style={{width: '18%'}}>SỐ PHIẾU ĐỀ XUẤT</th>
                            <th style={{width: '8%'}}>SỐ MẶT HÀNG</th>
                            <th style={{width: '10%'}}>SL YÊU CẦU</th>
                            <th style={{width: '10%'}}>SL DUYỆT</th>
                            <th style={{width: '10%'}}>SL MUA</th>
                            <th style={{width: '12%'}}>GIÁ TRỊ TẠM TÍNH</th>
                            <th style={{width: '8%'}}>TỶ TRỌNG</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reqDeptReportDataVS.departments.map((dept, idx) => {
                            const pct = reqDeptReportDataVS.totalActual > 0 ? (dept.estimatedValue / reqDeptReportDataVS.totalActual) * 100 : 0;
                            return (
                                <React.Fragment key={dept.name}>
                                    <tr className="item-main-row text-[8.5pt] print-highlight-row">
                                        <td className="text-center">{idx + 1}</td>
                                        <td className="font-bold">{dept.name}</td>
                                        <td className="text-center text-[7.5pt]">{dept.requestCodesStr}</td>
                                        <td className="text-center">{dept.itemCount}</td>
                                        <td className="text-center">{dept.qtyRequested}</td>
                                        <td className="text-center">{dept.qtyApproved}</td>
                                        <td className="text-center font-bold">{dept.qtyPurchased}</td>
                                        <td className="text-right font-bold">{Number(dept.estimatedValue).toLocaleString('vi-VN')}</td>
                                        <td className="text-center font-bold">{pct.toFixed(2)}%</td>
                                    </tr>
                                    {selectedPrintDetailMode === 'DETAIL' && dept.detailLines && dept.detailLines.map((dl, dlIdx) => (
                                        <tr key={`dl-${dlIdx}`} className="allocation-row">
                                            <td style={{borderTop: 'none', borderBottom: 'none'}}></td>
                                            <td colSpan={8} style={{borderTop: 'none', borderBottom: 'none'}}>
                                                <div className="grid grid-cols-12 gap-2 px-2 py-0.5">
                                                    <div className="col-span-5 flex flex-col">
                                                        <span className="font-bold text-slate-700">- {dl.itemName}</span>
                                                        <span className="text-[6.5pt] text-slate-400 ml-2">Phiếu: {dl.requestCode}</span>
                                                    </div>
                                                    <div className="col-span-3 text-left">
                                                        <span className="text-slate-600">Duyệt: {dl.qtyApproved} | Mua: {dl.qtyPurchased}</span>
                                                    </div>
                                                    <div className="col-span-4">
                                                        <span className="text-slate-500 italic">{dl.note ? `Ghi chú: ${dl.note}` : ''}</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                        
                        <tr className="item-main-row print-highlight-row font-bold text-[8.5pt]">
                            <td className="text-center" colSpan={2}>TỔNG CỘNG</td>
                            <td className="text-center">{reqDeptReportDataVS.departments.reduce((sum, d) => sum + d.requestCount, 0)} phiếu</td>
                            <td className="text-center">{reqDeptReportDataVS.departments.reduce((sum, d) => sum + d.itemCount, 0)}</td>
                            <td className="text-center">{reqDeptReportDataVS.departments.reduce((sum, d) => sum + d.qtyRequested, 0)}</td>
                            <td className="text-center">{reqDeptReportDataVS.departments.reduce((sum, d) => sum + d.qtyApproved, 0)}</td>
                            <td className="text-center">{reqDeptReportDataVS.departments.reduce((sum, d) => sum + d.qtyPurchased, 0)}</td>
                            <td className="text-right text-indigo-700">{Number(reqDeptReportDataVS.totalActual).toLocaleString('vi-VN')} đ</td>
                            <td className="text-center">100.00%</td>
                        </tr>
                    </tbody>
                </table>

                <div className="footer-sign">
                   <div>
                      <p className="font-bold uppercase">Người lập báo cáo</p>
                      <p className="text-[7.5pt] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                      <div className="mt-6">
                         <p className="font-bold">..........................</p>
                         <p className="text-[9pt] font-black text-blue-600 mt-1">{formatDigitalSignatureDate()} (Đã ký số)</p>
                      </div>
                   </div>
                   <div>
                      <p className="font-bold uppercase">Trưởng bộ phận HCNS</p>
                      <p className="text-[7.5pt] italic text-slate-500">(Ký và duyệt)</p>
                      <div className="mt-6">
                         <p className="font-bold">..........................</p>
                         <p className="text-[9pt] font-black text-blue-600 mt-1">{formatDigitalSignatureDate()} (Đã ký số)</p>
                      </div>
                   </div>
                </div>
            </div>
          )}

{/* EXECUTIVE REPORT PAGE */}
          {(selectedPrintType === 'VPP' || selectedPrintType === 'VE_SINH') && (
            <div className="print-sheet p-8 break-before-page flex flex-col justify-center min-h-[500px]">
                <div className="max-w-2xl mx-auto w-full">
                    <div className="text-center mb-10">
                       <h2 className="text-[16pt] font-black uppercase text-slate-800 tracking-wider">{dashboardTitle}</h2>
                       <div className="w-16 h-1 bg-slate-800 mx-auto mt-4 mb-2"></div>
                    </div>
     
                    <table className="w-full border-collapse text-[11pt] mb-8">
                        <tbody>
                            <tr className="border-b border-slate-200">
                                <td className="py-4 pl-4 text-slate-600 font-medium">Tổng giá trị đề xuất</td>
                                <td className="py-4 pr-4 text-right font-bold text-slate-800">{printDashboardSummary.proposed.toLocaleString('vi-VN')} đ</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                                <td className="py-4 pl-4 text-slate-600 font-medium">Tổng giá trị mua thực tế</td>
                                <td className="py-4 pr-4 text-right font-bold text-slate-800">{printDashboardSummary.actual.toLocaleString('vi-VN')} đ</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                                <td className="py-4 pl-4 text-slate-600 font-medium">{dashboardDiffLabel}</td>
                                <td className={`py-4 pr-4 text-right font-black ${dashboardDiffClass}`}>
                                  {printDashboardSummary.absDiff.toLocaleString('vi-VN')} đ
                                </td>
                            </tr>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <td className="py-4 pl-4 text-slate-800 font-black">{dashboardRateLabel}</td>
                                <td className={`py-4 pr-4 text-right font-black ${dashboardDiffClass}`}>
                                    {printDashboardSummary.rate.toFixed(2)}%
                                </td>
                            </tr>
                        </tbody>
                    </table>
     
                    <div className="text-center italic text-slate-500 text-[10pt] px-12 mt-12">
                        Các phương án mua sắm đã được Hành chính rà soát và tối ưu chi phí trước khi trình phê duyệt.
                    </div>
                </div>
            </div>
          )}
        </div>
    </div>
  );
};

export default PurchasesList;
