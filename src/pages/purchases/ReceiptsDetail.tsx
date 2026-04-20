import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  ArrowLeft, CheckCircle, Package, AlertTriangle, Save, Printer
} from 'lucide-react';

interface ReceiptsDetailProps {
  receiptId: string;
  onBack: () => void;
  showToast: (m: string, t?: 'success' | 'error' | 'warning') => void;
}

const ReceiptsDetail: React.FC<ReceiptsDetailProps> = ({ receiptId, onBack, showToast }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Reconciliation data
  const [reconcileValues, setReconcileValues] = useState<any[]>([]);

  const refreshData = async () => {
    try {
      const res = await api.get(`/receipts/${receiptId}`);
      setData(res.data);
      if (res.data) {
        setReconcileValues(res.data.lines.map((l: any) => ({
          id: l.id,
          qtyDelivered: l.qtyDelivered || l.qtyOrdered,
          qtyAccepted: l.qtyAccepted || l.qtyOrdered,
          qtyDefective: l.qtyDefective || 0,
          note: l.note || '',
          location: l.location || ''
        })));
      }
    } catch (err) {
      console.error(err);
      showToast('Không thể tải Phiếu Nhập kho', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [receiptId]);

  const handleSaveDraft = async () => {
    try {
      await api.put(`/receipts/${receiptId}/check`, { lines: reconcileValues });
      showToast('Đã lưu nháp biên bản Kiểm Hàng!');
      await refreshData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi lưu dữ liệu', 'error');
    }
  };

  const handleConfirm = async () => {
    if (!window.confirm('Hành động này sẽ thực sự cộng Tồn kho. Bạn chắc chắn chứ?')) return;
    try {
      // Đầu tiên lưu current changes
      await api.put(`/receipts/${receiptId}/check`, { lines: reconcileValues });
      // Sau đó chốt nhập
      await api.post(`/receipts/${receiptId}/confirm`);
      showToast('Hoàn thành Nhập Kho & Cộng Tồn!');
      await refreshData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Lỗi hệ thống', 'error');
    }
  };

  if (loading || !data) return <div className="p-10 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div></div>;

  const isPending = data.status === 'PENDING';

  // Checking for discrepancies
  const totalOrdered = data.lines.reduce((s: number, l: any) => s + l.qtyOrdered, 0);
  const currentAccepted = reconcileValues.reduce((s: number, v: any) => s + (v.qtyAccepted || 0), 0);
  const currentDefective = reconcileValues.reduce((s: number, v: any) => s + (v.qtyDefective || 0), 0);
  const hasDiscrepancy = currentAccepted < totalOrdered || currentDefective > 0;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="h-20 bg-white border-b border-slate-200 flex justify-between items-center px-6 md:px-10 shrink-0 z-20 shadow-sm print:hidden">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition shadow-inner">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={() => window.print()} className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full transition shadow-sm print:hidden" title="In Phiếu Kiểm Kê & Nhập Kho">
            <Printer className="w-5 h-5"/>
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
              Phiếu Nhập Kho: {data.id}
            </h2>
            <p className="text-sm font-semibold text-slate-500 mt-0.5">Tham chiếu PO: <span className="text-indigo-600 font-bold">{data.poId || 'Không có'}</span> • Kho: {data.warehouseCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg ${data.status === 'COMPLETED' ? 'bg-emerald-500 text-white shadow-emerald-500/30' : data.status === 'DISCREPANCY' ? 'bg-rose-500 text-white shadow-rose-500/30' : 'bg-amber-500 text-white shadow-amber-500/30'}`}>
            {data.status === 'PENDING' ? 'CHỜ KIỂM HÀNG' : data.status === 'COMPLETED' ? 'ĐÃ NHẬP KHO' : 'LỆCH / LỖI'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 w-full max-w-[1400px] mx-auto print:hidden">
        {/* Header Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nhà Cung Cấp</p>
            <p className="text-sm font-bold text-slate-800 leading-tight">{data.supplier}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">SL Hàng Phải Nhập</p>
            <p className="text-2xl font-black text-indigo-600">{totalOrdered}</p>
          </div>
          <div className={`p-5 rounded-2xl shadow-sm border ${hasDiscrepancy ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${hasDiscrepancy ? 'text-rose-400' : 'text-emerald-400'}`}>Trạng Thái Hiện Tại</p>
            <p className={`text-xl font-black ${hasDiscrepancy ? 'text-rose-600 flex items-center gap-2' : 'text-emerald-600 flex items-center gap-2'}`}>
              {hasDiscrepancy ? <><AlertTriangle className="w-5 h-5" /> LỆCH / THIẾU</> : <><CheckCircle className="w-5 h-5" /> ĐẦY ĐỦ</>}
            </p>
          </div>

          {isPending && (
            <div className="flex flex-col gap-2">
              <button onClick={handleSaveDraft} className="w-full py-3 bg-white text-indigo-600 border border-indigo-200 rounded-xl font-bold hover:bg-indigo-50 transition shadow-sm flex items-center justify-center "><Save className="w-4 h-4 mr-2" /> Lưu Kết Qủa Kiểm</button>
              <button onClick={handleConfirm} className={`w-full py-3 text-white rounded-xl font-black tracking-wider shadow-lg transition flex items-center justify-center ${hasDiscrepancy ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'}`}>CHỐT FILE NHẬP KHO</button>
            </div>
          )}
        </div>

        {/* RECONCILIATION DETAILED TABLE */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative flex-1">
          <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center"><Package className="w-5 h-5 inline mr-3 text-indigo-500" /> Đối Chiếu & Nhập Số Lượng Thực Tế</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap min-w-max">
              <thead className="bg-white border-b border-slate-100">
                <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                  <th className="p-4 w-12 text-center border-r border-slate-50">STT</th>
                  <th className="p-4">Hàng hoá</th>
                  <th className="p-4 text-center border-x border-slate-50 bg-slate-50/50 text-indigo-600">Quy Chiếu (SL Đặt)</th>
                  <th className="p-4 text-center border-l-2 border-slate-200 bg-amber-50 text-amber-600">SL Giao Tới</th>
                  <th className="p-4 text-center bg-emerald-50 text-emerald-600">SL Đạt Hàng (Nhập)</th>
                  <th className="p-4 text-center bg-rose-50 text-rose-600 border-r-2 border-slate-200">SL Lỗi / Bù</th>
                  <th className="p-4 w-48">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.lines.map((l: any, idx: number) => {
                  const v = reconcileValues.find(x => x.id === l.id) || {};
                  const isDiscrepantLine = v.qtyAccepted < l.qtyOrdered || v.qtyDefective > 0;
                  return (
                    <tr key={l.id} className={`hover:bg-slate-50 transition ${isDiscrepantLine ? 'bg-rose-50/20' : ''}`}>
                      <td className="p-4 text-center font-bold text-slate-400 border-r border-slate-50">{idx + 1}</td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800 text-sm whitespace-normal leading-tight">{l.item.name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black tracking-widest">{l.item.mvpp}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{l.item.unit}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center border-x border-slate-50 bg-slate-50/50">
                        <span className="font-black text-xl text-indigo-300">{l.qtyOrdered}</span>
                      </td>

                      <td className="p-4 text-center border-l-2 border-slate-200 bg-amber-50/30">
                        {isPending ? (
                          <input type="number" min="0" value={v.qtyDelivered}
                            onChange={(e: any) => setReconcileValues(reconcileValues.map(a => a.id === l.id ? { ...a, qtyDelivered: parseInt(e.target.value) || 0 } : a))}
                            className="w-16 text-center py-2 bg-white border border-amber-200 outline-none rounded-xl focus:border-amber-400 font-black text-lg transition text-amber-700 mx-auto"
                          />
                        ) : <span className="font-black text-xl text-amber-600">{l.qtyDelivered}</span>}
                      </td>

                      <td className="p-4 text-center bg-emerald-50/30">
                        {isPending ? (
                          <input type="number" min="0" value={v.qtyAccepted}
                            onChange={(e: any) => setReconcileValues(reconcileValues.map(a => a.id === l.id ? { ...a, qtyAccepted: parseInt(e.target.value) || 0 } : a))}
                            className={`w-20 text-center py-2 bg-white border outline-none rounded-xl focus:border-emerald-400 font-black text-lg transition mx-auto ${v.qtyAccepted < l.qtyOrdered ? 'border-rose-300 text-rose-600' : 'border-emerald-200 text-emerald-700'}`}
                            title="Số lượng thức tế nhập vào hệ thống"
                          />
                        ) : <span className={`font-black text-xl ${l.qtyAccepted < l.qtyOrdered ? 'text-rose-600' : 'text-emerald-600'}`}>{l.qtyAccepted}</span>}
                      </td>

                      <td className="p-4 text-center bg-rose-50/30 border-r-2 border-slate-200">
                        {isPending ? (
                          <input type="number" min="0" value={v.qtyDefective}
                            onChange={(e: any) => setReconcileValues(reconcileValues.map(a => a.id === l.id ? { ...a, qtyDefective: parseInt(e.target.value) || 0 } : a))}
                            className="w-16 text-center py-2 bg-white border border-rose-200 outline-none rounded-xl focus:border-rose-400 font-black text-lg transition text-rose-600 mx-auto"
                          />
                        ) : <span className={`font-black text-xl ${l.qtyDefective > 0 ? 'text-rose-600' : 'text-slate-300'}`}>{l.qtyDefective}</span>}
                      </td>

                      <td className="p-4">
                        {isPending ? (
                          <input type="text" placeholder="Lý do lệch..." value={v.note}
                            onChange={(e: any) => setReconcileValues(reconcileValues.map(a => a.id === l.id ? { ...a, note: e.target.value } : a))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 outline-none rounded-lg focus:border-indigo-400 focus:bg-white font-medium text-sm transition text-slate-700"
                          />
                        ) : <span className="text-sm font-medium text-slate-600">{l.note}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        {data.auditLogs && data.auditLogs.length > 0 && (
          <div className="mt-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col w-full print:hidden">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4 flex items-center">
                <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>Lịch sử thao tác mã phiếu (Audit Trail)
             </h3>
             <div className="relative pl-3 border-l-2 border-slate-100 space-y-6">
                 {data.auditLogs.map((audit:any) => (
                    <div key={audit.id} className="relative">
                      <div className="absolute -left-[17px] top-1 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white"></div>
                      <p className="text-xs font-bold text-slate-800">{audit.action}</p>
                      <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{new Date(audit.createdAt).toLocaleString('vi-VN')} • {audit.user?.fullName || 'Hệ thống'}</p>
                      {audit.newValues?.reason && <p className="text-[10px] font-medium text-indigo-700 bg-indigo-50 p-2 rounded mt-1 shadow-sm border border-indigo-100 border-l-2 border-l-indigo-400">{audit.newValues.reason}</p>}
                    </div>
                 ))}
             </div>
          </div>
        )}
      </div>

      {/* FORMAL PRINT-ONLY SECTION (A4 Standard) */}
      <div className="hidden print:block print-container">
          <div className="text-center text-lg font-bold uppercase mb-4">PHIẾU KIỂM HOÁ & NHẬP VẬT TƯ (GRN)</div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4 text-[13px]">
              <div><strong>Mã Phiếu:</strong> {data.id}</div>
              <div><strong>Thực Kiểm:</strong> {data.receiveDate ? new Date(data.receiveDate).toLocaleString('vi-VN') : '....'}</div>
              <div><strong>Người Làm Phiếu:</strong> {data.receiver?.fullName || '....................'}</div>
              <div><strong>Kho Nhận Hàng:</strong> {data.warehouseCode || '....................'}</div>
              <div className="col-span-2"><strong>Nhà Cung Cấp:</strong> {data.supplier || '....................'}</div>
              <div className="col-span-2"><strong>Tham chiếu PO:</strong> {data.poId || '....................'}</div>
          </div>

          <table className="print-table">
              <thead className="bg-slate-100">
                  <tr>
                      <th className="text-center font-bold" style={{width:'6%'}}>STT</th>
                      <th className="text-center font-bold" style={{width:'15%'}}>Mã VT</th>
                      <th className="text-left font-bold" style={{width:'37%'}}>Tên Văn Phòng Phẩm</th>
                      <th className="text-center font-bold" style={{width:'8%'}}>ĐVT</th>
                      <th className="text-center font-bold" style={{width:'12%'}}>Treo (Sổ)</th>
                      <th className="text-center font-bold" style={{width:'12%'}}>Thực Nhận</th>
                      <th className="text-center font-bold" style={{width:'10%'}}>Hư/Lỗi</th>
                  </tr>
              </thead>
              <tbody>
                  {data.lines.map((l: any, idx: number) => (
                      <tr key={l.id}>
                          <td className="text-center">{idx + 1}</td>
                          <td className="text-center font-medium">{l.item.mvpp}</td>
                          <td className="font-medium">{l.item.name}</td>
                          <td className="text-center">{l.item.unit}</td>
                          <td className="text-center">{l.qtyOrdered}</td>
                          <td className="text-center font-bold">{l.qtyAccepted}</td>
                          <td className="text-center italic text-xs">{l.qtyDefective > 0 ? l.qtyDefective : '-'}</td>
                      </tr>
                  ))}
                  <tr className="font-bold bg-slate-50">
                      <td colSpan={5} className="text-right uppercase">Tổng SL Thực Tế:</td>
                      <td className="text-center text-lg">{data.lines.reduce((sum: number, line: any) => sum + (line.qtyAccepted || 0), 0)}</td>
                      <td></td>
                  </tr>
              </tbody>
          </table>

          <div className="signature-section">
              <div className="text-center min-h-[120px]">
                  <p className="font-bold uppercase mb-1">Thủ Kho / Người Kiểm Định</p>
                  <p className="text-[11px] italic mb-16">(Ký, ghi gõ họ tên xác nhận nhận hàng)</p>
                  <p className="font-bold uppercase text-[13px]">{data.receiver?.fullName || '....................................'}</p>
              </div>
              <div className="text-center min-h-[120px]">
                  <p className="font-bold uppercase mb-1">Bên Giao / Đơn vị cung cấp</p>
                  <p className="text-[11px] italic mb-16">(Ký và xác nhận đối chiếu đúng hàng)</p>
                  <p className="font-bold uppercase text-[13px]">....................................</p>
              </div>
          </div>
      </div>

    </div>
  );
};

export default ReceiptsDetail;

