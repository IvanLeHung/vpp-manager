import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { Printer, ArrowLeft } from 'lucide-react';

function getItemSortGroupName(itemName: string) {
  if (!itemName) return '';
  return itemName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(a4|a5|a3|den|xanh|do|be|to|nho|lon)\b/g, "")
    .replace(/\b\d+(\.\d+)?\s*(ml|l|kg|g|cm|mm|m)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sortLinesForPrinting(lines: any[]) {
  return [...lines].sort((a, b) => {
    const itemA = a.item || {};
    const itemB = b.item || {};
    const groupA = itemA.printSortGroup || getItemSortGroupName(itemA.name || '');
    const groupB = itemB.printSortGroup || getItemSortGroupName(itemB.name || '');
    if (groupA !== groupB) return groupA.localeCompare(groupB, "vi");
    if (itemA.name !== itemB.name) return (itemA.name || '').localeCompare(itemB.name || '', "vi");
    return (itemA.mvpp || '').localeCompare(itemB.mvpp || '', "vi");
  });
}

const getActionLabel = (action: string) => {
  if (!action) return '—';
  switch(action.toUpperCase()) {
    case 'SUBMIT': return 'Gửi trình duyệt';
    case 'TBP_APPROVE': return 'Trưởng bộ phận Duyệt';
    case 'ADMIN_APPROVE': return 'Hành chính Duyệt';
    case 'RETURN_FOR_REVISION': case 'RETURN_FOR_EDIT': return 'Trả lại chỉnh sửa';
    case 'REJECT': return 'Từ chối toàn bộ';
    case 'CANCEL': return 'Hủy phiếu';
    case 'ISSUE': case 'ISSUED': return 'Xuất kho / Giao hàng';
    case 'PARTIAL_DELIVERY_CONFIRMED': return 'Xác nhận Giao hàng Một phần';
    case 'CONFIRM_RECEIPT': return 'Đã nhận hàng';
    case 'APPROVE': return 'Duyệt (Approve)';
    case 'TBP_REJECT': return 'Trưởng bộ phận Từ chối';
    case 'ADMIN_REJECT': return 'Hành chính Từ chối';
    case 'WITHDRAW': return 'Rút phiếu';
    case 'URGE_DELIVERY': return 'Hối thúc giao hàng';
    default: return action;
  }
};

const RequestPrint: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPrintType = searchParams.get('printType') || 'ALL';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const res = await api.get(`/requests/${id}`);
        setData(res.data);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.error || 'Không thể tải thông tin phiếu đề xuất');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRequest();
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
        <p className="mt-4 text-sm font-semibold text-slate-500 font-sans">Đang chuẩn bị bản in phiếu đề xuất...</p>
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

  const getItemCategoryType = (item: any): 'VPP' | 'VE_SINH' => {
    if (!item) return 'VPP';
    const itemType = String(item.itemType || '').toUpperCase();
    const category = String(item.category || '').toUpperCase();
    const mvpp = String(item.mvpp || '').toUpperCase();
    
    if (itemType.includes('VE_SINH') || itemType.includes('VỆ SINH') || 
        category.includes('VE_SINH') || category.includes('VỆ SINH') || category.includes('TẠP HÓA') ||
        mvpp.startsWith('VS')) {
      return 'VE_SINH';
    }
    return 'VPP';
  };

  const filteredLines = sortLinesForPrinting(data.lines || []).filter((l: any) => {
    if (selectedPrintType === 'ALL') return true;
    const type = getItemCategoryType(l.item);
    return type === selectedPrintType;
  });

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
            <Printer className="w-4 h-4" /> In Phiếu Đề Xuất
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
          display: grid;
          grid-template-cols: repeat(5, 1fr) !important;
          gap: 6px !important;
          margin-top: 15px;
          page-break-inside: avoid;
        }
        .print-signature-block {
          text-align: center;
          font-size: 9.5px !important;
        }
        .print-signature-block p {
          margin-bottom: 2px !important;
        }
      `}</style>

      {/* Print content container */}
      <div className="print-page">
        {/* Header */}
        <div className="print-header">
          <div className="w-[35%] text-left">
            <p className="font-bold text-[13px] uppercase">CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO</p>
            <p className="text-[10px] italic mt-1 font-bold">Số phiếu: {data.id}</p>
            <p className="text-[9px] text-slate-500 mt-1">Ban Hành chính Nhân sự</p>
          </div>
          <div className="w-[20%] flex flex-col items-center text-center">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(data.id)}`} 
              alt="QR Code" 
              className="w-16 h-16 border border-slate-100"
            />
            <p className="text-[8px] font-bold mt-1 uppercase text-slate-400">Scan to Verify</p>
          </div>
          <div className="w-[45%] text-center">
            <p className="text-[14px] font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className="text-[13px] font-bold underline decoration-[1.5px] underline-offset-[5px] mt-1">Độc lập - Tự do - Hạnh phúc</p>
            <p className="text-[11px] mt-3 text-slate-600 italic">Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-[22px] font-black uppercase tracking-widest break-words leading-tight underline underline-offset-8 decoration-slate-300">
            {(() => {
              if (selectedPrintType === 'VE_SINH') return 'PHIẾU ĐỀ XUẤT VỆ SINH';
              if (selectedPrintType === 'VPP') return 'PHIẾU ĐỀ XUẤT VĂN PHÒNG PHẨM';
              return 'PHIẾU ĐỀ XUẤT VĂN PHÒNG PHẨM VÀ ĐỒ VỆ SINH';
            })()}
          </h1>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-12 mb-6 text-sm">
          <div className="flex items-end"><span className="w-40 font-bold shrink-0">Người đề xuất:</span> <span className="flex-1 border-b border-dotted border-black pb-0.5">{data.requester?.fullName}</span></div>
          <div className="flex items-end"><span className="w-40 font-bold shrink-0">Phòng ban:</span> <span className="flex-1 border-b border-dotted border-black pb-0.5">{data.department}</span></div>
          <div className="flex items-end"><span className="w-40 font-bold shrink-0">Ngày lập phiếu:</span> <span className="flex-1 border-b border-dotted border-black pb-0.5">{new Date(data.createdAt).toLocaleDateString('vi-VN')}</span></div>
          <div className="flex items-end"><span className="w-40 font-bold shrink-0">Loại yêu cầu:</span> <span className="flex-1 border-b border-dotted border-black pb-0.5">{data.requestType}</span></div>
          <div className="col-span-2 flex items-end"><span className="w-40 font-bold shrink-0">Lý do / Mục đích:</span> <span className="flex-1 border-b border-dotted border-black pb-0.5 italic">"{data.purpose || 'Không có ghi chú'}"</span></div>
        </div>

        {/* Main Table */}
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '6%' }}>STT</th>
              <th style={{ width: '10%' }}>Mã VT</th>
              <th style={{ width: '30%' }}>Tên Văn Phòng Phẩm</th>
              <th style={{ width: '7%' }}>ĐVT</th>
              <th style={{ width: '6%' }}>SL</th>
              <th style={{ width: '12%' }}>Đơn giá</th>
              <th style={{ width: '14%' }}>Thành tiền</th>
              <th style={{ width: '15%' }}>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {filteredLines.map((l: any, idx: number) => {
              const displayItem = l.replacementItem || l.item;
              const isReplaced = !!l.replacementItemId;
              const displayQtyRequested = l.qtyRequested;
              const displayQtyApproved = l.replacementQty ?? l.qtyApproved;

              return (
                <tr key={l.id} className="h-10">
                  <td className="text-center font-medium">{idx + 1}</td>
                  <td className="text-center font-bold">{displayItem?.mvpp}</td>
                  <td className="font-medium">
                    <div className="flex flex-col">
                      <span>{displayItem?.name}</span>
                      {isReplaced && (
                        <span className="text-[10px] text-slate-500 italic mt-0.5">
                          (Thay cho: {l.item?.name})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-center">{displayItem?.unit}</td>
                  <td className="text-center font-black text-base">
                    {displayQtyApproved !== null && (displayQtyApproved !== displayQtyRequested || l.qtyManagerApproved !== displayQtyRequested) ? (
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-[9px] text-slate-400 line-through mb-1">{displayQtyRequested}</span>
                        <span>{displayQtyApproved}</span>
                        {l.qtyManagerApproved !== null && l.qtyManagerApproved !== displayQtyApproved && !isReplaced && (
                          <span className="text-[8px] font-bold text-slate-400 mt-1 italic">
                            (TBP: {l.qtyManagerApproved})
                          </span>
                        )}
                      </div>
                    ) : (
                      displayQtyApproved ?? displayQtyRequested
                    )}
                  </td>
                  <td className="text-right font-medium">
                    {(displayItem?.price || 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="text-right font-bold">
                    {((displayItem?.price || 0) * (displayQtyApproved ?? displayQtyRequested)).toLocaleString('vi-VN')}
                  </td>
                  <td className="italic text-[10px] leading-tight">{l.note || '—'}</td>
                </tr>
              );
            })}
            <tr className="bg-slate-50 h-10 font-black">
              <td colSpan={4} className="text-right uppercase text-xs">Tổng cộng:</td>
              <td className="text-center text-lg">
                {filteredLines.reduce((sum: number, line: any) => sum + (line.replacementQty ?? line.qtyApproved ?? line.qtyRequested), 0)}
              </td>
              <td className="text-right" colSpan={2}>
                {filteredLines.reduce((sum: number, line: any) => {
                  const item = line.replacementItem || line.item;
                  const qty = line.replacementQty ?? line.qtyApproved ?? line.qtyRequested;
                  return sum + ((item?.price || 0) * qty);
                }, 0).toLocaleString('vi-VN')} VNĐ
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {/* Signatures */}
        <div className="print-signatures grid-cols-5">
          <div className="print-signature-block">
            <p className="mb-2 uppercase">Người đề xuất</p>
            <p className="text-[11px] font-normal italic mb-4">(Ký và ghi họ tên)</p>
            <div className="mt-12 border-t border-dotted border-black w-[90%] mx-auto pt-2 relative">
              <p className="font-black text-xs uppercase">{data.requester?.fullName}</p>
              <p className="text-[9px] font-bold text-blue-600 mt-1">
                {new Date(data.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} (Đã ký số)
              </p>
            </div>
          </div>
          
          <div className="print-signature-block">
            <p className="mb-2 uppercase text-slate-600">Trưởng bộ phận</p>
            <p className="text-[11px] font-normal italic mb-4">(Ký xác nhận)</p>
            <div className="mt-12 border-t border-dotted border-black w-[90%] mx-auto pt-2">
              {(() => {
                const h = data.approvalHistories?.slice().reverse().find((x:any) => 
                  (x.action.includes('APPROVE') || x.action === 'APPROVED') && 
                  (x.approver?.role === 'MANAGER' || x.action.includes('TBP') || x.reason?.toLowerCase().includes('quản lý'))
                );
                return (
                  <>
                    {h && <p className="text-[10px] font-bold text-blue-600 mb-1">(Đã ký số)</p>}
                    <p className="font-black text-xs uppercase">{h?.approver?.fullName || '............................'}</p>
                    {h && (
                      <p className="text-[9px] font-normal text-slate-500 mt-1">
                        {new Date(h.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          <div className="print-signature-block">
            <p className="mb-2 uppercase">Người duyệt</p>
            <p className="text-[11px] font-normal italic mb-4">(Hành chính/Lãnh đạo)</p>
            <div className="mt-12 border-t border-dotted border-black w-[90%] mx-auto pt-2">
              {(() => {
                const h = data.approvalHistories?.slice().reverse().find((x:any) => 
                  (x.action.includes('APPROVE') || x.action === 'APPROVED') && 
                  (x.approver?.role === 'ADMIN' || x.action.includes('ADMIN') || x.reason?.toLowerCase().includes('hành chính'))
                );
                return (
                  <>
                    {h && <p className="text-[10px] font-bold text-blue-600 mb-1">(Đã ký số)</p>}
                    <p className="font-black text-xs uppercase">{h?.approver?.fullName || '............................'}</p>
                    {h && (
                      <p className="text-[9px] font-normal text-slate-500 mt-1">
                        {new Date(h.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          <div className="print-signature-block">
            <p className="mb-2 uppercase">Thủ kho / Xuất</p>
            <p className="text-[11px] font-normal italic mb-4">(Ký và ghi tên)</p>
            <div className="mt-12 border-t border-dotted border-black w-[90%] mx-auto pt-2">
              {(() => {
                const h = data.approvalHistories?.slice().reverse().find((x:any) => x.action === 'ISSUE' || x.action === 'ISSUED');
                return (
                  <>
                    {h && <p className="text-[10px] font-bold text-blue-600 mb-1">(Đã ký số)</p>}
                    <p className="font-black text-xs uppercase">{h?.approver?.fullName || '............................'}</p>
                    {h && (
                      <p className="text-[9px] font-normal text-slate-500 mt-1">
                        {new Date(h.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          <div className="print-signature-block">
            <p className="mb-2 uppercase text-indigo-700">Người nhận</p>
            <p className="text-[11px] font-normal italic mb-4">(Ký nhận đủ hàng)</p>
            <div className="mt-12 border-t border-dotted border-black w-[90%] mx-auto pt-2">
              <p className="font-black text-xs uppercase">
                {data.status === 'COMPLETED' ? data.requester?.fullName : '............................'}
              </p>
              {data.status === 'COMPLETED' && (
                <p className="text-[9px] font-normal text-slate-400 italic">Đã nhận đủ hàng</p>
              )}
            </div>
          </div>
        </div>

        {/* Audit Trail Section for Print */}
        <div className="mt-12 border-t border-slate-300 pt-6">
          <h3 className="text-[11px] font-black uppercase mb-3 text-slate-800 tracking-widest flex items-center">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mr-2"></span>
            Lịch sử Xử lý (Audit Trail)
          </h3>
          <table className="w-full border-collapse text-[10px] print-table">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-300 p-1.5 text-left font-bold uppercase w-32">Thời gian</th>
                <th className="border border-slate-300 p-1.5 text-left font-bold uppercase w-48">Người thực hiện</th>
                <th className="border border-slate-300 p-1.5 text-left font-bold uppercase w-32">Hành động</th>
                <th className="border border-slate-300 p-1.5 text-left font-bold uppercase">Ghi chú / Nội dung</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-slate-50/50">
                <td className="border border-slate-300 p-1.5 whitespace-nowrap">
                  {new Date(data.createdAt).toLocaleString('vi-VN', { 
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </td>
                <td className="border border-slate-300 p-1.5 font-bold uppercase text-slate-700">
                  {data.requester?.fullName}
                </td>
                <td className="border border-slate-300 p-1.5">
                  <span className="px-1.5 py-0.5 rounded-sm font-bold text-[9px] bg-slate-100 text-slate-600">
                    Tạo phiếu
                  </span>
                </td>
                <td className="border border-slate-300 p-1.5 italic text-slate-600">
                  Khởi tạo yêu cầu
                </td>
              </tr>
              {data.approvalHistories?.map((h: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="border border-slate-300 p-1.5 whitespace-nowrap">
                    {new Date(h.createdAt).toLocaleString('vi-VN', { 
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="border border-slate-300 p-1.5 font-bold uppercase text-slate-700">
                    {h.approver?.fullName} {h.approver?.role === 'ADMIN' ? '(ADM)' : ''}
                  </td>
                  <td className="border border-slate-300 p-1.5">
                    <span className={`px-1.5 py-0.5 rounded-sm font-bold text-[9px] ${
                      h.action.includes('REJECT') ? 'bg-rose-50 text-rose-700' :
                      h.action.includes('APPROVE') ? 'bg-emerald-50 text-emerald-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {getActionLabel(h.action)}
                    </span>
                  </td>
                  <td className="border border-slate-300 p-1.5 italic text-slate-600">
                    {h.reason || '—'}
                  </td>
                </tr>
              ))}
              {(!data.approvalHistories || data.approvalHistories.length === 0) && (
                <tr>
                  <td colSpan={4} className="border border-slate-300 p-4 text-center text-slate-400 italic">
                    Chưa có lịch sử xử lý.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-2 text-[8px] text-slate-400 text-right italic">HỆ THỐNG TRÍCH XUẤT LÚC {new Date().toLocaleTimeString('vi-VN')}</p>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-200 text-[11px] text-[#555] flex justify-between print-info">
          <p>Ngày in: {new Date().toLocaleString('vi-VN')} • Mã tra cứu: {data.id}</p>
          <p>Hệ thống Quản lý VPP - {data.id} • Trang 1/1</p>
        </div>
      </div>
    </div>
  );
};

export default RequestPrint;
