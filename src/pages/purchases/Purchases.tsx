import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PurchasesList from './PurchasesList';
import PurchasesCreate from './PurchasesCreate';
import PurchasesDetail from './PurchasesDetail';
import PurchaseReportHistory from './PurchaseReportHistory';
import PageErrorBoundary from '../../components/PageErrorBoundary';

export type ViewMode = 'LIST' | 'CREATE' | 'DETAIL' | 'REPORT_HISTORY';

const Purchases: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [navigationIds, setNavigationIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning'} | null>(null);
  const [recreateConfig, setRecreateConfig] = useState<any | null>(null);
  const [detailRetryKey, setDetailRetryKey] = useState(0);

  useEffect(() => {
    if (id) {
      setSelectedPoId(id);
      setViewMode('DETAIL');
    }
  }, [id]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateNew = () => {
    setSelectedPoId(null);
    setViewMode('CREATE');
  };

  const handleViewDetail = (id: string, ids: string[] = []) => {
    setNavigationIds(ids);
    navigate(`/purchase-orders/${encodeURIComponent(id)}`);
  };

  const handleBackToList = () => {
    setSelectedPoId(null);
    setViewMode('LIST');
    navigate('/purchase-orders');
  };

  const handleNavigateDetail = (nextId: string) => {
    navigate(`/purchase-orders/${encodeURIComponent(nextId)}`);
  };

  const handleRecreateReport = (config: any) => {
    setRecreateConfig(config);
    setViewMode('LIST');
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
          onShowHistory={() => setViewMode('REPORT_HISTORY')}
          recreateConfig={recreateConfig}
          clearRecreateConfig={() => setRecreateConfig(null)}
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
        <PageErrorBoundary
          resetKey={`${selectedPoId}:${detailRetryKey}`}
          onBack={handleBackToList}
          onRetry={() => setDetailRetryKey(value => value + 1)}
        >
          <PurchasesDetail
            key={`${selectedPoId}:${detailRetryKey}`}
            poId={selectedPoId}
            navigationIds={navigationIds}
            onNavigate={handleNavigateDetail}
            onBack={handleBackToList}
            showToast={showToast}
          />
        </PageErrorBoundary>
      )}

      {viewMode === 'REPORT_HISTORY' && (
        <PurchaseReportHistory 
          onBack={() => setViewMode('LIST')}
          onRecreate={handleRecreateReport}
        />
      )}
    </div>
  );
};

export default Purchases;
