import { getRequestLineAmount, getRequestLineDeliveredQuantity } from './requestPricing';

export function summarizeDepartmentAmounts(requests: any[]) {
  const groups = new Map<string, { department: string; requestCount: number; amount: number }>();
  const seen = new Set<string>();
  for (const request of requests) {
    if (seen.has(request.id)) continue;
    seen.add(request.id);
    const department = String(request.requester?.department?.name || request.department || '').trim().replace(/\s+/g, ' ') || 'Chưa xác định phòng ban';
    const key = request.requester?.departmentId ? `id:${request.requester.departmentId}` : `name:${department.toLocaleLowerCase('vi-VN')}`;
    const group = groups.get(key) || { department, requestCount: 0, amount: 0 };
    group.requestCount++;
    // Sum minor currency units to avoid accumulating binary floating-point noise.
    for (const line of request.lines || []) {
      group.amount += Math.round(getRequestLineAmount(line, getRequestLineDeliveredQuantity(line)) * 100);
    }
    groups.set(key, group);
  }
  const rows = [...groups.values()].map(row => ({ ...row, amount: row.amount / 100 }))
    .sort((a, b) => b.amount - a.amount || a.department.localeCompare(b.department, 'vi'));
  return { rows, requestCount: seen.size, totalAmount: Math.round(rows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0)) / 100 };
}
