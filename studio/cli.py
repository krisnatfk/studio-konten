"""Buat video dari terminal tanpa Telegram/web.

python -m studio.cli audio.mp3 --naskah naskah.txt [--judul "Kentongan Keempat"] [--tanpa-ai]
"""
import argparse
import shutil
from pathlib import Path

from . import db, pipeline
from .config import Cfg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("--naskah", default="")
    ap.add_argument("--judul", default="")
    ap.add_argument("--gaya", default=Cfg.DEFAULT_STYLE)
    ap.add_argument("--watermark", default=Cfg.WATERMARK)
    ap.add_argument("--fps", type=int, choices=(30, 60), default=Cfg.DEFAULT_FPS)
    ap.add_argument("--tanpa-ai", action="store_true", help="pakai sutradara berbasis aturan")
    a = ap.parse_args()
    if a.tanpa_ai:
        Cfg.LLM_ENABLED = False
    src = Path(a.audio)
    jid = db.create("cli", status="unduh", payload={"fps": a.fps, "audio": "input" + src.suffix.lower(), "style": a.gaya, "title": a.judul, "watermark": a.watermark})
    d = pipeline.jdir(jid)
    shutil.copy(src, d / ("input" + src.suffix.lower()))
    if a.naskah:
        shutil.copy(a.naskah, d / "naskah.txt")
    pipeline.NOTIFIERS.append(lambda j, k, t, p: print(f"  [{k}] {t or ''} {p or ''}"))
    db.update(jid, status="proses")
    job = db.get(jid)
    pipeline.run(job)
    result = db.get(jid)
    print("Job:", jid, result["status"], "->", d / ("final.mp4" if result["status"] == "selesai" else "preview.mp4"))


if __name__ == "__main__":
    main()
