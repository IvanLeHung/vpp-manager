// Local UI regression test. All API traffic is mocked; no production data is read or written.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

const departments = ['Phòng Hành chính', 'Phòng Kế toán', 'Phòng Kinh doanh', 'Ban Quản lý dự án', 'Phòng Pháp chế', 'Phòng Cung ứng', 'Trung tâm Thương mại Danko City', 'Văn phòng Bán hàng Danko Riverside'].map((name, index) => ({ id: `dept-${index}`, name }));
function fixture(itemType = 'VPP') {
  const names = itemType === 'VPP' ? ['Băng dính trong', 'Bút bi xanh', 'Giấy in A4', 'Giấy in A4', 'Kẹp giấy 19mm', 'Sổ công tác'] : ['Chổi lau sàn', 'Giấy vệ sinh cuộn công nghiệp', 'Nước lau sàn', 'Nước rửa tay', 'Túi đựng rác', 'Xô nhựa'];
  const rows = names.map((name, index) => {
    const quantities = Object.fromEntries(departments.map((dept, i) => [dept.id, (i + index) % 3 ? i + index + 1 : 0]));
    const quantity = Object.values(quantities).reduce((sum, value) => sum + value, 0);
    const unitPrice = index === 0 ? null : 2500 + index * 3000;
    return { key: `row-${index}`, itemId: `item-${index}`, name, mvpp: `${itemType}-${index}`, unit: 'Cái', unitPrice, departmentQuantities: quantities, totalQuantity: quantity, totalAmount: unitPrice === null ? null : quantity * unitPrice };
  });
  return { itemType, requestCount: 10, itemCount: 5, departments, rows, generatedAt: '2026-09-03T01:00:00Z', totals: {
    departmentQuantities: Object.fromEntries(departments.map(dept => [dept.id, rows.reduce((sum, row) => sum + row.departmentQuantities[dept.id], 0)])),
    totalQuantity: rows.reduce((sum, row) => sum + row.totalQuantity, 0), totalAmount: rows.reduce((sum, row) => sum + (row.totalAmount || 0), 0), unpricedRowCount: 1,
  } };
}

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({
    server: { host: '127.0.0.1', port: 4176, strictPort: true },
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4176/api') },
  });
  const outputDir = process.env.REPORT_TEST_OUTPUT || path.resolve(__dirname, '..', '.test-artifacts', 'proposal-report');
  fs.mkdirSync(outputDir, { recursive: true });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, ...(process.env.REPORT_TEST_BROWSER ? { executablePath: process.env.REPORT_TEST_BROWSER } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, timezoneId: 'Asia/Bangkok', locale: 'vi-VN' });
    await context.addInitScript(() => {
      localStorage.setItem('vpp_token', 'LOCAL_MOCK_ONLY');
      localStorage.setItem('vpp_user', JSON.stringify({ id: 'local-test', userId: 'local-test', fullName: 'Người kiểm thử', username: 'test', role: 'ADMIN', department: 'Phòng Hành chính' }));
    });
    let mode = 'success';
    let lastQuery;
    await context.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      let data = [];
      if (url.pathname.endsWith('/reports/dashboard')) data = { operational: { pendingActions: {} }, analytical: { topConsumed: [] } };
      if (url.pathname.endsWith('/reports/proposal-batch-summary')) {
        lastQuery = Object.fromEntries(url.searchParams);
        if (mode === 'error') return route.fulfill({ status: 500, json: { error: 'Lỗi kiểm thử có chủ đích' } });
        data = fixture(url.searchParams.get('itemType'));
        if (mode === 'empty') data = { ...data, rows: [], departments: [], requestCount: 0, itemCount: 0 };
      }
      await route.fulfill({ json: data });
    });
    // Disallow any external navigation or images during the fixture test.
    await context.route(/^https:\/\//, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-09-03T08:00:00+07:00') });
    await page.goto('http://127.0.0.1:4176/dashboard');
    await page.getByRole('button', { name: 'Tổng hợp theo đợt đề xuất', exact: true }).click();
    const table = page.locator('#root .proposal-report-table');
    const waitForReport = async expected => {
      const matches = query => Object.entries(expected).every(([key, value]) => query?.[key] === value);
      if (!matches(lastQuery)) await page.waitForResponse(response => response.url().includes('/proposal-batch-summary') && matches(Object.fromEntries(new URL(response.url()).searchParams)));
      await table.waitFor();
    };
    await table.waitFor();
    assert.equal(await table.locator('tbody tr').count(), 6);
    assert.equal(lastQuery.startDate, '2026-09-01');
    assert.equal(lastQuery.endDate, '2026-09-30');
    await page.screenshot({ path: path.join(outputDir, 'desktop-default.png'), fullPage: true });
    await page.getByRole('button', { name: 'Theo ngày', exact: true }).click();
    await page.screenshot({ path: path.join(outputDir, 'desktop-expanded.png'), fullPage: true });

    await page.getByRole('button', { name: '03/09/2026', exact: true }).click();
    await waitForReport({ dates: '2026-09-03' });
    assert.equal(lastQuery.dates, '2026-09-03');
    await page.getByRole('button', { name: 'Nhiều ngày Chọn các ngày rời rạc' }).click();
    await page.getByRole('button', { name: '03/09/2026', exact: true }).click();
    await page.getByRole('button', { name: '05/09/2026', exact: true }).click();
    await waitForReport({ dates: '2026-09-03,2026-09-05' });
    assert.equal(lastQuery.dates, '2026-09-03,2026-09-05');
    await page.getByRole('button', { name: 'Khoảng ngày Chọn ngày bắt đầu và kết thúc' }).click();
    await page.getByRole('button', { name: '12/09/2026', exact: true }).click();
    await page.getByRole('button', { name: '05/09/2026', exact: true }).click();
    await waitForReport({ startDate: '2026-09-05', endDate: '2026-09-12' });
    assert.equal(lastQuery.startDate, '2026-09-05');
    assert.equal(lastQuery.endDate, '2026-09-12');

    await page.getByRole('button', { name: 'Theo tháng', exact: true }).click();
    await page.getByRole('button', { name: 'Khoảng tháng — chọn tháng bắt đầu và kết thúc' }).click();
    await page.getByRole('button', { name: 'Tháng 8', exact: true }).click();
    await page.getByRole('button', { name: 'Tháng 10', exact: true }).click();
    await waitForReport({ startDate: '2026-08-01', endDate: '2026-10-31' });
    assert.equal(lastQuery.startDate, '2026-08-01');
    assert.equal(lastQuery.endDate, '2026-10-31');
    await page.getByRole('button', { name: 'Thu gọn', exact: true }).click();
    await page.getByRole('button', { name: 'VS · Vệ sinh', exact: true }).click();
    await waitForReport({ itemType: 'VE_SINH' });
    assert.equal(lastQuery.itemType, 'VE_SINH');
    assert.ok((await table.innerText()).includes('Giấy vệ sinh cuộn công nghiệp'));
    await page.screenshot({ path: path.join(outputDir, 'desktop-compact.png'), fullPage: true });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Xuất Excel', exact: true }).click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /VE_SINH/);
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(await download.path());
    const cells = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
    const total = cells.find(row => row[0] === 'TỔNG CỘNG');
    assert.equal(total.at(-1), fixture('VE_SINH').totals.totalAmount);

    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('#root').isVisible(), false);
    assert.equal(await page.locator('.proposal-print-page').count(), 2);
    assert.equal(await page.locator('.proposal-report-print').isVisible(), true);
    await page.screenshot({ path: path.join(outputDir, 'print-layout.png'), fullPage: true });
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.screenshot({ path: path.join(outputDir, 'tablet.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(outputDir, 'mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1100 });

    mode = 'error';
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await page.getByText('Lỗi kiểm thử có chủ đích', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'In báo cáo', exact: true }).isEnabled(), false);
    mode = 'success';
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await table.waitFor();
    mode = 'empty';
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await page.getByText('Chưa có số lượng Hành chính duyệt trong thời gian này', { exact: true }).waitFor();
    assert.equal(await page.locator('.proposal-report-print').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: dashboard replacement, day/multi/range/month filters, VPP/VS, totals/export, printing, errors/retry and empty state.');
    console.log(`Screenshots: ${outputDir}`);
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
