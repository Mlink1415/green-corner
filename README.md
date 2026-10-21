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
- **Mỗi loại số liệu có một loại âm riêng, ở cả hai luồng:**
  - **Nhiệt độ = tiếng dế.** Nhịp kêu theo **định luật Dolbear** (°F ≈ số tiếng
    dế trong 15 giây + 40): khoảng 0,7 tiếng/giây ở 10 °C, 1,9 ở 20 °C, 3,1 ở
    30 °C; dưới ~4,4 °C dế im. Dế là động vật máu lạnh nên trời ấm kêu nhanh
    hơn. Công thức chỉ gần đúng và hợp nhất với một số loài dế.
  - **Lượng mưa = tiếng mưa thật + sấm.** Mưa to dần theo mm/ngày (từ ~−30 dB
    đến 0 dB, 0 mm là im); từ 8 mm/ngày trở lên có thêm tiếng sấm.
  - **Hai thứ trên dùng MỘT THANG CHUNG cho mọi nơi trên Trái Đất** (tính bằng
    °C và mm/ngày tuyệt đối, không chuẩn hoá theo từng nơi): cùng 20 °C thì
    Hà Nội và Phoenix kêu như nhau.
  - **Phủ xanh (NDVI):** luồng theo địa điểm dùng giai điệu 3 mức tổng hợp bằng
    Web Audio (cao độ tinh chỉnh theo giá trị thật, nốt "bè" báo xu hướng);
    màn theo thời gian dùng đoạn piano (độ xanh càng cao càng sôi động).
  - **Gió (chỉ màn theo thời gian):** tiếng gió rừng to dần theo tốc độ gió
    (thang theo từng nơi).

## Hướng dẫn chơi

1. 🌍 **Khám phá** — chọn cách khám phá: **⏳ theo thời gian** (6 nơi có số
   liệu 20 năm: Diên An / An Tái (Trung Quốc) và Rondônia (Brazil) ở đầu danh sách, rồi Hà Nội, Cần Thơ, Phoenix, New York — mở thẳng màn nghe theo
   thời gian) hoặc **📍 theo địa điểm** (chọn 1 trong 25 điểm trên Trái Đất:
   thành phố, rừng, sa mạc... rồi đi theo các bước 2–7 dưới đây).
2. 🎧 **Lắng nghe** — nghe NASA "kể chuyện" bằng âm thanh về mức phủ xanh,
   nhiệt độ, lượng mưa ở đó, kèm khung hình vệ tinh thật — nhưng CHƯA thấy
   số liệu.
3. 🖼️ **Đố vui (tuỳ chọn)** — nghe lại âm thanh rồi đoán xem trong 4 ảnh vệ
   tinh, ảnh nào đúng là của nơi này.
   ⏳ **Khám phá theo thời gian (tuỳ chọn)** — kéo thanh thời gian hoặc bấm Phát
   để nghe hơn 20 năm số liệu NASA (NDVI, nhiệt độ, mưa, gió) trôi qua trong
   1–4 phút, kèm thẻ giải thích song ngữ Việt/Anh và thẻ "📍 Về nơi này" (có nút 🔊 Nghe đọc bằng giọng đọc có sẵn của trình duyệt, tự ẩn nếu máy không có giọng tiếng Việt/Anh) (nơi ở đâu, khí hậu, 20 năm qua phủ xanh/nhiệt độ/mưa đổi ra sao — tính từ số liệu thật — và nghe sẽ khác thế nào). Hiện có cho **Diên An / An Tái, Rondônia, Hà Nội, Cần
   Thơ, Phoenix, New York**; nơi khác sẽ ẩn nút này.
   - **Diên An / An Tái** (Trung Quốc): cao nguyên hoàng thổ được trồng lại cây từ khoảng năm 1999 — trả lời câu hỏi *"Can you hear a landscape becoming greener?"*.
   - **Rondônia** (Amazon, Brazil): rừng bị chặt để lấy đất — trả lời câu hỏi *"Can you hear vegetation disappearing?"*.
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
biểu đồ cùng dòng chú thích. Tỉ lệ tháng nội suy: Diên An / An Tái 0,4%, Rondônia 20,7%, Hà Nội 33,7%, New York 34,6%,
Cần Thơ 58,9%, Phoenix 62,2%.

**Cách chọn điểm đo của Diên An / An Tái và Rondônia.** Mỗi nơi chỉ là 1 ô vệ tinh MODIS ~250 m,
nên không đại diện cho cả vùng (thẻ "Về nơi này" có nói rõ). Hai ô được chọn bằng cách lấy ảnh NDVI
mùa hè/mùa khô (2 đợt đo tháng 7–8) của 2006 và của 2025 trong khoảng ±10 km, chỉ nhận ô có cờ
độ tin cậy 0 hoặc 1, rồi chọn ô mà cả 3×3 ô xung quanh đều đổi rõ:
Diên An / An Tái (36,9656°B, 109,2634°Đ): NDVI ~0,42 → ~0,77; Rondônia (9,5573°N, 64,061°T): ~0,89 → ~0,36
(mất rừng rõ từ 2021). Đây là **chọn nơi để kể một câu chuyện**, không phải mức trung bình của vùng.

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
NODE_PATH=<...> node tools/test_chedo.js                            # màn chọn cách khám phá, danh sách 6 nơi
NODE_PATH=<...> node tools/test_quaylai.js                          # nút ⬅ Quay lại ở mọi màn (cần mạng)
NODE_PATH=<...> node tools/audit_en.js                             # rà chữ tiếng Việt còn sót khi bật tiếng Anh (cần mạng)
NODE_PATH=<...> node tools/test_doc.js                              # nút Nghe đọc (giọng giả): ẩn/hiện, văn bản đọc, tự dừng
NODE_PATH=<...> node tools/test_noi.js                              # thẻ "Về nơi này": đối chiếu số với số liệu gốc
NODE_PATH=<...> node tools/test_loi.js                             # thẻ lời song ngữ
NODE_PATH=<...> node tools/test_dem_mua.js                          # dế (nhiệt độ) + mưa/sấm theo thang chung, cả hai luồng
NODE_PATH=<...> node tools/test_s5.js                              # toàn diện: điện thoại, mạng chậm, bộ nhớ, luồng cũ
```

## Công nghệ

Trang web thuần HTML/CSS/JS (`index.html`) — không framework, không bước build,
không thư viện ngoài. Chạy trực tiếp trên trình duyệt, kể cả trên điện thoại.
Âm thanh dùng Web Audio API: giai điệu phủ xanh tổng hợp trực tiếp; tiếng dế, mưa,
sấm phát từ các bản thu (`assets/audio/`: `cricket-chirps.wav` 24 tiếng dế rời,
`rain-loop-v2.wav` vòng mưa 40 giây, `thunder.wav` 4 clip sấm) cùng danh sách clip
`data/cricket-chirps.json`, `data/thunder-clips.json`. Màn "Khám phá theo thời
gian" tải lười (khi vào màn) thêm khoảng 6 MB (piano, gió, mưa, sấm, dế và số
liệu tháng); luồng theo địa điểm tải trước ~3,4 MB (mưa, sấm, dế) khi vào màn
Lắng nghe. Lỗi tải thì màn thời gian vẫn xem được biểu đồ không tiếng và luồng
theo địa điểm tự dùng giai điệu cũ. Cách tạo lại các file âm thanh mưa, sấm, dế:
`python3 tools/build_dem_mua_assets.py --nguon <thư-mục-bản-thu> --ra <thư-mục-ra>`.

## Ghi nhận

Dữ liệu: NASA POWER, NASA MODIS (qua ORNL DAAC), NASA Worldview/GIBS. Âm thanh:
nhạc piano và tiếng gió rừng ở màn "Khám phá theo thời gian" tải từ
[Pixabay](https://pixabay.com/vi/music/), dùng theo
[Pixabay Content License](https://pixabay.com/service/license-summary/); tiếng
mưa, sấm ("Rain and Thumb") và tiếng dế ("Cricket sound") là bản thu do nhóm cung
cấp (nguồn chi tiết sẽ được ghi thêm).

Cơ sở khoa học của tiếng dế: định luật Dolbear (1897) — nhịp kêu của dế tăng theo
nhiệt độ; xem [NOAA: Can crickets tell temperature?](https://www.noaa.gov/office-of-education/explainers/can-crickets-tell-temperature-answer-is-in-their-chirp)
và [Singing Insects of North America (dế cây tuyết)](https://orthsoc.org/sina/585a.htm).

---

## English summary

**Green Corner** turns real NASA data (vegetation index, temperature,
rainfall) into procedurally-generated sound and drawings, built for NASA
Space Apps Challenge 2026's *"The Earth Information Jukebox"*. It pairs a
real NASA satellite image (Worldview/GIBS, matched to the exact date of the
data) with sound driven by that data's actual values. Each kind of data has its
own kind of sound, on one shared scale for every place on Earth: **temperature
is cricket chirps** (rate follows Dolbear's law, silent below ~4 °C) and
**rainfall is a real rain recording plus thunder** (louder with more rain, thunder
from 8 mm/day). A second screen, *"Explore through time"*, lets players drag
through 20+ years of monthly NASA data (NDVI, temperature, rainfall, wind) for six
places: NDVI picks which part of the piano music plays next, and wind turns the
forest wind sound up or down —
with bilingual (Vietnamese/English) explanations. Live demo above; plain
static HTML, no build step, no dependencies.
