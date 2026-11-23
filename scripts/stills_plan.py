"""Frame uji dari plan.json sebuah job tanpa render penuh.

python scripts/stills_plan.py <job> [plan.json] [--per 2] [--scenes 3,4,5]
-> data/jobs/<job>/stills/sheetN.jpg (label: adegan, waktu, template)
"""
import json, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from studio import db, director, pipeline, render  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

args = sys.argv[1:]
jid = args[0]
d = pipeline.jdir(jid)
planf = Path(args[1]) if len(args) > 1 and not args[1].startswith("--") else d / "plan.json"
per = int(args[args.index("--per") + 1]) if "--per" in args else 2
only = {int(x) for x in args[args.index("--scenes") + 1].split(",")} if "--scenes" in args else None
job = db.get(jid)
style = director.load_style(job["payload"].get("style"))
c = json.loads((d / "cues.json").read_text())
p = json.loads(planf.read_text())
p = director.normalize(p, c["cues"], director.load_catalog(style))[0]
rplan, html = pipeline._build(job, p, c["cues"], c["events"], c["duration"], style)
pts = []
for k, s in enumerate(rplan["scenes"]):
    if only and k + 1 not in only:
        continue
    for f in [(i + 1) / (per + 1) for i in range(per)]:
        pts.append((k + 1, round(s["start"] + (s["end"] - s["start"]) * f, 2), s["template"]))
out = d / "stills"
shutil.rmtree(out, ignore_errors=True)
out.mkdir()
subprocess.run(render._worker_cmd(html, out, ["--times", ",".join(str(t) for _, t, _ in pts), "--prefix", "st"]), cwd=str(ROOT), check=True)
fs = sorted(out.glob("st*.jpg"))
for g in range(0, len(fs), 12):
    im = Image.new("RGB", (6 * 360, 2 * 662), "#111")
    dr = ImageDraw.Draw(im)
    for i, (f, (k, t, tp)) in enumerate(zip(fs[g:g + 12], pts[g:g + 12])):
        x, y = (i % 6) * 360, (i // 6) * 662
        im.paste(Image.open(f).resize((360, 640)), (x, y))
        dr.text((x + 6, y + 644), f"A{k} {t:.1f}s {tp}", fill="white")
    im.save(out / f"sheet{g // 12:02d}.jpg", quality=85)
print(len(fs), "frame ->", out)
