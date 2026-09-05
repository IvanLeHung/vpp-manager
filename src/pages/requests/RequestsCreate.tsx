import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Minus,
  Save,
  Send,
  Search,
  Trash2,
  AlertTriangle,
  AlertCircle,
  PackageOpen,
  ShoppingCart,
  X,
} from 'lucide-react';
import api from '../../lib/api';
import { useAppContext } from '../../context/AppContext';
import type { VPPRequest, VPPItem } from '../../context/AppContext';
import type { RequestSupplyType, ViewMode } from '../Requests';
import MonthlyApprovalHistoryTooltip from '../../components/MonthlyApprovalHistoryTooltip';

interface Props {
  setViewMode: (mode: ViewMode) => void;
  refreshData: () => Promise<void>;
  showToast: (m: string, t?: 'success' | 'error' | 'warning') => void;
  activeRequest: VPPRequest | null;
  initialSupplyType: RequestSupplyType;
}

type TargetItem = {
  itemId: string;
  item: VPPItem;
  quantity: number;
  note: string;
};

type ValidationErrors = {
  purpose?: string;
  items?: string;
  neededByDate?: string;
};

function buildPeriodicPurpose(supplyType: RequestSupplyType, department?: string) {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
  const groupName = supplyType === 'VE_SINH' ? 'đồ vệ sinh' : 'Văn phòng phẩm';
  const departmentName = department?.trim() || 'Đơn vị chưa xác định';
  return `Đề xuất ${groupName} cho ${departmentName} tháng ${nextMonth.getMonth() + 1}/${nextMonth.getFullYear()}`;
}

function getItemSupplyType(item?: Partial<VPPItem> | null): RequestSupplyType {
  const itemType = String(item?.itemType || '').trim().toUpperCase();
  const itemCode = String(item?.mvpp || '').trim().toUpperCase();
  const category = String(item?.category || '').trim().toUpperCase();
  const isJanitorial = itemType === 'VE_SINH'
    || itemType === 'VS'
    || /^VS[-_\s]?\d/.test(itemCode)
    || category === 'VE_SINH'
    || category === 'VỆ SINH';
  return isJanitorial ? 'VE_SINH' : 'VPP';
}

function getWarehouseStock(item: VPPItem, supplyType: RequestSupplyType) {
  const warehouseCode = supplyType === 'VE_SINH' ? 'VE_SINH' : 'MAIN';
  const warehouseStock = item.stocks?.find(
    (stock) => String(stock.warehouseCode).toUpperCase() === warehouseCode
  );
  if (Array.isArray(item.stocks)) {
    return Number(warehouseStock?.quantityOnHand ?? 0);
  }
  return Number(item.stock ?? 0);
}

function buildFallbackItem(line: any): VPPItem {
  return {
    id: line.itemId,
    name: line.item?.name ?? 'Vật tư không xác định',
    mvpp: line.item?.mvpp ?? 'N/A',
    unit: line.item?.unit ?? 'cái',
    stock: Number(line.item?.stock ?? line.availableQtyAtRequest ?? 0),
    price: Number(line.item?.price ?? line.unitPrice ?? 0),
    quota: Number(line.item?.quota ?? line.quotaRemainingAtRequest ?? 0),
    itemType: line.item?.itemType,
  } as VPPItem;
}

function normalizeHydratedItem(raw: any, line: any): VPPItem {
  return {
    ...raw,
    id: raw?.id ?? line.itemId,
    name: raw?.name ?? line.item?.name ?? 'Vật tư không xác định',
    mvpp: raw?.mvpp ?? line.item?.mvpp ?? 'N/A',
    unit: raw?.unit ?? line.item?.unit ?? 'cái',
    stock: Number(
      raw?.stock ??
        raw?.stocks?.[0]?.quantityOnHand ??
        line.availableQtyAtRequest ??
        0
    ),
    price: Number(raw?.price ?? line.unitPrice ?? 0),
    quota: Number(raw?.quota ?? line.quotaRemainingAtRequest ?? 0),
    itemType: raw?.itemType ?? line.item?.itemType,
  } as VPPItem;
}

export default function RequestsCreate({
  setViewMode,
  refreshData,
  showToast,
  activeRequest,
  initialSupplyType,
}: Props) {
  const { items, currentUser } = useAppContext();

  const [supplyType, setSupplyType] = useState<RequestSupplyType>(initialSupplyType);
  const [reqType, setReqType] = useState('Định kỳ');
  const [priority, setPriority] = useState('Thường');
  const [purpose, setPurpose] = useState('');
  const [neededByDate, setNeededByDate] = useState('');
  const [targetItems, setTargetItems] = useState<TargetItem[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK'>('ALL');
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [hasUserChanges, setHasUserChanges] = useState(false);
  const directDepartmentName = currentUser?.department
    || currentUser?.departmentName
    || currentUser?.departmentInfo?.name
    || '';
  const [requesterDepartment, setRequesterDepartment] = useState(directDepartmentName);
  const hydratedRef = useRef(false);
  const previousRequestTypeRef = useRef(reqType);

  const isEditingDraft =
    !!activeRequest &&
    (activeRequest.status === 'DRAFT' || activeRequest.status === 'RETURNED' || activeRequest.status === 'NEED_REVISION');

  useEffect(() => {
    if (directDepartmentName) {
      setRequesterDepartment(directDepartmentName);
      return;
    }

    if (!currentUser?.departmentId) return;
    let cancelled = false;
    api.get('/departments')
      .then((response) => {
        const departments = response.data?.data || response.data || [];
        const department = departments.find((entry: any) => entry.id === currentUser.departmentId);
        if (!cancelled && department?.name) setRequesterDepartment(department.name);
      })
      .catch((error) => console.error('Failed to resolve requester department', error));

    return () => {
      cancelled = true;
    };
  }, [currentUser?.departmentId, directDepartmentName]);

  useEffect(() => {
    let cancelled = false;

    const hydrateDraft = async () => {
      if (!activeRequest || !isEditingDraft) {
        if (hydratedRef.current) return;
        setSupplyType(initialSupplyType);
        setReqType('Định kỳ');
        setPriority('Thường');
        setPurpose('');
        setNeededByDate('');
        setTargetItems([]);
        hydratedRef.current = true;
        return;
      }

      let sourceRequest = activeRequest;
      // Fetch fresh detail to ensure all line items have full details
      try {
        const res = await api.get(`/requests/${activeRequest.id}`);
        sourceRequest = res.data?.data || res.data || activeRequest;
      } catch (e) {
        console.error('Failed to fetch request detail for hydration', e);
      }

      setReqType(sourceRequest.requestType || 'Định kỳ');
      const sourceSupplyType: RequestSupplyType = sourceRequest.warehouseCode === 'VE_SINH'
        || sourceRequest.lines?.some((line: any) => getItemSupplyType(line.item) === 'VE_SINH')
        ? 'VE_SINH'
        : 'VPP';
      setSupplyType(sourceSupplyType);
      setPriority(sourceRequest.priority || 'Thường');
      setPurpose(sourceRequest.purpose || '');
      setNeededByDate(
        sourceRequest.neededByDate
          ? new Date(sourceRequest.neededByDate).toISOString().split('T')[0]
          : ''
      );

      const prefilled: TargetItem[] = await Promise.all(
        (sourceRequest.lines || []).map(async (line: any) => {
          const fromContext = items.find((i: VPPItem) => i.id === line.itemId);
          if (fromContext) {
            return {
              itemId: line.itemId,
              item: {
                ...fromContext,
                stock: getWarehouseStock(fromContext, sourceSupplyType),
              },
              quantity: Number(line.qtyRequested || 1),
              note: line.note || '',
            };
          }

          if (line.item) {
            const hydratedItem = normalizeHydratedItem(line.item, line);
            return {
              itemId: line.itemId,
              item: {
                ...hydratedItem,
                stock: getWarehouseStock(hydratedItem, sourceSupplyType),
              },
              quantity: Number(line.qtyRequested || 1),
              note: line.note || '',
            };
          }

          try {
            const res = await api.get(`/items/${line.itemId}`);
            const data = res.data?.data || res.data;
            const hydratedItem = normalizeHydratedItem(data, line);
            return {
              itemId: line.itemId,
              item: {
                ...hydratedItem,
                stock: getWarehouseStock(hydratedItem, sourceSupplyType),
              },
              quantity: Number(line.qtyRequested || 1),
              note: line.note || '',
            };
          } catch {
            return {
              itemId: line.itemId,
              item: buildFallbackItem(line),
              quantity: Number(line.qtyRequested || 1),
              note: line.note || '',
            };
          }
        })
      );

      if (!cancelled) {
        setTargetItems(prefilled);
        hydratedRef.current = true;
      }
    };

    hydrateDraft();

    return () => {
      cancelled = true;
    };
  }, [activeRequest, initialSupplyType, isEditingDraft, items]);

  useEffect(() => {
    if (!hydratedRef.current || isEditingDraft) return;
    const previousRequestType = previousRequestTypeRef.current;
    previousRequestTypeRef.current = reqType;

    if (reqType === 'Định kỳ') {
      setPurpose(buildPeriodicPurpose(supplyType, requesterDepartment));
      return;
    }

    if (reqType === 'Bổ sung đột xuất') {
      setPurpose('');
      return;
    }

    if (previousRequestType !== reqType) setPurpose('');
  }, [reqType, supplyType, requesterDepartment, isEditingDraft]);

  const searchResults = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return items
      .filter((i: VPPItem) => {
        // Only show active items
        if (i.isActive === false) return false;
        const itemSupplyType = getItemSupplyType(i);
        if (itemSupplyType !== supplyType) return false;

        if (stockFilter === 'IN_STOCK' && getWarehouseStock(i, supplyType) <= 0) return false;

        return !keyword || (
          i.name.toLowerCase().includes(keyword) ||
          i.mvpp.toLowerCase().includes(keyword)
        );
      })
      .map((item: VPPItem) => ({
        ...item,
        stock: getWarehouseStock(item, supplyType),
      }))
      .sort((a: VPPItem, b: VPPItem) => a.name.localeCompare(b.name, 'vi'));
  }, [items, searchTerm, supplyType, stockFilter]);

  const handleSupplyTypeChange = (nextType: RequestSupplyType) => {
    if (nextType === supplyType) return;
    if (targetItems.length > 0) {
      const confirmed = window.confirm('Đổi nhóm đề xuất sẽ xóa toàn bộ vật tư đang chọn. Bạn có muốn tiếp tục?');
      if (!confirmed) return;
      setTargetItems([]);
    }
    setSupplyType(nextType);
    setSearchTerm('');
    setHasUserChanges(true);
    setValidationErrors((prev) => ({ ...prev, items: undefined }));
  };

  const handleAddItem = (item: VPPItem) => {
    if (Number(item.stock || 0) === 0) {
      showToast(
        'Mặt hàng này hiện đang hết tồn kho. Nếu đưa vào phiếu, hệ thống sẽ đẩy thành Yêu Cầu Chờ Mua Hàng.',
        'warning'
      );
    }

    setTargetItems((prev) => {
      const existing = prev.find((t) => t.itemId === item.id);
      if (existing) {
        return prev.map((t) =>
          t.itemId === item.id ? { ...t, quantity: t.quantity + 1 } : t
        );
      }

      return [
        ...prev,
        {
          itemId: item.id,
          item,
          quantity: 1,
          note: '',
        },
      ];
    });
    setHighlightedItemId(item.id);
    setHasUserChanges(true);
    setValidationErrors((prev) => ({ ...prev, items: undefined }));
    window.setTimeout(() => setHighlightedItemId((current) => current === item.id ? null : current), 900);
  };

  const handleRemoveItem = (itemId: string) => {
    setTargetItems((prev) => prev.filter((t) => t.itemId !== itemId));
    setHasUserChanges(true);
  };

  const handleQuantityChange = (itemId: string, value: string) => {
    const normalized = Number(value.replace(/\D/g, '')) || 0;
    setTargetItems((prev) =>
      prev.map((t) =>
        t.itemId === itemId ? { ...t, quantity: normalized } : t
      )
    );
    setHasUserChanges(true);
  };

  const adjustQuantity = (itemId: string, amount: number) => {
    setTargetItems((prev) => prev.map((t) =>
      t.itemId === itemId ? { ...t, quantity: Math.max(1, Number(t.quantity || 0) + amount) } : t
    ));
    setHasUserChanges(true);
  };

  const handleNoteChange = (itemId: string, value: string) => {
    setTargetItems((prev) =>
      prev.map((t) => (t.itemId === itemId ? { ...t, note: value } : t))
    );
    setHasUserChanges(true);
  };

  const validateBeforeSubmit = (status: 'DRAFT' | 'PENDING'): string | null => {
    const nextErrors: ValidationErrors = {};
    if (status === 'PENDING' && targetItems.length === 0) {
      const message = supplyType === 'VE_SINH'
        ? 'Chưa có mặt hàng Đồ vệ sinh nào trong danh sách'
        : 'Chưa có mặt hàng Văn phòng phẩm nào trong danh sách';
      nextErrors.items = message;
      setValidationErrors(nextErrors);
      return message;
    }

    if (status === 'PENDING' && reqType !== 'Bổ sung đột xuất' && !purpose.trim()) {
      nextErrors.purpose = 'Vui lòng nhập mục đích hoặc lý do sử dụng.';
      setValidationErrors(nextErrors);
      return nextErrors.purpose;
    }

    if (status === 'PENDING' && !neededByDate) {
      nextErrors.neededByDate = 'Vui lòng chọn ngày cần cấp.';
      setValidationErrors(nextErrors);
      return nextErrors.neededByDate;
    }

    for (let i = 0; i < targetItems.length; i++) {
      const row = targetItems[i];
      const itemId = row.itemId || row.item?.id;

      if (!itemId) {
        return `Dòng ${i + 1} thiếu itemId`;
      }

      if (!row.quantity || Number(row.quantity) < 1) {
        return `Dòng ${i + 1} có số lượng không hợp lệ`;
      }
    }

    setValidationErrors({});
    return null;
  };

  const submitForm = async (status: 'DRAFT' | 'PENDING') => {
    const validationError = validateBeforeSubmit(status);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        requestType: reqType,
        priority,
        purpose,
        warehouseCode: supplyType === 'VE_SINH' ? 'VE_SINH' : 'MAIN',
        neededByDate: neededByDate
          ? new Date(neededByDate).toISOString()
          : undefined,
        lines: targetItems.map((t, index) => {
          const itemId = t.itemId || t.item?.id;
          const qtyRequested = Number(t.quantity);

          if (!itemId) {
            throw new Error(`Dòng ${index + 1} thiếu itemId`);
          }

          if (!qtyRequested || qtyRequested < 1) {
            throw new Error(`Dòng ${index + 1} có số lượng không hợp lệ`);
          }

          return {
            itemId,
            qtyRequested,
            note: t.note || '',
          };
        }),
      };

      console.log('REQUEST CREATE/PATCH payload:', JSON.stringify(payload, null, 2));

      if (isEditingDraft && activeRequest) {
        await api.patch(`/requests/${activeRequest.id}`, payload);

        if (status === 'PENDING') {
          await api.post(`/requests/${activeRequest.id}/submit`);
        }
      } else {
        const res = await api.post('/requests', payload);
        const newRequestId = res.data?.id || res.data?.data?.id;

        if (status === 'PENDING' && newRequestId) {
          await api.post(`/requests/${newRequestId}/submit`);
        }
      }

      showToast(
        status === 'PENDING' ? 'Đã gửi trình duyệt thành công!' : 'Đã lưu nháp!',
        'success'
      );

      await refreshData();
      setViewMode('LIST');
    } catch (e: any) {
      showToast(
        e.response?.data?.error || e.message || 'Lỗi khi lưu phiếu',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = useMemo(() => {
    return targetItems.reduce(
      (acc: number, curr) =>
        acc + Number(curr.item.price || 0) * Number(curr.quantity || 0),
      0
    );
  }, [targetItems]);

  const warningsCount = useMemo(() => {
    return targetItems.filter(
      (t) => Number(t.quantity) > Number(t.item.quota || 0)
    ).length;
  }, [targetItems]);

  const handleCancel = () => {
    if (hasUserChanges && !window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy?')) return;
    setViewMode('LIST');
  };

  const catalog = (
    <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="font-extrabold text-slate-800">Danh mục vật tư</h4>
            <p className="text-xs text-slate-500">{searchResults.length} vật tư phù hợp</p>
          </div>
          <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">{searchResults.length}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm mã hoặc tên vật tư..." className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setStockFilter('ALL')} className={`rounded-lg px-4 py-2 text-xs font-bold transition ${stockFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Tất cả</button>
          <button type="button" onClick={() => setStockFilter('IN_STOCK')} className={`rounded-lg px-4 py-2 text-xs font-bold transition ${stockFilter === 'IN_STOCK' ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Còn hàng</button>
        </div>
      </div>
      <div className="max-h-[490px] min-h-[300px] flex-1 divide-y divide-slate-100 overflow-y-auto">
        {searchResults.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Không tìm thấy vật tư phù hợp.</div> : searchResults.map((item: VPPItem) => (
          <div key={item.id} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
              <p className="mt-1 text-xs text-slate-500"><span className="font-semibold">{item.mvpp}</span> · {item.unit}</p>
            </div>
            <button type="button" onClick={() => handleAddItem(item)} aria-label={`Thêm ${item.name} vào phiếu`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50"><Plus className="h-5 w-5" /></button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-[#F4F6FA] pb-28 text-[#17233D]">
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-6 md:px-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-medium text-indigo-600">Phiếu đề xuất <span className="px-1 text-slate-400">/</span> {isEditingDraft ? 'Cập nhật' : 'Tạo mới'}</p>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-[28px]">{isEditingDraft ? 'Cập nhật phiếu đề xuất' : 'Lập phiếu đề xuất'}</h1>
            <p className="mt-1 text-sm text-slate-500">Bổ sung thông tin và chọn vật tư cần cấp</p>
          </div>
          <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">● Bản nháp</span>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-6">
          <h2 className="mb-5 flex items-center gap-3 text-lg font-extrabold"><span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-600 text-sm text-white">1</span>Thông tin chung</h2>
          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Nhóm hàng <span className="text-rose-500">*</span></legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:max-w-[980px]">
              {([['VPP', 'Văn phòng phẩm', 'Chỉ hiện danh mục VPP'], ['VE_SINH', 'Đồ vệ sinh', 'Chỉ hiện danh mục vệ sinh']] as const).map(([value, title, subtitle]) => {
                const selected = supplyType === value;
                return <button key={value} type="button" onClick={() => handleSupplyTypeChange(value)} className={`flex min-h-16 items-center gap-3 rounded-xl border-2 px-4 text-left transition ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
                  <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${selected ? 'border-indigo-600' : 'border-slate-300'}`}>{selected && <span className="h-2 w-2 rounded-full bg-indigo-600" />}</span>
                  <span><strong className="block text-sm text-slate-800">{title}</strong><small className="text-slate-500">{subtitle}</small></span>
                </button>;
              })}
            </div>
          </fieldset>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Mã phiếu
              <input value={activeRequest?.id || 'Tự động tạo'} disabled className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-400" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Loại hình xin cấp
              <select value={reqType} onChange={(e) => { setReqType(e.target.value); setHasUserChanges(true); }} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold normal-case text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option>Định kỳ</option><option>Bổ sung đột xuất</option><option>Dự án mới</option><option>Văn phòng mới</option>
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Mức độ ưu tiên
              <select value={priority} onChange={(e) => { setPriority(e.target.value); setHasUserChanges(true); }} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold normal-case text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option value="Thường">Thường · Xử lý trong 24 giờ</option><option value="Cao">Cao · Xử lý trong 8 giờ</option><option value="Khẩn cấp">Khẩn cấp · ASAP</option>
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Ngày cần cấp <span className="text-rose-500">*</span>
              <input type="date" value={neededByDate} onChange={(e) => { setNeededByDate(e.target.value); setHasUserChanges(true); setValidationErrors((prev) => ({ ...prev, neededByDate: undefined })); }} className={`mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm font-bold normal-case text-slate-700 outline-none focus:ring-2 ${validationErrors.neededByDate ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'}`} />
              {validationErrors.neededByDate && <span className="mt-1 block text-xs font-semibold normal-case text-rose-600">{validationErrors.neededByDate}</span>}
            </label>
          </div>

          <label className="mt-5 block text-xs font-bold uppercase tracking-wide text-slate-600">Mục đích / Lý do sử dụng {reqType !== 'Bổ sung đột xuất' && <span className="text-rose-500">*</span>}
            <textarea value={purpose} onChange={(e) => { setPurpose(e.target.value); setHasUserChanges(true); setValidationErrors((prev) => ({ ...prev, purpose: undefined })); }} placeholder={reqType === 'Bổ sung đột xuất' ? 'Không bắt buộc nhập nội dung' : 'Nhập mục đích hoặc lý do sử dụng...'} className={`mt-2 min-h-24 w-full resize-y rounded-lg border bg-white p-3 text-sm font-medium normal-case text-slate-800 outline-none focus:ring-2 ${validationErrors.purpose ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'}`} />
          </label>
          {validationErrors.purpose && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600"><AlertCircle className="h-4 w-4" />{validationErrors.purpose}</p>}
          {reqType === 'Định kỳ' && <p className="mt-2 text-xs text-indigo-600">Nội dung được tự động xác định theo nhóm hàng, phòng ban và tháng kế tiếp. Bạn vẫn có thể chỉnh sửa.</p>}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-3 text-lg font-extrabold"><span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-600 text-sm text-white">2</span>Chọn vật tư đề xuất</h2>
              <p className="mt-1 pl-10 text-xs text-slate-500">Chọn vật tư bên trái, kiểm tra số lượng và ghi chú bên phải.</p>
            </div>
            <button type="button" onClick={() => setMobileCatalogOpen(true)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white lg:hidden"><Plus className="h-4 w-4" />Thêm vật tư</button>
          </div>
          {validationErrors.items && <p className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-600"><AlertCircle className="h-4 w-4" />{validationErrors.items}</p>}

          <div className="grid gap-4 lg:grid-cols-[minmax(300px,38fr)_minmax(0,62fr)]">
            <div className="hidden lg:block">{catalog}</div>
            <div className="min-w-0 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <div><h3 className="font-extrabold text-slate-800">Vật tư đã chọn</h3><p className="text-xs text-slate-500">Kiểm tra số lượng và bổ sung ghi chú trước khi gửi.</p></div>
                <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">{targetItems.length} mặt hàng</span>
              </div>

              {targetItems.length === 0 ? <div className="grid min-h-[300px] place-items-center p-8 text-center"><div><PackageOpen className="mx-auto h-11 w-11 text-slate-300" /><p className="mt-3 font-bold text-slate-600">Chưa chọn vật tư</p><p className="mt-1 text-sm text-slate-500">Chọn vật tư từ danh mục bên trái để thêm vào phiếu.</p></div></div> : <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[720px] text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-3">Vật tư</th><th className="p-3 text-center">Định mức</th><th className="p-3 text-center">SL đề xuất</th><th className="p-3 text-right">Thành tiền</th><th className="w-12 p-3" /></tr></thead>
                    <tbody className="divide-y divide-slate-100">{targetItems.map((t) => {
                      const isOverQuota = Number(t.quantity) > Number(t.item.quota || 0);
                      return <tr key={t.itemId} className={`transition-colors ${highlightedItemId === t.itemId ? 'bg-indigo-50' : ''}`}>
                        <td className="p-3"><p className="max-w-[260px] font-bold text-slate-800">{t.item.name}</p><p className="text-xs text-slate-500">{t.item.mvpp} · {t.item.unit}</p></td>
                        <td className="p-3 text-center text-sm font-semibold text-indigo-600">{t.item.quota}</td>
                        <td className="p-3"><MonthlyApprovalHistoryTooltip itemId={t.itemId} itemName={t.item.name} department={requesterDepartment} departmentId={currentUser?.departmentId} requestId={activeRequest?.id}><div className="mx-auto flex w-32 items-center rounded-lg border border-slate-200"><button type="button" aria-label={`Giảm số lượng ${t.item.name}`} onClick={() => adjustQuantity(t.itemId, -1)} className="grid h-10 w-9 place-items-center text-slate-500 hover:bg-slate-50"><Minus className="h-4 w-4" /></button><input type="number" min="1" value={t.quantity || ''} onChange={(e) => handleQuantityChange(t.itemId, e.target.value)} aria-label={`Số lượng đề xuất ${t.item.name}`} className={`h-10 min-w-0 flex-1 border-x border-slate-200 text-center font-black outline-none ${isOverQuota ? 'text-rose-600' : 'text-indigo-700'}`} /><button type="button" aria-label={`Tăng số lượng ${t.item.name}`} onClick={() => adjustQuantity(t.itemId, 1)} className="grid h-10 w-9 place-items-center text-slate-500 hover:bg-slate-50"><Plus className="h-4 w-4" /></button></div></MonthlyApprovalHistoryTooltip>{isOverQuota && <p className="mt-1 text-center text-[11px] font-semibold text-amber-600">Vượt định mức</p>}</td>
                        <td className="p-3 text-right text-sm font-black text-slate-800">{(Number(t.item.price || 0) * Number(t.quantity || 0)).toLocaleString('vi-VN')} đ</td>
                        <td className="p-3"><button type="button" aria-label={`Xóa ${t.item.name}`} onClick={() => handleRemoveItem(t.itemId)} className="p-2 text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>;
                    })}</tbody>
                  </table>
                  <div className="space-y-2 border-t border-slate-100 p-3">{targetItems.map((t) => <label key={t.itemId} className="grid grid-cols-[minmax(150px,220px)_1fr] items-center gap-3 text-xs font-semibold text-slate-600"><span className="truncate">Ghi chú · {t.item.name}</span><input value={t.note} onChange={(e) => handleNoteChange(t.itemId, e.target.value)} placeholder="Thêm ghi chú..." className="h-9 rounded-lg border border-slate-200 px-3 font-medium outline-none focus:border-indigo-500" /></label>)}</div>
                </div>
                <div className="divide-y divide-slate-100 md:hidden">{targetItems.map((t) => <article key={t.itemId} className={`p-4 transition-colors ${highlightedItemId === t.itemId ? 'bg-indigo-50' : ''}`}><div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-slate-800">{t.item.name}</h4><p className="mt-1 text-xs text-slate-500">{t.item.mvpp} · {t.item.unit} · Định mức {t.item.quota}</p></div><button type="button" onClick={() => handleRemoveItem(t.itemId)} className="p-2 text-rose-500"><Trash2 className="h-4 w-4" /></button></div><div className="mt-3 flex items-center justify-between"><div className="flex items-center rounded-lg border border-slate-200"><button type="button" onClick={() => adjustQuantity(t.itemId, -1)} className="p-2"><Minus className="h-4 w-4" /></button><input type="number" min="1" value={t.quantity || ''} onChange={(e) => handleQuantityChange(t.itemId, e.target.value)} className="h-9 w-12 border-x border-slate-200 text-center font-black text-indigo-700 outline-none" /><button type="button" onClick={() => adjustQuantity(t.itemId, 1)} className="p-2"><Plus className="h-4 w-4" /></button></div><strong>{(Number(t.item.price || 0) * Number(t.quantity || 0)).toLocaleString('vi-VN')} đ</strong></div><input value={t.note} onChange={(e) => handleNoteChange(t.itemId, e.target.value)} placeholder="Thêm ghi chú..." className="mt-3 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500" /></article>)}</div>
              </>}
              {warningsCount > 0 && <p className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700"><AlertTriangle className="h-4 w-4" />{warningsCount} mặt hàng đang vượt định mức.</p>}
            </div>
          </div>
        </section>
      </main>

      <div className="request-create-actions fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-6px_20px_rgba(15,23,42,0.08)] backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4"><span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-indigo-700"><ShoppingCart className="h-5 w-5" /></span><div><p className="text-xs font-semibold text-slate-500">{targetItems.length} mặt hàng · Tổng ngân sách tạm tính</p><p className="text-xl font-black text-slate-900">{totalAmount.toLocaleString('vi-VN')} đ</p></div></div>
          <div className="grid grid-cols-3 gap-2 sm:flex"><button type="button" onClick={handleCancel} disabled={isSubmitting} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Hủy</button><button type="button" onClick={() => submitForm('DRAFT')} disabled={isSubmitting} className="flex items-center justify-center gap-2 rounded-lg border border-indigo-400 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"><Save className="h-4 w-4" />Lưu nháp</button><button type="button" onClick={() => submitForm('PENDING')} disabled={isSubmitting} className="flex min-w-36 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"><Send className="h-4 w-4" />{isSubmitting ? 'Đang gửi…' : 'Gửi trình duyệt'}</button></div>
        </div>
      </div>

      {mobileCatalogOpen && <div className="fixed inset-0 z-50 bg-slate-900/40 p-3 lg:hidden"><div className="mx-auto flex h-full max-w-lg flex-col rounded-xl bg-white"><div className="flex items-center justify-between border-b border-slate-200 p-4"><h3 className="font-extrabold">Thêm vật tư</h3><button type="button" onClick={() => setMobileCatalogOpen(false)} className="p-2 text-slate-500"><X className="h-5 w-5" /></button></div><div className="min-h-0 flex-1 p-3">{catalog}</div><div className="border-t border-slate-200 p-3"><button type="button" onClick={() => setMobileCatalogOpen(false)} className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white">Xong · Đã chọn {targetItems.length} mặt hàng</button></div></div></div>}
    </div>
  );
}
