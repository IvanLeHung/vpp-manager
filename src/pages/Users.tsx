import { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Edit2, Key, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import api from '../lib/api';
import { useAppContext } from '../context/AppContext';

type UserData = {
  id: string;
  username: string;
  fullName: string;
  departmentId: string | null;
  department?: { name: string };
  managerId: string | null;
  manager?: { fullName: string };
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'WAREHOUSE';
  isActive: boolean;
  createdAt: string;
};

type DepartmentData = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  _count?: { users: number };
};

export default function Users() {
  const { currentUser } = useAppContext();
  const [activeTab, setActiveTab] = useState<'users' | 'departments'>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [managers, setManagers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // User Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: '', password: '', fullName: '', departmentId: '', managerId: '', role: 'EMPLOYEE' as any, isActive: true
  });

  // Department Modal State
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentData | null>(null);
  const [deptFormData, setDeptFormData] = useState({
    code: '', name: '', isActive: true
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '' });

  if (!currentUser) return null;

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch (error) {
      console.error('Lỗi tải danh sách users:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data);
    } catch (error) {
       console.error('Lỗi tải danh sách phòng ban:', error);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await api.get('/users?role=MANAGER&isActive=true');
      setManagers(res.data.data);
    } catch (error) {
       console.error('Lỗi tải danh sách quản lý:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchDepartments(), fetchManagers()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUserSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          fullName: userFormData.fullName,
          departmentId: userFormData.departmentId || null,
          managerId: userFormData.managerId || null,
          role: userFormData.role,
          isActive: userFormData.isActive
        });
        alert('Cập nhật thành công');
      } else {
        await api.post('/users', userFormData);
        alert('Tạo tài khoản thành công');
      }
      setShowModal(false);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleDeptSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, deptFormData);
        alert('Cập nhật thành công');
      } else {
        await api.post('/departments', deptFormData);
        alert('Thêm phòng ban thành công');
      }
      setShowDeptModal(false);
      fetchDepartments();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const toggleDeptStatus = async (dept: DepartmentData) => {
    if (!confirm(`Bạn muốn ${dept.isActive ? 'khoá' : 'mở khoá'} phòng ban ${dept.name}?`)) return;
    try {
      await api.patch(`/departments/${dept.id}/status`, { isActive: !dept.isActive });
      fetchDepartments();
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

  const toggleStatus = async (user: UserData) => {
    if (!confirm(`Bạn muốn ${user.isActive ? 'khoá' : 'mở khoá'} tài khoản ${user.username}?`)) return;
    try {
      await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  if (currentUser.role === 'EMPLOYEE' || currentUser.role === 'WAREHOUSE') {
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center">
              <UsersIcon className="w-7 h-7 mr-3 text-indigo-600" />
              Quản lý Nhân sự
            </h1>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${activeTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Nhân viên
            </button>
            <button 
              onClick={() => setActiveTab('departments')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${activeTab === 'departments' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Phòng ban
            </button>
          </div>
        </div>
        
        {currentUser.role === 'ADMIN' && (
          <button 
            onClick={() => {
              if (activeTab === 'users') {
                setEditingUser(null);
                setUserFormData({ username: '', password: '', fullName: '', departmentId: '', managerId: '', role: 'EMPLOYEE', isActive: true });
                setShowModal(true);
              } else {
                setEditingDept(null);
                setDeptFormData({ code: '', name: '', isActive: true });
                setShowDeptModal(true);
              }
            }}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === 'users' ? 'Thêm nhân viên' : 'Thêm phòng ban'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        {activeTab === 'users' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4">Tài khoản</th>
                  <th className="px-6 py-4">Họ và Tên</th>
                  <th className="px-6 py-4">Phòng ban</th>
                  <th className="px-6 py-4">Quản lý trực tiếp</th>
                  <th className="px-6 py-4">Vai trò</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Đang tải dữ liệu...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Chưa có tài khoản nào</td></tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-bold text-slate-700">{user.username}</td>
                      <td className="px-6 py-4 font-medium">{user.fullName}</td>
                      <td className="px-6 py-4 text-slate-600">{user.department?.name || 'Chưa gán'}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {user.role === 'EMPLOYEE' ? (user.manager?.fullName || <span className="text-rose-400 italic">Chưa gán</span>) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded inline-flex items-center text-xs font-bold
                          ${user.role === 'ADMIN' ? 'bg-rose-100 text-rose-700' : 
                            user.role === 'MANAGER' ? 'bg-amber-100 text-amber-700' :
                            user.role === 'WAREHOUSE' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-700'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <button disabled={currentUser.role !== 'ADMIN'} onClick={() => toggleStatus(user)} className={`inline-flex items-center justify-center p-1.5 rounded-full transition ${user.isActive ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'} disabled:opacity-100`}>
                            {user.isActive ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                         <button onClick={() => {
                            setEditingUser(user);
                            setUserFormData({
                               username: user.username,
                               password: '',
                               fullName: user.fullName,
                               departmentId: user.departmentId || '',
                               managerId: user.managerId || '',
                               role: user.role,
                               isActive: user.isActive
                            });
                            setShowModal(true);
                         }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                           <Edit2 className="w-4 h-4" />
                         </button>
                         {currentUser.role === 'ADMIN' && (
                           <button onClick={() => {
                              setEditingUser(user);
                              setPasswordForm({ newPassword: '' });
                              setShowPasswordModal(true);
                           }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded">
                             <Key className="w-4 h-4" />
                           </button>
                         )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4">Mã PB</th>
                  <th className="px-6 py-4">Tên phòng ban</th>
                  <th className="px-6 py-4 text-center">Số nhân sự</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Đang tải dữ liệu...</td></tr>
                ) : departments.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Chưa có phòng ban nào</td></tr>
                ) : (
                  departments.map(dept => (
                    <tr key={dept.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-bold text-slate-700">{dept.code}</td>
                      <td className="px-6 py-4 font-medium">{dept.name}</td>
                      <td className="px-6 py-4 text-center font-bold text-indigo-600">{dept._count?.users || 0}</td>
                      <td className="px-6 py-4 text-center">
                         <button disabled={currentUser.role !== 'ADMIN'} onClick={() => toggleDeptStatus(dept)} className={`inline-flex items-center justify-center p-1.5 rounded-full transition ${dept.isActive ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'} disabled:opacity-100`}>
                            {dept.isActive ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button onClick={() => {
                            setEditingDept(dept);
                            setDeptFormData({ code: dept.code, name: dept.name, isActive: dept.isActive });
                            setShowDeptModal(true);
                         }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                           <Edit2 className="w-4 h-4" />
                         </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal User */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">{editingUser ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên mới'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleUserSave} className="p-6 space-y-4">
              {!editingUser && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tên đăng nhập *</label>
                  <input required autoFocus value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" minLength={3} />
                </div>
              )}
              {!editingUser && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mật khẩu khởi tạo *</label>
                  <input required type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" minLength={6} />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và tên *</label>
                <input required value={userFormData.fullName} onChange={e => setUserFormData({...userFormData, fullName: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Phòng ban *</label>
                  <select required value={userFormData.departmentId} onChange={e => setUserFormData({...userFormData, departmentId: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.filter(d => d.isActive).map(d => (
                       <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Vai trò hệ thống</label>
                  <select disabled={currentUser.role !== 'ADMIN'} value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-slate-50">
                    <option value="EMPLOYEE">Nhân viên (EMPLOYEE)</option>
                    <option value="MANAGER">Trưởng phòng (MANAGER)</option>
                    <option value="WAREHOUSE">Thủ kho (WAREHOUSE)</option>
                    <option value="ADMIN">Quản trị viên (ADMIN)</option>
                  </select>
                </div>
              </div>

              {userFormData.role === 'EMPLOYEE' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 text-indigo-600">Quản lý trực tiếp (Duyệt phiếu) *</label>
                  <select required value={userFormData.managerId} onChange={e => setUserFormData({...userFormData, managerId: e.target.value})} className="w-full px-3 py-2 border-2 border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                    <option value="">-- Chọn người duyệt --</option>
                    {managers.map(m => (
                       <option key={m.id} value={m.id}>{m.fullName} ({m.username})</option>
                    ))}
                  </select>
                </div>
              )}

              {editingUser && currentUser.role === 'ADMIN' && (
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                 <input type="checkbox" id="userIsActive" checked={userFormData.isActive} onChange={e => setUserFormData({...userFormData, isActive: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded" />
                 <label htmlFor="userIsActive" className={`font-bold ${userFormData.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>{userFormData.isActive ? 'Tài khoản Đang hoạt động' : 'Tài khoản Đã khoá'}</label>
              </div>
              )}
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Huỷ</button>
                <button type="submit" className="flex-1 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md">Lưu tài khoản</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Phòng ban */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">{editingDept ? 'Sửa phòng ban' : 'Thêm phòng ban mới'}</h2>
              <button onClick={() => setShowDeptModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleDeptSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Mã phòng ban *</label>
                <input required autoFocus value={deptFormData.code} onChange={e => setDeptFormData({...deptFormData, code: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="VD: ACC, IT, HR..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tên phòng ban *</label>
                <input required value={deptFormData.name} onChange={e => setDeptFormData({...deptFormData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowDeptModal(false)} className="flex-1 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Huỷ</button>
                <button type="submit" className="flex-1 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đổi Password */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Cấp lại mật khẩu</h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handlePasswordSave} className="p-6 space-y-4">
              <div>
                 <p className="text-sm text-slate-500 mb-4">Thay đổi mật khẩu cho tài khoản <strong className="text-slate-800">{editingUser?.username}</strong></p>
                 <label className="block text-sm font-semibold text-slate-700 mb-1">Mật khẩu mới *</label>
                 <input autoFocus required type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({newPassword: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" minLength={6} placeholder="Ít nhất 6 ký tự..." />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Huỷ</button>
                <button type="submit" className="flex-1 py-2 font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition shadow-md">Lưu mật khẩu</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
