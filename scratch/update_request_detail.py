import re
import os

path = r"d:\APP VPP\vpp-manager-main\vpp-manager-main\src\pages\requests\RequestsDetail.tsx"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Main Table Header
content = re.sub(
    r'<th className="px-2 py-3 text-center text-blue-600 bg-blue-50/30">Lấy thực</th>',
    r'<th className="px-2 py-3 text-center text-blue-600 bg-blue-50/30">Lấy thực</th>\n                                    <th className="px-2 py-3 text-right">Đơn giá</th>\n                                    <th className="px-2 py-3 text-right">Thành tiền</th>',
    content
)

# 2. Update Main Table Row
content = re.sub(
    r'(\s+)<td className="px-2 py-2 text-center bg-blue-50/30">.*?\{l\.qtyDelivered \?\? 0\}.*?</td>',
    r'\g<0>\n\1<td className="px-2 py-2 text-right">\n\1    <span className="text-xs font-bold text-slate-500">{(l.item.price || 0).toLocaleString(\'vi-VN\')}</span>\n\1</td>\n\1<td className="px-2 py-2 text-right">\n\1    <span className="text-xs font-black text-slate-800">{((l.item.price || 0) * (l.qtyApproved ?? l.qtyRequested)).toLocaleString(\'vi-VN\')}</span>\n\1</td>',
    content,
    flags=re.DOTALL
)

# 3. Update Approval Modal Header
content = re.sub(
    r'<th className="p-4 text-center">SL Duyệt</th>',
    r'<th className="p-4 text-center">SL Duyệt</th>\n                                   <th className="p-4 text-right">Đơn giá</th>\n                                   <th className="p-4 text-right">Thành tiền</th>',
    content
)

# 4. Update Approval Modal Row
content = re.sub(
    r'(\s+)<td className="p-4 align-top pt-4">.*?input.*?value=\{approval\.qtyApproved\}.*?</td>',
    r'\g<0>\n\1<td className="p-4 text-right font-medium align-top pt-5">\n\1    {(l.item.price || 0).toLocaleString(\'vi-VN\')}\n\1</td>\n\1<td className="p-4 text-right font-black text-slate-800 align-top pt-5">\n\1    {((l.item.price || 0) * (approval.selected ? approval.qtyApproved : 0)).toLocaleString(\'vi-VN\')}\n\1</td>',
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
