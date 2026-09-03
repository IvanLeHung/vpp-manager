const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({
    server: { host: '127.0.0.1', port: 4178, strictPort: true },
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4178/api') },
  });
  let browser;
  try {
    await server.listen();
    const { getRequestHistoryDisplay } = await server.ssrLoadModule('/src/lib/requestHistoryDisplay.ts');
    const actor = Object.freeze({ fullName: 'Lê Thanh Hùng (ADM)', role: 'ADMIN' });
    const requester = Object.freeze({ id: 'requester-a', fullName: 'Người đề xuất A', role: 'USER' });
    const event = Object.freeze({ id: 'full', action: 'COMPLETED', reason: 'Người dùng xác nhận đã nhận ĐỦ hàng', approver: actor, createdAt: '2026-08-29T03:00:00Z' });
    const partial = Object.freeze({ ...event, id: 'partial', action: 'PARTIAL_DELIVERY_CONFIRMED', reason: 'Người dùng xác nhận đã nhận hàng (Một phần)' });
    const plain = Object.freeze({ ...event, id: 'plain', reason: 'Người dùng xác nhận đã nhận hàng' });
    for (const receipt of [partial, plain, { ...plain, action: 'PARTIAL_DELIVERY_CONFIRMED' }, { ...plain, reason: '  NGƯỜI DÙNG xác nhận   đã nhận hàng  '.normalize('NFD') }]) {
      const snapshot = JSON.stringify(receipt);
      assert.equal(getRequestHistoryDisplay(receipt, requester).person, requester);
      assert.equal(getRequestHistoryDisplay(receipt, requester).originalActor, actor);
      assert.equal(JSON.stringify(receipt), snapshot);
      assert.equal(getRequestHistoryDisplay({ ...receipt, approver: { fullName: 'Admin khác', role: 'ADMIN' } }, requester).showRequester, false);
      assert.equal(getRequestHistoryDisplay(receipt, null).person, actor);
    }
    const before = JSON.stringify({ event, requester });
    const result = getRequestHistoryDisplay(event, requester);
    assert.equal(result.person, requester);
    assert.equal(result.originalActor, actor);
    assert.equal(result.showRequester, true);
    for (const fullName of ['Lê Thanh Hùng', ' LÊ THANH HÙNG (ADM) ', 'Lê Thanh Hùng'.normalize('NFD')]) {
      assert.equal(getRequestHistoryDisplay({ ...event, approver: { fullName, role: 'ADMIN' } }, requester).person, requester);
    }
    for (const otherEvent of [
      { ...event, action: 'ADMIN_APPROVE' },
      { ...plain, action: 'ADMIN_APPROVE' },
      { ...partial, action: 'ISSUED' },
      { ...plain, reason: 'Người dùng xác nhận đã nhận hàng lỗi' },
      { ...event, reason: 'Người dùng xác nhận đã nhận hàng (Một phần)' },
      { ...event, reason: 'Hoàn thành tự động' },
      { ...event, approver: { fullName: 'Admin khác', role: 'ADMIN' } },
      { ...event, approver: { fullName: actor.fullName, role: 'USER' } },
      { ...event, approver: null },
    ]) {
      assert.equal(getRequestHistoryDisplay(otherEvent, requester).person, otherEvent.approver);
    }
    for (const missing of [null, undefined, { fullName: '' }, { fullName: '  ' }]) {
      assert.equal(getRequestHistoryDisplay(event, missing).person, actor);
    }
    assert.equal(JSON.stringify({ event, requester }), before, 'original audit and requester remain unchanged');

    const request = (id, name) => ({ id, status: 'COMPLETED', requesterId: id, requester: { ...requester, id, fullName: name },
      department: 'Phòng kiểm thử', warehouseCode: 'MAIN', requestType: 'Định kỳ', priority: 'Thường',
      createdAt: '2026-08-01T03:00:00Z', handoverAt: event.createdAt, closedAt: event.createdAt,
      lines: [], approvalSteps: [], deliveryBatches: [],
      approvalHistories: [event, partial, plain, { ...event, id: 'approve', action: 'ADMIN_APPROVE', reason: 'Hành chính duyệt' }],
    });
    const fixtures = [request('PDX-TEST-A', 'Người đề xuất A'), request('PDX-TEST-B', 'Người đề xuất B')];
    browser = await chromium.launch({ headless: true, ...(process.env.REPORT_TEST_BROWSER ? { executablePath: process.env.REPORT_TEST_BROWSER } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => {
      localStorage.setItem('vpp_token', 'LOCAL_MOCK_ONLY');
      localStorage.setItem('vpp_user', JSON.stringify({ id: 'admin', role: 'ADMIN', fullName: 'Kiểm thử' }));
      window.print = () => {};
    });
    await context.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/requests') return route.fulfill({ json: fixtures });
      const data = fixtures.find(fixture => url.pathname === `/api/requests/${fixture.id}`);
      return route.fulfill({ json: data || [] });
    });
    await context.route(/^https:\/\//, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4178/requests/PDX-TEST-A');
    await page.getByRole('button', { name: 'Lịch sử xử lý', exact: true }).click();
    const renamed = page.locator('span[title^="Hiển thị theo người tạo đề xuất"]');
    await renamed.first().waitFor();
    assert.equal(await renamed.first().innerText(), 'Người đề xuất A');
    assert.match(await renamed.first().getAttribute('title'), /Lê Thanh Hùng \(ADM\)/);
    const output = process.env.REPORT_TEST_OUTPUT || path.resolve('.test-artifacts/request-history-display');
    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, 'history-display.png'), fullPage: true });

    await page.goto('http://127.0.0.1:4178/requests/PDX-TEST-A/print?ids=PDX-TEST-A,PDX-TEST-B');
    await renamed.nth(5).waitFor();
    assert.deepEqual(await renamed.allTextContents(), ['Người đề xuất A', 'Người đề xuất A', 'Người đề xuất A', 'Người đề xuất B', 'Người đề xuất B', 'Người đề xuất B']);
    const completionRows = page.locator('tr').filter({ hasText: 'Người dùng xác nhận đã nhận ĐỦ hàng' });
    assert.equal(await completionRows.count(), 2);
    for (const row of await completionRows.all()) {
      assert.doesNotMatch(await row.innerText(), /Lê Thanh Hùng|\(ADM\)/i, 'requesters do not inherit the administrator badge');
    }
    const partialRows = page.locator('tr').filter({ hasText: 'Người dùng xác nhận đã nhận hàng (Một phần)' });
    assert.equal(await partialRows.count(), 2);
    for (const row of await partialRows.all()) assert.doesNotMatch(await row.innerText(), /Lê Thanh Hùng|\(ADM\)/i);
    const plainRows = page.locator('tr').filter({ has: page.getByText('Người dùng xác nhận đã nhận hàng', { exact: true }) });
    assert.equal(await plainRows.count(), 2);
    for (const row of await plainRows.all()) assert.doesNotMatch(await row.innerText(), /Lê Thanh Hùng|\(ADM\)/i);
    const approvalRows = page.locator('tr').filter({ hasText: 'Hành chính duyệt' });
    assert.equal(await approvalRows.count(), 2);
    for (const row of await approvalRows.all()) assert.match(await row.innerText(), /Lê Thanh Hùng/i);
    assert.deepEqual(errors, []);
    console.log('PASS: full/plain/partial receipt confirmations, unchanged audit data, excluded actors/actions, missing requester fallback, detail history and separate requester names in bulk print.');
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
