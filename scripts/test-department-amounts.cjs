const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(name) {
  const filename = path.resolve(__dirname, '../src/lib', `${name}.ts`);
  const mod = new Module(filename, module);
  mod.require = id => id === './requestPricing' ? load('requestPricing') : require(id);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText, filename);
  return mod.exports;
}
const { summarizeDepartmentAmounts: summarize } = load('departmentAmounts');
const line = { qtyRequested: 3, qtyApproved: 3, qtyDelivered: 3, unitPrice: 120 };
test('combines selected receipts across departments and deduplicates ids', () => {
  const first = { id: 'p1', department: '  Kế   toán ', lines: [line] };
  const report = summarize([first, { id: 'p2', department: 'Kế toán', lines: [{ ...line, qtyApproved: 2, qtyDelivered: 2 }] }, { id: 'p3', department: 'Hành chính', lines: [line] }, first]);
  assert.equal(report.requestCount, 3);
  assert.equal(report.rows.length, 2);
  assert.equal(report.rows.find(row => row.department === 'Kế toán').amount, 600);
  assert.equal(report.totalAmount, 960);
});
test('current department id groups consistently; actual and corrected replacement price only', () => {
  const report = summarize([
    { id: 'p1', department: 'Tên cũ', requester: { departmentId: 'd1', department: { name: 'Phòng mới' } }, lines: [{ ...line, replacementItemId: 'vs', replacementQty: 3, replacementPrice: 50 }] },
    { id: 'p2', requester: { departmentId: 'd1', department: { name: 'Phòng mới' } }, lines: [{ ...line, qtyApproved: 0, qtyDelivered: 0 }] },
    { id: 'p3', lines: [{ ...line, qtyApproved: 0, qtyDelivered: undefined }] },
  ]);
  assert.equal(report.rows.length, 2);
  assert.equal(report.rows.find(row => row.department === 'Phòng mới').requestCount, 2);
  assert.equal(report.totalAmount, 150);
  assert.equal(report.rows.find(row => row.department === 'Chưa xác định phòng ban').amount, 0);
});
test('empty selection and fractional money', () => {
  assert.deepEqual(summarize([]), { rows: [], requestCount: 0, totalAmount: 0 });
  assert.equal(summarize([{ id: 'p', lines: [{ qtyApproved: 1, qtyDelivered: 1, unitPrice: 0.1 }, { qtyApproved: 1, qtyDelivered: 1, unitPrice: 0.2 }] }]).totalAmount, 0.3);
});
test('sorts departments by descending amount, retaining their receipt counts', () => {
  const report = summarize([
    { id: '1', department: 'A', lines: [{ qtyApproved: 1, qtyDelivered: 1, unitPrice: 10 }] },
    { id: '2', department: 'Z', lines: [{ qtyApproved: 1, qtyDelivered: 1, unitPrice: 90 }] },
    { id: '3', department: 'Z', lines: [{ qtyApproved: 1, qtyDelivered: 1, unitPrice: 10 }] },
    { id: '4', department: 'B', lines: [{ qtyApproved: 1, qtyDelivered: 1, unitPrice: 10 }] },
    { id: '5', department: 'C', lines: [] },
  ]);
  assert.deepEqual(report.rows.map(row => [row.department, row.amount, row.requestCount]), [
    ['Z', 100, 2], ['A', 10, 1], ['B', 10, 1], ['C', 0, 1],
  ]);
  assert.equal(report.totalAmount, 120);
});
test('menu invokes hydrated selected-id print path and separate report', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/pages/requests/RequestsList.tsx'), 'utf8');
  assert.ok(source.includes("key: 'DEPARTMENT_OPTIONS', label: 'Tổng hợp phòng ban – số tiền'"));
  assert.ok(source.includes('const ids = [...selectedIds]'));
  assert.ok(source.includes('<DepartmentAmountPrint requests={printRequests} supplyGroup={departmentPrintGroup}'));
});
test('VPP and VS split mixed lines, receipt counts and amounts; ALL sums both', () => {
  const requests = [
    { id: 'mixed', department: 'A', lines: [{ qtyApproved: 2, qtyDelivered: 2, unitPrice: 10, item: { itemType: 'VPP' } }, { qtyApproved: 3, qtyDelivered: 3, unitPrice: 20, item: { mvpp: 'VS001', itemType: 'VPP' } }] },
    { id: 'only-vpp', department: 'B', lines: [{ qtyApproved: 1, qtyDelivered: 1, unitPrice: 100, item: { itemType: 'VPP' } }] },
  ];
  const vpp = summarize(requests, 'VPP'), vs = summarize(requests, 'VS'), all = summarize(requests, 'ALL');
  assert.equal(vpp.totalAmount, 120); assert.equal(vpp.requestCount, 2);
  assert.equal(vs.totalAmount, 60); assert.equal(vs.requestCount, 1); assert.equal(vs.rows.length, 1);
  assert.equal(all.totalAmount, 180); assert.equal(all.requestCount, 2);
  assert.equal(vpp.rows[0].department, 'B');
  assert.equal(summarize([{ id: 'replacement', lines: [{ qtyDelivered: 1, replacementItemId: 'new', replacementQty: 1, replacementPrice: 40, item: { itemType: 'VPP' }, replacementItem: { itemType: 'VE_SINH' } }] }], 'VS').totalAmount, 40);
});
test('formal layout removes requested explanatory text and keeps unsigned signature fields', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/components/DepartmentAmountPrint.tsx'), 'utf8');
  assert.ok(!source.includes('Thành tiền ='));
  assert.ok(!source.includes('Chỉ tổng hợp các phiếu đã chọn'));
  assert.ok(source.includes('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'));
  assert.ok(source.includes('NGƯỜI LẬP BIỂU'));
});
test('department report uses corrected quantity rather than inconsistent delivered quantity', () => {
  const report = summarize([{ id: 'PDX', department: 'P. Cung ứng 2', lines: [
    { qtyRequested: 3, qtyApproved: 1, qtyDelivered: 3, unitPrice: 8000, item: { itemType: 'VPP' } },
  ] }]);
  assert.equal(report.totalAmount, 8000);
});
