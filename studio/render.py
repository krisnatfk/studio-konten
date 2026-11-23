"""Rakit page.html, render frame paralel, storyboard, dan encode MP4."""
import json
import math
import os
import shutil
import subprocess
import sys
import time

from PIL import Image, ImageDraw, ImageChops, ImageStat
from . import coverage
from .config import Cfg, ROOT


def build_page(rplan, out_html, style=None, *, extra_scenes=()):
    """Rakit halaman: engine/core.js + engine/lib/*.js (bersama) + styles/<nama>/scenes/*.js (+ page.html milik style bila ada)."""
    from pathlib import Path
    sdir = Path(style["_dir"]) if style else Cfg.STYLES_DIR / Cfg.DEFAULT_STYLE
    page = sdir / "page.html" if (sdir / "page.html").exists() else Cfg.ENGINE_DIR / "page.html"
    tpl = page.read_text(encoding="utf-8")
    core = (Cfg.ENGINE_DIR / "core.js").read_text(encoding="utf-8")
    library = sdir / "library"
    if (library / "manifest.json").exists():
        core += "\nwindow.HOROR_LIBRARY=" + (library / "manifest.json").read_text() + ";"
        core += "\nwindow.HOROR_ASSETS=" + (library / "assets.json").read_text() + ";"
    core += "\n" + "\n".join(p.read_text(encoding="utf-8") for p in sorted((Cfg.ENGINE_DIR / "lib").glob("*.js")))
    scene_paths = [*sorted((sdir / "scenes").glob("*.js")), *extra_scenes]
    scenes = "\n".join(p.read_text(encoding="utf-8") for p in scene_paths)
    plan_js = json.dumps(rplan, ensure_ascii=False).replace("</", "<\\/")
    html = tpl.replace("/*__CORE__*/", core).replace("/*__SCENES__*/", scenes).replace("/*__PLAN__*/", plan_js)
    out_html.write_text(html, encoding="utf-8")
    return out_html


def workers():
    if Cfg.RENDER_WORKERS > 0:
        return Cfg.RENDER_WORKERS
    return max(1, min(10, (os.cpu_count() or 2) // 2))


def _worker_cmd(html, out, extra):
    cmd = [sys.executable, "-m", "studio.render_worker", str(html), str(out), "--quality", str(Cfg.JPEG_QUALITY)] + extra
    if Cfg.CHROME_PATH:
        cmd += ["--chrome", Cfg.CHROME_PATH]
    return cmd


def render_frames(html, out_dir, duration, progress=None):
    out_dir.mkdir(parents=True, exist_ok=True)
    n = int(math.ceil(duration * Cfg.FPS))
    W = workers()
    step = math.ceil(n / W)
    procs = []
    for w in range(W):
        a, b = w * step, min(n, (w + 1) * step)
        if a >= b:
            continue
        procs.append(subprocess.Popen(_worker_cmd(html, out_dir, ["--fps", str(Cfg.FPS), "--start", str(a), "--end", str(b)]),
                                      cwd=str(ROOT), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True))
    last = 0
    while any(p.poll() is None for p in procs):
        time.sleep(2)
        if progress:
            done = len(os.listdir(out_dir))
            if done - last >= n * 0.02:
                last = done
                progress(done / n)
    for p in procs:
        if p.returncode != 0:
            raise RuntimeError("Render gagal: " + (p.stderr.read() or "")[-800:])
    return n


def storyboard(html, rplan, out_jpg, tmp_dir):
    planned = coverage.shots(rplan)
    cells = [(s["no"], m) for s in planned for m in s["moments"]]
    if not cells:  # Preview previously saved render plans.
        cells = [(i, {"t": (s["start"]+s["end"])/2, "id": str(i)})
                 for i,s in enumerate(rplan["scenes"], 1)]
    times = ",".join(str(m["t"]) for _,m in cells)
    tmp_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(_worker_cmd(html, tmp_dir, ["--times", times, "--prefix", "sb", "--art-only"]),
                   cwd=str(ROOT), check=True, capture_output=True, text=True)
    cols = math.ceil(math.sqrt(len(cells)*1.6))
    rows = math.ceil(len(cells)/cols)
    width = max(1, min(190, 4096//cols, int((65500/rows-23)*9/16)))
    height = round(width*16/9)
    sheet = Image.new("RGB", (cols*width, rows*(height+23)), "#17191b")
    draw = ImageDraw.Draw(sheet)
    signatures, duplicates = {}, {}
    for i, (_, m) in enumerate(cells):
        with Image.open(tmp_dir / f"sb{i:03d}.jpg") as im:
            im.thumbnail((360,640), Image.Resampling.LANCZOS)
            im.save(tmp_dir / f"key-{m['id']}.jpg", quality=90)
            thumb = im.convert("RGB").resize((width,height), Image.Resampling.LANCZOS)
        x, y = (i%cols)*width, (i//cols)*(height+23)
        sheet.paste(thumb, (x,y))
        draw.text((x+5,y+height+3), f"Shot {m['id']}  |  {m['t']:.2f} s", fill="white")
        # Compare clean artwork globally. Color and coarse structure survive JPEG
        # noise and small atmospheric movements. Semantic repeats are reviewed separately.
        signature = thumb.resize((36,64), Image.Resampling.BOX)
        for key, other in signatures.items():
            delta = ImageStat.Stat(ImageChops.difference(signature, other))
            if max(delta.rms) < 4:
                duplicates[m["id"]] = key
                break
        else:
            signatures[m["id"]] = signature
        (tmp_dir / f"sb{i:03d}.jpg").unlink()
    current_keys = {f"key-{m['id']}.jpg" for _,m in cells}
    for old in tmp_dir.glob("key-*.jpg"):
        if old.name not in current_keys:
            old.unlink()
    sheet.save(out_jpg, quality=88)
    (tmp_dir / "duplicates.json").write_text(json.dumps(duplicates))
    return out_jpg


def encode(frames_dir, audio, out, duration):
    base = ["ffmpeg", "-y", "-v", "error", "-framerate", str(Cfg.FPS), "-i", str(frames_dir / "f%05d.jpg"), "-i", str(audio),
            "-c:v", "libx264", "-preset", Cfg.X264_PRESET, "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart", "-t", f"{duration:.3f}"]
    subprocess.run(base + ["-crf", str(Cfg.X264_CRF), str(out)], check=True)
    if Cfg.MAX_VIDEO_MB > 0 and out.stat().st_size > Cfg.MAX_VIDEO_MB * 1024 * 1024:
        kbps = int(Cfg.MAX_VIDEO_MB * 8 * 1024 * 0.95 / duration - 200)
        tmp = out.with_suffix(".tmp.mp4")
        subprocess.run(base + ["-b:v", f"{kbps}k", "-maxrate", f"{int(kbps * 1.4)}k", "-bufsize", f"{kbps * 2}k", str(tmp)], check=True)
        tmp.replace(out)
    return out
