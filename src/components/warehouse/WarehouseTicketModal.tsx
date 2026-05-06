import { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Search, ArrowRight, Loader2, 
  CheckCircle2, Package, 
  MapPin, 
  Zap, Save, FileSpreadsheet,
  Users, Building2, UserCircle, Briefcase, Calendar, Hash, User
} from 'lucide-react';

import api from '../../lib/api';

import * as XLSX from 'xlsx';

type WarehouseTicketModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ticket: any) => void;
  initialType?: string;
  warehouseCode?: string;
};

const WAREHOUSES = [
  { id: 'MAIN', label: 'Kho VPP', color: 'text-indigo-600', icon: Package },
  { id: 'VE_SINH', label: 'Kho Vệ sinh', color: 'text-emerald-600', icon: MapPin },
  { id: 'CCDC', label: 'Kho CCDC', color: 'text-amber-600', icon: Briefcase },
];

const ITEM_GROUPS = [
  { id: 'VPP', label: 'Văn phòng phẩm', warehouse: 'MAIN' },
  { id: 'VE_SINH', label: 'Vật tư vệ sinh', warehouse: 'VE_SINH' },
  { id: 'TAP_HOA', label: 'Tạp hóa', warehouse: 'VE_SINH' },
  { id: 'CCDC', label: 'Công cụ dụng cụ', warehouse: 'CCDC' },
];

const RECEIVER_TYPES = [
  { id: 'PHONG_BAN', label: 'Phòng ban', icon: Building2 },
  { id: 'NHAN_SU', label: 'Nhân sự', icon: UserCircle },
  { id: 'KHU_VUC', label: 'Khu vực', icon: MapPin },
  { id: 'CHI_NHANH', label: 'Chi nhánh', icon: Briefcase },
  { id: 'NHA_THAU', label: 'Nhà thầu', icon: Users },
];

const TRANSACTION_TYPES = [
  { id: 'RECEIVE', label: 'Nhập kho', core: 'RECEIVE' },
  { id: 'ISSUE', label: 'Xuất kho', core: 'ISSUE' },
  { id: 'ADJUSTMENT', label: 'Điều chỉnh', core: 'ADJUSTMENT' },
  { id: 'ALLOCATION', label: 'Cấp phát', core: 'ISSUE' },
  { id: 'RETURN', label: 'Hoàn kho', core: 'RECEIVE' },
];

export default function WarehouseTicketModal({ isOpen, onClose, onSuccess, initialType = 'ISSUE', warehouseCode = 'MAIN' }: WarehouseTicketModalProps) {
  const [step, setStep] = useState<'SELECT' | 'FORM' | 'CONFIRM'>('SELECT');
  
  // Selections
  const [warehouse, setWarehouse] = useState(warehouseCode);
  const [itemGroup, setItemGroup] = useState('VPP');
  const [receiverType, setReceiverType] = useState('PHONG_BAN');
  const [transactionType, setTransactionType] = useState(initialType);
  
  // Fields
  const [reason, setReason] = useState('');
  const [sourceRef, setSourceRef] = useState('');
  const [ticketDate, setTicketDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiverName, setReceiverName] = useState('');
  const [receiverDept, setReceiverDept] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  
  // Metadata fields
  const [metaPeriod, setMetaPeriod] = useState('');
  const [metaQuota, setMetaQuota] = useState('');
  const [metaAssetCode, setMetaAssetCode] = useState('');
  const [metaHandoverDate, setMetaHandoverDate] = useState('');

  // Items
  const [lines, setLines] = useState<any[]>([{ id: Date.now(), itemId: '', qty: 1, unitPrice: 0, uom: '', location: '', note: '', itemData: null, stockData: null }]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [barcodeBuffer, setBarcodeBuffer] = useState('');

  // User list for receiver selection
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('SELECT');
      setWarehouse(warehouseCode);
      const defaultGroup = ITEM_GROUPS.find(g => g.warehouse === warehouseCode)?.id || 'VPP';
      setItemGroup(defaultGroup);
      fetchUsers();
    }
  }, [isOpen, warehouseCode]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users?isActive=true');
      setAllUsers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const addLine = () => {
    setLines([...lines, { id: Date.now(), itemId: '', qty: 1, unitPrice: 0, uom: '', location: '', note: '', itemData: null, stockData: null }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, data: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], ...data };
    setLines(newLines);
  };

  const handleSearch = async (val: string, index: number) => {
    if (!val || val.length < 2) {
      setSearchResults([]);
      setSearching(null);
      return;
    }
    setSearching(index);
    try {
      const res = await api.get(`/inventory/stocks?warehouseCode=${warehouse}&q=${val}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  const selectItem = (index: number, stockItem: any) => {
    updateLine(index, { 
      itemId: stockItem.item.id, 
      itemData: stockItem.item, 
      stockData: stockItem, 
      uom: stockItem.item.unit,
      unitPrice: stockItem.item.price || 0
    });
    setSearchResults([]);
    setSearching(null);
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) return;
        setLoading(true);
        const importedLines = [];
        for (const row of (data as any[])) {
          const q = row.mvpp || row['Mã'] || row['Mã hàng'];
          const qty = Number(row.sl || row.qty || row['Số lượng'] || 1);
          const location = row.vt || row.location || row['Vị trí'] || '';
          const note = row.gc || row.note || row['Ghi chú'] || '';
          if (q) {
            const res = await api.get(`/inventory/stocks?warehouseCode=${warehouse}&q=${q}`);
            if (res.data && res.data.length > 0) {
              const stockItem = res.data[0];
              importedLines.push({
                id: Date.now() + Math.random(),
                itemId: stockItem.item.id,
                itemData: stockItem.item,
                stockData: stockItem,
                qty,
                unitPrice: stockItem.item.price || 0,
                uom: stockItem.item.unit,
                location,
                note
              });
            }
          }
        }
        if (importedLines.length > 0) {
          setLines([...lines.filter(l => l.itemId !== ''), ...importedLines]);
        }
      } catch (err) {
        console.error('Excel import failed', err);
        alert('Không thể đọc file Excel. Vui lòng kiểm tra định dạng.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const data = [{ 'Mã VPP': 'VPP001', 'Số lượng': 10, 'Ghi chú': 'Nhập kho tháng 4', 'Vị trí': 'Kệ A1' }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Import_Kho.xlsx");
  };

  const handleBarcodeScan = async (code: string) => {
    try {
      const res = await api.get(`/inventory/stocks?warehouseCode=${warehouse}&q=${code}`);
      if (res.data && res.data.length > 0) {
        const stockItem = res.data[0];
        const existingIdx = lines.findIndex(l => l.itemId === stockItem.item.id);
        if (existingIdx !== -1) {
          const newLines = [...lines];
          newLines[existingIdx].qty += 1;
          setLines(newLines);
        } else {
          if (lines.length === 1 && lines[0].itemId === '') selectItem(0, stockItem);
          else setLines([...lines, { 
            id: Date.now(), itemId: stockItem.item.id, itemData: stockItem.item, stockData: stockItem, 
            qty: 1, unitPrice: stockItem.item.price || 0, uom: stockItem.item.unit, location: '', note: '' 
          }]);
        }
      }
    } catch (err) {
      console.error('Barcode lookup failed', err);
    }
  };

  useEffect(() => {
    if (!scannerEnabled) return;
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 2) handleBarcodeScan(barcodeBuffer);
        setBarcodeBuffer('');
      } else if (e.key.length === 1) setBarcodeBuffer(prev => prev + e.key);
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [scannerEnabled, barcodeBuffer, lines]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const totalAmount = lines.reduce((sum, l) => sum + (Number(l.qty) * Number(l.unitPrice || 0)), 0);
      const coreType = TRANSACTION_TYPES.find(t => t.id === transactionType)?.core || 'ISSUE';
      
      const payload = {
        ticketType: coreType,
        warehouseCode: warehouse,
        itemGroup,
        receiverType,
        issueType: transactionType,
        reason,
        sourceRef,
        ticketDate,
        receiverName,
        receiverDept,
        receiverAddress,
        metadata: {
          period: metaPeriod,
          quota: metaQuota,
          assetCode: metaAssetCode,
          handoverDate: metaHandoverDate,
        },
        totalAmount,
        lines: lines.map(l => ({
          itemId: l.itemId,
          qty: coreType === 'ISSUE' ? -Math.abs(l.qty) : Math.abs(l.qty),
          unitPrice: l.unitPrice,
          uom: l.uom,
          location: l.location,
          note: l.note
        }))
      };

      const res = await api.post('/warehouse-tickets', payload);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi tạo phiếu');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white rounded-[2.5rem] shadow-2xl w-full ${step === 'FORM' ? 'max-w-6xl' : 'max-w-2xl'} max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300 border border-white/20`}>
        
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-indigo-50`}>
              <Package className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">
                {step === 'SELECT' ? 'Khởi tạo nghiệp vụ' : (step === 'FORM' ? 'Chi tiết phiếu kho' : 'Xác nhận thực thi')}
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-0.5">Hệ thống quản trị Danko VPP v2.0</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {step === 'SELECT' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">1. Chọn Kho xử lý</label>
                <div className="grid grid-cols-3 gap-4">
                  {WAREHOUSES.map(w => (
                    <button key={w.id} onClick={() => { setWarehouse(w.id); setItemGroup(ITEM_GROUPS.find(g => g.warehouse === w.id)?.id || 'VPP'); }}
                      className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all ${warehouse === w.id ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/5' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                      <w.icon className={`w-8 h-8 ${warehouse === w.id ? w.color : 'text-slate-300'}`} />
                      <span className={`font-black text-[11px] uppercase tracking-wider ${warehouse === w.id ? 'text-indigo-900' : 'text-slate-500'}`}>{w.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">2. Nhóm hàng hóa</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ITEM_GROUPS.filter(g => g.warehouse === warehouse).map(g => (
                    <button key={g.id} onClick={() => setItemGroup(g.id)}
                      className={`px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border ${itemGroup === g.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">3. Loại nghiệp vụ</label>
                  <div className="grid grid-cols-2 gap-3">
                    {TRANSACTION_TYPES.map(t => (
                      <button key={t.id} onClick={() => setTransactionType(t.id)}
                        className={`px-4 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border ${transactionType === t.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">4. Đối tượng nhận</label>
                  <div className="grid grid-cols-2 gap-3">
                    {RECEIVER_TYPES.map(r => (
                      <button key={r.id} onClick={() => setReceiverType(r.id)}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${receiverType === r.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                        <r.icon className="w-4 h-4" /> {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'FORM' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Người nhận / Người phụ trách *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={receiverName} 
                      onChange={e => {
                        setReceiverName(e.target.value);
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-700" 
                      placeholder="Tìm nhân sự..." 
                    />
                    
                    {showUserDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[70] max-h-60 overflow-y-auto overflow-x-hidden">
                        {allUsers
                          .filter(u => 
                            u.fullName.toLowerCase().includes(receiverName.toLowerCase()) || 
                            u.username.toLowerCase().includes(receiverName.toLowerCase())
                          )
                          .map(u => (
                            <button 
                              key={u.id} 
                              onClick={() => {
                                setReceiverName(u.fullName);
                                setReceiverDept(u.departmentName || 'Chưa xác định');
                                setShowUserDropdown(false);
                              }}
                              className="w-full flex items-center justify-between p-4 hover:bg-indigo-50 border-b border-slate-50 last:border-0 text-left transition-colors"
                            >
                              <div>
                                <p className="font-black text-slate-800 uppercase tracking-tight">{u.fullName}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                  {u.departmentName || 'N/A'} • @{u.username}
                                </p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-indigo-300" />
                            </button>
                          ))
                        }
                        {allUsers.filter(u => u.fullName.toLowerCase().includes(receiverName.toLowerCase())).length === 0 && (
                          <div className="p-8 text-center">
                            <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Không tìm thấy nhân sự</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bộ phận / Đơn vị *</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={receiverDept} 
                      readOnly
                      className="w-full pl-11 pr-5 py-4 bg-slate-100/50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-500 cursor-not-allowed" 
                      placeholder="Tự động điền..." 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Ngày chứng từ *</label>
                  <input type="date" value={ticketDate} onChange={e => setTicketDate(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-700" />
                </div>
              </div>

              <div className="bg-indigo-50/50 rounded-[2.5rem] p-8 border border-indigo-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {itemGroup === 'VPP' && (
                  <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5"><label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">Mục đích sử dụng</label>
                      <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-700" placeholder="VD: Sử dụng định kỳ tháng..." /></div>
                    <div className="space-y-1.5"><label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">Tham chiếu PR/PO</label>
                      <input type="text" value={sourceRef} onChange={e => setSourceRef(e.target.value)} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-700" placeholder="Mã PR hoặc PO..." /></div>
                  </div>
                )}
                {(itemGroup === 'VE_SINH' || itemGroup === 'TAP_HOA') && (
                  <>
                    <div className="space-y-1.5"><label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Khu vực *</label>
                      <input type="text" value={receiverAddress} onChange={e => setReceiverAddress(e.target.value)} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" placeholder="VD: Tòa A, Sảnh..." /></div>
                    <div className="space-y-1.5"><label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Chu kỳ cấp phát</label>
                      <div className="relative"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                        <input type="text" value={metaPeriod} onChange={e => setMetaPeriod(e.target.value)} className="w-full pl-11 pr-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" placeholder="VD: 1 tháng/lần" /></div></div>
                    <div className="space-y-1.5"><label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Định mức</label>
                      <input type="text" value={metaQuota} onChange={e => setMetaQuota(e.target.value)} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" placeholder="Số lượng tối đa..." /></div>
                  </>
                )}
                {itemGroup === 'CCDC' && (
                  <>
                    <div className="space-y-1.5"><label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Mã tài sản</label>
                      <div className="relative"><Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                        <input type="text" value={metaAssetCode} onChange={e => setMetaAssetCode(e.target.value)} className="w-full pl-11 pr-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 outline-none font-bold text-slate-700" placeholder="Mã CCDC..." /></div></div>
                    <div className="space-y-1.5"><label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Ngày bàn giao</label>
                      <input type="date" value={metaHandoverDate} onChange={e => setMetaHandoverDate(e.target.value)} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 outline-none font-bold text-slate-700" /></div>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 italic uppercase tracking-tight"><Package className="w-6 h-6 text-indigo-600" /> Danh mục vật tư cấp phát</h3>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setScannerEnabled(!scannerEnabled)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${scannerEnabled ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}><Zap className="w-3.5 h-3.5" /> {scannerEnabled ? 'Đang quét' : 'Quét mã'}</button>
                    <button type="button" onClick={downloadTemplate} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm flex items-center gap-2">Tải mẫu</button>
                    <label className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Import Excel <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} /></label>
                  </div>

                </div>

                <div className="space-y-4">
                  {lines.map((line, idx) => (
                    <div key={line.id} className="flex flex-col md:flex-row gap-5 p-6 bg-white border border-slate-100 rounded-[2rem] hover:border-indigo-300 hover:shadow-2xl transition-all relative group">
                      <div className="flex-1 space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sản phẩm / Vật tư *</label>
                        <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="text" placeholder="Tìm tên hoặc mã..." value={line.itemData?.name || ''} onChange={e => { updateLine(idx, { itemData: { name: e.target.value } }); handleSearch(e.target.value, idx); }} className="w-full pl-11 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none font-black text-slate-700" />
                          {searching === idx && searchResults.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 max-h-60 overflow-y-auto">
                              {searchResults.map(s => (
                                <button key={s.id} onClick={() => selectItem(idx, s)} className="w-full flex items-center justify-between p-4 hover:bg-indigo-50 border-b border-slate-50 last:border-0 text-left">
                                  <div><p className="font-black text-slate-800 uppercase tracking-tight">{s.item.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">MVPP: {s.item.mvpp}</p></div>
                                  <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{s.quantityOnHand} {s.item.unit}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="w-28 space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Số lượng</label>
                        <input type="number" value={line.qty} onChange={e => updateLine(idx, { qty: e.target.value })} className="w-full px-3 py-4 bg-slate-50 border-none rounded-2xl text-center font-black text-indigo-600 text-lg focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ghi chú chi tiết</label>
                        <input type="text" value={line.note} onChange={e => updateLine(idx, { note: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:bg-white outline-none font-bold text-slate-500" placeholder="..." />
                      </div>
                      <button onClick={() => removeLine(idx)} className="self-end p-4 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  ))}
                </div>
                <button onClick={addLine} className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-300 font-black uppercase tracking-[0.2em] italic hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> Thêm hàng hóa vào danh sách</button>
              </div>
            </div>
          )}

          {step === 'CONFIRM' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-400">
              <div className="bg-emerald-50 border border-emerald-100 rounded-[2.5rem] p-10 flex gap-8">
                <div className="w-20 h-20 rounded-3xl bg-emerald-100 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10"><CheckCircle2 className="w-10 h-10 text-emerald-600" /></div>
                <div>
                  <h4 className="text-2xl font-black text-emerald-900 uppercase italic tracking-tight">Xác nhận & Hoàn tất nghiệp vụ</h4>
                  <p className="text-emerald-700 text-sm font-bold mt-2 leading-relaxed opacity-80">Chứng từ này sẽ được lưu trữ vĩnh viễn và cập nhật tồn kho tức thì. Vui lòng đối soát lần cuối trước khi bấm nút xác nhận.</p>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50"><tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest"><th className="px-8 py-5 text-left">Chi tiết mặt hàng</th><th className="px-8 py-5 text-center">Số lượng</th><th className="px-8 py-5 text-right">Biến động tồn thực tế</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {lines.map((l, i) => (
                      <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-6"><p className="font-black text-slate-800 uppercase tracking-tighter">{l.itemData?.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Mã: {l.itemData?.mvpp}</p></td>
                        <td className="px-8 py-6 text-center font-black text-slate-600 text-lg">{l.qty} <span className="text-[10px] text-slate-400 uppercase">{l.itemData?.unit}</span></td>
                        <td className="px-8 py-6 text-right font-black text-indigo-600">
                          <span className="text-slate-300 font-bold mr-3">{l.stockData?.quantityOnHand || 0}</span>
                          <span className="text-slate-200">→</span>
                          <span className="ml-3 text-lg font-black bg-indigo-50 px-4 py-1.5 rounded-xl border border-indigo-100">
                            {transactionType.includes('RECEIVE') || transactionType === 'RETURN' ? (l.stockData?.quantityOnHand + Number(l.qty)) : (l.stockData?.quantityOnHand - Number(l.qty))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-8 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng vật tư</span><span className="text-2xl font-black text-slate-800 italic">{lines.length}</span></div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kho điều phối</span><span className="text-xl font-black text-indigo-600 italic">{WAREHOUSES.find(w => w.id === warehouse)?.label}</span></div>
          </div>
          <div className="flex items-center gap-4">
            {step === 'SELECT' ? (
              <button onClick={() => setStep('FORM')} className="px-12 py-5 bg-indigo-600 text-white font-black rounded-[1.5rem] hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all flex items-center gap-3 uppercase text-xs tracking-widest">Tiếp tục nhập liệu <ArrowRight className="w-5 h-5" /></button>
            ) : step === 'FORM' ? (
              <><button onClick={() => setStep('SELECT')} className="px-8 py-5 text-slate-500 font-black hover:bg-slate-200 rounded-[1.5rem] transition-all uppercase text-[10px] tracking-widest">Quay lại</button>
                <button onClick={() => setStep('CONFIRM')} className="px-12 py-5 bg-indigo-600 text-white font-black rounded-[1.5rem] hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all flex items-center gap-3 uppercase text-xs tracking-widest">Kiểm tra & Xác nhận <ArrowRight className="w-5 h-5" /></button></>
            ) : (
              <><button onClick={() => setStep('FORM')} className="px-8 py-5 text-slate-500 font-black hover:bg-slate-200 rounded-[1.5rem] transition-all uppercase text-[10px] tracking-widest">Quay lại sửa</button>
                <button onClick={handleSubmit} disabled={loading} className="px-16 py-5 bg-emerald-600 text-white font-black rounded-[1.5rem] hover:bg-emerald-700 shadow-2xl shadow-emerald-200 transition-all flex items-center gap-3 uppercase text-xs tracking-widest">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} XÁC NHẬN THỰC THI
                </button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
