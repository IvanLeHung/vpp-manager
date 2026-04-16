import { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  Plus, 
  Edit2, 
  Key, 
  XCircle, 
  Building2, 
  UserPlus, 
  Target,
  ChevronRight,
  Activity,
  ShieldCheck,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Lock,
  Unlock,
  UserCheck,
  LayoutDashboard,
  ArrowRight
} from 'lucide-react';
import api from '../lib/api';
import { useAppContext } from '../context/AppContext';

// Types
type UserData = {
  id: string;
  username: string;
  fullName: string;
  departmentId: string | null;
  departmentName: string | null;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'WAREHOUSE';
  isActive: boolean;
  managerId: string | null;
  managerName: string | null;
  createdAt: string;
};

type DepartmentData = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  userCount: number;
  managerUserId: string | null;
  managerName: string | null;
  updatedAt: string;
};

export default function Users() {
  const { currentUser } = useAppContext();
  
  // State for Tabs
  const [activeTab, setActiveTab] = useState<'users' | 'departments'>('users');
  const [loading, setLoading] = useState(true);

  // State for Users
  const [userViewMode, setUserViewMode] = useState<'ALL' | 'MY_DIRECTS'>('ALL');
  const [users, setUsers] = useState<UserData[]>([]);
  const [managers, setManagers] = useState<{id: string, fullName: string, username: string}[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: '', password: '', fullName: '', departmentId: '', role: 'EMPLOYEE' as any, isActive: true, managerId: ''
  });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '' });

  // State for Departments
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentData | null>(null);
  const [deptFormData, setDeptFormData] = useState({
    code: '', name: '', isActive: true, managerUserId: ''
  });

  // State for Filtering Departments
  const [deptSearch, setDeptSearch] = useState('');
  const [deptStatusFilter, setDeptStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  if (!currentUser) return null;

  const fetchData = async () => {
    setLoading(true);
    console.log('[Users.tsx] Fetching all HR data...');

    // 1. Fetch Users
    try {
      const userEndpoint = (currentUser.role === 'MANAGER' && userViewMode === 'MY_DIRECTS') ? '/users/my-employees' : '/users';
      console.log(`[Users.tsx] Fetching users from ${userEndpoint}...`);
      const usersRes = await api.get(userEndpoint);
      setUsers(usersRes.data.data || []);
      console.log(`[Users.tsx] Loaded ${usersRes.data.data?.length} users`);
    } catch (error) {
      console.error('[Users.tsx] Lỗi tải danh sách nhân viên:', error);
    }

    // 2. Fetch Departments
    try {
      console.log('[Users.tsx] Fetching departments...');
      const deptsRes = await api.get('/departments');
      setDepartments(deptsRes.data.data || []);
      console.log(`[Users.tsx] Loaded ${deptsRes.data.data?.length} departments`);
    } catch (error) {
      console.error('[Users.tsx] Lỗi tải danh sách phòng ban:', error);
    }

    // 3. Fetch Managers (dropdown)
    try {
      console.log('[Users.tsx] Fetching managers for dropdown...');
      const managersRes = await api.get('/users/managers');
      setManagers(managersRes.data.data || []);
      console.log(`[Users.tsx] Loaded ${managersRes.data.data?.length} managers`);
    } catch (error) {
      console.error('[Users.tsx] Lỗi tải danh sách quản lý:', error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, userViewMode]);

  // Filtered Departments
  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = dept.name.toLowerCase().includes(deptSearch.toLowerCase()) || 
                          dept.code.toLowerCase().includes(deptSearch.toLowerCase());
    const matchesStatus = deptStatusFilter === 'ALL' || 
                          (deptStatusFilter === 'ACTIVE' && dept.isActive) || 
                          (deptStatusFilter === 'INACTIVE' && !dept.isActive);
    return matchesSearch && matchesStatus;
  });

  // Stats for Departments
  const deptStats = {
    total: departments.length,
    withHead: departments.filter(d => d.managerUserId).length,
    pendingHead: departments.filter(d => !d.managerUserId).length
  };

  // ─── ACTIONS ──────────────────────────────────────────────

  const handleUserSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...userFormData, managerId: userFormData.managerId || null, departmentId: userFormData.departmentId || null };
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        alert('Cập nhật nhân viên thành công');
      } else {
        await api.post('/users', payload);
        alert('Tạo tài khoản nhân viên thành công');
      }
      setShowUserModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleDeptSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...deptFormData, managerUserId: deptFormData.managerUserId || null };
      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, payload);
        alert('Cập nhật phòng ban thành công');
      } else {
        await api.post('/departments', payload);
        alert('Tạo phòng ban mới thành công');
      }
      setShowDeptModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const toggleDeptStatus = async (dept: DepartmentData) => {
    try {
      await api.patch(`/departments/${dept.id}/status`, { isActive: !dept.isActive });
      fetchData();
      setActiveMenuId(null);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingUser) return;
      await api.patch(`/users/${editingUser.id}/password`, passwordForm);
      alert('Đổi mật khẩu thành công');
      setShowPasswordModal(false);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const toggleUserStatus = async (user: UserData) => {
    if (!confirm(`Bạn muốn ${user.isActive ? 'khoá' : 'mở khoá'} tài khoản ${user.username}?`)) return;
    try {
      await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full h-full flex flex-col bg-slate-50/50 min-h-[calc(100vh-64px)] overflow-hidden">
      
      {/* ─── Compact Header & Breadcrumbs ─── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
           <nav className="flex items-center text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-[0.2em]">
             <LayoutDashboard className="w-3 h-3 mr-1.5" />
             <span>Hệ thống</span>
             <ChevronRight className="w-3 h-3 mx-1.5 opacity-50" />
             <span className="text-indigo-500/80">Quản lý Nhân sự</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-800 flex items-center tracking-tight">
            Quản lý Nhân sự
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Quản lý cơ cấu tổ chức, phòng ban và phân quyền nhân sự</p>
        </div>

        {/* Segmented Tab Switch */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200 shadow-inner self-stretch lg:self-auto min-w-[280px]">
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <UsersIcon className="w-3.5 h-3.5 mr-2" />
            Nhân viên
          </button>
          <button 
            onClick={() => setActiveTab('departments')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'departments' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Building2 className="w-3.5 h-3.5 mr-2" />
            Phòng ban
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {activeTab === 'users' ? (
          /* ─── USERS TAB (LEGACY STYLE POLISHED) ─── */
          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex-1 flex flex-col overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 backdrop-blur-md sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center tracking-tight">
                   Nhân viên <span className="ml-3 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded-full uppercase tracking-widest">{users.length}</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                   {userViewMode === 'ALL' ? 'Danh sách toàn bộ nhân viên hệ thống' : 'Danh sách nhân viên do bạn quản lý trực tiếp'}
                </p>
              </div>

              {/* Sub-tabs for Users (Manager Only) */}
              {currentUser.role === 'MANAGER' && (
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button 
                    onClick={() => setUserViewMode('ALL')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${userViewMode === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    TẤT CẢ
                  </button>
                  <button 
                    onClick={() => setUserViewMode('MY_DIRECTS')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${userViewMode === 'MY_DIRECTS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    TÔI QUẢN LÝ
                  </button>
                </div>
              )}

              {currentUser.role === 'ADMIN' && (
                <button onClick={() => { setEditingUser(null); setUserFormData({ username: '', password: '', fullName: '', departmentId: '', role: 'EMPLOYEE', isActive: true, managerId: '' }); setShowUserModal(true); }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 flex items-center transform active:scale-95 text-xs uppercase tracking-wider">
                  <Plus className="w-4 h-4 mr-2" /> Thêm Nhân viên
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50/80 sticky top-0 z-20 backdrop-blur-sm">
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic border-b border-slate-100">
                    <th className="px-8 py-5">Họ và Tên</th>
                    <th className="px-8 py-5">Đơn vị / Phòng ban</th>
                    <th className="px-8 py-5">Quản lý trực tiếp</th>
                    <th className="px-8 py-5">Vai trò</th>
                    <th className="px-8 py-5 text-center">Trạng thái</th>
                    <th className="px-8 py-5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-300 font-bold animate-pulse">Truy xuất dữ liệu...</td></tr>
                  ) : users.map(user => (
                    <tr key={user.id} className="group hover:bg-indigo-50/20 transition-all duration-300">
                      <td className="px-8 py-5">
                         <div className="flex items-center">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs mr-4 transition-transform group-hover:scale-105 shadow-sm border ${user.role === 'ADMIN' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                              {user.fullName.split(' ').pop()?.[0] || 'U'}
                           </div>
                           <div>
                             <div className="font-black text-slate-800 text-sm tracking-tight">{user.fullName}</div>
                             <div className="text-[10px] text-slate-400 font-bold font-mono">@{user.username}</div>
                           </div>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center">
                            <Building2 className="w-3.5 h-3.5 mr-2 text-slate-300" />
                            <span className={`text-xs font-bold ${user.departmentName ? 'text-slate-700' : 'text-slate-300 italic'}`}>{user.departmentName || 'Chưa gán'}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         {user.role !== 'ADMIN' ? (
                           <div className="flex items-center">
                              <Target className="w-3.5 h-3.5 mr-2 text-indigo-300" />
                              <span className={`text-xs font-black ${user.managerName ? 'text-indigo-600' : 'text-amber-500 font-medium'}`}>{user.managerName || 'Chưa gán Manager'}</span>
                           </div>
                         ) : <span className="text-slate-200">-</span>}
                      </td>
                      <td className="px-8 py-5">
                         <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border
                            ${user.role === 'ADMIN' ? 'bg-rose-50 text-rose-600 border-rose-100' : user.role === 'MANAGER' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {user.role}
                         </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                         <button disabled={currentUser.role !== 'ADMIN'} onClick={() => toggleUserStatus(user)} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-sm transition-all ${user.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-500 hover:bg-rose-200'}`}>
                            {user.isActive ? 'Hoạt động' : 'Đã Khóa'}
                         </button>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingUser(user); setUserFormData({ username: user.username, password: '', fullName: user.fullName, departmentId: user.departmentId || '', role: user.role, isActive: user.isActive, managerId: user.managerId || '' }); setShowUserModal(true); }} className="p-2 text-indigo-600 hover:bg-white hover:shadow-md rounded-xl transition"><Edit2 className="w-4 h-4" /></button>
                            {currentUser.role === 'ADMIN' && <button onClick={() => { setEditingUser(user); setPasswordForm({ newPassword: '' }); setShowPasswordModal(true); }} className="p-2 text-amber-500 hover:bg-white hover:shadow-md rounded-xl transition"><Key className="w-4 h-4" /></button>}
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ─── DEPARTMENTS TAB (REFACTORED UI) ─── */
          <div className="flex flex-col flex-1 overflow-hidden space-y-6">
            
            {/* 1. Mini Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-500">
               <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/40 flex items-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4 shadow-sm">
                     <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng phòng ban</p>
                     <p className="text-2xl font-black text-slate-800">{deptStats.total}</p>
                  </div>
               </div>
               <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/40 flex items-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mr-4 shadow-sm">
                     <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã có Trưởng phòng</p>
                     <p className="text-2xl font-black text-slate-800">{deptStats.withHead}</p>
                  </div>
               </div>
               <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/40 flex items-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mr-4 shadow-sm">
                     <Activity className="w-6 h-6" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chưa chỉ định Head</p>
                     <p className="text-2xl font-black text-slate-800">{deptStats.pendingHead}</p>
                  </div>
               </div>
            </div>

            {/* 2. Main Card with Toolbar & Table */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-white flex-1 flex flex-col overflow-hidden relative">
               
               {/* Toolbar */}
               <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-50">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full lg:w-auto">
                    <div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">Phòng ban</h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Quản lý đơn vị, trưởng bộ phận và nhân sự</p>
                    </div>

                    <div className="h-8 w-px bg-slate-100 hidden md:block mx-2"></div>

                    <div className="relative group w-full md:w-80">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                       <input 
                          type="text" 
                          placeholder="Tìm tên phòng ban / mã..." 
                          value={deptSearch}
                          onChange={(e) => setDeptSearch(e.target.value)}
                          className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-sm text-slate-700 shadow-inner"
                       />
                    </div>

                    <div className="relative group min-w-[180px]">
                       <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                       <select 
                          value={deptStatusFilter}
                          onChange={(e) => setDeptStatusFilter(e.target.value as any)}
                          className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-sm text-slate-700 appearance-none shadow-inner"
                       >
                          <option value="ALL">Tất cả Trạng thái</option>
                          <option value="ACTIVE">Đang hoạt động</option>
                          <option value="INACTIVE">Tạm khóa</option>
                       </select>
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                          <ChevronRight className="w-4 h-4 rotate-90" />
                       </div>
                    </div>
                  </div>

                  {currentUser.role === 'ADMIN' && (
                    <button onClick={() => { setEditingDept(null); setDeptFormData({ code: '', name: '', isActive: true, managerUserId: '' }); setShowDeptModal(true); }} className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition shadow-xl shadow-indigo-200 flex items-center transform active:scale-95 text-xs uppercase tracking-widest">
                       <Plus className="w-5 h-5 mr-2" /> Thêm phòng ban
                    </button>
                  )}
               </div>

               {/* Table Container */}
               <div className="flex-1 overflow-auto custom-scrollbar relative">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-slate-50/60 sticky top-0 z-30 backdrop-blur-md">
                      <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic border-b border-slate-100">
                        <th className="px-10 py-6">Phòng ban</th>
                        <th className="px-10 py-6">Trưởng bộ phận</th>
                        <th className="px-10 py-6 text-center">Nhân sự</th>
                        <th className="px-10 py-6 text-center">Trạng thái</th>
                        <th className="px-10 py-6 text-right pr-12">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 italic-last-step">
                      {loading ? (
                        <tr><td colSpan={5} className="px-10 py-24 text-center text-slate-300 font-bold animate-pulse text-lg tracking-widest uppercase">Đang đồng bộ dữ liệu...</td></tr>
                      ) : filteredDepartments.length === 0 ? (
                        <tr><td colSpan={5} className="px-10 py-32 text-center">
                           <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                              <Building2 className="w-10 h-10 text-slate-200" />
                           </div>
                           <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Không tìm thấy phòng ban nào</p>
                           <p className="text-xs text-slate-300 mt-2">Vui lòng kiểm tra lại điều kiện lọc hoặc từ khóa tìm kiếm</p>
                        </td></tr>
                      ) : (
                        filteredDepartments.map(dept => (
                          <tr key={dept.id} className="group hover:bg-indigo-50/15 transition-all duration-300">
                            <td className="px-10 py-7">
                               <div className="flex items-center">
                                  <div className="w-12 h-12 rounded-[1.25rem] bg-white border-2 border-slate-100 shadow-sm flex items-center justify-center text-slate-400 font-black text-[11px] mr-5 group-hover:border-indigo-200 group-hover:text-indigo-500 transition-all duration-300 transform group-hover:rotate-6">
                                     {dept.code}
                                  </div>
                                  <div>
                                     <div className="font-black text-slate-800 uppercase text-sm tracking-tight group-hover:text-indigo-600 transition-colors">{dept.name}</div>
                                     <div className="text-[10px] text-slate-400 font-bold mt-0.5 tracking-wider font-mono">Code: {dept.code}</div>
                                  </div>
                               </div>
                            </td>
                            <td className="px-10 py-7">
                               {dept.managerName ? (
                                 <div className="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-xs border border-indigo-100 shadow-sm">
                                    <UserCheck className="w-3.5 h-3.5 mr-2" />
                                    {dept.managerName}
                                 </div>
                               ) : (
                                 <div className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-slate-200 italic">
                                    Chưa chỉ định Head
                                 </div>
                               )}
                            </td>
                            <td className="px-10 py-7 text-center">
                               <button 
                                  onClick={() => { setActiveTab('users'); /* In real app, would filter users by this dept */ }}
                                  className="inline-flex items-center px-4 py-2 bg-white hover:bg-white text-slate-600 rounded-2xl text-[10px] font-black border border-slate-200 shadow-sm group/btn transition-all hover:shadow-md hover:scale-105 active:scale-95"
                               >
                                  <UsersIcon className="w-3.5 h-3.5 mr-2 text-slate-300 group-hover/btn:text-indigo-500" />
                                  {dept.userCount} nhân sự
                                  <ArrowRight className="w-3 h-3 ml-2 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
                               </button>
                            </td>
                            <td className="px-10 py-7 text-center font-bold">
                               <div className={`inline-flex items-center px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border
                                  ${dept.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                                  {dept.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
                               </div>
                            </td>
                            <td className="px-10 py-7 text-right pr-12 relative">
                               <button 
                                  onClick={() => setActiveMenuId(activeMenuId === dept.id ? null : dept.id)}
                                  className={`p-3 rounded-2xl transition-all shadow-sm ${activeMenuId === dept.id ? 'bg-indigo-600 text-white scale-110 shadow-indigo-200' : 'text-slate-400 bg-white border border-slate-100 hover:border-indigo-200 hover:text-indigo-500 hover:shadow-lg'}`}
                               >
                                 <MoreHorizontal className="w-5 h-5" />
                               </button>

                               {/* Action Menu Dropdown */}
                               {activeMenuId === dept.id && (
                                 <div className="absolute right-14 top-1/2 -translate-y-1/2 z-[50] flex items-center gap-2 pr-4 animate-in slide-in-from-right-4 duration-300">
                                    <div className="flex bg-white rounded-3xl shadow-2xl p-2.5 border border-slate-100 shadow-slate-300/50 gap-1.5 ring-4 ring-indigo-50">
                                       <button 
                                          onClick={() => { setEditingDept(dept); setDeptFormData({ code: dept.code, name: dept.name, isActive: dept.isActive, managerUserId: dept.managerUserId || '' }); setShowDeptModal(true); setActiveMenuId(null); }}
                                          className="flex items-center px-5 py-2.5 rounded-2xl text-[10px] font-black text-indigo-600 hover:bg-indigo-50 transition-all uppercase tracking-widest gap-2"
                                       >
                                          <Edit2 className="w-3.5 h-3.5" /> Sửa
                                       </button>
                                       <button 
                                          onClick={() => toggleDeptStatus(dept)}
                                          className={`flex items-center px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest gap-2 ${dept.isActive ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                                       >
                                          {dept.isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                          {dept.isActive ? 'Khóa' : 'Mở lại'}
                                       </button>
                                       <div className="w-px h-6 bg-slate-100 self-center mx-1"></div>
                                       <button 
                                          onClick={() => { setActiveTab('users'); setActiveMenuId(null); }}
                                          className="flex items-center px-5 py-2.5 rounded-2xl text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest gap-2"
                                       >
                                          <Eye className="w-3.5 h-3.5" /> Xem nhân sự
                                       </button>
                                    </div>
                                 </div>
                               )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}

      {/* USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
             <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-white">
                <div className="flex items-center">
                   <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mr-5 shadow-2xl shadow-indigo-200">
                      <UserPlus className="w-7 h-7" />
                   </div>
                   <div>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingUser ? 'Cập nhật' : 'Thêm Nhân sự'}</h2>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Cơ sở dữ liệu nhân viên hệ thống</p>
                   </div>
                </div>
                <button onClick={() => setShowUserModal(false)} className="text-slate-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-full">
                   <XCircle className="w-8 h-8" />
                </button>
             </div>
             <form onSubmit={handleUserSave} className="p-10 space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    {!editingUser && (
                      <>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">ID Tài khoản *</label>
                           <input required value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700 shadow-inner" placeholder="VD: van.a" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Mật khẩu *</label>
                           <input required type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700 shadow-inner" placeholder="••••••" />
                        </div>
                      </>
                    )}
                    <div className="col-span-2 space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Họ và Tên đầy đủ *</label>
                       <input required value={userFormData.fullName} onChange={e => setUserFormData({...userFormData, fullName: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-slate-800 shadow-inner" placeholder="Nguyễn Văn A..." />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Phòng ban liên kết *</label>
                       <select required value={userFormData.departmentId} onChange={e => setUserFormData({...userFormData, departmentId: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-slate-700 appearance-none shadow-inner">
                          <option value="">-- Chọn Đơn vị --</option>
                          {departments.filter(d => d.isActive).map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                          ))}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Vai trò *</label>
                       <select required disabled={currentUser.role !== 'ADMIN'} value={userFormData.role} onChange={e => {
                          const newRole = e.target.value as any;
                          const newMgrId = (newRole === 'ADMIN' || newRole === 'WAREHOUSE') ? '' : userFormData.managerId;
                          setUserFormData({...userFormData, role: newRole, managerId: newMgrId});
                       }} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-indigo-600 appearance-none shadow-inner">
                          <option value="EMPLOYEE">NHÂN VIÊN</option>
                          <option value="MANAGER">QUẢN LÝ</option>
                          <option value="WAREHOUSE">THỦ KHO</option>
                          <option value="ADMIN">ADMIN</option>
                       </select>
                    </div>
                    {(userFormData.role === 'EMPLOYEE' || userFormData.role === 'MANAGER') && (
                      <div className="col-span-2 space-y-2">
                         <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest pl-1 flex justify-between">Quản lý trực tiếp</label>
                         <select required={userFormData.role === 'EMPLOYEE'} value={userFormData.managerId} onChange={e => setUserFormData({...userFormData, managerId: e.target.value})} className="w-full px-5 py-4 bg-indigo-50/50 border-2 border-indigo-100 focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700 appearance-none shadow-sm">
                            <option value="">-- {userFormData.role === 'MANAGER' ? 'Cấp cao nhất' : 'Tìm người quản lý...'} --</option>
                            {managers.filter(m => m.id !== editingUser?.id).map(m => ( <option key={m.id} value={m.id}>{m.fullName} (@{m.username})</option> ))}
                         </select>
                      </div>
                    )}
                 </div>
                 <div className="flex gap-4 pt-8">
                    <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-[1.5rem] font-black hover:bg-slate-100 transition-all uppercase tracking-widest text-xs">Huỷ bỏ</button>
                    <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all transform active:scale-95 uppercase tracking-widest text-xs">Phê duyệt Lưu</button>
                 </div>
             </form>
          </div>
        </div>
      )}

      {/* DEPARTMENT MODAL */}
      {showDeptModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-12 duration-400">
             <div className="p-10 border-b border-slate-50 bg-slate-50/40">
                <div className="flex items-center">
                   <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mr-5 shadow-2xl shadow-indigo-200">
                      <Building2 className="w-7 h-7" />
                   </div>
                   <div>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingDept ? 'Cập nhật' : 'Thêm mới'}</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Quản lý cơ cấu phòng ban</p>
                   </div>
                </div>
             </div>
             <form onSubmit={handleDeptSave} className="p-10 space-y-7">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mã Đơn vị *</label>
                   <input required disabled={!!editingDept} value={deptFormData.code} onChange={e => setDeptFormData({...deptFormData, code: e.target.value.toUpperCase()})} className="w-full px-6 py-4.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-slate-800 text-lg shadow-inner disabled:opacity-50" placeholder="IT, HR, MKT..." />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tên Phòng ban *</label>
                   <input required value={deptFormData.name} onChange={e => setDeptFormData({...deptFormData, name: e.target.value})} className="w-full px-6 py-4.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700 shadow-inner" placeholder="VD: Phòng Hành chính..." />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest pl-1">Trưởng bộ phận (Manager Head)</label>
                   <div className="relative">
                      <select value={deptFormData.managerUserId} onChange={e => setDeptFormData({...deptFormData, managerUserId: e.target.value})} className="w-full pl-6 pr-12 py-4.5 bg-indigo-50/50 border-2 border-indigo-100 rounded-2xl outline-none font-black text-indigo-800 appearance-none shadow-sm text-sm">
                         <option value="">-- Chọn Quản lý --</option>
                         {managers.map(m => ( <option key={m.id} value={m.id}>{m.fullName} (@{m.username})</option> ))}
                      </select>
                      <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 rotate-90 pointer-events-none" />
                   </div>
                </div>
                <div className="flex gap-4 pt-6">
                   <button type="button" onClick={() => setShowDeptModal(false)} className="flex-1 py-4.5 bg-slate-50 text-slate-400 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-colors hover:bg-slate-100">Huỷ bỏ</button>
                   <button type="submit" className="flex-[2] py-4.5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-2xl shadow-indigo-100 uppercase tracking-widest text-[10px] active:scale-95 transition-all">Lưu Thay Đổi</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
             <div className="p-10 border-b border-slate-50 text-center bg-white">
                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-xl shadow-amber-50 group">
                   <Key className="w-8 h-8 group-hover:rotate-12 transition-transform" />
                </div>
                <h3 className="text-xl font-black text-slate-800">Cấp mật khẩu</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5 opacity-60">Thanh đổi cho @{editingUser?.username}</p>
             </div>
             <form onSubmit={handlePasswordSave} className="p-10 bg-white">
                <div className="mb-8">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block pl-1">Mật khẩu mới (Tối thiểu 6 ký tự)</label>
                   <input autoFocus required type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({newPassword: e.target.value})} className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-amber-500 rounded-2xl outline-none font-black text-slate-800 text-center tracking-[0.5em] text-xl shadow-inner" minLength={6} placeholder="••••••" />
                </div>
                <div className="flex flex-col gap-3">
                   <button type="submit" className="w-full py-4.5 bg-amber-500 text-white font-black rounded-2xl shadow-2xl shadow-amber-100 hover:bg-amber-600 transition-all uppercase tracking-widest text-[10px] active:scale-95">XÁC NHẬN ĐỔI</button>
                   <button type="button" onClick={() => setShowPasswordModal(false)} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors">Huỷ bỏ</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Global CSS for Custom Scrollbar & Transitions */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        
        .italic-last-step tr:last-child { font-style: italic; opacity: 0.8; }
      `}</style>

    </div>
  );
}
