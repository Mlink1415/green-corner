#!/usr/bin/env python3
"""Tạo lại các file âm thanh của tiếng MƯA, SẤM và DẾ từ bản thu gốc của nhóm (cần macOS: dùng afconvert để đổi định dạng).

  python3 tools/build_dem_mua_assets.py --nguon ~/Downloads/Sound --ra /tmp/am-thanh-moi

Đầu vào (trong thư mục --nguon):   "Rain and Thumb.mp3" (mưa nền có sấm, 245 giây),   "Cricket sound.wav" (dế kêu rời, 33,7 giây)
Đầu ra:  rain-loop-v2.wav   vòng mưa 40 giây: lấy đoạn mưa đều không sấm (150 đến 192 giây), làm đều độ to (dao động giữa các
                            cửa sổ 4,5 giây từ 7,6 dB xuống 1,4 dB để cùng lượng mưa luôn nghe to như nhau), nối mượt đầu cuối
         thunder.wav + thunder-clips.json   4 clip sấm cắt từ cùng file (có vào ra mềm)
         cricket-chirps.wav + cricket-chirps.json   24 tiếng dế rời, sạch, cùng mức RMS, tách từ bản thu thật
Chỉ dùng thư viện chuẩn Python 3.9+. Kết quả giống hệt các file trong assets/audio và data (chạy lại cho cùng kết quả)."""
import argparse, array, json, math, os, struct, subprocess, tempfile, wave


def load(p):
    d = open(p, 'rb').read(); i = 12; sr = 22050; data = None
    while i < len(d) - 8:
        cid = d[i:i + 4]; sz = struct.unpack('<I', d[i + 4:i + 8])[0]
        if cid == b'fmt ': sr = struct.unpack('<I', d[i + 12:i + 16])[0]
        if cid == b'data': data = d[i + 8:i + 8 + sz]; break
        i += 8 + sz + (sz & 1)
    a = array.array('h'); a.frombytes(data[:len(data) // 2 * 2]); return [x / 32768 for x in a], sr


def save(p, x, sr):
    w = wave.open(p, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    a = array.array('h', [max(-32768, min(32767, int(round(v * 32767)))) for v in x]); w.writeframes(a.tobytes()); w.close()


peak = lambda x: max(abs(v) for v in x) if x else 0
rms = lambda x: math.sqrt(sum(v * v for v in x) / max(1, len(x)))
db = lambda v: 20 * math.log10(max(v, 1e-9))


def mono22(nguon, ra):   # đổi sang WAV mono 22,05 kHz 16-bit bằng afconvert của macOS
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@22050', '-c', '1', nguon, ra], check=True)


def mua_vong(x, sr):
    seg = x[int(146 * sr):int(201 * sr)]
    h = int(0.25 * sr); w = int(0.5 * sr)
    pts = [db(rms(seg[i:i + w])) for i in range(0, len(seg) - w, h)]
    K = 12   # làm mượt 3 giây
    sm = [sum(pts[max(0, i - K // 2):i + K // 2 + 1]) / len(pts[max(0, i - K // 2):i + K // 2 + 1]) for i in range(len(pts))]
    target = sum(sm) / len(sm); gains = [max(-9, min(9, target - v)) for v in sm]   # kéo về mức TB, tối đa ±9 dB
    out = []
    for n in range(len(seg)):
        t = n / h; i = min(int(t), len(gains) - 2); f = t - i
        out.append(seg[n] * 10 ** ((gains[i] * (1 - f) + gains[i + 1] * f) / 20))
    seg2 = out[int(4 * sr):int(46 * sr)]
    cf = int(2 * sr); n = len(seg2) - cf; loop = []
    for i in range(n):
        if i < cf:
            t = i / cf; loop.append(seg2[i] * math.sin(t * math.pi / 2) + seg2[n + i] * math.cos(t * math.pi / 2))   # trộn công suất đều
        else: loop.append(seg2[i])
    g = 0.7079 / peak(loop); return [v * g for v in loop]       # đỉnh -3 dBFS


def sam(x, sr):
    clips = [(8.5, 15.5), (44.5, 51.5), (89.5, 98.5), (217.0, 225.0)]; thunder = []
    for a, b in clips:
        s = x[int(a * sr):int(b * sr)]; fi = int(0.25 * sr); fo = int(1.5 * sr)
        for i in range(min(fi, len(s))): s[i] *= i / fi
        for i in range(min(fo, len(s))): s[-1 - i] *= i / fo
        thunder.append(s)
    gt = 0.7079 / max(peak(s) for s in thunder); cut = []; offs = []; pos = 0.0
    for s in thunder:
        seg2 = [v * gt for v in s] + [0.0] * int(0.1 * sr)
        offs.append([round(pos, 3), round(pos + len(seg2) / sr - 0.1, 3)]); cut += seg2; pos += len(seg2) / sr
    return cut, offs


def de(a, sr, so_luong=24):
    h = int(sr * 0.005); e = [math.sqrt(sum(v * v for v in a[i:i + h]) / h) for i in range(0, len(a) - h, h)]; ms = 5
    thr = max(e) * 0.2; g = []
    for i, v in enumerate(e):
        if v > thr:
            if g and (i - g[-1][1]) * ms <= 60: g[-1][1] = i
            else: g.append([i, i])
    gs = [(s * ms / 1000, (t + 1) * ms / 1000) for s, t in g]
    nen = sorted(e)[len(e) // 5]; ok = []
    for i, (s, t) in enumerate(gs):
        d = t - s
        if d < 0.05 or d > 0.30: continue
        prev = gs[i - 1][1] if i > 0 else -9; nxt = gs[i + 1][0] if i < len(gs) - 1 else 1e9
        if s - prev < 0.12 or nxt - t < 0.12: continue        # phải tách biệt, không dính tiếng khác
        ok.append((db(peak(a[int(s * sr):int(t * sr)])) - db(nen), s, t))
    ok.sort(reverse=True); chon = sorted(ok[:so_luong], key=lambda r: r[1]); out = []
    for snr, s, t in chon:
        seg = a[max(0, int((s - 0.02) * sr)):min(len(a), int((t + 0.06) * sr))]; fi = int(0.005 * sr); fo = int(0.04 * sr)
        for i in range(min(fi, len(seg))): seg[i] *= i / fi
        for i in range(min(fo, len(seg))): seg[-1 - i] *= i / fo
        r = rms(seg); out.append([v / r * 0.1 for v in seg])      # cùng mức RMS (~ -20 dBFS)
    gp = 0.7079 / max(peak(s) for s in out); flat = []; offs = []; pos = 0.0
    for seg in out:
        seg = [v * gp for v in seg] + [0.0] * int(0.03 * sr); offs.append([round(pos, 3), round(pos + len(seg) / sr - 0.03, 3)]); flat += seg; pos += len(seg) / sr
    return flat, offs


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--nguon', required=True); ap.add_argument('--ra', required=True); a = ap.parse_args()
    os.makedirs(a.ra, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        mono22(os.path.join(a.nguon, 'Rain and Thumb.mp3'), os.path.join(tmp, 'mua.wav')); mono22(os.path.join(a.nguon, 'Cricket sound.wav'), os.path.join(tmp, 'de.wav'))
        x, sr = load(os.path.join(tmp, 'mua.wav'))
        save(os.path.join(a.ra, 'rain-loop-v2.wav'), mua_vong(x, sr), sr)
        cut, offs = sam(x, sr); save(os.path.join(a.ra, 'thunder.wav'), cut, sr); json.dump(offs, open(os.path.join(a.ra, 'thunder-clips.json'), 'w'), separators=(',', ':'))
        y, sr2 = load(os.path.join(tmp, 'de.wav')); flat, offs2 = de(y, sr2)
        save(os.path.join(a.ra, 'cricket-chirps.wav'), flat, sr2); json.dump(offs2, open(os.path.join(a.ra, 'cricket-chirps.json'), 'w'), separators=(',', ':'))
    print('Đã ghi vào', a.ra)
