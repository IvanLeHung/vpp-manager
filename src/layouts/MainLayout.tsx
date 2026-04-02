import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Package, LayoutDashboard, LogOut, FileText, ClipboardList, ShieldAlert, ShoppingCart, Users as UsersIcon, Database, ClipboardCheck, Droplets, TrendingDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAppContext();

  const getActiveClass = (path: string) => {
    return location.pathname === path 
      ? 'bg-blue-50 text-blue-700 shadow-sm' 
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800';
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm hidden md:flex shrink-0 z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-100 mt-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl mr-3 shadow-md">D</div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">Danko VPP</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {currentUser?.role === 'ADMIN' && (
            <button className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${getActiveClass('/dashboard')}`} onClick={() => navigate('/dashboard')}>
              <Package className="w-5 h-5 mr-3" /> Quản lý Kho Tổng
            </button>
          )}
          {currentUser?.role === 'ADMIN' && (
            <button className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${getActiveClass('/purchase-orders')}`} onClick={() => navigate('/purchase-orders')}>
              <ShoppingCart className="w-5 h-5 mr-3" /> Mua Sắm (PR/PO)
            </button>
          )}
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
            <button className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${getActiveClass('/receipts')}`} onClick={() => navigate('/receipts')}>
              <Package className="w-5 h-5 mr-3" /> Kiểm & Nhập Kho
            </button>
          )}
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
            <button className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${getActiveClass('/warehouse-tickets')}`} onClick={() => navigate('/warehouse-tickets')}>
              <ClipboardCheck className="w-5 h-5 mr-3" /> Phiếu kho
            </button>
          )}
          <button className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${getActiveClass('/requests')}`} onClick={() => navigate('/requests')}>
            <ClipboardList className="w-5 h-5 mr-3" /> Yêu Cầu Cấp Phát
          </button>
          {currentUser?.role === 'ADMIN' && (
            <button className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${getActiveClass('/inventory-report')}`} onClick={() => navigate('/inventory-report')}>
              <FileText className="w-5 h-5 mr-3" /> Lịch sử Xuất Nhập
            </button>
          )}
          
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
            <button className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${getActiveClass('/analytics')}`} onClick={() => navigate('/analytics')}>
              <LayoutDashboard className="w-5 h-5 mr-3" /> Báo cáo thống kê
            </button>
          )}

          {/* JANITORIAL WAREHOUSE GROUP */}
          <div className="pt-6 pb-2 px-2 text-[11px] font-black text-rose-500 uppercase tracking-wider">Tạp hóa / Vệ sinh</div>
          
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
            <button className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${getActiveClass('/janitorial-warehouse')}`} onClick={() => navigate('/janitorial-warehouse')}>
              <Droplets className="w-5 h-5 mr-3" /> Tồn kho Vệ sinh
            </button>
          )}
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
            <button className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${getActiveClass('/janitorial-tickets')}`} onClick={() => navigate('/janitorial-tickets')}>
              <ClipboardCheck className="w-5 h-5 mr-3" /> Phiếu kho Vệ sinh
            </button>
          )}
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
            <button className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${getActiveClass('/janitorial-reports')}`} onClick={() => navigate('/janitorial-reports')}>
              <TrendingDown className="w-5 h-5 mr-3" /> Báo cáo Tiêu hao
            </button>
          )}
          
          <div className="pt-6 pb-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Hệ thống</div>
          
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
            <button className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${getActiveClass('/users')}`} onClick={() => navigate('/users')}>
              <UsersIcon className="w-5 h-5 mr-3" /> Quản lý Nhân sự
            </button>
          )}

          {currentUser?.role === 'ADMIN' && (
            <button className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-cursor-pointer ${getActiveClass('/items')}`} onClick={() => navigate('/items')}>
              <Database className="w-5 h-5 mr-3" /> Danh mục Hàng hoá
            </button>
          )}
        </nav>
        
        <div className="p-4 border-t border-slate-100">
          <button className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all shadow-sm cursor-pointer" onClick={() => navigate('/')}>
            <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Universal Top Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 z-10 shrink-0 sticky top-0">
          <div className="h-16 flex items-center justify-between px-6 md:px-8">
            <div className="flex items-center">
               <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden md:block">Hệ thống Quản Trị VPP nội bộ</h1>
               {currentUser?.role === 'ADMIN' && <span className="ml-4 bg-rose-100 text-rose-700 font-bold text-xs px-2 py-1 rounded flex items-center"><ShieldAlert className="w-3 h-3 mr-1"/> Quyền Admin</span>}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-full px-4 py-1.5 shadow-sm">
                 <span className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-wide">Tài khoản:</span>
                 <span className="text-sm font-bold text-indigo-700">
                   {currentUser?.fullName || currentUser?.username} [{currentUser?.role}]
                 </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 shadow-sm text-lg uppercase">
                {currentUser?.fullName ? currentUser?.fullName.charAt(0) : currentUser?.username.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Component Outlet */}
        <div className="flex-1 overflow-hidden bg-slate-50 flex flex-col">
           <Outlet />
        </div>
      </main>
    </div>
  );
}
