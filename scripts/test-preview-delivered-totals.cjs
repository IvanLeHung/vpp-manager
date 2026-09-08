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
const { getRequestLineDeliveredQuantity: delivered, getRequestLineCorrectedQuantity: corrected, getRequestLineAmount: amount } = loaded.exports;
test('first screenshot: 204 requested becomes 152 delivered, 3,542,950 corrected VND', () => {
  const requested = [30, 1, 15, 5, 5, 2, 5, 18, 30, 5, 15, 40, 3, 30];
  const actual = [25, 1, 10, 5, 5, 2, 5, 10, 30, 5, 15, 6, 3, 30];
  const prices = [54500, 19440, 3600, 4800, 6800, 40000, 11880, 35000, 1620, 7200, 2500, 56160, 2850, 37000];
  const lines = requested.map((qtyRequested, i) => ({ qtyRequested, qtyDelivered: actual[i], unitPrice: prices[i] }));
  assert.equal(requested.reduce((a, b) => a + b), 204);
  assert.equal(lines.reduce((sum, line) => sum + amount(line, line.qtyRequested), 0), 6022890);
  assert.equal(lines.reduce((sum, line) => sum + delivered(line), 0), 152);
  const correctedQty = [25, 1, 10, 5, 5, 2, 5, 10, 30, 5, 15, 6, 3, 30];
  correctedQty.forEach((qtyApproved, i) => Object.assign(lines[i], { qtyApproved }));
  assert.equal(lines.reduce((sum, line) => sum + amount(line, corrected(line)), 0), 3542950);
});
test('zero/missing delivery does not fall back to requested, approved or replacement qty', () => {
  for (const value of [0, null, undefined, '', 'invalid', -1]) {
    const line = { qtyDelivered: value, qtyRequested: 30, qtyApproved: 20, replacementQty: 15, unitPrice: 10 };
    assert.equal(delivered(line), 0); assert.equal(amount(line, delivered(line)), 0);
  }
});
test('corrected prices and replacement snapshots apply to corrected quantity', () => {
  const line = { qtyRequested: 30, qtyDelivered: '3', replacementItemId: 'new', replacementQty: 20, replacementPrice: 120, unitPrice: 50 };
  assert.equal(amount(line, corrected(line)), 2400);
  assert.equal(amount({ ...line, replacementPrice: 0 }, corrected(line)), 0);
});
test('reported PDX keeps delivered 54 but corrected amount is 880,600 VND', () => {
  const quantities = [2, 3, 5, 11, 5, 3, 5, 2, 10, 5, 3];
  const correctedQuantities = [2, 3, 5, 11, 5, 3, 5, 2, 10, 5, 1];
  const prices = [2850, 2200, 3600, 54500, 4800, 6800, 11880, 23500, 7200, 4000, 8000];
  const lines = quantities.map((qtyDelivered, i) => ({ qtyDelivered, qtyApproved: correctedQuantities[i], qtyRequested: qtyDelivered, unitPrice: prices[i] }));
  assert.equal(lines.reduce((sum, line) => sum + delivered(line), 0), 54);
  assert.equal(lines.reduce((sum, line) => sum + corrected(line), 0), 52);
  assert.equal(lines.reduce((sum, line) => sum + amount(line, corrected(line)), 0), 880600);
  assert.equal(lines.reduce((sum, line) => sum + amount(line, delivered(line)), 0), 896600);
});
test('preview labels distinguish delivered quantity from corrected amount, and refresh follows data', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/pages/requests/RequestsList.tsx'), 'utf8');
  const preview = source.split('{/* RIGHT: Item Detail Panel */}')[1].split('request={previewReq}')[0];
  assert.ok(preview.includes('SL thực giao'));
  assert.ok(preview.includes('Thành tiền sau hiệu chỉnh'));
  assert.ok(preview.includes('getRequestLineCorrectedQuantity(line)'));
  assert.ok(source.includes('requests.find(request => request.id === previous.id)'));
});
test('request list header uses hysteresis and a binary transition instead of per-pixel resizing', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/pages/requests/RequestsList.tsx'), 'utf8');
  assert.ok(source.includes('scrollTop >= 96 ? true : scrollTop <= 24 ? false : null'));
  assert.ok(source.includes("gridTemplateRows: isHeaderCompact ? '0fr' : '1fr'"));
  assert.ok(source.includes('transition: \'grid-template-rows 420ms'));
  assert.ok(!source.includes('setListCompactProgress'));
});
