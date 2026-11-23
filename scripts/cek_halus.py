"""Cek kehalusan video: cari lonjakan perubahan antar-frame (tanda patah-patah / kedip / potongan kasar).

Pemakaian: python scripts/cek_halus.py video.mp4 [render_plan.json]
Lulus bila tidak ada frame yang melonjak (beda > BATAS dan > 1,8x tetangganya) kecuali fade pembuka/penutup.
Dengan render_plan, lonjakan dilaporkan beserta jaraknya ke batas adegan terdekat.
"""
from fractions import Fraction
import json
import subprocess
import sys

import numpy as np

BATAS = 12.0  # rata-rata beda piksel (0-255) pada gambar 90x160 abu-abu


def main(video, plan=None):
    w, h = 90, 160
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vf", f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"],
                         capture_output=True, check=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.int16)
    d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
    rate = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=avg_frame_rate", "-of", "csv=p=0", video], text=True).strip()
    fps = float(Fraction(rate))
    dur = len(f) / fps
    bounds = [s["start"] for s in json.load(open(plan))["scenes"]] if plan else []
    # lompatan = satu frame jauh di atas tetangganya; gerak cepat yang kontinu (tetangga mirip) bukan lompatan
    def neigh(i):
        nb = np.r_[d[max(0, i - 4):max(0, i - 1)], d[i + 2:i + 5]]
        return float(np.max(nb)) if len(nb) else 0.0
    bad = [(i + 1) / fps for i in np.where(d > BATAS)[0] if 0.6 < (i + 1) / fps < dur - 0.6 and d[i] > 1.8 * neigh(i)]
    print(f"frame {len(f)}  median beda {np.median(d):.2f}  p99 {np.percentile(d, 99):.2f}  maks {d.max():.1f}")
    for t in bad[:40]:
        near = min(bounds, key=lambda x: abs(x - t)) if bounds else None
        print(f"  lonjakan {t:7.2f}s beda {d[int(t * fps) - 1]:5.1f}" + (f"  (batas adegan {near:.2f}, {t - near:+.2f}s)" if near is not None else ""))
    print("LULUS" if not bad else f"GAGAL: {len(bad)} frame melonjak")
    return not bad


if __name__ == "__main__":
    sys.exit(0 if main(*sys.argv[1:3]) else 1)
