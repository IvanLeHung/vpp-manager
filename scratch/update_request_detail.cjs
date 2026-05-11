const fs = require('fs');
const path = 'd:\\APP VPP\\vpp-manager-main\\vpp-manager-main\\src\\pages\\requests\\RequestsDetail.tsx';

let content = fs.readFileSync(path, 'utf8');

// 1. Update Main Table Header
content = content.replace(
    /<th className="px-2 py-3 text-center text-blue-600 bg-blue-50\/30">Lấy thực<\/th>/,
    '<th className="px-2 py-3 text-center text-blue-600 bg-blue-50/30">Lấy thực</th>\n                                    <th className="px-2 py-3 text-right">Đơn giá</th>\n                                    <th className="px-2 py-3 text-right">Thành tiền</th>'
);

// 2. Update Main Table Row
const rowRegex = /(\s+)<td className="px-2 py-2 text-center bg-blue-50\/30">[\s\S]*?\{l\.qtyDelivered \?\? 0\}[\s\S]*?<\/td>/g;
content = content.replace(rowRegex, (match, p1) => {
    return match + `\n${p1}<td className="px-2 py-2 text-right">\n${p1}    <span className="text-xs font-bold text-slate-500">{(l.item.price || 0).toLocaleString('vi-VN')}</span>\n${p1}</td>\n${p1}<td className="px-2 py-2 text-right">\n${p1}    <span className="text-xs font-black text-slate-800">{((l.item.price || 0) * (l.qtyApproved ?? l.qtyRequested)).toLocaleString('vi-VN')}</span>\n${p1}</td>`;
});

// 3. Update Approval Modal Header
content = content.replace(
    /<th className="p-4 text-center">SL Duyệt<\/th>/,
    '<th className="p-4 text-center">SL Duyệt</th>\n                                   <th className="p-4 text-right">Đơn giá</th>\n                                   <th className="p-4 text-right">Thành tiền</th>'
);

// 4. Update Approval Modal Row
const modalRowRegex = /(\s+)<td className="p-4 align-top pt-4">[\s\S]*?input[\s\S]*?value=\{approval\.qtyApproved\}[\s\S]*?<\/td>/g;
content = content.replace(modalRowRegex, (match, p1) => {
    return match + `\n${p1}<td className="p-4 text-right font-medium align-top pt-5">\n${p1}    {(l.item.price || 0).toLocaleString('vi-VN')}\n${p1}</td>\n${p1}<td className="p-4 text-right font-black text-slate-800 align-top pt-5">\n${p1}    {((l.item.price || 0) * (approval.selected ? approval.qtyApproved : 0)).toLocaleString('vi-VN')}\n${p1}</td>`;
});

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
