import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileSpreadsheet, LoaderCircle, Printer, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../lib/api';
import { useAppContext } from '../../context/AppContext';
import ProposalDateFilter, { bangkokDateKey, currentProposalMonth, formatReportDate } from './ProposalDateFilter';
import type { ProposalDateSelection } from './ProposalDateFilter';
import './proposalBatchReport.css';

type Department = { id: string; name: string };
type SummaryRow = {
  key: string; itemId: string; name: string; mvpp: string; unit: string;
  unitPrice: number | null; totalQuantity: number; totalAmount: number | null;
  departmentQuantities: Record<string, number>;
};
type SummaryReport = {
  itemType: 'VPP' | 'VE_SINH'; requestCount: number; itemCount: number;
  departments: Department[]; rows: SummaryRow[]; generatedAt: string;
  totals: { departmentQuantities: Record<string, number>; totalQuantity: number; totalAmount: number; unpricedRowCount: number };
};
const numberFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const formatNumber = (value: number) => numberFormat.format(value);
const reportTitle = (type: string) => `Báo cáo tổng hợp đồ ${type === 'VPP' ? 'Văn phòng phẩm' : 'Vệ sinh'} theo đợt đề xuất`;

function ReportDocument({ report, period, reportDate, reporter, departments = report.departments, groupLabel = '' }: {
  report: SummaryReport; period: string; reportDate: string; reporter: string;
  departments?: Department[]; groupLabel?: string;
}) {
  return (
    <article className="proposal-report-document">
      <header className="proposal-report-letterhead">
        <div><p className="font-bold uppercase">Công ty Cổ phần Tập đoàn Danko</p><p className="mt-1">MST: 3702070613</p></div>
        <div className="text-center"><p className="font-bold uppercase">Cộng hòa Xã hội Chủ nghĩa Việt Nam</p><p className="mt-1 font-semibold">Độc lập - Tự do - Hạnh phúc</p><div className="mx-auto mt-2 w-32 border-b border-slate-500" /></div>
      </header>
      <div className="px-5 pb-5 text-center">
        <h2 className="text-lg font-bold uppercase leading-relaxed text-slate-900">{reportTitle(report.itemType)}</h2>
        <p className="mt-2 text-xs text-slate-600">Ngày tạo phiếu: <span className="font-medium">{period}</span></p>
        <p className="mt-1 text-xs text-slate-500">{report.requestCount} phiếu • {report.itemCount} mặt hàng • Số lượng Hành chính duyệt</p>
        {groupLabel && <p className="mt-2 text-xs font-semibold">{groupLabel}. Tổng số lượng và thành tiền là tổng của tất cả phòng ban.</p>}
      </div>
      <div className="proposal-report-table-scroll" tabIndex={0} role="region" aria-label="Bảng tổng hợp theo phòng ban, cuộn ngang để xem thêm cột">
        <table className="proposal-report-table">
          <thead><tr>
            <th scope="col" className="proposal-item-column">Danh mục {report.itemType === 'VPP' ? 'VPP' : 'Vệ sinh'}</th>
            <th scope="col" className="proposal-unit-column">ĐVT</th>
            {departments.map(department => <th key={department.id} scope="col" className="proposal-department-column">{department.name}</th>)}
            <th scope="col" className="proposal-total-column">Tổng số lượng</th>
            <th scope="col" className="proposal-price-column">Đơn giá<br /><span className="font-normal">(VNĐ)</span></th>
            <th scope="col" className="proposal-amount-column">Thành tiền<br /><span className="font-normal">(VNĐ)</span></th>
          </tr></thead>
          <tbody>
            {report.rows.map((row, index) => <tr key={row.key}>
              <th scope="row" className="proposal-item-column"><span className="mr-2 text-[10px] font-normal text-slate-400">{index + 1}.</span>{row.name}<span className="mt-1 block text-[10px] font-normal text-slate-400">{row.mvpp}</span></th>
              <td className="text-center text-slate-500">{row.unit}</td>
              {departments.map(department => <td key={department.id} className="text-center tabular-nums">{row.departmentQuantities[department.id] ? formatNumber(row.departmentQuantities[department.id]) : <span className="text-slate-300">—</span>}</td>)}
              <td className="proposal-total-column text-center font-bold tabular-nums">{formatNumber(row.totalQuantity)}</td>
              <td className="text-right tabular-nums">{row.unitPrice === null ? <span className="text-amber-700">Chưa có giá</span> : formatNumber(row.unitPrice)}</td>
              <td className="proposal-amount-column text-right font-semibold tabular-nums">{row.totalAmount === null ? '—' : formatNumber(row.totalAmount)}</td>
            </tr>)}
          </tbody>
          <tfoot><tr>
            <th scope="row" className="proposal-item-column" colSpan={2}>TỔNG CỘNG</th>
            {departments.map(department => <td key={department.id} className="text-center tabular-nums">{formatNumber(report.totals.departmentQuantities[department.id] || 0)}</td>)}
            <td className="text-center tabular-nums">{formatNumber(report.totals.totalQuantity)}</td>
            <td className="text-center">—</td>
            <td className="text-right tabular-nums">{formatNumber(report.totals.totalAmount)}{report.totals.unpricedRowCount > 0 ? ' *' : ''}</td>
          </tr></tfoot>
        </table>
      </div>
      <div className="px-5 pt-3 text-[11px] leading-relaxed text-slate-500">
        <p>Đơn giá lưu trên từng phiếu; cùng mặt hàng có nhiều mức giá được tách dòng. Tổng số lượng cộng các đơn vị tính trong bảng.</p>
        {report.totals.unpricedRowCount > 0 && <p className="mt-1 font-medium text-amber-700">* Tổng tiền chưa bao gồm {report.totals.unpricedRowCount} dòng chưa lưu đơn giá. Không dùng giá danh mục hiện tại để thay thế giá lịch sử.</p>}
      </div>
      <footer className="proposal-report-signature">
        <p>Ngày báo cáo: <strong>{formatReportDate(reportDate)}</strong></p>
        <div className="min-w-56 text-center"><p className="font-bold uppercase">Người lập bảng</p><p className="mt-1 text-xs italic text-slate-500">(Ký và ghi rõ họ tên)</p><p className="mt-10 font-semibold">{reporter || '................................'}</p></div>
      </footer>
    </article>
  );
}

export default function ProposalBatchReport() {
  const { currentUser } = useAppContext();
  const [itemType, setItemType] = useState<'VPP' | 'VE_SINH'>('VPP');
  const [filter, setFilter] = useState<ProposalDateSelection>(currentProposalMonth);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [result, setResult] = useState<{ key: string; data: SummaryReport } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [reportDate, setReportDate] = useState(bangkokDateKey);
  const [reporter, setReporter] = useState(currentUser?.fullName || '');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const paramsKey = JSON.stringify(filter.params);
  const queryKey = `${currentUser?.id}:${itemType}:${paramsKey}:${refreshIndex}`;
  const report = result?.key === queryKey ? result.data : null;
  const error = failure?.key === queryKey ? failure.message : '';
  const loading = !report && !error;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get<SummaryReport>('/reports/proposal-batch-summary', {
          params: { ...JSON.parse(paramsKey), itemType }, signal: controller.signal, timeout: 30000,
        });
        if (!controller.signal.aborted) {
          setResult({ key: queryKey, data: response.data });
          setFailure(null);
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        const message = (error as { response?: { data?: { error?: string } } }).response?.data?.error;
        setFailure({ key: queryKey, message: message || 'Không tải được báo cáo. Vui lòng kiểm tra kết nối và thử lại.' });
      }
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [queryKey, itemType, paramsKey]);

  const exportExcel = () => {
    if (!report) return;
    setExporting(true); setExportError('');
    try {
      const headings = [`Danh mục ${itemType === 'VPP' ? 'VPP' : 'Vệ sinh'}`, 'Mã hàng', 'ĐVT', ...report.departments.map(department => department.name), 'Tổng số lượng', 'Đơn giá (VNĐ)', 'Thành tiền (VNĐ)'];
      const data = [
        ['CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO'], ['MST: 3702070613'],
        ['CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'], ['Độc lập - Tự do - Hạnh phúc'], [],
        [reportTitle(itemType)], [`Ngày tạo phiếu: ${filter.label}`], ['Số lượng Hành chính duyệt'], [], headings,
        ...report.rows.map(row => [row.name, row.mvpp, row.unit, ...report.departments.map(department => row.departmentQuantities[department.id] || 0), row.totalQuantity, row.unitPrice, row.totalAmount]),
        ['TỔNG CỘNG', '', '', ...report.departments.map(department => report.totals.departmentQuantities[department.id] || 0), report.totals.totalQuantity, '', report.totals.totalAmount],
        [], [`Ngày báo cáo: ${formatReportDate(reportDate)}`], [`Người lập bảng: ${reporter}`],
        ['Đơn giá lưu trên phiếu. Các mức giá khác nhau của cùng mặt hàng được tách dòng.'],
        ...(report.totals.unpricedRowCount ? [[`Tổng tiền chưa bao gồm ${report.totals.unpricedRowCount} dòng chưa lưu đơn giá.`]] : []),
      ];
      const sheet = XLSX.utils.aoa_to_sheet(data);
      sheet['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 9 }, ...report.departments.map(() => ({ wch: 22 })), { wch: 16 }, { wch: 18 }, { wch: 20 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, itemType === 'VPP' ? 'Tong hop VPP' : 'Tong hop Ve sinh');
      XLSX.writeFile(workbook, `Bao_cao_de_xuat_${itemType}_${reportDate}.xlsx`);
    } catch {
      setExportError('Không thể xuất Excel. Vui lòng thử lại.');
    } finally { setExporting(false); }
  };

  const canExport = Boolean(report?.rows.length && reportDate && reporter.trim());
  const printGroups: Department[][] = [];
  if (report) for (let index = 0; index < report.departments.length; index += 6) printGroups.push(report.departments.slice(index, index + 6));

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><FileSpreadsheet className="h-5 w-5 text-indigo-600" /> Tổng hợp theo đợt đề xuất</h2><p className="mt-1 text-xs text-slate-500">Cộng số lượng được Hành chính duyệt theo mặt hàng và phòng ban đề xuất.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setRefreshIndex(value => value + 1)} disabled={loading} className="proposal-report-button"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới</button>
          <button type="button" onClick={exportExcel} disabled={!canExport || exporting} className="proposal-report-button text-emerald-700">{exporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Xuất Excel</button>
          <button type="button" onClick={() => window.print()} disabled={!canExport} className="proposal-report-button border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700"><Printer className="h-4 w-4" /> In báo cáo</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Loại báo cáo">
          {(['VPP', 'VE_SINH'] as const).map(type => <button key={type} type="button" aria-pressed={itemType === type} onClick={() => setItemType(type)} className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${itemType === type ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{type === 'VPP' ? 'VPP · Văn phòng phẩm' : 'VS · Vệ sinh'}</button>)}
        </div>
        {report && <p className="text-xs text-slate-500"><strong className="text-slate-700">{report.requestCount}</strong> phiếu đã duyệt <span className="mx-2">·</span><strong className="text-slate-700">{report.departments.length}</strong> phòng ban <span className="mx-2">·</span><strong className="text-slate-700">{report.itemCount}</strong> mặt hàng</p>}
      </div>
      <ProposalDateFilter onChange={setFilter} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Ngày báo cáo<input type="date" required value={reportDate} onChange={event => setReportDate(event.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-2 font-normal text-slate-700 focus:outline-indigo-500" /></label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Người lập bảng<input type="text" required value={reporter} onChange={event => setReporter(event.target.value)} placeholder="Nhập họ và tên" className="w-56 max-w-full rounded-lg border border-slate-200 px-2.5 py-2 font-normal text-slate-700 focus:outline-indigo-500" /></label>
      </div>
      {exportError && <p role="alert" className="text-sm text-rose-600">{exportError}</p>}
      {loading ? <div role="status" className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-20 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin text-indigo-600" /> Đang tổng hợp báo cáo…</div>
        : error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700"><p>{error}</p><button type="button" onClick={() => setRefreshIndex(value => value + 1)} className="mt-3 font-semibold underline underline-offset-4">Thử lại</button></div>
          : report && !report.rows.length ? <div className="rounded-xl border border-slate-200 bg-white p-12 text-center"><FileSpreadsheet className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="text-sm font-semibold text-slate-700">Chưa có số lượng Hành chính duyệt trong thời gian này</p><p className="mt-2 text-xs text-slate-500">Thử chọn ngày/tháng khác hoặc chuyển tab VPP/Vệ sinh. Phiếu nháp, chờ duyệt, đang sửa, từ chối và hủy không được cộng.</p></div>
            : report && <ReportDocument report={report} period={filter.label} reportDate={reportDate} reporter={reporter} />}
      {report && report.rows.length > 0 && createPortal(<div className="proposal-report-print" aria-hidden="true">
        {printGroups.map((departments, index) => <div key={index} className="proposal-print-page"><ReportDocument report={report} departments={departments} period={filter.label} reportDate={reportDate} reporter={reporter} groupLabel={printGroups.length > 1 ? `Nhóm cột phòng ban ${index + 1}/${printGroups.length}` : ''} /></div>)}
      </div>, document.body)}
    </div>
  );
}
