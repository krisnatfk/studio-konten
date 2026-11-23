"""Render ulang sebuah job dari plan.json yang sudah diedit tangan (tanpa memanggil LLM sutradara).

Pemakaian: python scripts/render_ulang.py <job_id> [--review]
Memakai cues.json + plan.json di data/jobs/<job_id>/, menulis final.mp4 / preview.mp4 + quality_report.json.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from studio import db, director, pipeline  # noqa: E402

jid = sys.argv[1]
job = db.get(jid)
d = pipeline.jdir(jid)
style = director.load_style(job["payload"].get("style"))
c = json.loads((d / "cues.json").read_text())
p = json.loads((d / "plan.json").read_text())
p = director.normalize(p, c["cues"], director.load_catalog(style))[0] | {"sumber": p.get("sumber", "manual")}
out = pipeline.produce(job, pipeline._log(jid), p, c["cues"], c["events"], c["duration"], style, ai_review="--review" in sys.argv)
q = json.loads((d / "quality_report.json").read_text())
print(json.dumps({"video": str(out), "lulus": q["passed"], "masalah": q["issues"]}, ensure_ascii=False, indent=1))
