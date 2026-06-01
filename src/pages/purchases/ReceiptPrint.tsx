import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Printer, ArrowLeft } from 'lucide-react';

const ReceiptPrint: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const res = await api.get(`/receipts/${id}`);
        setData(res.data);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.error || 'Không thể tải thông tin phiếu nhập kho');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchReceipt();
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
        <p className="mt-4 text-sm font-semibold text-slate-500 font-sans">Đang chuẩn bị bản in biên bản...</p>
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

  // Construct printLines
  const printLines: any[] = [];
  data.lines.forEach((line: any) => {
    const isUnexpected = line.qtyOrdered === 0;
    
    if (isUnexpected) {
      printLines.push({
        id: line.id,
        itemCode: line.item.mvpp,
        itemName: line.item.name,
        unit: line.item.unit,
        qtyOrdered: '-',
        qtyAccepted: line.qtyConfirmed,
        shortageQty: 0,
        handlingType: line.status || 'Hàng phát sinh ngoài PO',
        note: line.note || '',
        isUnexpected: true
      });
    } else {
      const replacements = data.replacements?.filter(
        (r: any) => r.originalReceiptLineId === line.id && r.status === 'ACCEPTED'
      ) || [];

      const isFullyReplaced = line.qtyConfirmed === 0 && replacements.length > 0;

      if (line.qtyConfirmed > 0 || (line.qtyConfirmed === 0 && replacements.length === 0 && data.status !== 'COMPLETED_WITH_SHORTAGE')) {
        // If not shortage closed, print unreceived standard lines here too (optional, but keep default behavior)
        // If shortage closed, we print unreceived lines in the separate table below.
        printLines.push({
          id: line.id,
          itemCode: line.item.mvpp,
          itemName: line.item.name,
          unit: line.item.unit,
          qtyOrdered: line.qtyOrdered,
          qtyAccepted: line.qtyConfirmed,
          shortageQty: line.shortageQty || 0,
          handlingType: 'Đúng model',
          note: line.note || '',
          isOriginal: true
        });
      }

      replacements.forEach((rep: any) => {
        printLines.push({
          id: rep.id,
          itemCode: rep.replacementItem.mvpp,
          itemName: rep.replacementItem.name,
          unit: rep.replacementItem.unit,
          qtyOrdered: isFullyReplaced ? line.qtyOrdered : '-',
          qtyAccepted: rep.replacementQty,
          shortageQty: 0,
          handlingType: 'Đổi hàng / Sai model',
          note: `Thay cho: ${line.item.name}. Lý do: ${rep.reason}${rep.note ? ` (${rep.note})` : ''}`,
          isReplacement: true
        });
      });
    }
  });

  // Construct undelivered / fully replaced lines
  const undeliveredLines = data.lines.filter((line: any) => {
    if (line.qtyOrdered === 0) return false;
    return line.qtyConfirmed === 0;
  });

  const getUndeliveredStatus = (line: any) => {
    const reps = data.replacements?.filter(
      (r: any) => r.originalReceiptLineId === line.id && r.status === 'ACCEPTED'
    ) || [];
    if (reps.length > 0) {
      return `Đã đổi sang: ${reps.map((r: any) => `${r.replacementItem.name} (SL ${r.replacementQty})`).join(', ')}`;
    }
    return 'Không nhập / Chưa giao';
  };

  const totalActualQty = printLines.reduce((sum: number, line: any) => sum + (line.qtyAccepted || 0), 0);
  const totalShortageQty = data.status === 'COMPLETED_WITH_SHORTAGE'
    ? printLines.reduce((sum: number, line: any) => sum + (line.shortageQty || (line.qtyOrdered > 0 ? Math.max(0, line.qtyOrdered - line.qtyAccepted) : 0)), 0) +
      undeliveredLines.reduce((sum: number, line: any) => {
        const hasRep = (data.replacements || []).some((r: any) => r.originalReceiptLineId === line.id && r.status === 'ACCEPTED');
        return sum + (hasRep ? 0 : line.qtyOrdered); // don't double count shortage of fully replaced items
      }, 0)
    : 0;

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
            <Printer className="w-4 h-4" /> In Biên Bản
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
        .company-info p {
          margin: 2px 0;
          font-size: 11px;
          line-height: 1.3;
        }
        .receipt-code-info {
          text-align: right;
        }
        .receipt-code-info p {
          margin: 2px 0;
          font-size: 11px;
          font-weight: bold;
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
        .meta-grid {
          display: grid;
          grid-template-cols: 1fr 1fr;
          column-gap: 40px;
          row-gap: 6px;
          margin-bottom: 20px;
          font-size: 13px;
          line-height: 1.4;
        }
        .meta-item {
          display: flex;
        }
        .meta-label {
          font-weight: bold;
          min-width: 140px;
        }
        .meta-val {
          flex: 1;
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
        .section-title {
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          margin-top: 25px;
          margin-bottom: 10px;
          border-bottom: 1px dashed #000;
          padding-bottom: 4px;
        }
        .signature-section {
          display: table;
          width: 100%;
          table-layout: fixed;
          margin-top: 40px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .signature-col {
          display: table-cell;
          width: 25%;
          text-align: center;
          vertical-align: top;
          padding: 0 8px;
        }
        .signature-title {
          font-weight: bold;
          text-transform: uppercase;
          font-size: 12px;
          display: block;
          line-height: 1.4;
        }
        .signature-sub {
          font-size: 10px;
          font-style: italic;
          color: #555;
          margin-top: 2px;
          margin-bottom: 0;
          display: block;
        }
        .signature-line {
          display: block;
          border-bottom: 1px dashed #000;
          width: 80%;
          margin: 50px auto 4px;
        }
        .signature-name {
          font-weight: bold;
          font-size: 12px;
          text-transform: uppercase;
          display: block;
        }
      `}</style>

      {/* Print content container */}
      <div className="print-page">
        {/* Header */}
        <div className="print-header">
          <div className="company-info">
            <p className="font-bold text-xs uppercase" style={{ fontSize: '13px', letterSpacing: '0.5px' }}>DANKO GROUP</p>
            <p>Địa chỉ: Tầng 1, Tòa nhà Danko, Đường Trần Hưng Đạo, Hà Nội</p>
            <p>Điện thoại: (024) 3783 3666 | Website: dankogroup.com.vn</p>
          </div>
          <div className="receipt-code-info">
            <p style={{ fontSize: '13px' }}>SỐ PHIẾU: {data.id}</p>
            <p className="text-slate-500 font-normal">Ngày nhập: {new Date(data.receiveDate || data.createdAt).toLocaleDateString('vi-VN')}</p>
          </div>
        </div>

        {/* Title */}
        <div className="print-title">
          BIÊN BẢN GIAO NHẬN VÀ KIỂM NHẬN VẬT TƯ (GRN)
        </div>

        {/* Metadata */}
        <div className="meta-grid">
          <div className="meta-item">
            <span className="meta-label">Nhà cung cấp:</span>
            <span className="meta-val font-bold">{data.supplier || 'N/A'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Tham chiếu PO:</span>
            <span className="meta-val font-bold text-blue-800">{data.poId || 'N/A'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Người nhận (Thủ kho):</span>
            <span className="meta-val">{data.receiver?.fullName || 'N/A'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Kho nhận hàng:</span>
            <span className="meta-val">{data.warehouseCode || 'MAIN'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Trạng thái phiếu:</span>
            <span className="meta-val font-bold" style={{ color: data.status === 'COMPLETED_WITH_SHORTAGE' ? '#d97706' : 'inherit' }}>
              {data.status === 'COMPLETED' || data.status === 'FULL_RECEIVED' ? 'Hoàn tất đủ' :
               data.status === 'COMPLETED_WITH_SHORTAGE' ? 'Hoàn tất thiếu' : 'Chờ kiểm hàng'}
            </span>
          </div>
          {data.status === 'COMPLETED_WITH_SHORTAGE' && (
            <div className="meta-item">
              <span className="meta-label">Lý do đóng thiếu:</span>
              <span className="meta-val font-bold text-amber-700">{data.shortageReason || 'Không rõ'}</span>
            </div>
          )}
          <div className="meta-item col-span-2">
            <span className="meta-label">Ghi chú phiếu:</span>
            <span className="meta-val italic">
              {data.note || 'Không có ghi chú'}
              {data.shortageNote ? ` (Ghi chú đóng thiếu: ${data.shortageNote})` : ''}
            </span>
          </div>
        </div>

        {/* Section title for received items */}
        <div className="section-title">Danh sách vật tư thực nhận</div>

        {/* Received table */}
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '5%', textAlign: 'center' }}>STT</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Mã VT</th>
              <th style={{ width: data.status === 'COMPLETED_WITH_SHORTAGE' ? '28%' : '38%', textAlign: 'left' }}>Tên Văn Phòng Phẩm Thực Nhận</th>
              <th style={{ width: '8%', textAlign: 'center' }}>ĐVT</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Số lượng PO</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Thực nhập</th>
              {data.status === 'COMPLETED_WITH_SHORTAGE' && (
                <th style={{ width: '10%', textAlign: 'center', color: '#dc2626' }}>Thiếu không nhập</th>
              )}
              <th style={{ width: '17%', textAlign: 'left' }}>Loại xử lý</th>
              <th style={{ width: '20%', textAlign: 'left' }}>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {printLines.map((l: any, idx: number) => (
              <tr key={l.id}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{l.itemCode}</td>
                <td>
                  <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{l.itemName}</span>
                  {l.isReplacement && (
                    <span style={{ fontSize: '9px', display: 'block', color: '#555', fontStyle: 'italic' }}>
                      (Hàng thay thế giao khác model)
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>{l.unit}</td>
                <td style={{ textAlign: 'center' }}>{l.qtyOrdered}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{l.qtyAccepted}</td>
                {data.status === 'COMPLETED_WITH_SHORTAGE' && (
                  <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 'bold' }}>
                    {l.shortageQty || (l.qtyOrdered > 0 ? Math.max(0, l.qtyOrdered - l.qtyAccepted) : 0) || '-'}
                  </td>
                )}
                <td>{l.handlingType}</td>
                <td style={{ fontSize: '10px' }}>{l.note || '-'}</td>
              </tr>
            ))}
            {printLines.length === 0 && (
              <tr>
                <td colSpan={data.status === 'COMPLETED_WITH_SHORTAGE' ? 9 : 8} className="text-center italic" style={{ padding: '15px' }}>
                  Không có hàng hóa thực nhận.
                </td>
              </tr>
            )}
            <tr style={{ fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
              <td colSpan={5} style={{ textAlign: 'right', textTransform: 'uppercase' }}>TỔNG CỘNG THỰC NHẬP:</td>
              <td style={{ textAlign: 'center', fontSize: '13px' }}>{totalActualQty}</td>
              {data.status === 'COMPLETED_WITH_SHORTAGE' && (
                <td style={{ textAlign: 'center', fontSize: '13px', color: '#dc2626' }}>{totalShortageQty}</td>
              )}
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>

        {/* Section title for replaced / undelivered items */}
        {undeliveredLines.length > 0 && (
          <>
            <div className="section-title">Hàng không nhập / được thay thế</div>
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '5%', textAlign: 'center' }}>STT</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Mã VT</th>
                  <th style={{ width: '45%', textAlign: 'left' }}>Tên Văn Phòng Phẩm PO Gốc</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>ĐVT</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Số lượng PO</th>
                  <th style={{ width: '25%', textAlign: 'left' }}>Lý do / Trạng thái xử lý</th>
                </tr>
              </thead>
              <tbody>
                {undeliveredLines.map((l: any, idx: number) => (
                  <tr key={l.id} style={{ color: '#555' }}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ textAlign: 'center' }}>{l.item.mvpp}</td>
                    <td style={{ textTransform: 'uppercase' }}>{l.item.name}</td>
                    <td style={{ textAlign: 'center' }}>{l.item.unit}</td>
                    <td style={{ textAlign: 'center' }}>{l.qtyOrdered}</td>
                    <td style={{ fontSize: '10px', fontStyle: 'italic' }}>
                      {getUndeliveredStatus(l)}
                      {data.status === 'COMPLETED_WITH_SHORTAGE' && ` (Thiếu: ${l.qtyOrdered})`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Signatures */}
        <div className="signature-section">
          <div className="signature-col">
            <span className="signature-title">BÊN GIAO</span>
            <span className="signature-title">ĐƠN VỊ CUNG CẤP</span>
            <span className="signature-sub">(Ký và xác nhận đối chiếu đúng hàng)</span>
            <span className="signature-line"></span>
            <span className="signature-name"> </span>
          </div>
          <div className="signature-col">
            <span className="signature-title">THỦ KHO</span>
            <span className="signature-title">NGƯỜI KIỂM ĐỊNH</span>
            <span className="signature-sub">(Ký, ghi rõ họ tên xác nhận nhận hàng)</span>
            <span className="signature-line"></span>
            <span className="signature-name">{data.receiver?.fullName || ' '}</span>
          </div>
          <div className="signature-col">
            <span className="signature-title">NGƯỜI LẬP PHIẾU</span>
            <span className="signature-title"> </span>
            <span className="signature-sub">(Ký &amp; ghi rõ họ tên)</span>
            <span className="signature-line"></span>
            <span className="signature-name"> </span>
          </div>
          <div className="signature-col">
            <span className="signature-title">TRƯỞNG BỘ PHẬN</span>
            <span className="signature-title"> </span>
            <span className="signature-sub">(Ký &amp; đóng dấu)</span>
            <span className="signature-line"></span>
            <span className="signature-name"> </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPrint;
