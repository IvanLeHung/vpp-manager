import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { Printer, ArrowLeft } from 'lucide-react';

const formatDigitalSignatureDate = (date: string | Date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const PurchasePrint: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPrintType = searchParams.get('printType') || 'ALL';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPurchase = async () => {
      try {
        const res = await api.get(`/purchases/${id}`);
        setData(res.data);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.error || 'Không thể tải thông tin đơn mua hàng PO');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPurchase();
    }
  }, [id]);

  useEffect(() => {
    if (data) {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-slate-500 font-sans">Đang chuẩn bị bản in PO...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 font-sans">
        <p className="text-rose-500 font-bold mb-4">{error || 'Không tìm thấy dữ liệu'}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition text-xs uppercase tracking-wide">
          Quay lại
        </button>
      </div>
    );
  }

  const filteredLines = (data.lines || []).filter((l: any) => {
    if (selectedPrintType === 'ALL') return true;
    const type = l.item?.itemType || (l.item?.mvpp?.startsWith('VPP') ? 'VPP' : 'VE_SINH');
    return type === selectedPrintType;
  });

  const hasReplacement = filteredLines.some((l: any) => !!l.requestLine?.replacementItemId);

  const approvedTotal = filteredLines.reduce((sum: number, l: any) => {
    const origPrice = Number(l.requestLine?.unitPrice || l.requestLine?.item?.price || 0);
    const origQty = Number(l.requestLine?.qtyRequested || l.qtyRequested || 0);
    return sum + (origPrice * origQty);
  }, 0);

  const actualTotal = filteredLines.reduce((sum: number, l: any) => {
    const isReplaced = !!l.requestLine?.replacementItemId;
    const effectivePrice = isReplaced ? Number(l.requestLine?.replacementPrice || 0) : Number(l.unitPrice || 0);
    const qtyActual = l.qtyOrdered ?? l.qtyApproved ?? l.qtyRequested;
    const effectiveQty = isReplaced ? Number(l.requestLine?.replacementQty || 0) : qtyActual;
    return sum + (effectivePrice * effectiveQty);
  }, 0);

  const diff = actualTotal - approvedTotal;

  return (
    <div className="bg-white min-h-screen text-black">
      {/* Control bar */}
      <div className="no-print bg-slate-100 border-b border-slate-200 px-6 py-3 flex justify-between items-center font-sans">
        <button
          onClick={() => window.close()}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Đóng Tab in
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">Nếu hộp thoại in không tự động mở, vui lòng nhấn:</span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-sm"
          >
            <Printer className="w-4 h-4" /> In Đơn Mua Hàng PO
          </button>
        </div>
      </div>

      {/* CSS Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm 12mm 15mm 12mm;
          }
        }
        .print-page {
          font-family: "Times New Roman", Times, serif, "Inter", sans-serif;
          color: #000;
          background: #fff;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 10mm 15mm;
          box-sizing: border-box;
        }
        .print-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 20px;
        }
        .print-title {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          text-transform: uppercase;
          margin-top: 15px;
          margin-bottom: 20px;
          letter-spacing: 0.5px;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          margin-bottom: 25px;
        }
        .print-table th, .print-table td {
          border: 1px solid #000;
          padding: 6px 8px;
          font-size: 11px;
          line-height: 1.4;
        }
        .print-table th {
          background-color: #f2f2f2 !important;
          font-weight: bold;
          text-align: center;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-table tr {
          page-break-inside: avoid;
        }
        .print-signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          page-break-inside: avoid;
        }
        .print-signature-block {
          text-align: center;
          width: 30%;
        }
      `}</style>

      {/* Print content container */}
      <div className="print-page">
        {/* Header */}
        <div className="print-header flex justify-between items-start mb-6 border-b-2 border-slate-900 pb-4">
          <div className="flex flex-col">
            <h1 className="text-[16px] font-black text-slate-900 leading-tight">CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO</h1>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Hệ thống Quản lý Vật tư - Thiết bị</p>
            <p className="text-[9px] font-medium text-slate-400 italic">Mã hệ thống: {data.id}</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white border border-slate-200 p-1 mb-1">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${data.id}`} 
                alt="QR Verification" 
                className="w-full h-full"
              />
            </div>
            <p className="text-[8px] font-black tracking-widest uppercase text-slate-400">SCAN TO VERIFY</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-[24px] font-black uppercase tracking-widest mb-1">
            {(() => {
              if (selectedPrintType === 'VE_SINH') return 'ĐƠN ĐẶT HÀNG VỆ SINH (PO)';
              if (selectedPrintType === 'VPP') return 'ĐƠN ĐẶT HÀNG VĂN PHÒNG PHẨM (PO)';
              return 'ĐƠN ĐẶT HÀNG TỔNG HỢP (PO)';
            })()}
          </h2>
          <div className="w-32 h-1 bg-slate-900 mx-auto mb-2"></div>
          <p className="text-[11px] font-bold text-slate-600">Số PO: {data.id}</p>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-3 mb-8 text-[12px]">
          <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-1">
            <span className="font-bold min-w-[120px]">Người lập phiếu:</span>
            <span className="flex-1">{data.requester?.fullName}</span>
          </div>
          <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-1">
            <span className="font-bold min-w-[120px]">Kho xuất/nhập:</span>
            <span className="flex-1 font-bold">{data.department || 'VĂN PHÒNG'}</span>
          </div>
          <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-1">
            <span className="font-bold min-w-[120px]">Ngày lập phiếu:</span>
            <span className="flex-1">{new Date(data.createdAt).toLocaleDateString('vi-VN')}</span>
          </div>
          <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-1">
            <span className="font-bold min-w-[120px]">Ngày thực thi:</span>
            <span className="flex-1">{data.expectedDate ? new Date(data.expectedDate).toLocaleDateString('vi-VN') : '---'}</span>
          </div>
          <div className="col-span-2 flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-1">
            <span className="font-bold min-w-[120px]">Lý do / Ghi chú:</span>
            <span className="flex-1 italic">"{data.purpose || 'Mua hàng bổ sung văn phòng'}"</span>
          </div>
        </div>

        {/* Main Table */}
        <table className="print-table w-full mb-8 border-collapse border-2 border-slate-900">
          <thead className="bg-slate-100">
            <tr className="text-[10px] font-black uppercase text-center border-b-2 border-slate-900">
              <th className="p-2 border-r border-slate-900 whitespace-nowrap" style={{width: '6%'}}>STT</th>
              <th className="p-2 border-r border-slate-900" style={{width: '10%'}}>MÃ VT</th>
              <th className="p-2 border-r border-slate-900 text-left" style={{width: '30%'}}>TÊN VẬT TƯ / LINH KIỆN</th>
              <th className="p-2 border-r border-slate-900" style={{width: '7%'}}>ĐVT</th>
              <th className="p-2 border-r border-slate-900" style={{width: '6%'}}>SL</th>
              <th className="p-2 border-r border-slate-900" style={{width: '15%'}}>ĐƠN GIÁ</th>
              <th className="p-2 border-r border-slate-900" style={{width: '15%'}}>THÀNH TIỀN</th>
              <th className="p-2" style={{width: '11%'}}>GHI CHÚ</th>
            </tr>
          </thead>
          <tbody>
            {filteredLines.map((l: any, idx: number) => {
              const isReplaced = !!l.requestLine?.replacementItemId;
              const effectiveItem = isReplaced ? l.requestLine.replacementItem : l.item;
              const qtyActual = l.qtyOrdered ?? l.qtyApproved ?? l.qtyRequested;
              const effectiveQty = isReplaced ? Number(l.requestLine?.replacementQty || 0) : qtyActual;
              const effectivePrice = isReplaced ? Number(l.requestLine?.replacementPrice || 0) : Number(l.unitPrice || 0);
              const effectiveAmount = effectivePrice * effectiveQty;

              return (
                <tr key={l.id} className="text-[10px] border-b border-slate-300 h-10">
                  <td className="text-center p-2 border-r border-slate-400 font-bold">{idx + 1}</td>
                  <td className="text-center p-2 border-r border-slate-400 font-black">{effectiveItem?.mvpp || l.item?.mvpp}</td>
                  <td className="p-2 border-r border-slate-400">
                    <div className="flex flex-col">
                      <span className="font-bold text-[11px] uppercase">{effectiveItem?.name || l.item?.name}</span>
                      {isReplaced && (
                        <span className="text-[8px] text-slate-500 italic mt-0.5">
                          (Thay cho: {l.item?.name})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-center p-2 border-r border-slate-400">{effectiveItem?.unit || l.item?.unit}</td>
                  <td className="text-center p-2 border-r border-slate-400 font-black">{effectiveQty}</td>
                  <td className="text-right p-2 border-r border-slate-400 font-medium">{effectivePrice.toLocaleString('vi-VN')}</td>
                  <td className="text-right p-2 border-r border-slate-400 font-black bg-slate-50">{effectiveAmount.toLocaleString('vi-VN')}</td>
                  <td className="p-2 italic text-[9px]">{l.note || (l.location ? `@${l.location}` : '')} {l.gender ? `[${l.gender}]` : ''}</td>
                </tr>
              );
            })}
            <tr className="font-black bg-slate-100 uppercase text-[12px] border-t-2 border-slate-900">
              <td colSpan={4} className="p-3 text-right">Tổng cộng (Đã bao gồm VAT {data.vat}%):</td>
              <td className="text-center p-3 border-x border-slate-900">
                {filteredLines.reduce((sum: number, l: any) => {
                  const qtyActual = l.qtyOrdered ?? l.qtyApproved ?? l.qtyRequested;
                  return sum + (!!l.requestLine?.replacementItemId ? Number(l.requestLine?.replacementQty || 0) : qtyActual);
                }, 0)}
              </td>
              <td className="p-3 text-right" colSpan={2}>
                {(() => {
                  const subTotal = filteredLines.reduce((sum: number, l: any) => {
                    const isReplaced = !!l.requestLine?.replacementItemId;
                    const effectivePrice = isReplaced ? Number(l.requestLine?.replacementPrice || 0) : Number(l.unitPrice || 0);
                    const qtyActual = l.qtyOrdered ?? l.qtyApproved ?? l.qtyRequested;
                    const effectiveQty = isReplaced ? Number(l.requestLine?.replacementQty || 0) : qtyActual;
                    return sum + (effectivePrice * effectiveQty);
                  }, 0);
                  const vatAmount = subTotal * ((data.vat || 0) / 100);
                  return (subTotal + vatAmount).toLocaleString('vi-VN');
                })()} VNĐ
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {/* Tgđ Approval / Replacement report */}
        {hasReplacement && (
          <div className="mb-8 p-4 border-2 border-dashed border-slate-400 rounded-xl bg-slate-50/30">
            <h4 className="text-[12px] font-black uppercase mb-3 border-b border-slate-300 pb-2">BÁO CÁO THAY THẾ VẬT TƯ THỰC TẾ</h4>
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">TỔNG GIÁ TRỊ ĐỀ XUẤT ĐÃ DUYỆT</p>
                <p className="text-[14px] font-bold text-slate-700">{approvedTotal.toLocaleString('vi-VN')} đ</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">TỔNG GIÁ TRỊ MUA THỰC TẾ SAU RÀ SOÁT</p>
                <p className="text-[14px] font-black text-indigo-700">{actualTotal.toLocaleString('vi-VN')} đ</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">HIỆU QUẢ TỐI ƯU CHI PHÍ MUA SẮM</p>
                <p className="text-[14px] font-black">
                  <span className={diff <= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {diff <= 0 ? 'Tiết kiệm: ' : 'Tăng thêm: '}
                    {Math.abs(diff).toLocaleString('vi-VN')} đ
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="flex justify-between items-start mt-2 px-6 print-signatures">
          <div className="text-center w-1/3 print-signature-block">
            <p className="font-black uppercase text-[12px] mb-1">NGƯỜI LẬP PHIẾU</p>
            <div className="mt-6">
              <p className="font-black uppercase text-[13px]">{data.requester?.fullName}</p>
              <p className="text-[9px] font-bold text-blue-600 mt-1">
                {formatDigitalSignatureDate(data.createdAt)} (Đã ký số)
              </p>
            </div>
          </div>
          <div className="text-center w-1/3 print-signature-block">
            <p className="font-black uppercase text-[12px] mb-1">TRƯỞNG BỘ PHẬN</p>
            <div className="mt-10">
              <p className="font-black uppercase text-[13px]">{data.approver?.fullName || '..........................'}</p>
              {data.approvedAt && (
                <p className="text-[9px] font-bold text-blue-600 mt-1">
                  {formatDigitalSignatureDate(data.approvedAt)} (Đã ký số)
                </p>
              )}
              {!data.approvedAt && <p className="text-[10px] text-slate-400">.../.../...</p>}
            </div>
          </div>
          <div className="text-center w-1/3 print-signature-block">
            <p className="font-black uppercase text-[12px] mb-1">THỦ KHO / XUẤT</p>
            <div className="mt-16">
              <p className="font-black uppercase text-[13px]">..........................</p>
              <p className="text-[10px] text-slate-400">.../.../...</p>
            </div>
          </div>
        </div>

        <div className="mt-20 border-t border-slate-200 pt-4 flex justify-between text-[9px] text-slate-400 italic">
          <p>Ngày in: {new Date().toLocaleString('vi-VN')} • Mã hệ thống: {data.id}</p>
          <p>Hệ thống Quản lý Tồn kho - Danko Group • Trang 1/1</p>
        </div>
      </div>
    </div>
  );
};

export default PurchasePrint;
