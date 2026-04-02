import React, { useState, useRef } from 'react';
import { X, Upload, CheckCircle, Download, FileSpreadsheet, ArrowRight, ShieldAlert } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../lib/api';

type ImportMode = 'ADD_ONLY' | 'UPDATE_ONLY' | 'ADD_AND_UPDATE' | 'VALIDATE_ONLY';

type ParsedRow = {
  mvpp: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  itemType: string;
  quota: number;
  isActive: boolean;
  errors: string[];
  action: 'CREATE' | 'UPDATE' | 'IGNORE';
  existingId?: string;
};

export default function ImportExcelModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<ImportMode>('ADD_AND_UPDATE');
  const [file, setFile] = useState<File | null>(null);
  
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [stats, setStats] = useState({ total: 0, valid: 0, error: 0, new: 0, update: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Mã VT': 'VPP001',
      'Tên hàng hóa': 'Bút bi Thiên Long 08',
      'Nhóm hàng': 'Bút',
      'Loại kho': 'VPP',
      'ĐVT': 'Hộp',
      'Đơn giá': 45000,
      'Định mức': 100,
      'Trạng thái': 'ACTIVE'
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Import_Items.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const processFile = () => {
    if (!file) return;
    setLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        // Map Excel columns to our interface
        const rawItems = jsonData.map(row => ({
          mvpp: String(row['Mã VT'] || '').trim(),
          name: String(row['Tên hàng hóa'] || '').trim(),
          category: String(row['Nhóm hàng'] || '').trim(),
          itemType: String(row['Loại kho'] || 'VPP').trim().toUpperCase(),
          unit: String(row['ĐVT'] || '').trim(),
          price: Number(String(row['Đơn giá'] || '0').replace(/,/g, '')),
          quota: Number(String(row['Định mức'] || '100').replace(/,/g, '')),
          isActive: String(row['Trạng thái'] || 'ACTIVE').trim().toUpperCase() === 'ACTIVE'
        }));

        // Send to backend for formal validation
        const valRes = await api.post('/items/import/validate', { items: rawItems });
        
        setParsedData(valRes.data.results);
        setStats(valRes.data.stats);
        setStep(2);
      } catch (err) {
        console.error(err);
        alert('Lỗi đọc file Excel hoặc xác thực dữ liệu từ server.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirm = async () => {
    if (mode === 'VALIDATE_ONLY') {
      onClose();
      return;
    }
    
    const validItems = parsedData.filter(d => d.errors.length === 0).map(d => ({
      action: mode === 'ADD_ONLY' ? 'CREATE' : (mode === 'UPDATE_ONLY' ? 'UPDATE' : d.action),
      itemData: {
        id: d.existingId,
        mvpp: d.mvpp,
        name: d.name,
        category: d.category,
        unit: d.unit,
        price: d.price,
        itemType: d.itemType,
        quota: d.quota,
        isActive: d.isActive
      }
    }));

    if (validItems.length === 0) {
      alert('Không có dòng hợp lệ nào để import.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/items/import/confirm', {
        mode,
        fileName: file?.name,
        items: validItems
      });
      alert(`Import thành công ${validItems.length} mặt hàng!`);
      onSuccess();
    } catch (err: any) {
      alert('Lỗi import: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20 animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div className="flex items-center">
             <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white mr-4 shadow-lg shadow-indigo-100">
                <Upload className="w-5 h-5" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-800">Import Danh Mục Hàng Hoá</h2>
                <p className="text-xs text-slate-400 font-medium italic">Quy trình nhập liệu an toàn 2 bước</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 bg-white p-2 border border-slate-200 rounded-full shadow-sm hover:bg-rose-50 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1 bg-white">
          {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl flex items-start gap-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shrink-0 font-bold">1</div>
                        <div className="flex-1">
                            <h3 className="font-bold text-indigo-900 mb-1">Cấu hình Import</h3>
                            <p className="text-sm text-indigo-600/80 mb-4 font-medium">Chọn phương thức xử lý khi gặp mã hàng đã tồn tại trong hệ thống.</p>
                            <select value={mode} onChange={(e) => setMode(e.target.value as ImportMode)} className="w-full px-4 py-3 bg-white border-2 border-indigo-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-indigo-800 transition shadow-sm">
                                <option value="ADD_AND_UPDATE">THÊM MỚI & CẬP NHẬT (Ghi đè nếu trùng mã)</option>
                                <option value="ADD_ONLY">CHỈ THÊM MỚI (Bỏ qua nếu mã đã tồn tại)</option>
                                <option value="UPDATE_ONLY">CHỈ CẬP NHẬT (Báo lỗi nếu mã chưa có)</option>
                                <option value="VALIDATE_ONLY">CHỈ KIỂM TRA (Review lỗi, không lưu DB)</option>
                            </select>
                        </div>
                    </div>

                    <div className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all ${file ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-indigo-300'} cursor-pointer`} onClick={() => fileInputRef.current?.click()}>
                        <FileSpreadsheet className={`w-16 h-16 mx-auto mb-4 ${file ? 'text-emerald-500' : 'text-slate-300'}`} />
                        {file ? (
                          <>
                             <p className="text-xl font-bold text-emerald-800 mb-1">{file.name}</p>
                             <p className="text-sm text-emerald-600/70 font-medium">Click để chọn file khác</p>
                          </>
                        ) : (
                          <>
                             <p className="text-xl font-bold text-slate-800 mb-1">Kéo thả File Excel vào đây</p>
                             <p className="text-sm text-slate-400 font-medium">Hỗ trợ .xlsx, .xls (Tối đa 10MB)</p>
                          </>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                    </div>
                </div>

                <div className="lg:col-span-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 h-fit">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                        <ShieldAlert className="w-5 h-5 mr-2 text-indigo-600" /> Chuẩn bị dữ liệu
                    </h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-white rounded-xl border border-slate-200">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Bước 1: Tải mẫu</p>
                            <button onClick={handleDownloadTemplate} className="w-full py-2.5 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-lg hover:bg-indigo-100 transition flex items-center justify-center gap-2">
                                <Download className="w-4 h-4" /> Template_Import.xlsx
                            </button>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-slate-200">
                             <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Bước 2: Quy tắc lưu ý</p>
                             <ul className="text-xs text-slate-500 space-y-2 leading-relaxed font-medium">
                                <li className="flex gap-2"><span>•</span> <strong>Mã VT:</strong> Phải là mã duy nhất (VPP001, VS002...)</li>
                                <li className="flex gap-2"><span>•</span> <strong>Loại kho:</strong> Chỉ nhận giá trị <b>VPP</b> hoặc <b>VE_SINH</b></li>
                                <li className="flex gap-2"><span>•</span> <strong>Đơn giá:</strong> Số nguyên không âm.</li>
                             </ul>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in slide-in-from-right-8 duration-300 h-full flex flex-col">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Tổng số</p>
                  <p className="text-3xl font-black text-slate-800 mt-1">{stats.total}</p>
                </div>
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Hợp lệ (Sẵn sàng)</p>
                  <p className="text-3xl font-black text-emerald-700 mt-1">{stats.valid}</p>
                </div>
                <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100">
                  <p className="text-[10px] text-rose-600 font-black uppercase tracking-widest">Lỗi (Sẽ bỏ qua)</p>
                  <p className="text-3xl font-black text-rose-700 mt-1">{stats.error}</p>
                </div>
                <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex flex-col justify-center">
                  <div className="flex justify-between items-center text-xs font-bold text-indigo-700">
                      <span>🆕 Tạo mới:</span>
                      <span className="text-lg font-black">{stats.new}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-amber-600 mt-1">
                      <span>🔄 Cập nhật:</span>
                      <span className="text-lg font-black">{stats.update}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto border border-slate-200 rounded-2xl min-h-[300px]">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr className="text-slate-500 font-black text-[10px] uppercase tracking-wider">
                      <th className="p-4 w-12 text-center">STT</th>
                      <th className="p-4">Thông tin Hàng hoá</th>
                      <th className="p-4">Phân loại</th>
                      <th className="p-4 text-right">Đơn giá / ĐVT</th>
                      <th className="p-4 text-center">Hành động dự kiến</th>
                      <th className="p-4">Trạng thái dữ liệu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 italic-last-step">
                    {parsedData.map((row, i) => (
                      <tr key={i} className={`hover:bg-slate-50/50 transition ${row.errors.length > 0 ? 'bg-rose-50/30' : ''}`}>
                        <td className="p-4 text-center text-slate-400 font-bold font-mono">{i + 1}</td>
                        <td className="p-4">
                           <div className="font-black text-slate-800">{row.mvpp}</div>
                           <div className="text-sm font-medium text-slate-600 truncate max-w-xs">{row.name}</div>
                        </td>
                        <td className="p-4">
                           <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">{row.itemType}</span>
                           <div className="text-xs text-slate-400 mt-1">{row.category}</div>
                        </td>
                        <td className="p-4 text-right">
                           <div className="font-bold text-indigo-600">{row.price.toLocaleString('vi-VN')} đ</div>
                           <div className="text-[10px] text-slate-400 font-black uppercase">Mỗi {row.unit}</div>
                        </td>
                        <td className="p-4 text-center">
                           <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border shadow-sm
                             ${row.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                               row.action === 'UPDATE' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                               'bg-slate-100 text-slate-400 border-slate-200'}`}>
                             {row.action === 'CREATE' ? 'THÊM MỚI' : row.action === 'UPDATE' ? 'CẬP NHẬT' : 'BỎ QUA'}
                           </span>
                        </td>
                        <td className="p-4">
                          {row.errors.length > 0 ? (
                            <div className="flex flex-col gap-1">
                               {row.errors.map((e, idx) => (
                                 <span key={idx} className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 w-fit shrink-0 tracking-tight leading-none uppercase">! {e}</span>
                               ))}
                            </div>
                          ) : (
                            <div className="flex items-center text-emerald-600 font-black text-[10px] uppercase tracking-widest"><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Dữ liệu Sạch</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex justify-between shrink-0">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl transition shadow-sm">Thoát</button>
              <button onClick={processFile} disabled={!file || loading} className="px-8 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl transition-all flex items-center shadow-lg shadow-indigo-100 transform active:scale-95">
                {loading ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Đang kiểm tra...</>
                ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Tải lên & Kiểm tra <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} className="px-6 py-3 text-sm font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl transition">Quay lại chọn file</button>
              <div className="flex gap-4">
                 <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-slate-400 bg-transparent hover:text-rose-600 transition">Huỷ bỏ cả Batch</button>
                 <button onClick={handleConfirm} disabled={stats.valid === 0 || loading} className={`px-10 py-3 text-sm font-bold text-white rounded-2xl transition-all shadow-xl transform active:scale-95 flex items-center
                    ${mode === 'VALIDATE_ONLY' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'}`}>
                    {loading ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Đang đồng bộ...</>
                    ) : (
                        mode === 'VALIDATE_ONLY' ? 'Hoàn thành xem thử' : `Tiến hành Đồng bộ (${stats.valid} dòng) `
                    )}
                 </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RefreshCw(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
}
