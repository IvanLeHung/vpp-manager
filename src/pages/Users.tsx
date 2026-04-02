import { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  Plus, 
  Edit2, 
  Key, 
  ShieldAlert, 
  XCircle, 
  Building2, 
  UserPlus, 
  Target,
  ChevronRight,
  Activity,
  ShieldCheck
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

  if (!currentUser) return null;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, deptsRes, managersRes] = await Promise.all([
        api.get('/users'),
        api.get('/departments'),
        api.get('/users/managers')
      ]);
      setUsers(usersRes.data.data);
      setDepartments(deptsRes.data.data || []);
      setManagers(managersRes.data.data || []);
    } catch (error) {
      console.error('Lỗi tải dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ─── USER ACTIONS ──────────────────────────────────────────

  const handleUserSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...userFormData,
        managerId: userFormData.managerId || null,
        departmentId: userFormData.departmentId || null
      };

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
      alert(error.response?.data?.error || 'Có lỗi xảy ra khi lưu nhân viên');
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

  // ─── DEPARTMENT ACTIONS ────────────────────────────────────

  const handleDeptSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...deptFormData,
        managerUserId: deptFormData.managerUserId || null
      };

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
      alert(error.response?.data?.error || 'Có lỗi xảy ra khi lưu phòng ban');
    }
  };

  const toggleDeptStatus = async (dept: DepartmentData) => {
    try {
      await api.patch(`/departments/${dept.id}/status`, { isActive: !dept.isActive });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  // Access check
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Không có quyền truy cập</h2>
          <p className="text-slate-500 border border-slate-200 bg-slate-50 p-4 rounded-xl">Vai trò hiện tại của bạn không được cấp quyền quản lý nhân sự.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full h-full flex flex-col bg-slate-50/50 min-h-[calc(100vh-64px)]">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center tracking-tight">
            <UsersIcon className="w-8 h-8 mr-4 text-indigo-600" />
            Quản lý Nhân sự
          </h1>
          <nav className="flex items-center text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">
             <span>Hệ thống</span>
             <ChevronRight className="w-3 h-3 mx-2" />
             <span className="text-indigo-500">{activeTab === 'users' ? 'Danh sách Nhân viên' : 'Cơ cấu Tổ chức'}</span>
          </nav>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm self-stretch md:self-auto min-w-[300px]">
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <UsersIcon className="w-4 h-4 mr-2" />
            Nhân viên
          </button>
          <button 
            onClick={() => setActiveTab('departments')}
            className={`flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'departments' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Building2 className="w-4 h-4 mr-2" />
            Phòng ban
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {activeTab === 'users' ? (
          /* ─── USERS TAB ─── */
          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center">
                   <Activity className="w-5 h-5 mr-2 text-indigo-500" />
                   Tất cả Nhân sự <span className="ml-3 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full uppercase tracking-widest">{users.length}</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5 italic">Danh sách toàn bộ cán bộ nhân viên trong hệ thống</p>
              </div>
              
              {currentUser.role === 'ADMIN' && (
                <button 
                  onClick={() => {
                    setEditingUser(null);
                    setUserFormData({ username: '', password: '', fullName: '', departmentId: '', role: 'EMPLOYEE', isActive: true, managerId: '' });
                    setShowUserModal(true);
                  }}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 flex items-center transform active:scale-95 text-sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Thêm Nhân viên mới
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50/50 sticky top-0 z-20">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                    <th className="px-8 py-5">Tài khoản & Tên</th>
                    <th className="px-8 py-5">Đơn vị / Phòng ban</th>
                    <th className="px-8 py-5">Quản lý trực tiếp</th>
                    <th className="px-8 py-5">Vai trò</th>
                    <th className="px-8 py-5 text-center">Trạng thái</th>
                    <th className="px-8 py-5 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 italic-last-step">
                  {loading ? (
                    <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-300 font-bold animate-pulse">Đang truy xuất dữ liệu nhân sự...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={6} className="px-8 py-20 text-center">
                       <UsersIcon className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                       <span className="text-slate-400 font-medium">Chưa có tài khoản nào trong hệ thống.</span>
                    </td></tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id} className="group hover:bg-indigo-50/20 transition-all duration-300">
                        <td className="px-8 py-5">
                           <div className="flex items-center">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs mr-4 transition-transform group-hover:scale-110 shadow-sm
                                ${user.role === 'ADMIN' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                                {user.fullName.split(' ').pop()?.[0] || 'U'}
                             </div>
                             <div>
                               <div className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{user.fullName}</div>
                               <div className="text-[10px] text-slate-400 font-bold font-mono">@{user.username}</div>
                             </div>
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="flex items-center">
                              <Building2 className="w-3.5 h-3.5 mr-2 text-slate-400" />
                              <span className={`text-xs font-bold ${user.departmentName ? 'text-slate-700' : 'text-slate-300 italic'}`}>
                                 {user.departmentName || 'Chưa gán'}
                              </span>
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           {user.role !== 'ADMIN' ? (
                             <div className="flex items-center">
                                <Target className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                                <span className={`text-xs font-black ${user.managerName ? 'text-indigo-600' : 'text-amber-500 font-medium'}`}>
                                   {user.managerName || 'Chưa gán Manager'}
                                </span>
                             </div>
                           ) : <span className="text-slate-200">N/A</span>}
                        </td>
                        <td className="px-8 py-5">
                           <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border shadow-sm
                              ${user.role === 'ADMIN' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                user.role === 'MANAGER' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                user.role === 'WAREHOUSE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              {user.role}
                           </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                           <button 
                             disabled={currentUser.role !== 'ADMIN'}
                             onClick={() => toggleUserStatus(user)}
                             className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all shadow-sm
                                ${user.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-500 hover:bg-rose-200'}`}
                           >
                              {user.isActive ? 'Active' : 'Locked'}
                           </button>
                        </td>
                        <td className="px-8 py-5 text-right">
                           <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => {
                                  setEditingUser(user);
                                  setUserFormData({ 
                                    username: user.username, password: '', fullName: user.fullName, 
                                    departmentId: user.departmentId || '', role: user.role, isActive: user.isActive, 
                                    managerId: user.managerId || '' 
                                  });
                                  setShowUserModal(true);
                              }} title="Chỉnh sửa" className="p-2 text-indigo-600 hover:bg-white hover:shadow-md rounded-xl transition">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {currentUser.role === 'ADMIN' && (
                                <button onClick={() => {
                                    setEditingUser(user);
                                    setPasswordForm({ newPassword: '' });
                                    setShowPasswordModal(true);
                                }} title="Cấp mật khẩu" className="p-2 text-amber-500 hover:bg-white hover:shadow-md rounded-xl transition">
                                  <Key className="w-4 h-4" />
                                </button>
                              )}
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ─── DEPARTMENTS TAB ─── */
          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center uppercase tracking-tight">
                   <Building2 className="w-5 h-5 mr-2 text-indigo-500" />
                   Cơ cấu Phòng ban <span className="ml-3 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">{departments.length}</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Quản lý các đơn vị, bộ phận trực thuộc công ty</p>
              </div>
              
              {currentUser.role === 'ADMIN' && (
                <button 
                  onClick={() => {
                    setEditingDept(null);
                    setDeptFormData({ code: '', name: '', isActive: true, managerUserId: '' });
                    setShowDeptModal(true);
                  }}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 flex items-center transform active:scale-95 text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Mở Phòng ban mới
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left whitespace-nowrap">
                 <thead className="bg-slate-50/50 sticky top-0 z-20">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Mã & Tên Đơn vị</th>
                    <th className="px-8 py-5">Trưởng bộ phận (Head)</th>
                    <th className="px-8 py-5 text-center">Số lượng Nhân viên</th>
                    <th className="px-8 py-5 text-center">Trạng thái</th>
                    <th className="px-8 py-5 text-right pr-12">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {loading ? (
                    <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-300 font-bold animate-pulse tracking-widest">Đang tải cấu trúc tổ chức...</td></tr>
                  ) : departments.length === 0 ? (
                    <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium italic">Công ty chưa thiết lập cơ cấu phòng ban.</td></tr>
                  ) : (
                    departments.map(dept => (
                      <tr key={dept.id} className="group hover:bg-indigo-50/20 transition-all">
                        <td className="px-8 py-6">
                           <div className="flex items-center">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mr-4 font-black text-xs border border-slate-200">
                                 {dept.code}
                              </div>
                              <div className="font-black text-slate-800 uppercase text-xs">{dept.name}</div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           {dept.managerName ? (
                             <div className="flex items-center text-indigo-600 font-black text-xs">
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                {dept.managerName}
                             </div>
                           ) : (
                             <span className="text-slate-300 text-xs italic font-medium">Chưa chỉ định Head</span>
                           )}
                        </td>
                        <td className="px-8 py-6 text-center">
                           <div className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black border border-slate-200 lowercase">
                              <UsersIcon className="w-3 h-3 mr-1.5 opacity-50" />
                              {dept.userCount} nhân sự
                           </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                           <button 
                             disabled={currentUser.role !== 'ADMIN'}
                             onClick={() => toggleDeptStatus(dept)}
                             className={`w-3 h-3 rounded-full transition-all ring-offset-2 ring-1 ${dept.isActive ? 'bg-emerald-500 ring-emerald-100' : 'bg-slate-300 ring-slate-100'}`}
                           />
                        </td>
                        <td className="px-8 py-6 text-right pr-12">
                           <button onClick={() => {
                               setEditingDept(dept);
                               setDeptFormData({ code: dept.code, name: dept.name, isActive: dept.isActive, managerUserId: dept.managerUserId || '' });
                               setShowDeptModal(true);
                           }} className="p-2.5 text-indigo-600 hover:bg-white hover:shadow-lg rounded-2xl transition-all opacity-0 group-hover:opacity-100">
                             <Edit2 className="w-4 h-4" />
                           </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}

      {/* USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
             <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-white">
                <div className="flex items-center">
                   <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mr-5 shadow-2xl shadow-indigo-200">
                      <UserPlus className="w-7 h-7" />
                   </div>
                   <div>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingUser ? 'Cập nhật Nhân viên' : 'Thêm Nhân sự mới'}</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Cơ sở dữ liệu cán bộ nhân viên</p>
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
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">ID Tài khoản *</label>
                           <input required value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-700 shadow-inner" placeholder="VD: nguyen.van.a" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mật khẩu *</label>
                           <input required type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-700 shadow-inner" placeholder="******" />
                        </div>
                      </>
                    )}
                    <div className="col-span-2 space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Họ và Tên đầy đủ *</label>
                       <input required value={userFormData.fullName} onChange={e => setUserFormData({...userFormData, fullName: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-700 shadow-inner" placeholder="Nguyễn Văn A..." />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Phòng ban liên kết *</label>
                       <select required value={userFormData.departmentId} onChange={e => setUserFormData({...userFormData, departmentId: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-700 appearance-none shadow-inner">
                          <option value="">-- Chọn Đơn vị --</option>
                          {departments.filter(d => d.isActive).map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                          ))}
                       </select>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Vai trò hệ thống *</label>
                       <select required disabled={currentUser.role !== 'ADMIN'} value={userFormData.role} onChange={e => {
                          const newRole = e.target.value as any;
                          const newMgrId = (newRole === 'ADMIN' || newRole === 'WAREHOUSE') ? '' : userFormData.managerId;
                          setUserFormData({...userFormData, role: newRole, managerId: newMgrId});
                       }} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-black text-indigo-600 appearance-none shadow-inner">
                          <option value="EMPLOYEE">NHÂN VIÊN</option>
                          <option value="MANAGER">QUẢN LÝ</option>
                          <option value="WAREHOUSE">THỦ KHO</option>
                          <option value="ADMIN">ADMIN</option>
                       </select>
                    </div>

                    {(userFormData.role === 'EMPLOYEE' || userFormData.role === 'MANAGER') && (
                      <div className="col-span-2 space-y-2">
                         <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest pl-1 flex justify-between">
                            Quản lý trực tiếp (Direct Manager)
                            <span className="text-[9px] text-slate-400 italic">Áp dụng cho chuỗi duyệt phiếu</span>
                         </label>
                         <select 
                            required={userFormData.role === 'EMPLOYEE'}
                            value={userFormData.managerId} 
                            onChange={e => setUserFormData({...userFormData, managerId: e.target.value})} 
                            className="w-full px-5 py-3.5 bg-indigo-50/30 border-2 border-indigo-100 focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-700 appearance-none shadow-sm"
                         >
                            <option value="">-- {userFormData.role === 'MANAGER' ? 'Cấp cao (Không có người quản lý)' : 'Tìm người quản lý...'} --</option>
                            {managers.filter(m => m.id !== editingUser?.id).map(m => (
                              <option key={m.id} value={m.id}>{m.fullName} (@{m.username})</option>
                            ))}
                         </select>
                      </div>
                    )}
                 </div>

                 <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all">Huỷ</button>
                    <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all transform active:scale-95">
                       {editingUser ? 'LƯU THAY ĐỔI' : 'TẠO TÀI KHOẢN'}
                    </button>
                 </div>
             </form>
          </div>
        </div>
      )}

      {/* DEPARTMENT MODAL */}
      {showDeptModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-12 duration-300">
             <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center">
                   <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mr-4 shadow-xl">
                      <Building2 className="w-6 h-6" />
                   </div>
                   <div>
                      <h2 className="text-xl font-black text-slate-800">{editingDept ? 'Cập nhật Phòng ban' : 'Thêm Phòng ban mới'}</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Xác lập cơ cấu tổ chức</p>
                   </div>
                </div>
                <button onClick={() => setShowDeptModal(false)} className="text-slate-300 hover:text-rose-500 transition-colors">
                   <XCircle className="w-8 h-8" />
                </button>
             </div>

             <form onSubmit={handleDeptSave} className="p-8 space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mã Đơn vị *</label>
                   <input required disabled={!!editingDept} value={deptFormData.code} onChange={e => setDeptFormData({...deptFormData, code: e.target.value.toUpperCase()})} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-slate-800 disabled:opacity-50" placeholder="IT, HR, SALES..." />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tên Đầy đủ *</label>
                   <input required value={deptFormData.name} onChange={e => setDeptFormData({...deptFormData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700" placeholder="Phòng Công nghệ thông tin..." />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest pl-1">Trưởng bộ phận (Department Head)</label>
                   <select value={deptFormData.managerUserId} onChange={e => setDeptFormData({...deptFormData, managerUserId: e.target.value})} className="w-full px-5 py-4 bg-indigo-50/50 border-2 border-indigo-100 rounded-2xl outline-none font-bold text-indigo-800 appearance-none">
                      <option value="">-- Tìm Trưởng phòng --</option>
                      {managers.map(m => (
                        <option key={m.id} value={m.id}>{m.fullName} (@{m.username})</option>
                      ))}
                   </select>
                </div>

                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowDeptModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black">Huỷ</button>
                   <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100">XÁC NHẬN</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
             <div className="p-8 border-b border-slate-50 text-center">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl shadow-amber-50">
                   <Key className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-slate-800">Cấp mật khẩu mới</h3>
                <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">Tài khoản @{editingUser?.username}</p>
             </div>
             <form onSubmit={handlePasswordSave} className="p-8 space-y-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Mật khẩu mới (Tối thiểu 6 ký tự)</label>
                   <input autoFocus required type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({newPassword: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-amber-500 rounded-2xl outline-none font-black text-slate-800 text-center" minLength={6} placeholder="••••••" />
                </div>
                <div className="flex flex-col gap-3">
                   <button type="submit" className="w-full py-4 bg-amber-500 text-white font-black rounded-2xl shadow-xl shadow-amber-100 hover:bg-amber-600 transition-all">ĐỔI MẬT KHẨU</button>
                   <button type="button" onClick={() => setShowPasswordModal(false)} className="w-full py-3 bg-white text-slate-400 font-bold hover:text-slate-600">Huỷ bỏ</button>
                </div>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}
