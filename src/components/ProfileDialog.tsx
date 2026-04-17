import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, FileText, Camera, Key, X, Check, Loader2, Save } from 'lucide-react';
import api from '../lib/api';
import { useAppContext } from '../context/AppContext';

interface ProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'info' | 'password';
}

export default function ProfileDialog({ isOpen, onClose, initialTab = 'info' }: ProfileDialogProps) {
  const { currentUser, setCurrentUser } = useAppContext();
  const [activeTab, setActiveTab] = useState<'info' | 'password'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form states
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    avatar: '',
    phoneNumber: '',
    bio: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (isOpen && currentUser) {
      setProfileForm({
        fullName: currentUser.fullName || '',
        avatar: currentUser.avatar || '',
        phoneNumber: currentUser.phoneNumber || '',
        bio: currentUser.bio || ''
      });
      setMessage(null);
      setActiveTab(initialTab);
    }
  }, [isOpen, currentUser, initialTab]);

  if (!isOpen || !currentUser) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.patch('/profile/update', profileForm);
      const updatedUserData = { ...currentUser, ...res.data.user };
      setCurrentUser(updatedUserData);
      localStorage.setItem('vpp_user', JSON.stringify(updatedUserData));
      setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Có lỗi xảy ra khi cập nhật' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await api.post('/profile/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Mật khẩu cũ không chính xác' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row h-auto max-h-[90vh] border border-white/20">
        
        {/* Left Sidebar (Tabs) */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 p-6 flex flex-col gap-2">
           <div className="mb-8 px-2">
              <h2 className="text-xl font-black text-slate-800 tracking-tight italic">Cài đặt tài khoản</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Thông tin cá nhân & Bảo mật</p>
           </div>
           
           <button 
             onClick={() => { setActiveTab('info'); setMessage(null); }}
             className={`flex items-center px-4 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === 'info' ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
           >
             <User className="w-4 h-4 mr-3" />
             Hồ sơ cá nhân
           </button>
           
           <button 
             onClick={() => { setActiveTab('password'); setMessage(null); }}
             className={`flex items-center px-4 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === 'password' ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
           >
             <Key className="w-4 h-4 mr-3" />
             Đổi mật khẩu
           </button>

           <div className="mt-auto pt-6 flex justify-center">
              <button onClick={onClose} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                 <X className="w-6 h-6" />
              </button>
           </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 p-8 md:p-10 overflow-y-auto custom-scrollbar">
           {activeTab === 'info' ? (
             <form onSubmit={handleUpdateProfile} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-6 mb-8">
                   <div className="relative group">
                      <div className="w-24 h-24 rounded-3xl bg-indigo-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl group-hover:shadow-indigo-100/50 transition-all">
                         {profileForm.avatar ? (
                           <img src={profileForm.avatar} alt="Avatar" className="w-full h-full object-cover" />
                         ) : (
                           <span className="text-4xl font-black text-indigo-700 uppercase">
                              {currentUser.fullName ? currentUser.fullName.charAt(0) : currentUser.username.charAt(0)}
                           </span>
                         )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-white shadow-lg border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                         <Camera className="w-4 h-4" />
                      </div>
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-slate-800 tracking-tight">{currentUser.fullName}</h3>
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest italic font-mono">@{currentUser.username}</p>
                      <span className="mt-2 inline-block px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest">{currentUser.role}</span>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-5">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <User className="w-3 h-3" /> Họ và tên đầy đủ
                      </label>
                      <input 
                         required
                         value={profileForm.fullName}
                         onChange={e => setProfileForm({...profileForm, fullName: e.target.value})}
                         className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700 shadow-inner" 
                         placeholder="Nhập họ và tên..."
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <Camera className="w-3 h-3" /> Ảnh đại diện (URL)
                      </label>
                      <input 
                         value={profileForm.avatar}
                         onChange={e => setProfileForm({...profileForm, avatar: e.target.value})}
                         className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700 shadow-inner italic" 
                         placeholder="https://example.com/avatar.jpg"
                      />
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Phone className="w-3 h-3" /> Số điện thoại
                         </label>
                         <input 
                            value={profileForm.phoneNumber}
                            onChange={e => setProfileForm({...profileForm, phoneNumber: e.target.value})}
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700 shadow-inner tabular-nums" 
                            placeholder="VD: 0912xxxxxx"
                         />
                      </div>
                      <div className="space-y-2 opacity-50 cursor-not-allowed">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Mail className="w-3 h-3" /> Email (Cố định)
                         </label>
                         <input 
                            readOnly
                            value={`${currentUser.username}@danko.vn`}
                            className="w-full px-5 py-4 bg-slate-100 border-2 border-transparent rounded-2xl outline-none font-bold text-slate-400 shadow-inner" 
                         />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <FileText className="w-3 h-3" /> Giới thiệu ngắn (Bio)
                      </label>
                      <textarea 
                         rows={2}
                         value={profileForm.bio}
                         onChange={e => setProfileForm({...profileForm, bio: e.target.value})}
                         className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700 shadow-inner resize-none" 
                         placeholder="Kể chút về bản thân bạn..."
                      />
                   </div>
                </div>

                <div className="pt-4">
                   <button 
                     type="submit" 
                     disabled={loading}
                     className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                   >
                     {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                     CẬP NHẬT HỒ SƠ
                   </button>
                </div>
             </form>
           ) : (
             <form onSubmit={handleChangePassword} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="mb-10 text-center md:text-left">
                   <h3 className="text-xl font-black text-slate-800 tracking-tight">Thiết lập mật khẩu mới</h3>
                   <p className="text-sm font-medium text-slate-400 mt-1">Sử dụng mật khẩu mạnh để bảo vệ tài khoản của bạn</p>
                </div>

                <div className="space-y-5">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mật khẩu hiện tại</label>
                      <input 
                         required
                         type="password"
                         value={passwordForm.currentPassword}
                         onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                         className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-800 shadow-inner tracking-widest" 
                         placeholder="••••••••"
                      />
                   </div>
                   
                   <div className="h-px bg-slate-100 mx-4"></div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mật khẩu mới</label>
                      <input 
                         required
                         type="password"
                         value={passwordForm.newPassword}
                         onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                         className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-800 shadow-inner tracking-widest" 
                         placeholder="••••••••"
                         minLength={6}
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Xác nhận mật khẩu mới</label>
                      <input 
                         required
                         type="password"
                         value={passwordForm.confirmPassword}
                         onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                         className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-800 shadow-inner tracking-widest" 
                         placeholder="••••••••"
                         minLength={6}
                      />
                   </div>
                </div>

                <div className="pt-6">
                   <button 
                     type="submit" 
                     disabled={loading}
                     className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                   >
                     {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                     XÁC NHẬN ĐỔI MẬT KHẨU
                   </button>
                </div>
             </form>
           )}

           {message && (
             <div className={`mt-6 p-4 rounded-2xl flex items-center font-bold text-xs animate-bounce ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                {message.type === 'success' ? <Check className="w-4 h-4 mr-2" /> : <X className="w-4 h-4 mr-2" />}
                {message.text}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
