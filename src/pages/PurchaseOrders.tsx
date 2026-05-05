import React, { useState, useRef, useEffect } from 'react';
import { Plus, PackagePlus, Search, Trash2, ShieldAlert, CheckCircle, Truck } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import type { PurchaseOrder, VPPItem } from '../context/AppContext';

export default function PurchaseOrders() {
    const { currentUser, items, purchaseOrders, addPurchaseOrder, importPurchaseOrder } = useAppContext();
    const [viewMode, setViewMode] = useState<'LIST' | 'CREATE'>('LIST');
    
    // Create PO State
    const [supplier, setSupplier] = useState('');
    const [targetItems, setTargetItems] = useState<{item: VPPItem, quantity: number}[]>([]);
    
    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Bảo mật: Role Check
    if (currentUser.role !== 'ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-50 h-full w-full">
                <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 text-center max-w-lg">
                    <ShieldAlert className="w-20 h-20 text-rose-400 mx-auto mb-6"/>
                    <h2 className="text-2xl font-black text-rose-600 mb-2">Truy Cập Bị Từ Chối</h2>
                    <p className="text-slate-500 font-medium">Chức năng Lập Lệnh Mua Hàng & Nhập Kho chỉ dành riêng cho quyền hạn <strong className="text-slate-800">Quản trị Hệ thống / Quản lý Kho Tổng</strong>.</p>
                </div>
            </div>
        );
    }

    const searchResults = items.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.mvpp.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddItem = (i: VPPItem) => {
        const existing = targetItems.find(t => t.item.mvpp === i.mvpp);
        if (existing) {
           setTargetItems(targetItems.map(t => t.item.mvpp === i.mvpp ? {...t, quantity: t.quantity + 1} : t));
        } else {
           setTargetItems([...targetItems, {item: i, quantity: 1}]);
        }
        setSearchTerm('');
        setShowDropdown(false);
    };

    const updateQty = (mvpp: string, val: string) => {
        const parsed = parseInt(val.replace(/\D/g, ''));
        const qty = isNaN(parsed) ? 1 : parsed;
        setTargetItems(targetItems.map(t => t.item.mvpp === mvpp ? {...t, quantity: qty} : t));
    };

    const submitPO = () => {
        if (targetItems.length === 0) return alert('Chưa chọn hàng hóa cần mua!');
        if (!supplier.trim()) return alert('Vui lòng nhập tên Đơn vị / Nhà Cung Cấp!');
        if (targetItems.some(t => t.quantity <= 0)) return alert('Số lượng nhập phải lớn hơn 0');
        
        // Use Mock ID
        addPurchaseOrder({
            id: `PO-${Date.now().toString().slice(-6)}`,
            createdAt: new Date(),
            supplier,
            status: 'Đang mua',
            items: targetItems
        });
        
        alert('Tạo Lệnh Nhập Mua thành công!');
        setSupplier('');
        setTargetItems([]);
        setViewMode('LIST');
    };

    if (viewMode === 'CREATE') {
        const totalAmount = targetItems.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0);

        return (
            <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-100 overflow-hidden relative">
                {/* Header */}
                <div className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-6 shrink-0 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center"><PackagePlus className="w-6 h-6 mr-3 text-indigo-600"/> Lập Lệnh Mua / Nhập Hàng Ngoại Vi</h2>
                    <div className="flex gap-3">
                        <button onClick={() => setViewMode('LIST')} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition">Hủy</button>
                        <button onClick={submitPO} className="px-5 py-2 font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow transition">Xác nhận tạo đơn PO</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 w-full max-w-5xl mx-auto">
                    {/* Supplier Info */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Nhà Cung Cấp / Nguồn Hàng</label>
                            <input type="text" value={supplier} onChange={e=>setSupplier(e.target.value)} placeholder="Nhập tên nhà cung cấp, shop, nhà sách..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Ngày tạo lệnh</label>
                            <input type="text" disabled value={new Date().toLocaleDateString('vi-VN')} className="w-full p-3 bg-slate-100/50 border border-slate-200 rounded-xl text-slate-400 font-bold" />
                        </div>
                    </div>

                    {/* Items Grid */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-[300px]">
                        <div className="p-4 border-b border-slate-200" ref={searchRef}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                <input 
                                    type="text" value={searchTerm} 
                                    onChange={e => {setSearchTerm(e.target.value); setShowDropdown(true);}}
                                    onFocus={() => setShowDropdown(true)}
                                    placeholder="🔍 Tìm mã hàng cần nhập mua bổ sung..." 
                                    className="w-full pl-10 pr-4 py-3 bg-indigo-50/50 border-2 border-indigo-100 rounded-xl focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-indigo-900 transition-all shadow-inner"
                                />
                                {showDropdown && searchTerm && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-2xl rounded-xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100">
                                        {searchResults.map(item => (
                                            <div key={item.mvpp} onClick={() => handleAddItem(item)} className="p-3 hover:bg-indigo-50 cursor-pointer transition flex items-center justify-between group">
                                                <div><p className="font-bold text-slate-800">{item.name}</p></div>
                                                <div className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">Thêm +</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-extrabold text-slate-400">
                                    <tr>
                                        <th className="p-4 w-12 text-center">STT</th>
                                        <th className="p-4">Sản Phẩm</th>
                                        <th className="p-4 text-right">Đơn giá Nhập</th>
                                        <th className="p-4 text-center w-32 border-x border-slate-200 bg-indigo-50/50 text-indigo-600">SỐ LƯỢNG MUA</th>
                                        <th className="p-4 text-right">Thành Tiền</th>
                                        <th className="p-4 text-center w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {targetItems.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-medium">Chưa có danh sách hàng mua.</td></tr>}
                                    {targetItems.map((t, idx) => (
                                        <tr key={t.item.mvpp} className="hover:bg-slate-50">
                                            <td className="p-4 text-center text-slate-400 font-bold">{idx+1}</td>
                                            <td className="p-4 font-bold text-slate-800">{t.item.name} <span className="text-[10px] bg-slate-100 text-slate-500 px-1 ml-2 rounded border">{t.item.mvpp}</span></td>
                                            <td className="p-4 font-bold text-slate-500 text-right">{t.item.price.toLocaleString('vi-VN')}</td>
                                            <td className="p-2 border-x border-slate-200 bg-white relative">
                                                <input type="number" min="1" value={t.quantity} onChange={e => updateQty(t.item.mvpp, e.target.value)} className="w-full text-center py-2 bg-slate-50 border border-slate-100 outline-none rounded font-black text-lg text-indigo-700 focus:bg-white focus:ring-2 focus:ring-indigo-500" />
                                            </td>
                                            <td className="p-4 font-black text-slate-700 text-right">{(t.item.price * t.quantity).toLocaleString('vi-VN')}</td>
                                            <td className="p-4 text-center">
                                                <button onClick={() => setTargetItems(targetItems.filter(i=>i.item.mvpp!==t.item.mvpp))} className="p-2 text-slate-300 hover:text-rose-500 transition"><Trash2 className="w-4 h-4"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Tổng chi */}
                        <div className="mt-auto p-6 bg-slate-800 text-white rounded-b-2xl flex justify-between items-center">
                            <span className="font-bold text-slate-400">TỔNG GIÁ TRỊ PHIẾU NHẬP MUA</span>
                            <span className="text-3xl font-black text-emerald-400">{totalAmount.toLocaleString('vi-VN')} VNĐ</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // LIST VIEW
    return (
        <div className="flex flex-col h-[calc(100vh-64px)] p-4 md:p-8 bg-slate-50">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                   <h2 className="text-2xl font-bold text-slate-800">Quản lý Phiếu Nhập Mua (Bổ sung Kho)</h2>
                   <p className="text-slate-500 font-medium text-sm mt-1">Cập nhật số dư Tồn Kho thủ công tự động sau khi nhập hàng từ NCC.</p>
                </div>
                <button onClick={() => setViewMode('CREATE')} className="flex items-center px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-500/30">
                   <Plus className="w-5 h-5 mr-2"/> Lập Phiếu Nhập PO Mới
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr className="text-xs uppercase font-extrabold text-slate-500">
                                <th className="p-5">Mã PO / Ngày</th>
                                <th className="p-5">Nguồn cấp (Supplier)</th>
                                <th className="p-5 text-center">SL Danh mục</th>
                                <th className="p-5 text-right">Tổng Tiền PO</th>
                                <th className="p-5 text-center">Trạng thái</th>
                                <th className="p-5 text-right">Thao Tác Kho</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {purchaseOrders.map(po => {
                                const totalItems = po.items.length;
                                const poTotal = po.items.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0);
                                const isDone = po.status === 'Đã nhập kho';
                                return (
                                <tr key={po.id} className="hover:bg-slate-50">
                                    <td className="p-5">
                                        <p className="font-black text-indigo-700">{po.id}</p>
                                        <p className="text-xs font-bold text-slate-400 mt-1">{po.createdAt.toLocaleDateString('vi-VN')}</p>
                                    </td>
                                    <td className="p-5 font-bold text-slate-800">{po.supplier}</td>
                                    <td className="p-5 text-center font-bold text-slate-600">{totalItems}</td>
                                    <td className="p-5 text-right font-black text-slate-700">{poTotal.toLocaleString('vi-VN')} đ</td>
                                    <td className="p-5 text-center">
                                        {isDone 
                                            ? <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-200 inline-flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> {po.status}</span>
                                            : <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold border border-amber-200 inline-flex items-center"><Truck className="w-3 h-3 mr-1"/> {po.status}</span>
                                        }
                                    </td>
                                    <td className="p-5 text-right">
                                        {!isDone && (
                                            <button 
                                                onClick={() => {
                                                    if(window.confirm('Xác nhận: Hàng hóa đã về kho thành công? Hệ thống sẽ CỘNG TRỰC TIẾP tổng số lượng mua vào Tồn Kho Khả Dụng ngay lập tức.')) {
                                                        importPurchaseOrder(po.id);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 transition shadow-sm flex items-center inline-flex">
                                                <PackagePlus className="w-4 h-4 mr-2"/> CỘNG TỒN NGAY
                                            </button>
                                        )}
                                        {isDone && <span className="text-slate-400 text-xs font-bold">Đã lưu sổ cái</span>}
                                    </td>
                                </tr>
                            )})}
                            {purchaseOrders.length === 0 && <tr><td colSpan={6} className="p-16 text-center text-slate-500 font-medium tracking-wide">Chưa có chứng từ lệnh Mua Hàng nào.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
