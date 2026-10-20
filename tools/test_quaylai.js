// Kiểm thử nút "⬅ Quay lại" chung (góc dưới bên trái) ở mọi màn tính năng. Cần mạng (luồng chính gọi NASA thật).
//   NODE_PATH=<...> node tools/test_quaylai.js [http://localhost:8010/]
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8010/';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'LỖI ') + m); if (!c) fails++; };

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const vp of [{ width: 400, height: 800 }, { width: 360, height: 640 }, { width: 1100, height: 800 }]) {
    const page = await (await browser.newContext({ viewport: vp })).newPage();
    const issues = [];
    page.on('pageerror', e => issues.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') issues.push('console: ' + m.text()); });
    const man = () => page.evaluate(() => document.querySelector('.screen.active').id);
    const nut = () => page.evaluate(() => { const b = document.getElementById('nut-quaylai-chung'), r = b.getBoundingClientRect(), p = document.querySelector('.phone').getBoundingClientRect();
      return { hien: getComputedStyle(b).display !== 'none', l: r.left, t: r.top, w: r.width, h: r.height, pl: p.left, vh: innerHeight, vw: innerWidth, txt: b.textContent.trim() }; });
    const bam = async (muon, ten) => { await page.click('#nut-quaylai-chung'); await page.waitForTimeout(150); const m = await man(); ok(m === muon, ten + ' -> ' + m + (m === muon ? '' : ' (mong ' + muon + ')')); };
    console.log('\n===== Khung ' + vp.width + 'x' + vp.height);
    await page.goto(URL, { waitUntil: 'load' });

    ok(!(await nut()).hien, 'Màn chào: KHÔNG có nút Quay lại');
    await page.click('[data-i18n="chao_nut_batdau"]');
    let n = await nut();
    ok(n.hien && n.txt === '⬅ Quay lại', 'Màn chọn cách: nút hiện, chữ "' + n.txt + '"');
    ok(n.w >= 44 && n.h >= 44, 'Đủ lớn để chạm: ' + Math.round(n.w) + 'x' + Math.round(n.h));
    ok(n.t + n.h <= n.vh && n.vh - (n.t + n.h) < 40, 'Nằm sát đáy màn hình (cách đáy ' + Math.round(n.vh - n.t - n.h) + ' px)');
    ok(n.l >= n.pl - 1 && n.l < n.pl + 60, 'Nằm ở góc TRÁI khung (cách mép trái khung ' + Math.round(n.l - n.pl) + ' px)');
    await bam('man-chao', 'Chọn cách -> Quay lại');
    ok(!(await nut()).hien, 'Về màn chào: nút ẩn lại');

    await page.click('[data-i18n="chao_nut_huongdan"]'); ok(await man() === 'man-huongdan' && (await nut()).hien, 'Hướng dẫn chơi: có nút');
    await bam('man-chao', 'Hướng dẫn -> Quay lại');

    await page.click('[data-i18n="chao_nut_batdau"]'); await page.click('#nut-chedo-diadiem');
    await bam('man-chedo', 'Theo địa điểm -> Quay lại');
    await page.click('#nut-chedo-thoigian'); await bam('man-chedo', 'Danh sách 6 nơi -> Quay lại');

    // màn thời gian từ danh sách: Phát, rồi Quay lại phải DỪNG âm thanh và về danh sách
    await page.click('#nut-chedo-thoigian'); await page.click('#danh-sach-thoigian .tile:nth-child(1)');
    await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 15000 });
    await page.click('#tg-nut-phat'); await page.waitForTimeout(700);
    await bam('man-tg-chon', 'Màn thời gian (từ danh sách) -> Quay lại');
    ok(await page.evaluate(() => !THOI_GIAN.dangChay && THOI_GIAN.id === null && !AT.dangBat), 'Đã dừng timeline và âm thanh');
    // từ danh sách -> thời gian -> Green Corner của em -> Quay lại
    await page.click('#danh-sach-thoigian .tile:nth-child(2)'); await page.waitForSelector('#tg-noidung', { state: 'visible' });
    await page.click('.tg-ket .btn-secondary'); ok(await man() === 'man-gocxanh', 'Mở Green Corner của em từ màn thời gian');
    await bam('man-tg-chon', 'Green Corner (đến từ thời gian/danh sách) -> Quay lại');

    // luồng chính (NASA thật)
    await page.evaluate(() => hienManHinh('man-map'));
    await page.evaluate(() => chonKhuVuc('hanoi'));
    await page.waitForFunction(() => document.querySelector('.screen.active').id === 'man-nghe', null, { timeout: 60000 });
    ok((await nut()).hien, 'Màn Lắng nghe: có nút');
    await page.click('#nut-thoigian'); await page.waitForSelector('#tg-noidung', { state: 'visible' });
    await bam('man-nghe', 'Màn thời gian (từ Lắng nghe) -> Quay lại');
    await page.click('#nut-thoigian'); await page.waitForSelector('#tg-noidung', { state: 'visible' });
    await page.click('.tg-ket .btn-secondary');
    await bam('man-nghe', 'Green Corner (đến từ thời gian/Lắng nghe) -> Quay lại');
    await page.evaluate(() => moManDoanHinh()); ok(await man() === 'man-doanhinh', 'Mở đố vui'); await bam('man-nghe', 'Đố vui -> Quay lại');
    await page.evaluate(() => moManHocHoi()); await bam('man-nghe', 'Học Hỏi -> Quay lại');
    await page.evaluate(() => moManVe()); await bam('man-nghe', 'Vẽ tranh -> Quay lại');
    await page.evaluate(() => { ['phuxanh', 'nhietdo', 'mua'].forEach(l => chonMucDo(l, 'vua')); xuLyChotDuDoan(); });
    await page.waitForTimeout(300); ok(await man() === 'man-sosanh', 'Mở So sánh NASA'); await bam('man-ve', 'So sánh -> Quay lại');
    await page.evaluate(() => hienManHinh('man-sosanh')); await page.evaluate(() => hienManHinh('man-gocxanh')); await bam('man-sosanh', 'Green Corner (đến từ So sánh) -> Quay lại');

    // Đội Tuần Tra Xanh
    await page.evaluate(() => hienManHinh('man-chao')); await page.click('[data-i18n="chao_nut_tuantra"]');
    ok(await man() === 'man-tuantra-quocgia' && (await nut()).hien, 'Tuần Tra: chọn quốc gia có nút'); await bam('man-chao', 'Tuần Tra chọn quốc gia -> Quay lại');
    await page.evaluate(() => hienManHinh('man-tuantra-quocgia')); await page.evaluate(() => chonQuocGiaTuanTra('singapore'));
    await page.waitForFunction(() => document.querySelector('.screen.active').id === 'man-tuantra-doan', null, { timeout: 90000 });
    await bam('man-tuantra-quocgia', 'Tuần Tra đoán -> Quay lại');
    await page.evaluate(() => chonQuocGiaTuanTra('singapore')); await page.waitForFunction(() => document.querySelector('.screen.active').id === 'man-tuantra-doan', null, { timeout: 90000 });
    await page.evaluate(() => { tuanTraHienTai.diemDuLieu.forEach(d => chonThuTuTuanTra(d.id || (d.kv && d.kv.id))); xuLyXemKetQuaTuanTra(); });
    await page.waitForTimeout(300); ok(await man() === 'man-tuantra-ketqua', 'Mở kết quả Tuần Tra'); await bam('man-tuantra-quocgia', 'Tuần Tra kết quả -> Quay lại');

    // không che nội dung: cuộn hết xuống, đáy màn phải nằm trên nút
    const kiemChe = {};
    for (const id of ['man-chedo', 'man-map', 'man-tg-chon', 'man-huongdan', 'man-nghe', 'man-hochoi', 'man-tuantra-quocgia']) {
      kiemChe[id] = await page.evaluate(i => { hienManHinh(i); window.scrollTo(0, document.body.scrollHeight);
        const sc = document.getElementById(i).getBoundingClientRect(), b = document.getElementById('nut-quaylai-chung').getBoundingClientRect();
        const cuoi = [...document.getElementById(i).children].filter(e => getComputedStyle(e).position !== 'absolute').pop().getBoundingClientRect();
        return { cuoiBottom: Math.round(cuoi.bottom), nutTop: Math.round(b.top) }; }, id);
    }
    ok(Object.values(kiemChe).every(v => v.cuoiBottom <= v.nutTop + 1), 'Cuộn hết xuống: nút không che phần tử cuối ở các màn dài ' + JSON.stringify(kiemChe));

    // tiếng Anh
    await page.evaluate(() => { hienManHinh('man-chao'); doiNgonNgu(); }); await page.click('[data-i18n="chao_nut_batdau"]');
    ok((await nut()).txt === '⬅ Back', 'Tiếng Anh: nút là "⬅ Back"');
    ok(issues.length === 0, 'Không lỗi console/pageerror ' + JSON.stringify(issues));
    await page.context().close();
  }
  console.log('\n' + (fails ? fails + ' LỖI' : 'TẤT CẢ ĐẠT'));
  await browser.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST HỎNG:', e); process.exit(2); });
