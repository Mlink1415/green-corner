// Rà soát: ở tiếng Anh, màn nào còn sót chữ tiếng Việt (có dấu)? In ra từng dòng sót, theo màn.
//   NODE_PATH=<...> node tools/audit_en.js [http://localhost:8010/]   (cần mạng: luồng chính gọi NASA thật)
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8010/';
const VN = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;
let tong = 0;
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 400, height: 900 } })).newPage();
  const issues = [];
  page.on('pageerror', e => issues.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => { if (ngonNguHienTai !== 'en') doiNgonNgu(); });
  const quet = async (ten) => {
    const dong = await page.evaluate(() => {
      const out = [];
      const root = document.querySelector('.screen.active');
      const phu = document.querySelector('#lop-phu-mucluc.active');
      [root, phu].filter(Boolean).forEach(r => {
        const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
        let n; while ((n = w.nextNode())) { const t = n.textContent.replace(/\s+/g, ' ').trim(); if (t) out.push(t); }
        r.querySelectorAll('[placeholder],[aria-label],[title],[alt]').forEach(e => ['placeholder', 'aria-label', 'title', 'alt'].forEach(a => { const v = e.getAttribute(a); if (v) out.push('[' + a + '] ' + v); }));
      });
      return out;
    });
    const sot = dong.filter(t => VN.test(t.replace(/São/g, 'Sao')));
    console.log((sot.length ? 'SÓT ' : 'OK   ') + ten + (sot.length ? ' — ' + sot.length + ' dòng' : ''));
    sot.forEach(t => console.log('       · ' + t.slice(0, 150)));
    tong += sot.length;
  };
  const man = async (id, ten) => { await page.evaluate(i => hienManHinh(i), id); await page.waitForTimeout(150); await quet(ten || id); };

  await man('man-chao'); await man('man-huongdan'); await man('man-chedo'); await man('man-map'); await man('man-tg-chon');
  await man('man-tai');
  await page.evaluate(() => { moDanhSachThoiGian(); moManThoiGian('hanoi'); });
  await page.waitForSelector('#tg-noidung', { state: 'visible', timeout: 15000 });
  await page.evaluate(() => document.querySelectorAll('.tg-tuychinh').forEach(d => d.open = true));
  await quet('man-thoigian (mở hết thẻ)');
  await page.evaluate(() => thoatManThoiGian('man-tg-chon'));

  // luồng chính với dữ liệu NASA thật
  await page.evaluate(() => chonKhuVuc('hanoi'));
  await page.waitForFunction(() => document.querySelector('.screen.active').id === 'man-nghe', null, { timeout: 60000 });
  await quet('man-nghe (trước khi nghe)');
  await page.evaluate(() => { ['phuxanh', 'nhietdo', 'mua'].forEach(l => xuLyNghe(l)); });
  await page.waitForTimeout(1500);
  await quet('man-nghe (sau khi nghe đủ 3)');
  await page.evaluate(() => moMucLuc()); await page.waitForTimeout(200); await quet('lớp phủ Mục lục âm thanh'); await page.evaluate(() => dongMucLuc());
  await page.evaluate(() => moManDoanHinh()); await page.waitForTimeout(2500); await quet('man-doanhinh (chưa chọn)');
  await page.evaluate(() => { const o = document.querySelector('#man-doanhinh [data-id], #man-doanhinh .tile-anh, #man-doanhinh .lua-chon-anh'); if (o) o.click(); });
  await page.waitForTimeout(500); await quet('man-doanhinh (sau khi chọn)');
  await page.evaluate(() => moManHocHoi()); await quet('man-hochoi');
  await page.evaluate(() => moManVe()); await page.waitForTimeout(200); await quet('man-ve');
  await page.evaluate(() => { ['phuxanh', 'nhietdo', 'mua'].forEach(l => chonMucDo(l, 'vua')); });
  await page.evaluate(() => xuLyChotDuDoan()); await page.waitForTimeout(500); await quet('man-sosanh');
  await man('man-gocxanh');
  await page.evaluate(() => { document.getElementById('ghi-chu-goc-xanh').value = 'x'; luuGocXanh(); }); await quet('man-gocxanh (sau khi lưu)');

  await man('man-tuantra-quocgia');
  await page.evaluate(() => chonQuocGiaTuanTra('vietnam'));
  await page.waitForFunction(() => document.querySelector('.screen.active').id === 'man-tuantra-doan', null, { timeout: 90000 });
  await quet('man-tuantra-doan');
  await page.evaluate(() => { tuanTraHienTai.diemDuLieu.forEach(d => chonThuTuTuanTra(d.id || d.kv && d.kv.id)); });
  await page.evaluate(() => xuLyXemKetQuaTuanTra()); await page.waitForTimeout(500); await quet('man-tuantra-ketqua');
  console.log('\nTổng dòng sót: ' + tong + (issues.length ? '\n' + issues.join('\n') : ''));
  await browser.close();
})().catch(e => { console.error('HỎNG:', e); process.exit(2); });
