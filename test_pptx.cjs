const PptxGenJS = require('pptxgenjs');
const path = require('path');

async function testPPTX() {
    console.log('Starting PPTX generation...');
    let pptx = new PptxGenJS();
    
    let slide = pptx.addSlide();
    slide.addText('HELLO WORLD', { x: 1, y: 1, fontSize: 40 });
    
    const outPath = path.join(process.cwd(), 'Test_Manual.pptx');
    console.log('Writing to:', outPath);
    
    try {
        await pptx.writeFile({ fileName: outPath });
        console.log('FILE WRITTEN SUCCESSFULLY');
    } catch (err) {
        console.error('ERROR WRITING FILE:', err);
    }
}

testPPTX();
