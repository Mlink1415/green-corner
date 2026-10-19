// Kiểm thử LỜI giới thiệu/giải thích song ngữ của màn "Khám phá theo thời gian" (S4).
// Cần server (python3 serve.py -> http://localhost:8010/) và Playwright cài riêng:
//   NODE_PATH=<thư mục có node_modules/playwright> node tools/test_loi.js [http://localhost:8010/]
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8010/';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'LỖI ') + m); if (!c) fails++; };
const VN = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 400, height: 900 } });
  const page = await ctx.newPage(); const issues = [];
  page.on('console', m => { if (m.type() === 'error') issues.push(m.text()); });
  page.on('pageerror', e => issues.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });

  // 1. Dữ liệu lời: đủ, song ngữ, đúng ngôn ngữ, chừa chỗ cho giọng đọc
  const nar = await page.evaluate(() => NARRATION);
  const ids = Object.keys(nar);
  ok(ids.join() === 'A1,A2,A3,B1,B2,B3,B4,C1,C2,C3,D1,E1,E2', 'NARRATION có đủ 13 mục: ' + ids.join(' '));
  ok(ids.every(k => nar[k].vi.length > 20 && nar[k].en.length > 20 && nar[k].audio === null), 'Mỗi mục có vi + en và audio = null (chờ gắn giọng đọc)');
  ok(ids.every(k => VN.test(nar[k].vi) && !VN.test(nar[k].en)), 'Bản VI có dấu tiếng Việt, bản EN không lẫn dấu');
  ok(ids.every(k => !/Na-sa|en đê vê i|Grin Co|pi-a-nô|\bđộ xê\b/.test(nar[k].vi)), 'Phụ đề dùng chính tả thường, không có chữ phiên âm đọc');
  ok(ids.every(k => nar[k].vi.split(/[.!?]/).every(s => s.trim().split(/\s+/).length <= 25)), 'Mỗi câu VI không quá 25 từ (dễ đọc cho bé)');

  // 2. Vào màn: các thẻ xuất hiện đúng chỗ
  await page.evaluate(() => { khuVucHienTai = 'hanoi'; moManNghe('hanoi'); });
  await page.click('#nut-thoigian');
  await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 15000 });
  const dem = await page.evaluate(() => ({ gt: document.querySelectorAll('#tg-loi-gioithieu .tg-the').length, dl: document.querySelectorAll('#tg-loi-dulieu .tg-the').length,
    ln: document.querySelectorAll('#tg-loi-luuy .tg-the').length, nhom: [...document.querySelectorAll('.tg-tuychinh[id^=tg-nhom]')].map(d => d.open) }));
  ok(dem.gt === 4 && dem.dl === 4 && dem.ln === 2, 'Số thẻ (3 lời + 1 thẻ "Về nơi này"): Giới thiệu ' + dem.gt + ', Ý nghĩa dữ liệu ' + dem.dl + ', Lưu ý ' + dem.ln);
  ok(dem.nhom.every(o => o === false), 'Các nhóm thẻ mặc định THU GỌN (nghe trước, đọc sau)');
  ok((await page.textContent('#tg-goiy-nghe')).includes('Đàn sôi động thì mặt đất đang xanh hơn'), 'Gợi ý D1 hiện trên đầu biểu đồ');

  // 3. Nội dung thẻ đúng số liệu/series thật
  await page.evaluate(() => document.querySelectorAll('.tg-tuychinh[id^=tg-nhom]').forEach(d => d.open = true));
  const c1 = await page.textContent('#tg-loi-luuy [data-clip=C1]');
  ok(c1.includes('tháng 1 năm 2006') && c1.includes('tháng 6 năm 2026'), 'Thẻ khoảng thời gian lấy từ chuỗi thật: "' + c1.replace(/\s+/g, ' ').trim().slice(0, 120) + '"');
  const b = await page.$$eval('#tg-loi-dulieu .tg-the h4', els => els.map(e => e.textContent));
  ok(b.join('|') === '🌿 Phủ xanh (NDVI)|🌡️ Nhiệt độ|🌧️ Lượng mưa|🌬️ Tốc độ gió', 'Thẻ dữ liệu theo đúng thứ tự 4 biểu đồ: ' + b.join(' | '));
  const mau = await page.$$eval('#tg-loi-dulieu .tg-the', els => els.map(e => e.style.borderLeftColor));
  ok(new Set(mau).size === 4 && mau.every(Boolean), 'Mỗi thẻ dữ liệu có viền màu riêng khớp màu biểu đồ');
  ok((await page.textContent('#tg-ghichu-nam')).includes('2026') && (await page.textContent('#tg-ghichu-nam')).includes('6 tháng đầu'), 'Lời năm 2026 (C2) vẫn hiện, lấy từ NARRATION');

  // 4. Đổi ngôn ngữ: mọi thẻ đổi theo, không còn chữ Việt
  await page.click('#nut-ngonngu-tg'); await page.waitForTimeout(200);
  const en = await page.evaluate(() => ({
    the: [...document.querySelectorAll('.tg-the')].map(e => e.textContent).join(' '),
    ket: document.getElementById('tg-ket-loi').textContent, goiy: document.getElementById('tg-goiy-nghe').textContent,
    c1: document.querySelector('#tg-loi-luuy [data-clip=C1]').textContent, nam: document.getElementById('tg-ghichu-nam').textContent,
    sum: [...document.querySelectorAll('.tg-tuychinh[id^=tg-nhom] summary')].map(e => e.textContent).join('|'),
    nut: document.querySelector('.tg-ket button').textContent }));
  ok(!VN.test(en.the.replace(/[🌿🌡️🌧️🌬️]/g, '')) , 'EN: các thẻ không còn dấu tiếng Việt');
  ok(en.c1.includes('January 2006') && en.c1.includes('June 2026'), 'EN: khoảng thời gian "January 2006 ... June 2026"');
  ok(en.nam.includes('2026') && en.nam.includes('first 6 months'), 'EN: ghi chú năm 2026 đổi tiếng Anh: "' + en.nam + '"');
  ok(en.sum.includes('Introduction') && en.sum.includes('What the data means') && en.sum.includes('Good to know'), 'EN: tiêu đề nhóm: ' + en.sum);
  ok(en.goiy.includes('When the piano is lively') && en.ket.includes('Thank you for listening'), 'EN: gợi ý D1 và lời kết E1/E2');
  ok(en.nut.includes('My Green Corner'), 'EN: nút Green Corner của em -> "' + en.nut.trim() + '"');
  await page.click('#nut-ngonngu-tg'); await page.waitForTimeout(200);
  ok((await page.textContent('#tg-goiy-nghe')).includes('Đàn sôi động'), 'Quay lại VI: lời trở lại tiếng Việt');

  // 5. Mở/đóng thẻ không mất khi đổi ngôn ngữ; thẻ KHÔNG gắn data-i18n (tránh bị ghi đè)
  ok(await page.evaluate(() => [...document.querySelectorAll('.tg-tuychinh[id^=tg-nhom]')].every(d => d.open)), 'Trạng thái mở thẻ được giữ sau khi đổi ngôn ngữ');
  ok(await page.evaluate(() => document.querySelectorAll('.tg-the [data-i18n], #tg-goiy-nghe [data-i18n], #tg-ket-loi [data-i18n]').length === 0), 'Thẻ lời động không gắn data-i18n');

  // 6. Nút kết: đi tới Green Corner của em và dừng âm thanh
  await page.click('#tg-nut-phat');
  await page.waitForFunction(() => document.getElementById('tg-nut-phat').textContent.includes('Tạm dừng'), null, { timeout: 40000 });
  await page.click('.tg-ket button');
  const sau = await page.evaluate(() => ({ man: document.querySelector('.screen.active').id, bat: AT.dangBat, chay: THOI_GIAN.dangChay, do: AT.do }));
  ok(sau.man === 'man-gocxanh' && !sau.bat && !sau.chay && sau.do === null, 'Bấm "Green Corner của em": sang man-gocxanh, dừng timeline và âm thanh');

  // 7. Bố cục 400px
  await page.evaluate(() => { khuVucHienTai = 'hanoi'; moManNghe('hanoi'); });
  await page.click('#nut-thoigian'); await page.waitForSelector('#tg-noidung', { state: 'visible' });
  await page.evaluate(() => document.querySelectorAll('.tg-tuychinh[id^=tg-nhom]').forEach(d => d.open = true));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Mở hết các thẻ: không tràn ngang ở 400px');
  await page.screenshot({ path: '/tmp/gc-s4.png', fullPage: true });

  ok(issues.length === 0, 'Không có lỗi console/pageerror ' + JSON.stringify(issues));
  await browser.close();
  console.log(fails ? ('\n' + fails + ' LỖI') : '\nTẤT CẢ ĐẠT');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST HỎNG:', e); process.exit(2); });
