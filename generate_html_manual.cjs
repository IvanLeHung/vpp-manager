const fs = require('fs');
const path = require('path');

const screenshotsDir = 'C:/Users/DK/.gemini/antigravity/brain/38a398e0-518a-4b7b-af03-3f72d4e98823';
const slides = [
    { title: '1. Dashboard Quản trị', img: 'screenshot_dashboard_1776733872392.png', desc: 'Theo dõi tồn kho thực tế, cảnh báo sắp hết hàng và phân bổ chi phí trực quan.' },
    { title: '2. Quy trình Lập Yêu Cầu', img: 'screenshot_create_form_1776733975230.png', desc: 'Giao diện tạo phiếu thông minh, tự động kiểm tra định mức (quota).' },
    { title: '3. Luồng Phê Duyệt', img: 'screenshot_requests_1776733885650.png', desc: 'Theo dõi tiến độ phê duyệt qua các cấp Quản lý và Admin.' },
    { title: '4. Nghiệp vụ Kho & Audit', img: 'screenshot_detail_1776733901893.png', desc: 'Nhật ký xử lý chi tiết (Audit Trail) và các lệnh xuất kho nội bộ.' },
    { title: '5. Báo cáo & Phân tích BI', img: 'screenshot_analytics_1776733917027.png', desc: 'Các chỉ số KPIs quan trọng về tiêu thụ và ngân sách cung ứng.' },
    { title: '6. Kho Tạp hóa / Vệ sinh', img: 'screenshot_janitorial_1776733930310.png', desc: 'Phần hệ quản lý riêng biệt cho các mặt hàng vệ sinh và tạp hóa.' }
];

let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sổ tay Vận hành VPP Danko</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; margin: 0; padding: 40px; }
        .slide { background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-bottom: 40px; padding: 40px; page-break-after: always; display: flex; flex-direction: column; }
        h1 { color: #1e293b; font-size: 32px; margin-top: 0; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; }
        .content { display: flex; gap: 30px; margin-top: 20px; }
        .info { flex: 1; font-size: 18px; color: #475569; line-height: 1.6; }
        .image-container { flex: 2; }
        img { width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; }
        .cover { text-align: center; padding: 100px 40px; }
        .cover h1 { font-size: 48px; border: none; }
        @media print {
            body { padding: 0; background: white; }
            .slide { box-shadow: none; border: none; margin: 0; padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="slide cover">
        <h1>Hệ Thống Quản Trị VPP Danko v2.0</h1>
        <h2 style="color: #64748b;">HƯỚNG DẪN VẬN HÀNH CHI TIẾT</h2>
        <p style="margin-top: 50px; font-size: 20px; color: #4f46e5; font-weight: bold;">Tài liệu lưu hành nội bộ</p>
    </div>`;

for (let item of slides) {
    const fullPath = path.join(screenshotsDir, item.img);
    let base64 = "";
    if (fs.existsSync(fullPath)) {
        base64 = fs.readFileSync(fullPath).toString('base64');
    }
    
    html += `
    <div class="slide">
        <h1>${item.title}</h1>
        <div class="content">
            <div class="info">
                <p>${item.desc}</p>
                <ul style="margin-top: 20px;">
                    <li>Thao tác trực quan trên giao diện thực tế.</li>
                    <li>Dữ liệu được cập nhật thời gian thực.</li>
                    <li>Tích hợp luồng phê duyệt đa cấp.</li>
                </ul>
                <p style="margin-top:20px; font-style:italic;">* Mẹo: Bạn có thể nhấn Ctrl + P tại trang này để lưu thành file PDF chất lượng cao.</p>
            </div>
            <div class="image-container">
                <img src="data:image/png;base64,${base64}" alt="${item.title}">
            </div>
        </div>
    </div>`;
}

html += `</body></html>`;

fs.writeFileSync('Danko_VPP_Manual_Web.html', html);
console.log('HTML Manual generated successfully.');
