# 🌱 Green Corner

Game giáo dục "sonify hoá" dữ liệu NASA thật (mức phủ xanh, nhiệt độ, lượng mưa)
thành **âm thanh** và **tranh vẽ**, giúp học sinh cấp 2 khám phá màu xanh của
Trái Đất bằng tai nghe trước khi nhìn số liệu.

**🔗 Trải nghiệm ngay:** https://mlink1415.github.io/green-corner/

---

## Ý tưởng & đề bài NASA Space Apps 2026

Green Corner trả lời đề bài **"The Earth Information Jukebox"** của NASA Space
Apps Challenge 2026: ghép **Earth Information Center (EIC) visual frames**
(khung hình trực quan chính chủ của NASA) với **dynamic sonifications
generated in real time** (âm thanh tạo ra ngay từ dữ liệu, theo thời gian thực).

Cụ thể app đã làm:

- **Dữ liệu NASA thật, gọi trực tiếp lúc chơi** — không phải số liệu giả lập
  cứng. NDVI từ NASA MODIS/Terra (qua NASA ORNL DAAC), nhiệt độ + lượng mưa từ
  NASA POWER.
- **Khung hình EIC thật** — mỗi lần chọn 1 địa điểm, app lấy đúng ảnh vệ tinh
  MODIS từ NASA Worldview/GIBS, **đúng ngày** với dữ liệu đang sonify hoá, thay
  vì dùng hình minh hoạ.
- **Luồng chính: âm thanh tổng hợp bằng thuật toán** (Web Audio API), không dùng
  file nhạc có sẵn — cao độ, âm sắc, mật độ tiếng mưa đều tính **trực tiếp và
  liên tục** từ giá trị NASA thật (không chỉ ép về 3 mức Thấp/Vừa/Cao cố
  định), cộng thêm 1 nốt "bè" báo xu hướng tăng/giảm so với lần đo trước.
- **Màn "Khám phá theo thời gian": âm thanh từ thư viện miễn phí Pixabay** —
  nhạc piano, tiếng mưa và tiếng gió rừng. Số liệu NASA theo tháng
  (2006 đến 6/2026) **chọn đoạn piano nào phát tiếp**, làm tiếng đàn sáng hơn
  khi nóng hơn, và làm tiếng mưa/gió to hơn khi mưa/gió mạnh hơn, theo thời
  gian thực khi kéo thanh thời gian.

## Hướng dẫn chơi

1. 🌍 **Khám phá** — chọn cách khám phá: **⏳ theo thời gian** (4 nơi có số
   liệu 20 năm: Hà Nội, Cần Thơ, Phoenix, New York — mở thẳng màn nghe theo
   thời gian) hoặc **📍 theo địa điểm** (chọn 1 trong 25 điểm trên Trái Đất:
   thành phố, rừng, sa mạc... rồi đi theo các bước 2–7 dưới đây).
2. 🎧 **Lắng nghe** — nghe NASA "kể chuyện" bằng âm thanh về mức phủ xanh,
   nhiệt độ, lượng mưa ở đó, kèm khung hình vệ tinh thật — nhưng CHƯA thấy
   số liệu.
3. 🖼️ **Đố vui (tuỳ chọn)** — nghe lại âm thanh rồi đoán xem trong 4 ảnh vệ
   tinh, ảnh nào đúng là của nơi này.
   ⏳ **Khám phá theo thời gian (tuỳ chọn)** — kéo thanh thời gian hoặc bấm Phát
   để nghe hơn 20 năm số liệu NASA (NDVI, nhiệt độ, mưa, gió) trôi qua trong
   1–4 phút, kèm thẻ giải thích song ngữ Việt/Anh và thẻ "📍 Về nơi này" (nơi ở đâu, khí hậu, 20 năm qua phủ xanh/nhiệt độ/mưa đổi ra sao — tính từ số liệu thật — và nghe sẽ khác thế nào). Hiện có cho **Hà Nội, Cần
   Thơ, Phoenix, New York**; nơi khác sẽ ẩn nút này.
4. 📚 **Học Hỏi (tuỳ chọn)** — xem tổng hợp kiến thức và số liệu NASA về nơi
   đó nếu muốn tìm hiểu sâu hơn.
5. 🎨 **Vẽ tranh dự đoán** — dựa vào âm thanh đã nghe, chọn mức phủ xanh /
   nhiệt độ / mưa mà em NGHĨ là đúng; cảnh vẽ hiện ra theo lựa chọn.
6. 🛰️ **Xem NASA thấy gì** — so sánh dự đoán với số liệu NASA thật, đoán đúng
   mức nào được +1⭐ (tối đa 3⭐/lượt), điểm cộng dồn theo thời gian.
7. 🌱 **Green Corner của em** — hành động nhỏ ngoài đời thật: trồng và chăm
   sóc một góc xanh, ghi chú lại.

**Chế độ chơi thêm — 🚨 Đội Tuần Tra Xanh:** chọn 1 quốc gia, xếp hạng nhiều
điểm ứng viên theo mức độ CẦN TRỒNG CÂY NHẤT, rồi so với xếp hạng NDVI thật từ
NASA.

## Nguồn dữ liệu NASA

| Dữ liệu | Nguồn |
|---|---|
| NDVI (phủ xanh) | NASA MODIS/Terra Vegetation Indices, qua NASA ORNL DAAC |
| Nhiệt độ, lượng mưa, tốc độ gió (2 m) | NASA POWER |
| Ảnh vệ tinh (khung hình EIC) | NASA Worldview / GIBS Snapshot API |

Tất cả đều là API công khai, miễn phí, không cần đăng ký key.

Màn "Khám phá theo thời gian" **không gọi API lúc chơi**: số liệu theo tháng đã
được tải sẵn thành `data/series/<địa-điểm>.json` (vì tải NDVI 20 năm trực tiếp
mất ~13 phút mỗi nơi). NDVI chỉ nhận đợt đo có cờ độ tin cậy 0 hoặc 1 (không mây,
không tuyết); tháng không có đợt đo tốt được **nội suy và hiện vùng xám** trên
biểu đồ cùng dòng chú thích. Tỉ lệ tháng nội suy: Hà Nội 33,7%, New York 34,6%,
Cần Thơ 58,9%, Phoenix 62,2%.

## Chạy thử trên máy (dành cho người phát triển)

```bash
cd green-corner
python3 serve.py
```

rồi mở `http://localhost:8010` trên trình duyệt. Cần chạy qua server (không mở
trực tiếp file) vì app gọi `fetch()` tới API của NASA và tải file âm thanh/số
liệu. Mở thẳng file thì màn "Khám phá theo thời gian" báo lỗi nạp số liệu và có
nút Thử lại (đã kiểm: không bị treo).

### Cập nhật số liệu theo tháng

```bash
python3 tools/build_series.py --ids hanoi,cantho,phoenix,newyork   # ~13 phút/nơi, có cache, chạy tiếp được
python3 tools/check_series.py                                       # kiểm chéo với NASA và dữ liệu thô
```

Chỉ dùng thư viện chuẩn của Python 3.9+. Muốn thêm nơi: thêm id vào danh sách
`CO_CHUOI_THOI_GIAN` trong `index.html` rồi chạy lại `build_series.py` cho nơi đó.

### Kiểm thử tự động

Cần cài riêng Playwright (`npm i playwright`) và để server chạy:

```bash
NODE_PATH=<thư-mục-có-node_modules> node tools/test_thoigian.js   # màn mới: số liệu, kéo, phát, ngôn ngữ
NODE_PATH=<...> node tools/test_amthanh.js                         # âm thanh: đo mức, an toàn, lỗi, bị ngắt
NODE_PATH=<...> node tools/test_chedo.js                            # màn chọn cách khám phá, danh sách 4 nơi
NODE_PATH=<...> node tools/test_quaylai.js                          # nút ⬅ Quay lại ở mọi màn (cần mạng)
NODE_PATH=<...> node tools/audit_en.js                             # rà chữ tiếng Việt còn sót khi bật tiếng Anh (cần mạng)
NODE_PATH=<...> node tools/test_noi.js                              # thẻ "Về nơi này": đối chiếu số với số liệu gốc
NODE_PATH=<...> node tools/test_loi.js                             # thẻ lời song ngữ
NODE_PATH=<...> node tools/test_s5.js                              # toàn diện: điện thoại, mạng chậm, bộ nhớ, luồng cũ
```

## Công nghệ

Trang web thuần HTML/CSS/JS (`index.html`) — không framework, không bước build,
không thư viện ngoài. Chạy trực tiếp trên trình duyệt, kể cả trên điện thoại.
Luồng chính dùng Web Audio API tự tổng hợp (oscillator + filter). Màn "Khám phá
theo thời gian" tải lười (khi vào màn) thêm khoảng 4 MB: `assets/audio/` (piano,
mưa, gió) và `data/` (số liệu tháng, danh sách đoạn piano); lỗi tải thì màn vẫn
xem được biểu đồ không tiếng.

## Ghi nhận

Dữ liệu: NASA POWER, NASA MODIS (qua ORNL DAAC), NASA Worldview/GIBS. Âm thanh
ở màn "Khám phá theo thời gian" (nhạc piano, tiếng mưa, tiếng gió rừng) tải từ
[Pixabay](https://pixabay.com/vi/music/), dùng theo
[Pixabay Content License](https://pixabay.com/service/license-summary/).

---

## English summary

**Green Corner** turns real NASA data (vegetation index, temperature,
rainfall) into procedurally-generated sound and drawings, built for NASA
Space Apps Challenge 2026's *"The Earth Information Jukebox"*. It pairs a
real NASA satellite image (Worldview/GIBS, matched to the exact date of the
data) with sound synthesized live from that data's actual values — not a
fixed 3-level lookup, and not pre-made music files in the main flow. A second screen, *"Explore
through time"*, lets players drag through 20+ years of monthly NASA data
(NDVI, temperature, rainfall, wind) for four places: the data picks which
part of the piano music plays next, brightens the piano when it's hotter, and
turns the rain and forest wind sounds up or down (audio from Pixabay) —
with bilingual (Vietnamese/English) explanations. Live demo above; plain
static HTML, no build step, no dependencies.
