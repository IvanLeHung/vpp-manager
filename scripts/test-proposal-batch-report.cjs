// Local UI regression test. All API traffic is mocked; no production data is read or written.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

const departments = ['Phòng Hành chính', 'Phòng Kế toán', 'Phòng Kinh doanh', 'Ban Quản lý dự án', 'Phòng Pháp chế', 'Phòng Cung ứng', 'Trung tâm Thương mại Danko City', 'Văn phòng Bán hàng Danko Riverside'].map((name, index) => ({ id: `dept-${index}`, name }));
const manyDepartments = [...departments, ...[
  'Ban Quản lý Dự án Thanh Hóa 1', 'Ban Quản lý Dự án Thanh Hóa 2', 'Ban Cây xanh', 'Ban Đầu tư',
  'Ban Kinh tế Xây dựng', 'Ban Marketing và Truyền thông', 'Ban Thủ tục và Chăm sóc khách hàng',
  'Phòng Tài chính', 'Phòng Tổ chức', 'Phòng Đấu thầu', 'Phòng Cung ứng 1', 'Phòng Cung ứng 2',
  'Văn phòng Bán hàng Danko City', 'Văn phòng Bán hàng Danko Avenue', 'Văn phòng Bán hàng Danko Royal',
  'Ban Quản lý Dự án Danko City', 'Ban Quản lý Dự án Danko Riverside', 'Phòng Thiết kế',
  'Ban Trợ lý và Thư ký', 'Trung tâm Thương mại Danko Plaza', 'Ban Kiểm soát', 'IT',
].map((name, index) => ({ id: `extra-${index}`, name }))];
function fixture(itemType = 'VPP', reportDepartments = departments, rowCount = 6) {
  const names = itemType === 'VPP' ? ['Băng dính trong', 'Bút bi xanh', 'Giấy in A4', 'Giấy in A4', 'Kẹp giấy 19mm', 'Sổ công tác'] : ['Chổi lau sàn', 'Giấy vệ sinh cuộn công nghiệp', 'Nước lau sàn', 'Nước rửa tay', 'Túi đựng rác', 'Xô nhựa'];
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const name = rowCount > 6 ? `Mặt hàng ${String(index + 1).padStart(2, '0')} - ${names[index % names.length]}` : names[index];
    const quantities = Object.fromEntries(reportDepartments.map((dept, i) => [dept.id, (i + index) % 3 ? i + index + 1 : 0]));
    const quantity = Object.values(quantities).reduce((sum, value) => sum + value, 0);
    const unitPrice = index === 0 ? null : 2500 + index * 3000;
    return { key: `row-${index}`, itemId: `item-${index}`, name, mvpp: `${itemType}-${index}`, unit: 'Cái', unitPrice, departmentQuantities: quantities, totalQuantity: quantity, totalAmount: unitPrice === null ? null : quantity * unitPrice };
  });
  return { itemType, requestCount: 10, itemCount: rowCount > 6 ? rowCount : 5, departments: reportDepartments, rows, generatedAt: '2026-09-03T01:00:00Z', totals: {
    departmentQuantities: Object.fromEntries(reportDepartments.map(dept => [dept.id, rows.reduce((sum, row) => sum + row.departmentQuantities[dept.id], 0)])),
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
  const pdfDir = path.join(outputDir, 'tmp', 'pdfs');
  fs.mkdirSync(pdfDir, { recursive: true });
  let browser;
  try {
    await server.listen();
    const { printDepartmentLabels } = await server.ssrLoadModule('/src/components/reports/proposalPrintLayout.ts');
    const expectedLabels = printDepartmentLabels(manyDepartments);
    assert.equal(expectedLabels.length, 30);
    assert.equal(new Set(expectedLabels.map(dept => dept.label)).size, 30, 'abbreviations remain unique');
    assert.equal(expectedLabels.at(-1).label, 'IT', 'short names stay unchanged');
    const finance = expectedLabels.find(dept => dept.name === 'Phòng Tài chính').label;
    const organization = expectedLabels.find(dept => dept.name === 'Phòng Tổ chức').label;
    assert.notEqual(finance, organization, 'same initials do not create ambiguous column labels');
    assert.deepEqual(printDepartmentLabels(manyDepartments), expectedLabels, 'labels are deterministic');
    browser = await chromium.launch({ headless: true, ...(process.env.REPORT_TEST_BROWSER ? { executablePath: process.env.REPORT_TEST_BROWSER } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, timezoneId: 'Asia/Bangkok', locale: 'vi-VN' });
    await context.addInitScript(() => {
      localStorage.setItem('vpp_token', 'LOCAL_MOCK_ONLY');
      localStorage.setItem('vpp_user', JSON.stringify({ id: 'local-test', userId: 'local-test', fullName: 'Người kiểm thử', username: 'test', role: 'ADMIN', department: 'Phòng Hành chính' }));
    });
    let mode = 'success';
    let calendarMode = 'success';
    const calendarQueries = [];
    let lastQuery;
    await context.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      let data = [];
      if (url.pathname.endsWith('/reports/dashboard')) data = { operational: { pendingActions: {} }, analytical: { topConsumed: [] } };
      if (url.pathname.endsWith('/reports/proposal-calendar-counts')) {
        calendarQueries.push(Object.fromEntries(url.searchParams));
        if (calendarMode === 'error') return route.fulfill({ status: 500, json: { error: 'Lỗi số phiếu kiểm thử' } });
        const year = url.searchParams.get('year');
        const itemType = url.searchParams.get('itemType');
        data = { year: Number(year), itemType, countsByDate: {
          [`${year}-08-29`]: 2,
          [`${year}-09-03`]: itemType === 'VPP' ? 3 : 7,
          [`${year}-09-05`]: 1,
          [`${year}-09-12`]: 123,
        } };
      }
      if (url.pathname.endsWith('/reports/proposal-batch-summary')) {
        lastQuery = Object.fromEntries(url.searchParams);
        if (mode === 'error') return route.fulfill({ status: 500, json: { error: 'Lỗi kiểm thử có chủ đích' } });
        data = mode === 'wide' ? fixture(url.searchParams.get('itemType'), manyDepartments, 69) : fixture(url.searchParams.get('itemType'));
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
    const scrollRegion = page.locator('#root .proposal-report-table-scroll');
    const pinnedColumns = async () => table.evaluate(element => {
      const rect = element.parentElement.getBoundingClientRect();
      const cells = selector => [...element.querySelectorAll(selector)].map(cell => {
        const box = cell.getBoundingClientRect();
        return { x: box.x, right: box.right, y: box.y, bottom: box.bottom, position: getComputedStyle(cell).position };
      });
      return {
        viewport: { x: rect.x, right: rect.right, y: rect.y, bottom: rect.bottom },
        header: cells('thead th:nth-last-child(-n+3)'),
        body: cells('tbody tr:first-child td:nth-last-child(-n+3)'),
        footer: cells('tfoot td:nth-last-child(-n+3)'),
        department: cells('thead th:nth-child(3)')[0],
      };
    });
    const assertPinned = state => {
      for (const section of ['header', 'body', 'footer']) {
        const cells = state[section];
        assert.equal(cells.length, 3);
        assert.ok(cells[0].x >= state.viewport.x, `${section} summary fits inside the scroll area`);
        assert.ok(Math.abs(cells[2].right - state.viewport.right) <= 2, `${section} amount is pinned to right edge`);
        for (let index = 0; index < 3; index++) {
          assert.equal(cells[index].position, 'sticky');
          assert.ok(Math.abs(cells[index].x - state.header[index].x) <= 1, `${section} aligns with header`);
          if (index) assert.ok(Math.abs(cells[index - 1].right - cells[index].x) <= 1, `${section} columns do not overlap`);
        }
      }
    };
    const initialPinned = await pinnedColumns();
    assertPinned(initialPinned);
    for (const fraction of [0.5, 1]) {
      await scrollRegion.evaluate((element, value) => { element.scrollLeft = (element.scrollWidth - element.clientWidth) * value; }, fraction);
      const state = await pinnedColumns();
      assertPinned(state);
      assert.ok(state.department.x < initialPinned.department.x, 'department columns scroll');
      state.header.forEach((cell, index) => assert.ok(Math.abs(cell.x - initialPinned.header[index].x) <= 1, 'summary columns stay fixed'));
    }
    await scrollRegion.evaluate(element => { element.style.maxHeight = '220px'; element.scrollTop = 100; });
    const verticalPinned = await pinnedColumns();
    assert.ok(Math.abs(verticalPinned.footer[0].bottom - verticalPinned.viewport.bottom) <= 2, 'total row sticks to bottom');
    assert.ok(Math.abs(verticalPinned.header[0].y - verticalPinned.viewport.y) <= 2, 'summary header sticks to top');
    await page.screenshot({ path: path.join(outputDir, 'desktop-pinned-summary.png'), fullPage: true });
    await scrollRegion.evaluate(element => { element.style.maxHeight = ''; element.scrollTop = 0; element.scrollLeft = 0; });

    assert.equal(calendarQueries.length, 0, 'collapsed calendar does not fetch counts');
    await page.getByRole('button', { name: 'Theo ngày', exact: true }).click();
    const day = key => page.getByRole('button', { name: key, exact: true });
    const badge = key => day(key).locator('.proposal-calendar-count');
    await badge('03/09/2026').waitFor();
    assert.equal(await badge('03/09/2026').innerText(), '3');
    assert.equal(await badge('05/09/2026').innerText(), '1');
    assert.equal(await badge('02/09/2026').count(), 0);
    assert.equal(await badge('12/09/2026').innerText(), '99+');
    assert.match(await day('12/09/2026').getAttribute('title'), /123 phiếu VPP/);
    assert.deepEqual(calendarQueries, [{ year: '2026', itemType: 'VPP' }]);
    await page.screenshot({ path: path.join(outputDir, 'desktop-expanded.png'), fullPage: true });

    await page.getByRole('button', { name: '03/09/2026', exact: true }).click();
    await waitForReport({ dates: '2026-09-03' });
    assert.equal(lastQuery.dates, '2026-09-03');
    assert.equal(await badge('05/09/2026').innerText(), '1', 'selecting one day keeps other day markers');
    await page.getByRole('button', { name: 'Tháng trước', exact: true }).click();
    assert.equal(await badge('29/08/2026').innerText(), '2');
    await page.getByRole('button', { name: 'Tháng sau', exact: true }).click();
    assert.equal(await day('03/09/2026').getAttribute('aria-pressed'), 'true');
    assert.equal(calendarQueries.length, 1, 'same-year navigation reuses lightweight counts');
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
    assert.equal(await badge('Tháng 8').innerText(), '2');
    assert.match(await day('Tháng 9').getAttribute('title'), /127 phiếu VPP/);
    await page.getByRole('button', { name: 'Năm trước', exact: true }).click();
    await page.getByRole('button', { name: 'Tháng 8', exact: true }).locator('.proposal-calendar-count').waitFor();
    assert.equal(calendarQueries.at(-1).year, '2025');
    await page.getByRole('button', { name: 'Năm sau', exact: true }).click();
    await badge('Tháng 8').waitFor();
    assert.equal(calendarQueries.length, 2, 'returning to cached year avoids a second request');
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
    await page.getByRole('button', { name: 'Theo ngày', exact: true }).click();
    await badge('03/09/2026').waitFor();
    assert.equal(await badge('03/09/2026').innerText(), '7', 'VS uses separate counts');
    assert.equal(calendarQueries.at(-1).itemType, 'VE_SINH');
    await waitForReport({ startDate: '2026-09-05', endDate: '2026-09-12' });
    calendarMode = 'error';
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await page.getByText('Lỗi số phiếu kiểm thử', { exact: true }).waitFor();
    assert.equal(await badge('03/09/2026').count(), 0, 'failed refresh does not display stale counts');
    await table.waitFor();
    calendarMode = 'success';
    await page.getByRole('button', { name: 'Thử lại số phiếu', exact: true }).click();
    await badge('03/09/2026').waitFor();
    assert.equal(await badge('03/09/2026').innerText(), '7');
    await page.getByRole('button', { name: 'Thu gọn', exact: true }).click();

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
    assert.equal(await page.locator('.proposal-print-page').count(), 1);
    assert.equal(await page.locator('.proposal-report-print .proposal-department-column').count(), departments.length);
    assert.equal(await page.locator('.proposal-report-print').isVisible(), true);
    assert.equal(await page.locator('.proposal-report-print table').first().locator('tbody tr:first-child .proposal-amount-column').evaluate(element => getComputedStyle(element).position), 'static', 'print does not pin cells');
    await page.screenshot({ path: path.join(outputDir, 'print-layout.png'), fullPage: true });
    await page.pdf({ path: path.join(pdfDir, 'proposal-report-8-departments.pdf'), preferCSSPageSize: true, printBackground: true });
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.screenshot({ path: path.join(outputDir, 'tablet.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await scrollRegion.evaluate(element => { element.scrollLeft = element.scrollWidth; });
    assertPinned(await pinnedColumns());
    await page.screenshot({ path: path.join(outputDir, 'mobile.png'), fullPage: true });
    await scrollRegion.scrollIntoViewIfNeeded();
    await scrollRegion.screenshot({ path: path.join(outputDir, 'mobile-pinned-table.png') });
    await page.getByRole('button', { name: 'Theo ngày', exact: true }).click();
    await badge('03/09/2026').waitFor();
    await page.screenshot({ path: path.join(outputDir, 'mobile-calendar.png'), fullPage: true });
    await page.getByRole('button', { name: 'Thu gọn', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1100 });

    mode = 'wide';
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await table.waitFor();
    assert.equal(await table.locator('tbody tr').count(), 69);
    assert.deepEqual(await table.locator('.proposal-department-column').allTextContents(), manyDepartments.map(dept => dept.name), 'screen retains full names');
    assert.equal(await page.locator('#root .proposal-department-legend').count(), 0, 'legend is print-only');
    await page.emulateMedia({ media: 'print' });
    await page.setViewportSize({ width: 1062, height: 748 });
    const printed = page.locator('.proposal-report-print');
    assert.equal(await printed.locator('table').count(), 1, 'all departments share one table');
    assert.equal(await printed.locator('tbody tr').count(), 69, 'no duplicated item rows across department groups');
    assert.equal(await printed.locator('thead th').count(), 35, 'all 30 departments plus item, unit, quantity, price and amount');
    assert.deepEqual(await printed.locator('.proposal-department-column').allTextContents(), expectedLabels.map(dept => dept.label));
    assert.deepEqual(await printed.locator('.proposal-department-legend dd').allTextContents(), expectedLabels.filter(dept => dept.label !== dept.name).map(dept => dept.name));
    assert.equal((await printed.innerText()).includes('Nhóm cột phòng ban'), false);
    const overflow = await printed.locator('table').evaluate(element => [...element.querySelectorAll('th, td')].filter(cell => cell.scrollWidth > cell.clientWidth + 1).map(cell => cell.textContent));
    assert.deepEqual(overflow, [], 'no cell text spills into adjacent columns');
    assert.ok(await printed.locator('table').evaluate(element => element.getBoundingClientRect().right <= window.innerWidth + 1), 'table fits one A4-landscape page width');
    await page.pdf({ path: path.join(pdfDir, 'proposal-report-30-departments.pdf'), preferCSSPageSize: true, printBackground: true });
    await page.screenshot({ path: path.join(outputDir, 'print-30-departments.png'), fullPage: true });
    await page.emulateMedia({ media: 'screen' });
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
    console.log('PASS: all-department print layout/abbreviations/legend, pinned summary columns/footer, calendar counts/cache/type/year/retry, filters, totals/export, responsive layouts and empty state.');
    console.log(`Screenshots: ${outputDir}`);
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
