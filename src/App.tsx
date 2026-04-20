import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';
import InventoryReport from './pages/InventoryReport';
import Analytics from './pages/Analytics';
import Purchases from './pages/purchases/Purchases';
import Receipts from './pages/purchases/Receipts';
import GuestRequest from './pages/GuestRequest';
import Users from './pages/Users';
import Items from './pages/Items';
import WarehouseTickets from './pages/WarehouseTickets';
import WarehouseTicketDetail from './pages/WarehouseTicketDetail';
import JanitorialWarehouse from './pages/janitorial/JanitorialWarehouse';
import JanitorialReports from './pages/janitorial/JanitorialReports';
import api from './lib/api';

function Landing() {
  const navigate = useNavigate();
  const { setCurrentUser } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !newPassword) return;
    
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      await api.post('/auth/reset-password', { username, newPassword });
      setSuccessMsg('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      setIsResetMode(false);
      setPassword('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Lỗi đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    try {
      setLoading(true);
      setError('');
      const response = await api.post('/auth/login', { username, password });
      
      localStorage.setItem('vpp_token', response.data.token);
      localStorage.setItem('vpp_user', JSON.stringify(response.data.user));
      
      setCurrentUser(response.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Lỗi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-blue-400/20 blur-3xl mix-blend-multiply opacity-70 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 rounded-full bg-indigo-400/20 blur-3xl mix-blend-multiply opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 rounded-full bg-purple-400/20 blur-3xl mix-blend-multiply opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white max-w-md w-full text-center relative z-10">
        <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-4xl shadow-xl shadow-blue-500/30">
               D
            </div>
        </div>
        
        <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 mb-4 tracking-tight">
          Văn phòng phẩm Danko Group
        </h1>
        <p className="text-slate-600 mb-8 text-lg font-medium leading-relaxed">
          Nền tảng quản lý văn phòng phẩm thông minh và tối ưu nhất dành cho doanh nghiệp.
        </p>
        <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="flex flex-col gap-4">
          {error && <div className="text-rose-500 bg-rose-50 p-3 rounded-lg text-sm font-bold shadow-sm">{error}</div>}
          {successMsg && <div className="text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-sm font-bold shadow-sm">{successMsg}</div>}
          
          <input 
            type="text" 
            placeholder="Tên đăng nhập (VD: truong.phong, admin)" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition"
          />
          
          {!isResetMode ? (
            <input 
              type="password" 
              placeholder="Mật khẩu" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition"
            />
          ) : (
            <input 
              type="password" 
              placeholder="Nhập mật khẩu mới" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium transition"
            />
          )}
          
          <button 
            type="submit"
            disabled={loading}
            className={`w-full px-6 py-4 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:-translate-y-1 focus:ring-4 disabled:opacity-50 ${isResetMode ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-xl shadow-teal-500/30 ring-teal-500/20' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-indigo-500/30 ring-blue-500/20'}`}
          >
            {loading ? 'Đang xử lý...' : (isResetMode ? 'Đặt lại mật khẩu' : 'Đăng nhập hệ thống')}
          </button>
        </form>

        <div className="mt-6 flex justify-center">
          <button 
            type="button" 
            onClick={() => { setIsResetMode(!isResetMode); setError(''); setSuccessMsg(''); }} 
            className="text-slate-500 font-bold hover:text-indigo-600 transition text-sm"
          >
             {isResetMode ? 'Quay lại màn hình Đăng nhập' : 'Quên mật khẩu?'}
          </button>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-200">
           <button onClick={() => navigate('/guest-request')} className="text-slate-500 font-bold hover:text-indigo-600 hover:underline transition">
              Không có tài khoản? Tạo yêu cầu làm Khách
           </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/guest-request" element={<GuestRequest />} />
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Về sau sẽ tạo 2 trang này */}
            <Route path="/requests" element={<Requests />} />
            <Route path="/inventory-report" element={<InventoryReport />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/purchase-orders" element={<Purchases />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/users" element={<Users />} /> 
            <Route path="/items" element={<Items />} />
            <Route path="/warehouse-tickets" element={<WarehouseTickets />} />
            <Route path="/warehouse-tickets/:id" element={<WarehouseTicketDetail />} />
            
            {/* Janitorial Warehouse Routes */}
            <Route path="/janitorial-warehouse" element={<JanitorialWarehouse />} />
            <Route path="/janitorial-reports" element={<JanitorialReports />} />
            <Route path="/janitorial-tickets" element={<WarehouseTickets warehouseCode="VE_SINH" basePath="/janitorial-tickets" />} />
            <Route path="/janitorial-tickets/:id" element={<WarehouseTicketDetail basePath="/janitorial-tickets" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
