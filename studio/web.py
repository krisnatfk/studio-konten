"""Dashboard web (http.server bawaan Python, tanpa framework)."""
import base64
import json
import os
import re
import threading
from email.parser import BytesParser
from email.policy import default as email_default
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

from . import db, director, pipeline, transcribe
from .config import Cfg, ROOT
from . import library, coverage

FILES = {"final.mp4": "video/mp4", "storyboard.jpg": "image/jpeg", "page.html": "text/html; charset=utf-8",
         "plan.json": "application/json", "render_plan.json": "application/json", "cues.json": "application/json",
         "log.txt": "text/plain; charset=utf-8", "naskah.txt": "text/plain; charset=utf-8", "mix.m4a": "audio/mp4",
         "preview.mp4": "video/mp4", "quality_report.json": "application/json", "review_report.json": "application/json"}
FILES["input.mp3"] = "audio/mpeg"


def _job_view(j):
    d = pipeline.jdir(j["id"])
    return {**{k: j[k] for k in ("id", "created", "status", "task", "title", "error", "progress", "source")},
            "has_video": (d / "final.mp4").exists() or (d / "preview.mp4").exists(), "video_file": "preview.mp4" if j["status"] == "draft_review" or not (d / "final.mp4").exists() else "final.mp4", "has_storyboard": (d / "storyboard.jpg").exists(),
            "has_audio": (d / "input.mp3").exists()}


class H(BaseHTTPRequestHandler):
    server_version = "HororStudio"

    def log_message(self, *a):
        pass

    # ---------- util ----------
    def _auth(self):
        if not Cfg.WEB_PASSWORD:
            return True
        h = self.headers.get("Authorization", "")
        if h.startswith("Basic "):
            try:
                if base64.b64decode(h[6:]).decode().split(":", 1)[1] == Cfg.WEB_PASSWORD:
                    return True
            except Exception:
                pass
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="Horor Studio"')
        self.end_headers()
        return False

    def _json(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(n) if n else b""

    def _file(self, path, ctype):
        size = os.path.getsize(path)
        rng = self.headers.get("Range")
        start, end = 0, size - 1
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)", rng)
            if m:
                if m.group(1):
                    start = int(m.group(1))
                if m.group(2):
                    end = min(size - 1, int(m.group(2)))
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        with open(path, "rb") as f:
            f.seek(start)
            left = end - start + 1
            while left > 0:
                ch = f.read(min(1 << 16, left))
                if not ch:
                    break
                try:
                    self.wfile.write(ch)
                except (BrokenPipeError, ConnectionResetError):
                    return
                left -= len(ch)

    # ---------- GET ----------
    def do_GET(self):
        if not self._auth():
            return
        path = unquote(urlparse(self.path).path)
        if path in ("/", "/index.html"):
            return self._file(str(ROOT / "studio" / "web" / "index.html"), "text/html; charset=utf-8")
        if path == "/library":
            return self._file(str(ROOT / "studio/web/library.html"), "text/html; charset=utf-8")
        preview = re.fullmatch(r"/library/preview/([a-z_]+)", path)
        if preview and preview[1] in director.load_catalog("horor_kampung"):
            body = (ROOT / "studio/web/library_preview.html").read_text().replace("__SOURCE__", "/library/files/" + preview[1] + "/page.html").encode()
            self.send_response(200);self.send_header("Content-Type","text/html; charset=utf-8");self.send_header("Content-Length",str(len(body)));self.end_headers();self.wfile.write(body);return
        if path == "/api/library/assets":
            return self._json(json.loads((Cfg.STYLES_DIR / "horor_kampung/library/assets.json").read_text()))
        asset_match = re.fullmatch(r"/library/asset/([a-z_]+)", path)
        if asset_match:
            asset = json.loads((Cfg.STYLES_DIR / "horor_kampung/library/assets.json").read_text())["assets"].get(asset_match[1])
            if asset:
                from .director import _SAFE_PATH
                if _SAFE_PATH.fullmatch(asset["path"]):
                    body = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220"><rect width="220" height="220" fill="#171219"/><g transform="translate(10,10)"><path d="' + asset["path"] + '" fill="#59442d" stroke="#bd9b67" stroke-width="3" fill-rule="evenodd"/></g></svg>').encode()
                    self.send_response(200);self.send_header("Content-Type","image/svg+xml");self.send_header("Content-Length",str(len(body)));self.end_headers();self.wfile.write(body);return
        if path == "/api/library":
            cat = director.load_catalog("horor_kampung")
            refs = json.loads((Cfg.STYLES_DIR / "horor_kampung/library/references.json").read_text())
            evaluations = {}
            for template in cat:
                path = Cfg.DATA_DIR / "library" / library.VERSION / template / "review.json"
                if path.exists():
                    try:
                        row = json.loads(path.read_text())
                        if row.get("source_fingerprint") == library.source_fingerprint("horor_kampung", [template]):
                            evaluations[template] = {key:row.get(key) for key in ("score","issue","technical_issues")}
                    except (OSError, ValueError):
                        pass

            return self._json({"version": library.VERSION, "templates": [dict(id=k, evaluation=evaluations.get(k), label=v.get("metadata", {}).get("label", k.replace("_", " ")), description=v["desc"], category=v.get("metadata", {}).get("category", "legacy"), era=v.get("metadata", {}).get("era", "any"), assets=v.get("metadata", {}).get("assets", []), verified=any(r.get("status")=="verified" and r.get("evidence",{}).get("source_fingerprint")==library.source_fingerprint("horor_kampung",[k]) for r in refs if r["template"]==k), references=[r for r in refs if r["template"] == k]) for k,v in cat.items()]})
        lm = re.fullmatch(r"/library/files/([a-z_]+)/([a-z.]+)", path)
        if lm and lm[1] in director.load_catalog("horor_kampung") and lm[2] in ("demo.mp4", "thumb.jpg", "page.html", "contact.jpg", "review.json"):
            target = Cfg.DATA_DIR / "library" / library.VERSION / lm[1] / lm[2]
            if target.exists():
                return self._file(str(target), {"mp4":"video/mp4", "jpg":"image/jpeg", "html":"text/html; charset=utf-8", "json":"application/json"}[target.suffix[1:]])
        if path == "/api/info":
            return self._json({"minimum_shots": coverage.MIN_SHOTS, "minimum_moments": coverage.MIN_MOMENTS,
                               "llm": director.llm_ok(), "llm_model": Cfg.LLM_MODEL,
                               "llm_reasoning_effort": Cfg.LLM_REASONING_EFFORT, "whisper": transcribe.available(),
                               "whisper_mode": Cfg.WHISPER_MODE, "styles": director.list_styles(), "catalogs": {s: director.load_catalog(s) for s in director.list_styles()},
                               "catalog": director.load_catalog(Cfg.DEFAULT_STYLE),
                               "default_style": Cfg.DEFAULT_STYLE, "watermark": Cfg.WATERMARK})
        if path == "/api/jobs":
            return self._json([_job_view(j) for j in db.recent(60)])
        m = re.match(r"^/api/jobs/([\w-]+)$", path)
        if m:
            j = db.get(m.group(1))
            if not j:
                return self._json({"error": "tidak ada"}, 404)
            d = pipeline.jdir(j["id"])
            out = _job_view(j)
            out["style"] = j["payload"].get("style") or Cfg.DEFAULT_STYLE
            for k in ("plan", "cues", "quality_report", "review_report"):
                p = d / f"{k}.json"
                out[k] = json.loads(p.read_text(encoding="utf-8")) if p.exists() else None
            rp = d / "render_plan.json"
            out["scenes"] = json.loads(rp.read_text(encoding="utf-8"))["scenes"] if rp.exists() else None
            lg = d / "log.txt"
            out["log"] = lg.read_text(encoding="utf-8")[-4000:] if lg.exists() else ""
            nk = d / "naskah.txt"
            out["naskah"] = nk.read_text(encoding="utf-8") if nk.exists() else ""
            return self._json(out)
        keyframe = re.fullmatch(r"/files/([\w-]+)/keyframes/(\d+\.\d+)\.jpg", path)
        if keyframe:
            image = pipeline.jdir(keyframe[1]) / "_sb" / f"key-{keyframe[2]}.jpg"
            if image.is_file():
                return self._file(str(image), "image/jpeg")
        m = re.match(r"^/files/([\w-]+)/([\w.]+)$", path)
        if m and m.group(2) in FILES:
            p = pipeline.jdir(m.group(1)) / m.group(2)
            if p.exists():
                return self._file(str(p), FILES[m.group(2)])
        self.send_error(404)

    # ---------- POST ----------
    def do_POST(self):
        if not self._auth():
            return
        path = urlparse(self.path).path
        if path == "/api/jobs":
            ctype = self.headers.get("Content-Type", "")
            body = self._body()
            msg = BytesParser(policy=email_default).parsebytes(b"Content-Type: " + ctype.encode() + b"\r\n\r\n" + body)
            fields, audio_name, audio_data = {}, None, None
            for part in msg.iter_parts():
                name = part.get_param("name", header="content-disposition")
                if name == "audio" and part.get_filename():
                    audio_name, audio_data = part.get_filename(), part.get_payload(decode=True)
                elif name and not part.get_filename():
                    fields[name] = part.get_content()
            source = fields.get("audio_source", "upload")
            naskah = (fields.get("naskah") or "").strip()
            if source != "upload":
                return self._json({"error": "Unggah file audio secara manual."}, 400)
            if not audio_data:
                return self._json({"error": "file audio wajib"}, 400)
            ext = os.path.splitext(audio_name)[1].lower() or ".mp3"
            fps = fields.get("fps")
            payload = {"fps": int(fps) if fps in ("30", "60") else Cfg.DEFAULT_FPS, "audio": "input" + ext, "style": fields.get("gaya") or Cfg.DEFAULT_STYLE, "title": (fields.get("judul") or "").strip(),
                       "watermark": fields.get("watermark", Cfg.WATERMARK), "extra": (fields.get("catatan") or "").strip()}
            jid = db.create("web", status="unduh", payload=payload)
            d = pipeline.jdir(jid)
            (d / payload["audio"]).write_bytes(audio_data)
            if naskah:
                (d / "naskah.txt").write_text(naskah, encoding="utf-8")
            if not naskah and not transcribe.available():
                db.update(jid, status="gagal", error="Whisper tidak aktif: naskah wajib diisi.")
            else:
                db.update(jid, status="antri")
            return self._json({"id": jid})
        m = re.match(r"^/api/jobs/([\w-]+)/(plan|replan|edit|render|repair|cancel)$", path)
        if m:
            jid, act = m.groups()
            j = db.get(jid)
            if not j:
                return self._json({"error": "tidak ada"}, 404)
            if j["status"] in db.ACTIVE and act != "cancel":
                return self._json({"error": "job sedang diproses"}, 409)
            data = json.loads(self._body() or b"{}")
            if act == "plan":
                (pipeline.jdir(jid) / "plan.json").write_text(json.dumps(data["plan"], ensure_ascii=False, indent=1), encoding="utf-8")
                db.enqueue(jid, "render")
            elif act == "replan":
                db.enqueue(jid, "replan", {"extra": data.get("extra", "")})
            elif act == "edit":
                db.enqueue(jid, "edit", {"instruction": data.get("instruction", "")})
            elif act == "repair":
                db.enqueue(jid, "repair")
            elif act == "render":
                db.enqueue(jid, "render")
            elif act == "cancel":
                if j["status"] == "antri":
                    db.update(jid, status="batal")
            return self._json({"ok": True})
        self.send_error(404)


def start():
    srv = ThreadingHTTPServer((Cfg.WEB_HOST, Cfg.WEB_PORT), H)
    threading.Thread(target=srv.serve_forever, daemon=True, name="web").start()
    print(f"Dashboard web: http://{Cfg.WEB_HOST}:{Cfg.WEB_PORT}")
    return srv
