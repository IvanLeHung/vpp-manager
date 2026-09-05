const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({
    server: { host: '127.0.0.1', port: 4179, strictPort: true },
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4179/api') },
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, ...(process.env.REPORT_TEST_BROWSER ? { executablePath: process.env.REPORT_TEST_BROWSER } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => {
      localStorage.setItem('vpp_token', 'LOCAL_MOCK_ONLY');
      localStorage.setItem('vpp_user', JSON.stringify({ id: 'admin', fullName: 'Kiểm thử', role: 'ADMIN' }));
    });
    const makeRequest = (id, day) => ({
      id, status: 'DRAFT', requesterId: 'user', requester: { id: 'user', fullName: 'Người đề xuất' },
      department: 'Phòng kiểm thử', priority: 'Thường', createdAt: `2026-09-${String(day).padStart(2, '0')}T03:00:00Z`, lines: [],
    });
    const requests = [makeRequest('PDX-DAY-1', 1), makeRequest('PDX-DAY-3', 3), makeRequest('PDX-DAY-4', 4)];
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/requests') return route.fulfill({ json: requests });
      const request = requests.find(item => path === `/api/requests/${item.id}`);
      return route.fulfill({ json: request || [] });
    });
    await context.route(/^https:\/\//, route => route.abort());
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('http://127.0.0.1:4179/requests');
    await page.getByText('PDX-DAY-1', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Bộ lọc', exact: true }).click();
    await page.getByRole('button', { name: 'Tất cả ngày', exact: true }).click();
    await page.getByRole('button', { name: 'Khoảng ngày', exact: true }).click();
    await page.getByRole('button', { name: '1', exact: true }).click();
    await page.getByText('PDX-DAY-3', { exact: true }).waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: '3', exact: true }).click();
    await page.getByText('PDX-DAY-3', { exact: true }).waitFor();
    assert.equal(await page.getByText('PDX-DAY-4', { exact: true }).count(), 0);
    assert.match(await page.getByRole('button', { name: /1\/9\/2026 — 3\/9\/2026/ }).innerText(), /1\/9\/2026/);

    const listUrl = page.url();
    const requestLink = page.getByRole('link', { name: 'PDX-DAY-1', exact: true });
    assert.equal(await requestLink.getAttribute('href'), '/requests/PDX-DAY-1');
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      requestLink.click({ button: 'middle' }),
    ]);
    await newPage.waitForLoadState('domcontentloaded');
    assert.equal(page.url(), listUrl);
    assert.match(newPage.url(), /\/requests\/PDX-DAY-1$/);
    assert.deepEqual(pageErrors, []);
    console.log('PASS: request date range is inclusive and middle-click opens detail in a new tab without leaving the list.');
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
