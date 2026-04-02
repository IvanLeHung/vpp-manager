import React, { useState, useRef } from 'react';
import { X, Upload, CheckCircle, AlertCircle, Download, FileSpreadsheet, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../lib/api';

type ImportMode = 'ADD_ONLY' | 'UPDATE_ONLY' | 'ADD_AND_UPDATE' | 'VALIDATE_ONLY';

type ParsedRow = {
  _index: number;
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
  existingItem?: any;
};

export default function ImportExcelModal({
  isOpen,
  onClose,
  onSuccess,
  existingItems
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingItems: any[]; // To cross check existing MVPPs
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<ImportMode>('ADD_AND_UPDATE');
  const [file, setFile] = useState<File | null>(null);
  
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [stats, setStats] = useState({ total: 0, valid: 0, error: 0, new: 0, update: 0, ignore: 0 });
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
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        let valid = 0;
        let error = 0;
        let cNew = 0;
        let cUpd = 0;
        let cIgn = 0;

        const pData: ParsedRow[] = jsonData.map((row, idx) => {
          const errors: string[] = [];
          const mvpp = String(row['Mã VT'] || '').trim().toUpperCase();
          const name = String(row['Tên hàng hóa'] || '').trim();
          const category = String(row['Nhóm hàng'] || '').trim();
          const itemType = String(row['Loại kho'] || '').trim().toUpperCase();
          const unit = String(row['ĐVT'] || '').trim();
          const priceStr = String(row['Đơn giá'] || '0').replace(/,/g, '');
          const price = Number(priceStr);
          const quotaStr = String(row['Định mức'] || '100').replace(/,/g, '');
          const quota = Number(quotaStr);
          const statusStr = String(row['Trạng thái'] || 'ACTIVE').trim().toUpperCase();
          const isActive = statusStr === 'ACTIVE' || statusStr === 'ĐANG CẤP';

          if (!mvpp) errors.push('Thiếu Mã VT');
          if (!name) errors.push('Thiếu Tên');
          if (!category) errors.push('Thiếu Nhóm');
          if (itemType !== 'VPP' && itemType !== 'VE_SINH') errors.push('Loại kho phải là VPP hoặc VE_SINH');
          if (isNaN(price) || price < 0) errors.push('Giá không hợp lệ');
          if (isNaN(quota) || quota < 0) errors.push('Định mức không hợp lệ');

          const existingItem = existingItems.find(i => i.mvpp === mvpp);
          let action: 'CREATE' | 'UPDATE' | 'IGNORE' = 'IGNORE';

          if (existingItem) {
            if (mode === 'ADD_ONLY') {
              errors.push('Mã đã tồn tại (Chế độ Thêm Mới)');
            } else {
              action = 'UPDATE';
            }
          } else {
            if (mode === 'UPDATE_ONLY') {
              errors.push('Mã không tồn tại (Chế độ Cập Nhật)');
            } else {
              action = 'CREATE';
            }
          }

          if (errors.length > 0) { action = 'IGNORE'; }

          if (errors.length > 0) error++; else valid++;
          if (action === 'CREATE') cNew++;
          if (action === 'UPDATE') cUpd++;
          if (action === 'IGNORE') cIgn++;

          return {
            _index: idx + 2,
            mvpp, name, category, unit, price, itemType, quota, isActive, errors, action,
            existingItem
          };
        });

        setParsedData(pData);
        setStats({ total: pData.length, valid, error, new: cNew, update: cUpd, ignore: cIgn });
        setStep(2);
      } catch (err) {
        alert('Lỗi đọc file Excel. Vui lòng kiểm tra lại file mẫu.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirm = async () => {
    if (mode === 'VALIDATE_ONLY') {
      alert('File hợp lệ. (Chế độ Chỉ kiểm tra, không ghi dữ liệu)');
      onClose();
      return;
    }
    
    const validItems = parsedData.filter(d => d.errors.length === 0).map(d => ({
      action: d.action,
      itemData: {
        id: d.existingItem?.id,
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
      alert('Import thành công!');
      onSuccess();
    } catch (err: any) {
      alert('Lỗi import: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <Upload className="w-6 h-6 mr-3 text-indigo-600" /> Nhập Danh Mục Từ Excel
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 bg-white p-2 border border-slate-200 rounded-full shadow-sm hover:bg-rose-50 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {step === 1 && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <div className="flex gap-6">
                <div className="flex-1 space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Chế độ Import</label>
                    <select value={mode} onChange={(e) => setMode(e.target.value as ImportMode)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium">
                      <option value="ADD_AND_UPDATE">Thêm mới & Cập nhật (Mã có sẵn sẽ đè, mã mới sẽ thêm)</option>
                      <option value="ADD_ONLY">Chỉ Thêm mới (Báo lỗi nếu mã đã tồn tại)</option>
                      <option value="UPDATE_ONLY">Chỉ Cập nhật (Báo lỗi nếu mã chưa tồn tại)</option>
                      <option value="VALIDATE_ONLY">Chỉ Kiểm tra (Xem báo cáo lỗi, không ghi đè)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Chọn File Excel</label>
                    <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-2xl p-6 text-center cursor-pointer hover:bg-indigo-50 transition" onClick={() => fileInputRef.current?.click()}>
                      <FileSpreadsheet className="w-12 h-12 mx-auto text-indigo-300 mb-3" />
                      <p className="text-slate-600 font-medium mb-1">Click để chọn file hoặc kéo thả vào đây</p>
                      <p className="text-xs text-slate-400">Hỗ trợ định dạng .xlsx, .xls</p>
                      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                    </div>
                    {file && <p className="mt-3 text-sm text-emerald-600 font-bold flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Đã chọn: {file.name}</p>}
                  </div>
                </div>

                <div className="w-64 bg-slate-50 p-5 rounded-2xl border border-slate-100 shrink-0">
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center"><AlertCircle className="w-4 h-4 mr-2 text-indigo-500"/> Hướng dẫn</h3>
                  <ul className="text-xs text-slate-500 space-y-2 mb-6 lists-disc pl-4">
                    <li>Sử dụng đúng File Mẫu để tránh lỗi cấu trúc cột.</li>
                    <li>Mã VT là trường định danh không được trùng lặp.</li>
                    <li>Giá và định mức không được để số âm.</li>
                  </ul>
                  <button onClick={handleDownloadTemplate} className="w-full py-2 bg-white border border-indigo-200 text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-50 transition flex items-center justify-center">
                    <Download className="w-4 h-4 mr-2" /> Tải File Mẫu
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <p className="text-xs text-slate-500 font-bold">TỔNG SỐ DÒNG</p>
                  <p className="text-2xl font-black text-slate-800">{stats.total}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-xs text-emerald-600 font-bold">HỢP LỆ</p>
                  <p className="text-2xl font-black text-emerald-700">{stats.valid}</p>
                </div>
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-center">
                  <p className="text-xs text-rose-600 font-bold">CÓ LỖI</p>
                  <p className="text-2xl font-black text-rose-700">{stats.error}</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex flex-col justify-center pl-6">
                  <p className="text-xs font-bold text-indigo-800 flex items-center">+ Thêm mới: <span className="ml-auto pr-4">{stats.new}</span></p>
                  <p className="text-xs font-bold text-amber-600 flex items-center mt-1">~ Cập nhật: <span className="ml-auto pr-4">{stats.update}</span></p>
                  <p className="text-xs font-bold text-slate-400 flex items-center mt-1">- Bỏ qua: <span className="ml-auto pr-4">{stats.ignore}</span></p>
                </div>
              </div>

              <div className="overflow-auto border border-slate-200 rounded-xl" style={{ maxHeight: '350px' }}>
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-100 sticky top-0 z-10">
                    <tr className="text-slate-600 font-bold">
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">Mã VT</th>
                      <th className="p-3">Tên & Nhóm</th>
                      <th className="p-3">Đơn giá / Định mức</th>
                      <th className="p-3">Thao tác dự kiến</th>
                      <th className="p-3">Cảnh báo / Lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.map((row, i) => (
                      <tr key={i} className={row.errors.length > 0 ? 'bg-rose-50/30' : ''}>
                        <td className="p-3 text-center text-slate-400">{row._index}</td>
                        <td className="p-3 font-bold text-slate-700">{row.mvpp}</td>
                        <td className="p-3">
                          <p className="font-bold">{row.name}</p>
                          <p className="text-xs text-slate-500">{row.category} • {row.itemType}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-indigo-600">{row.price.toLocaleString('vi-VN')} {row.unit}</p>
                          <p className="text-xs text-slate-500 text-right mr-4">Ngưỡng: {row.quota}</p>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${row.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' : row.action === 'UPDATE' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                            {row.action}
                          </span>
                        </td>
                        <td className="p-3">
                          {row.errors.length > 0 ? (
                            <ul className="text-xs text-rose-600 font-medium">
                              {row.errors.map((e, idx) => <li key={idx}>- {e}</li>)}
                            </ul>
                          ) : (
                            <span className="text-emerald-500 text-xs font-bold flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Hợp lệ</span>
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
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between shrink-0">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition">Huỷ</button>
              <button onClick={processFile} disabled={!file || loading} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition flex items-center">
                {loading ? 'Đang đọc...' : 'Đọc file & Kiểm tra'} <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition">Quay lại</button>
              <button onClick={handleConfirm} disabled={stats.valid === 0 || loading} className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition flex items-center ${mode === 'VALIDATE_ONLY' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {loading ? 'Đang xử lý...' : (mode === 'VALIDATE_ONLY' ? 'Hoàn thành Validate' : `Xác nhận & Import (${stats.valid} dòng)`)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
