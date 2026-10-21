// Kiểm thử tiếng DẾ (nhiệt độ) và tiếng MƯA + SẤM (lượng mưa) theo MỘT THANG CHUNG cho mọi địa điểm,
// ở cả hai luồng: Khám phá theo thời gian và Khám phá theo địa điểm. Bằng Chromium thật (ĐO, không nghe bằng tai).
//   NODE_PATH=<thư mục có node_modules/playwright> node tools/test_dem_mua.js [http://localhost:8010/]
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8010/';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'LỖI ') + m); if (!c) fails++; };
const db = x => (20 * Math.log10(Math.max(x, 1e-9))).toFixed(1);
const dolbear = tC => Math.max(0, (1.8 * tC - 8) / 15);      // tiếng kêu mỗi giây

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const trang = async (chan) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } }); const page = await ctx.newPage(); const loi = [];
    page.on('pageerror', e => loi.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|snapshot|wvs\.earthdata|net::ERR/.test(m.text())) loi.push('console: ' + m.text()); });
    if (chan) await page.route(chan, r => r.abort());
    await page.addInitScript(() => { // ghi lại mọi tiếng dế/sấm được lên lịch (bọc hàm của app, không đổi hành vi)
      window.__log = []; window.__ghi = false;
      window.addEventListener('DOMContentLoaded', () => {
        const d = window.phatMotTiengDe, s = window.phatMotTiengSam;
        window.phatMotTiengDe = function () { if (window.__ghi) window.__log.push({ k: 'de' }); return d.apply(this, arguments); };
        window.phatMotTiengSam = function () { if (window.__ghi) window.__log.push({ k: 'sam' }); return s.apply(this, arguments); };
      });
    });
    await page.goto(URL, { waitUntil: 'load' }); return { ctx, page, loi };
  };
  const doi = (p, ms) => p.waitForTimeout(ms);
  const vao = async (p, id) => { await p.evaluate(i => { moDanhSachThoiGian(); moManThoiGian(i); }, id); await p.waitForSelector('#tg-noidung', { state: 'visible' }); };
  const phat = async p => { await p.click('#tg-nut-phat'); await p.waitForFunction(() => AT.dangBat, null, { timeout: 30000 }); await p.evaluate(() => dungChayTG()); };
  const gan = (p, k, v) => p.evaluate(([k, v]) => { const a = THOI_GIAN.chuoi[k]; let b = 0; for (let i = 1; i < a.length; i++) if (Math.abs(a[i] - v) < Math.abs(a[b] - v)) b = i; return { i: b, v: a[b] }; }, [k, v]);
  const cuc = (p, k, d) => p.evaluate(([k, d]) => { const a = THOI_GIAN.chuoi[k]; let b = 0; for (let i = 1; i < a.length; i++) if (d * a[i] > d * a[b]) b = i; return { i: b, v: a[b] }; }, [k, d]);
  const dat = (p, i) => p.evaluate(i => { dungChayTG(); datViTriTG(i); }, i);
  const dem = async (p, ms) => { await p.evaluate(() => { window.__log = []; window.__ghi = true; }); await doi(p, ms); return p.evaluate(() => { window.__ghi = false; return window.__log.slice(); }); };

  let { ctx, page: p, loi } = await trang();

  console.log('\n## 1. Hàm thang chung (tính thuần)');
  const f = await p.evaluate(() => ({ r: [0, 4.4, 10, 20, 30, 38].map(t => tocDoDeTuNhiet(t)), db: [0, 0.02, 0.5, 2, 8, 25, 40].map(m => mucMuaDB(m)), he: [0, 25].map(m => heSoMua(m)), sam: [5, 8, 16.5, 25, 31].map(m => nhipSamMoiPhut(m)) }));
  ok(f.r[0] === 0 && f.r[1] < 0.01 && Math.abs(f.r[3] - 1.87) < 0.01 && Math.abs(f.r[4] - 3.07) < 0.01, 'Dế theo Dolbear: 0 °C và 4,4 °C im; 20 °C ' + f.r[3].toFixed(2) + ' tiếng/giây; 30 °C ' + f.r[4].toFixed(2));
  ok(f.db[0] === -Infinity && f.db[1] === -Infinity && f.db[2] > -30 && f.db[2] < f.db[3] && f.db[3] < f.db[4] && Math.abs(f.db[5]) < 0.01 && f.db[6] === f.db[5], 'Mưa: 0 và 0,02 mm im; to dần theo mm; 25 mm trở lên là 0 dB (' + f.db.slice(2).map(v => v.toFixed(1)).join(', ') + ')');
  ok(f.he[0] === 0 && f.sam[0] === 0 && f.sam[1] > 0 && f.sam[3] > f.sam[2] && f.sam[4] === f.sam[3], 'Sấm: không dưới 8 mm; từ 8 mm trở lên tăng dần rồi chững (' + f.sam.map(v => v.toFixed(1)).join(', ') + ' lần/phút)');

  console.log('\n## 2. Màn thời gian: nạp âm thanh');
  await vao(p, 'phoenix'); await phat(p);
  ok(await p.evaluate(() => !!AT.buf.sam && !!AT.buf.de && AT.dsDe.length === 24 && AT.dsSam.length === 4), 'Đã nạp: vòng mưa, 4 clip sấm, 24 tiếng dế');
  ok(await p.evaluate(() => AT.nen === 'both' && AT.deBat), 'Mặc định: nền thiên nhiên "cả hai" và dế bật');

  console.log('\n## 3. DẾ: một thang chung cho mọi nơi (6 giây mỗi lần đo)');
  const kq = {};
  for (const [id, mt] of [['phoenix', 10], ['phoenix', 20], ['newyork', 20], ['cantho', 30], ['hanoi', 16], ['newyork', 16]]) {
    await vao(p, id); await phat(p); const m = await gan(p, 'T', mt); await dat(p, m.i); await doi(p, 600); const lg = await dem(p, 6000);
    const ex = dolbear(m.v) * 6; kq[id + mt] = lg.filter(e => e.k === 'de').length;
    ok(Math.abs(kq[id + mt] - ex) <= Math.max(2, ex * 0.3), id + ' ' + m.v.toFixed(1) + ' °C: ' + kq[id + mt] + ' tiếng/6 s (mong ' + ex.toFixed(1) + ', định luật Dolbear)');
  }
  ok(Math.abs(kq.phoenix20 - kq.newyork20) <= 3, 'Cùng ~20 °C: Phoenix và New York kêu như nhau (' + kq.phoenix20 + ' và ' + kq.newyork20 + ')');
  ok(Math.abs(kq.hanoi16 - kq.newyork16) <= 3, 'Cùng ~16 °C: Hà Nội và New York kêu như nhau (' + kq.hanoi16 + ' và ' + kq.newyork16 + ')');
  ok(kq.phoenix10 < kq.phoenix20 && kq.phoenix20 < kq.cantho30, 'Nóng hơn thì dế kêu nhanh hơn (10 °C: ' + kq.phoenix10 + ' < 20 °C: ' + kq.phoenix20 + ' < 30 °C: ' + kq.cantho30 + ')');
  await vao(p, 'newyork'); await phat(p); const lanh = await cuc(p, 'T', -1); await dat(p, lanh.i); await doi(p, 600); const lg0 = await dem(p, 6000);
  ok(lanh.v < 4 && lg0.filter(e => e.k === 'de').length === 0, 'Mùa đông New York (' + lanh.v.toFixed(1) + ' °C): dế IM');
  ok(/im lặng/.test(await p.textContent('#tg-de-tt')), 'Dòng trạng thái báo dế im lặng');
  const nong = await cuc(p, 'T', 1); await p.evaluate(() => { window.__log = []; window.__ghi = true; }); const t0 = Date.now(); await dat(p, nong.i);
  await p.waitForFunction(() => window.__log.some(e => e.k === 'de'), null, { timeout: 4000 }).catch(() => {}); const dtre = Date.now() - t0; await p.evaluate(() => { window.__ghi = false; });
  ok(dtre < 2500, 'Từ lạnh sang nóng: tiếng dế đầu tiên sau ' + dtre + ' ms (không phải chờ nhịp cũ rất chậm)');

  console.log('\n## 4. MƯA: một thang chung, sấm chỉ khi mưa to');
  const g = {};
  for (const [id, mm] of [['hanoi', 2], ['cantho', 2], ['hanoi', 10], ['cantho', 10]]) {
    await vao(p, id); await phat(p); const m = await gan(p, 'P', mm); await dat(p, m.i); await doi(p, 1500);
    const th = await p.evaluate(() => AT.do.mua.gain.value), ex = await p.evaluate(v => heSoMua(v) * AT.volNen * AT.volNen, m.v); g[id + mm] = { th, ex };
    ok(Math.abs(th - ex) < ex * 0.12 + 0.002, id + ' ' + m.v.toFixed(1) + ' mm: độ lợi ' + th.toFixed(3) + ' khớp công thức thang chung (' + ex.toFixed(3) + ')');
  }
  ok(Math.abs(Math.log(g.hanoi2.th / g.cantho2.th)) < 0.2, 'Hai nơi cùng ~2 mm cho độ to gần nhau');
  ok(g.hanoi10.th > g.hanoi2.th * 2.5, 'Mưa 10 mm to hơn rõ rệt so với 2 mm (' + db(g.hanoi2.th) + ' -> ' + db(g.hanoi10.th) + ' dB)');
  const sam = async mm => p.evaluate(async mm => { const a = THOI_GIAN.chuoi.P.slice(); THOI_GIAN.chuoi.P = a.map(() => mm); window.__log = []; window.__ghi = true;
    for (let i = 0; i < 4000; i++) { AT.samCuoi = -100; lenLichDeSamTG(AT.ctx.currentTime + 1.6); } window.__ghi = false; THOI_GIAN.chuoi.P = a; return window.__log.filter(e => e.k === 'sam').length; }, mm);
  const s5 = await sam(5), s20 = await sam(20);
  ok(s5 === 0, 'Mưa 5 mm/ngày (< 8): KHÔNG có sấm');
  ok(s20 > 5, 'Mưa 20 mm/ngày: có sấm (' + s20 + ' lần trong 4000 nhịp mô phỏng)');
  await p.evaluate(() => { const an = AT.ctx.createAnalyser(); an.fftSize = 2048; AT.do.mua.connect(an); window.__an = an; AT.pianoBat = false; AT.deBat = false; AT.nen = 'rain'; });
  const rms = () => p.evaluate(async () => { const b = new Float32Array(2048); let s = 0; for (let i = 0; i < 25; i++) { __an.getFloatTimeDomainData(b); let a = 0; for (const v of b) a += v * v; s += Math.sqrt(a / b.length); await new Promise(z => setTimeout(z, 80)); } return s / 25; });
  const pm = {};
  for (const mm of [0.5, 2, 8, 25]) { await p.evaluate(mm => { const a = THOI_GIAN.chuoi; if (!a.__P) a.__P = a.P.slice(); a.P = a.__P.map(() => mm); }, mm); await doi(p, 1500); const gg = await p.evaluate(() => AT.do.mua.gain.value); const rr = await rms(); pm[mm] = { g: gg, r: rr, tl: rr / gg }; }
  ok(pm[0.5].g < pm[2].g && pm[2].g < pm[8].g && pm[8].g < pm[25].g, 'Độ lợi mưa tăng đều theo lượng mưa (0,5 < 2 < 8 < 25 mm)');
  ok(Object.values(pm).every(v => db(v.tl) > -27 && db(v.tl) < -14), 'Tiếng ra khớp độ lợi ở mọi mức (RMS/độ lợi trong -27..-14 dBFS: vòng mưa đã được làm đều)');
  ok(20 * Math.log10(pm[25].g / pm[0.5].g) > 20, 'Dải độ to rộng: ' + (20 * Math.log10(pm[25].g / pm[0.5].g)).toFixed(0) + ' dB giữa 0,5 mm và 25 mm');
  await p.evaluate(() => { const c = THOI_GIAN.chuoi; if (c.__P) c.P = c.__P; });

  console.log('\n## 5. Luồng theo địa điểm (số giả lập, không cần NASA)');
  const giaLap = d => p.evaluate(d => { duLieuDaTai.hanoi = Object.assign({ ndvi: 0.5, ndviNgay: '2026-08-29', ndviDangTinCay: true, ndviTruoc: 0.5, tempC: 22, rainMmNgay: 3, nam: 2025, tempCNamTruoc: 22, rainMmNgayNamTruoc: 3, thoiTietGanNhat: null }, d); khuVucHienTai = 'hanoi'; moManNghe('hanoi'); }, d);
  await giaLap({}); await p.waitForFunction(() => DD.bo, null, { timeout: 30000 }); await doi(p, 500);
  ok(await p.evaluate(() => DD.bo.dsDe.length === 24 && DD.bo.dsSam.length === 4 && DD.bo.mua.duration > 39), 'Vào màn Lắng nghe: tự nạp trước vòng mưa, sấm, dế');
  const nghe = async (l, d) => { await p.evaluate(d => { Object.assign(duLieuDaTai.hanoi, d); }, d); await p.evaluate(() => { window.__log = []; window.__ghi = true; }); await p.evaluate(l => xuLyNghe(l), l); await doi(p, 5200);
    return p.evaluate(() => { window.__ghi = false; return { log: window.__log.slice(), t1: document.getElementById('trang-thai-nhietdo').textContent, t2: document.getElementById('trang-thai-mua').textContent }; }); };
  const dd = {};
  for (const T of [2, 10, 20, 30, 38]) { const o = await nghe('nhietdo', { tempC: T }); dd[T] = o.log.filter(e => e.k === 'de').length; if (T === 2) ok(/im lặng/.test(o.t1), 'Dưới ~4 °C: có ghi chú dế im lặng'); }
  ok(dd[2] === 0 && dd[10] >= 2 && dd[20] > dd[10] && dd[30] > dd[20] && dd[38] > dd[30], 'Số tiếng dế tăng dần theo nhiệt độ (2, 10, 20, 30, 38 °C: ' + [2, 10, 20, 30, 38].map(t => dd[t]).join(', ') + ')');
  ok([10, 20, 30].every(T => Math.abs(dd[T] - Math.max(1, Math.round(dolbear(T) * 4.5))) <= 1), 'Số tiếng dế đúng công thức chung (±1)');
  await p.evaluate(() => { const c = layAudioContext(), an = c.createAnalyser(); an.fftSize = 2048; ddDauRa(c).connect(an); window.__an2 = an; });
  const rms2 = () => p.evaluate(async () => { const b = new Float32Array(2048); let s = 0, n = 0; for (let i = 0; i < 55; i++) { __an2.getFloatTimeDomainData(b); let a = 0; for (const v of b) a += v * v; s += Math.sqrt(a / b.length); n++; await new Promise(z => setTimeout(z, 80)); } return s / n; });
  const mm = {};
  for (const m of [0.02, 0.5, 2, 6, 12]) { await doi(p, 2200); await p.evaluate(m => { Object.assign(duLieuDaTai.hanoi, { rainMmNgay: m }); window.__log = []; window.__ghi = true; xuLyNghe('mua'); }, m); mm[m] = await rms2(); mm[m + 's'] = await p.evaluate(() => { window.__ghi = false; return window.__log.filter(e => e.k === 'sam').length; }); await doi(p, 1500); }
  ok(mm[0.02] < 0.001, 'Mưa 0,02 mm: im (gần như không mưa)');
  ok(mm[0.5] < mm[2] && mm[2] < mm[6] && mm[6] < mm[12], 'Mưa to dần theo lượng mưa (0,5 < 2 < 6 < 12 mm: ' + [0.5, 2, 6, 12].map(m => db(mm[m])).join(', ') + ' dBFS)');
  ok(mm['12s'] === 1 && mm['6s'] === 0, 'Sấm chỉ có ở mưa 12 mm, không có ở 6 mm');
  const lap = []; for (let k = 0; k < 6; k++) { await doi(p, 2200); await p.evaluate(() => { Object.assign(duLieuDaTai.hanoi, { rainMmNgay: 4 }); xuLyNghe('mua'); }); lap.push(await rms2()); }
  const dbl = lap.map(v => 20 * Math.log10(v)), chl = Math.max(...dbl) - Math.min(...dbl);
  ok(chl < 3, 'Cùng lượng mưa 4 mm: 6 lần bấm to gần như nhau (chênh ' + chl.toFixed(1) + ' dB)');
  await p.evaluate(() => { Object.assign(duLieuDaTai.hanoi, { rainMmNgay: 0.02 }); xuLyNghe('mua'); }); await doi(p, 300);
  ok(/không mưa/.test(await p.textContent('#trang-thai-mua')), 'Dòng chữ báo "gần như không mưa" khi 0,02 mm');

  console.log('\n## 6. Lời giải thích (VI, EN) và Mục lục');
  await vao(p, 'hanoi'); await p.evaluate(() => { document.querySelectorAll('.tg-tuychinh[id^=tg-nhom]').forEach(d => d.open = true); });
  const ch = await p.evaluate(() => document.getElementById('tg-loi-dulieu').innerText + ' ' + document.getElementById('tg-loi-gioithieu').innerText);
  ok(/dế kêu càng nhanh/.test(ch) && /máu lạnh/.test(ch) && /tiếng sấm/.test(ch) && !/đàn càng sáng/.test(ch), 'Màn thời gian (VI): nhiệt độ = dế, mưa có sấm, không còn "đàn sáng"');
  await p.click('#nut-ngonngu-tg'); await doi(p, 300); await p.evaluate(() => { document.querySelectorAll('.tg-tuychinh[id^=tg-nhom]').forEach(d => d.open = true); });
  const en = await p.evaluate(() => document.getElementById('tg-loi-dulieu').innerText + ' ' + document.getElementById('tg-loi-gioithieu').innerText);
  ok(/crickets chirp/.test(en) && /cold-blooded/.test(en) && /thunder/.test(en) && !/brighter piano/.test(en), 'Màn thời gian (EN): crickets, cold-blooded, thunder');
  await p.click('#nut-ngonngu-tg');
  const ml = await p.evaluate(() => { moMucLuc(); return document.getElementById('lop-phu-mucluc').innerText; });
  ok(/dế/.test(ml) && /Dolbear/.test(ml) && /mưa thật/.test(ml) && /sấm/.test(ml), 'Mục lục âm thanh (VI): dế, định luật Dolbear, mưa thật, sấm');
  ok(loi.length === 0, 'Không lỗi console/pageerror ' + JSON.stringify(loi)); await ctx.close();

  console.log('\n## 7. Nạp âm thanh mới lỗi -> tự dùng giai điệu cũ (không im, không lỗi)');
  ({ ctx, page: p, loi } = await trang('**/rain-loop-v2.wav'));
  await p.evaluate(() => { window.__osc = 0; const g = AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator = function () { window.__osc++; return g.apply(this, arguments); }; duLieuDaTai.hanoi = { ndvi: 0.5, ndviNgay: '2026-08-29', ndviDangTinCay: true, ndviTruoc: 0.5, tempC: 22, rainMmNgay: 3, nam: 2025, tempCNamTruoc: 22, rainMmNgayNamTruoc: 3, thoiTietGanNhat: null }; khuVucHienTai = 'hanoi'; moManNghe('hanoi'); });
  await doi(p, 1500); await p.evaluate(() => xuLyNghe('mua')); await doi(p, 800);
  ok(await p.evaluate(() => window.__osc) > 0, 'Không tải được file mưa mới: nút Nghe phát giai điệu cũ (đã tạo ' + await p.evaluate(() => window.__osc) + ' oscillator)');
  ok(loi.every(x => /Failed to fetch/.test(x)), 'Chỉ có thông báo lỗi tải dự kiến (Failed to fetch), không lỗi khác'); await ctx.close();

  console.log('\n' + (fails ? fails + ' LỖI' : 'TẤT CẢ ĐẠT')); await browser.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST HỎNG:', e); process.exit(2); });
