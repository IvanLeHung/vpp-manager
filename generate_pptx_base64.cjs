const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

async function run() {
    console.log('--- Generating PPTX with Base64 Images ---');
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    const screenshotsDir = 'C:/Users/DK/.gemini/antigravity/brain/38a398e0-518a-4b7b-af03-3f72d4e98823';

    // Slide 1: Welcome
    let s1 = pptx.addSlide();
    s1.background = { color: 'F1F5F9' };
    s1.addText('DANKO VPP v2.0', { x: 0, y: 1.5, w: '100%', h: 1, fontSize: 44, bold: true, color: '1E293B', align: 'center' });
    s1.addText('HƯỚNG DẪN VẬN HÀNH CHI TIẾT', { x: 0, y: 2.5, w: '100%', h: 0.5, fontSize: 24, bold: true, color: '4F46E5', align: 'center' });

    const slidesMeta = [
        { title: '1. Dashboard Quản trị', img: 'screenshot_dashboard_1776733872392.png', desc: 'Theo dõi tồn kho thực tế, cảnh báo sắp hết hàng và phân bổ chi phí trực quan.' },
        { title: '2. Quy trình Lập Yêu Cầu', img: 'screenshot_create_form_1776733975230.png', desc: 'Giao diện tạo phiếu thông minh, tự động kiểm tra định mức (quota).' },
        { title: '3. Luồng Phê Duyệt', img: 'screenshot_requests_1776733885650.png', desc: 'Theo dõi tiến độ phê duyệt qua các cấp Quản lý và Admin.' },
        { title: '4. Nghiệp vụ Kho & Audit', img: 'screenshot_detail_1776733901893.png', desc: 'Nhật ký xử lý chi tiết (Audit Trail) và các lệnh xuất kho nội bộ.' },
        { title: '5. Báo cáo & Phân tích BI', img: 'screenshot_analytics_1776733917027.png', desc: 'Các chỉ số KPIs quan trọng về tiêu thụ và ngân sách cung ứng.' },
        { title: '6. Kho Tạp hóa / Vệ sinh', img: 'screenshot_janitorial_1776733930310.png', desc: 'Phần hệ quản lý riêng biệt cho các mặt hàng vệ sinh và tạp hóa.' }
    ];

    for (const item of slidesMeta) {
        console.log(`Adding slide: ${item.title}`);
        let s = pptx.addSlide();
        s.addText(item.title, { x: 0.4, y: 0.2, w: 9, h: 0.4, fontSize: 28, bold: true, color: '1E293B' });
        s.addText(item.desc, { x: 0.4, y: 0.8, w: 3, h: 4, fontSize: 13, color: '475569', bullet: true, valign: 'top' });
        
        const fullPath = path.join(screenshotsDir, item.img);
        if (fs.existsSync(fullPath)) {
            // Convert to Base64
            const base64 = fs.readFileSync(fullPath).toString('base64');
            const dataUri = `data:image/png;base64,${base64}`;
            s.addImage({ data: dataUri, x: 3.5, y: 0.8, w: 9, h: 4.5 });
        } else {
            console.warn(`File missing: ${fullPath}`);
        }
    }

    const outPath = path.join(process.cwd(), 'Danko_VPP_Manual_Base64.pptx');
    try {
        await pptx.writeFile({ fileName: outPath });
        console.log('--- SUCCESS: ', outPath);
    } catch (e) {
        console.error('--- ERROR: ', e);
    }
}

run();
