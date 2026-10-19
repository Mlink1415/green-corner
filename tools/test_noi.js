// Kiểm thử thẻ "Về nơi này" (mục Giới thiệu): các con số trong thẻ phải khớp tính độc lập từ data/series/*.json.
//   NODE_PATH=<thư mục có node_modules/playwright> node tools/test_noi.js [http://localhost:8010/]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = process.argv[2] || 'http://localhost:8010/';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'LỖI ') + m); if (!c) fails++; };
const VN = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;
const fmt = (x, d, loc) => x.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d });

// Tính lại độc lập (không dùng code của app)
function tinh(id) {
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'series', id + '.json'), 'utf8'));
  const r = {};
  for (const k of ['N', 'T', 'P']) {
    const nam = []; for (let y = 0; y < 20; y++) nam.push(c[k].slice(y * 12, y * 12 + 12).reduce((a, b) => a + b, 0) / 12);
    const dau = nam.slice(0, 5).reduce((a, b) => a + b) / 5, cuoi = nam.slice(15).reduce((a, b) => a + b) / 5;
    const cl = []; for (let m = 0; m < 12; m++) { let t = 0; for (let y = 0; y < 20; y++) t += c[k][y * 12 + m]; cl.push(t / 20); }
    const x = k === 'T' ? cuoi - dau : (cuoi - dau) / dau, ng = k === 'T' ? [0.8, 0.3] : k === 'N' ? [0.12, 0.04] : [0.25, 0.08];
    r[k] = { dau, cuoi, mn: Math.min(...cl), mx: Math.max(...cl), thMn: cl.indexOf(Math.min(...cl)) + 1, thMx: cl.indexOf(Math.max(...cl)) + 1,
      muc: x >= ng[0] ? 0 : x >= ng[1] ? 1 : x <= -ng[0] ? 4 : x <= -ng[1] ? 3 : 2 };
  }
  r.pct = c.nInterp.length / c.n; r.lat = c.lat; r.lon = c.lon;
  return r;
}
const TEN = { hanoi: ['Hà Nội', 'Việt Nam', 'Hanoi', 'Vietnam'], cantho: ['Cần Thơ', 'Việt Nam', 'Can Tho', 'Vietnam'],
  phoenix: ['Phoenix', 'Mỹ', 'Phoenix', 'United States'], newyork: ['New York', 'Mỹ', 'New York', 'United States'] };
const TU = { N: { vi: ['tăng khá rõ', 'tăng nhẹ', 'gần như không đổi', 'giảm nhẹ', 'giảm khá rõ'], en: ['rising clearly', 'rising slightly', 'almost unchanged', 'falling slightly', 'falling clearly'] },
  T: { vi: ['ấm lên khá rõ', 'ấm lên nhẹ', 'gần như không đổi', 'mát đi nhẹ', 'mát đi khá rõ'], en: ['clearly warmer', 'slightly warmer', 'almost unchanged', 'slightly cooler', 'clearly cooler'] },
  P: { vi: ['mưa nhiều hơn khá rõ', 'mưa nhiều hơn nhẹ', 'gần như không đổi', 'mưa ít đi nhẹ', 'mưa ít đi khá rõ'], en: ['clearly wetter', 'slightly wetter', 'almost unchanged', 'slightly drier', 'clearly drier'] } };

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 400, height: 900 } })).newPage();
  const issues = [];
  page.on('console', m => { if (m.type() === 'error') issues.push(m.text()); });
  page.on('pageerror', e => issues.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  const mo = async id => {
    await page.evaluate(i => { moDanhSachThoiGian(); moManThoiGian(i); }, id);
    await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 15000 });
    await page.evaluate(() => document.querySelectorAll('.tg-tuychinh[id^=tg-nhom]').forEach(d => d.open = true));
  };
  const the = () => page.evaluate(() => { const e = document.querySelector('#tg-loi-gioithieu [data-clip=NOI]'); return e ? e.innerText.replace(/\s+/g, ' ') : null; });

  for (const id of Object.keys(TEN)) {
    const r = tinh(id);
    console.log('\n## ' + id + '  (NDVI nội suy ' + (r.pct * 100).toFixed(0) + '%)');
    await mo(id);
    // --- Tiếng Việt
    let t = await the();
    ok(!!t, 'Có thẻ "Về nơi này"');
    ok(t.includes(TEN[id][0]) && t.includes(TEN[id][1]), 'Nêu nơi và quốc gia: ' + TEN[id][0] + ', ' + TEN[id][1]);
    ok(/nhiệt đới|ôn đới|sa mạc/.test(t), 'Nêu vùng khí hậu');
    ok(t.includes(fmt(Math.abs(r.lat), 2, 'vi-VN') + '°') && t.includes(fmt(Math.abs(r.lon), 2, 'vi-VN') + '°'), 'Tọa độ khớp số liệu');
    ok(t.includes('tháng ' + r.T.thMx + ' (khoảng ' + fmt(r.T.mx, 1, 'vi-VN') + ' °C)') && t.includes('tháng ' + r.T.thMn + ' (khoảng ' + fmt(r.T.mn, 1, 'vi-VN') + ' °C)'), 'Tháng nóng/lạnh nhất khớp tính độc lập');
    ok(t.includes('tháng ' + r.P.thMx + ' (' + fmt(r.P.mx, 1, 'vi-VN') + ' mm/ngày)') && t.includes('tháng ' + r.P.thMn + ' (' + fmt(r.P.mn, 1, 'vi-VN') + ' mm/ngày)'), 'Tháng mưa nhiều/ít nhất khớp');
    for (const k of ['N', 'T', 'P']) {
      const u = k === 'N' ? '' : k === 'T' ? ' °C' : ' mm/ngày', d = k === 'N' ? 2 : (k === 'P' && Math.max(r.P.dau, r.P.cuoi) < 2 ? 2 : 1);
      ok(t.includes(fmt(r[k].dau, d, 'vi-VN') + u + ' → ' + fmt(r[k].cuoi, d, 'vi-VN') + u + ', ' + TU[k].vi[r[k].muc]), k + ': ' + fmt(r[k].dau, d, 'vi-VN') + ' → ' + fmt(r[k].cuoi, d, 'vi-VN') + ' — "' + TU[k].vi[r[k].muc] + '"');
    }
    ok(t.includes('đàn sôi động nhất vào tháng ' + r.N.thMx) && t.includes('êm nhất vào tháng ' + r.N.thMn), 'Câu âm thanh: NDVI cao nhất tháng ' + r.N.thMx + ', thấp nhất tháng ' + r.N.thMn);
    ok(t.includes('Khi nghe') && t.includes('nghe thử xem có đúng không'), 'Có câu nối với âm thanh và lời mời nghe thử');
    ok((r.pct > 0.5) === t.includes('hơn một nửa số tháng NDVI'), 'Cảnh báo NDVI ước lượng ' + (r.pct > 0.5 ? 'CÓ' : 'KHÔNG') + ' hiện đúng theo tỉ lệ nội suy');
    ok(!/undefined|NaN|\{[a-z0-9]+\}/.test(t), 'Không có undefined/NaN/{tham số} sót');
    // --- Tiếng Anh
    await page.evaluate(() => doiNgonNguThoiGian());
    await page.evaluate(() => document.querySelectorAll('.tg-tuychinh[id^=tg-nhom]').forEach(d => d.open = true));
    t = await the();
    ok(t && !VN.test(t.replace(/Đ/g, '')) && t.includes(TEN[id][2]) && t.includes(TEN[id][3]), 'EN: không lẫn dấu tiếng Việt, nêu ' + TEN[id][2] + ', ' + TEN[id][3]);
    ok(t.includes(fmt(Math.abs(r.lat), 2, 'en-US') + '°') && t.includes(fmt(r.T.mx, 1, 'en-US') + ' °C'), 'EN: số đúng định dạng en-US');
    ok(TU.N.en[r.N.muc] && t.includes(fmt(r.N.dau, 2, 'en-US') + ' → ' + fmt(r.N.cuoi, 2, 'en-US') + ', ' + TU.N.en[r.N.muc]) && t.includes(TU.P.en[r.P.muc]), 'EN: mô tả mức đổi khớp');
    ok(!/undefined|NaN|\{[a-z0-9]+\}/.test(t), 'EN: không sót tham số');
    await page.evaluate(() => doiNgonNguThoiGian()); // về tiếng Việt
  }

  console.log('\n## Bố cục');
  await mo('hanoi');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mở hết thẻ: không tràn ngang ở 400px');
  await page.evaluate(() => document.querySelector('#tg-loi-gioithieu [data-clip=NOI]').scrollIntoView());
  await page.screenshot({ path: process.env.SHOT || '/tmp/gc-noi.png' });
  ok(issues.length === 0, 'Không lỗi console/pageerror ' + JSON.stringify(issues));
  console.log('\n' + (fails ? fails + ' LỖI' : 'TẤT CẢ ĐẠT'));
  await browser.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST HỎNG:', e); process.exit(2); });
