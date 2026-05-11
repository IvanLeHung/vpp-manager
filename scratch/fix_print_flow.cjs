const fs = require('fs');
const path = 'd:\\APP VPP\\vpp-manager-main\\vpp-manager-main\\src\\pages\\requests\\RequestsDetail.tsx';

let content = fs.readFileSync(path, 'utf8');

// 1. Remove flex and h-full from print signature blocks
content = content.replace(
    /className="flex flex-col h-full"/g,
    'className="print-signature-block"'
);

// 2. Remove the empty spacer div that has h-full
content = content.replace(
    /<div className="print-signature-block">\s*{\/\* Empty Spacer \*\/}\s*<\/div>/,
    ''
);

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
