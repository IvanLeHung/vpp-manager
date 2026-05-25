import React, { useState } from 'react';
import { 
  FileText, 
  Layers, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink, 
  X,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DocumentPreviewModal from './DocumentPreviewModal';

interface DocumentInfo {
  id: string;
  status: string;
  requester?: { fullName: string };
  supplier?: string;
  totalAmount?: number;
  warehouseCode?: string;
  receiver?: { fullName: string };
  receiveDate?: string;
  createdAt: string;
}

interface DocumentChainMapProps {
  chainData: {
    request?: DocumentInfo;
    purchaseOrder?: DocumentInfo;
    receipts?: DocumentInfo[];
  };
  currentDocType: 'request' | 'po' | 'receipt';
  currentDocId: string;
}

export default function DocumentChainMap({
  chainData,
  currentDocType,
  currentDocId
}: DocumentChainMapProps) {
  const navigate = useNavigate();
  const [previewDoc, setPreviewDoc] = useState<{ type: 'PR' | 'PO' | 'GRN'; id: string } | null>(null);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);

  const onOpen = (type: 'PR' | 'PO' | 'GRN', id: string) => {
    const query = `?from=${currentDocType}&ref=${currentDocId}`;
    if (type === 'PR') {
      navigate(`/requests/${id}${query}`);
    } else if (type === 'PO') {
      navigate(`/purchase-orders/${id}${query}`);
    } else if (type === 'GRN') {
      navigate(`/receipts/${id}${query}`);
    }
  };

  const onPreview = (type: 'PR' | 'PO' | 'GRN', id: string) => {
    setPreviewDoc({ type, id });
  };

  const renderStatusBadge = (status: string, type: 'PR' | 'PO' | 'GRN') => {
    let classes = 'bg-slate-50 text-slate-600 border-slate-150';
    let text = status;

    if (type === 'PR') {
      const statusMap: Record<string, { cls: string, label: string }> = {
        DRAFT: { cls: 'bg-slate-100 text-slate-500', label: 'Nháp' },
        PENDING_MANAGER: { cls: 'bg-amber-50 text-amber-600 border-amber-100', label: 'Chờ TBP duyệt' },
        PENDING_ADMIN: { cls: 'bg-blue-50 text-blue-600 border-blue-100', label: 'Chờ Admin duyệt' },
        APPROVED: { cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Đã duyệt' },
        READY_TO_ISSUE: { cls: 'bg-indigo-50 text-indigo-600 border-indigo-100', label: 'Chờ cấp phát' },
        COMPLETED: { cls: 'bg-emerald-500 text-white border-emerald-600', label: 'Hoàn tất' },
        BACKORDER: { cls: 'bg-amber-500 text-white border-amber-600', label: 'Báo thiếu' },
        REJECTED: { cls: 'bg-rose-50 text-rose-600 border-rose-100', label: 'Từ chối' },
        CANCELLED: { cls: 'bg-slate-100 text-slate-400', label: 'Đã hủy' }
      };
      const found = statusMap[status];
      if (found) { classes = found.cls; text = found.label; }
    } else if (type === 'PO') {
      const statusMap: Record<string, { cls: string, label: string }> = {
        DRAFT: { cls: 'bg-slate-100 text-slate-500', label: 'Nháp' },
        PENDING_APPROVAL: { cls: 'bg-amber-50 text-amber-600 border-amber-100', label: 'Chờ duyệt' },
        APPROVED: { cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Đã duyệt' },
        ORDERED: { cls: 'bg-blue-50 text-blue-600 border-blue-100', label: 'Đã đặt hàng' },
        DELIVERING: { cls: 'bg-indigo-50 text-indigo-600 border-indigo-100', label: 'Đang giao' },
        COMPLETED: { cls: 'bg-emerald-500 text-white border-emerald-600', label: 'Hoàn tất' },
        CANCELLED: { cls: 'bg-slate-100 text-slate-400', label: 'Đã hủy' },
        REJECTED: { cls: 'bg-rose-50 text-rose-600 border-rose-100', label: 'Bị từ chối' }
      };
      const found = statusMap[status];
      if (found) { classes = found.cls; text = found.label; }
    } else if (type === 'GRN') {
      const statusMap: Record<string, { cls: string, label: string }> = {
        PENDING: { cls: 'bg-amber-50 text-amber-600 border-amber-100', label: 'Chờ kiểm hàng' },
        PARTIAL_RECEIVED: { cls: 'bg-blue-50 text-blue-600 border-blue-100', label: 'Nhập một phần' },
        PARTIALLY_RECEIVED: { cls: 'bg-blue-50 text-blue-600 border-blue-100', label: 'Nhập một phần' },
        COMPLETED: { cls: 'bg-emerald-500 text-white border-emerald-600', label: 'Hoàn tất' },
        COMPLETED_WITH_SHORTAGE: { cls: 'bg-amber-500 text-white border-amber-600', label: 'Hoàn tất thiếu' },
        CANCELLED: { cls: 'bg-slate-100 text-slate-400', label: 'Đã hủy' }
      };
      const found = statusMap[status];
      if (found) { classes = found.cls; text = found.label; }
    }

    return (
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${classes}`}>
        {text}
      </span>
    );
  };

  const { request, purchaseOrder, receipts } = chainData;
  const hasMultipleGRNs = receipts && receipts.length > 1;

  return (
    <div className="space-y-6 relative before:absolute before:top-4 before:bottom-4 before:left-5 before:w-0.5 before:bg-slate-200">
      
      {/* 1. Request Card */}
      {request && (
        <div className="flex gap-4 items-start relative pl-2">
          <div className="w-10 h-10 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center shrink-0 z-10 shadow-sm">
            <FileText className="w-5 h-5 text-blue-650" />
          </div>
          <div 
            onClick={() => onOpen('PR', request.id)}
            className="flex-1 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/10 hover:shadow-md p-5 rounded-2xl transition-all duration-200 cursor-pointer relative group"
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-blue-500">
              <ExternalLink className="w-4 h-4" />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">Phiếu Đề Xuất</span>
              {renderStatusBadge(request.status, 'PR')}
            </div>
            
            <h4 className="text-sm font-black text-slate-800 mt-2">{request.id}</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-slate-500 mt-3 border-t border-slate-100 pt-2.5">
              <p>Người tạo: <span className="font-extrabold text-slate-700">{request.requester?.fullName || 'N/A'}</span></p>
              <p>Ngày tạo: <span className="font-bold">{new Date(request.createdAt).toLocaleDateString('vi-VN')}</span></p>
            </div>

            <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100">
              <button 
                onClick={(e) => { e.stopPropagation(); onPreview('PR', request.id); }}
                className="text-xs font-black text-blue-600 hover:text-blue-800 transition"
              >
                Xem nhanh
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onOpen('PR', request.id); }}
                className="text-xs font-black text-slate-400 hover:text-slate-600 transition"
              >
                Mở phiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PO Card */}
      {purchaseOrder && (
        <div className="flex gap-4 items-start relative pl-2">
          <div className="w-10 h-10 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center shrink-0 z-10 shadow-sm">
            <Layers className="w-5 h-5 text-indigo-650" />
          </div>
          <div 
            onClick={() => onOpen('PO', purchaseOrder.id)}
            className="flex-1 bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/10 hover:shadow-md p-5 rounded-2xl transition-all duration-200 cursor-pointer relative group"
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-indigo-500">
              <ExternalLink className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">Phiếu Mua Hàng / PO</span>
              {renderStatusBadge(purchaseOrder.status, 'PO')}
            </div>

            <h4 className="text-sm font-black text-slate-800 mt-2">{purchaseOrder.id}</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-slate-500 mt-3 border-t border-slate-100 pt-2.5">
              <p>Nhà cung cấp: <span className="font-extrabold text-slate-700">{purchaseOrder.supplier || 'N/A'}</span></p>
              <p>Ngày lập PO: <span className="font-bold">{new Date(purchaseOrder.createdAt).toLocaleDateString('vi-VN')}</span></p>
              <p className="md:col-span-2">Tổng giá trị: <span className="font-black text-emerald-650">{Number(purchaseOrder.totalAmount || 0).toLocaleString('vi-VN')} đ</span></p>
            </div>

            <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100">
              <button 
                onClick={(e) => { e.stopPropagation(); onPreview('PO', purchaseOrder.id); }}
                className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition"
              >
                Xem nhanh
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onOpen('PO', purchaseOrder.id); }}
                className="text-xs font-black text-slate-400 hover:text-slate-600 transition"
              >
                Mở phiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Receipts Card(s) */}
      {receipts && receipts.length > 0 && (
        <div className="flex gap-4 items-start relative pl-2">
          <div className="w-10 h-10 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shrink-0 z-10 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          
          {hasMultipleGRNs ? (
            <div 
              onClick={() => setShowReceiptsModal(true)}
              className="flex-1 bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/10 hover:shadow-md p-5 rounded-2xl transition-all duration-200 cursor-pointer relative group"
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-emerald-500">
                <ExternalLink className="w-4 h-4" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">Phiếu Nhập Kho / GRN</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border bg-amber-50 text-amber-600 border-amber-100">
                  {receipts.length} Phiếu nhập kho liên kết
                </span>
              </div>

              <h4 className="text-sm font-black text-slate-800 mt-2">Danh sách phiếu nhập kho ({receipts.length} phiếu)</h4>
              <p className="text-[11px] text-slate-400 mt-2.5 italic">
                Các phiếu: {receipts.map(r => r.id).join(', ')}
              </p>

              <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowReceiptsModal(true); }}
                  className="text-xs font-black text-emerald-650 hover:text-emerald-800 transition"
                >
                  Xem danh sách
                </button>
              </div>
            </div>
          ) : (
            // Single Receipt
            (() => {
              const rc = receipts[0];
              return (
                <div 
                  onClick={() => onOpen('GRN', rc.id)}
                  className="flex-1 bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/10 hover:shadow-md p-5 rounded-2xl transition-all duration-200 cursor-pointer relative group"
                >
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-emerald-500">
                    <ExternalLink className="w-4 h-4" />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">Phiếu Nhập Kho / GRN</span>
                    {renderStatusBadge(rc.status, 'GRN')}
                  </div>

                  <h4 className="text-sm font-black text-slate-800 mt-2">{rc.id}</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-slate-500 mt-3 border-t border-slate-100 pt-2.5">
                    <p>Kho nhận: <span className="font-extrabold text-slate-700">{rc.warehouseCode || 'MAIN'}</span></p>
                    <p>Thủ kho: <span className="font-extrabold text-slate-700">{rc.receiver?.fullName || 'N/A'}</span></p>
                    <p className="md:col-span-2">Ngày nhập: <span className="font-bold">{rc.receiveDate ? new Date(rc.receiveDate).toLocaleDateString('vi-VN') : new Date(rc.createdAt).toLocaleDateString('vi-VN')}</span></p>
                  </div>

                  <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onPreview('GRN', rc.id); }}
                      className="text-xs font-black text-emerald-650 hover:text-emerald-800 transition"
                    >
                      Xem nhanh
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onOpen('GRN', rc.id); }}
                      className="text-xs font-black text-slate-400 hover:text-slate-600 transition"
                    >
                      Mở phiếu
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL OVERLAY */}
      {previewDoc && (
        <DocumentPreviewModal 
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          docType={previewDoc.type}
          docId={previewDoc.id}
          currentDocType={currentDocType}
          currentDocId={currentDocId}
        />
      )}

      {/* MULTIPLE GRNs LIST MODAL */}
      {showReceiptsModal && receipts && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[210] flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans text-slate-800">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Danh sách Phiếu Nhập Kho (GRN)
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Tìm thấy {receipts.length} phiếu nhập kho liên kết</p>
              </div>
              <button 
                onClick={() => setShowReceiptsModal(false)} 
                className="p-2 hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 divide-y divide-slate-100 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
              {receipts.map((r, idx) => (
                <div 
                  key={r.id}
                  className="w-full py-3 px-3 hover:bg-slate-50 rounded-xl transition flex justify-between items-center group border border-slate-100 mt-2 first:mt-0"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-extrabold text-slate-800">{r.id}</p>
                        {renderStatusBadge(r.status, 'GRN')}
                      </div>
                      <p className="text-[10px] text-slate-450 mt-1">
                        Kho: <span className="font-bold">{r.warehouseCode || 'MAIN'}</span> • Nhập: {r.receiveDate ? new Date(r.receiveDate).toLocaleDateString('vi-VN') : new Date(r.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => onPreview('GRN', r.id)}
                      className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-600 transition"
                    >
                      Xem nhanh
                    </button>
                    <button 
                      onClick={() => {
                        setShowReceiptsModal(false);
                        onOpen('GRN', r.id);
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg transition"
                    >
                      Mở phiếu
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowReceiptsModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition text-xs uppercase tracking-wide"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
