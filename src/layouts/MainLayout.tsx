import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Package, LayoutDashboard, LogOut, FileText, ClipboardList, ShieldAlert, ShoppingCart, Users as UsersIcon, Database, ClipboardCheck, Droplets, TrendingDown, ChevronDown, User, Key } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ProfileDialog from '../components/ProfileDialog';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAppContext();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [dialogTab, setDialogTab] = useState<'info' | 'password'>('info');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getActiveClass = (path: string) => {
    return location.pathname === path 
      ? 'bg-blue-50 text-blue-700 shadow-sm' 
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800';
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 print:h-auto print:bg-white print:block">
      {/* Sidebar */}
      <aside className="no-print w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm hidden md:flex shrink-0 z-20">
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
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative print:h-auto print:overflow-visible">
        {/* Universal Top Header */}
        <header className="no-print bg-white/90 backdrop-blur-md border-b border-slate-200 z-10 shrink-0 sticky top-0">
          <div className="h-16 flex items-center justify-between px-6 md:px-8">
            <div className="flex items-center">
               <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden md:block">Hệ thống Quản Trị VPP nội bộ</h1>
               {currentUser?.role === 'ADMIN' && <span className="ml-4 bg-rose-100 text-rose-700 font-bold text-xs px-2 py-1 rounded flex items-center"><ShieldAlert className="w-3 h-3 mr-1"/> Quyền Admin</span>}
            </div>
            <div className="flex items-center gap-4">
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-3 p-1 pr-4 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all shadow-sm cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black border-2 border-white shadow-sm overflow-hidden transform group-hover:scale-105 transition-transform">
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm uppercase">{currentUser?.fullName ? currentUser?.fullName.charAt(0) : currentUser?.username.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-start hidden sm:flex">
                     <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Tài khoản</span>
                     <span className="text-xs font-black text-slate-700 max-w-[120px] truncate">{currentUser?.fullName || currentUser?.username}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showProfileDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-[100] animate-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-slate-50 mb-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang đăng nhập</p>
                       <p className="text-xs font-black text-indigo-600 truncate">@{currentUser?.username}</p>
                    </div>
                    
                    <button 
                      onClick={() => { setShowProfileDialog(true); setDialogTab('info'); setShowProfileDropdown(false); }}
                      className="w-full flex items-center px-4 py-3 text-xs font-black text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all gap-3"
                    >
                      <User className="w-4 h-4" /> Hồ sơ cá nhân
                    </button>
                    
                    <button 
                      onClick={() => { setShowProfileDialog(true); setDialogTab('password'); setShowProfileDropdown(false); }}
                      className="w-full flex items-center px-4 py-3 text-xs font-black text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all gap-3"
                    >
                      <Key className="w-4 h-4" /> Đổi mật khẩu
                    </button>

                    <div className="h-px bg-slate-50 my-1 mx-2"></div>

                    <button 
                      onClick={() => { logout(); navigate('/'); }}
                      className="w-full flex items-center px-4 py-3 text-xs font-black text-rose-500 hover:bg-rose-50 rounded-2xl transition-all gap-3"
                    >
                      <LogOut className="w-4 h-4" /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Profile Dialog */}
        <ProfileDialog 
          isOpen={showProfileDialog} 
          onClose={() => setShowProfileDialog(false)} 
          initialTab={dialogTab}
        />

        {/* Dynamic Page Component Outlet */}
        <div className="flex-1 overflow-hidden bg-slate-50 flex flex-col print:h-auto print:overflow-visible print:bg-white">
           <Outlet />
        </div>
      </main>
    </div>
  );
}
