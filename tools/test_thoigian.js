// Kiểm thử màn "Khám phá theo thời gian" (S2: chưa có âm thanh).
// Cần: server đang chạy (python3 serve.py -> http://localhost:8010/) và Playwright cài riêng:
//   NODE_PATH=<thư mục có node_modules/playwright> node tools/test_thoigian.js [http://localhost:8010/]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const URL = process.argv[2] || 'http://localhost:8010/';
const SERIES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'series', 'hanoi.json'), 'utf8'));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'LỖI ') + msg); if (!cond) fails++; };
const vi1 = (x, d) => x.toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 400, height: 900 } });
  const page = await ctx.newPage();
  const issues = [];
  page.on('console', m => { if (m.type() === 'error') issues.push('console: ' + m.text()); });
  page.on('pageerror', e => issues.push('pageerror: ' + e.message));
  const vao = async () => {
    await page.evaluate(() => { khuVucHienTai = 'hanoi'; moManNghe('hanoi'); });
    await page.click('#nut-thoigian');
    await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 10000 });
  };

  await page.goto(URL, { waitUntil: 'load' });

  // 1. Nút chỉ hiện ở nơi có chuỗi
  await page.evaluate(() => { moManNghe('sahara'); });
  ok(await page.evaluate(() => document.getElementById('nut-thoigian').style.display === 'none'), 'Sahara (chưa có chuỗi): nút bị ẩn');
  await page.evaluate(() => { moManNghe('hanoi'); });
  ok(await page.evaluate(() => document.getElementById('nut-thoigian').style.display !== 'none'), 'Hà Nội: nút hiện');

  // 2. Vào màn, nội dung khớp file dữ liệu
  await vao();
  ok(await page.textContent('#tg-ten') === 'Hà Nội', 'Tên nơi hiện đúng');
  ok((await page.textContent('#tg-thang')) === 'Tháng 1' && (await page.textContent('#tg-nam')) === '2006', 'Mở đầu: Tháng 1 / 2006');
  ok(await page.locator('.tg-hang').count() === 4, '4 hàng biểu đồ');
  const gt = await page.$$eval('.tg-gt', els => els.map(e => e.textContent));
  ok(gt[0] === vi1(SERIES.N[0], 2) && gt[1] === vi1(SERIES.T[0], 1) + ' °C' && gt[2] === vi1(SERIES.P[0], 1) + ' mm/ngày' && gt[3] === vi1(SERIES.W[0], 1) + ' m/s',
     'Giá trị tháng đầu khớp dữ liệu: ' + gt.join(' | '));
  const noteNoiSuy = await page.textContent('#tg-ghichu-noisuy');
  ok(SERIES.nInterp.length === 0 || noteNoiSuy.includes(SERIES.nInterp.length + '/' + SERIES.n), 'Ghi chú nội suy có "' + SERIES.nInterp.length + '/' + SERIES.n + '"');
  ok((await page.textContent('#tg-ghichu-nam')).includes('2026'), 'Ghi chú năm 2026 chưa đủ tháng');

  // 3. Kéo thanh thời gian
  await page.evaluate(() => { const t = document.getElementById('tg-thanh'); t.value = 150; t.dispatchEvent(new Event('input', { bubbles: true })); });
  ok((await page.textContent('#tg-thang')) === 'Tháng 7' && (await page.textContent('#tg-nam')) === '2018', 'Chỉ số 150 = Tháng 7 / 2018');
  const gt150 = await page.$$eval('.tg-gt', els => els.map(e => e.textContent));
  ok(gt150[2] === vi1(SERIES.P[150], 1) + ' mm/ngày', 'Mưa tháng 7/2018 khớp dữ liệu: ' + gt150[2]);

  // 4. Chạm vào biểu đồ chuyển thời điểm
  const box = await page.locator('.tg-bieudo').first().boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
  const vtGiua = await page.evaluate(() => THOI_GIAN.vt);
  ok(Math.abs(vtGiua - (SERIES.n - 1) / 2) < 2, 'Chạm giữa biểu đồ -> vị trí ~' + ((SERIES.n - 1) / 2) + ' (được ' + vtGiua.toFixed(1) + ')');

  // 5. Đổi ngôn ngữ ngay trên màn
  await page.click('#nut-ngonngu-tg');
  ok((await page.textContent('h2[data-i18n="tg_tieude"]')).includes('Explore Through Time'), 'EN: tiêu đề đổi');
  ok((await page.textContent('#tg-ten')) === 'Hanoi', 'EN: tên nơi đổi thành Hanoi');
  ok(/^[A-Z][a-z]{2}$/.test(await page.textContent('#tg-thang')), 'EN: tháng hiện tên viết tắt (' + await page.textContent('#tg-thang') + ')');
  ok((await page.$$eval('.tg-gt', e => e[2].textContent)).endsWith('mm/day'), 'EN: đơn vị mưa mm/day');
  ok((await page.textContent('#tg-nut-phat')).includes('Play'), 'EN: nút Play');
  await page.click('#nut-ngonngu-tg');
  ok((await page.textContent('#tg-nut-phat')).includes('Phát'), 'Quay lại VI: nút Phát');

  // 6. Phát / tạm dừng
  await page.evaluate(() => { document.getElementById('tg-tocdo').closest('details').open = true; });                       // mở mục Tuỳ chỉnh như người chơi
  await page.selectOption('#tg-tocdo', '0.25');
  await page.evaluate(() => datViTriTG(0));
  await page.click('#tg-nut-phat');
  await page.waitForFunction(() => document.getElementById('tg-nut-phat').textContent.includes('Tạm dừng'), null, { timeout: 30000 });  // chờ bước chuẩn bị âm thanh
  const vt0 = await page.evaluate(() => THOI_GIAN.vt);
  await page.waitForTimeout(1600);
  const vtChay = (await page.evaluate(() => THOI_GIAN.vt)) - vt0;
  ok(vtChay > 3 && vtChay < 12, 'Đang phát: vị trí tăng ~1,6s/0,25s = ~6 tháng (được ' + vtChay.toFixed(1) + ')');
  ok((await page.textContent('#tg-nut-phat')).includes('Tạm dừng'), 'Nút đổi thành Tạm dừng');
  await page.click('#tg-nut-phat'); const vtDung = await page.evaluate(() => THOI_GIAN.vt);
  await page.waitForTimeout(500);
  ok(Math.abs((await page.evaluate(() => THOI_GIAN.vt)) - vtDung) < 0.001, 'Tạm dừng: vị trí đứng yên');

  // 7. Thoát khi đang phát phải dừng hẳn
  await page.click('#tg-nut-phat');
  await page.click('#man-thoigian .home-btn:first-of-type');
  const tt = await page.evaluate(() => ({ chay: THOI_GIAN.dangChay, raf: THOI_GIAN.raf, id: THOI_GIAN.id, man: document.querySelector('.screen.active').id }));
  ok(tt.chay === false && tt.raf === null && tt.id === null && tt.man === 'man-nghe', 'Thoát khi đang phát: dừng, hủy vòng lặp, về man-nghe');

  // 8. Phát đến cuối tự dừng
  await vao(); await page.evaluate(() => { document.getElementById('tg-tocdo').closest('details').open = true; }); await page.selectOption('#tg-tocdo', '0.25');
  await page.evaluate(() => { datViTriTG(THOI_GIAN.chuoi.n - 3); });
  await page.click('#tg-nut-phat');
  await page.waitForFunction(() => !THOI_GIAN.dangChay && !THOI_GIAN.dangChuanBi && THOI_GIAN.vt === THOI_GIAN.chuoi.n - 1, null, { timeout: 30000 });
  ok(true, 'Chạy tới cuối thì tự dừng ở tháng cuối');
  ok((await page.textContent('#tg-thang')) === 'Tháng 6' && (await page.textContent('#tg-nam')) === '2026', 'Tháng cuối: Tháng 6 / 2026');

  // 9. Không tràn ngang ở 400px; chụp ảnh để xem
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Không tràn ngang ở 400px');
  await page.evaluate(() => datViTriTG(150)); await page.screenshot({ path: '/tmp/gc-tg-400.png', fullPage: true });

  // 10. Lỗi tải -> thông báo + Thử lại
  const p2 = await ctx.newPage(); const err2 = [];
  p2.on('pageerror', e => err2.push(e.message));
  await p2.route('**/data/series/hanoi.json', r => r.abort());
  await p2.goto(URL, { waitUntil: 'load' });
  await p2.evaluate(() => { khuVucHienTai = 'hanoi'; moManNghe('hanoi'); });
  await p2.click('#nut-thoigian');
  await p2.waitForSelector('#tg-loi', { state: 'visible', timeout: 10000 });
  ok(true, 'Lỗi tải: hiện thông báo lỗi + nút Thử lại');
  await p2.unroute('**/data/series/hanoi.json');
  await p2.click('#tg-loi button');
  await p2.waitForSelector('#tg-noidung', { state: 'visible', timeout: 10000 });
  ok(true, 'Bấm Thử lại: nạp được và hiện nội dung');
  ok(err2.length === 0, 'Trang lỗi-tải không có pageerror ' + JSON.stringify(err2));
  await p2.close();

  // 11. Luồng cũ vẫn chạy
  const cu = await page.evaluate(() => {
    // số liệu giả cố định để kiểm thử không phụ thuộc mạng (app thật nạp từ NASA trước khi vào các màn này)
    duLieuDaTai['hanoi'] = { ndvi: 0.33, ndviNgay: '2026-06-10', ndviDangTinCay: true, ndviTruoc: 0.34, tempC: 23.2, rainMmNgay: 6.1,
      nam: 2025, tempCNamTruoc: 24.1, rainMmNgayNamTruoc: 5.5, thoiTietGanNhat: null };
    khuVucHienTai = 'hanoi';
    document.getElementById('nut-toi-ve').disabled = false;
    moManVe(); const a = document.querySelector('.screen.active').id;
    xuLyChotDuDoan(); const b = document.querySelector('.screen.active').id;
    hienManHinh('man-nghe'); moManDoanHinh(); const c = document.querySelector('.screen.active').id;
    return [a, b, c];
  });
  ok(cu.join() === 'man-ve,man-sosanh,man-doanhinh', 'Luồng cũ (Vẽ -> So sánh -> Đố vui) vẫn chạy: ' + cu.join(' > '));

  const loiThat = issues.filter(s => !/Failed to load resource|net::ERR/.test(s));
  ok(loiThat.length === 0, 'Không có lỗi console/pageerror ' + JSON.stringify(loiThat));
  await browser.close();
  console.log(fails ? ('\n' + fails + ' LỖI') : '\nTẤT CẢ ĐẠT');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST HỎNG:', e); process.exit(2); });
