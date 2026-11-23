"""Proses render terpisah: buka page.html di Chrome headless, render frame tertentu ke JPG.

python -m studio.render_worker page.html out_dir --fps 30 --start 0 --end 900
python -m studio.render_worker page.html out_dir --times 1.5,4.2,8.0 --prefix sb
"""
import argparse
import os

from playwright.sync_api import sync_playwright


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("html")
    ap.add_argument("out")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--end", type=int, default=0)
    ap.add_argument("--times", default="")
    ap.add_argument("--art-only", action="store_true")
    ap.add_argument("--prefix", default="f")
    ap.add_argument("--quality", type=int, default=92)
    ap.add_argument("--chrome", default="")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    with sync_playwright() as pw:
        kw = {"args": ["--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--force-color-profile=srgb"]}
        if a.chrome:
            kw["executable_path"] = a.chrome
        br = pw.chromium.launch(**kw)
        pg = br.new_page(viewport={"width": 1080, "height": 1920})
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto("file://" + os.path.abspath(a.html))
        try:
            pg.wait_for_function("window.__ready === true", timeout=60000)
        except Exception:
            raise SystemExit("Halaman animasi gagal dimuat: " + (errors[0] if errors else "timeout"))
        pg.evaluate("document.fonts.ready")
        if errors:
            raise SystemExit("Kesalahan di halaman animasi: " + errors[0])
        if a.art_only:
            pg.add_style_tag(content="#sub,#title,#hdr,#wm,#grain,#dust,#flash {visibility:hidden!important}")
        if a.times:
            for i, t in enumerate(float(x) for x in a.times.split(",")):
                pg.evaluate(f"render({t})")
                if errors:
                    raise SystemExit("Kesalahan animasi: " + errors[0])
                pg.screenshot(path=os.path.join(a.out, f"{a.prefix}{i:03d}.jpg"), type="jpeg", quality=a.quality)
        else:
            for f in range(a.start, a.end):
                pg.evaluate(f"render({f / a.fps})")
                if errors:
                    raise SystemExit("Kesalahan animasi: " + errors[0])
                pg.screenshot(path=os.path.join(a.out, f"{a.prefix}{f:05d}.jpg"), type="jpeg", quality=a.quality)
        br.close()


if __name__ == "__main__":
    main()
