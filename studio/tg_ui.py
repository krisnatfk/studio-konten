"""Teks dan papan tombol Telegram: kartu job, menu klik, progress bar.

Semua teks memakai parse_mode HTML, jadi nilai dinamis wajib lewat esc().
"""
import html
import json
import time

from .config import Cfg

STATUS = {
    "menunggu_naskah": ("🕓", "Menunggu naskah"),
    "unduh": ("📥", "Mengunduh audio"),
    "antri": ("⏳", "Dalam antrean"),
    "proses": ("🔄", "Diproses"),
    "draft_review": ("📝", "Draft perlu review"),
    "selesai": ("✅", "Selesai"),
    "gagal": ("❌", "Gagal"),
    "batal": ("🚫", "Dibatalkan"),
}


def esc(x):
    return html.escape(str(x or ""))


def _when(ts):
    return time.strftime("%d %b · %H:%M", time.localtime(ts)) if ts else "-"


def _icon(j):
    return STATUS.get(j["status"], ("•", j["status"]))[0]


def bar(p, width=10):
    p = max(0.0, min(1.0, float(p or 0)))
    n = round(p * width)
    return "▰" * n + "▱" * (width - n) + f" {p * 100:.0f}%"


# ---------------- kartu job ----------------
def job_card(j):
    icon, label = STATUS.get(j["status"], ("•", j["status"]))
    rows = [f"{icon} <b>{esc(j['title'] or 'Tanpa judul')}</b>",
            f"<code>{esc(j['id'])}</code>",
            "",
            f"Status · {label}"]
    if j["status"] == "proses":
        rows.append(f"Progres · {bar(j['progress'])}")
    rows.append(f"Dibuat · {_when(j['created'])}")
    style = (j.get("payload") or {}).get("style")
    if style:
        rows.append(f"Gaya · {esc(style)}")
    if j["error"]:
        rows += ["", f"⚠️ <code>{esc(j['error'])[:200]}</code>"]
    return "\n".join(rows)


def progress_card(j, step):
    rows = [f"🎬 <b>{esc(j['title'] or 'Video baru')}</b>",
            f"<code>{esc(j['id'])}</code>",
            ""]
    if j["status"] == "proses":
        rows.append(bar(j["progress"]))
    rows.append(esc(step))
    return "\n".join(rows)


def status_list(jobs):
    if not jobs:
        return ("📊 <b>Belum ada job</b>\n\n"
                "Kirim naskah lalu MP3 untuk membuat video pertama.")
    rows = ["📊 <b>Job terakhir</b>", ""]
    for j in jobs:
        icon, label = STATUS.get(j["status"], ("•", j["status"]))
        extra = f" · {j['progress'] * 100:.0f}%" if j["status"] == "proses" else ""
        rows.append(f"{icon} <b>{esc(j['title'] or 'Tanpa judul')}</b>")
        rows.append(f"     <code>{esc(j['id'][-9:])}</code> · {label}{extra} · {_when(j['created'])}")
    rows += ["", "Ketuk salah satu untuk detail & aksi."]
    return "\n".join(rows)


def _short(j):
    return (j["title"] or "Tanpa judul")[:20]


def status_kb(jobs):
    rows, row = [], []
    for j in jobs:
        row.append({"text": f"{_icon(j)} {_short(j)}", "callback_data": f"job:{j['id']}"})
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([{"text": "🔙 Menu", "callback_data": "menu:main"}])
    return rows


def job_kb(j):
    rows = []
    if j["status"] == "draft_review":
        rows.append([{"text":"👀 Lihat draft", "callback_data":f"preview:{j['id']}"}])
        rows.append([{"text":"🛠 Perbaiki draft", "callback_data":f"repair:{j['id']}"}])
    if j["status"] in ("selesai", "gagal", "batal", "draft_review"):
        rows.append([{"text": "🔁 Susun ulang", "callback_data": f"replan:{j['id']}"},
                     {"text": "🎬 Render ulang", "callback_data": f"render:{j['id']}"}])
        rows.append([{"text": "✏️ Ubah adegan", "callback_data": f"edit:{j['id']}"},
                     {"text": "🖋 Ganti judul", "callback_data": f"judul:{j['id']}"}])
    if j["status"] in ("antri", "menunggu_naskah", "unduh"):
        rows.append([{"text": "🚫 Batalkan", "callback_data": f"batal:{j['id']}"}])
    rows.append([{"text": "📋 Lihat rencana", "callback_data": f"plan:{j['id']}"},
                 {"text": "🔙 Status", "callback_data": "menu:status"}])
    return rows


def plan_text(p):
    adegan = p.get("adegan") or []
    rows = [f"📋 <b>{esc(p.get('judul') or 'Rencana adegan')}</b>",
            f"{len(adegan)} adegan · sumber {esc(p.get('sumber', '?'))}", ""]
    for k, a in enumerate(adegan):
        prm = ", ".join(f"{x}={y}" for x, y in (a.get("params") or {}).items())
        kam = (a.get("kamera") or {}).get("gerak", "-")
        rows.append(f"{k + 1}. <b>{esc(a.get('template'))}</b> · {esc(kam)}")
        if prm:
            rows.append(f"     <code>{esc(prm)[:120]}</code>")
    return "\n".join(rows)


def video_kb(jid):
    rows = [[{"text": "🔁 Susun ulang adegan", "callback_data": f"replan:{jid}"}],
            [{"text": "🎬 Render ulang", "callback_data": f"render:{jid}"},
             {"text": "✏️ Ubah adegan", "callback_data": f"edit:{jid}"}],
            [{"text": "🖋 Ganti judul", "callback_data": f"judul:{jid}"},
             {"text": "📋 Lihat rencana", "callback_data": f"plan:{jid}"}]]
    return rows


def story_kb(jid):
    return [[{"text": "✏️ Ubah adegan", "callback_data": f"edit:{jid}"},
             {"text": "📋 Detail job", "callback_data": f"job:{jid}"}]]


# ---------------- menu ----------------
def help_text():
    return ("🎬 <b>Horor Studio</b>\n"
            "Video horor siluet 1080×1920 — subtitle, SFX, dan adegan mengikuti audionya.\n\n"
            "<b>Pakai audio sendiri</b>\n"
            "① Kirim <b>naskah</b> (teks atau file .txt)\n"
            "② Kirim <b>MP3</b> yang sudah disiapkan\n"
            "③ Bot kirim storyboard, lalu video setelah proses selesai\n\n"
            "Bisa juga: kirim MP3 dengan naskah di <i>caption</i>, langsung diproses.\n\n"
            "Pakai tombol di bawah, atau ikon ☰ di kolom pesan untuk daftar perintah.")


def commands_text():
    return ("📖 <b>Perintah</b>\n\n"
            "<b>Ubah video terakhir</b>\n"
            "/ubah &lt;perintah&gt; — ubah adegan tertentu\n"
            "    e.g. <code>/ubah adegan 3 jadi kuburan dengan pocong</code>\n"
            "    cepat: <code>/ubah 3 kuburan</code>\n"
            "/ulang [catatan] — susun ulang semua adegan\n"
            "/judul &lt;teks&gt; — ganti judul\n"
            "/render — render ulang\n"
            "/batal — batalkan job yang masih antre\n\n"
            "<b>Info &amp; pengaturan</b>\n"
            "/status — 5 job terakhir\n"
            "/template — daftar adegan\n"
            "/gaya [nama] — style pack\n"
            "/watermark [teks|hapus] — teks akun")


def main_kb():
    return [[{"text": "📊 Status", "callback_data": "menu:status"},
             {"text": "🎨 Gaya", "callback_data": "menu:gaya"}],
            [{"text": "📜 Template", "callback_data": "menu:template"},
             {"text": "🖋 Watermark", "callback_data": "menu:watermark"}],
            [{"text": "📖 Perintah", "callback_data": "menu:help"}]]


def back_kb(target="menu:main"):
    return [[{"text": "🔙 Menu", "callback_data": target}]]


def reply_kb():
    """Keyboard balasan (menetap di bawah layar)."""
    return {"keyboard": [[{"text": "📊 Status"}, {"text": "🎨 Gaya"}],
                         [{"text": "📜 Template"}, {"text": "🖋 Watermark"}],
                         [{"text": "📋 Menu"}, {"text": "📖 Bantuan"}]],
            "resize_keyboard": True, "is_persistent": True}


def _style_label(s):
    try:
        return json.loads((Cfg.STYLES_DIR / s / "style.json").read_text(encoding="utf-8")).get("label", s)
    except Exception:
        return s


def style_text(active, styles):
    rows = ["🎨 <b>Gaya</b>", f"Aktif: <b>{esc(active)}</b>", "", "Pilih untuk video berikutnya:"]
    for s in styles:
        rows.append(("✅ " if s == active else "• ") + f"<b>{esc(s)}</b> — {esc(_style_label(s))}")
    return "\n".join(rows)


def style_kb(active, styles):
    rows = [[{"text": ("✅ " if s == active else "") + s, "callback_data": f"gaya:{s}"}] for s in styles]
    rows.append([{"text": "🔙 Menu", "callback_data": "menu:main"}])
    return rows


def template_text(style, cat):
    rows = [f"📜 <b>Template · {esc(style)}</b>",
            f"{len(cat)} adegan tersedia. AI memilih otomatis; kamu bisa memaksa lewat /ubah.", ""]
    for k, v in cat.items():
        rows.append(f"• <b>{esc(k)}</b> — {esc(v.get('desc'))}")
    return "\n".join(rows)


def watermark_text(val):
    cur = f"<b>{esc(val)}</b>" if val else "(tidak ada)"
    return ("🖋 <b>Watermark</b>\n\n"
            f"Sekarang: {cur}\n\n"
            "Tampil kecil di bawah video, berlaku untuk video berikutnya.\n"
            "Kirim teks baru untuk mengganti, atau ketik <code>hapus</code>.")


def watermark_kb(val):
    rows = [[{"text": "🖋 Ganti teks", "callback_data": "wm:set"}]]
    if val:
        rows.append([{"text": "🚫 Hapus watermark", "callback_data": "wm:del"}])
    rows.append([{"text": "🔙 Menu", "callback_data": "menu:main"}])
    return rows


# ---------------- prompt & status pesan ----------------
def accepted_text(jid, script_len, style, queue):
    return "\n".join([
        "✅ <b>Audio diterima</b>",
        f"<code>{esc(jid)}</code>",
        "",
        f"📝 Naskah · {script_len} huruf" if script_len else "📝 Naskah · dari Whisper",
        f"🎨 Gaya · {esc(style)}",
        f"⏳ Antrean · posisi {queue}",
        "",
        "Storyboard dikirim lebih dulu, lalu videonya."])


def queued_text(step):
    return f"⏳ <b>Masuk antrean</b>\n\n{step}\n\nProgres muncul di chat ini."


def edit_prompt(j):
    return ("✏️ <b>Ubah adegan</b>\n"
            f"<code>{esc(j['id'])}</code>\n\n"
            "Ketik perintahmu, contoh:\n"
            "• <code>adegan 3 jadi kuburan dengan pocong</code>\n"
            "• <code>3 kuburan</code>\n"
            "• <code>adegan 2 lebih gelap, ada bayangan di pintu</code>")


def title_prompt(j):
    cur = j["title"] or "Tanpa judul"
    return ("🖋 <b>Ganti judul</b>\n"
            f"Sekarang: <b>{esc(cur)}</b>\n\n"
            "Ketik judul baru (maks 40 huruf).")


def prompt_kb(jid, action="menu:main"):
    return [[{"text": "🚫 Batal", "callback_data": action}],
            [{"text": "📋 Detail job", "callback_data": f"job:{jid}"}]]
