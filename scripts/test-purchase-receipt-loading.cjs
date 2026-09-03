const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({
    server: { host: '127.0.0.1', port: 4177, strictPort: true },
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4177/api') },
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, ...(process.env.REPORT_TEST_BROWSER ? { executablePath: process.env.REPORT_TEST_BROWSER } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => {
      localStorage.setItem('vpp_token', 'LOCAL_MOCK_ONLY');
      localStorage.setItem('vpp_user', JSON.stringify({ id: 'test', fullName: 'Kiểm thử', username: 'test', role: 'ADMIN' }));
    });
    const purchases = [{ id: 'PO-TEST', status: 'COMPLETED', title: 'Đơn mua kiểm thử', requesterName: 'Kiểm thử',
      createdAt: '2026-09-03T00:00:00Z', lines: [], topItems: [], depts: [], warehouses: [], actualTotal: 200, totalAmount: 200, originalTotal: 200, lineCount: 0 }];
    const receipts = [{ id: 'RC-TEST', poId: 'PO-TEST', status: 'COMPLETED', totalRemaining: 0,
      createdAt: '2026-09-03T00:00:00Z', receiveDate: '2026-09-03T00:00:00Z', lineCount: 1, supplier: 'NCC kiểm thử' }];
    let mode = 'error';
    await context.route('**/api/**', route => {
      const endpoint = new URL(route.request().url()).pathname;
      if (['/api/purchases', '/api/receipts'].includes(endpoint)) {
        if (mode === 'error') return route.fulfill({ status: 500, json: { error: 'Internal test failure' } });
        if (mode === 'invalid') return route.fulfill({ json: { unexpected: true } });
        return route.fulfill({ json: mode === 'empty' ? [] : endpoint === '/api/purchases' ? purchases : receipts });
      }
      return route.fulfill({ json: [] });
    });
    await context.route(/^https:\/\//, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const output = process.env.REPORT_TEST_OUTPUT || path.resolve('.test-artifacts/purchase-receipt-loading');
    fs.mkdirSync(output, { recursive: true });

    for (const pagePath of ['/purchase-orders', '/receipts']) {
      mode = 'error';
      await page.goto(`http://127.0.0.1:4177${pagePath}`);
      await page.getByRole('alert').waitFor();
      assert.match(await page.getByRole('alert').innerText(), /Không tải được danh sách/);
      assert.equal(await page.getByText(/Không tìm thấy|Chưa có phiếu nhập kho\./).count(), 0);
      await page.screenshot({ path: path.join(output, `${pagePath.slice(1)}-error.png`), fullPage: true });
      mode = 'success';
      await page.getByRole('button', { name: 'Thử tải lại', exact: true }).click();
      await page.getByRole('alert').waitFor({ state: 'hidden' });
      if (pagePath === '/receipts') {
        await page.getByText('Không có phiếu đang chờ kiểm hàng / nhập kho.', { exact: true }).waitFor();
        assert.match(await page.locator('tbody').innerText(), /Hệ thống có 1 phiếu nhập kho/);
        await page.getByRole('button', { name: 'Xem tất cả phiếu', exact: true }).click();
        await page.getByText('RC-TEST', { exact: true }).waitFor();
      } else {
        await page.getByText('PO-TEST', { exact: true }).waitFor();
      }
      mode = 'error';
      await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
      await page.getByRole('alert').waitFor();
      assert.match(await page.getByRole('alert').innerText(), /dữ liệu đã tải trước đó/);
      assert.ok((await page.locator('tbody').innerText()).includes(pagePath === '/receipts' ? 'RC-TEST' : 'PO-TEST'));
      mode = 'invalid';
      await page.getByRole('button', { name: 'Thử tải lại', exact: true }).click();
      await page.getByRole('alert').waitFor();
      mode = 'empty';
      await page.getByRole('button', { name: 'Thử tải lại', exact: true }).click();
      await page.getByRole('alert').waitFor({ state: 'hidden' });
      await page.getByText(pagePath === '/receipts' ? 'Chưa có phiếu nhập kho.' : 'Không tìm thấy Đơn mua sắm phù hợp', { exact: true }).waitFor();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: purchase/receipt failures are distinct from empty lists, retry recovers, cached rows survive refresh errors, invalid payloads are handled, receipt filters explain hidden rows.');
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
