import { getRequestLineAmount, getRequestLineCorrectedQuantity } from './requestPricing';

export type DepartmentSupplyGroup = 'ALL' | 'VPP' | 'VS';
export function departmentLineSupplyGroup(line: any): 'VPP' | 'VS' {
  const item = line.replacementItemId && line.replacementItem ? line.replacementItem : line.issue_item || line.item;
  const type = String(item?.itemType || '').toUpperCase();
  const category = String(item?.category || '').toUpperCase();
  const code = String(item?.mvpp || '').toUpperCase();
  return type.includes('VE_SINH') || type === 'VS' || category.includes('VE_SINH')
    || category.includes('VỆ SINH') || category.includes('TẠP HÓA') || code.startsWith('VS') ? 'VS' : 'VPP';
}
export function summarizeDepartmentAmounts(requests: any[], supplyGroup: DepartmentSupplyGroup = 'ALL') {
  const groups = new Map<string, { department: string; requestCount: number; amount: number }>();
  const seen = new Set<string>();
  for (const request of requests) {
    if (seen.has(request.id)) continue;
    const lines = (request.lines || []).filter((line: any) => supplyGroup === 'ALL' || departmentLineSupplyGroup(line) === supplyGroup);
    if (supplyGroup !== 'ALL' && !lines.length) continue;
    seen.add(request.id);
    const department = String(request.requester?.department?.name || request.department || '').trim().replace(/\s+/g, ' ') || 'Chưa xác định phòng ban';
    const key = request.requester?.departmentId ? `id:${request.requester.departmentId}` : `name:${department.toLocaleLowerCase('vi-VN')}`;
    const group = groups.get(key) || { department, requestCount: 0, amount: 0 };
    group.requestCount++;
    // Sum minor currency units to avoid accumulating binary floating-point noise.
    for (const line of lines) {
      group.amount += Math.round(getRequestLineAmount(line, getRequestLineCorrectedQuantity(line)) * 100);
    }
    groups.set(key, group);
  }
  const rows = [...groups.values()].map(row => ({ ...row, amount: row.amount / 100 }))
    .sort((a, b) => b.amount - a.amount || a.department.localeCompare(b.department, 'vi'));
  return { rows, requestCount: seen.size, totalAmount: Math.round(rows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0)) / 100 };
}
