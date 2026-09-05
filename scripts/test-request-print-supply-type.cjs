const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({
    server: { host: '127.0.0.1', port: 4180, strictPort: true },
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4180/api') },
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, ...(process.env.REPORT_TEST_BROWSER ? { executablePath: process.env.REPORT_TEST_BROWSER } : {}) });
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    await context.addInitScript(() => {
      localStorage.setItem('vpp_token', 'LOCAL_MOCK_ONLY');
      localStorage.setItem('vpp_user', JSON.stringify({ id: 'admin', role: 'ADMIN', fullName: 'Kiểm thử' }));
      window.print = () => {};
    });
    const request = {
      id: 'PDX-VS-TEST', status: 'COMPLETED', warehouseCode: 'MAIN', requestType: 'Định kỳ',
      createdAt: '2026-07-02T03:00:00Z', department: 'Văn phòng Bán hàng Danko Riverside',
      requester: { id: 'user', fullName: 'Nguyễn Thị Phượng', role: 'USER' },
      purpose: 'Dùng cho Ban quản lí dự án', approvalSteps: [], approvalHistories: [], deliveryBatches: [],
      lines: [{
        id: 'line-1', qtyRequested: 1, qtyApproved: 1, replacementQty: 1,
        item: { id: 'old', mvpp: 'VPP-OLD', name: 'Vật tư cũ', itemType: 'VPP', unit: 'Can', price: 76450 },
        replacementItemId: 'vs-item',
        replacementItem: { id: 'vs-item', mvpp: 'VS-201-014', name: 'Nước Tẩy nhà vệ sinh Gift 3.8kg', itemType: 'VPP', unit: 'Can', price: 76450 },
      }],
    };
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({ json: path === '/api/requests/PDX-VS-TEST' ? request : [] });
    });
    await context.route(/^https:\/\//, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4180/requests/PDX-VS-TEST/print?printType=VPP');
    await page.getByRole('heading', { name: 'PHIẾU ĐỀ XUẤT ĐỒ VỆ SINH', exact: true }).waitFor();
    await page.getByRole('columnheader', { name: 'Tên Đồ Vệ Sinh', exact: true }).waitFor();
    await page.getByText('Nước Tẩy nhà vệ sinh Gift 3.8kg', { exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'PHIẾU ĐỀ XUẤT VĂN PHÒNG PHẨM', exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: a VS replacement is classified from the displayed item and prints with sanitation title/column even when the incoming print type is VPP.');
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
