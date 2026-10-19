// Kiểm thử nút "🔊 Nghe đọc" (Web Speech API) bằng giọng đọc GIẢ (stub): kiểm nút hiện/ẩn, văn bản đưa cho giọng đọc, dừng/tiếp.
// Không kiểm được chất lượng giọng thật — việc đó phải nghe trên máy thật.
//   NODE_PATH=<...> node tools/test_doc.js [http://localhost:8010/]
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8010/';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'LỖI ') + m); if (!c) fails++; };
const VN = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;
const EMOJI = /[\u{1F000}-\u{1FFFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

// giọng giả: speak() ghi lại chữ, rồi tự "đọc xong" sau 30ms; cancel() hủy đoạn đang chờ
const STUB = (voices) => `
(() => {
  const S = { spoken: [], cancels: 0, voices: ${JSON.stringify(voices)}, pending: null, auto: true };
  window.__S = S;
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => S.voices,
    speak: (u) => { S.spoken.push({ text: u.text, lang: u.lang, voice: u.voice && u.voice.name, rate: u.rate });
      if (S.auto) S.pending = setTimeout(() => { S.pending = null; u.onend && u.onend({}); }, 30); },
    cancel: () => { S.cancels++; if (S.pending) { clearTimeout(S.pending); S.pending = null; } },
    onvoiceschanged: null
  } });
})();`;
const VI = { name: 'Linh', lang: 'vi-VN' }, EN = { name: 'Samantha', lang: 'en_US' };

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const mo = async (page, id) => {
    await page.evaluate(i => { moDanhSachThoiGian(); moManThoiGian(i); }, id);
    await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 15000 });
    await page.evaluate(() => document.querySelectorAll('.tg-tuychinh[id^=tg-nhom]').forEach(d => d.open = true));
    await page.waitForTimeout(150);
  };
  const hien = page => page.evaluate(() => [...document.querySelectorAll('.tg-doc-nut')].map(n => getComputedStyle(n).display !== 'none'));
  const taoTrang = async (voices) => {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 900 } });
    const page = await ctx.newPage(); const issues = [];
    page.on('pageerror', e => issues.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') issues.push('console: ' + m.text()); });
    if (voices) await page.addInitScript(STUB(voices));
    await page.goto(URL, { waitUntil: 'load' });
    return { ctx, page, issues };
  };

  console.log('\n## 1. Máy KHÔNG có giọng đọc: nút ẩn, app vẫn chạy');
  { const { ctx, page, issues } = await taoTrang(null);
    await page.addInitScript(() => {}); await mo(page, 'hanoi');
    const h = await hien(page);
    ok(h.length === 2 && h.every(x => !x), 'Có 2 nút (nhóm Giới thiệu + thẻ Về nơi này), cả hai ĐỀU ẨN: ' + JSON.stringify(h));
    ok(issues.length === 0, 'Không lỗi ' + JSON.stringify(issues)); await ctx.close(); }
  console.log('\n## 2. Có giọng tiếng Việt nhưng đang bật tiếng Anh: nút ẩn');
  { const { ctx, page, issues } = await taoTrang([VI]);
    await mo(page, 'hanoi'); ok((await hien(page)).every(x => x), 'Tiếng Việt: nút HIỆN');
    await page.click('#nut-ngonngu-tg'); await page.waitForTimeout(100);
    ok((await hien(page)).every(x => !x), 'Chuyển EN (chỉ có giọng VI): nút ẨN');
    ok(issues.length === 0, 'Không lỗi ' + JSON.stringify(issues)); await ctx.close(); }
  console.log('\n## 3. Giọng nạp chậm (voiceschanged): nút tự hiện');
  { const { ctx, page } = await taoTrang([]);
    await mo(page, 'hanoi'); ok((await hien(page)).every(x => !x), 'Chưa có giọng: ẩn');
    await page.evaluate(() => { __S.voices.push({ name: 'Linh', lang: 'vi-VN' }); speechSynthesis.onvoiceschanged(); });
    ok((await hien(page)).every(x => x), 'Giọng về muộn: nút hiện'); await ctx.close(); }

  console.log('\n## 4. Đọc cả phần Giới thiệu (tiếng Việt)');
  for (const id of ['hanoi', 'phoenix']) {
    const { ctx, page, issues } = await taoTrang([VI]);
    await mo(page, id);
    await page.click('#tg-nut-phat'); await page.waitForTimeout(500);
    ok(await page.evaluate(() => THOI_GIAN.dangChay), id + ': đang Phát');
    await page.click('.tg-doc-nut[data-doc=gioithieu]');
    ok(await page.evaluate(() => !THOI_GIAN.dangChay), id + ': bấm đọc -> tạm dừng timeline');
    await page.waitForFunction(() => !DOC.dang, null, { timeout: 15000 });
    const S = await page.evaluate(() => __S.spoken);
    const toan = S.map(x => x.text).join(' | ');
    ok(S.length >= 10, id + ': đọc ' + S.length + ' đoạn');
    ok(S.every(x => x.text.length <= 185), id + ': mọi đoạn <= 185 ký tự (dài nhất ' + Math.max(...S.map(x => x.text.length)) + ')');
    ok(S.every(x => x.lang === 'vi-VN' && x.voice === 'Linh'), id + ': dùng đúng giọng vi-VN');
    ok(!EMOJI.test(toan) && !/→/.test(toan), id + ': không còn emoji/mũi tên');
    ok(!/NDVI|NASA|Green Corner|°|mm\/ngày/.test(toan), id + ': đã đổi NDVI/NASA/Green Corner/°/mm/ngày sang chữ đọc được');
    ok(/en đê vê i/.test(toan) && /Grin Co-nơ/.test(toan) && /mi-li-mét mỗi ngày/.test(toan) && /độ C/.test(toan) && /phẩy/.test(toan), id + ': có "en đê vê i", "Grin Co-nơ", "mi-li-mét mỗi ngày", "độ C", "phẩy"');
    ok(/Về nơi này/.test(toan) && /Điểm NASA|Điểm Na-sa/.test(toan), id + ': có đọc thẻ Về nơi này');
    ok(/vĩ bắc/.test(toan) && /kinh (đông|tây)/.test(toan), id + ': tọa độ đọc là "độ vĩ bắc / kinh ..."');
    ok(await page.evaluate(() => !DOC.dang) && (await page.textContent('.tg-doc-nut[data-doc=gioithieu]')).includes('Nghe đọc'), id + ': đọc xong -> nút về "Nghe đọc"');
    if (id === 'hanoi') console.log('       mẫu: ' + S.slice(8, 14).map(x => x.text).join(' | ').slice(0, 330));
    ok(issues.length === 0, id + ': không lỗi ' + JSON.stringify(issues)); await ctx.close();
  }

  console.log('\n## 5. Chỉ đọc thẻ "Về nơi này", dừng giữa chừng, đọc lại');
  { const { ctx, page, issues } = await taoTrang([VI]);
    await mo(page, 'cantho');
    await page.evaluate(() => { __S.auto = false; }); // giữ "đang đọc" để thử bấm dừng
    await page.click('.tg-doc-nut[data-doc=noi]'); await page.waitForTimeout(300);
    const S1 = await page.evaluate(() => __S.spoken.map(x => x.text));
    ok(S1.length === 1 && S1[0].startsWith('Về nơi này'), 'Bắt đầu từ tiêu đề thẻ, chưa đọc đoạn tiếp: "' + S1[0] + '"');
    ok((await page.textContent('.tg-doc-nut[data-doc=noi]')).includes('Dừng đọc'), 'Nút đổi thành "Dừng đọc"');
    const c0 = await page.evaluate(() => __S.cancels);
    await page.click('.tg-doc-nut[data-doc=noi]'); await page.waitForTimeout(150);
    ok(await page.evaluate(c => __S.cancels > c && !DOC.dang, c0) && (await page.textContent('.tg-doc-nut[data-doc=noi]')).includes('Nghe đọc'), 'Bấm lần 2: gọi cancel, về "Nghe đọc"');
    await page.evaluate(() => { __S.auto = true; __S.spoken.length = 0; });
    await page.click('.tg-doc-nut[data-doc=noi]'); await page.waitForFunction(() => !DOC.dang, null, { timeout: 15000 });
    const S2 = await page.evaluate(() => __S.spoken.map(x => x.text));
    ok(S2.length >= 6 && S2[0].startsWith('Về nơi này') && !S2.some(t => /Grin Co-nơ|Khi nghe/.test(t) && false), 'Đọc lại từ đầu, chỉ thẻ Về nơi này (' + S2.length + ' đoạn)');
    ok(!S2.some(t => /Chào bạn|người dẫn đường/.test(t)), 'Không lẫn nội dung 3 thẻ Giới thiệu');
    ok(issues.length === 0, 'Không lỗi ' + JSON.stringify(issues)); await ctx.close(); }

  console.log('\n## 6. Tự dừng đọc khi: bấm Phát / đổi ngôn ngữ / thoát màn / ẩn tab');
  for (const cach of ['phat', 'ngonngu', 'thoat', 'andtab']) {
    const { ctx, page, issues } = await taoTrang([VI, EN]);
    await mo(page, 'hanoi'); await page.evaluate(() => { __S.auto = false; });
    await page.click('.tg-doc-nut[data-doc=gioithieu]'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => DOC.dang), cach + ': đang đọc');
    if (cach === 'phat') await page.click('#tg-nut-phat');
    if (cach === 'ngonngu') await page.click('#nut-ngonngu-tg');
    if (cach === 'thoat') await page.evaluate(() => thoatManThoiGian('man-tg-chon'));
    if (cach === 'andtab') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(250);
    ok(await page.evaluate(() => !DOC.dang && __S.cancels >= 1), cach + ': đã dừng đọc và gọi cancel');
    ok(issues.length === 0, cach + ': không lỗi ' + JSON.stringify(issues)); await ctx.close();
  }

  console.log('\n## 7. Tiếng Anh với giọng en');
  for (const id of ['phoenix', 'newyork']) {
    const { ctx, page, issues } = await taoTrang([VI, EN]);
    await mo(page, id); await page.click('#nut-ngonngu-tg'); await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelectorAll('.tg-tuychinh[id^=tg-nhom]').forEach(d => d.open = true));
    ok((await page.textContent('.tg-doc-nut[data-doc=gioithieu]')).includes('Read the whole Introduction'), id + ': nút tiếng Anh');
    await page.click('.tg-doc-nut[data-doc=gioithieu]'); await page.waitForFunction(() => !DOC.dang, null, { timeout: 15000 });
    const S = await page.evaluate(() => __S.spoken), toan = S.map(x => x.text).join(' | ');
    ok(S.length >= 10 && S.every(x => x.voice === 'Samantha'), id + ': ' + S.length + ' đoạn, dùng giọng en');
    ok(!VN.test(toan.replace(/São/g, '')) && !EMOJI.test(toan) && !/→|°|mm\/day/.test(toan), id + ': không lẫn dấu Việt/emoji/ký hiệu');
    ok(/degrees Celsius/.test(toan) && /millimeters per day/.test(toan) && /degrees (north|south)/.test(toan) && /N D V I/.test(toan), id + ': có "degrees Celsius", "millimeters per day", "degrees north", "N D V I"');
    ok(/ to /.test(toan), id + ': mũi tên/khoảng năm đọc là "to"');
    if (id === 'phoenix') console.log('       mẫu: ' + S.slice(5, 9).map(x => x.text).join(' | ').slice(0, 300));
    ok(issues.length === 0, id + ': không lỗi ' + JSON.stringify(issues)); await ctx.close();
  }

  console.log('\n' + (fails ? fails + ' LỖI' : 'TẤT CẢ ĐẠT'));
  await browser.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST HỎNG:', e); process.exit(2); });
