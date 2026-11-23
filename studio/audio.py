"""Analisis audio dengan ffmpeg: durasi dan segmen bicara (dari deteksi jeda)."""
import re
import subprocess


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)


def duration(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]).stdout.strip()
    return float(out)


def to_wav(src, dst, sr=44100, mono=False):
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(src), "-ar", str(sr)]
    if mono:
        cmd += ["-ac", "1"]
    run(cmd + [str(dst)])
    return dst


def _silences(path, noise_db, min_d):
    p = subprocess.run(["ffmpeg", "-i", str(path), "-af", f"silencedetect=n={noise_db}dB:d={min_d}", "-f", "null", "-"],
                       capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", p.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", p.stderr)]
    return list(zip(starts, ends + [None] * (len(starts) - len(ends))))


def mean_volume(path):
    p = subprocess.run(["ffmpeg", "-i", str(path), "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True)
    m = re.search(r"mean_volume: (-?[0-9.]+) dB", p.stderr)
    return float(m.group(1)) if m else -25.0


def speech_segments(path, dur=None, noise_db=None, min_gap=0.18):
    """Kembalikan daftar (mulai, selesai) bagian yang berisi suara."""
    dur = dur or duration(path)
    if noise_db is None:
        noise_db = max(-50.0, min(-34.0, mean_volume(path) - 20.0))
    sil = _silences(path, noise_db, min_gap)
    segs, cur = [], 0.0
    for s, e in sil:
        if s - cur > 0.06:
            segs.append((round(cur, 3), round(s, 3)))
        cur = e if e is not None else dur
    if dur - cur > 0.06:
        segs.append((round(cur, 3), round(dur, 3)))
    # buang potongan yang sangat pendek (klik/napas)
    segs = [x for x in segs if x[1] - x[0] >= 0.08]
    return segs, noise_db
