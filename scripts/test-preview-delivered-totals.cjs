const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const filename = path.resolve(__dirname, '../src/lib/requestPricing.ts');
const loaded = new Module(filename, module);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
}).outputText, filename);
const { getRequestLineDeliveredQuantity: delivered, getRequestLineAmount: amount } = loaded.exports;
test('screenshot: 204 requested becomes 152 delivered, 3,542,950 VND', () => {
  const requested = [30, 1, 15, 5, 5, 2, 5, 18, 30, 5, 15, 40, 3, 30];
  const actual = [25, 1, 10, 5, 5, 2, 5, 10, 30, 5, 15, 6, 3, 30];
  const prices = [54500, 19440, 3600, 4800, 6800, 40000, 11880, 35000, 1620, 7200, 2500, 56160, 2850, 37000];
  const lines = requested.map((qtyRequested, i) => ({ qtyRequested, qtyDelivered: actual[i], unitPrice: prices[i] }));
  assert.equal(requested.reduce((a, b) => a + b), 204);
  assert.equal(lines.reduce((sum, line) => sum + amount(line, line.qtyRequested), 0), 6022890);
  assert.equal(lines.reduce((sum, line) => sum + delivered(line), 0), 152);
  assert.equal(lines.reduce((sum, line) => sum + amount(line, delivered(line)), 0), 3542950);
});
test('zero/missing delivery does not fall back to requested, approved or replacement qty', () => {
  for (const value of [0, null, undefined, '', 'invalid', -1]) {
    const line = { qtyDelivered: value, qtyRequested: 30, qtyApproved: 20, replacementQty: 15, unitPrice: 10 };
    assert.equal(delivered(line), 0); assert.equal(amount(line, delivered(line)), 0);
  }
});
test('corrected prices and replacement snapshots apply to actual quantity only', () => {
  const line = { qtyRequested: 30, qtyDelivered: '3', replacementItemId: 'new', replacementQty: 20, replacementPrice: 120, unitPrice: 50 };
  assert.equal(amount(line, delivered(line)), 360);
  assert.equal(amount({ ...line, replacementPrice: 0 }, delivered(line)), 0);
});
test('preview labels and totals use delivery, and refresh follows request data', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/pages/requests/RequestsList.tsx'), 'utf8');
  const preview = source.split('{/* RIGHT: Item Detail Panel */}')[1].split('request={previewReq}')[0];
  assert.ok(preview.includes('SL thực giao'));
  assert.ok(preview.includes('Thành tiền thực giao'));
  assert.ok(!preview.includes('qtyRequested'));
  assert.ok(source.includes('requests.find(request => request.id === previous.id)'));
});
