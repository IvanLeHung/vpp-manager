const fs = require('fs');
const path = 'd:\\APP VPP\\vpp-manager-main\\vpp-manager-main\\src\\pages\\requests\\RequestsDetail.tsx';

let content = fs.readFileSync(path, 'utf8');

// Update root div classes
content = content.replace(
    /<div className="flex flex-col h-full bg-slate-100 overflow-hidden relative print:bg-white print:overflow-auto">/,
    '<div className="flex flex-col h-full bg-slate-100 overflow-hidden relative print:bg-white print:overflow-visible print:h-auto RequestsDetail">'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
