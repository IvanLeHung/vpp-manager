import React, { useState, useRef } from 'react';
import { Package, Search, Plus, Filter, Download, Upload, Droplets, LayoutDashboard, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppContext } from '../context/AppContext';

const TAX_RATE = 0.08;

export default function Dashboard() {
  const { items, setItems } = useAppContext();
  const [currentInventoryTab, setCurrentInventoryTab] = useState('VPP'); // 'VPP' | 'VE_SINH'
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayedItems = items.filter(item => {
    const isVS = item.category.toLowerCase().includes('vệ sinh') || item.category.toLowerCase().includes('hóa phẩm');
    return currentInventoryTab === 'VPP' ? !isVS : isVS;
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN') + ' đ';
  };

  const handleExport = () => {
    const exportData = displayedItems.map((item, index) => {
      const giaVAT = Math.round(item.price + (item.price * TAX_RATE));
      return {
        'STT': index + 1,
        'MVPP': item.mvpp,
        'SP': item.name,
        'Nhóm': item.category,
        'ĐVT': item.unit,
        'Tồn kho': item.stock,
        'Giá': item.price,
        'Thuế': '8%',
        'Giá VAT': giaVAT
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }
    ];

    const workbook = XLSX.utils.book_new();
    const sheetName = currentInventoryTab === 'VPP' ? 'Danh_Muc_VPP' : 'Danh_Muc_Ve_Sinh';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${sheetName}.xlsx`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        const newItems = json.map((row, index) => {
          const rawPrice = row['Giá'] ? String(row['Giá']).replace(/\D/g, '') : '0';
          const priceValue = parseInt(rawPrice) || 0;

          return {
            id: `TMP_${Date.now()}_${index}`,
            mvpp: row['MVPP'] || `${currentInventoryTab}_NEW_${Date.now() + index}`,
            name: row['SP'] || 'Sản phẩm chưa có tên',
            category: row['Nhóm'] || 'Khác',
            unit: row['ĐVT'] || 'Cái',
            stock: parseInt(row['Tồn kho']) || 0,
            quota: parseInt(row['Định mức (Quota)']) || 100,
            price: priceValue,
            itemType: currentInventoryTab
          };
        });
        
        if (newItems.length > 0) {
          setItems(prev => {
            const otherTypeItems = prev.filter(i => i.itemType !== currentInventoryTab);
            return [...otherTypeItems, ...newItems];
          });
          const tabName = currentInventoryTab === 'VPP' ? 'Văn phòng phẩm' : 'Đồ vệ sinh';
          alert(`Đã nhập và đè thành công ${newItems.length} mặt hàng vào kho [${tabName}]!`);
        } else {
           alert('Cấu trúc file Excel chưa đúng (Cần: MVPP, SP, Nhóm, ĐVT, Giá, ...).');
        }
      } catch (error) {
        console.error(error);
        alert('File Excel lỗi định dạng.');
      }
    };
    reader.readAsArrayBuffer(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalStock = displayedItems.length;
  const inStock = displayedItems.filter(i => i.stock > 15).length;
  const outOfStockOrLow = displayedItems.filter(i => i.stock <= 15).length;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Tabs Group Local to Dashboard */}
      <div className="bg-white px-8 pt-4 flex gap-8 border-b border-slate-200 shrink-0 sticky top-0 z-10 w-full shadow-sm">
          <button 
            onClick={() => setCurrentInventoryTab('VPP')}
            className={`pb-4 flex items-center font-bold text-sm transition-colors relative cursor-pointer ${currentInventoryTab === 'VPP' ? 'text-blue-700' : 'text-slate-400 hover:text-slate-700'}`}>
            <Package className="w-4 h-4 mr-2"/> Cấu hình Danh mục Văn phòng phẩm
            {currentInventoryTab === 'VPP' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full shadow-[0_-2px_8px_rgba(37,99,235,0.4)]"></div>}
          </button>
          <button 
            onClick={() => setCurrentInventoryTab('VE_SINH')}
            className={`pb-4 flex items-center font-bold text-sm transition-colors relative cursor-pointer ${currentInventoryTab === 'VE_SINH' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'}`}>
            <Droplets className="w-4 h-4 mr-2"/> Cấu hình Danh mục Đồ vệ sinh
            {currentInventoryTab === 'VE_SINH' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full shadow-[0_-2px_8px_rgba(16,185,129,0.4)]"></div>}
          </button>
      </div>

      {/* Internal Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 shadow-inner ${currentInventoryTab === 'VPP' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  <Package className="w-6 h-6"/>
              </div>
              <div>
                  <p className="text-sm text-slate-500 font-medium">Tổng đầu mục SP</p>
                  <p className="text-3xl font-bold text-slate-800">{totalStock}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 shadow-inner ${currentInventoryTab === 'VPP' ? 'bg-indigo-100 text-indigo-600' : 'bg-teal-100 text-teal-600'}`}>
                  <LayoutDashboard className="w-6 h-6"/>
              </div>
              <div>
                  <p className="text-sm text-slate-500 font-medium">Còn hàng tốt</p>
                  <p className="text-3xl font-bold text-slate-800">{inStock}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 shadow-inner ${currentInventoryTab === 'VPP' ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'}`}>
                  <FileText className="w-6 h-6"/>
              </div>
              <div>
                  <p className="text-sm text-slate-500 font-medium">Sắp / Hết hàng</p>
                  <p className="text-3xl font-bold text-slate-800">{outOfStockOrLow}</p>
              </div>
            </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 sticky top-0 bg-slate-50 py-2 z-10 w-full">
          <div className="relative w-full xl:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder={`Tìm kiếm mã SP, tên SP...`}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition-all"
            />
          </div>
          <div className="flex gap-2 w-full xl:w-auto flex-wrap">
            <button 
              onClick={handleExport}
              className="flex items-center justify-center px-4 py-2 bg-white border border-emerald-300 text-emerald-700 hover:text-emerald-800 rounded-xl hover:bg-emerald-50 max-sm:w-full border-2 transition-all shadow-sm font-semibold cursor-pointer">
              <Download className="w-4 h-4 mr-2" /> Tải về Template Excel
            </button>
            
            <input 
                type="file" 
                accept=".xlsx, .xls" 
                ref={fileInputRef} 
                onChange={handleImport} 
                className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center px-4 py-2 bg-white border border-blue-300 text-blue-700 hover:text-blue-800 rounded-xl hover:bg-blue-50 max-sm:w-full border-2 transition-all shadow-sm font-semibold cursor-pointer">
              <Upload className="w-4 h-4 mr-2" /> Import vào Database
            </button>
            
            <button className={`flex items-center justify-center px-5 py-2 text-white rounded-xl transition-all shadow-md font-semibold cursor-pointer max-sm:w-full ${currentInventoryTab === 'VPP' ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30' : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-500/30'}`}>
              <Plus className="w-4 h-4 mr-2" /> Tạo mã SP mới
            </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="bg-white rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.02)] border border-slate-100 overflow-x-auto relative z-0">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="px-4 py-4 text-center">STT</th>
                <th className="px-5 py-4">MVPP</th>
                <th className="px-6 py-4">SP (Sản Phẩm)</th>
                <th className="px-5 py-4">Nhóm</th>
                <th className="px-4 py-4">ĐVT</th>
                <th className="px-4 py-4 text-right">Giá Trị Cũ</th>
                <th className="px-4 py-4 text-center">Thuế VAT</th>
                <th className="px-4 py-4 text-right">Tổng thanh toán</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedItems.length > 0 ? displayedItems.map((item, index) => {
                const giaVAT = Math.round(item.price + (item.price * TAX_RATE));
                return (
                  <tr key={item.mvpp} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-4 py-4 text-center font-medium text-slate-400">{index + 1}</td>
                    <td className={`px-5 py-4 font-bold ${currentInventoryTab === 'VPP' ? 'text-blue-700' : 'text-emerald-700'}`}>{item.mvpp}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                    <td className="px-5 py-4 text-slate-600 text-sm font-medium">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">{item.category}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-600 font-medium">{item.unit}</td>
                    <td className="px-4 py-4 text-right text-slate-500 font-medium">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="px-2 py-1 text-xs font-bold rounded bg-slate-100 text-slate-500">8%</span>
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-amber-600">{formatCurrency(giaVAT)}</td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-blue-600 font-bold text-sm hover:text-blue-800 opacity-80 hover:opacity-100 transition-all cursor-pointer">Chi tiết</button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-3">
                        {currentInventoryTab === 'VPP' ? <Package className="w-16 h-16 opacity-30" /> : <Droplets className="w-16 h-16 opacity-30" />}
                        <span>Không tìm thấy mặt hàng nào trong CSDL! Nạp dữ liệu Excel lên.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
