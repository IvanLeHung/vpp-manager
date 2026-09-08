import { summarizeDepartmentAmounts, type DepartmentSupplyGroup } from '../lib/departmentAmounts';

export default function DepartmentAmountPrint({ requests, supplyGroup = 'ALL', preparer = '' }: { requests: any[]; supplyGroup?: DepartmentSupplyGroup; preparer?: string }) {
  const report = summarizeDepartmentAmounts(requests, supplyGroup);
  const label = supplyGroup === 'VPP' ? 'VĂN PHÒNG PHẨM' : supplyGroup === 'VS' ? 'ĐỒ VỆ SINH' : 'HỖN HỢP (VPP + VS)';
  const now = new Date();
  const date = now.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  return <div className="print-page text-black leading-tight" style={{ padding: '5mm', fontFamily: '"Times New Roman", Times, serif' }}>
    <header className="flex justify-between gap-5 border-b-2 border-black pb-3 mb-5">
      <div style={{ width: '40%' }}><p className="text-[11pt] font-bold">CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO</p><p className="mt-1 text-[9pt]">Ban Hành chính Nhân sự</p></div>
      <div className="text-center" style={{ width: '56%' }}><p className="text-[11pt] font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p><p className="mt-1 text-[10pt] font-bold underline underline-offset-4">Độc lập - Tự do - Hạnh phúc</p><p className="mt-3 text-[9pt] italic">Ngày {date}</p></div>
    </header>
    <h1 className="text-center text-[14pt] font-bold">TỔNG HỢP PHÒNG BAN – SỐ TIỀN</h1>
    <h2 className="mt-1 mb-5 text-center text-[12pt] font-bold underline underline-offset-4">{label}</h2>
    <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[10pt]">
      <p><strong>Người lập:</strong> {preparer || '................................'}</p><p><strong>Ngày lập:</strong> {date}</p>
      <p><strong>Số phiếu:</strong> {report.requestCount}</p><p><strong>Số phòng ban:</strong> {report.rows.length}</p>
    </div>
    <table className="print-table text-[10pt]">
      <colgroup><col style={{ width: '8%' }} /><col style={{ width: '49%' }} /><col style={{ width: '15%' }} /><col style={{ width: '28%' }} /></colgroup>
      <thead><tr><th>STT</th><th>Đơn vị / Phòng ban</th><th>Số phiếu</th><th>Thành tiền (VNĐ)</th></tr></thead>
      <tbody>
        {report.rows.map((row, index) => <tr key={index}><td className="text-center">{index + 1}</td><td>{row.department}</td><td className="text-center">{row.requestCount}</td><td className="text-right">{row.amount.toLocaleString('vi-VN')}</td></tr>)}
        <tr className="font-bold"><td colSpan={2}>TỔNG CỘNG</td><td className="text-center">{report.requestCount}</td><td className="text-right">{report.totalAmount.toLocaleString('vi-VN')} đ</td></tr>
      </tbody>
    </table>
    <div className="avoid-page-break mt-6 grid grid-cols-3 gap-4 text-center text-[9pt]">
      {['NGƯỜI LẬP BIỂU', 'PHỤ TRÁCH HÀNH CHÍNH', 'NGƯỜI PHÊ DUYỆT'].map((title, index) => <div key={title}><p className="font-bold">{title}</p><p className="mt-1 italic">(Ký, ghi rõ họ tên)</p><p className="mt-12">................................</p>{index === 0 && <p className="mt-1 font-bold uppercase">{preparer}</p>}</div>)}
    </div>
    <footer className="avoid-page-break mt-6 flex justify-between gap-4 border-t border-slate-300 pt-3 text-[8pt]"><p>Ngày in: {now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p><p>Hệ thống Quản lý VPP · Tổng hợp phòng ban</p></footer>
  </div>;
}
