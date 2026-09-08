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
const line = { qtyRequested: 100, qtyDelivered: 3, unitPrice: 120 };
test('combines selected receipts across departments and deduplicates ids', () => {
  const first = { id: 'p1', department: '  Kế   toán ', lines: [line] };
  const report = summarize([first, { id: 'p2', department: 'Kế toán', lines: [{ ...line, qtyDelivered: 2 }] }, { id: 'p3', department: 'Hành chính', lines: [line] }, first]);
  assert.equal(report.requestCount, 3);
  assert.equal(report.rows.length, 2);
  assert.equal(report.rows.find(row => row.department === 'Kế toán').amount, 600);
  assert.equal(report.totalAmount, 960);
});
test('current department id groups consistently; actual and corrected replacement price only', () => {
  const report = summarize([
    { id: 'p1', department: 'Tên cũ', requester: { departmentId: 'd1', department: { name: 'Phòng mới' } }, lines: [{ ...line, replacementItemId: 'vs', replacementQty: 100, replacementPrice: 50 }] },
    { id: 'p2', requester: { departmentId: 'd1', department: { name: 'Phòng mới' } }, lines: [{ ...line, qtyDelivered: 0 }] },
    { id: 'p3', lines: [{ ...line, qtyDelivered: undefined }] },
  ]);
  assert.equal(report.rows.length, 2);
  assert.equal(report.rows.find(row => row.department === 'Phòng mới').requestCount, 2);
  assert.equal(report.totalAmount, 150);
  assert.equal(report.rows.find(row => row.department === 'Chưa xác định phòng ban').amount, 0);
});
test('empty selection and fractional money', () => {
  assert.deepEqual(summarize([]), { rows: [], requestCount: 0, totalAmount: 0 });
  assert.equal(summarize([{ id: 'p', lines: [{ qtyDelivered: 1, unitPrice: 0.1 }, { qtyDelivered: 1, unitPrice: 0.2 }] }]).totalAmount, 0.3);
});
test('menu invokes hydrated selected-id print path and separate report', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/pages/requests/RequestsList.tsx'), 'utf8');
  assert.ok(source.includes("{ key: 'DEPARTMENT', label: 'Tổng hợp phòng ban – số tiền' }"));
  assert.ok(source.includes('const ids = [...selectedIds]'));
  assert.ok(source.includes('<DepartmentAmountPrint requests={printRequests} />'));
});
