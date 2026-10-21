// Kiểm thử luồng chọn cách khám phá: Chào -> [Khám phá theo thời gian | Khám phá theo địa điểm].
//   NODE_PATH=<thư mục có node_modules/playwright> node tools/test_chedo.js [http://localhost:8010/]
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8010/';
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'LỖI ') + msg); if (!cond) fails++; };

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 400, height: 900 } })).newPage();
  const issues = [];
  page.on('console', m => { if (m.type() === 'error') issues.push('console: ' + m.text()); });
  page.on('pageerror', e => issues.push('pageerror: ' + e.message));
  const man = () => page.evaluate(() => document.querySelector('.screen.active').id);
  const chu = sel => page.evaluate(s => document.querySelector(s).textContent.trim(), sel);
  await page.goto(URL, { waitUntil: 'load' });

  console.log('\n## 1. Màn chọn cách khám phá');
  await page.click('[data-i18n="chao_nut_batdau"]');
  ok(await man() === 'man-chedo', 'Bấm "Bắt đầu khám phá" -> man-chedo');
  ok((await chu('#nut-chedo-thoigian')).includes('Khám phá theo thời gian'), 'Thẻ 1 là "Khám phá theo thời gian"');
  ok((await chu('#nut-chedo-thoigian')).includes('MỚI'), 'Thẻ 1 có nhãn MỚI');
  ok((await chu('#nut-chedo-diadiem')).includes('Khám phá theo địa điểm'), 'Thẻ 2 là "Khám phá theo địa điểm"');
  const thu = await page.evaluate(() => [...document.querySelectorAll('#nut-chedo-thoigian,#nut-chedo-diadiem')].map(e => e.getBoundingClientRect().height));
  ok(thu.every(h => h >= 80), 'Hai thẻ đủ lớn để chạm (' + thu.map(Math.round) + ' px)');
  const tran = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok(!tran, 'Không tràn ngang');

  console.log('\n## 2. Khám phá theo địa điểm = màn cũ');
  await page.click('#nut-chedo-diadiem');
  ok(await man() === 'man-map', 'Vào man-map');
  ok(await page.evaluate(() => document.querySelectorAll('#danh-sach-khu-vuc .tile').length) === 25, 'Vẫn đủ 25 địa điểm');
  await page.evaluate(() => hienManHinh('man-chedo'));

  console.log('\n## 3. Khám phá theo thời gian: 8 nơi');
  await page.click('#nut-chedo-thoigian');
  ok(await man() === 'man-tg-chon', 'Vào man-tg-chon');
  const ten = await page.evaluate(() => [...document.querySelectorAll('#danh-sach-thoigian .label')].map(e => e.textContent));
  ok(JSON.stringify(ten) === JSON.stringify(['Diên An / An Tái, Trung Quốc', 'Rondônia, Amazon, Brazil', 'Yakutsk, Siberia, Nga', 'Djibouti, Đông Phi', 'Hà Nội', 'Cần Thơ', 'Phoenix, Mỹ', 'New York, Mỹ']), '8 nơi đúng thứ tự (4 nơi kể chuyện lên đầu): ' + ten.join(' | '));
  await page.click('#danh-sach-thoigian .tile:nth-child(6)');
  await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 10000 });
  ok(await man() === 'man-thoigian' && (await chu('#tg-ten')) === 'Cần Thơ', 'Chạm Cần Thơ -> mở thẳng màn thời gian (Cần Thơ)');
  ok((await chu('#tg-nut-quaylai')).includes('Chọn nơi khác'), 'Nút dưới cùng: "Chọn nơi khác"');
  await page.click('#tg-nut-phat'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => THOI_GIAN.dangChay), 'Phát chạy được khi vào từ danh sách');
  await page.click('#tg-nut-quaylai');
  ok(await man() === 'man-tg-chon', 'Bấm Chọn nơi khác -> về danh sách');
  ok(await page.evaluate(() => !THOI_GIAN.dangChay && THOI_GIAN.id === null && !AT.dangBat), 'Đã dừng timeline và âm thanh khi thoát');
  await page.click('#danh-sach-thoigian .tile:nth-child(1)');
  await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 10000 });
  await page.click('.home-btn[onclick="quayLaiThoiGian()"]');
  ok(await man() === 'man-tg-chon', 'Nút 🏠 ở màn thời gian -> về danh sách');

  console.log('\n## 4. Đổi ngôn ngữ trong màn thời gian rồi quay lại');
  await page.click('#danh-sach-thoigian .tile:nth-child(5)');
  await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 10000 });
  await page.click('#nut-ngonngu-tg');
  ok((await chu('#tg-nut-quaylai')).includes('Choose another place'), 'EN: nút dưới cùng đổi sang tiếng Anh');
  await page.click('#tg-nut-quaylai');
  const tenEn = await page.evaluate(() => [...document.querySelectorAll('#danh-sach-thoigian .label')].map(e => e.textContent));
  ok(tenEn[0] === "Yan'an / Ansai, China" && tenEn[2] === 'Yakutsk, Siberia, Russia' && tenEn[3] === 'Djibouti, East Africa' && tenEn[4] === 'Hanoi' && tenEn[7] === 'New York, USA', 'EN: danh sách nơi vẽ lại bằng tiếng Anh: ' + tenEn.join(' | '));
  ok((await chu('[data-i18n="tgchon_goiy"]')).startsWith('Pick one of 8'), 'EN: câu gợi ý đổi sang tiếng Anh');
  await page.click('[data-i18n="tgchon_quaylai"]');
  ok(await man() === 'man-chedo' && (await chu('#nut-chedo-diadiem')).includes('Explore by place'), 'EN: về màn chọn cách, thẻ tiếng Anh');
  await page.evaluate(() => doiNgonNgu());

  console.log('\n## 5. Đường cũ (Lắng nghe -> nút thời gian) vẫn như trước');
  await page.evaluate(() => { khuVucHienTai = 'hanoi'; moManNghe('hanoi'); });
  await page.click('#nut-thoigian');
  await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 10000 });
  ok((await chu('#tg-nut-quaylai')).includes('Quay lại Lắng nghe'), 'Nút dưới cùng vẫn là "Quay lại Lắng nghe"');
  await page.click('#tg-nut-quaylai');
  ok(await man() === 'man-nghe', 'Quay lại đúng màn Lắng nghe');

  console.log('\n## 6. Mở từ danh sách rồi vào Green Corner của em');
  await page.evaluate(() => moDanhSachThoiGian());
  await page.click('#danh-sach-thoigian .tile:nth-child(6)');
  await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 10000 });
  await page.click('.tg-ket .btn-secondary');
  ok(await man() === 'man-gocxanh', 'Green Corner của em mở được');

  ok(issues.length === 0, 'Không lỗi console/pageerror ' + JSON.stringify(issues));
  console.log('\n' + (fails ? fails + ' LỖI' : 'TẤT CẢ ĐẠT'));
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
