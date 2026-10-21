#!/usr/bin/env python3
"""Tạo chuỗi THEO THÁNG NDVI, nhiệt độ, mưa, gió từ NASA cho màn "Khám phá theo thời gian".

Chỉ dùng thư viện chuẩn Python 3.9+. Có cache và chạy tiếp được: chạy lại thì chỉ tải phần còn thiếu.
Không sửa index.html. Kết quả: data/series/<id>.json (ghi nguyên tử, kiểm tra trước khi ghi).

  python3 tools/build_series.py --selftest
  python3 tools/build_series.py --ids yanan,rondonia,yakutsk,djibouti,hanoi,cantho,phoenix,newyork
  python3 tools/build_series.py --verify
"""
import argparse, datetime, json, os, re, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MODIS = "https://modis.ornl.gov/rst/api/v1/MOD13Q1"
POWER = "https://power.larc.nasa.gov/api/temporal/monthly/point"
BAND_NDVI, BAND_REL, BAND_QA = "250m_16_days_NDVI", "250m_16_days_pixel_reliability", "250m_16_days_VI_Quality"
GOOD_REL = (0, 1)          # cùng quy tắc với app: 0 = tốt, 1 = tạm ổn (2 = tuyết, 3 = mây)
NDVI_FILL = -2000          # MODIS dùng -3000 cho ô không có dữ liệu
SEASONS = {"DJF": (12, 1, 2), "MAM": (3, 4, 5), "JJA": (6, 7, 8), "SON": (9, 10, 11)}


# ---------- tiện ích thuần (có kiểm tra tự động) ----------
def months_between(start, end):
    """'2006-01','2006-03' -> ['2006-01','2006-02','2006-03']"""
    y, m = map(int, start.split("-")); y2, m2 = map(int, end.split("-")); out = []
    while (y, m) <= (y2, m2):
        out.append("%04d-%02d" % (y, m)); m += 1
        if m == 13: y, m = y + 1, 1
    return out

def monthly_mean_ndvi(composites, months):
    """composites: [(calendar_date 'YYYY-MM-DD', ndvi_float_or_None, rel_int)]. Gán theo THÁNG CỦA NGÀY BẮT ĐẦU đợt đo.
    Trả về (list giá trị hoặc None nếu tháng không có đợt tốt, list số đợt tốt mỗi tháng)."""
    idx = {m: i for i, m in enumerate(months)}; sums = [0.0] * len(months); cnt = [0] * len(months)
    for d, v, rel in composites:
        i = idx.get(d[:7])
        if i is None or v is None or rel not in GOOD_REL: continue
        sums[i] += v; cnt[i] += 1
    return [(sums[i] / cnt[i]) if cnt[i] else None for i in range(len(months))], cnt

def interpolate(arr):
    """Lấp chỗ None bằng nội suy tuyến tính; đầu/cuối chuỗi lấy giá trị tốt gần nhất. Trả về (mảng đã lấp, chỉ số đã lấp)."""
    good = [i for i, v in enumerate(arr) if v is not None]
    if not good: raise ValueError("Không có tháng nào có NDVI đáng tin")
    out, filled = list(arr), []
    for i, v in enumerate(arr):
        if v is not None: continue
        left = max((g for g in good if g < i), default=None); right = min((g for g in good if g > i), default=None)
        if left is None: out[i] = arr[right]
        elif right is None: out[i] = arr[left]
        else: out[i] = arr[left] + (arr[right] - arr[left]) * (i - left) / (right - left)
        filled.append(i)
    return out, filled

def percentile(a, p):
    s = sorted(a); k = p * (len(s) - 1); lo = int(k); hi = min(lo + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)

def longest_run(idx_list):
    best = run = 0; prev = None
    for i in idx_list:
        run = run + 1 if prev is not None and i == prev + 1 else 1; best = max(best, run); prev = i
    return best

def selftest():
    assert months_between("2006-11", "2007-02") == ["2006-11", "2006-12", "2007-01", "2007-02"]
    assert len(months_between("2006-01", "2026-06")) == 246
    months = ["2006-01", "2006-02", "2006-03", "2006-04"]
    comp = [("2006-01-01", 0.2, 0), ("2006-01-17", 0.4, 3), ("2006-03-06", 0.6, 1), ("2006-03-22", 0.8, 1), ("2006-04-07", None, 0)]
    m, c = monthly_mean_ndvi(comp, months)
    assert m[0] == 0.2 and c[0] == 1            # đợt cờ 3 bị loại
    assert m[1] is None and abs(m[2] - 0.7) < 1e-9 and m[3] is None
    f, idx = interpolate(m)
    assert idx == [1, 3] and abs(f[1] - 0.45) < 1e-9 and f[3] == f[2]   # nội suy giữa, đuôi giữ nguyên
    assert interpolate([None, 0.5, None])[0] == [0.5, 0.5, 0.5]
    try: interpolate([None, None]); raise SystemExit("phải báo lỗi khi không có dữ liệu")
    except ValueError: pass
    assert abs(percentile([1, 2, 3, 4, 5], 0.5) - 3) < 1e-9 and abs(percentile([0, 10], 0.98) - 9.8) < 1e-9
    assert longest_run([1, 2, 3, 7, 8]) == 3 and longest_run([]) == 0
    print("selftest: OK (8 nhóm kiểm tra)")


# ---------- mạng + cache ----------
def http_json(url, retries=5, timeout=120):
    err = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            return json.load(urllib.request.urlopen(req, timeout=timeout))
        except Exception as e:
            err = e; time.sleep(3 * (i + 1))
    raise RuntimeError("Không tải được %s: %s" % (url[:110], err))

def cached(path, make):
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f: return json.load(f)
        except Exception: pass                    # cache hỏng -> tải lại
    data = make(); os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f: json.dump(data, f)
    os.replace(tmp, path); return data

def read_locations(index_html):
    text = open(index_html, encoding="utf-8").read(); locs = {}
    for m in re.finditer(r'\{ id: "([a-z_0-9]+)",[^\n]*?lat: (-?[0-9.]+), lon: (-?[0-9.]+) \}', text):
        locs[m.group(1)] = (float(m.group(2)), float(m.group(3)))
    return locs


# ---------- lấy dữ liệu một địa điểm ----------
def fetch_power(lat, lon, months, cache_dir, lid):
    y0, y1 = months[0][:4], months[-1][:4]
    url = "%s?parameters=T2M,PRECTOTCORR,WS2M&community=AG&longitude=%s&latitude=%s&start=%s&end=%s&format=JSON" % (POWER, lon, lat, y0, y1)
    raw = cached(os.path.join(cache_dir, lid, "power_%s_%s.json" % (y0, y1)), lambda: http_json(url))
    p = raw["properties"]["parameter"]; out = {}
    for key, name in (("T2M", "T"), ("PRECTOTCORR", "P"), ("WS2M", "W")):
        vals = []
        for m in months:
            v = p[key].get(m.replace("-", ""))
            if v is None or v == -999: raise RuntimeError("%s thiếu tháng %s (%s)" % (lid, m, key))
            vals.append(v)
        out[name] = vals
    return out

def fetch_composites(lat, lon, months, cache_dir, lid, workers):
    lo, hi = months[0] + "-01", months[-1] + "-31"
    dates = cached(os.path.join(cache_dir, lid, "dates.json"),
                   lambda: http_json("%s/dates?latitude=%s&longitude=%s" % (MODIS, lat, lon)))["dates"]
    sel = [d for d in dates if lo <= d["calendar_date"] <= hi]
    chunks = [sel[i:i + 8] for i in range(0, len(sel), 8)]
    def one(ch):
        url = "%s/subset?latitude=%s&longitude=%s&startDate=%s&endDate=%s&kmAboveBelow=0&kmLeftRight=0" % (
            MODIS, lat, lon, ch[0]["modis_date"], ch[-1]["modis_date"])
        def make():
            j = http_json(url); keep = [r for r in j["subset"] if r["band"] in (BAND_NDVI, BAND_REL, BAND_QA)]
            return {"subset": keep}
        return cached(os.path.join(cache_dir, lid, "ndvi_%s_%s.json" % (ch[0]["modis_date"], ch[-1]["modis_date"])), make)
    done = [0]
    def tracked(ch):
        r = one(ch); done[0] += 1
        if done[0] % 10 == 0 or done[0] == len(chunks): print("   %s: %d/%d nhóm đợt đo" % (lid, done[0], len(chunks)), flush=True)
        return r
    with ThreadPoolExecutor(workers) as ex: raws = list(ex.map(tracked, chunks))
    by = {}
    for raw in raws:
        for r in raw["subset"]: by.setdefault(r["calendar_date"], {})[r["band"]] = r["data"][0]
    comps = []
    for d in sorted(by):
        if not (lo <= d <= hi): continue
        b = by[d]; v = b.get(BAND_NDVI); rel = b.get(BAND_REL)
        comps.append((d, None if v is None or v < NDVI_FILL else v * 0.0001, rel, b.get(BAND_QA)))
    if len(comps) != len(sel): raise RuntimeError("%s: nhận %d đợt đo, mong đợi %d" % (lid, len(comps), len(sel)))
    return comps


# ---------- ghép + kiểm tra + ghi ----------
def check_series(s):
    n = s["n"]
    for k, lo, hi in (("T", -60, 55), ("P", 0, 60), ("W", 0, 30), ("N", -0.3, 1.0)):
        a = s[k]
        if len(a) != n: raise ValueError("%s: độ dài %d != %d" % (k, len(a), n))
        for v in a:
            if not isinstance(v, (int, float)) or v != v or not (lo <= v <= hi): raise ValueError("%s: giá trị bất thường %r" % (k, v))
    if any((not isinstance(i, int)) or i < 0 or i >= n for i in s["nInterp"]): raise ValueError("nInterp sai chỉ số")
    if s["nInterp"] != sorted(set(s["nInterp"])): raise ValueError("nInterp phải tăng dần, không trùng")
    for k in ("p02", "p98"):
        if set(s["stats"][k]) != {"N", "T", "P", "W"}: raise ValueError("thiếu thống kê " + k)

def build_one(lid, lat, lon, args):
    months = months_between(args.start, args.end)
    print("== %s (%.3f, %.3f): %d tháng %s..%s" % (lid, lat, lon, len(months), months[0], months[-1]), flush=True)
    pw = fetch_power(lat, lon, months, args.cache, lid)
    comps = fetch_composites(lat, lon, months, args.cache, lid, args.workers)
    nd_month, cnt = monthly_mean_ndvi([(d, v, r) for d, v, r, q in comps], months)
    N, interp = interpolate(nd_month)
    series = {"T": pw["T"], "P": pw["P"], "W": pw["W"], "N": N}
    rel_count = {}
    for _, _, r, _ in comps: rel_count[str(r)] = rel_count.get(str(r), 0) + 1
    by_season = {}
    for name, ms in SEASONS.items():
        ids = [i for i, m in enumerate(months) if int(m[5:]) in ms]
        by_season[name] = round(100.0 * sum(1 for i in ids if i in set(interp)) / len(ids), 1)
    by_year = {}
    for i in interp: by_year[months[i][:4]] = by_year.get(months[i][:4], 0) + 1
    good = sum(1 for _, v, r, _ in comps if v is not None and r in GOOD_REL)
    out = {
        "version": 1, "id": lid, "lat": lat, "lon": lon, "start": months[0], "n": len(months),
        "built": datetime.date.today().isoformat(),
        "T": [round(v, 2) for v in series["T"]], "P": [round(v, 2) for v in series["P"]],
        "W": [round(v, 2) for v in series["W"]], "N": [round(v, 4) for v in series["N"]],
        "nInterp": interp,
        "stats": {"p02": {k: round(percentile(series[k], 0.02), 4) for k in series},
                  "p98": {k: round(percentile(series[k], 0.98), 4) for k in series},
                  "min": {k: round(min(series[k]), 4) for k in series}, "max": {k: round(max(series[k]), 4) for k in series}},
        "quality": {"composites": len(comps), "goodComposites": good, "reliabilityCounts": rel_count,
                    "monthsInterpolated": len(interp), "pctMonthsInterpolated": round(100.0 * len(interp) / len(months), 1),
                    "longestGapMonths": longest_run(interp), "interpolatedBySeasonPct": by_season, "interpolatedByYear": by_year},
        "sources": {"power": "NASA POWER monthly point, T2M / PRECTOTCORR / WS2M, community AG",
                    "ndvi": "NASA MODIS MOD13Q1 250m 16-day NDVI via ORNL DAAC; chỉ nhận cờ độ tin cậy 0 hoặc 1; tháng gán theo ngày bắt đầu đợt đo; tháng thiếu được nội suy và ghi trong nInterp"},
    }
    check_series(out)
    os.makedirs(args.out, exist_ok=True); path = os.path.join(args.out, lid + ".json"); tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f: json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    with open(tmp, encoding="utf-8") as f: check_series(json.load(f))      # đọc lại và kiểm lần nữa trước khi thay file thật
    os.replace(tmp, path)
    q = out["quality"]
    print("   -> %s (%.1f KB) | đợt tốt %d/%d | tháng nội suy %d/%d (%.1f%%), khoảng trống dài nhất %d tháng" % (
        path, os.path.getsize(path) / 1024, q["goodComposites"], q["composites"], q["monthsInterpolated"], out["n"], q["pctMonthsInterpolated"], q["longestGapMonths"]), flush=True)

def verify(out_dir):
    ok = True
    for fn in sorted(os.listdir(out_dir)):
        if not fn.endswith(".json"): continue
        try:
            s = json.load(open(os.path.join(out_dir, fn), encoding="utf-8")); check_series(s)
            print("OK   %-14s n=%d %s | nội suy %.1f%%" % (fn, s["n"], s["start"], s["quality"]["pctMonthsInterpolated"]))
        except Exception as e:
            ok = False; print("LỖI %-14s %s" % (fn, e))
    return ok

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ids", default="yanan,rondonia,yakutsk,djibouti,hanoi,cantho,phoenix,newyork"); ap.add_argument("--start", default="2006-01"); ap.add_argument("--end", default="2026-06")
    ap.add_argument("--out", default=os.path.join(ROOT, "data", "series"))
    ap.add_argument("--cache", default=os.path.expanduser("~/.cache/green-corner-series"))
    ap.add_argument("--workers", type=int, default=3); ap.add_argument("--selftest", action="store_true"); ap.add_argument("--verify", action="store_true")
    a = ap.parse_args()
    if a.selftest: selftest(); return 0
    if a.verify: return 0 if verify(a.out) else 1
    locs = read_locations(os.path.join(ROOT, "index.html")); failed = []
    for lid in [x.strip() for x in a.ids.split(",") if x.strip()]:
        if lid not in locs: print("Không thấy địa điểm '%s' trong index.html" % lid); failed.append(lid); continue
        try: build_one(lid, locs[lid][0], locs[lid][1], a)
        except Exception as e: print("LỖI %s: %s" % (lid, e)); failed.append(lid)
    print("Xong. Lỗi: %s" % (failed or "không")); return 1 if failed else 0

if __name__ == "__main__":
    sys.exit(main())
