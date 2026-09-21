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
- **Âm thanh tổng hợp 100% bằng thuật toán** (Web Audio API), không dùng file
  nhạc có sẵn nào — cao độ, âm sắc, mật độ tiếng mưa đều tính **trực tiếp và
  liên tục** từ giá trị NASA thật (không chỉ ép về 3 mức Thấp/Vừa/Cao cố
  định), cộng thêm 1 nốt "bè" báo xu hướng tăng/giảm so với lần đo trước.

## Hướng dẫn chơi

1. 🌍 **Khám phá** — chọn 1 điểm trên Trái Đất (thành phố, rừng, sa mạc...)
   mà em muốn tìm hiểu.
2. 🎧 **Lắng nghe** — nghe NASA "kể chuyện" bằng âm thanh về mức phủ xanh,
   nhiệt độ, lượng mưa ở đó, kèm khung hình vệ tinh thật — nhưng CHƯA thấy
   số liệu.
3. 🖼️ **Đố vui (tuỳ chọn)** — nghe lại âm thanh rồi đoán xem trong 4 ảnh vệ
   tinh, ảnh nào đúng là của nơi này.
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
| Nhiệt độ & lượng mưa | NASA POWER |
| Ảnh vệ tinh (khung hình EIC) | NASA Worldview / GIBS Snapshot API |

Tất cả đều là API công khai, miễn phí, không cần đăng ký key.

## Chạy thử trên máy (dành cho người phát triển)

```bash
cd green-corner
python3 serve.py
```

rồi mở `http://localhost:8010` trên trình duyệt. Cần chạy qua server (không mở
trực tiếp file) vì app gọi `fetch()` tới các API của NASA.

## Công nghệ

1 file HTML/CSS/JS thuần (`index.html`) — không framework, không bước build,
không phụ thuộc thư viện ngoài. Chạy trực tiếp trên trình duyệt, kể cả trên
điện thoại. Âm thanh dùng Web Audio API (oscillator + filter tự tổng hợp,
không dùng file nhạc).

---

## English summary

**Green Corner** turns real NASA data (vegetation index, temperature,
rainfall) into procedurally-generated sound and drawings, built for NASA
Space Apps Challenge 2026's *"The Earth Information Jukebox"*. It pairs a
real NASA satellite image (Worldview/GIBS, matched to the exact date of the
data) with sound synthesized live from that data's actual values — not a
fixed 3-level lookup, and not pre-made music files. Live demo above; single
static HTML file, no build step, no dependencies.
