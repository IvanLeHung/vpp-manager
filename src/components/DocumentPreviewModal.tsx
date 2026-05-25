import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Info,
  Calendar,
  DollarSign,
  User,
  Home,
  Truck
} from 'lucide-react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  docType: 'PR' | 'PO' | 'GRN';
  docId: string;
  currentDocType?: 'request' | 'po' | 'receipt';
  currentDocId?: string;
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  docType,
  docId,
  currentDocType,
  currentDocId
}: DocumentPreviewModalProps) {
  const navigate = useNavigate();
  const [detailData, setDetailData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !docId) {
      setDetailData(null);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let endpoint = '';
        if (docType === 'PR') {
          endpoint = `/requests/${docId}`;
        } else if (docType === 'PO') {
          endpoint = `/purchases/${docId}`;
        } else if (docType === 'GRN') {
          endpoint = `/receipts/${docId}`;
        }

        if (endpoint) {
          const res = await api.get(endpoint);
          setDetailData(res.data);
        }
      } catch (err: any) {
        console.error('Error fetching document preview:', err);
        setError(err.response?.data?.error || 'Không thể tải thông tin chi tiết tài liệu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, docType, docId]);

  if (!isOpen) return null;

  const renderStatusBadge = (status: string) => {
    let classes = 'bg-slate-50 text-slate-600 border-slate-100';
    let text = status;

    if (docType === 'PR') {
      const statusMap: Record<string, { cls: string, label: string }> = {
        DRAFT: { cls: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Nháp' },
        PENDING_MANAGER: { cls: 'bg-amber-50 text-amber-600 border-amber-100', label: 'Chờ TBP duyệt' },
        PENDING_ADMIN: { cls: 'bg-blue-50 text-blue-600 border-blue-100', label: 'Chờ Admin duyệt' },
        APPROVED: { cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Đã duyệt' },
        READY_TO_ISSUE: { cls: 'bg-indigo-50 text-indigo-600 border-indigo-100', label: 'Chờ cấp phát' },
        COMPLETED: { cls: 'bg-emerald-500 text-white border-emerald-600', label: 'Hoàn tất' },
        BACKORDER: { cls: 'bg-amber-500 text-white border-amber-600', label: 'Báo thiếu' },
        REJECTED: { cls: 'bg-rose-50 text-rose-600 border-rose-100', label: 'Từ chối' },
        CANCELLED: { cls: 'bg-slate-100 text-slate-400 border-slate-200', label: 'Đã hủy' }
      };
      const found = statusMap[status];
      if (found) {
        classes = found.cls;
        text = found.label;
      }
    } else if (docType === 'PO') {
      const statusMap: Record<string, { cls: string, label: string }> = {
        DRAFT: { cls: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Nháp' },
        PENDING_APPROVAL: { cls: 'bg-amber-50 text-amber-600 border-amber-100', label: 'Chờ duyệt' },
        APPROVED: { cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Đã duyệt' },
        ORDERED: { cls: 'bg-blue-50 text-blue-600 border-blue-100', label: 'Đã đặt hàng' },
        DELIVERING: { cls: 'bg-indigo-50 text-indigo-600 border-indigo-100', label: 'Đang giao' },
        COMPLETED: { cls: 'bg-emerald-500 text-white border-emerald-600', label: 'Hoàn tất' },
        CANCELLED: { cls: 'bg-slate-100 text-slate-400 border-slate-200', label: 'Đã hủy' },
        REJECTED: { cls: 'bg-rose-50 text-rose-600 border-rose-100', label: 'Bị từ chối' }
      };
      const found = statusMap[status];
      if (found) {
        classes = found.cls;
        text = found.label;
      }
    } else if (docType === 'GRN') {
      const statusMap: Record<string, { cls: string, label: string }> = {
        PENDING: { cls: 'bg-amber-50 text-amber-600 border-amber-100', label: 'Chờ kiểm hàng' },
        PARTIAL_RECEIVED: { cls: 'bg-blue-50 text-blue-600 border-blue-100', label: 'Nhập một phần' },
        PARTIALLY_RECEIVED: { cls: 'bg-blue-50 text-blue-600 border-blue-100', label: 'Nhập một phần' },
        COMPLETED: { cls: 'bg-emerald-500 text-white border-emerald-600', label: 'Hoàn tất' },
        COMPLETED_WITH_SHORTAGE: { cls: 'bg-amber-500 text-white border-amber-600', label: 'Hoàn tất thiếu' },
        CANCELLED: { cls: 'bg-slate-100 text-slate-400 border-slate-200', label: 'Đã hủy' }
      };
      const found = statusMap[status];
      if (found) {
        classes = found.cls;
        text = found.label;
      }
    }

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${classes}`}>
        {text}
      </span>
    );
  };

  const handleOpenDetails = () => {
    onClose();
    const query = currentDocType && currentDocId ? `?from=${currentDocType}&ref=${currentDocId}` : '';
    if (docType === 'PR') {
      navigate(`/requests/${docId}${query}`);
    } else if (docType === 'PO') {
      navigate(`/purchase-orders/${docId}${query}`);
    } else if (docType === 'GRN') {
      navigate(`/receipts/${docId}${query}`);
    }
  };

  const isCurrentDoc = currentDocId === docId;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans text-slate-800">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black text-indigo-650 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
              {docType === 'PR' ? 'Phiếu Đề Xuất (PR) - Xem nhanh' :
               docType === 'PO' ? 'Đơn Đặt Hàng (PO) - Xem nhanh' : 'Biên Bản Nhận Kho (GRN) - Xem nhanh'}
            </span>
            <h3 className="text-base font-bold text-slate-800 mt-1 flex items-center gap-2">
              Mã tài liệu: <span className="font-extrabold text-indigo-600">{docId}</span>
              {detailData?.status && renderStatusBadge(detailData.status)}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-slate-700">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin"></div>
              <p className="text-xs font-bold text-slate-400">Đang tải dữ liệu liên kết...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && detailData && (
            <div className="space-y-6">
              
              {/* PR Details */}
              {docType === 'PR' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Người đề xuất</p>
                      <p className="font-bold text-slate-800">{detailData.requester?.fullName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Bộ phận / Phòng ban</p>
                      <p className="font-bold text-slate-800">{detailData.department || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Ngày lập đề xuất</p>
                      <p className="font-bold text-slate-800">{new Date(detailData.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Mục đích sử dụng</p>
                      <p className="font-bold text-slate-800 italic">"{detailData.purpose || 'Không ghi nhận'}"</p>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mt-6">Danh sách vật tư đề xuất</h4>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 font-black">
                        <th className="py-2 w-8 text-center">STT</th>
                        <th className="py-2">Hàng hóa</th>
                        <th className="py-2 text-center w-16">ĐVT</th>
                        <th className="py-2 text-center w-20">Yêu cầu</th>
                        <th className="py-2 text-center w-20">Đã duyệt</th>
                        <th className="py-2 text-center w-20">Đã giao</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {detailData.lines?.map((line: any, idx: number) => (
                        <tr key={line.id} className="hover:bg-slate-50/50">
                          <td className="py-3 text-center text-slate-300 font-medium">{idx + 1}</td>
                          <td className="py-3 font-semibold text-slate-800">
                            {line.item?.name}
                            <span className="block text-[10px] text-slate-400 font-normal">{line.item?.mvpp}</span>
                          </td>
                          <td className="py-3 text-center text-slate-500 font-medium">{line.item?.unit}</td>
                          <td className="py-3 text-center font-bold text-slate-600">{line.qtyRequested}</td>
                          <td className="py-3 text-center font-black text-indigo-600">{line.qtyApproved ?? '-'}</td>
                          <td className="py-3 text-center font-bold text-emerald-600">{line.qtyDelivered}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PO Details */}
              {docType === 'PO' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Nhà cung cấp</p>
                      <p className="font-bold text-slate-800">{detailData.supplier || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Tổng giá trị PO</p>
                      <p className="font-bold text-emerald-600">{Number(detailData.totalAmount || 0).toLocaleString('vi-VN')} VNĐ</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Ngày hẹn giao</p>
                      <p className="font-bold text-slate-800">{detailData.expectedDate ? new Date(detailData.expectedDate).toLocaleDateString('vi-VN') : 'Chưa thiết lập'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Người đề nghị mua</p>
                      <p className="font-bold text-slate-800">{detailData.requesterName || detailData.requester?.fullName || 'N/A'}</p>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mt-6">Danh sách vật tư đặt hàng</h4>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 font-black">
                        <th className="py-2 w-8 text-center">STT</th>
                        <th className="py-2">Mặt hàng</th>
                        <th className="py-2 text-center w-16">ĐVT</th>
                        <th className="py-2 text-center w-24">Số lượng PO</th>
                        <th className="py-2 text-right w-28">Đơn giá (VNĐ)</th>
                        <th className="py-2 text-right w-32">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {detailData.lines?.map((line: any, idx: number) => (
                        <tr key={line.id} className="hover:bg-slate-50/50">
                          <td className="py-3 text-center text-slate-300 font-medium">{idx + 1}</td>
                          <td className="py-3 font-semibold text-slate-800">
                            {line.item?.name}
                            <span className="block text-[10px] text-slate-400 font-normal">{line.item?.mvpp}</span>
                          </td>
                          <td className="py-3 text-center text-slate-500 font-medium">{line.item?.unit}</td>
                          <td className="py-3 text-center font-bold text-slate-800">{line.qtyOrdered}</td>
                          <td className="py-3 text-right font-medium text-slate-600">{Number(line.unitPrice || 0).toLocaleString('vi-VN')}</td>
                          <td className="py-3 text-right font-bold text-slate-800">{Number(line.lineAmount || 0).toLocaleString('vi-VN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* GRN Details */}
              {docType === 'GRN' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Nhà cung cấp</p>
                      <p className="font-bold text-slate-800">{detailData.supplier || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Thủ kho nhận hàng</p>
                      <p className="font-bold text-slate-800">{detailData.receiver?.fullName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Ngày nhận kho</p>
                      <p className="font-bold text-slate-800">{new Date(detailData.receiveDate || detailData.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Kho hàng nhận</p>
                      <p className="font-bold text-slate-800">{detailData.warehouseCode || 'MAIN'}</p>
                    </div>
                  </div>

                  {detailData.status === 'COMPLETED_WITH_SHORTAGE' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs space-y-1">
                      <p className="text-amber-800 font-black flex items-center gap-1.5">
                        <Clock className="w-4 h-4" /> ĐÃ ĐÓNG THIẾU PHIẾU
                      </p>
                      <p className="text-amber-700">Lý do đóng thiếu: <span className="font-bold">{detailData.shortageReason || 'Không rõ'}</span></p>
                      {detailData.shortageNote && <p className="text-amber-600 font-medium italic">Ghi chú: {detailData.shortageNote}</p>}
                    </div>
                  )}

                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mt-6">Chi tiết danh mục thực nhận</h4>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 font-black">
                        <th className="py-2 w-8 text-center">STT</th>
                        <th className="py-2">Vật tư nhận</th>
                        <th className="py-2 text-center w-16">ĐVT</th>
                        <th className="py-2 text-center w-24">Yêu cầu PO</th>
                        <th className="py-2 text-center w-24">Thực nhập</th>
                        <th className="py-2 text-center w-24">Thiếu/Lệch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {detailData.lines?.map((line: any, idx: number) => {
                        const shortage = line.shortageQty || Math.max(0, line.qtyOrdered - line.qtyConfirmed);
                        return (
                          <tr key={line.id} className="hover:bg-slate-50/50">
                            <td className="py-3 text-center text-slate-300 font-medium">{idx + 1}</td>
                            <td className="py-3 font-semibold text-slate-800">
                              {line.item?.name}
                              <span className="block text-[10px] text-slate-400 font-normal">{line.item?.mvpp}</span>
                            </td>
                            <td className="py-3 text-center text-slate-500 font-medium">{line.item?.unit}</td>
                            <td className="py-3 text-center font-bold text-slate-400">{line.qtyOrdered}</td>
                            <td className="py-3 text-center font-black text-emerald-600">{line.qtyConfirmed}</td>
                            <td className={`py-3 text-center font-bold ${shortage > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                              {shortage > 0 ? `Thiếu ${shortage}` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition text-xs uppercase tracking-wide"
          >
            Đóng
          </button>
          {!isCurrentDoc && detailData && (
            <button
              onClick={handleOpenDetails}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition text-xs uppercase tracking-wide flex items-center gap-1.5"
            >
              Mở chi tiết phiếu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
