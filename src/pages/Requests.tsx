import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import RequestsList from './requests/RequestsList';
import RequestsCreate from './requests/RequestsCreate';
import RequestsDetail from './requests/RequestsDetail';
import type { VPPRequest } from '../context/AppContext';

export type ViewMode = 'LIST' | 'CREATE' | 'VIEW';

export default function Requests() {
  const { currentUser, requests, refreshData } = useAppContext();
  
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [activeRequest, setActiveRequest] = useState<VPPRequest | null>(null);

  // Toast System
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning', id: number} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };

  // Reload data when mounting
  useEffect(() => {
    refreshData();
  }, []);

  return (
    <div className="relative h-[calc(100vh-64px)] overflow-hidden bg-slate-50 print:bg-white print:h-auto">
      {/* Toast Notification */}
      {toast && (
        <div className={`absolute top-4 right-4 z-50 animate-slide-in-right px-6 py-3 rounded-xl shadow-2xl border font-bold flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-600' : 
          toast.type === 'error' ? 'bg-rose-500 text-white border-rose-600' : 
          'bg-amber-500 text-white border-amber-600'
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
          refreshData={refreshData}
          showToast={showToast}
        />
      )}

      {viewMode === 'CREATE' && (
        <RequestsCreate 
          setViewMode={setViewMode}
          refreshData={refreshData}
          showToast={showToast}
          activeRequest={activeRequest} // If we want to edit draft later
        />
      )}

      {viewMode === 'VIEW' && activeRequest && (
        <RequestsDetail 
          requestId={activeRequest.id}
          setViewMode={setViewMode}
          refreshData={refreshData}
          showToast={showToast}
          currentUser={currentUser!}
        />
      )}
    </div>
  );
}
