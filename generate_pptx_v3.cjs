const PptxGenJS = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

async function generate() {
    console.log('Generating PPTX v3...');
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    const screenshotsDir = 'C:/Users/DK/.gemini/antigravity/brain/38a398e0-518a-4b7b-af03-3f72d4e98823';

    // Slide 1
    let s1 = pptx.addSlide();
    s1.background = { color: 'FFFFFF' };
    s1.addText('DANKO VPP v2.0', { x: 1, y: 1, w: 8, h: 1, fontSize: 44, color: '0000FF', bold: true, align: 'center' });
    s1.addText('HUONG DAN SU DUNG', { x: 1, y: 2, w: 8, h: 1, fontSize: 30, color: '333333', align: 'center' });

    const slides = [
        { title: '1. Dashboard', img: 'screenshot_dashboard_1776733872392.png', desc: 'Theo doi ton kho, canh bao sap het hang.' },
        { title: '2. Lap phieu', img: 'screenshot_create_form_1776733975230.png', desc: 'Tao yeu cau VPP truc tuyen.' },
        { title: '3. Phe duyet', img: 'screenshot_requests_1776733885650.png', desc: 'Quan ly va Admin duyet phieu.' },
        { title: '4. Chi tiet & Kho', img: 'screenshot_detail_1776733901893.png', desc: 'Audit trail va lenh xuat kho.' },
        { title: '5. Thong ke', img: 'screenshot_analytics_1776733917027.png', desc: 'Bieu do chi phi va KPIs.' },
        { title: '6. Kho Ve Sinh', img: 'screenshot_janitorial_1776733930310.png', desc: 'Phan he rieng cho do ve sinh.' }
    ];

    for (let item of slides) {
        let slide = pptx.addSlide();
        slide.addText(item.title, { x: 0.5, y: 0.2, w: 9, h: 0.5, fontSize: 24, bold: true, color: '000000' });
        slide.addText(item.desc, { x: 0.5, y: 0.8, w: 3, h: 3, fontSize: 14, color: '666666' });
        
        const imgPath = path.join(screenshotsDir, item.img);
        if (fs.existsSync(imgPath)) {
            slide.addImage({ path: imgPath, x: 4, y: 0.8, w: 8, h: 4.5 });
            console.log(`Added: ${item.title}`);
        }
    }

    const outPath = path.join(process.cwd(), 'Danko_VPP_Manual_V3.pptx');
    
    // In Node.js, writeFile is the way.
    pptx.writeFile({ fileName: outPath })
        .then(file => console.log('Successfully saved to:', file))
        .catch(err => console.error('Save error:', err));
}

generate();
