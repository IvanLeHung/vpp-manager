import { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Edit2, Key, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import api from '../lib/api';
import { useAppContext } from '../context/AppContext';

type UserData = {
  id: string;
  username: string;
  fullName: string;
  department: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'WAREHOUSE';
  isActive: boolean;
  createdAt: string;
};

export default function Users() {
  const { currentUser } = useAppContext();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    username: '', password: '', fullName: '', department: '', role: 'EMPLOYEE', isActive: true
  });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '' });

  if (!currentUser) return null;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch (error) {
      console.error('Lỗi tải danh sách:', error);
      alert('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          fullName: formData.fullName,
          department: formData.department,
          role: formData.role,
          isActive: formData.isActive
        });
        alert('Cập nhật thành công');
      } else {
        await api.post('/users', formData);
        alert('Tạo tài khoản thành công');
      }
      setShowModal(false);
      fetchUsers();
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
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <UsersIcon className="w-7 h-7 mr-3 text-indigo-600" />
            Quản lý Nhân viên
          </h1>
          <p className="text-sm text-slate-500 mt-1">{currentUser.role === 'ADMIN' ? 'Quản lý tài khoản và phân quyền truy cập toàn hệ thống' : 'Quản lý thông tin nhân sự trong bộ phận của bạn'}</p>
        </div>
        {currentUser.role === 'ADMIN' && (
          <button 
            onClick={() => {
              setEditingUser(null);
              setFormData({ username: '', password: '', fullName: '', department: '', role: 'EMPLOYEE', isActive: true });
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Thêm nhân viên
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Tài khoản</th>
                <th className="px-6 py-4">Họ và Tên</th>
                <th className="px-6 py-4">Phòng ban</th>
                <th className="px-6 py-4">Vai trò</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Đang tải dữ liệu...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Chưa có tài khoản nào</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-bold text-slate-700">{user.username}</td>
                    <td className="px-6 py-4 font-medium">{user.fullName}</td>
                    <td className="px-6 py-4 text-slate-600">{user.department}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded inline-flex items-center text-xs font-bold
                        ${user.role === 'ADMIN' ? 'bg-rose-100 text-rose-700' : 
                          user.role === 'MANAGER' ? 'bg-amber-100 text-amber-700' :
                          user.role === 'WAREHOUSE' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-700'}`}>
                        {user.role === 'ADMIN' && <ShieldAlert className="w-3 h-3 mr-1" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {currentUser.role === 'ADMIN' ? (
                        <button onClick={() => toggleStatus(user)} className={`inline-flex items-center justify-center p-1.5 rounded-full transition ${user.isActive ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`} title={user.isActive ? "Đang hoạt động (Click để Khoá)" : "Đã bị khoá (Click để Mở)"}>
                          {user.isActive ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </button>
                      ) : (
                        <span className={`inline-flex items-center justify-center p-1.5 rounded-full ${user.isActive ? 'text-emerald-500' : 'text-slate-400'}`} title={user.isActive ? "Đang hoạt động" : "Đã bị khoá"}>
                          {user.isActive ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                       <button onClick={() => {
                          setEditingUser(user);
                          setFormData({ ...formData, ...user });
                          setShowModal(true);
                       }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Sửa thông tin hoặc Khóa tài khoản">
                         <Edit2 className="w-4 h-4" />
                       </button>
                       {currentUser.role === 'ADMIN' && (
                         <button onClick={() => {
                            setEditingUser(user);
                            setPasswordForm({ newPassword: '' });
                            setShowPasswordModal(true);
                         }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Đổi mật khẩu">
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
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">{editingUser ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên mới'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {!editingUser && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tên đăng nhập *</label>
                  <input required autoFocus value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" minLength={3} />
                </div>
              )}
              {!editingUser && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mật khẩu khởi tạo *</label>
                  <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" minLength={6} />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và tên *</label>
                <input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Phòng ban *</label>
                <input required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Vai trò hệ thống</label>
                <select disabled={currentUser.role !== 'ADMIN'} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold text-slate-700 disabled:opacity-60 disabled:bg-slate-50 disabled:cursor-not-allowed">
                  <option value="EMPLOYEE">Nhân viên (EMPLOYEE)</option>
                  <option value="MANAGER">Trưởng phòng (MANAGER)</option>
                  <option value="WAREHOUSE">Thủ kho (WAREHOUSE)</option>
                  <option value="ADMIN">Quản trị viên (ADMIN)</option>
                </select>
              </div>
              {editingUser && currentUser.role === 'ADMIN' && (
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                 <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded" />
                 <label htmlFor="isActive" className={`font-bold ${formData.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>{formData.isActive ? 'Tài khoản Đang Hoạt Động (Click để Vô hiệu hóa)' : 'Tài khoản Bị Vô Hiệu Hóa (Click để Kích hoạt)'}</label>
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
