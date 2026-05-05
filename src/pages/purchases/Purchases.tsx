import React, { useState } from 'react';
import PurchasesList from './PurchasesList';
import PurchasesCreate from './PurchasesCreate';
import PurchasesDetail from './PurchasesDetail';

export type ViewMode = 'LIST' | 'CREATE' | 'DETAIL';

const Purchases: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateNew = () => {
    setSelectedPoId(null);
    setViewMode('CREATE');
  };

  const handleViewDetail = (id: string) => {
    setSelectedPoId(id);
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
        <PurchasesList 
          onCreateNew={handleCreateNew} 
          onViewDetail={handleViewDetail}
        />
      )}
      
      {viewMode === 'CREATE' && (
        <PurchasesCreate 
          onBack={() => setViewMode('LIST')}
          poId={selectedPoId}
          onSuccess={() => setViewMode('LIST')}
        />
      )}
      
      {viewMode === 'DETAIL' && selectedPoId && (
        <PurchasesDetail 
          poId={selectedPoId}
          onBack={() => setViewMode('LIST')}
          showToast={showToast}
        />
      )}
    </div>
  );
};

export default Purchases;
