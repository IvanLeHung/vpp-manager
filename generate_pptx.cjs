const PptxGenJS = require('pptxgenjs');
const path = require('path');

async function generatePPTX() {
    let pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    // Slide 1: Welcome
    let slide1 = pptx.addSlide();
    slide1.background = { color: 'F1F5F9' };
    slide1.addText('DANKO VPP v2.0', { x: 0.5, y: 1.5, w: '90%', h: 1, fontSize: 44, bold: true, color: '1E293B', align: 'center' });
    slide1.addText('HỆ THỐNG QUẢN TRỊ CUNG ỨNG NỘI BỘ', { x: 0.5, y: 2.5, w: '90%', h: 0.5, fontSize: 20, color: '64748B', align: 'center' });
    slide1.addText('HƯỚNG DẪN VẬN HÀNH CHI TIẾT', { x: 0.5, y: 4.5, w: '90%', h: 0.5, fontSize: 24, bold: true, color: '4F46E5', align: 'center' });

    const screenshotsDir = 'C:/Users/DK/.gemini/antigravity/brain/38a398e0-518a-4b7b-af03-3f72d4e98823';

    // Helper for content slides
    const addContentSlide = (title, description, imagePath) => {
        let slide = pptx.addSlide();
        slide.addText(title, { x: 0.4, y: 0.2, w: '90%', h: 0.4, fontSize: 28, bold: true, color: '1E293B' });
        slide.addText(description, { x: 0.4, y: 0.7, w: '30%', h: 4, fontSize: 13, color: '475569', bullet: true, valign: 'top' });
        
        if (imagePath) {
            slide.addImage({ 
                path: path.join(screenshotsDir, imagePath), 
                x: 3.5, y: 0.8, w: 9, h: 4.5,
                shadow: { type: 'outer', color: 'CBD5E1', blur: 20, offset: 10 }
            });
        }
    };

    // Slide 2: Dashboard
    addContentSlide(
        '1. Dashboard Quản trị',
        '• Theo dõi tổng số lượng hàng khả dụng.\n• Cảnh báo hàng sắp hết kho.\n• Biểu đồ phân bổ chi phí trực quan.\n• Truy cập nhanh các tính năng từ Sidebar.\n• Thông báo quả chuông theo thời gian thực.',
        'screenshot_dashboard_1776733872392.png'
    );

    // Slide 3: Create Request
    addContentSlide(
        '2. Quy trình Lập Yêu Cầu',
        '• Form tạo phiếu trực tuyến tinh gọn.\n• Tự động kiểm tra Định mức (Quota).\n• Cảnh báo Backorder khi tồn kho hết.\n• Hỗ trợ Lưu nháp (Draft) hoặc Gửi trình duyệt.\n• SLA xử lý dựa trên mức độ ưu tiên.',
        'screenshot_create_form_1776733975230.png'
    );

    // Slide 4: Approvals
    addContentSlide(
        '3. Luồng Phê Duyệt Đa Cấp',
        '• Trình tự: Nhân viên -> Quản lý -> Admin -> Kho.\n• Hiển thị trạng thái rõ ràng (Màu sắc).\n• Chốt khối lượng thực tế tại cổng duyệt.\n• Hỗ trợ Trả về (Return) kèm lý do sửa lỗi.\n• Filter nhanh phiếu "Cần tôi xử lý".',
        'screenshot_requests_1776733885650.png'
    );

    // Slide 5: Warehouse & Audit
    addContentSlide(
        '4. Nghiệp vụ Kho & Bàn giao',
        '• Audit Trail theo dõi lịch sử 100%.\n• In phiếu yêu cầu PDF định dạng A4.\n• Lệnh Issue Inventory - Trực tiếp trừ tồn.\n• Xác nhận nhận hàng điện tử (Self-receipt).\n• Đồng bộ dữ liệu kho Main và kho Vệ sinh.',
        'screenshot_detail_1776733901893.png'
    );

    // Slide 6: Analytics
    addContentSlide(
        '5. Báo cáo & Phân tích BI',
        '• Thống kê Fill-rate (Tỉ lệ đáp ứng).\n• Phân loại chi phí theo Phòng ban.\n• Theo dõi xu hướng Xuất - Nhập kho.\n• Tổng giá trị tồn kho tại thời điểm thực.\n• Export Excel chuyên sâu báo cáo lãnh đạo.',
        'screenshot_analytics_1776733917027.png'
    );

    // Slide 7: Janitorial
    addContentSlide(
        '6. Kho Tạp hóa / Vệ sinh',
        '• Phân hệ quản lý chuyên biệt hàng VS.\n• Nhập tồn trực tiếp (Quick Adjustment).\n• Quản lý đơn vị tính chai/lọ/gói/túi.\n• Phê duyệt tắt cho các tình huống khẩn cấp.\n• Link trực tiếp với hệ thống PDX chính.',
        'screenshot_janitorial_1776733930310.png'
    );

    // Slide 8: Rules
    let slideEnd = pptx.addSlide();
    slideEnd.background = { color: '1E293B' };
    slideEnd.addText('QUY TẮC VẬN HÀNH VÀNG', { x: 0.5, y: 1, w: '90%', h: 1, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center' });
    slideEnd.addText('1. Không giao hàng khi chưa có lệnh Issue trên hệ thống.\n2. Nhân viên bắt buộc bấm Xác Nhận Nhận Hàng để đóng phiếu.\n3. Quản lý duyệt phiếu trong vòng 4h kể từ khi nhận thông báo.\n4. Mọi sai sót số liệu cần báo ngay cho Admin để điều chỉnh Audit.', { 
        x: 1, y: 2.5, w: '80%', h: 3, fontSize: 18, color: 'E2E8F0', align: 'left', bullet: true 
    });

    try {
        const outPath = path.join(process.cwd(), 'Danko_VPP_Manual_v2.pptx');
        await pptx.writeFile({ fileName: outPath });
        console.log(`PPTX generated successfully at: ${outPath}`);
    } catch (err) {
        console.error('Error writing PPTX:', err);
    }
}

generatePPTX();
