import { summarizeDepartmentAmounts } from '../lib/departmentAmounts';

export default function DepartmentAmountPrint({ requests }: { requests: any[] }) {
  const report = summarizeDepartmentAmounts(requests);
  return <div className="print-page p-4 text-black">
    <p className="text-[11pt] font-bold">CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO</p>
    <h1 className="mt-6 mb-2 text-center text-[15pt] font-bold">TỔNG HỢP PHÒNG BAN – SỐ TIỀN</h1>
    <p className="mb-1 text-center text-[10pt]">{report.requestCount} phiếu đã chọn · {report.rows.length} phòng ban · VPP và Đồ vệ sinh</p>
    <p className="mb-5 text-center text-[10pt]">Thành tiền = số lượng thực giao × đơn giá trên phiếu sau hiệu chỉnh. Đơn vị tiền: VNĐ.</p>
    <table className="print-table text-[11pt]">
      <colgroup><col style={{ width: '8%' }} /><col style={{ width: '49%' }} /><col style={{ width: '15%' }} /><col style={{ width: '28%' }} /></colgroup>
      <thead><tr><th>STT</th><th>Đơn vị / Phòng ban</th><th>Số phiếu</th><th>Thành tiền thực giao</th></tr></thead>
      <tbody>
        {report.rows.map((row, index) => <tr key={index}><td className="text-center">{index + 1}</td><td>{row.department}</td><td className="text-center">{row.requestCount}</td><td className="text-right">{row.amount.toLocaleString('vi-VN')}</td></tr>)}
        <tr className="font-bold"><td colSpan={2}>TỔNG CỘNG</td><td className="text-center">{report.requestCount}</td><td className="text-right">{report.totalAmount.toLocaleString('vi-VN')} đ</td></tr>
      </tbody>
    </table>
    <p className="mt-3 text-[9pt] italic">Chỉ tổng hợp các phiếu đã chọn, kể cả các trang khác. Phiếu chưa giao được tính 0 đ; không phải tổng tiền đề xuất hay báo cáo thanh toán.</p>
    <p className="mt-5 text-[9pt]">Ngày in: {new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
  </div>;
}
