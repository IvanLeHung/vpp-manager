import React, { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';
import { 
  Search, Plus, DollarSign,
  ShoppingCart, Package, Clock, ChevronRight, Truck, User as UserIcon,
  Printer, CheckSquare, ChevronDown, FileText, AlertTriangle, X, CheckCircle
} from 'lucide-react';

interface PurchasesListProps {
  onCreateNew: () => void;
  onViewDetail: (id: string) => void;
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

const PurchasesList: React.FC<PurchasesListProps> = ({ onCreateNew, onViewDetail }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  
  // Bulk Selection & Printing states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedPrintType, setSelectedPrintType] = useState<'ALL' | 'VPP' | 'VE_SINH'>('ALL');
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);

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
          case 'APPROVED': badge = <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 font-black text-[9px] uppercase border border-indigo-200">Chờ Mua Sắm</span>; break;
          case 'ORDERED': badge = <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 font-black text-[9px] uppercase border border-blue-200">Chờ Giao Hàng</span>; break;
          case 'DELIVERING': badge = <span className="px-2 py-1 rounded-lg bg-cyan-50 text-cyan-600 font-black text-[9px] uppercase border border-cyan-200">Đang Giao</span>; break;
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

      return matchSearch && matchTab;
  });

  // Summary aggregation logic - Optimized for original request tracking
  const summaryGroups = useMemo(() => {
      const groups = new Map<string, Map<string, any>>();
      const targetData = selectedIds.length > 0 
        ? data.filter(d => selectedIds.includes(d.id))
        : filteredData;

      targetData.forEach(po => {
          if (['CANCELLED', 'REJECTED', 'COMPLETED'].includes(po.status)) return;
          
          po.lines?.forEach((line: any) => {
              if (!line.item) return;
              
              const isReplaced = !!line.requestLine?.replacementItemId;
              const effectiveItem = isReplaced ? line.requestLine.replacementItem : line.item;
              if (!effectiveItem) return;

              const mvpp = effectiveItem.mvpp || '';
              let type = effectiveItem.itemType || effectiveItem.category || 'UNKNOWN';
              const upperType = type.toString().toUpperCase();
              if (upperType.includes('VPP') || upperType.includes('VĂN PHÒNG PHẨM')) type = 'VPP';
              else if (upperType.includes('VS') || upperType.includes('VỆ SINH')) type = 'VE_SINH';
              
              if (type === 'UNKNOWN') {
                  if (mvpp.startsWith('VPP')) type = 'VPP';
                  else if (mvpp.startsWith('VS')) type = 'VE_SINH';
              }

              if (!groups.has(type)) groups.set(type, new Map());
              const typeMap = groups.get(type)!;
              
              const key = effectiveItem.mvpp;
              const effectiveQty = isReplaced ? (line.requestLine.replacementQty || line.qtyRequested) : line.qtyRequested;
              const effectivePrice = isReplaced ? (line.requestLine.replacementPrice || line.unitPrice) : line.unitPrice;
              const effectiveItemName = effectiveItem.name || line.item.name;

              // For Totals comparison
              const originalQty = line.qtyRequested || 0;
              const originalPrice = line.unitPrice || line.item?.price || 0;

              const current = typeMap.get(key) || {
                  mvpp: effectiveItem.mvpp,
                  name: effectiveItemName,
                  unit: effectiveItem.unit || line.item.unit,
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
              const allocationQty = isReplaced ? (originalRequestLine?.qtyRequested || line.qtyRequested) : line.qtyRequested;

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
              current.originalTotal += (originalQty * originalPrice);
              current.actualTotal += (effectiveQty * effectivePrice);
              current.deptBreakdown.set(allocationKey, existingDept);

              if (isReplaced) {
                const repKey = `${line.item.mvpp}-${line.requestLine.replacementReason}`;
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
              .map(item => ({
                  ...item,
                  deptEntries: Array.from(item.deptBreakdown.values())
                    .map((d: any) => ({ 
                      dept: d.dept, 
                      qty: d.qty, 
                      note: d.notes.filter(Boolean).join('; '), 
                      requestCode: d.requestCode,
                      unit: d.unit
                    }))
                    .sort((a: any, b: any) => b.qty - a.qty)
              })));
          
          const groupApprovedTotal = items.reduce((s, i) => s + i.originalTotal, 0);
          const groupActualTotal = items.reduce((s, i) => s + i.actualTotal, 0);

          return {
              type,
              label: (type.toUpperCase() === 'VPP') ? 'VĂN PHÒNG PHẨM' : 
                     (type.toUpperCase() === 'VE_SINH') ? 'VỆ SINH' : 'HÀNG HÓA KHÁC',
              items,
              approvedTotal: groupApprovedTotal,
              actualTotal: groupActualTotal,
              savings: groupApprovedTotal - groupActualTotal,
              poCount: new Set(targetData.map(d => d.id)).size
          };
      }).filter(g => g.items.length > 0);
  }, [data, filteredData, selectedIds]);

  const printStats = useMemo(() => {
    const vppCount = summaryGroups.find(g => g.type === 'VPP')?.items.length || 0;
    const vsCount = summaryGroups.find(g => g.type === 'VE_SINH')?.items.length || 0;
    const otherCount = summaryGroups.find(g => !['VPP', 'VE_SINH'].includes(g.type))?.items.length || 0;
    return { vppCount, vsCount, otherCount, total: vppCount + vsCount + otherCount };
  }, [summaryGroups]);

  const handlePrintSummary = (type: 'ALL' | 'VPP' | 'VE_SINH' = 'ALL') => {
      setSelectedPrintType(type);
      setShowPrintMenu(false);
      setShowPrintConfirm(false);
      setTimeout(() => {
          window.print();
      }, 200);
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
        <div className="flex-1 overflow-hidden flex flex-col px-4 md:px-6 pb-6 no-print">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                
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
                        <div className="relative flex-1 md:w-72">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                              type="text" placeholder="Tìm theo mã, NCC, vật tư, phòng ban, kho..." 
                              value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition shadow-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                           {/* DROPDOWN PRINT BUTTON */}
                           <div className="relative">
                              <button 
                                onClick={() => setShowPrintMenu(!showPrintMenu)}
                                className={`flex items-center px-4 py-2.5 rounded-xl border transition-all font-black text-[10px] uppercase shadow-sm ${showPrintMenu ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/30' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                              >
                                 <Printer className={`w-4 h-4 mr-2 ${showPrintMenu ? 'text-white' : 'text-indigo-500'}`}/> In phiếu mua sắm <ChevronDown className={`w-3.5 h-3.5 ml-2 transition-transform ${showPrintMenu ? 'rotate-180' : ''}`}/>
                              </button>

                              {showPrintMenu && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setShowPrintMenu(false)}></div>
                                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                     <div className="px-4 pb-2 mb-2 border-b border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tùy chọn in tổng hợp</p>
                                     </div>
                                     <button 
                                       disabled={printStats.vppCount === 0}
                                       onClick={() => handlePrintSummary('VPP')}
                                       className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition ${printStats.vppCount === 0 ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:bg-indigo-50'}`}
                                     >
                                        <div className="flex items-center gap-3">
                                           <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><FileText className="w-3.5 h-3.5"/></div>
                                           <span className="text-xs font-bold text-slate-700">Phiếu tổng hợp Mua sắm VPP</span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{printStats.vppCount}</span>
                                     </button>
                                     
                                     <button 
                                       disabled={printStats.vsCount === 0}
                                       onClick={() => handlePrintSummary('VE_SINH')}
                                       className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition ${printStats.vsCount === 0 ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:bg-cyan-50'}`}
                                     >
                                        <div className="flex items-center gap-3">
                                           <div className="p-1.5 bg-cyan-50 text-cyan-600 rounded-lg"><FileText className="w-3.5 h-3.5"/></div>
                                           <span className="text-xs font-bold text-slate-700">Phiếu tổng hợp Mua sắm Vệ sinh</span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{printStats.vsCount}</span>
                                     </button>

                                     <div className="mx-3 my-2 border-t border-slate-100"></div>

                                     <button 
                                       disabled={printStats.total === 0}
                                       onClick={() => setShowPrintConfirm(true)}
                                       className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition ${printStats.total === 0 ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:bg-violet-50 group'}`}
                                     >
                                        <div className="flex items-center gap-3">
                                           <div className="p-1.5 bg-violet-50 text-violet-600 rounded-lg group-hover:bg-violet-600 group-hover:text-white transition-colors"><Printer className="w-3.5 h-3.5"/></div>
                                           <span className="text-xs font-black text-slate-800">In tất cả (Tách theo kho)</span>
                                        </div>
                                        <span className="text-[10px] font-black text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full">{printStats.total}</span>
                                     </button>

                                     {printStats.otherCount > 0 && (
                                       <div className="px-4 mt-2 py-2 bg-amber-50 rounded-xl mx-3 border border-amber-100 flex items-center gap-2">
                                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0"/>
                                          <p className="text-[9px] font-bold text-amber-700">Có {printStats.otherCount} vật tư chưa phân loại.</p>
                                       </div>
                                     )}
                                  </div>
                                </>
                              )}
                           </div>

                           <button onClick={() => setIsBulkMode(!isBulkMode)} className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 text-[10px] font-black uppercase ${isBulkMode ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500'}`}>
                              <CheckSquare className="w-4 h-4"/> {isBulkMode ? 'Ẩn ô chọn' : 'Chọn nhiều'}
                           </button>
                           <button onClick={onCreateNew} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center shadow-lg shadow-indigo-500/30 whitespace-nowrap active:scale-95 uppercase">
                               <Plus className="w-4 h-4 mr-1.5" /> Tạo Đề Nghị
                           </button>
                        </div>
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
                                return (
                                <tr key={d.id} onClick={() => onViewDetail(d.id)} 
                                  className={`group hover:bg-indigo-50/30 cursor-pointer transition-all border-b border-slate-50 last:border-0 ${d.pendingReplacement ? 'bg-rose-50/20' : ''} ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                                    
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
                                                 <p className="text-[8px] font-bold text-slate-400 line-through">Duyệt: {Number(d.originalTotal).toLocaleString('vi-VN')} đ</p>
                                                 <p className={`text-[8px] font-black uppercase tracking-widest ${d.savings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {d.savings >= 0 ? `Lãi ${d.savings.toLocaleString('vi-VN')}đ` : `Tăng ${(Math.abs(d.savings)).toLocaleString('vi-VN')}đ`}
                                                 </p>
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
        </div>

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
              .print-table th, .print-table td { 
                border: 0.7px solid #000 !important; 
                padding: 2px 4px !important; 
                vertical-align: middle; 
                background: #fff !important;
                color: #000 !important;
                word-wrap: break-word;
              }
              
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
              
              .footer-sign { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; text-align: center; font-size: 9pt; }
              .sign-box { height: 80px; }
            }
          `}} />
          
          {summaryGroups
            .filter(g => selectedPrintType === 'ALL' || g.type === selectedPrintType)
            .map((group) => (
            <div key={group.type} className="print-sheet p-4">
                {/* HEADER SECTION */}
                <div className="flex justify-between items-start w-full border-b pb-4 mb-4">
                    <div className="w-[35%] text-left header-text">
                        <p className="font-bold uppercase">CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO</p>
                        <p className="font-bold italic">Báo cáo tổng hợp đơn mua sắm</p>
                        <p>Ban Hành chính - Quản trị</p>
                    </div>
                    <div className="w-[15%] flex flex-col items-center">
                         <img src={`https://api.qrserver.com/v1/create-qr-code/?size=65x65&data=${encodeURIComponent('PURCHASING-SUMMARY-' + group.type + '-' + new Date().getTime())}`} alt="QR" className="w-12 h-12 border border-slate-100" />
                     </div>
                    <div className="w-[50%] text-center header-text">
                        <p className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                        <p className="font-bold underline underline-offset-[4px] mt-1">Độc lập - Tự do - Hạnh phúc</p>
                        <p className="mt-3 italic text-right mr-10">Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
                    </div>
                </div>

                {/* TITLE */}
                <h2 className="title-main">PHIẾU TỔNG HỢP MUA SẮM</h2>
                <p className="title-sub">(Tổng hợp từ {group.poCount} phiếu mua sắm / đề nghị đang lọc)</p>

                {/* OVERVIEW INFO BLOCK */}
                <div className="info-grid">
                   <div className="info-item"><span className="info-label">Mã tổng hợp:</span> <span>THMS-{new Date().toISOString().slice(0,10).replace(/-/g,'')}-{group.type}</span></div>
                   <div className="info-item"><span className="info-label">Người lập:</span> <span>Quản lý Hành chính</span></div>
                   <div className="info-item"><span className="info-label">Kho áp dụng:</span> <span>{group.label}</span></div>
                   <div className="info-item"><span className="info-label">Ngày in:</span> <span>{new Date().toLocaleDateString('vi-VN')}</span></div>
                   <div className="info-item"><span className="info-label">Tổng số phiếu:</span> <span>{group.poCount} phiếu</span></div>
                   <div className="info-item"><span className="info-label">Số mặt hàng:</span> <span>{group.items.length} mặt hàng</span></div>
                </div>

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
                                <tr className="item-main-row">
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
                         <div className="total-label uppercase">TỔNG GIÁ TRỊ THEO ĐỀ XUẤT ĐÃ DUYỆT:</div>
                         <div className="total-value text-right">{Number(group.approvedTotal).toLocaleString('vi-VN')} đ</div>
                      </div>
                      <div className="total-row text-[9pt]">
                         <div className="total-label uppercase">TỔNG GIÁ TRỊ THEO PHƯƠNG ÁN MUA THỰC TẾ:</div>
                         <div className="total-value text-right text-indigo-700">{Number(group.actualTotal).toLocaleString('vi-VN')} đ</div>
                      </div>
                      <div className="total-row text-[10pt] font-black border-t border-slate-200 mt-1 pt-1">
                         <div className="total-label uppercase tracking-tight">{group.savings >= 0 ? 'CHÊNH LỆCH TIẾT KIỆM (LÃI):' : 'CHÊNH LỆCH CHI PHÍ TĂNG:'}</div>
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
                      <p className="italic text-[8pt]">(Ký, ghi rõ họ tên)</p>
                      <div className="sign-box"></div>
                      <p className="font-bold">..........................</p>
                   </div>
                   <div>
                      <p className="font-bold uppercase">Trưởng BP HCQT</p>
                      <p className="italic text-[8pt]">(Ký, ghi rõ họ tên)</p>
                      <div className="sign-box"></div>
                      <p className="font-bold">..........................</p>
                   </div>
                   <div>
                      <p className="font-bold uppercase">Kế toán / Tài chính</p>
                      <p className="italic text-[8pt]">(Ký, ghi rõ họ tên)</p>
                      <div className="sign-box"></div>
                      <p className="font-bold">..........................</p>
                   </div>
                   <div>
                      <p className="font-bold uppercase">TGĐ Phê duyệt</p>
                      <p className="italic text-[8pt]">(Ký, đóng dấu)</p>
                      <div className="sign-box"></div>
                      <p className="font-bold">..........................</p>
                   </div>
                </div>
            </div>
          ))}
        </div>
    </div>
  );
};

export default PurchasesList;
