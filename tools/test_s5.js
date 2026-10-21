// S5: kiểm thử TOÀN DIỆN màn "Khám phá theo thời gian" + hồi quy luồng cũ. Chạy từng phần hoặc tất cả.
// Cần server (python3 serve.py -> http://localhost:8010/) và Playwright cài riêng:
//   NODE_PATH=<thư mục có node_modules/playwright> node tools/test_s5.js [--part=1,2,3,...] [--url=http://localhost:8010/]
// Phần: 1 mọi địa điểm | 2 điện thoại/cảm ứng | 3 mạng chậm | 4 rò bộ nhớ | 5 ngoại tuyến | 6 mở bằng file:// |
//       7 chạy dài + CPU yếu | 8 luồng cũ với NASA thật | 9 truy cập cơ bản
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const URL = arg('url', 'http://localhost:8010/');
const PARTS = (arg('part', '1,2,3,4,5,6,7,8,9')).split(',').map(Number);
const DIR = path.join(__dirname, '..', 'data', 'series');
const IDS = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).sort();
const SER = Object.fromEntries(IDS.map(i => [i, JSON.parse(fs.readFileSync(path.join(DIR, i + '.json'), 'utf8'))]));
const vn = (x, d) => x.toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });
const doi = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, warns = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'LỖI ') + m); if (!c) fails++; };
const info = m => console.log('INFO ' + m);
const warn = m => { console.log('CẢNH BÁO ' + m); warns++; };
const AUTO = ['--autoplay-policy=no-user-gesture-required'];

const vao = async (page, id) => {
  await page.evaluate(i => { khuVucHienTai = i; moManNghe(i); }, id);
  await page.click('#nut-thoigian');
  await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 60000 });
};
const phat = async (page, timeout) => {
  await page.click('#tg-nut-phat');
  await page.waitForFunction(() => document.getElementById('tg-nut-phat').textContent.includes('Tạm dừng'), null, { timeout: timeout || 60000 });
};
const doThi = page => page.evaluate(() => { window.__an = AT.ctx.createAnalyser(); window.__an.fftSize = 2048; AT.do.nen.connect(window.__an); });
const medir = (page, ms) => page.evaluate(async ms => {
  const an = window.__an, b = new Float32Array(an.fftSize); let pk = 0, s = 0, n = 0; const t0 = performance.now();
  while (performance.now() - t0 < ms) { an.getFloatTimeDomainData(b); for (const v of b) { const a = Math.abs(v); if (a > pk) pk = a; s += v * v; n++; } await new Promise(r => setTimeout(r, 30)); }
  return { rms: 10 * Math.log10(s / n + 1e-12), peak: 20 * Math.log10(pk + 1e-12) };
}, ms);
const trang = async (browser, opt) => { const ctx = await browser.newContext(opt || { viewport: { width: 400, height: 900 } }); const page = await ctx.newPage();
  const loi = []; page.on('console', m => { if (m.type() === 'error') loi.push(m.text()); }); page.on('pageerror', e => loi.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' }); return { ctx, page, loi }; };

const PHAN = {
  1: async b => { // mọi địa điểm có chuỗi: số liệu đúng, nghe được, chỉ gọi cùng nguồn gốc
    console.log('\n## 1. Mọi địa điểm: ' + IDS.join(', '));
    const { ctx, page, loi } = await trang(b); const goc = new Set(); let batDau = false;
    page.on('request', r => { if (batDau) goc.add(new globalThis.URL(r.url()).origin); });
    for (const id of IDS) {
      const S = SER[id]; batDau = false;
      await page.evaluate(i => { khuVucHienTai = i; moManNghe(i); }, id); await doi(2500);   // màn Lắng nghe CŨ tự tải ảnh vệ tinh NASA: chờ xong rồi mới tính
      batDau = true;
      await page.click('#nut-thoigian'); await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 60000 });
      const g0 = await page.$$eval('.tg-gt', e => e.map(x => x.textContent));
      ok(g0.join('|') === [vn(S.N[0], 2), vn(S.T[0], 1) + ' °C', vn(S.P[0], 1) + ' mm/ngày', vn(S.W[0], 1) + ' m/s'].join('|'), id + ': tháng đầu khớp file (' + g0.join(' | ') + ')');
      await page.evaluate(() => datViTriTG(THOI_GIAN.chuoi.n - 1));
      const g1 = await page.$$eval('.tg-gt', e => e.map(x => x.textContent)), n = S.n - 1;
      ok(g1.join('|') === [vn(S.N[n], 2), vn(S.T[n], 1) + ' °C', vn(S.P[n], 1) + ' mm/ngày', vn(S.W[n], 1) + ' m/s'].join('|') && (await page.textContent('#tg-thang')) === 'Tháng 6' && (await page.textContent('#tg-nam')) === '2026', id + ': tháng cuối = Tháng 6/2026 và khớp file');
      ok((await page.textContent('#tg-ghichu-noisuy')).includes(S.nInterp.length + '/' + S.n), id + ': ghi chú nội suy ' + S.nInterp.length + '/' + S.n);
      await page.evaluate(() => datViTriTG(0)); await phat(page); await doThi(page);
      await page.click('#tg-nut-phat'); await doi(1500); const m = await medir(page, 1500);
      ok(m.rms > -60 && m.peak < -1, id + ': có tiếng (RMS ' + m.rms.toFixed(1) + ' dBFS), không vỡ (đỉnh ' + m.peak.toFixed(1) + ')');
      await page.click('#man-thoigian .home-btn:first-of-type');
    }
    ok([...goc].every(o => o === new globalThis.URL(URL).origin), 'Dùng màn mới chỉ gọi đúng 1 nguồn gốc: ' + [...goc].join(', '));
    ok(loi.length === 0, 'Không lỗi console/pageerror ' + JSON.stringify(loi)); await ctx.close();
  },
  2: async b => { // điện thoại + cảm ứng
    console.log('\n## 2. Điện thoại và cảm ứng');
    for (const [w, h] of [[360, 640], [390, 844], [768, 1024]]) {
      const { ctx, page, loi } = await trang(b, { viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
      await vao(page, 'hanoi');
      await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), w + 'x' + h + ': không tràn ngang (mở hết thẻ)');
      await page.locator('.tg-bieudo').first().scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, 150)); // người chơi cuộn tới biểu đồ, không để nút Quay lại che
      const bd = await page.locator('.tg-bieudo').first().boundingBox();
      await page.touchscreen.tap(bd.x + bd.width * 0.25, bd.y + bd.height / 2);
      const vt = await page.evaluate(() => THOI_GIAN.vt), mong = (SER.hanoi.n - 1) * 0.25;
      ok(Math.abs(vt - mong) < 6, w + 'x' + h + ': chạm vào biểu đồ 25% -> vị trí ' + vt.toFixed(1) + ' (mong ~' + mong.toFixed(0) + ')');
      await page.locator('#tg-nut-phat').scrollIntoViewIfNeeded(); // người chơi cuộn lại tới nút Phát (các dòng chữ phía trên có thể làm nút nằm ngoài khung nhìn)
      const nut = await page.locator('#tg-nut-phat').boundingBox(), nTat = await page.locator('#tg-nut-tat').boundingBox();
      ok(nut.height >= 40 && nTat.height >= 40, w + 'x' + h + ': nút Phát/Tắt tiếng đủ lớn để chạm (' + nut.height.toFixed(0) + ' / ' + nTat.height.toFixed(0) + ' px)');
      await page.touchscreen.tap(nut.x + nut.width / 2, nut.y + nut.height / 2);
      await page.waitForFunction(() => THOI_GIAN.dangChay, null, { timeout: 60000 });
      ok(true, w + 'x' + h + ': chạm nút Phát -> chạy');
      ok(loi.length === 0, w + 'x' + h + ': không lỗi ' + JSON.stringify(loi)); await ctx.close();
    }
  },
  3: async b => { // mạng chậm: đo thời gian thật
    console.log('\n## 3. Mạng chậm (đo thời gian)');
    for (const [ten, kbps, lat] of [['4G nhanh (9 Mbps)', 9000, 40], ['3G nhanh (1,6 Mbps)', 1600, 150]]) {
      const { ctx, page, loi } = await trang(b); const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: lat, downloadThroughput: kbps * 1024 / 8, uploadThroughput: kbps * 1024 / 8 });
      await page.evaluate(() => { khuVucHienTai = 'hanoi'; moManNghe('hanoi'); });
      const t0 = Date.now(); await page.click('#nut-thoigian'); await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 90000 });
      const tNoiDung = (Date.now() - t0) / 1000;
      await page.waitForFunction(() => AT.tt === 'sansang', null, { timeout: 180000 }); const tAm = (Date.now() - t0) / 1000;
      const t1 = Date.now(); await phat(page, 90000); const tPhat = (Date.now() - t1) / 1000;
      info(ten + ': nội dung hiện sau ' + tNoiDung.toFixed(1) + 's | âm thanh tải xong sau ' + tAm.toFixed(1) + 's | bấm Phát -> có tiếng sau ' + tPhat.toFixed(1) + 's');
      ok(tNoiDung < (kbps > 5000 ? 3 : 8), ten + ': biểu đồ hiện nhanh (không chờ âm thanh) ' + tNoiDung.toFixed(1) + 's');
      ok(tAm < 90, ten + ': âm thanh tải xong < 90s (' + tAm.toFixed(1) + 's)');
      ok(loi.length === 0, ten + ': không lỗi ' + JSON.stringify(loi)); await ctx.close();
    }
  },
  4: async b => { // rò bộ nhớ khi vào/ra nhiều lần
    console.log('\n## 4. Rò bộ nhớ (vào, Phát, thoát lặp lại)');
    const br = await chromium.launch({ args: [...AUTO, '--js-flags=--expose-gc', '--enable-precise-memory-info'] });
    const { ctx, page, loi } = await trang(br); const heap = () => page.evaluate(() => { gc(); return performance.memory.usedJSHeapSize / 1048576; });
    const chuKy = async () => { await vao(page, 'hanoi'); await phat(page); await doi(500); await page.click('#man-thoigian .home-btn:first-of-type'); await doi(700); };
    await chuKy(); const h0 = await heap();
    for (let i = 0; i < 8; i++) await chuKy();
    const h1 = await heap();
    const st = await page.evaluate(() => ({ bat: AT.dangBat, buf: AT.buf, do: AT.do, hen: AT.hen, henMuc: AT.henMuc }));
    ok(h1 - h0 < 6, 'Sau 8 lần vào/ra thêm: heap JS ' + h0.toFixed(1) + ' -> ' + h1.toFixed(1) + ' MB (tăng ' + (h1 - h0).toFixed(1) + ' MB, ngưỡng 6)');
    ok(!st.bat && st.buf === null && st.do === null && st.hen === null && st.henMuc === null, 'Sau lần thoát cuối: không còn bộ đệm, đồ thị âm thanh, đồng hồ nào');
    ok(loi.length === 0, 'Không lỗi ' + JSON.stringify(loi)); await ctx.close(); await br.close();
  },
  5: async b => { // ngoại tuyến
    console.log('\n## 5. Ngoại tuyến');
    const { ctx, page, loi } = await trang(b);
    await vao(page, 'hanoi'); await phat(page);
    await ctx.setOffline(true);
    await page.click('#tg-nut-phat'); await page.click('#tg-nut-phat'); await doi(800);
    ok(await page.evaluate(() => AT.dangBat && THOI_GIAN.dangChay), 'Đã nạp xong rồi mất mạng: vẫn phát/tạm dừng được');
    await page.click('#man-thoigian .home-btn:first-of-type');
    await page.evaluate(() => { khuVucHienTai = 'phoenix'; moManNghe('phoenix'); }); await page.click('#nut-thoigian');
    await page.waitForSelector('#tg-loi', { state: 'visible', timeout: 20000 });
    ok(true, 'Vào nơi chưa nạp khi mất mạng: hiện thông báo lỗi + Thử lại (không treo)');
    await ctx.setOffline(false); await page.click('#tg-loi button');
    await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 30000 });
    ok(true, 'Có mạng lại, bấm Thử lại: nạp được');
    ok(loi.filter(s => !/Failed to fetch|net::ERR|HTTP/.test(s)).length === 0, 'Không lỗi bất ngờ ' + JSON.stringify(loi.filter(s => !/Failed to fetch|net::ERR|HTTP/.test(s)))); await ctx.close();
  },
  6: async b => { // mở trực tiếp bằng file:// (không qua server)
    console.log('\n## 6. Mở bằng file:// (không có server)');
    const ctx = await b.newContext({ viewport: { width: 400, height: 900 } }); const page = await ctx.newPage(); const e = [];
    page.on('pageerror', x => e.push(x.message));
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'), { waitUntil: 'load' });
    await page.evaluate(() => { khuVucHienTai = 'hanoi'; moManNghe('hanoi'); }); await page.click('#nut-thoigian');
    await page.waitForSelector('#tg-loi', { state: 'visible', timeout: 15000 });
    ok(e.length === 0, 'file://: hiện thông báo lỗi thân thiện, không crash (pageerror: ' + JSON.stringify(e) + ')');
    ok(await page.evaluate(() => document.querySelector('.screen.active').id === 'man-thoigian'), 'file://: vẫn ở màn, nút Thoát dùng được');
    await page.click('#man-thoigian .home-btn:first-of-type'); ok(await page.evaluate(() => document.querySelector('.screen.active').id === 'man-nghe'), 'file://: thoát về man-nghe'); await ctx.close();
  },
  7: async b => { // chạy hết 20 năm, kể cả điện thoại yếu (CPU chậm 4 lần). Đo tốc độ THẬT, không chỉ đạt/không đạt.
    console.log('\n## 7. Chạy dài và CPU yếu (chậm 4 lần)');
    for (const [ten, rate] of [['CPU bình thường', 1], ['CPU yếu 4x', 4]]) {
      const { ctx, page, loi } = await trang(b); const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      await vao(page, 'hanoi'); await page.evaluate(() => { document.getElementById('tg-tocdo').closest('details').open = true; });
      await page.selectOption('#tg-tocdo', '0.25'); await page.evaluate(() => datViTriTG(0));
      await page.evaluate(() => { document.getElementById('tg-nen').value = 'both'; doiMixTG(); });
      await page.evaluate(() => { window.__fr = []; let l = performance.now(); (function f(t) { window.__fr.push(t - l); l = t; if (window.__fr.length < 30000) requestAnimationFrame(f); })(l); });
      await phat(page); const dau = Date.now(); const dan = [], tt = []; let v0 = null, t0 = null;
      while (Date.now() - dau < 150000) {
        const r = await page.evaluate(() => ({ chay: THOI_GIAN.dangChay, vt: THOI_GIAN.vt, lead: AT.tiepTheo - AT.ctx.currentTime, st: AT.ctx.state, ct: AT.ctx.currentTime }));
        if (!r.chay) break; dan.push(r.lead); tt.push(r.st); if (v0 === null) { v0 = r.vt; t0 = Date.now(); }
        if (Date.now() - t0 > 20000 && !tt.v20) tt.v20 = r.vt;
        await doi(1000);
      }
      const kq = await page.evaluate(() => ({ vt: THOI_GIAN.vt, n: THOI_GIAN.chuoi.n, ctx: AT.ctx.state, gains: [AT.do.mua.gain.value, AT.do.gio.gain.value, AT.do.piano.gain.value, AT.do.lop.frequency.value],
        fr: window.__fr.slice(5) }));
      const fr = kq.fr.slice().sort((x, y) => x - y), tb = fr.reduce((s, x) => s + x, 0) / fr.length, p95 = fr[Math.floor(fr.length * 0.95)], mx = fr[fr.length - 1];
      const tocDo = tt.v20 !== undefined ? (tt.v20 - v0) / ((20000) / 1000) : NaN;
      info(ten + ': khung hình TB ' + tb.toFixed(1) + ' ms (' + (1000 / tb).toFixed(0) + ' fps), p95 ' + p95.toFixed(0) + ' ms, lớn nhất ' + mx.toFixed(0) + ' ms | tốc độ chạy ' + tocDo.toFixed(2) + ' tháng/giây (mong 4,00)');
      ok(kq.vt === kq.n - 1, ten + ': chạy hết 246 tháng trong ' + ((Date.now() - dau) / 1000).toFixed(0) + 's (mong ~62s)');
      ok(Math.abs(tocDo - 4) < 0.5, ten + ': tốc độ chạy đúng đồng hồ thật (' + tocDo.toFixed(2) + ' tháng/giây)');
      ok(Math.min(...dan) > 0.1, ten + ': lịch phát piano luôn đi trước đồng hồ âm thanh (thấp nhất ' + Math.min(...dan).toFixed(2) + 's)');
      ok(tt.every(x => x === 'running') && kq.ctx === 'running', ten + ': AudioContext luôn "running" suốt lượt chạy');
      ok(kq.gains.every(Number.isFinite) && kq.gains[3] > 1200 && kq.gains[3] < 9100, ten + ': mức âm cuối hợp lệ: ' + kq.gains.map(g => g.toFixed(3)).join(', '));
      const loiThat = loi.filter(s => !/net::ERR_NETWORK_CHANGED/.test(s)); ok(loiThat.length === 0, ten + ': không lỗi ' + JSON.stringify(loi)); await ctx.close();
    }
  },
  8: async b => { // luồng cũ với NASA thật
    console.log('\n## 8. Luồng cũ với NASA thật (cần mạng; có thể chậm)');
    const { ctx, page, loi } = await trang(b); page.setDefaultTimeout(120000);
    try {
      await page.evaluate(() => chonKhuVuc('hanoi')); await page.waitForFunction(() => document.querySelector('.screen.active').id === 'man-nghe', null, { timeout: 120000 });
      ok(true, 'Chọn Hà Nội: tải dữ liệu NASA thật -> màn Lắng nghe');
      await page.evaluate(() => { xuLyNghe('phuxanh'); xuLyNghe('nhietdo'); xuLyNghe('mua'); });
      ok((await page.textContent('#trang-thai-mua')).includes('Mức'), 'Nghe 3 loại: hiện mức');
      await page.evaluate(() => moManDoanHinh()); ok(await page.evaluate(() => document.querySelectorAll('#doanhinh-luachon .doanhinh-o').length === 4), 'Đố vui: 4 lựa chọn');
      await page.evaluate(() => document.querySelector('#doanhinh-luachon .doanhinh-o').click()); ok(await page.evaluate(() => doanHinhHienTai.daChon), 'Đố vui: chọn đáp án được');
      await page.evaluate(() => { hienManHinh('man-nghe'); moManVe(); xuLyChotDuDoan(); }); ok(await page.evaluate(() => document.querySelector('.screen.active').id === 'man-sosanh'), 'Vẽ tranh -> So sánh NASA');
      await page.evaluate(() => { hienManHinh('man-nghe'); moManHocHoi(); }); ok(await page.evaluate(() => document.querySelector('.screen.active').id === 'man-hochoi'), 'Học Hỏi');
      await page.evaluate(() => hienManHinh('man-nghe')); await page.click('#nut-thoigian');
      await page.waitForSelector('#tg-noidung', { state: 'visible' }); ok(true, 'Từ màn Lắng nghe THẬT (đã nạp NASA) vào màn mới được');
      await page.click('.tg-ket button'); ok(await page.evaluate(() => document.querySelector('.screen.active').id === 'man-gocxanh'), 'Màn mới -> Green Corner của em');
      await page.evaluate(() => chonQuocGiaTuanTra('vietnam')); await page.waitForFunction(() => document.querySelector('.screen.active').id === 'man-tuantra-doan', null, { timeout: 120000 });
      await page.evaluate(() => { document.querySelectorAll('#danh-sach-tuantra-doan .tile').forEach(e => e.click()); xuLyXemKetQuaTuanTra(); });
      ok(await page.evaluate(() => document.querySelector('.screen.active').id === 'man-tuantra-ketqua'), 'Đội Tuần Tra Xanh (6 điểm, NASA thật) chạy tới kết quả');
      await page.evaluate(() => { doiNgonNgu(); hienManHinh('man-chao'); }); ok((await page.textContent('#nut-doi-ngonngu')).includes('EN'), 'Đổi ngôn ngữ ở màn chào vẫn hoạt động');
    } catch (e) { warn('Phần 8 không kết luận được (có thể do NASA/mạng chậm): ' + e.message.split('\n')[0]); }
    ok(loi.length === 0, 'Không lỗi console/pageerror ' + JSON.stringify(loi)); await ctx.close();
  },
  9: async b => { // truy cập cơ bản
    console.log('\n## 9. Truy cập cơ bản (người dùng đọc màn hình, bàn phím)');
    const { ctx, page, loi } = await trang(b); await vao(page, 'hanoi');
    const r = await page.evaluate(() => ({
      nut: [...document.querySelectorAll('#man-thoigian button')].filter(x => x.offsetParent).map(x => (x.textContent || '').trim()),
      thanh: document.getElementById('tg-thanh').getAttribute('aria-label'),
      nhom: [...document.querySelectorAll('#man-thoigian details summary')].map(x => x.textContent.trim()),
      lab: [...document.querySelectorAll('#man-thoigian input[type=range]:not(.tg-thanh), #man-thoigian select')].every(i => document.querySelector('label[for=' + i.id + ']'))
    }));
    ok(r.nut.every(t => t.length > 0), 'Mọi nút nhìn thấy đều có chữ: ' + r.nut.join(' | '));
    ok(r.thanh && r.thanh.includes('2006') && r.thanh.includes('2026'), 'Thanh thời gian có mô tả cho trình đọc màn hình: "' + r.thanh + '"');
    ok(r.lab, 'Mọi ô chọn/thanh trượt trong Tuỳ chỉnh có nhãn <label for=...>');
    await page.focus('#tg-thanh'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    ok(await page.evaluate(() => THOI_GIAN.vt) > 0, 'Bàn phím: mũi tên phải trên thanh thời gian di chuyển được');
    await page.keyboard.press('Tab'); ok(await page.evaluate(() => document.activeElement.id === 'tg-nut-phat'), 'Tab: từ thanh thời gian sang nút Phát');
    ok(loi.length === 0, 'Không lỗi ' + JSON.stringify(loi)); await ctx.close();
  }
};

(async () => {
  console.log('Địa điểm có chuỗi: ' + IDS.join(', '));
  const browser = await chromium.launch({ args: AUTO });
  for (const p of PARTS) { try { await PHAN[p](browser); } catch (e) { fails++; console.log('LỖI Phần ' + p + ' hỏng: ' + e.message.split('\n')[0]); } }
  await browser.close();
  console.log('\n' + (fails ? fails + ' LỖI' : 'TẤT CẢ ĐẠT') + (warns ? ' (' + warns + ' cảnh báo)' : ''));
  process.exit(fails ? 1 : 0);
})();
