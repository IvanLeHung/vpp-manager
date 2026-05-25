import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReceiptsList from './ReceiptsList';
import ReceiptsDetail from './ReceiptsDetail';

export type ViewMode = 'LIST' | 'DETAIL';

const Receipts: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [navigationIds, setNavigationIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning'} | null>(null);

  useEffect(() => {
    if (id) {
      setSelectedReceiptId(id);
      setViewMode('DETAIL');
    }
  }, [id]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleViewDetail = (id: string, navIds?: string[]) => {
    setSelectedReceiptId(id);
    if (navIds) setNavigationIds(navIds);
    setViewMode('DETAIL');
  };


  return (
    <div className="h-full bg-slate-50 relative">
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
        <ReceiptsList 
          onViewDetail={handleViewDetail}
        />
      )}
      
      {viewMode === 'DETAIL' && selectedReceiptId && (
        <ReceiptsDetail 
          receiptId={selectedReceiptId}
          navigationIds={navigationIds}
          onBack={() => setViewMode('LIST')}
          showToast={showToast}
        />
      )}
    </div>
  );
};

export default Receipts;
