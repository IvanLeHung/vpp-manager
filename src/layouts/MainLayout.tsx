import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Package,
  LayoutDashboard,
  LogOut,
  FileText,
  ClipboardList,
  ShieldAlert,
  ShoppingCart,
  Users as UsersIcon,
  Database,
  ClipboardCheck,
  Droplets,
  TrendingDown,
  ChevronDown,
  User,
  Key,
  Activity,
  PlusCircle,
  CheckSquare,
  BarChart3,
  Folder,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ProfileDialog from '../components/ProfileDialog';
import NotificationBell from '../components/NotificationBell';

type SidebarState = 'visible' | 'hidden';
type NavMode = 'full' | 'rail';

const readSidebarState = (key: string): SidebarState => {
  try {
    return localStorage.getItem(key) === 'hidden' ? 'hidden' : 'visible';
  } catch {
    return 'visible';
  }
};

const writeSidebarState = (key: string, value: SidebarState) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Keep the default visible fallback if storage is unavailable.
  }
};

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAppContext();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [dialogTab, setDialogTab] = useState<'info' | 'password'>('info');
  const [desktopSidebar, setDesktopSidebar] = useState<SidebarState>(() => readSidebarState('sidebarState.desktop'));
  const [laptopSidebar, setLaptopSidebar] = useState<SidebarState>(() => readSidebarState('sidebarState.laptop'));
  const [tabletDrawerOpen, setTabletDrawerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!tabletDrawerOpen) return;

    drawerRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTabletDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tabletDrawerOpen]);

  useEffect(() => {
    if (tabletDrawerOpen) {
      setTabletDrawerOpen(false);
      menuButtonRef.current?.focus();
    }
  }, [location.pathname, location.search]);

  const getActiveClass = (path: string) => {
    return location.pathname === path
      ? 'bg-blue-50 text-blue-700 shadow-sm'
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800';
  };

  const navigateTo = (path: string) => {
    navigate(path);
    setTabletDrawerOpen(false);
    menuButtonRef.current?.focus();
  };

  const toggleResponsiveSidebar = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches) {
      const next = desktopSidebar === 'visible' ? 'hidden' : 'visible';
      setDesktopSidebar(next);
      writeSidebarState('sidebarState.desktop', next);
      return;
    }

    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      const next = laptopSidebar === 'visible' ? 'hidden' : 'visible';
      setLaptopSidebar(next);
      writeSidebarState('sidebarState.laptop', next);
      return;
    }

    setTabletDrawerOpen((open) => !open);
  };

  const navButtonClass = (path: string, mode: NavMode) =>
    mode === 'rail'
      ? `w-11 h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer ${getActiveClass(path)}`
      : `w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${getActiveClass(path)}`;

  const NavButton = ({
    path,
    icon,
    label,
    mode = 'full'
  }: {
    path: string;
    icon: ReactNode;
    label: string;
    mode?: NavMode;
  }) => (
    <button
      type="button"
      title={mode === 'rail' ? label : undefined}
      aria-label={label}
      className={navButtonClass(path, mode)}
      onClick={() => navigateTo(path)}
    >
      <span className={mode === 'rail' ? 'flex shrink-0' : 'mr-3 flex shrink-0'}>{icon}</span>
      {mode === 'full' && <span className="text-left whitespace-normal leading-snug">{label}</span>}
    </button>
  );

  const NavSection = ({ label, tone = 'indigo', mode = 'full' }: { label: string; tone?: 'indigo' | 'rose' | 'slate'; mode?: NavMode }) => {
    if (mode === 'rail') return <div className="h-px bg-slate-100 my-2" aria-hidden="true" />;
    const toneClass = tone === 'rose' ? 'text-rose-500' : tone === 'slate' ? 'text-slate-400' : 'text-indigo-500';
    return <div className={`pt-6 pb-2 px-2 text-[11px] font-black uppercase tracking-wider ${toneClass}`}>{label}</div>;
  };

  const renderNavigation = (mode: NavMode) => (
    <nav className={mode === 'rail' ? 'flex-1 px-2 py-4 space-y-2 overflow-y-auto' : 'flex-1 px-4 py-6 space-y-2 overflow-y-auto'}>
      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
        <>
          {currentUser?.role === 'ADMIN' && (
            <NavButton path="/dashboard" icon={<Package className="w-5 h-5" />} label="Quản lý Kho Tổng" mode={mode} />
          )}
          {currentUser?.role === 'ADMIN' && (
            <NavButton path="/purchase-orders" icon={<ShoppingCart className="w-5 h-5" />} label="Mua Sắm (PR/PO)" mode={mode} />
          )}
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
            <NavButton path="/receipts" icon={<Package className="w-5 h-5" />} label="Kiểm & Nhập Kho" mode={mode} />
          )}
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
            <NavButton path="/warehouse-tickets" icon={<ClipboardCheck className="w-5 h-5" />} label="Phiếu kho" mode={mode} />
          )}
          <NavButton path="/requests" icon={<ClipboardList className="w-5 h-5" />} label="Yêu Cầu Cấp Phát" mode={mode} />
          <NavButton path="/procurement-batches" icon={<Folder className="w-5 h-5" />} label="Batch Hồ Sơ" mode={mode} />
          {currentUser?.role === 'ADMIN' && (
            <NavButton path="/inventory-report" icon={<FileText className="w-5 h-5" />} label="Lịch sử Xuat Nhap" mode={mode} />
          )}
          <NavButton path="/analytics" icon={<LayoutDashboard className="w-5 h-5" />} label="Báo cáo thống kê" mode={mode} />

          <NavSection label="Văn phòng phẩm" mode={mode} />
          <NavButton path="/office-supplies-warehouse" icon={<Package className="w-5 h-5" />} label="Tồn kho VPP" mode={mode} />

          <NavSection label="Tạp hóa / Vệ sinh" tone="rose" mode={mode} />
          <NavButton path="/janitorial-warehouse" icon={<Droplets className="w-5 h-5" />} label="Tồn kho Vệ sinh" mode={mode} />
          <NavButton path="/janitorial-reports" icon={<TrendingDown className="w-5 h-5" />} label="Báo cáo Tieu hao" mode={mode} />

          <NavSection label="Hệ thống" tone="slate" mode={mode} />
          <NavButton path="/users" icon={<UsersIcon className="w-5 h-5" />} label="Quản lý Nhân sự" mode={mode} />
          {currentUser?.role === 'ADMIN' && (
            <NavButton path="/items" icon={<Database className="w-5 h-5" />} label="Danh mục Hàng hóa" mode={mode} />
          )}
          {currentUser?.role === 'ADMIN' && (
            <NavButton path="/audit-logs" icon={<Activity className="w-5 h-5" />} label="Nhật ký hệ thống" mode={mode} />
          )}
        </>
      )}

      {currentUser?.role === 'MANAGER' && (
        <>
          <NavSection label="Tổng quan" mode={mode} />
          <NavButton path="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Trang phê duyệt" mode={mode} />
          <NavSection label="Phê duyệt" mode={mode} />
          <NavButton path="/requests/pending" icon={<ClipboardList className="w-5 h-5" />} label="Chờ tôi duyệt" mode={mode} />
          <NavButton path="/requests/processed" icon={<CheckSquare className="w-5 h-5" />} label="Đã xử lý" mode={mode} />
          <NavButton path="/requests" icon={<Activity className="w-5 h-5" />} label="Yêu cầu bo phan" mode={mode} />
          <NavSection label="Nhân sự" mode={mode} />
          <NavButton path="/users" icon={<UsersIcon className="w-5 h-5" />} label="Đội ngũ của tôi" mode={mode} />
          <NavSection label="Báo cáo" mode={mode} />
          <NavButton path="/analytics" icon={<BarChart3 className="w-5 h-5" />} label="Báo cáo bộ phận" mode={mode} />
          <NavButton path="/procurement-batches" icon={<Folder className="w-5 h-5" />} label="Batch Hồ Sơ" mode={mode} />
          <NavSection label="Hỗ trợ" tone="slate" mode={mode} />
          <NavButton path="/help" icon={<FileText className="w-5 h-5" />} label="Hướng dẫn sử dụng" mode={mode} />
          <NavButton path="/contact" icon={<UsersIcon className="w-5 h-5" />} label="Liên hệ hành chính" mode={mode} />
        </>
      )}

      {currentUser?.role === 'EMPLOYEE' && (
        <>
          <NavSection label="Yêu cầu" mode={mode} />
          <NavButton path="/requests?mode=CREATE" icon={<PlusCircle className="w-5 h-5" />} label="Tạo yêu cầu" mode={mode} />
          <NavButton path="/requests" icon={<ClipboardList className="w-5 h-5" />} label="Yêu cầu cua toi" mode={mode} />
          <NavSection label="Lịch sử" mode={mode} />
          <NavButton path="/allocation-history" icon={<Activity className="w-5 h-5" />} label="Lịch sử cap phat" mode={mode} />
          <NavSection label="Hỗ trợ" tone="slate" mode={mode} />
          <NavButton path="/help" icon={<FileText className="w-5 h-5" />} label="Hướng dẫn sử dụng" mode={mode} />
          <NavButton path="/contact" icon={<UsersIcon className="w-5 h-5" />} label="Liên hệ hành chính" mode={mode} />
        </>
      )}
    </nav>
  );

  return (
    <div
      className="app-shell flex h-screen bg-slate-50 font-sans text-slate-900 print:h-auto print:bg-white print:block app-container"
      data-desktop-sidebar={desktopSidebar}
      data-laptop-sidebar={laptopSidebar}
    >
      <aside className="app-sidebar no-print print:hidden bg-white border-r border-slate-200 flex-col shadow-sm shrink-0 z-20">
        <div className="h-16 flex items-center px-5 border-b border-slate-100 mt-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl mr-3 shadow-md">D</div>
          <span className="text-lg font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">VPP Danko Group</span>
        </div>

        {renderNavigation('full')}

        <div className="p-4 border-t border-slate-100">
          <button className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all shadow-sm cursor-pointer" onClick={() => navigateTo('/')}>
            <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
          </button>
        </div>
      </aside>

      <aside className="tablet-rail no-print print:hidden bg-white border-r border-slate-200 flex-col shadow-sm shrink-0 z-20" aria-label="Điều hướng nhanh">
        <div className="h-16 flex items-center justify-center border-b border-slate-100 mt-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">D</div>
        </div>
        {renderNavigation('rail')}
      </aside>

      {tabletDrawerOpen && (
        <div className="tablet-drawer-layer no-print print:hidden fixed inset-0 z-[120]">
          <button
            type="button"
            aria-label="Đóng menu dieu huong"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              setTabletDrawerOpen(false);
              menuButtonRef.current?.focus();
            }}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-label="Menu điều hướng"
            tabIndex={-1}
            className="tablet-drawer-panel absolute left-0 top-0 h-full w-[320px] max-w-[86vw] bg-white shadow-2xl border-r border-slate-200 flex flex-col outline-none"
          >
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 mt-2">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl mr-3 shadow-md">D</div>
                <span className="text-lg font-bold text-slate-800">VPP Danko</span>
              </div>
              <button
                type="button"
                aria-label="Đóng menu"
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"
                onClick={() => {
                  setTabletDrawerOpen(false);
                  menuButtonRef.current?.focus();
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavigation('full')}
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden relative print:h-auto print:overflow-visible">
        <header className="no-print print:hidden bg-white/90 backdrop-blur-md border-b border-slate-200 z-[100] shrink-0 sticky top-0">
          <div className="h-16 flex items-center justify-between px-4 md:px-6 lg:px-8">
            <div className="flex items-center min-w-0 gap-3">
              <button
                ref={menuButtonRef}
                type="button"
                aria-label={tabletDrawerOpen ? 'Đóng menu dieu huong' : 'Mở menu điều hướng'}
                aria-expanded={tabletDrawerOpen}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
                onClick={toggleResponsiveSidebar}
              >
                <Menu className="w-5 h-5 tablet-menu-icon" />
                <PanelLeftOpen className="w-5 h-5 desktop-menu-open-icon hidden" />
                <PanelLeftClose className="w-5 h-5 desktop-menu-close-icon hidden" />
              </button>
              <h1 className="text-lg lg:text-xl font-bold text-slate-800 tracking-tight truncate">
                {currentUser?.role === 'EMPLOYEE' ? 'Cửa sổ Nhân viên Danko' : 'Hệ thống Quan tri VPP noi bo'}
              </h1>
              {currentUser?.role === 'ADMIN' && <span className="admin-badge bg-rose-100 text-rose-700 font-bold text-xs px-2 py-1 rounded flex items-center"><ShieldAlert className="w-3 h-3 mr-1"/> Quyền Admin</span>}
            </div>

            <div className="flex items-center gap-3 md:gap-4">
              <NotificationBell />
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-3 p-1 pr-3 md:pr-4 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all shadow-sm cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black border-2 border-white shadow-sm overflow-hidden transform group-hover:scale-105 transition-transform">
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm uppercase">{currentUser?.fullName ? currentUser?.fullName.charAt(0) : currentUser?.username.charAt(0)}</span>
                    )}
                  </div>
                  <div className="user-label flex flex-col items-start">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Tài khoản</span>
                    <span className="text-xs font-black text-slate-700 max-w-[140px] truncate">{currentUser?.fullName || currentUser?.username}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showProfileDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showProfileDropdown && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-slate-50 mb-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang đăng nhập</p>
                      <p className="text-xs font-black text-indigo-600 truncate">@{currentUser?.username}</p>
                    </div>

                    <button onClick={() => { setShowProfileDialog(true); setDialogTab('info'); setShowProfileDropdown(false); }} className="w-full flex items-center px-4 py-3 text-xs font-black text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all gap-3">
                      <User className="w-4 h-4" /> Hồ sơ cá nhân
                    </button>

                    <button onClick={() => { setShowProfileDialog(true); setDialogTab('password'); setShowProfileDropdown(false); }} className="w-full flex items-center px-4 py-3 text-xs font-black text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all gap-3">
                      <Key className="w-4 h-4" /> Đổi mật khẩu
                    </button>

                    <div className="h-px bg-slate-50 my-1 mx-2"></div>

                    <button onClick={() => { logout(); navigate('/'); }} className="w-full flex items-center px-4 py-3 text-xs font-black text-rose-500 hover:bg-rose-50 rounded-2xl transition-all gap-3">
                      <LogOut className="w-4 h-4" /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <ProfileDialog isOpen={showProfileDialog} onClose={() => setShowProfileDialog(false)} initialTab={dialogTab} />

        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 flex flex-col print:h-auto print:overflow-visible print:bg-white min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

