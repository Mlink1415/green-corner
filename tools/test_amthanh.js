// Kiểm thử ÂM THANH của màn "Khám phá theo thời gian" (S3), bằng Chromium thật (không nghe bằng tai, chỉ ĐO).
// Cần server (python3 serve.py -> http://localhost:8010/) và Playwright cài riêng:
//   NODE_PATH=<thư mục có node_modules/playwright> node tools/test_amthanh.js [http://localhost:8010/]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const URL = process.argv[2] || 'http://localhost:8010/';
const S = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'series', 'hanoi.json'), 'utf8'));
const arg = (a, f) => a.indexOf(f(...a));
const iMax = a => a.indexOf(Math.max(...a)), iMin = a => a.indexOf(Math.min(...a));
const M = { wet: iMax(S.P), dry: iMin(S.P), windy: iMax(S.W), calm: iMin(S.W), cold: iMin(S.T), hot: iMax(S.T) };

let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'LỖI ') + m); if (!c) fails++; };
const doi = ms => new Promise(r => setTimeout(r, ms));

async function vaoManHinh(page) {
  await page.evaluate(() => { khuVucHienTai = 'hanoi'; moManNghe('hanoi'); });
  await page.click('#nut-thoigian');
  await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 15000 });
}
async function batDauPhat(page) {
  await page.click('#tg-nut-phat');
  await page.waitForFunction(() => document.getElementById('tg-nut-phat').textContent.includes('Tạm dừng'), null, { timeout: 40000 });
  await page.click('#tg-nut-phat'); // tạm dừng timeline để giữ nguyên tháng; âm thanh vẫn chạy
}
const ganDoThi = page => page.evaluate(() => { window.__an = AT.ctx.createAnalyser(); window.__an.fftSize = 2048; AT.do.nen.connect(window.__an); });
const dat = (page, o) => page.evaluate(o => {
  document.getElementById('tg-nen').value = o.nen; document.getElementById('tg-piano-bat').checked = o.piano;
  document.getElementById('tg-vol-piano').value = o.vp == null ? 80 : o.vp; document.getElementById('tg-vol-nen').value = o.vn == null ? 80 : o.vn;
  doiMixTG(); datViTriTG(o.vt);
}, o);
const medir = (page, ms) => page.evaluate(async ms => {
  const an = window.__an, buf = new Float32Array(an.fftSize); let peak = 0, sum = 0, n = 0; const t0 = performance.now();
  while (performance.now() - t0 < ms) { an.getFloatTimeDomainData(buf); for (const v of buf) { const a = Math.abs(v); if (a > peak) peak = a; sum += v * v; n++; } await new Promise(r => setTimeout(r, 30)); }
  return { rms: 10 * Math.log10(sum / n + 1e-12), peak: 20 * Math.log10(peak + 1e-12) };
}, ms);

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 400, height: 900 } });
  const page = await ctx.newPage(); const issues = [], reqs = {};
  page.on('console', m => { if (m.type() === 'error') issues.push(m.text()); });
  page.on('pageerror', e => issues.push('pageerror: ' + e.message));
  page.on('request', r => { const u = r.url(); if (/assets\/audio|piano-slices/.test(u)) reqs[u.split('/').pop()] = (reqs[u.split('/').pop()] || 0) + 1; });
  await page.goto(URL, { waitUntil: 'load' });

  // 1. Tài nguyên có thật, đủ nhỏ
  let tong = 0;
  for (const f of ['assets/audio/piano.mp3', 'assets/audio/rain-loop.wav', 'assets/audio/wind-loop-B.wav', 'data/piano-slices.json']) {
    const r = await ctx.request.get(URL + f); const b = (await r.body()).length; tong += b; ok(r.status() === 200 && b > 500, f + ' -> HTTP ' + r.status() + ', ' + (b / 1024).toFixed(0) + ' KB');
  }
  ok(tong < 8 * 1024 * 1024, 'Tổng dung lượng âm thanh ' + (tong / 1048576).toFixed(2) + ' MB (ngưỡng 8 MB)');

  // 2. Vào màn: tải file ở nền, chưa tạo âm thanh
  await vaoManHinh(page);
  await page.waitForFunction(() => AT.tt === 'sansang', null, { timeout: 30000 });
  ok(await page.evaluate(() => AT.dangBat === false && AT.do === null), 'Vào màn: đã tải file nhưng CHƯA bật âm thanh');
  ok((await page.textContent('#tg-amthanh-tt')).includes('sẵn sàng'), 'Hiện "Âm thanh đã sẵn sàng"');

  // 3. Bấm Phát: giải mã + dựng chuỗi nút + chạy
  await batDauPhat(page);
  const st = await page.evaluate(() => ({ bat: AT.dangBat, state: AT.ctx.state, sr: AT.ctx.sampleRate,
    dur: { p: AT.buf.piano.duration, m: AT.buf.mua.duration, g: AT.buf.gio.duration },
    mb: (['piano', 'mua', 'gio'].reduce((t, k) => t + AT.buf[k].length * AT.buf[k].numberOfChannels * 4, 0) / 1048576) }));
  ok(st.bat && st.state === 'running', 'Phát: AudioContext đang chạy (' + st.sr + ' Hz)');
  ok(Math.abs(st.dur.p - 118.2) < 1 && Math.abs(st.dur.m - 33) < 0.5 && Math.abs(st.dur.g - 40) < 0.5,
     'Độ dài giải mã đúng: piano ' + st.dur.p.toFixed(1) + 's, mưa ' + st.dur.m.toFixed(1) + 's, gió ' + st.dur.g.toFixed(1) + 's');
  console.log('INFO RAM giải mã ~' + st.mb.toFixed(0) + ' MB (rất nhẹ so với bản gốc 300 MB)');
  await ganDoThi(page);

  // 4. Dữ liệu điều khiển âm thanh đúng hướng (đo thật)
  await dat(page, { nen: 'rain', piano: false, vt: M.wet }); await doi(1500); const mWet = await medir(page, 1200);
  await dat(page, { nen: 'rain', piano: false, vt: M.dry }); await doi(1800); const mDry = await medir(page, 1200);
  ok(mWet.rms - mDry.rms > 15, 'Mưa: tháng ướt nhất to hơn tháng khô nhất ' + (mWet.rms - mDry.rms).toFixed(1) + ' dB (cần > 15)');
  await dat(page, { nen: 'wind', piano: false, vt: M.windy }); await doi(1500); const gW = await medir(page, 1200);
  await dat(page, { nen: 'wind', piano: false, vt: M.calm }); await doi(1800); const gC = await medir(page, 1200);
  ok(gW.rms - gC.rms > 15, 'Gió: tháng gió mạnh nhất to hơn tháng lặng nhất ' + (gW.rms - gC.rms).toFixed(1) + ' dB (cần > 15)');
  await dat(page, { nen: 'wind', piano: true, vt: M.cold }); await doi(1800); const fCold = await page.evaluate(() => AT.do.lop.frequency.value);
  await dat(page, { nen: 'wind', piano: true, vt: M.hot }); await doi(1800); const fHot = await page.evaluate(() => AT.do.lop.frequency.value);
  ok(fHot / fCold > 2.5, 'Piano sáng hơn khi nóng: bộ lọc ' + fCold.toFixed(0) + ' Hz (lạnh) -> ' + fHot.toFixed(0) + ' Hz (nóng)');
  const pick = await page.evaluate(() => { const lay = m => { let t = 0; for (let i = 0; i < 40; i++) { AT.lichSu = []; t += AT.doan[chonDoanPianoTG(m)].r; } return t / 40; }; return { cao: lay(0.95), thap: lay(0.05) }; });
  ok(pick.cao > 0.75 && pick.thap < 0.25, 'NDVI chọn đoạn piano: NDVI cao -> độ sôi động TB ' + pick.cao.toFixed(2) + ', NDVI thấp -> ' + pick.thap.toFixed(2));

  // 5. Đỉnh âm khi mở hết cỡ
  await dat(page, { nen: 'both', piano: true, vp: 100, vn: 100, vt: M.wet }); await doi(2000); const mx = await medir(page, 6000);
  ok(mx.peak < -1, 'Mở hết cỡ (piano + mưa + gió): đỉnh ' + mx.peak.toFixed(1) + ' dBFS (cần < -1), RMS ' + mx.rms.toFixed(1) + ' dBFS');
  ok((await page.textContent('#tg-piano-tt')).includes('Đoạn piano'), 'Dòng "Đoạn piano x/30" hiện khi đang phát');

  // 6. Tắt tiếng / bật tiếng
  await page.click('#tg-nut-tat'); await doi(600);
  const g0 = await page.evaluate(() => AT.do.master.gain.value);
  await page.click('#tg-nut-tat'); await doi(600);
  const g1 = await page.evaluate(() => AT.do.master.gain.value);
  ok(g0 < 0.02 && g1 > 0.6, 'Tắt tiếng -> master ' + g0.toFixed(3) + ', bật lại -> ' + g1.toFixed(2));

  // 7. Đổi ngôn ngữ giữa lúc có tiếng: không ngắt
  await page.click('#nut-ngonngu-tg'); await doi(300);
  ok(await page.evaluate(() => AT.dangBat) && (await page.textContent('#tg-nut-tat')).includes('Mute'), 'Đổi sang EN: âm thanh vẫn chạy, nút thành "Mute"');
  await page.click('#nut-ngonngu-tg');

  // 7b. Hệ thống ngắt âm thanh giữa chừng (cuộc gọi, ngủ máy, rút tai nghe): báo, tạm dừng, bấm Phát thì hồi sinh
  await page.click('#tg-nut-phat'); await page.waitForFunction(() => THOI_GIAN.dangChay, null, { timeout: 10000 });
  await page.evaluate(() => AT.ctx.suspend()); await doi(700);
  const ng = await page.evaluate(() => ({ chay: THOI_GIAN.dangChay, tt: document.getElementById('tg-amthanh-tt').textContent, st: AT.ctx.state }));
  ok(!ng.chay && ng.st !== 'running' && ng.tt.includes('bị ngắt'), 'Hệ thống ngắt âm thanh: timeline tạm dừng + hiện thông báo ("' + ng.tt.slice(0, 40) + '...")');
  await page.click('#tg-nut-phat'); await page.waitForFunction(() => THOI_GIAN.dangChay, null, { timeout: 10000 });
  const hs = await page.evaluate(() => ({ st: AT.ctx.state, tt: document.getElementById('tg-amthanh-tt').textContent }));
  ok(hs.st === 'running' && !hs.tt.includes('bị ngắt'), 'Bấm Phát sau khi bị ngắt: âm thanh hồi sinh (' + hs.st + ') và thông báo biến mất');
  await page.click('#tg-nut-phat');

  // 8. Ẩn tab: im tiếng
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await doi(500); const gAn = await page.evaluate(() => AT.do.master.gain.value);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await doi(500); const gHien = await page.evaluate(() => AT.do.master.gain.value);
  ok(gAn < 0.02 && gHien > 0.6, 'Ẩn tab -> im tiếng (' + gAn.toFixed(3) + '), hiện lại -> ' + gHien.toFixed(2));

  // 9. Thoát màn: dừng hẳn, giải phóng
  const an = await page.evaluate(() => 1);
  await page.click('#man-thoigian .home-btn:first-of-type'); await doi(1200);
  const ra = await page.evaluate(() => ({ bat: AT.dangBat, do: AT.do, buf: AT.buf, hen: AT.hen, henMuc: AT.henMuc, ng: AT.nguonMua }));
  ok(!ra.bat && ra.do === null && ra.buf === null && ra.hen === null && ra.henMuc === null && ra.ng === null, 'Thoát màn: tắt hẳn, bỏ bộ đệm giải mã, dừng cả 2 đồng hồ');
  const lang = await medir(page, 800);
  ok(lang.rms < -80, 'Sau khi thoát: đầu ra im lặng (' + lang.rms.toFixed(0) + ' dBFS)');

  // 10. Vào lại: không tải lại file, phát lại được
  await vaoManHinh(page);
  await batDauPhat(page);
  ok(await page.evaluate(() => AT.dangBat), 'Vào lại và Phát: hoạt động');
  ok(Object.values(reqs).every(n => n === 1), 'File âm thanh chỉ tải 1 lần dù vào 2 lần: ' + JSON.stringify(reqs));
  await page.click('#man-thoigian .home-btn:first-of-type');

  // 11. Nút Phát bấm liên tiếp / thoát ngay khi đang chuẩn bị
  await vaoManHinh(page);
  await page.evaluate(() => { phatTamDungThoiGian(); phatTamDungThoiGian(); phatTamDungThoiGian(); thoatManThoiGian('man-nghe'); });
  await doi(2500);
  ok(await page.evaluate(() => !AT.dangBat && AT.do === null && !THOI_GIAN.dangChay && !THOI_GIAN.dangChuanBi), 'Bấm Phát 3 lần rồi thoát ngay: không rò âm thanh, không kẹt nút');

  ok(issues.length === 0, 'Không có lỗi console/pageerror trong luồng bình thường ' + JSON.stringify(issues));

  // 12. Mất 1 file âm thanh: vẫn xem được biểu đồ, bấm lại thì thử tải lại
  const p2 = await ctx.newPage(); const e2 = [], l2 = [];
  p2.on('pageerror', e => e2.push(e.message)); p2.on('console', m => { if (m.type() === 'error') l2.push(m.text()); });
  await p2.route('**/assets/audio/rain-loop.wav', r => r.abort());
  await p2.goto(URL, { waitUntil: 'load' });
  await vaoManHinh(p2);
  await p2.waitForFunction(() => AT.tt === 'loi', null, { timeout: 20000 });
  ok((await p2.textContent('#tg-amthanh-tt')).includes('Chưa nạp được âm thanh'), 'Thiếu file: hiện thông báo "Chưa nạp được âm thanh"');
  await p2.click('#tg-nut-phat');
  await p2.waitForFunction(() => document.getElementById('tg-nut-phat').textContent.includes('Tạm dừng'), null, { timeout: 30000 });
  const vA = await p2.evaluate(() => THOI_GIAN.vt); await doi(900);
  const vB = await p2.evaluate(() => THOI_GIAN.vt);
  ok(vB > vA && await p2.evaluate(() => !AT.dangBat), 'Thiếu file: biểu đồ vẫn chạy không tiếng (vị trí ' + vA.toFixed(1) + ' -> ' + vB.toFixed(1) + ')');
  await p2.click('#tg-nut-phat'); await p2.unroute('**/assets/audio/rain-loop.wav');
  await p2.click('#tg-nut-phat');
  await p2.waitForFunction(() => AT.dangBat === true, null, { timeout: 40000 });
  ok(true, 'Có lại file: bấm Phát thì tải lại và có tiếng');
  ok(e2.length === 0, 'Trang thiếu-file không có pageerror ' + JSON.stringify(e2));

  await browser.close();
  console.log(fails ? ('\n' + fails + ' LỖI') : '\nTẤT CẢ ĐẠT');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST HỎNG:', e); process.exit(2); });
