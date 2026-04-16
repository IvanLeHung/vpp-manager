import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';

import RequestsList from './requests/RequestsList';
import RequestsCreate from './requests/RequestsCreate';
import RequestsDetail from './requests/RequestsDetail';
import RequestsWorkflow from './requests/RequestsWorkflow';

import type { VPPRequest } from '../context/AppContext';

export type ViewMode = 'LIST' | 'CREATE' | 'VIEW' | 'WORKFLOW';

export default function Requests() {
  const { currentUser } = useAppContext();
  const [searchParams] = useSearchParams();
  
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [requests, setRequests] = useState<VPPRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<VPPRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/requests');
      setRequests(res.data?.data || res.data || []);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi tải danh sách phiếu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Handle direct navigation via search params if needed (optional)
  useEffect(() => {
    const mode = searchParams.get('mode') as ViewMode;
    if (mode && ['LIST', 'CREATE', 'VIEW', 'WORKFLOW'].includes(mode)) {
      setViewMode(mode);
    }
  }, [searchParams]);

  if (loading && requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 overflow-hidden relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-xl shadow-2xl border flex items-center animate-slide-in font-bold ${
          toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 
          toast.type === 'error' ? 'bg-rose-500 text-white border-rose-400' : 
          'bg-amber-500 text-white border-amber-400'
        }`}>
          {toast.message}
        </div>
      )}
      {viewMode === 'LIST' && (
        <RequestsList 
          requests={requests}
          currentUser={currentUser!}
          setViewMode={setViewMode}
          setActiveRequest={setActiveRequest}
          refreshData={fetchRequests}
          showToast={showToast}
        />
      )}

      {viewMode === 'CREATE' && (
        <RequestsCreate 
          setViewMode={setViewMode}
          refreshData={fetchRequests}
          showToast={showToast}
          activeRequest={activeRequest}
        />
      )}

      {viewMode === 'VIEW' && activeRequest && (
        <RequestsDetail 
          requestId={activeRequest.id}
          setViewMode={setViewMode}
          refreshData={fetchRequests}
          showToast={showToast}
          currentUser={currentUser!}
        />
      )}

      {viewMode === 'WORKFLOW' && (
        <RequestsWorkflow onBack={() => setViewMode('LIST')} />
      )}
    </div>
  );
}
