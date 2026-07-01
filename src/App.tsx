import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';
import InventoryReport from './pages/InventoryReport';
import Analytics from './pages/Analytics';
import Purchases from './pages/purchases/Purchases';
import Receipts from './pages/purchases/Receipts';
import ProcurementBatches from './pages/purchases/ProcurementBatches';
import ReceiptPrint from './pages/purchases/ReceiptPrint';
import RequestPrint from './pages/requests/RequestPrint';
import PurchasePrint from './pages/purchases/PurchasePrint';
import GuestRequest from './pages/GuestRequest';
import Users from './pages/Users';
import Items from './pages/Items';
import WarehouseTickets from './pages/WarehouseTickets';
import WarehouseTicketDetail from './pages/WarehouseTicketDetail';
import JanitorialWarehouse from './pages/janitorial/JanitorialWarehouse';
import JanitorialReports from './pages/janitorial/JanitorialReports';
import OfficeSuppliesWarehouse from './pages/OfficeSuppliesWarehouse';
import AuditLogs from './pages/AuditLogs';
import AllocationHistory from './pages/AllocationHistory';
import Help from './pages/Help';
import Contact from './pages/Contact';
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
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [deptId, setDeptId] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [depts, setDepts] = useState<any[]>([]);

  React.useEffect(() => {
    if (isRegisterMode && depts.length === 0) {
      api.get('/public/departments')
        .then(res => {
          // Xá»­ lÃ½ linh hoáº¡t: náº¿u backend tráº£ vá» [ ] hoáº·c { data: [ ] }
          const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          console.log('[DEBUG] App.tsx received depts:', data);
          setDepts(data);
        })
        .catch(err => {
          console.error('[App.tsx] Error fetching departments:', err);
          if (err.response?.status === 404) {
            console.error('[DEBUG] URL bá»‹ lá»—i 404 lÃ :', err.config?.baseURL + err.config?.url);
          }
        });
    }
  }, [isRegisterMode]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !newPassword) return;
    
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      await api.post('/auth/reset-password', { username, newPassword });
      setSuccessMsg('Äá»•i máº­t kháº©u thÃ nh cÃ´ng! Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.');
      setIsResetMode(false);
      setPassword('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Lá»—i Ä‘á»•i máº­t kháº©u');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !fullName || !deptId) {
      setError('Vui lÃ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ thÃ´ng tin');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      const response = await api.post('/auth/register', { 
        username, 
        password, 
        fullName, 
        departmentId: deptId,
        role
      });
      setSuccessMsg(response.data.message);
      setIsRegisterMode(false);
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Lá»—i Ä‘Äƒng kÃ½ tÃ i khoáº£n');
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
      setError(err.response?.data?.error || 'Lá»—i Ä‘Äƒng nháº­p');
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
          VÄƒn phÃ²ng pháº©m Danko Group
        </h1>
        <p className="text-slate-600 mb-8 text-lg font-medium leading-relaxed">
          Ná»n táº£ng quáº£n lÃ½ vÄƒn phÃ²ng pháº©m thÃ´ng minh vÃ  tá»‘i Æ°u nháº¥t dÃ nh cho doanh nghiá»‡p.
        </p>
        <form onSubmit={isRegisterMode ? handleRegister : (isResetMode ? handleResetPassword : handleLogin)} className="flex flex-col gap-4">
          {error && <div className="text-rose-500 bg-rose-50 p-3 rounded-lg text-sm font-bold shadow-sm">{error}</div>}
          {successMsg && <div className="text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-sm font-bold shadow-sm">{successMsg}</div>}
          
          <input 
            type="text" 
            placeholder="TÃªn Ä‘Äƒng nháº­p (VD: truong.phong, admin)" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition"
          />

          {isRegisterMode && (
            <>
              <input 
                type="text" 
                placeholder="Há» vÃ  tÃªn Ä‘áº§y Ä‘á»§" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition"
              />
              <select 
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition italic"
              >
                <option value="">-- Chá»n PhÃ²ng ban --</option>
                {depts.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600 transition"
              >
                <option value="EMPLOYEE">-- Vai trÃ²: NhÃ¢n viÃªn --</option>
                <option value="MANAGER">-- Vai trÃ²: TrÆ°á»Ÿng bá»™ pháº­n --</option>
              </select>
            </>
          )}
          
          {(!isResetMode || isRegisterMode) && (
            <input 
              type="password" 
              placeholder={isRegisterMode ? "Máº­t kháº©u mong muá»‘n" : "Máº­t kháº©u"} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition"
            />
          )}

          {isResetMode && !isRegisterMode && (
            <input 
              type="password" 
              placeholder="Nháº­p máº­t kháº©u má»›i" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium transition"
            />
          )}
          
          <button 
            type="submit"
            disabled={loading}
            className={`w-full px-6 py-4 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:-translate-y-1 focus:ring-4 disabled:opacity-50 ${isResetMode ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-xl shadow-teal-500/30 ring-teal-500/20' : (isRegisterMode ? 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-xl shadow-purple-500/30' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-indigo-500/30 ring-blue-500/20')}`}
          >
            {loading ? 'Äang xá»­ lÃ½...' : (isRegisterMode ? 'Gá»­i yÃªu cáº§u Khá»Ÿi táº¡o' : (isResetMode ? 'Äáº·t láº¡i máº­t kháº©u' : 'ÄÄƒng nháº­p há»‡ thá»‘ng'))}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-4 items-center">
          <button 
            type="button" 
            onClick={() => { 
                if (isRegisterMode) {
                    setIsRegisterMode(false);
                } else {
                    setIsResetMode(!isResetMode); 
                }
                setError(''); 
                setSuccessMsg(''); 
            }} 
            className="text-slate-500 font-bold hover:text-indigo-600 transition text-sm underline"
          >
             {isRegisterMode ? 'Quay láº¡i Ä‘Äƒng nháº­p' : (isResetMode ? 'Quay láº¡i mÃ n hÃ¬nh ÄÄƒng nháº­p' : 'QuÃªn máº­t kháº©u?')}
          </button>

          {!isResetMode && !isRegisterMode && (
            <button 
                type="button"
                onClick={() => { setIsRegisterMode(true); setError(''); setSuccessMsg(''); }}
                className="text-indigo-600 font-black hover:text-indigo-800 transition text-sm"
            >
                ChÆ°a cÃ³ tÃ i khoáº£n? ÄÄƒng kÃ½ táº¡i Ä‘Ã¢y
            </button>
          )}
        </div>
        <div className="mt-8 pt-6 border-t border-slate-200">
           <button onClick={() => navigate('/guest-request')} className="text-slate-500 font-bold hover:text-indigo-600 hover:underline transition">
              KhÃ´ng cÃ³ tÃ i khoáº£n? Táº¡o yÃªu cáº§u lÃ m KhÃ¡ch
           </button>
        </div>
      </div>
    </div>
  );
}

function ApprovedRequestEditShortcut() {
  const location = useLocation();
  const { currentUser } = useAppContext();
  const [request, setRequest] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const match = location.pathname.match(/^\/requests\/([^/]+)$/);
  const requestId = match?.[1];

  React.useEffect(() => {
    let cancelled = false;
    setRequest(null);

    if (!requestId || currentUser?.role !== 'ADMIN') return;

    api.get(`/requests/${requestId}`)
      .then((res) => {
        if (cancelled) return;
        setRequest(res.data?.data || res.data);
      })
      .catch(() => {
        if (!cancelled) setRequest(null);
      });

    return () => {
      cancelled = true;
    };
  }, [requestId, currentUser?.role]);

  const editableStatuses = ['APPROVED', 'READY_TO_ISSUE', 'PARTIAL_ADMIN_APPROVED', 'PARTIALLY_APPROVED', 'BACKORDER'];
  const totalDelivered = (request?.lines || []).reduce((sum: number, line: any) => {
    return sum + Number(line.qtyDelivered || line.deliveredQty || line.issuedQty || 0);
  }, 0);

  const canReopen = Boolean(
    requestId &&
    currentUser?.role === 'ADMIN' &&
    request &&
    editableStatuses.includes(request.status) &&
    totalDelivered === 0
  );

  React.useEffect(() => {
    const buttonId = 'admin-reopen-request-approval-action';
    document.getElementById(buttonId)?.remove();

    if (!canReopen || !requestId) return;

    let stopped = false;
    let intervalId: number | undefined;

    const mountButton = () => {
      if (stopped || document.getElementById(buttonId)) return true;

      const headings = Array.from(document.querySelectorAll('p'));
      const heading = headings.find((el) => {
        const text = (el.textContent || '').toLowerCase();
        return text.includes('chức năng chính') || text.includes('chuc nang chinh');
      });
      const container = heading?.parentElement;
      if (!container) return false;

      const button = document.createElement('button');
      button.id = buttonId;
      button.type = 'button';
      button.className = 'w-full py-2.5 bg-amber-500 text-white rounded-lg font-black hover:bg-amber-600 transition shadow-sm flex items-center justify-center transform hover:scale-[1.01] border border-amber-500 text-xs';
      button.textContent = loading ? 'ĐANG MỞ...' : 'MỞ SỬA LẠI';
      button.disabled = loading;
      button.title = 'Mở lại bước phê duyệt Admin để chỉnh sửa';
      button.onclick = async () => {
        const reason = window.prompt('Lý do mở lại bước phê duyệt Admin?', 'Admin mở lại phiếu đã duyệt để chỉnh sửa');
        if (!reason?.trim()) return;
        if (!window.confirm('Mở lại phiếu này về trạng thái chờ Admin phê duyệt?')) return;

        try {
          setLoading(true);
          button.disabled = true;
          button.textContent = 'ĐANG MỞ...';
          await api.post(`/requests/${requestId}/reopen-admin-approval`, { reason: reason.trim() });
          window.alert('Đã mở lại phiếu về bước chờ Admin phê duyệt.');
          window.location.reload();
        } catch (err: any) {
          window.alert(err.response?.data?.error || 'Không mở lại được phiếu. Vui lòng thử lại.');
          button.disabled = false;
          button.textContent = 'MỞ SỬA LẠI';
        } finally {
          setLoading(false);
        }
      };

      container.insertBefore(button, container.children[1] || null);
      return true;
    };

    if (!mountButton()) {
      intervalId = window.setInterval(() => {
        if (mountButton() && intervalId) window.clearInterval(intervalId);
      }, 300);
    }

    return () => {
      stopped = true;
      if (intervalId) window.clearInterval(intervalId);
      document.getElementById(buttonId)?.remove();
    };
  }, [canReopen, loading, requestId]);

  return null;
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ApprovedRequestEditShortcut />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/guest-request" element={<GuestRequest />} />
          <Route path="/receipts/:id/print" element={<ReceiptPrint />} />
          <Route path="/requests/:id/print" element={<RequestPrint />} />
          <Route path="/purchase-orders/:id/print" element={<PurchasePrint />} />
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Vá» sau sáº½ táº¡o 2 trang nÃ y */}
            <Route path="/requests" element={<Requests />} />
            <Route path="/requests/:id" element={<Requests />} />
            <Route path="/inventory-report" element={<InventoryReport />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/purchase-orders" element={<Purchases />} />
            <Route path="/purchase-orders/:id" element={<Purchases />} />
            <Route path="/procurement-batches" element={<ProcurementBatches />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/receipts/:id" element={<Receipts />} />
            <Route path="/users" element={<Users />} /> 
            <Route path="/items" element={<Items />} />
            <Route path="/warehouse-tickets" element={<WarehouseTickets />} />
            <Route path="/warehouse-tickets/:id" element={<WarehouseTicketDetail />} />
            
            {/* Janitorial Warehouse Routes */}
            <Route path="/janitorial-warehouse" element={<JanitorialWarehouse />} />
            <Route path="/janitorial-reports" element={<JanitorialReports />} />
            <Route path="/office-supplies-warehouse" element={<OfficeSuppliesWarehouse />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            
            {/* New Employee Focused Routes */}
            <Route path="/allocation-history" element={<AllocationHistory />} />
            <Route path="/help" element={<Help />} />
            <Route path="/contact" element={<Contact />} />

          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
