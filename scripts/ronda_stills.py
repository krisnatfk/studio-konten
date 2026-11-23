"""Frame uji untuk film Pos Ronda: python scripts/ronda_stills.py <source_job> [t1,t2,...] -> lembar grpN.jpg."""
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))
import render_ronda_cinematic as R  # noqa: E402
from studio import director, render  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

R.SOURCE = Path(sys.argv[1]).resolve()
R.WORK = R.SOURCE / "film"
R.WORK.mkdir(exist_ok=True)
rp = R.plan()
page = render.build_page(rp, R.WORK / "page.html", director.load_style("horor_kampung"),
                         extra_scenes=[ROOT / "scripts/ronda_film.js"])
times = [float(x) for x in sys.argv[2].split(",")] if len(sys.argv) > 2 else \
    [round(s["start"] + (s["end"] - s["start"]) * 0.6, 2) for s in rp["scenes"]]
d = R.WORK / "stills"
shutil.rmtree(d, ignore_errors=True)
d.mkdir()
subprocess.run(render._worker_cmd(page, d, ["--times", ",".join(map(str, times)), "--prefix", "st"]), cwd=str(ROOT), check=True)
fs = sorted(d.glob("st*.jpg"))
for g in range(0, len(fs), 12):
    im = Image.new("RGB", (6 * 360, 2 * 662), "#111")
    dr = ImageDraw.Draw(im)
    for i, (f, t) in enumerate(zip(fs[g:g + 12], times[g:g + 12])):
        x, y = (i % 6) * 360, (i // 6) * 662
        im.paste(Image.open(f).resize((360, 640)), (x, y))
        dr.text((x + 6, y + 644), f"#{g + i + 1}  {t:.2f}s", fill="white")
    im.save(R.WORK / f"grp{g // 12}.jpg", quality=85)
print(len(fs), "frame", R.WORK)
