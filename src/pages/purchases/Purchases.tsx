import React, { useState } from 'react';
import PurchasesList from './PurchasesList';
import PurchasesCreate from './PurchasesCreate';
import PurchasesDetail from './PurchasesDetail';

export type ViewMode = 'LIST' | 'CREATE' | 'DETAIL';

const Purchases: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setSelectedPoId(null);
    setViewMode('CREATE');
  };

  const handleEdit = (id: string) => {
    setSelectedPoId(id);
    setViewMode('CREATE'); // Reusing create form for edit
  };

  const handleViewDetail = (id: string) => {
    setSelectedPoId(id);
    setViewMode('DETAIL');
  };

  return (
    <div className="h-full bg-slate-50">
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
          onEdit={() => handleEdit(selectedPoId)}
        />
      )}
    </div>
  );
};

export default Purchases;
