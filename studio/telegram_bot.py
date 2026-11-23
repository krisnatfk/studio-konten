"""Bot Telegram (Bot API langsung lewat requests, long polling)."""
import html
import json
import os
import shutil
import threading
import time

import requests

from . import db, director, pipeline, tg_ui
from .config import Cfg

AUDIO_EXT = (".mp3", ".wav", ".m4a", ".ogg", ".oga", ".flac", ".aac", ".opus")

# tombol keyboard balasan -> perintah
BUTTONS = {
    "📊 Status": "/status",
    "🎨 Gaya": "/gaya",
    "📜 Template": "/template",
    "🖋 Watermark": "/watermark",
    "📋 Menu": "/menu",
    "📖 Bantuan": "/help",
}

COMMANDS = [
    ("menu", "Menu utama"),
    ("help", "Cara pakai"),
    ("status", "Status job terakhir"),
    ("ubah", "Ubah adegan video terakhir"),
    ("ulang", "Susun ulang semua adegan"),
    ("judul", "Ganti judul video"),
    ("render", "Render ulang"),
    ("template", "Daftar adegan"),
    ("gaya", "Pilih gaya visual"),
    ("watermark", "Atur teks akun"),
    ("batal", "Batalkan job antre"),
]


def esc(x):
    return tg_ui.esc(x)


class Bot:
    def __init__(self):
        self.api = f"{Cfg.TG_API}/bot{Cfg.TG_TOKEN}"
        self.file_api = f"{Cfg.TG_API}/file/bot{Cfg.TG_TOKEN}"
        self.offset = 0
        self.pending = {}       # chat_id -> (naskah, waktu)
        self.awaiting = {}      # chat_id -> (jenis, jid) untuk input lanjutan
        self.progress_mid = {}  # jid -> message_id kartu progres
        self.settings_p = Cfg.DATA_DIR / "chat_settings.json"
        self.settings = json.loads(self.settings_p.read_text()) if self.settings_p.exists() else {}
        self.lock = threading.Lock()

    # ---------- API ----------
    def call(self, method, files=None, timeout=60, **params):
        for attempt in range(3):
            try:
                if files:
                    r = requests.post(f"{self.api}/{method}", data=params, files=files, timeout=600)
                else:
                    r = requests.post(f"{self.api}/{method}", json=params, timeout=timeout)
                j = r.json()
                if not j.get("ok"):
                    print("Telegram error", method, j.get("description"))
                return j
            except requests.RequestException as e:
                print("Telegram koneksi gagal:", e)
                time.sleep(3 * (attempt + 1))
        return {"ok": False}

    def send(self, chat, text, kb=None, markup=None):
        p = {"chat_id": chat, "text": text[:4000], "parse_mode": "HTML", "disable_web_page_preview": True}
        if kb:
            p["reply_markup"] = {"inline_keyboard": kb}
        elif markup:
            p["reply_markup"] = markup
        return self.call("sendMessage", **p)

    def edit(self, chat, mid, text, kb=None):
        p = {"chat_id": chat, "message_id": mid, "text": text[:4000],
             "parse_mode": "HTML", "disable_web_page_preview": True}
        if kb:
            p["reply_markup"] = {"inline_keyboard": kb}
        r = self.call("editMessageText", **p)
        return r.get("ok") or "not modified" in str(r.get("description", ""))

    def panel(self, chat, text, kb=None, msg=None):
        """Perbarui pesan menu yang sama bila bisa, selain itu kirim baru."""
        mid = (msg or {}).get("message_id")
        if mid and (msg.get("text") is not None) and self.edit(chat, mid, text, kb):
            return {"ok": True}
        return self.send(chat, text, kb)

    def send_photo(self, chat, path, caption="", kb=None):
        p = {"chat_id": chat, "caption": caption[:1024], "parse_mode": "HTML"}
        if kb:
            p["reply_markup"] = json.dumps({"inline_keyboard": kb})
        with open(path, "rb") as f:
            return self.call("sendPhoto", files={"photo": f}, **p)

    def send_video(self, chat, path, caption="", kb=None):
        p = {"chat_id": chat, "caption": caption[:1024], "parse_mode": "HTML", "supports_streaming": "true", "width": 1080, "height": 1920}
        if kb:
            p["reply_markup"] = json.dumps({"inline_keyboard": kb})
        with open(path, "rb") as f:
            r = self.call("sendVideo", files={"video": f}, **p)
        if not r.get("ok"):
            size = os.path.getsize(path) / 1e6
            self.send(chat, f"⚠️ <b>Video gagal dikirim</b>\n\nUkuran {size:.0f} MB melewati batas Telegram. "
                            "Ambil dari dashboard web, atau pakai Bot API lokal untuk file &gt;50 MB.")
        return r

    def download(self, file_id, dest):
        j = self.call("getFile", file_id=file_id)
        if not j.get("ok"):
            raise RuntimeError(j.get("description", "getFile gagal (file >20 MB? pakai Bot API lokal)"))
        fp = j["result"]["file_path"]
        if Cfg.TG_LOCAL and os.path.isabs(fp) and os.path.exists(fp):
            shutil.copy(fp, dest)
            return dest
        with requests.get(f"{self.file_api}/{fp}", stream=True, timeout=300) as r:
            r.raise_for_status()
            with open(dest, "wb") as f:
                for ch in r.iter_content(1 << 16):
                    f.write(ch)
        return dest

    # ---------- pengaturan per chat ----------
    def setting(self, chat, key, default=None):
        return self.settings.get(str(chat), {}).get(key, default)

    def set_setting(self, chat, key, val):
        with self.lock:
            self.settings.setdefault(str(chat), {})[key] = val
            self.settings_p.write_text(json.dumps(self.settings, ensure_ascii=False, indent=1))

    # ---------- notifikasi dari pipeline ----------
    def progress(self, job, step):
        jid, chat = job["id"], job["chat_id"]
        body = tg_ui.progress_card(db.get(jid) or job, step)
        mid = self.progress_mid.get(jid)
        if mid and self.edit(chat, mid, body):
            return
        r = self.send(chat, body)
        if r.get("ok"):
            self.progress_mid[jid] = r["result"]["message_id"]

    def notify(self, job, kind, text, path):
        if not job or job.get("source") != "telegram" or not job.get("chat_id"):
            return
        chat = job["chat_id"]
        if kind == "info":
            return self.progress(job, text or "")
        if kind == "storyboard":
            body = text or ""
            kb = tg_ui.story_kb(job["id"])
            # Telegram scales photos. Deliver the full contact sheet as a document
            # so every numbered keyframe remains readable even on long videos.
            caption = body if len(body) <= 1024 else "\n".join(body.splitlines()[:2])
            with open(path, "rb") as board:
                response = self.call("sendDocument", files={"document": board}, chat_id=chat,
                                     caption=caption[:1024], parse_mode="HTML",
                                     reply_markup=json.dumps({"inline_keyboard": kb}))
            if len(body) > 1024:
                chunk = ""
                for line in body.splitlines()[2:]:
                    if len(chunk) + len(line) >= 4000:
                        self.send(chat, chunk)
                        chunk = ""
                    chunk += line + "\n"
                if chunk.strip():
                    self.send(chat, chunk)
            return response
        if kind == "draft":
            self.progress_mid.pop(job["id"], None)
            if path and path.exists():
                return self.send_video(chat, path, text or "📝 Draft belum lolos pemeriksaan.", tg_ui.job_kb(job))
            return self.send(chat, text, tg_ui.job_kb(job))
        if kind == "video":
            self.progress_mid.pop(job["id"], None)
            return self.send_video(chat, path, text or "", tg_ui.video_kb(job["id"]))
        if kind == "error":
            self.progress_mid.pop(job["id"], None)
            return self.send(chat, text + "\n\nKirim ulang audio/naskah, atau buka detail job.",
                             [[{"text": "📊 Status", "callback_data": "menu:status"},
                               {"text": "🎬 Render ulang", "callback_data": f"render:{job['id']}"}]])
        if text:
            self.send(chat, text)

    # ---------- handler ----------
    def allowed(self, msg):
        uid = str(msg.get("from", {}).get("id", ""))
        if not Cfg.TG_ALLOWED:
            self.send(msg["chat"]["id"], "🔒 <b>Bot belum dikunci</b>\n\n"
                                         f"User ID kamu: <code>{uid}</code>\n\n"
                                         f"Buka <code>.env</code>, isi <code>TELEGRAM_ALLOWED_USERS={uid}</code>, lalu restart layanan.")
            return False
        return uid in Cfg.TG_ALLOWED

    def last_job(self, chat):
        js = db.recent(1, chat_id=chat)
        return js[0] if js else None

    def new_job(self, chat, audio_file_id, audio_name, script, title=""):
        ext = os.path.splitext(audio_name or "")[1].lower() or ".mp3"
        if ext not in AUDIO_EXT:
            ext = ".mp3"
        style = self.setting(chat, "style", Cfg.DEFAULT_STYLE)
        payload = {"audio": "input" + ext, "style": style,
                   "watermark": self.setting(chat, "watermark", Cfg.WATERMARK), "title": title}
        jid = db.create("telegram", chat, status="unduh", payload=payload)
        d = pipeline.jdir(jid)
        self.download(audio_file_id, d / payload["audio"])
        if script:
            (d / "naskah.txt").write_text(script, encoding="utf-8")
        from . import transcribe
        if not script and not transcribe.available():
            db.update(jid, status="menunggu_naskah")
            return self.send(chat, "🎧 <b>Audio diterima</b>\n\n"
                                   "Whisper tidak aktif di server, jadi <b>kirim naskahnya</b> sekarang (teks atau .txt).",
                             [[{"text": "📖 Panduan", "callback_data": "menu:main"}]])
        db.update(jid, status="antri")
        n = len([j for j in db.recent(20) if j["status"] in db.ACTIVE])
        return self.send(chat, tg_ui.accepted_text(jid, len(script), style, n))

    def on_text_script(self, chat, text):
        j = db.waiting_script(chat)
        if j:
            (pipeline.jdir(j["id"]) / "naskah.txt").write_text(text, encoding="utf-8")
            db.enqueue(j["id"], "full")
            return self.send(chat, tg_ui.queued_text(f"📝 Naskah dipasang ({len(text)} huruf), mulai diproses."))
        self.pending[chat] = (text, time.time())
        kb = [[{"text": "🖋 Ganti naskah", "callback_data": "menu:main"}]]
        return self.send(chat, "📝 <b>Naskah disimpan</b>\n\n"
                               f"{len(text)} huruf tersimpan. Sekarang kirim <b>audio MP3</b>-nya.\n"
                               + "<i>Naskah berlaku 1 jam.</i>", kb)

    def handle(self, msg):
        chat = msg["chat"]["id"]
        if not self.allowed(msg):
            return
        text = (msg.get("text") or "").strip()
        if text in BUTTONS:
            return self.command(chat, BUTTONS[text])
        if text.startswith("/"):
            return self.command(chat, text)
        if text and self.take_prompt(chat, text):
            return
        doc = msg.get("document") or {}
        audio = msg.get("audio") or msg.get("voice")
        if not audio and doc and (doc.get("mime_type", "").startswith("audio/") or doc.get("file_name", "").lower().endswith(AUDIO_EXT)):
            audio = doc
        if audio:
            cap = (msg.get("caption") or "").strip()
            script, title = "", ""
            if len(cap) >= 25:
                script = cap
            elif cap:
                title = cap
            if not script and chat in self.pending and time.time() - self.pending[chat][1] < 3600:
                script = self.pending.pop(chat)[0]
            return self.new_job(chat, audio["file_id"], audio.get("file_name") or "audio.ogg", script, title)
        if doc and doc.get("file_name", "").lower().endswith((".txt", ".md")):
            tmp = Cfg.DATA_DIR / f"tmp_{chat}.txt"
            self.download(doc["file_id"], tmp)
            t = tmp.read_text(encoding="utf-8", errors="ignore")
            tmp.unlink(missing_ok=True)
            return self.on_text_script(chat, t)
        if text:
            if len(text) < 25:
                return self.send(chat, "Kirim naskah lengkap (minimal 25 huruf) atau audio MP3.\n"
                                       "Butuh bantuan? Tekan <b>📖 Bantuan</b>.", tg_ui.main_kb())
            return self.on_text_script(chat, text)

    # ---------- input lanjutan (judul / instruksi ubah / watermark) ----------
    def take_prompt(self, chat, text):
        a = self.awaiting.get(chat)
        if not a:
            return False
        kind, jid = a
        if kind == "judul":
            self.awaiting.pop(chat, None)
            self.set_title(chat, jid, text[:40])
            return True
        if kind == "edit":
            self.awaiting.pop(chat, None)
            db.enqueue(jid, "edit", {"instruction": text})
            self.progress_mid.pop(jid, None)
            self.send(chat, tg_ui.queued_text(f"✏️ Instruksi diterima: <i>{esc(text[:300])}</i>"))
            return True
        if kind == "watermark":
            self.awaiting.pop(chat, None)
            val = "" if text.lower() in ("hapus", "off", "-") else text[:40]
            self.set_setting(chat, "watermark", val)
            self.send(chat, tg_ui.watermark_text(val), tg_ui.watermark_kb(val))
            return True
        return False

    def set_title(self, chat, jid, title):
        pf = pipeline.jdir(jid) / "plan.json"
        if pf.exists():
            p = json.loads(pf.read_text(encoding="utf-8"))
            p["judul"] = title
            pf.write_text(json.dumps(p, ensure_ascii=False, indent=1), encoding="utf-8")
        db.enqueue(jid, "render", {"title": title})
        self.progress_mid.pop(jid, None)
        self.send(chat, tg_ui.queued_text(f"🖋 Judul baru: <b>{esc(title)}</b>"))

    # ---------- perintah ----------
    def command(self, chat, text):
        cmd, _, arg = text.partition(" ")
        cmd = cmd.split("@")[0].lower()
        arg = arg.strip()
        self.awaiting.pop(chat, None)
        if cmd == "/start":
            return self.send(chat, tg_ui.help_text(), markup=tg_ui.reply_kb())
        if cmd in ("/", "/menu"):
            return self.send(chat, tg_ui.help_text(), tg_ui.main_kb())
        if cmd in ("/help", "/perintah", "/commands"):
            return self.send(chat, tg_ui.commands_text(), tg_ui.back_kb())
        if cmd == "/status":
            js = db.recent(5, chat_id=chat)
            return self.send(chat, tg_ui.status_list(js), tg_ui.status_kb(js))
        if cmd == "/template":
            st = self.setting(chat, "style", Cfg.DEFAULT_STYLE)
            return self.send(chat, tg_ui.template_text(st, director.load_catalog(st)),
                             [[{"text": "🎨 Ganti gaya", "callback_data": "menu:gaya"},
                               {"text": "🔙 Menu", "callback_data": "menu:main"}]])
        if cmd == "/gaya":
            styles = director.list_styles()
            active = self.setting(chat, "style", Cfg.DEFAULT_STYLE)
            if arg:
                match = next((s for s in styles if s == arg.lower() or s.startswith(arg.lower())), None)
                if match:
                    self.set_setting(chat, "style", match)
                    active = match
                else:
                    self.send(chat, f"Gaya <code>{esc(arg)}</code> tidak ada. Pilih dari tombol di bawah.")
            return self.send(chat, tg_ui.style_text(active, styles), tg_ui.style_kb(active, styles))
        if cmd == "/watermark":
            if arg:
                val = "" if arg.lower() in ("hapus", "off") else arg[:40]
                self.set_setting(chat, "watermark", val)
                return self.send(chat, tg_ui.watermark_text(val), tg_ui.watermark_kb(val))
            val = self.setting(chat, "watermark", Cfg.WATERMARK)
            self.awaiting[chat] = ("watermark", None)
            return self.send(chat, tg_ui.watermark_text(val), tg_ui.watermark_kb(val))
        last = self.last_job(chat)
        if not last:
            return self.send(chat, "🎬 <b>Belum ada video</b>\n\nKirim naskah lalu MP3 untuk mulai.",
                             tg_ui.main_kb())
        jid = last["id"]
        if cmd == "/batal":
            if last["status"] in ("antri", "menunggu_naskah", "unduh"):
                db.update(jid, status="batal")
                return self.send(chat, tg_ui.queued_text("🚫 Job dibatalkan."))
            return self.send(chat, f"Job terakhir berstatus <b>{esc(last['status'])}</b>, tidak bisa dibatalkan.")
        if last["status"] in db.ACTIVE:
            return self.send(chat, "⏳ <b>Job masih diproses</b>\n\nTunggu sampai selesai, atau /batal untuk job antre.",
                             [[{"text": "📊 Status", "callback_data": "menu:status"}]])
        has_cues = (pipeline.jdir(jid) / "cues.json").exists()
        if cmd == "/ubah":
            if not arg:
                self.awaiting[chat] = ("edit", jid)
                return self.send(chat, tg_ui.edit_prompt(last), tg_ui.prompt_kb(jid))
            db.enqueue(jid, "edit", {"instruction": arg})
            self.progress_mid.pop(jid, None)
            return self.send(chat, tg_ui.queued_text(f"✏️ Instruksi diterima: <i>{esc(arg[:300])}</i>"))
        if cmd == "/ulang":
            if not has_cues:
                return self.send(chat, "⚠️ Job ini belum punya hasil analisis audio. Kirim ulang audionya.")
            db.enqueue(jid, "replan", {"extra": arg})
            self.progress_mid.pop(jid, None)
            return self.send(chat, tg_ui.queued_text("🔁 Menyusun ulang semua adegan..."))
        if cmd == "/render":
            if not has_cues:
                return self.send(chat, "⚠️ Job ini belum punya hasil analisis audio. Kirim ulang audionya.")
            db.enqueue(jid, "render")
            self.progress_mid.pop(jid, None)
            return self.send(chat, tg_ui.queued_text("🎬 Render ulang masuk antrean..."))
        if cmd == "/judul":
            if not arg:
                self.awaiting[chat] = ("judul", jid)
                return self.send(chat, tg_ui.title_prompt(last), tg_ui.prompt_kb(jid))
            return self.set_title(chat, jid, arg[:40])
        return self.send(chat, f"Perintah <code>{esc(cmd)}</code> tidak dikenal.\nLihat daftar perintah di tombol <b>📖 Perintah</b>.",
                         [[{"text": "📖 Perintah", "callback_data": "menu:help"},
                           {"text": "🔙 Menu", "callback_data": "menu:main"}]])

    # ---------- callback tombol ----------
    def on_callback(self, cq):
        data = cq.get("data") or ""
        self.call("answerCallbackQuery", callback_query_id=cq["id"])
        msg = cq.get("message") or {}
        chat = (msg.get("chat") or {}).get("id")
        if not chat:
            return
        if str(cq.get("from", {}).get("id")) not in Cfg.TG_ALLOWED:
            return self.send(chat, "🔒 Kamu tidak punya akses ke bot ini.")
        action, _, rest = data.partition(":")
        try:
            return self.route(chat, action, rest, msg)
        except Exception as e:
            print("callback error:", e)
            return self.send(chat, f"❌ {esc(str(e))[:300]}")

    def route(self, chat, action, rest, msg):
        if action == "menu":
            self.awaiting.pop(chat, None)
            return self.menu(chat, rest or "main", msg)
        if action == "gaya":
            styles = director.list_styles()
            if rest in styles:
                self.set_setting(chat, "style", rest)
                self.send(chat, f"🎨 Gaya diset ke <b>{esc(rest)}</b>. Berlaku untuk video berikutnya.")
            active = self.setting(chat, "style", Cfg.DEFAULT_STYLE)
            return self.panel(chat, tg_ui.style_text(active, styles), tg_ui.style_kb(active, styles), msg)
        if action == "wm":
            if rest == "set":
                self.awaiting[chat] = ("watermark", None)
                val = self.setting(chat, "watermark", Cfg.WATERMARK)
                return self.panel(chat, "🖋 <b>Watermark baru</b>\n\nKetik teks yang mau ditampilkan di bawah video, "
                                        "atau <code>hapus</code> untuk menghilangkannya.\n\n"
                                        f"Sekarang: <b>{esc(val) or '(tidak ada)'}</b>", tg_ui.back_kb(), msg)
            if rest == "del":
                self.set_setting(chat, "watermark", "")
                return self.panel(chat, tg_ui.watermark_text(""), tg_ui.watermark_kb(""), msg)
        j = db.get(rest)
        if not j:
            return self.send(chat, "Job tidak ditemukan.")
        if str(j.get("chat_id")) != str(chat):
            return self.send(chat, "Job ini milik chat lain.")
        if action == "preview":
            preview = pipeline.jdir(j["id"]) / "preview.mp4"
            if not preview.exists():
                return self.send(chat, "Draft belum tersedia. Periksa /status.")
            return self.send_video(chat, preview, "📝 Draft — belum lolos pemeriksaan kualitas.", tg_ui.job_kb(j))
        if action == "job":
            return self.panel(chat, tg_ui.job_card(j), tg_ui.job_kb(j), msg)
        if action == "plan":
            pf = pipeline.jdir(rest) / "plan.json"
            if not pf.exists():
                return self.send(chat, "📋 Rencana belum tersedia untuk job ini.")
            p = json.loads(pf.read_text(encoding="utf-8"))
            return self.send(chat, tg_ui.plan_text(p),
                             [[{"text": "🎬 Render ulang", "callback_data": f"render:{rest}"},
                               {"text": "🔙 Detail job", "callback_data": f"job:{rest}"}]])
        if action == "edit":
            self.awaiting[chat] = ("edit", rest)
            return self.panel(chat, tg_ui.edit_prompt(j), tg_ui.prompt_kb(rest), msg)
        if action == "judul":
            self.awaiting[chat] = ("judul", rest)
            return self.panel(chat, tg_ui.title_prompt(j), tg_ui.prompt_kb(rest), msg)
        if action == "batal":
            if j["status"] in ("antri", "menunggu_naskah", "unduh"):
                db.update(j["id"], status="batal")
                return self.panel(chat, tg_ui.queued_text("🚫 Job dibatalkan."), tg_ui.back_kb("menu:status"), msg)
            return self.send(chat, f"Job berstatus <b>{esc(j['status'])}</b>, tidak bisa dibatalkan.")
        if action in ("replan", "render", "repair"):
            if j["status"] in db.ACTIVE:
                return self.send(chat, "⏳ Job masih diproses. Tunggu sampai selesai.")
            if not (pipeline.jdir(rest) / "cues.json").exists():
                return self.send(chat, "⚠️ Job ini belum punya hasil analisis audio. Kirim ulang audionya.")
            db.enqueue(rest, action)
            self.progress_mid.pop(rest, None)
            return self.send(chat, tg_ui.queued_text("🔁 Menyusun ulang adegan..." if action == "replan"
                                                     else "🎬 Render ulang masuk antrean..."))
        return self.send(chat, "Tombol tidak dikenal.", tg_ui.main_kb())

    def menu(self, chat, name, msg=None):
        if name in ("main", "", "start"):
            return self.panel(chat, tg_ui.help_text(), tg_ui.main_kb(), msg)
        if name == "help":
            return self.panel(chat, tg_ui.commands_text(), tg_ui.back_kb(), msg)
        if name == "status":
            js = db.recent(5, chat_id=chat)
            return self.panel(chat, tg_ui.status_list(js), tg_ui.status_kb(js), msg)
        if name == "gaya":
            styles = director.list_styles()
            active = self.setting(chat, "style", Cfg.DEFAULT_STYLE)
            return self.panel(chat, tg_ui.style_text(active, styles), tg_ui.style_kb(active, styles), msg)
        if name == "template":
            st = self.setting(chat, "style", Cfg.DEFAULT_STYLE)
            return self.panel(chat, tg_ui.template_text(st, director.load_catalog(st)),
                              [[{"text": "🎨 Ganti gaya", "callback_data": "menu:gaya"},
                                {"text": "🔙 Menu", "callback_data": "menu:main"}]], msg)
        if name == "watermark":
            val = self.setting(chat, "watermark", Cfg.WATERMARK)
            return self.panel(chat, tg_ui.watermark_text(val), tg_ui.watermark_kb(val), msg)
        return self.panel(chat, tg_ui.help_text(), tg_ui.main_kb(), msg)

    # ---------- loop ----------
    def register(self):
        cmds = [{"command": c, "description": d} for c, d in COMMANDS]
        for scope in ({"type": "default"}, {"type": "all_private_chats"}, {"type": "all_group_chats"}):
            self.call("setMyCommands", commands=cmds, scope=scope)
        self.call("setChatMenuButton", menu_button={"type": "commands"})

    def loop(self):
        me = self.call("getMe")
        print("Bot Telegram aktif:", me.get("result", {}).get("username"), flush=True)
        self.register()
        while True:
            try:
                r = requests.get(f"{self.api}/getUpdates", params={"timeout": 50, "offset": self.offset,
                                 "allowed_updates": json.dumps(["message", "callback_query"])}, timeout=65).json()
                for u in r.get("result", []):
                    self.offset = u["update_id"] + 1
                    try:
                        if "message" in u:
                            self.handle(u["message"])
                        elif "callback_query" in u:
                            self.on_callback(u["callback_query"])
                    except Exception as e:
                        print("handler error:", e)
                        chat = (u.get("message") or {}).get("chat", {}).get("id")
                        if chat:
                            self.send(chat, f"❌ {esc(str(e))[:500]}")
            except Exception as e:
                print("polling error:", e)
                time.sleep(5)


def start():
    if not Cfg.TG_TOKEN:
        print("TELEGRAM_BOT_TOKEN kosong: bot Telegram tidak dijalankan.")
        return None
    b = Bot()
    pipeline.NOTIFIERS.append(b.notify)
    threading.Thread(target=b.loop, daemon=True, name="telegram").start()
    return b
