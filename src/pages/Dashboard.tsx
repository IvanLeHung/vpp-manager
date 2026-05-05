import { useState, useEffect } from 'react';
import { 
  Package, Search, Download, LayoutDashboard, FileText, 
  AlertCircle, PlusCircle, 
  BarChart3, Clock, Settings, ShoppingBag, 
  History, ShieldCheck,
  CheckCircle2, Building2, User,
  Truck, ListChecks, FileSearch, ClipboardCheck, Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import { useAppContext } from '../context/AppContext';



export default function Dashboard() {
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const addToast = (msg: string, type: 'success' | 'error' = 'success') => { 
    setToast({message: msg, type}); 
    setTimeout(() => setToast(null), 3000); 
  };

  // State
  const [summary, setSummary] = useState<any>(null);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'OVERVIEW' | 'INVENTORY'>('OVERVIEW');
  const [currentInventoryTab, setCurrentInventoryTab] = useState('VPP'); 
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, itemsRes] = await Promise.all([
        api.get('/reports/dashboard?warehouseCode=ALL'),
        api.get('/items?all=true')
      ]);

      setSummary(summaryRes.data);
      setStocks(Array.isArray(itemsRes.data) ? itemsRes.data : []);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      addToast('Không thể tải dữ liệu điều hành.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'EMPLOYEE') {
      navigate('/requests');
      return;
    }
    fetchData();
  }, [currentUser, navigate]);

  const displayedStocks = stocks.filter(item => {
    if (!item) return false;

    const type = item.itemType || 'VPP';
    const matchesTab = currentInventoryTab === 'VPP' ? type === 'VPP' : type === 'VE_SINH';
    
    if (!matchesTab) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.mvpp.toLowerCase().includes(q);
    }
    return true;
  });

  const formatCurrency = (value: number) => value.toLocaleString('vi-VN') + ' đ';

  const handleExport = () => {
    const exportData = displayedStocks.map((stock, index) => {
      const item = stock.item;
      const price = Number(item.price);
      return {
        'STT': index + 1,
        'MVPP': item.mvpp,
        'SP': item.name,
        'Nhóm': item.category,
        'ĐVT': item.unit,
        'Tồn kho': stock.quantityOnHand,
        'Giá': price,
        'VAT': '8%'
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TonKho");
    XLSX.writeFile(wb, `TonKho_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-black uppercase tracking-widest italic animate-pulse">Đang nạp Trung tâm Điều hành...</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'ADMIN';
  const isWarehouse = currentUser?.role === 'WAREHOUSE';
  const isManager = currentUser?.role === 'MANAGER';
  const pendingActions = summary?.operational?.pendingActions || {};

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {toast && (
        <div className={`fixed bottom-8 right-8 px-8 py-4 rounded-2xl text-white font-black shadow-2xl z-[100] ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'} animate-in fade-in slide-in-from-bottom-4`}>
          {toast.message}
        </div>
      )}

      {/* --- TOP HEADER --- */}
      <div className="bg-white px-10 py-6 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm relative z-20">
          <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic flex items-center gap-3">
                  <LayoutDashboard className="w-8 h-8 text-indigo-600" /> Trung tâm Điều hành
              </h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-11">Hệ thống quản trị Danko VPP v2.0</p>
          </div>
          <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col text-right mr-4">
                  <span className="text-sm font-black text-slate-800 uppercase italic leading-none">{currentUser?.fullName}</span>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                    {currentUser?.role === 'EMPLOYEE' ? 'Cán bộ Nhân viên' : currentUser?.role}
                  </span>
              </div>
              <button onClick={() => navigate('/profile')} className="w-12 h-12 rounded-2xl bg-slate-100 border-2 border-white shadow-md flex items-center justify-center hover:bg-slate-200 transition-all overflow-hidden cursor-pointer">
                  {currentUser?.avatar ? <img src={currentUser.avatar} alt="" className="w-full h-full object-cover"/> : <Settings className="w-6 h-6 text-slate-400" />}
              </button>
          </div>
      </div>

      {/* --- NAVIGATION TABS --- */}
      {currentUser?.role !== 'EMPLOYEE' && (
        <div className="bg-white px-10 flex gap-10 border-b border-slate-200 shrink-0 relative z-10">
            <button 
              onClick={() => setCurrentTab('OVERVIEW')}
              className={`py-4 flex items-center font-black text-xs uppercase tracking-widest transition-all relative cursor-pointer ${currentTab === 'OVERVIEW' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <BarChart3 className="w-4 h-4 mr-2"/> Chiến lược & Tổng quan
              {currentTab === 'OVERVIEW' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_10px_rgba(79,70,229,0.5)]"></div>}
            </button>
            <button 
              onClick={() => setCurrentTab('INVENTORY')}
              className={`py-4 flex items-center font-black text-xs uppercase tracking-widest transition-all relative cursor-pointer ${currentTab === 'INVENTORY' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <Package className="w-4 h-4 mr-2"/> Kiểm soát Tồn kho
              {currentTab === 'INVENTORY' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full shadow-[0_-2px_10px_rgba(16,185,129,0.5)]"></div>}
            </button>
        </div>
      )}

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 relative custom-scrollbar">
          
          {currentTab === 'OVERVIEW' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
                
                {/* 1. TOP ORIENTATION BLOCKS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 flex items-center gap-6 shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                            <Building2 className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                              {currentUser?.role === 'EMPLOYEE' ? 'Cửa sổ nhân viên' : 'Trung tâm Điều hành'}
                            </h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                              {currentUser?.role === 'EMPLOYEE' 
                                ? 'Gửi yêu cầu, theo dõi xử lý và xác nhận khi nhận hàng' 
                                : 'Hệ thống quản lý mua sắm, kho và cấp phát văn phòng phẩm nội bộ'}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Xin chào, {currentUser?.fullName}</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {currentUser?.role === 'EMPLOYEE' 
                                  ? 'Bạn có thể tạo yêu cầu VPP, theo dõi trạng thái và nhận hàng' 
                                  : 'Quản lý mua sắm, cấp phát và tồn kho nội bộ'}
                            </p>
                        </div>
                        <User className="w-8 h-8 text-slate-300" />
                    </div>
                </div>

                {/* 2. PRIMARY QUICK ACTIONS (HORIZONTAL) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">
                      {currentUser?.role === 'EMPLOYEE' ? 'Tác vụ của tôi' : 'Tác vụ chính'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MainActionCard 
                          icon={<PlusCircle className="w-6 h-6" />} 
                          title="Tạo yêu cầu mới" 
                          desc={currentUser?.role === 'EMPLOYEE' ? 'Xin cấp phát hoặc đề nghị mua vật tư' : 'Tạo yêu cầu mua sắm hoặc cấp phát mới'} 
                          onClick={() => navigate('/requests?mode=CREATE')} 
                        />
                        <MainActionCard 
                          icon={<FileSearch className="w-6 h-6" />} 
                          title="Theo dõi yêu cầu" 
                          desc={currentUser?.role === 'EMPLOYEE' ? 'Xem trạng thái yêu cầu đã gửi' : 'Tra cứu và theo dõi trạng thái yêu cầu (PR)'} 
                          onClick={() => navigate('/requests')} 
                        />
                        <MainActionCard 
                          icon={<ClipboardCheck className="w-6 h-6" />} 
                          title="Xác nhận nhận hàng" 
                          desc={currentUser?.role === 'EMPLOYEE' ? 'Xác nhận các phiếu đã bàn giao' : 'Xem tồn kho hiện tại theo mặt hàng và kho'} 
                          onClick={() => currentUser?.role === 'EMPLOYEE' ? navigate('/requests?status=DELIVERED') : setCurrentTab('INVENTORY')} 
                        />
                        <MainActionCard 
                          icon={<History className="w-6 h-6" />} 
                          title="Lịch sử của tôi" 
                          desc={currentUser?.role === 'EMPLOYEE' ? 'Xem vật tư đã nhận trước đây' : 'Xuất báo cáo tồn kho, tiêu hao và cấp phát'} 
                          onClick={() => currentUser?.role === 'EMPLOYEE' ? navigate('/requests?status=COMPLETED') : navigate('/analytics')} 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* 3. TASKS TO DO / MY SUMMARY */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">
                          {currentUser?.role === 'EMPLOYEE' ? 'Yêu cầu của tôi' : 'Việc cần làm hôm nay'}
                        </h3>
                        <div className="flex-1 space-y-1">
                            {currentUser?.role === 'EMPLOYEE' ? (
                              <>
                                <TaskRow 
                                    icon={<Clock className="w-4 h-4 text-amber-500" />}
                                    label={`Đang chờ duyệt: ${pendingActions.requests || 0}`}
                                    link="/requests?status=PENDING"
                                />
                                <TaskRow 
                                    icon={<Truck className="w-4 h-4 text-indigo-500" />}
                                    label={`Sẵn sàng nhận: ${pendingActions.receipts || 0}`}
                                    link="/requests?status=DELIVERED"
                                />
                                <TaskRow 
                                    icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                    label={`Đã hoàn tất tháng này: 5`}
                                    link="/requests?status=COMPLETED"
                                />
                              </>
                            ) : (
                              <>
                                <TaskRow 
                                    icon={<Clock className="w-4 h-4 text-slate-400" />}
                                    label={`${pendingActions.requests || 0} ${isManager ? 'yêu cầu chờ bạn duyệt' : 'yêu cầu chờ xử lý'}`}
                                    link="/requests"
                                />
                                {(isAdmin || isWarehouse) && (
                                  <TaskRow 
                                      icon={<ListChecks className="w-4 h-4 text-slate-400" />}
                                      label={`${pendingActions.receipts || 0} phiếu chờ bàn giao`}
                                      link="/warehouse-tickets"
                                  />
                                )}
                                {isAdmin && (
                                  <TaskRow 
                                      icon={<User className="w-4 h-4 text-slate-400" />}
                                      label={`${pendingActions.users || 0} nhân sự mới chờ duyệt`}
                                      link="/users"
                                  />
                                )}
                                <TaskRow 
                                    icon={<AlertCircle className="w-4 h-4 text-slate-400" />}
                                    label={`${stocks.filter(s => s.stock <= 15).length} mặt hàng sắp hết tồn`}
                                    link="#"
                                    onClick={() => setCurrentTab('INVENTORY')}
                                />
                              </>
                            )}
                        </div>
                        <button onClick={() => navigate('/requests')} className="text-center mt-6 text-[10px] font-black uppercase text-indigo-600 tracking-widest hover:underline cursor-pointer">
                            Xem tất cả yêu cầu &rarr;
                        </button>
                    </div>

                    {/* 4. ALERTS / TO DO FOR EMPLOYEE */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">
                          {currentUser?.role === 'EMPLOYEE' ? 'Việc cần làm của tôi' : 'Cảnh báo & Gợi ý'}
                        </h3>
                        <div className="flex-1 space-y-1">
                            {currentUser?.role === 'EMPLOYEE' ? (
                              <>
                                {pendingActions.receipts > 0 && (
                                  <TaskRow 
                                      icon={<AlertCircle className="w-4 h-4 text-rose-400" />}
                                      label={`${pendingActions.receipts} phiếu đang chờ bạn xác nhận nhận hàng`}
                                      link="/requests?status=DELIVERED"
                                      actionLabel="Xác nhận ngay"
                                  />
                                )}
                                <TaskRow 
                                    icon={<AlertCircle className="w-4 h-4 text-rose-400" />}
                                    label={`1 yêu cầu bị trả lại cần chỉnh sửa`}
                                    link="/requests"
                                    actionLabel="Chỉnh sửa"
                                />
                                <TaskRow 
                                    icon={<Bell className="w-4 h-4 text-indigo-400" />}
                                    label={`Gợi ý: Dùng mẫu yêu cầu nhanh`}
                                    link="/requests?mode=CREATE"
                                    actionLabel="Sử dụng"
                                />
                              </>
                            ) : (
                              <>
                                <TaskRow 
                                    icon={<AlertCircle className="w-4 h-4 text-rose-400" />}
                                    label={`${stocks.filter(s => s.stock <= 15).length} mặt hàng sắp hết`}
                                    link="/inventory"
                                    actionLabel="Xem danh sách"
                                />
                                <TaskRow 
                                    icon={<ShoppingBag className="w-4 h-4 text-amber-400" />}
                                    label={`2 mặt hàng cần mua bổ sung`}
                                    link="/purchases"
                                    actionLabel="Xem đề nghị mua"
                                />
                                <TaskRow 
                                    icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                    label={`Gợi ý: Tạo đề nghị mua`}
                                    link="/requests?mode=CREATE"
                                    actionLabel="Tạo ngay"
                                    actionColor="indigo"
                                />
                              </>
                            )}
                        </div>
                        <button className="text-center mt-6 text-[10px] font-black uppercase text-indigo-600 tracking-widest hover:underline cursor-pointer">
                            Xem tất cả &rarr;
                        </button>
                    </div>
                </div>

                {/* 5. QUICK ACCESS BY BUSINESS UNIT - HIDDEN FOR EMPLOYEE */}
                {currentUser?.role !== 'EMPLOYEE' && (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Truy cập nhanh theo nghiệp vụ</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                          <BusinessLink icon={<ShoppingBag className="w-5 h-5"/>} label="Mua sắm PR/PO" onClick={() => navigate('/purchases')} />
                          <BusinessLink icon={<User className="w-5 h-5"/>} label="Yêu cầu cấp phát" onClick={() => navigate('/requests')} />
                          <BusinessLink icon={<Package className="w-5 h-5"/>} label="Tồn kho VPP" onClick={() => navigate('/vpp-inventory')} />
                          <BusinessLink icon={<ShieldCheck className="w-5 h-5"/>} label="Tồn kho Vệ sinh" onClick={() => navigate('/janitorial-inventory')} />
                          <BusinessLink icon={<History className="w-5 h-5"/>} label="Lịch sử xuất nhập" onClick={() => navigate('/warehouse-tickets')} />
                          <BusinessLink icon={<Settings className="w-5 h-5"/>} label="Danh mục hàng hóa" onClick={() => navigate('/items')} />
                      </div>
                  </div>
                )}

                {/* 6. RECENT ACTIVITY LIST */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">
                      {currentUser?.role === 'EMPLOYEE' ? 'Yêu cầu gần đây của tôi' : 'Hoạt động gần đây'}
                    </h3>
                    <div className="divide-y divide-slate-100">
                        {summary?.analytical?.topConsumed?.map((_: any, i: number) => (
                            <ActivityRow 
                                key={i}
                                icon={<FileText className="w-4 h-4 text-slate-400" />}
                                title={`PR-2025-00${i+56} - Yêu cầu mua sắm đã được tạo`}
                                date="20/05/2025 09:10"
                                onClick={() => navigate('/requests')}
                            />
                        ))}
                        <ActivityRow 
                            icon={<Truck className="w-4 h-4 text-slate-400" />}
                            title={`PNK-2025-0042 - Phiếu nhập kho đã được thực hiện`}
                            date="20/05/2025 08:40"
                            onClick={() => navigate('/warehouse-tickets')}
                        />
                        <ActivityRow 
                            icon={<AlertCircle className="w-4 h-4 text-rose-400" />}
                            title={`Mặt hàng "Giấy A4 Double A" sắp dưới mức tồn tối thiểu`}
                            date="20/05/2025 08:05"
                            onClick={() => setCurrentTab('INVENTORY')}
                        />
                    </div>
                    <button className="w-full text-center mt-6 text-[10px] font-black uppercase text-indigo-600 tracking-widest hover:underline cursor-pointer">
                        Xem tất cả hoạt động &rarr;
                    </button>
                </div>

                {/* 7. FOOTER STATUS */}
                <div className="flex justify-between items-center pt-4 text-slate-400 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Hệ thống hoạt động bình thường</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">&copy; 2025 - Hệ thống Quản trị VPP nội bộ | Phiên bản 2.0.0</span>
                </div>
            </div>
          )}

          {currentTab === 'INVENTORY' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Action Bar */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                  <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
                      <button onClick={() => setCurrentInventoryTab('VPP')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentInventoryTab === 'VPP' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Văn Phòng Phẩm</button>
                      <button onClick={() => setCurrentInventoryTab('VE_SINH')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentInventoryTab === 'VE_SINH' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Tạp Hóa / Vệ Sinh</button>
                  </div>
                  <div className="flex items-center gap-4 w-full xl:w-auto">
                    <div className="relative flex-1 xl:w-96">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Tra cứu Mã / Tên vật tư...`}
                        className="w-full pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all font-bold placeholder:text-slate-300"
                      />
                    </div>
                    <button onClick={handleExport} className="p-3.5 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
                      <Download className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Table Area */}
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative z-0">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] italic">
                        <th className="px-10 py-6">Mã Vật Tư</th>
                        <th className="px-10 py-6">Tên Sản Phẩm</th>
                        <th className="px-10 py-6 text-center">Tổng Tồn Hệ Thống</th>
                        <th className="px-10 py-6 text-right">Giá / Đơn Vị</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {displayedStocks.map((item) => {
                        const isLow = item.stock <= 15;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-10 py-6">
                                <span className="font-black text-indigo-600 uppercase tracking-tighter">{item.mvpp}</span>
                            </td>
                            <td className="px-10 py-6">
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">{item.name}</span>
                                    <span className="text-[10px] font-bold text-slate-400 italic">
                                      {item.category} • {item.unit} • Tất cả kho
                                    </span>
                                </div>
                            </td>
                            <td className="px-10 py-6 text-center">
                                <div className={`inline-flex items-center px-4 py-1.5 rounded-xl font-black text-sm shadow-sm ${isLow ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                    {isLow && <AlertCircle className="w-3 h-3 mr-2" />}
                                    {item.stock}
                                </div>
                            </td>
                            <td className="px-10 py-6 text-right text-sm font-black text-slate-600 tabular-nums italic">{formatCurrency(Number(item.price))}</td>
                          </tr>
                        );
                      })}
                      {displayedStocks.length === 0 && (
                        <tr><td colSpan={4} className="px-10 py-20 text-center text-slate-300 font-black uppercase italic tracking-widest italic animate-pulse">Không tìm thấy vật tư lưu kho</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
            </div>
          )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function MainActionCard({ icon, title, desc, onClick }: any) {
    return (
        <button onClick={onClick} className="bg-white p-6 rounded-xl border border-slate-200 text-left flex items-center gap-6 hover:border-indigo-300 hover:shadow-md transition-all group cursor-pointer">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-100 transition-all group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 shrink-0`}>
                {icon}
            </div>
            <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{title}</h4>
                <p className="text-[10px] font-bold text-slate-400 leading-tight uppercase tracking-widest mt-1">{desc}</p>
            </div>
        </button>
    );
}

function TaskRow({ icon, label, link, actionLabel = "Xem chi tiết", actionColor = "indigo" }: any) {
    return (
        <div className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 px-2 rounded-lg transition-colors group">
            <div className="flex items-center gap-3">
                {icon}
                <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{label}</span>
            </div>
            <a href={link} className={`text-[10px] font-black uppercase tracking-widest ${actionColor === 'indigo' ? 'text-indigo-600' : 'text-slate-400'} opacity-0 group-hover:opacity-100 transition-opacity hover:underline`}>
                {actionLabel}
            </a>
        </div>
    );
}

function BusinessLink({ icon, label, onClick }: any) {
    return (
        <button onClick={onClick} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 transition-all group cursor-pointer">
            <div className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0">
                {icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-900 transition-colors leading-tight text-left">{label}</span>
        </button>
    );
}

function ActivityRow({ icon, title, date, onClick }: any) {
    return (
        <div onClick={onClick} className="flex justify-between items-center py-4 group cursor-pointer hover:bg-slate-50 px-2 rounded-xl transition-all">
            <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                    {icon}
                </div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-tight group-hover:text-slate-900">{title}</span>
            </div>
            <div className="flex items-center gap-6">
                <span className="text-[10px] font-bold text-slate-400 font-mono">{date}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Xem chi tiết</span>
            </div>
        </div>
    );
}

