import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Package, 
  User, 
  Home, 
  ArrowRight, 
  X, 
  Calendar, 
  DollarSign, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FolderOpen,
  Info,
  Layers
} from 'lucide-react';
import api from '../lib/api';

interface DocumentInfo {
  id: string;
  code?: string;
  name?: string;
}

interface LinkedDocumentReferencesProps {
  request?: DocumentInfo;
  purchaseOrder?: DocumentInfo;
  receipt?: DocumentInfo;
  warehouse?: DocumentInfo;
  supplier?: DocumentInfo;
}

type DocType = 'PR' | 'PO' | 'GRN' | 'WAREHOUSE' | 'SUPPLIER';

export default function LinkedDocumentReferences({
  request,
  purchaseOrder,
  receipt,
  warehouse,
  supplier
}: LinkedDocumentReferencesProps) {
  const [activeDoc, setActiveDoc] = useState<{ type: DocType; id: string; name?: string } | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeDoc) {
      setDetailData(null);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let endpoint = '';
        if (activeDoc.type === 'PR') {
          endpoint = `/requests/${activeDoc.id}`;
        } else if (activeDoc.type === 'PO') {
          endpoint = `/purchases/${activeDoc.id}`;
        } else if (activeDoc.type === 'GRN') {
          endpoint = `/receipts/${activeDoc.id}`;
        } else if (activeDoc.type === 'WAREHOUSE') {
          endpoint = `/inventory/stocks?warehouseCode=${activeDoc.id}`;
        }

        if (endpoint) {
          const res = await api.get(endpoint);
          setDetailData(res.data);
        } else if (activeDoc.type === 'SUPPLIER') {
          // Supplier doesn't have a direct detail endpoint in current API, we can fetch their POs
          const res = await api.get(`/purchases`);
          const supplierPOs = (res.data || []).filter((p: any) => p.supplier === activeDoc.id);
          setDetailData({ name: activeDoc.name || activeDoc.id, pos: supplierPOs });
        }
      } catch (err: any) {
        console.error('Error fetching reference data:', err);
        setError(err.response?.data?.error || 'Không thể tải thông tin chi tiết tham chiếu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeDoc]);

  const renderStatusBadge = (status: string, type: DocType) => {
    let classes = 'bg-slate-50 text-slate-600 border-slate-100';
    let text = status;

    if (type === 'PR') {
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
    } else if (type === 'PO') {
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
    } else if (type === 'GRN') {
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
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${classes}`}>
        {text}
      </span>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
      <span>Tham chiếu:</span>
      
      {/* Request Badge */}
      {request && request.id && (
        <button
          onClick={() => setActiveDoc({ type: 'PR', id: request.id })}
          className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-100 rounded-lg transition duration-200 shadow-sm"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Đề xuất: {request.code || request.id}</span>
        </button>
      )}

      {/* PO Badge */}
      {purchaseOrder && purchaseOrder.id && (
        <button
          onClick={() => setActiveDoc({ type: 'PO', id: purchaseOrder.id })}
          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 border border-indigo-100 rounded-lg transition duration-200 shadow-sm"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>PO: {purchaseOrder.code || purchaseOrder.id}</span>
        </button>
      )}

      {/* Receipt Badge */}
      {receipt && receipt.id && (
        <button
          onClick={() => setActiveDoc({ type: 'GRN', id: receipt.id })}
          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 border border-emerald-100 rounded-lg transition duration-200 shadow-sm"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>GRN: {receipt.code || receipt.id}</span>
        </button>
      )}

      {/* Warehouse Badge */}
      {warehouse && warehouse.id && (
        <button
          onClick={() => setActiveDoc({ type: 'WAREHOUSE', id: warehouse.id })}
          className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-700 border border-slate-200 rounded-lg transition duration-200 shadow-sm"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Kho: {warehouse.name || warehouse.id}</span>
        </button>
      )}

      {/* Supplier Badge */}
      {supplier && supplier.id && (
        <button
          onClick={() => setActiveDoc({ type: 'SUPPLIER', id: supplier.id, name: supplier.name })}
          className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border border-amber-100 rounded-lg transition duration-200 shadow-sm"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>NCC: {supplier.name || supplier.id}</span>
        </button>
      )}

      {/* DETAILED MODAL OVERLAY */}
      {activeDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200 text-slate-850 font-sans">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  {activeDoc.type === 'PR' ? 'Phiếu Đề Xuất (PR)' :
                   activeDoc.type === 'PO' ? 'Đơn Đặt Hàng (PO)' :
                   activeDoc.type === 'GRN' ? 'Biên Bản Nhận Kho (GRN)' :
                   activeDoc.type === 'WAREHOUSE' ? 'Thông Tin Kho Hàng' : 'Thông Tin Nhà Cung Cấp'}
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-1 flex items-center gap-2">
                  Mã tài liệu: <span className="font-extrabold text-indigo-600">{activeDoc.id}</span>
                  {detailData?.status && renderStatusBadge(detailData.status, activeDoc.type)}
                </h3>
              </div>
              <button 
                onClick={() => setActiveDoc(null)} 
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
                  {activeDoc.type === 'PR' && (
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
                          <p className="font-bold text-slate-800 italic">{detailData.purpose || 'Không ghi nhận'}</p>
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
                  {activeDoc.type === 'PO' && (
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
                  {activeDoc.type === 'GRN' && (
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

                  {/* Warehouse details */}
                  {activeDoc.type === 'WAREHOUSE' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-1">
                        <p className="font-bold text-slate-850">
                          {activeDoc.id === 'MAIN' ? 'Kho Văn Phòng Phẩm Chính (MAIN)' : 'Kho Đồ Dọn Vệ Sinh / Tẩy Rửa (VE_SINH)'}
                        </p>
                        <p className="text-slate-500 leading-relaxed">
                          {activeDoc.id === 'MAIN' 
                            ? 'Lưu trữ các vật tư hành chính, giấy in, bút, sổ tay, ghim kẹp,... cấp phát trực tiếp cho nhân viên văn phòng.' 
                            : 'Lưu trữ các hóa chất tẩy rửa, dụng cụ vệ sinh, túi rác, xà phòng,... quản lý phân phối bởi bộ phận tạp vụ.'}
                        </p>
                      </div>

                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mt-6">Tồn kho hiện có (Top 25 mặt hàng)</h4>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100 font-black">
                            <th className="py-2 w-8 text-center">STT</th>
                            <th className="py-2">Tên vật tư</th>
                            <th className="py-2 text-center w-24">Mã VT</th>
                            <th className="py-2 text-center w-24">Phân loại</th>
                            <th className="py-2 text-center w-20">Tồn kho</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {(detailData || []).slice(0, 25).map((stock: any, idx: number) => (
                            <tr key={stock.id} className="hover:bg-slate-50/50">
                              <td className="py-3 text-center text-slate-300 font-medium">{idx + 1}</td>
                              <td className="py-3 font-semibold text-slate-800">{stock.item?.name}</td>
                              <td className="py-3 text-center text-slate-500 font-bold">{stock.item?.mvpp}</td>
                              <td className="py-3 text-center text-slate-400 font-medium">{stock.item?.category}</td>
                              <td className="py-3 text-center font-black text-blue-600">{stock.quantityOnHand} {stock.item?.unit}</td>
                            </tr>
                          ))}
                          {(detailData || []).length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-10 text-center italic text-slate-400">Không có dữ liệu tồn kho nào được ghi nhận.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Supplier details */}
                  {activeDoc.type === 'SUPPLIER' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Nhà cung cấp đối tác</p>
                        <p className="font-extrabold text-slate-800 text-sm">{activeDoc.name || activeDoc.id}</p>
                      </div>

                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mt-6">Lịch sử đơn mua sắm (POs) liên quan</h4>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100 font-black">
                            <th className="py-2 w-8 text-center">STT</th>
                            <th className="py-2">Mã PO</th>
                            <th className="py-2">Tiêu đề mua sắm</th>
                            <th className="py-2 text-center w-24">Trạng thái</th>
                            <th className="py-2 text-right w-28">Tổng tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {detailData?.pos?.map((po: any, idx: number) => (
                            <tr key={po.id} className="hover:bg-slate-50/50">
                              <td className="py-3 text-center text-slate-300 font-medium">{idx + 1}</td>
                              <td className="py-3 font-bold text-indigo-600">{po.id}</td>
                              <td className="py-3 font-semibold text-slate-850 truncate max-w-[250px]">{po.title}</td>
                              <td className="py-3 text-center">{renderStatusBadge(po.status, 'PO')}</td>
                              <td className="py-3 text-right font-black text-emerald-600">{Number(po.totalAmount || 0).toLocaleString('vi-VN')} đ</td>
                            </tr>
                          ))}
                          {(detailData?.pos || []).length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-10 text-center italic text-slate-400">Không tìm thấy đơn hàng nào liên kết với nhà cung cấp này.</td>
                            </tr>
                          )}
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
                onClick={() => setActiveDoc(null)}
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
