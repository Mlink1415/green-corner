#!/usr/bin/env python3
"""Kiểm CHÉO các file data/series/*.json (độc lập với build_series.py ở những chỗ có thể):
  1. cấu trúc/khoảng giá trị hợp lệ (dùng lại check_series của build_series)
  2. mùa vụ hợp lý (nơi nào nóng nhất/lạnh nhất/mưa nhiều nhất vào tháng nào)
  3. so với NASA POWER GỌI TRỰC TIẾP lúc này, vài tháng mỗi nơi (phát hiện lệch chỉ số tháng)
  4. NDVI tính lại từ cache THÔ bằng đoạn mã khác, so với giá trị đã lưu (tháng không nội suy)
Chạy: python3 tools/check_series.py [--ids hanoi,cantho,...] [--no-live]
"""
import argparse, glob, json, os, random, sys, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import build_series as b

CACHE = os.path.expanduser("~/.cache/green-corner-series")
# Tháng (1-12) mà cực trị phải rơi vào: kiến thức khí hậu cơ bản của từng nơi
MUA_VU = {
    "hanoi":   {"nong_nhat": (5, 6, 7, 8), "lanh_nhat": (12, 1, 2), "mua_nhat": (6, 7, 8, 9)},
    "cantho":  {"nong_nhat": (3, 4, 5, 6), "lanh_nhat": (12, 1, 2), "mua_nhat": (6, 7, 8, 9, 10)},
    "phoenix": {"nong_nhat": (6, 7, 8), "lanh_nhat": (12, 1, 2)},
    "newyork": {"nong_nhat": (6, 7, 8), "lanh_nhat": (12, 1, 2)},
}
ok_all = True
def kiem(cond, msg):
    global ok_all
    print(("OK   " if cond else "LỖI ") + msg)
    if not cond: ok_all = False

def khi_hau(arr, start_month):
    tong, dem = [0.0] * 12, [0] * 12
    for i, v in enumerate(arr):
        m = (start_month - 1 + i) % 12; tong[m] += v; dem[m] += 1
    return [tong[m] / dem[m] for m in range(12)]

def kiem_mot(lid, live):
    path = os.path.join(ROOT, "data", "series", lid + ".json")
    s = json.load(open(path, encoding="utf-8")); n = s["n"]; m0 = int(s["start"][5:7])
    print("== %s" % lid)
    try: b.check_series(s); kiem(True, "cấu trúc và khoảng giá trị hợp lệ (n=%d, %s, nội suy %.1f%%)" % (n, s["start"], s["quality"]["pctMonthsInterpolated"]))
    except Exception as e: kiem(False, "cấu trúc: %s" % e); return
    months = b.months_between(s["start"], "2026-06")
    kiem(len(months) == n, "số tháng khớp lịch 2006-01..2026-06 (%d)" % n)
    mv = MUA_VU.get(lid, {}); T = khi_hau(s["T"], m0); P = khi_hau(s["P"], m0)
    kiem(T.index(max(T)) + 1 in mv.get("nong_nhat", range(1, 13)), "tháng nóng nhất (trung bình nhiều năm) = tháng %d, %.1f°C" % (T.index(max(T)) + 1, max(T)))
    kiem(T.index(min(T)) + 1 in mv.get("lanh_nhat", range(1, 13)), "tháng lạnh nhất = tháng %d, %.1f°C" % (T.index(min(T)) + 1, min(T)))
    if "mua_nhat" in mv: kiem(P.index(max(P)) + 1 in mv["mua_nhat"], "tháng mưa nhiều nhất = tháng %d, %.1f mm/ngày" % (P.index(max(P)) + 1, max(P)))
    # tính lại NDVI từ cache thô bằng cách KHÁC (không dùng monthly_mean_ndvi/interpolate)
    by = {}
    for fn in glob.glob(os.path.join(CACHE, lid, "ndvi_*.json")):
        for r in json.load(open(fn))["subset"]: by.setdefault(r["calendar_date"], {})[r["band"]] = r["data"][0]
    tot = {}; so_tot = {}
    for d, bd in by.items():
        v, rel = bd.get(b.BAND_NDVI), bd.get(b.BAND_REL)
        if v is None or v < b.NDVI_FILL or rel not in (0, 1) or d[:7] not in months: continue
        tot[d[:7]] = tot.get(d[:7], 0.0) + v * 0.0001; so_tot[d[:7]] = so_tot.get(d[:7], 0) + 1
    sai = 0; noi_suy = set(s["nInterp"])
    for i, mth in enumerate(months):
        if i in noi_suy: continue
        if mth not in so_tot or abs(tot[mth] / so_tot[mth] - s["N"][i]) > 6e-5: sai += 1
    kiem(sai == 0, "NDVI tính lại từ dữ liệu thô khớp với file ở mọi tháng không nội suy (%d tháng)" % (n - len(noi_suy)))
    kiem(all(months[i] not in so_tot for i in noi_suy), "các tháng ĐÁNH DẤU nội suy đều thật sự không có đợt đo tốt nào")
    kiem(len(by) == s["quality"]["composites"], "số đợt đo trong cache (%d) khớp thống kê trong file" % len(by))
    if live:
        random.seed(7); idx = sorted({0, n - 1, random.randrange(1, n - 1), random.randrange(1, n - 1)})
        url = "%s?parameters=T2M,PRECTOTCORR,WS2M&community=AG&longitude=%s&latitude=%s&start=2006&end=2026&format=JSON" % (b.POWER, s["lon"], s["lat"])
        try:
            p = json.load(urllib.request.urlopen(url, timeout=90))["properties"]["parameter"]
            for i in idx:
                k = months[i].replace("-", "")
                kiem(abs(p["T2M"][k] - s["T"][i]) < 0.006 and abs(p["PRECTOTCORR"][k] - s["P"][i]) < 0.006 and abs(p["WS2M"][k] - s["W"][i]) < 0.006,
                     "so với NASA POWER trực tiếp, tháng %s: T %.2f/%.2f, mưa %.2f/%.2f, gió %.2f/%.2f" % (months[i], p["T2M"][k], s["T"][i], p["PRECTOTCORR"][k], s["P"][i], p["WS2M"][k], s["W"][i]))
        except Exception as e: kiem(False, "không gọi được NASA POWER: %s" % e)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--ids", default="hanoi,cantho,phoenix,newyork"); ap.add_argument("--no-live", action="store_true")
    a = ap.parse_args()
    for lid in [x for x in a.ids.split(",") if x]: kiem_mot(lid, not a.no_live)
    print("\n" + ("TẤT CẢ ĐẠT" if ok_all else "CÓ LỖI")); return 0 if ok_all else 1
if __name__ == "__main__":
    sys.exit(main())
