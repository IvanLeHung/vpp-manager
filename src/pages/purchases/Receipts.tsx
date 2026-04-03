import React, { useState } from 'react';
import ReceiptsList from './ReceiptsList';
import ReceiptsDetail from './ReceiptsDetail';

export type ViewMode = 'LIST' | 'DETAIL';

const Receipts: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  const handleViewDetail = (id: string) => {
    setSelectedReceiptId(id);
    setViewMode('DETAIL');
  };

  return (
    <div className="h-full bg-slate-50">
      {viewMode === 'LIST' && (
        <ReceiptsList 
          onViewDetail={handleViewDetail}
        />
      )}
      
      {viewMode === 'DETAIL' && selectedReceiptId && (
        <ReceiptsDetail 
          receiptId={selectedReceiptId}
          onBack={() => setViewMode('LIST')}
        />
      )}
    </div>
  );
};

export default Receipts;
