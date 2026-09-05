const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({
    server: { host: '127.0.0.1', port: 4181, strictPort: true },
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4181/api') },
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, ...(process.env.REPORT_TEST_BROWSER ? { executablePath: process.env.REPORT_TEST_BROWSER } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      localStorage.setItem('vpp_token', 'LOCAL_MOCK_ONLY');
      localStorage.setItem('vpp_user', JSON.stringify({ id: 'admin', role: 'ADMIN', fullName: 'Kiểm thử' }));
    });
    const line = (id, item) => ({ id, itemId: item.id, item, qtyRequested: 1, status: 'COMPLETED' });
    const request = (id, warehouseCode, lines) => ({
      id, warehouseCode, lines, status: 'COMPLETED', requesterId: 'user',
      requester: { fullName: 'Người đề xuất' }, department: 'Phòng kiểm thử', priority: 'Thường',
      requestType: 'Định kỳ', purpose: 'Kiểm thử', createdAt: '2026-09-05T03:00:00Z',
    });
    const vpp = { id: 'vpp', mvpp: 'VPP-001', name: 'Bút', itemType: 'VPP' };
    const vs = { id: 'vs', mvpp: 'VS-001', name: 'Nước lau sàn', itemType: 'VE_SINH' };
    const requests = [
      request('PDX-VPP', 'MAIN', [line('vpp-line', vpp)]),
      request('PDX-VS', 'VE_SINH', [line('vs-line', vs)]),
      request('PDX-MIXED', 'MAIN', [line('mixed-vpp', vpp), line('mixed-vs', vs)]),
      request('PDX-EMPTY-VS', 'VE_SINH', []),
    ];
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({ json: path === '/api/requests' ? requests : [] });
    });
    await context.route(/^https:\/\//, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4181/requests');
    await page.getByRole('columnheader', { name: /Nhóm hàng của phiếu/ }).waitFor();
    assert.equal(await page.getByLabel('Nhóm hàng: VPP', { exact: true }).count(), 1);
    assert.equal(await page.getByLabel('Nhóm hàng: VS', { exact: true }).count(), 2);
    assert.equal(await page.getByLabel('Nhóm hàng: VPP+VS', { exact: true }).count(), 1);
    assert.equal(await page.getByLabel('Nhóm hàng: VPP+VS', { exact: true }).getAttribute('title'), 'Phiếu hỗn hợp Văn phòng phẩm và Đồ vệ sinh');
    const output = process.env.REPORT_TEST_OUTPUT || path.resolve('.test-artifacts/request-supply-group');
    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, 'request-supply-group.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('PASS: request list shows VPP, VS, mixed, and empty-request fallback supply groups with accessible flat badges.');
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
