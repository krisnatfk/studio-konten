"""Sutradara: cue -> rencana adegan.

LLM (Gemma via vLLM) hanya MEMILIH template + parameter dari katalog. Semua keluaran
divalidasi dan diperbaiki otomatis; bila LLM mati/gagal, dipakai sutradara berbasis aturan,
jadi video tetap selalu jadi.
"""
import json
import math
import re

import requests

from .config import Cfg
from . import library, coverage

GERAK = ["maju", "mundur", "geser_kiri", "geser_kanan", "diam", "naik"]
PERAN = ["narasi", "dialog", "seram"]

# Konteks vLLM terbatas: minta JSON padat supaya jawaban tidak terpotong.
_COMPACT = "Balas JSON satu baris, tanpa indentasi/spasi tambahan, tanpa teks lain."


def style_dir(name=None):
    d = Cfg.STYLES_DIR / (name or Cfg.DEFAULT_STYLE)
    return d if (d / "style.json").exists() else Cfg.STYLES_DIR / Cfg.DEFAULT_STYLE


def load_catalog(style=None):
    """Katalog adegan milik style (styles/<nama>/catalog.json)."""
    name = style["name"] if isinstance(style, dict) else style
    return json.loads((style_dir(name) / "catalog.json").read_text(encoding="utf-8"))


def load_style(name=None):
    d = style_dir(name)
    st = json.loads((d / "style.json").read_text(encoding="utf-8"))
    st["name"] = d.name
    st["_dir"] = str(d)
    st["_prompt"] = (d / "director_prompt.md").read_text(encoding="utf-8")
    return st


def list_styles():
    return sorted(p.name for p in Cfg.STYLES_DIR.iterdir() if (p / "style.json").exists())


# ---------------- LLM ----------------
def _schema(cat, a=0, b=None, single=False):
    # Batas rentang + jumlah item mencegah model mengulang adegan yang sama tanpa henti.
    cue = {"type": "integer", "minimum": a} | ({"maximum": b} if b is not None else {})
    lim = {"minItems": 1, "maxItems": 1 if single else b - a + 1} if b is not None else {}
    return {
        "type": "object",
        "properties": {
            "judul": {"type": "string", "maxLength": 40},
            "adegan": {"type": "array", **lim, "items": {"type": "object", "properties": {
                "dari": cue, "sampai": cue,
                "template": {"type": "string", "enum": list(cat)},
                "params": {"type": "object"},
                "momen": {"type": "array", "maxItems": 12, "items": {"type": "object",
                          "properties": {"cue": cue, "kata": {"type": "string"}, "fokus": {"type": "string"}},
                          "required": ["cue", "fokus"]}},
                "kamera": {"type": "object", "properties": {"gerak": {"type": "string", "enum": GERAK}}, "required": ["gerak"]},
            }, "required": ["dari", "sampai", "template", "params", "kamera"]}},
            "peran": {"type": "array", **({"maxItems": b - a + 1} if b is not None else {}), "items": {"type": "object", "properties": {
                "i": cue, "peran": {"type": "string", "enum": PERAN}}, "required": ["i", "peran"]}},
        },
        "required": ["judul", "adegan", "peran"],
    }


def _salvage(text):
    """Ambil adegan yang utuh dari JSON yang terpotong."""
    k = text.find('"adegan"')
    k = text.find("[", k) + 1 if k >= 0 else 0
    if k <= 0:
        return []
    dec, out = json.JSONDecoder(), []
    while True:
        while k < len(text) and text[k] in " \n\r\t,":
            k += 1
        if k >= len(text) or text[k] != "{":
            return out
        try:
            obj, k = dec.raw_decode(text, k)
        except ValueError:
            return out
        out.append(obj)


def _catalog_text(cat):
    lines = []
    for name, d in cat.items():
        ps = []
        for k, s in d["params"].items():
            if s["type"] == "enum":
                t = "|".join(s["values"])
            elif s["type"] == "int":
                t = f"int {s['min']}-{s['max']}"
            elif s["type"] == "cue":
                t = "nomor cue"
            elif s["type"] == "list":
                t = f"daftar, maks {s.get('max', 4)} item"
            elif s["type"] == "obj":
                t = "objek"
            else:
                t = s["type"]
            ps.append(f"{k}({t}; default {json.dumps(s.get('default'))})" + (f" – {s['desc']}" if s.get("desc") else ""))
        lines.append(f"- {name}: {d['desc']}\n    params: " + ("; ".join(ps) if ps else "-"))
    return "\n".join(lines)


def _cue_text(cues):
    # "vis" = catatan visual dari tahap analisis (lokasi | yang terlihat | aksi), bila ada
    return "\n".join(f"#{c['i']} [{c['start']:.1f}-{c['end']:.1f}s] {c['text']}" + (f"\n    ↳ visual: {c['vis']}" if c.get("vis") else "")
                     for c in cues)


class TooLong(Exception):
    """Prompt + jawaban tidak muat di konteks LLM, atau jawaban terpotong: perkecil bagian."""

    def __init__(self, msg, partial=""):
        super().__init__(msg)
        self.partial = partial


def _hdr():
    return {"Authorization": f"Bearer {Cfg.LLM_API_KEY}"}


_CTX = {}


def _context():
    """Panjang konteks sebenarnya dari vLLM (/v1/models -> max_model_len), cadangan LLM_CONTEXT."""
    if "n" not in _CTX:
        try:
            r = requests.get(Cfg.LLM_BASE_URL + "/models", headers=_hdr(), timeout=10)
            for m in r.json().get("data", []):
                if m.get("id") == Cfg.LLM_MODEL and m.get("max_model_len"):
                    _CTX["n"] = int(m["max_model_len"])
        except Exception:
            pass
    return _CTX.get("n", Cfg.LLM_CONTEXT)


def _is_vllm():
    """vLLM melaporkan max_model_len di /v1/models; gateway/OpenAI tidak."""
    _context()
    return "n" in _CTX


def _tokens(messages):
    """Jumlah token prompt yang pasti lewat /tokenize milik vLLM; cadangan: taksiran konservatif."""
    try:
        if not _is_vllm():
            raise ValueError("gateway tidak menyediakan tokenize")
        r = requests.post(Cfg.LLM_BASE_URL.rsplit("/v1", 1)[0] + "/tokenize",
                          json={"model": Cfg.LLM_MODEL, "messages": messages}, headers=_hdr(), timeout=20)
        if r.ok and "count" in r.json():
            return int(r.json()["count"])
    except Exception:
        pass
    count = 60
    for m in messages:
        content = m.get("content") or ""
        if isinstance(content, str):
            count += len(content) * 2 // 5
        else:
            count += sum(len(x.get("text", "")) * 2 // 5 if x.get("type") == "text" else 1800 for x in content)
    return count


def _chat(messages, schema, log, min_out=0, max_out=None):
    url = Cfg.LLM_BASE_URL + "/chat/completions"
    budget = _context() - _tokens(messages) - 64
    if budget < max(min_out, 200):
        raise TooLong(f"prompt terlalu panjang (sisa {budget} token)")
    vllm = _is_vllm()
    effort = Cfg.LLM_REASONING_EFFORT
    if effort not in ("none", "minimal", "low", "medium", "high", "xhigh"):
        raise ValueError(f"LLM_REASONING_EFFORT tidak valid: {effort}")
    reserve = max(0, Cfg.LLM_REASONING_TOKENS) if not vllm and effort != "none" else 0
    cap = min(budget, (max_out + reserve) if max_out else budget, Cfg.LLM_MAX_TOKENS or budget)
    body = {"model": Cfg.LLM_MODEL, "messages": messages, "temperature": Cfg.LLM_TEMPERATURE, "max_tokens": cap,
            "stream": False}
    if not vllm:
        body["reasoning_effort"] = effort
    if schema and vllm:
        # Format vLLM >= 0.10. Grammar JSON biasa mengizinkan spasi tak terbatas; Gemma bisa terjebak menulis
        # "\n \n \n..." sampai habis token, jadi spasi bebas dimatikan.
        body["structured_outputs"] = {"json": schema, "disable_any_whitespace": True}
        # Tanpa penalti, Gemma sering mengulang adegan yang sama lalu terjebak spasi (diuji: 3/8 -> 0/8 terpotong).
        body["repetition_penalty"] = 1.1
    elif schema:  # gateway/OpenAI: format standar (tidak selalu ditegakkan; hasil tetap divalidasi di sini)
        body["response_format"] = {"type": "json_schema", "json_schema": {"name": "rencana", "schema": schema}}
    if vllm and Cfg.LLM_DISABLE_THINKING:
        body["chat_template_kwargs"] = {"enable_thinking": False}
    r = requests.post(url, json=body, headers=_hdr(), timeout=Cfg.LLM_TIMEOUT)
    if r.status_code == 400 and "context length" in r.text:
        raise TooLong(r.text[:160])
    if r.status_code == 400 and "structured_outputs" in body:  # vLLM lama: pakai response_format standar
        log("vLLM tidak mengenal structured_outputs, pakai response_format")
        body.pop("structured_outputs")
        body["response_format"] = {"type": "json_schema", "json_schema": {"name": "rencana", "schema": schema}}
        r = requests.post(url, json=body, headers=_hdr(), timeout=Cfg.LLM_TIMEOUT)
    if r.status_code == 400:  # vLLM lama / template tidak mendukung response_format atau chat_template_kwargs
        log(f"LLM menolak opsi lanjutan ({r.text[:140]}), coba mode sederhana")
        for k in ("response_format", "structured_outputs", "chat_template_kwargs", "repetition_penalty"):
            body.pop(k, None)
        r = requests.post(url, json=body, headers=_hdr(), timeout=Cfg.LLM_TIMEOUT)
    r.raise_for_status()
    ch = _completion(r)
    if ch.get("finish_reason") == "length":
        raise TooLong(f"jawaban terpotong di {cap} token", ch["message"]["content"] or "")
    content = ch["message"].get("content") or ""
    if not content.strip():
        raise ValueError("LLM tidak menghasilkan konten; periksa budget reasoning/output")
    return content


def _completion(response):
    """Terima JSON biasa atau SSE dari gateway yang mengabaikan stream=false."""
    try:
        data = response.json()
    except ValueError:
        parts, finish, done, seen = [], None, False, False
        for event in re.split(r"\r?\n\r?\n", response.text):
            payload = "\n".join(line[5:].lstrip() for line in event.splitlines() if line.startswith("data:"))
            if not payload:
                continue
            seen = True
            if payload.strip() == "[DONE]":
                done = True
                break
            try:
                chunk = json.loads(payload)
            except ValueError:
                raise ValueError("Respons streaming LLM berisi JSON yang tidak valid.") from None
            if chunk.get("error"):
                raise ValueError("Layanan LLM melaporkan error dalam respons streaming.")
            for choice in chunk.get("choices", []):
                if choice.get("index", 0) != 0:
                    continue
                content = choice.get("delta", {}).get("content")
                if isinstance(content, str):
                    parts.append(content)
                message = choice.get("message", {}).get("content")
                if isinstance(message, str):
                    parts = [message]
                finish = choice.get("finish_reason") or finish
        if not seen:
            raise ValueError("Respons LLM bukan JSON atau aliran SSE yang valid.")
        if not finish and not done:
            raise TooLong("Respons streaming LLM terputus sebelum selesai.", "".join(parts))
        return {"message": {"content": "".join(parts)}, "finish_reason": finish or "stop"}
    choices = data.get("choices") if isinstance(data, dict) else None
    if not choices:
        raise ValueError("Respons LLM tidak berisi pilihan jawaban.")
    return choices[0]


def parse_json(text):
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S)
    text = re.sub(r"```(?:json)?", "", text)
    a, b = text.find("{"), text.rfind("}")
    if a < 0 or b < 0:
        raise ValueError("tidak ada JSON di jawaban LLM")
    return json.loads(text[a:b + 1])


def llm_ok():
    if not Cfg.LLM_ENABLED:
        return False
    try:
        r = requests.get(Cfg.LLM_BASE_URL + "/models", headers={"Authorization": f"Bearer {Cfg.LLM_API_KEY}"}, timeout=5)
        return r.ok and any(m.get("id") == Cfg.LLM_MODEL for m in r.json().get("data", []))
    except Exception:
        return False


# ---------------- validasi ----------------
def _coerce(spec, v, lo, hi):
    t = spec["type"]
    if v is None:
        return None
    if t == "bool":
        return v if isinstance(v, bool) else str(v).lower() in ("true", "1", "ya", "yes")
    if t == "int":
        try:
            return max(spec["min"], min(spec["max"], int(v)))
        except Exception:
            return spec.get("default")
    if t == "enum":
        return v if v in spec["values"] else spec.get("default")
    if t == "cue":
        try:
            return max(lo, min(hi, int(v)))
        except Exception:
            return None
    if t == "list":
        if not isinstance(v, list):
            return None
        return [_clean_obj(x) for x in v if isinstance(x, dict)][: spec.get("max", 4)] or None
    if t == "obj":
        return _clean_obj(v) if isinstance(v, dict) else None
    return str(v)[:40]


_SAFE_PATH = re.compile(r"^[MmLlHhVvCcSsQqTtAaZz0-9\s.,+\-eE]+$")


def _clean_obj(o):
    """Bersihkan item aktor/props/kustom: hanya tipe sederhana, path SVG disaring."""
    out = {}
    for k, v in list(o.items())[:24]:
        k = str(k)[:24]
        if k in {"x", "y", "x_akhir", "tangan_x", "tangan_y", "di_atas", "skala", "aktor", "cue", "muncul"} or k.endswith("_cue"):
            try:
                number = float(v)
                if math.isfinite(number):
                    out[k] = number
            except (TypeError, ValueError, OverflowError):
                pass
            continue
        if isinstance(v, bool) or v is None:
            out[k] = v
        elif isinstance(v, (int, float)):
            if math.isfinite(v):
                out[k] = float(v)
        elif isinstance(v, str):
            v = v.strip()
            if k == "path":
                v = re.sub(r"\s+", " ", v)
                if not _SAFE_PATH.match(v) or len(v) > 6000 or not re.match(r"^[Mm]", v):
                    continue
            out[k] = v[:6000 if k == "path" else 40]
    return out


def normalize(raw, cues, cat, limit=11):
    """Perbaiki rencana apa pun (dari LLM atau manusia) supaya selalu valid."""
    n = len(cues)
    warns = []
    ad = raw.get("adegan") or []
    clean = []
    for a in ad:
        try:
            clean.append({"dari": int(a.get("dari", 0)), "sampai": int(a.get("sampai", 0)), "template": str(a.get("template", "")),
                          "params": a.get("params") or {}, "kamera": a.get("kamera") or {}})
        except Exception:
            warns.append(f"adegan rusak dibuang: {a}")
    clean.sort(key=lambda a: (a["dari"], a["sampai"]))
    out, nxt = [], 0
    for a in clean:
        if nxt >= n:
            break
        a["dari"] = nxt
        a["sampai"] = max(a["dari"], min(n - 1, a["sampai"]))
        out.append(a)
        nxt = a["sampai"] + 1
    if not out:
        raise ValueError("rencana tidak berisi adegan")
    out[-1]["sampai"] = n - 1
    for a in out:
        if a["template"] not in cat:
            warns.append(f"template '{a['template']}' tidak dikenal")
            guess = _guess_template(" ".join(c["text"] for c in cues[a["dari"]:a["sampai"] + 1]), None)
            a["template"] = guess if guess in cat else next(iter(cat))
        spec = cat[a["template"]]["params"]
        p = {}
        for k, v in a["params"].items():
            if k in spec:
                cv = _coerce(spec[k], v, a["dari"], a["sampai"])
                if cv is not None:
                    p[k] = cv
        a["params"] = p
        g = (a["kamera"] or {}).get("gerak")
        a["kamera"] = {"gerak": g if g in GERAK else "maju"}
    # durasi: gabung yang terlalu pendek, belah yang terlalu panjang
    dur = lambda a: cues[a["sampai"]]["end"] - cues[a["dari"]]["start"]
    i = 0
    while i < len(out) and len(out) > 1:
        neighbor = out[i - 1] if i else out[1]
        if dur(out[i]) < 1.4 and (out[i]["template"], out[i]["params"]) == (neighbor["template"], neighbor["params"]):
            if i > 0:
                if i == len(out) - 1:  # adegan terakhir (klimaks) dipertahankan, ambil alih yang sebelumnya
                    out[i]["dari"] = out[i - 1]["dari"]
                    out.pop(i - 1)
                else:
                    out[i - 1]["sampai"] = out[i]["sampai"]
                    out.pop(i)
            else:
                out[1]["dari"] = out[0]["dari"]
                out.pop(0)
            continue
        i += 1
    res = []
    for ai, a in enumerate(out):
        lim = limit + 5 if ai == len(out) - 1 else limit  # klimaks boleh lebih panjang
        if dur(a) > lim and a["sampai"] > a["dari"]:
            idx = range(a["dari"], a["sampai"])
            mid = (cues[a["dari"]]["start"] + cues[a["sampai"]]["end"]) / 2
            cut = min(idx, key=lambda k: abs(cues[k]["end"] - mid) - 0.5 * (cues[k + 1]["start"] - cues[k]["end"]))
            b = json.loads(json.dumps(a))
            a2 = dict(a, sampai=cut)
            b["dari"] = cut + 1
            b["kamera"] = {"gerak": "geser_kanan" if a["kamera"]["gerak"] != "geser_kanan" else "mundur"}
            a2["params"] = dict(a["params"])
            for k in list(a2["params"]):
                if k.endswith("_cue") and a2["params"][k] > cut:
                    a2["params"].pop(k)
            if "sosok" in a2["params"] and "sosok_muncul_cue" in b["params"]:
                a2["params"]["sosok"] = False  # sosok hanya muncul di bagian yang memang memintanya
            for k in list(b["params"]):
                if k.endswith("_cue") and b["params"][k] <= cut:
                    b["params"].pop(k)
            res += [a2, b]
            warns.append(f"adegan {a['template']} dibelah (terlalu panjang)")
        else:
            res.append(a)
    peran = {}
    pr = raw.get("peran") or []
    if isinstance(pr, dict):
        pr = [{"i": k, "peran": v} for k, v in pr.items()]
    for x in pr:
        try:
            if x.get("peran") in PERAN and 0 <= int(x["i"]) < n:
                peran[int(x["i"])] = x["peran"]
        except Exception:
            pass
    # Keep word-anchored directions with their cue when normalization splits a scene.
    directions = []
    for scene in ad:
        if not isinstance(scene, dict) or not isinstance(scene.get("momen"), list):
            continue
        for item in scene["momen"][:12]:
            if not isinstance(item, dict) or not isinstance(item.get("fokus"), str):
                continue
            cue = _int(item.get("cue"))
            focus = item["fokus"].strip()[:180]
            if focus and _int(scene.get("dari")) <= cue <= _int(scene.get("sampai")):
                directions.append((scene.get("template"), dict(cue=cue, kata=str(item.get("kata", ""))[:60], fokus=focus)))
    for scene in res:
        notes = [item for template,item in directions if template == scene["template"] and scene["dari"] <= item["cue"] <= scene["sampai"]]
        if notes:
            scene["momen"] = notes
    judul = str(raw.get("judul") or "").strip()[:40]
    return {"schema_version": max(raw.get("schema_version", 1), 2 if any(cat.get(a["template"],{}).get("metadata",{}).get("action") for a in res) else 1), "library_version": raw.get("library_version", library.VERSION), "continuity": raw.get("continuity", {}), "judul": judul, "adegan": res, "peran": [{"i": i, "peran": peran.get(i, cues[i].get("role", "narasi"))} for i in range(n)]}, warns


# ---------------- sutradara berbasis aturan (cadangan) ----------------
RULES = [
    (r"sate|panggang|mengipas.*bara", "bakar_sate", {}),
    (r"memasak|mengaduk|merebus|di dapur", "dapur_memasak", {}),
    (r"\bpasar\b|lapak|kios|toko|pedagang|pembeli", "pasar_ramai", {}),
    (r"kentongan|pukul|memukul", "kentongan_dekat", {}),
    (r"pos ronda|ronda", "pos_ronda_kosong", {}),
    (r"pintu|mengetuk|ketuk", "pintu_diketuk", {"ketukan": 2}),
    (r"nasi|makan|piring|meja", "meja_makan", {}),
    (r"kubur|makam|nisan|pemakaman|jenazah|mayat", "kuburan", {}),
    (r"sumur", "sumur", {}),
    (r"hutan|pohon|kebun|ladang", "hutan_kabut", {}),
    (r"jalan|pulang|berjalan|melangkah|lewat", "jalan_setapak", {}),
    (r"jendela|di luar|dari luar", "jendela_malam", {}),
    (r"kamar|tempat tidur|tidur|kasur|ranjang", "kamar_tidur", {"sosok": False}),
    (r"besoknya|pagi|subuh|hilang|kosong", "rumah_kosong_pagi", {}),
    (r"rumah|keluarga|penghuni|tetangga|sebelah", "rumah_panggung", {}),
    (r"kampung|desa|warga", "kampung_malam", {}),
    (r"\baku\b|\bsaya\b|percaya|takut", "kamar_lampu", {}),
]
SCARY = r"siapa|sosok|berdiri|di belakang|memperhatikan|menatap|matanya|wajah|bayangan|tersenyum|di sudut"


def _guess_template(text, prev):
    t = text.lower()
    for rx, name, _ in RULES:
        if re.search(rx, t):
            return name
    pool = ["kampung_malam", "jalan_setapak", "hutan_kabut", "kamar_lampu", "rumah_panggung"]
    return next(x for x in pool if x != prev)


def rule_based(cues, events, cat):
    n = len(cues)
    groups, cur = [], [0]
    for i in range(1, n):
        d = cues[i - 1].get("pe", cues[i - 1]["end"]) - cues[cur[0]]["start"]
        gap = cues[i]["start"] - cues[i - 1].get("pe", cues[i - 1]["end"])
        focus_before = _activity(cues[i - 1]["text"])
        focus_now = _activity(cues[i]["text"])
        if (focus_now and focus_now != focus_before) or (d >= 3.2 and gap >= 0.45) or (d >= 4.5 and gap >= 0.3) or d >= 6.5:
            groups.append(cur)
            cur = [i]
        else:
            cur.append(i)
    groups.append(cur)
    if len(groups) > 1 and not _activity(cues[groups[-1][0]]["text"]) and cues[groups[-1][-1]]["end"] - cues[groups[-1][0]]["start"] < 4.5:
        tail = groups.pop()
        groups[-1] += tail  # klimaks butuh waktu
    knocks = [e["t"] for e in events if e["type"] == "ketuk"]
    adegan, prev = [], None
    for gi, g in enumerate(groups):
        text = " ".join(cues[i]["text"] for i in g)
        s, e = cues[g[0]]["start"], cues[g[-1]]["end"]
        params = {}
        has_knock = any(s - 0.2 <= k <= e for k in knocks)
        last = gi == len(groups) - 1
        activity = _activity(text)
        if activity:
            tpl = activity
            params = {"sepi": bool(re.search(r"sepi|kosong|tak ada (?:orang|pembeli)", text, re.I))}
            if activity != "pasar_ramai":
                params["aksi_mulai_cue"] = next(i for i in g if _activity(cues[i]["text"]) == activity)
        elif last and GHOST.search(text):
            tpl = "kamar_tidur"
            params = {"sosok": True}
            sc = [i for i in g if re.search(SCARY, cues[i]["text"].lower())]
            if sc:
                params["sosok_muncul_cue"] = sc[0]
        elif gi == 0 and not re.search(r"kentongan|pintu|kubur|sumur|hutan|kamar|nasi", text.lower()):
            tpl = "kampung_malam"
        elif has_knock:
            tpl = "jendela_malam" if prev != "jendela_malam" else "kentongan_dekat"
        else:
            tpl = _guess_template(text, prev)
            for rx, name, ps in RULES:
                if name == tpl:
                    params = dict(ps)
                    break
        gerak = ["maju", "geser_kanan", "maju", "mundur", "maju", "geser_kiri"][gi % 6]
        adegan.append({"dari": g[0], "sampai": g[-1], "template": tpl, "params": params, "kamera": {"gerak": gerak}})
        prev = tpl
    peran = []
    for c in cues:
        r = c.get("role", "narasi")
        if re.search(r"\bjangan\b", c["text"].lower()):
            r = "dialog"
        peran.append({"i": c["i"], "peran": r})
    peran[-1]["peran"] = "seram"
    return {"judul": "", "adegan": adegan, "peran": peran}


def generic_rule_based(cues, cat):
    """Cadangan untuk style lain: pakai template berurutan dari katalog, ~5 detik per adegan."""
    names = list(cat)
    groups, cur = [], [0]
    for i in range(1, len(cues)):
        if cues[i - 1]["end"] - cues[cur[0]]["start"] >= 4.5:
            groups.append(cur)
            cur = [i]
        else:
            cur.append(i)
    groups.append(cur)
    body = [n for n in names if not n.startswith("judul")] or names
    ad = []
    for gi, g in enumerate(groups):
        tpl = names[0] if gi == 0 and names[0].startswith("judul") else body[gi % len(body)]
        p = {}
        if "teks" in cat[tpl]["params"]:
            p["teks"] = cues[g[0]]["text"][:40]
        ad.append({"dari": g[0], "sampai": g[-1], "template": tpl, "params": p, "kamera": {"gerak": "diam"}})
    return {"judul": "", "adegan": ad, "peran": [{"i": c["i"], "peran": "narasi"} for c in cues]}


# ---------------- API utama ----------------
# Konteks vLLM kecil (mis. 6144) sedangkan katalog saja ~3000 token, jadi naskah disutradarai
# per bagian. Ringkasan cerita ikut di tiap bagian supaya tokoh/tempat konsisten.
CHUNK = 18          # cue per bagian (dibelah otomatis bila tidak muat di konteks)
OUT_PER_CUE = 350   # komposisi kaya: aktor, props, dan cue aksi memerlukan ruang
VIS_BATCH = 40      # cue per permintaan analisis visual
BIG_CHUNK = 6      # fokus detail adegan, jangan memadatkan cerita panjang jadi gambar generik


def _summary(cues, log, style=None):
    text = "\n".join(f"{c['i']}. {c['text']}" for c in cues)
    educational = style and style.get("fallback") == "edukasi"
    instructions = ("- TOPIK: objek atau sistem yang dijelaskan\n"
                    "- TEMPAT: lingkungan yang disebut, jangan menambah tempat baru\n"
                    "- BAHAN/BAGIAN: benda, bahan, dan komponen beserta nomor kalimat\n"
                    "- PROSES: langkah pembuatan, pemasangan, atau cara kerja secara berurutan\n"
                    "- MASALAH/SOLUSI: sebab akibat yang benar-benar disebut; jangan menambah bencana"
                    if educational else
                    "- TOKOH: siapa saja + jenis (pria/bapak/wanita/gadis/anak/nenek/kakek)\n"
                    "- TEMPAT: tempat-tempat yang muncul + nomor kalimatnya\n"
                    "- HANTU: makhluk apa (bayangan/kuntilanak/pocong/genderuwo/tuyul) + nomor kalimat kemunculannya\n"
                    "- ALUR: 2-3 kalimat ringkas, termasuk twist/klimaks di akhir")
    if style and style.get("fallback") == "cerita_stik":
        instructions = ("- TOKOH: ciri, pakaian, properti, hubungan antartokoh\n"
                        "- TEMPAT: lingkungan dan cue perpindahan\n"
                        "- AKSI: urutan tindakan, reaksi, dan detail benda\n"
                        "- PENJELASAN: proses, arah aliran atau perubahan yang disebut narator")
    msgs = [{"role": "system", "content": "Kamu analis cerita. Jawab singkat dalam bahasa Indonesia, tanpa pembuka."},
            {"role": "user", "content": f"NASKAH (bernomor):\n{text}\n\nTulis maks 8 baris:\n"
                                        + instructions}]
    try:
        return _chat(msgs, None, log, max_out=400).strip()[:1500]
    except Exception as e:
        log(f"Ringkasan cerita dilewati: {e}")
        return ""


def _visual_notes(cues, story, log, style=None):
    """Tahap 'storyboard': AI menulis apa yang TERLIHAT di tiap kalimat sebelum memilih template.
    Kalimat ambigu ("Dia tersenyum...") jadi jelas siapa/di mana. Kembalikan {i: catatan}."""
    notes = {}
    for a in range(0, len(cues), VIS_BATCH):
        part = cues[a:a + VIS_BATCH]
        prev = "\n".join(f"{c['i']}. {c['text']}" for c in cues[max(0, a - 4):a])
        educational = style and style.get("fallback") == "edukasi"
        role = "Kamu storyboard artist animasi edukasi 3D Indonesia. Tampilkan bahan, komponen, proses dan sebab akibat sesuai naskah; jangan menambah kejadian yang tidak disebut." if educational else "Kamu storyboard artist film horor Indonesia."
        example = "12. bengkel cetak beton | cetakan memanjang dan tiang beton | beton dipadatkan di cetakan | peralatan kerja di latar" if educational else "12. jalan desa malam | anak laki-laki berjalan, membawa lentera | rumah tua di kejauhan, jendela menyala"
        if style and style.get("fallback") == "cerita_stik":
            educational = True
            role = "Kamu storyboard artist kartun Cerita Stik Indonesia. Perhatikan ekspresi, benda yang dipegang dan proses yang terlihat."
            example = "12. lapangan | anak berbaju kuning | tangan mengangkat gulungan benang | layangan naik di atas pematang"
        msgs = [{"role": "system", "content": role + " Jawab ringkas, tanpa pembuka."},
                {"role": "user", "content": (f"RINGKASAN CERITA:\n{story}\n\n" if story else "") +
                 (f"KALIMAT SEBELUMNYA (konteks):\n{prev}\n\n" if prev else "") +
                 "KALIMAT NARASI:\n" + "\n".join(f"{c['i']}. {c['text']}" for c in part) +
                 "\n\nUntuk SETIAP nomor kalimat di atas, tulis satu baris persis format:\n"
                 "<nomor>. <lokasi> | <siapa/apa yang terlihat di layar + jenisnya> | <aksi utama + alat dan objek interaksinya> | <aktivitas latar dan detail lingkungan>\n"
                 f"Contoh: {example}\n"
                 "Kalimat tanpa gambar jelas (\"Lalu...\", \"Tapi anehnya...\"): lanjutkan suasana/lokasi kalimat sebelumnya. "
                 "Kata ganti (dia/nya/itu) tulis jelas siapa/apa. " +
                 ("Pertahankan objek utama pada cue lanjutan; cocokkan ilustrasi dengan tahap proses." if educational else "Hantu hanya ditulis bila memang sudah muncul di cerita.")}]
        try:
            out = _chat(msgs, None, log, max_out=110 * len(part) + 150)
        except Exception as e:
            log(f"Analisis visual #{a}-#{a + len(part) - 1} dilewati: {e}")
            continue
        for line in out.splitlines():
            m = re.match(r"\s*[#*-]*\s*(\d+)\s*[.):-]\s*(.+)", line)
            if m and a <= int(m.group(1)) < a + len(part):
                notes[int(m.group(1))] = m.group(2).strip()[:450]
    return notes


def _chunk_msgs(cues, a, b, cat, style, story, prev_tpl, extra, single=False):
    n = len(cues)
    before = cues[max(0, a - 3):a]
    after = cues[b + 1:b + 3]
    pos = "AWAL cerita (pembuka)" if a == 0 else ("AKHIR cerita (klimaks/penutup)" if b == n - 1 else "TENGAH cerita")
    u = f"KATALOG ADEGAN:\n{_catalog_text(cat)}\n\n"
    if story:
        u += f"RINGKASAN SELURUH CERITA:\n{story}\n\n"
    u += f"Total {n} cue (#0-#{n - 1}). Bagian ini: {pos}.\n"
    if before:
        u += "Konteks sebelumnya (sudah punya adegan" + (f", adegan terakhir: {prev_tpl}" if prev_tpl else "") + "):\n" + _cue_text(before) + "\n"
    u += f"\nCUE YANG HARUS DIBUAT ADEGANNYA (#{a}-#{b}):\n{_cue_text(cues[a:b + 1])}\n"
    if after:
        u += "Konteks sesudahnya (JANGAN dibuat adegannya):\n" + _cue_text(after) + "\n"
    dur = cues[b]["end"] - cues[a]["start"]
    want = 1 if single else max(1, min(b - a + 1, round(dur / 5)))
    if style.get("fallback") == "cerita_stik":
        u += (f"\nBuat sekitar {want} adegan untuk semua cue #{a} sampai #{b}. "
              "Gunakan template dan parameter katalog Cerita Stik. Pertahankan pakaian, properti "
              "dan lokasi antarcue. Pilih ekspresi atau proses yang membuktikan kalimat. "
              "Isi dari/sampai, params, kamera.gerak dan peran dialog bila ada. " + _COMPACT)
        if extra:
            u += f"\nPermintaan pengguna: {extra}"
        return [{"role": "system", "content": style["_prompt"]}, {"role": "user", "content": u}]
    u += (f"\nBuat adegan HANYA untuk cue #{a} sampai #{b} ({dur:.0f} detik, sekitar {want} adegan): "
          f"adegan pertama dari={a}, adegan terakhir sampai={b}, semua cue di antaranya tercakup. "
          "Setiap gambar harus menggambarkan isi kalimatnya (tempat, tokoh, kegiatan, benda yang disebut); "
          "pakai baris \"visual\" sebagai panduan utama lokasi, tokoh (jenis orang), pose, dan sosok. "
          "Gabungkan cue berurutan yang lokasi & fokusnya sama ke satu adegan; ganti adegan saat lokasi/fokus berubah. "
          "Adegan pasar WAJIB punya toko/lapak, dagangan, pedagang dan pembeli sesuai kondisi naskah. "
          "Membakar sate WAJIB memperlihatkan tangan mengipas/membalik sate DI ATAS panggangan, bara dan asap. "
          "Gunakan pasar_ramai, bakar_sate, dapur_memasak jika cocok. Untuk aktivitas lain rakit komposisi: "
          "aksi utama yang jelas + alat/objek interaksi + aktivitas pendukung dan lapisan lingkungan. "
          "Atur cue pada aktor dan aksi_mulai_cue sesuai nomor kalimat audio; jangan mulai aksi dari awal adegan jika belum disebut. "
          "Hantu (sosok, sosok_dekat) HANYA untuk cue yang baris visualnya menyebut hantu; adegan manusia biasa tanpa sosok. "
          "\"peran\" cukup berisi cue yang dialog (ucapan tokoh) atau seram (WAJIB tandai 1-3 kalimat paling menakutkan/twist; "
          "kalimat penutup cerita biasanya seram). " + ("Isi judul (maks 4 kata, bikin penasaran). " if a == 0 else "judul boleh kosong. ") +
          "Format jawaban persis seperti contoh ini (params sesuai katalog template yang dipilih):\n"
          '{"judul":"...","adegan":[{"dari":%d,"sampai":%d,"template":"kampung_malam","params":{"waktu":"malam"},"kamera":{"gerak":"maju"}}],'
          '"peran":[{"i":%d,"peran":"seram"}]}\n' % (a, a, b) + _COMPACT)
    if extra:
        u += f"\n\nPERMINTAAN USER (PRIORITAS TERTINGGI, wajib diikuti): {extra}"
    return [{"role": "system", "content": style["_prompt"]}, {"role": "user", "content": u}]


def _clip(adegan, a, b, fill=True):
    """Rapikan adegan satu bagian supaya berurutan mulai cue a; fill=True -> paksa berakhir tepat di b."""
    out = []
    for x in sorted((x for x in adegan if isinstance(x, dict)), key=lambda x: (_int(x.get("dari")), _int(x.get("sampai")))):
        s = min(b, _int(x.get("sampai")))
        d = out[-1]["sampai"] + 1 if out else a
        if d > b:
            break
        if out and (x.get("template"), x.get("params")) == (out[-1].get("template"), out[-1].get("params")):
            out[-1]["sampai"] = max(d, s)  # adegan kembar (model mengulang): gabung
            continue
        out.append(dict(x, dari=d, sampai=max(d, s)))
    if not out:
        raise ValueError("tidak ada adegan untuk bagian ini")
    if fill:
        out[-1]["sampai"] = b
    return out


def _int(v, default=-1):
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _cut_long(ad, cues, style, log):
    """AI kadang menutup banyak kalimat dengan satu gambar. Potong adegan pertama yang terlalu panjang
    (kartu judul maks 3.5 dtk) dan buang sesudahnya; sisa cue akan diminta ulang ke AI."""
    lim = style.get("maks_detik_adegan", 11)
    for k, s in enumerate(ad):
        focus = _activity(cues[s["dari"]]["text"]) if style.get("fallback", "horor") == "horor" else None
        for j in range(s["dari"] + 1, s["sampai"] + 1):
            new_focus = _activity(cues[j]["text"]) if style.get("fallback", "horor") == "horor" else None
            if new_focus and new_focus != focus:
                log(f"Fokus aktivitas berubah di cue #{j}; adegan dipisah mengikuti audio")
                return ad[:k] + [dict(s, sampai=j - 1)]
            focus = new_focus or focus
        L = 3.5 if s.get("template") == "judul_kartu" else (lim + 5 if s["sampai"] == len(cues) - 1 else lim)
        t0 = cues[s["dari"]]["start"]
        if s["sampai"] > s["dari"] and cues[s["sampai"]]["end"] - t0 > L:
            j = s["dari"]
            while j < s["sampai"] and cues[j + 1]["end"] - t0 <= L * 0.7:
                j += 1
            log(f"Adegan {s.get('template')} #{s['dari']}-#{s['sampai']} terlalu panjang, dipotong sampai #{j}")
            return ad[:k] + [dict(s, sampai=j)]
    return ad


GHOST = re.compile(r"kuntilanak|pocong|genderuwo|tuyul|hantu|sosok|bayangan|arwah|makhluk|setan|penampakan|\bjin\b", re.I)


def _shows_ghost(s):
    p = s.get("params") or {}
    return s.get("template") in ("sosok_dekat", "bayangan_jendela", "cermin_berbeda", "sosok_pohon", "pocong_melompat", "kuntilanak_turun") or p.get("sosok") not in (None, False, "", {}, [])


def _activity(text):
    """Konsep yang punya rig interaksi khusus; urutan aksi lebih spesifik dari tempat."""
    path = Cfg.STYLES_DIR / "horor_kampung/library/manifest.json"
    if path.exists():
        for name, r in json.loads(path.read_text())["recipes"].items():
            if r["label"] in text.lower() and not re.search(r"(?:tidak|jangan|belum)\s+" + re.escape(r["label"]), text, re.I):
                return name
    for rx, name, _ in RULES[:3]:
        if re.search(rx, text, re.I):
            return name
    return None


def _activity_matches(scene, expected):
    if scene.get("template") == expected:
        return True
    if scene.get("template") != "komposisi":
        return False
    p = scene.get("params") or {}
    props = {q.get("jenis") for q in p.get("props", []) if isinstance(q, dict)}
    poses = {q.get("pose") for q in p.get("aktor", []) if isinstance(q, dict)}
    if expected == "pasar_ramai":
        return p.get("latar") == "pasar" or bool(props & {"toko", "kios_sayur", "kios_buah"})
    if expected == "bakar_sate":
        return "panggangan" in props and bool(poses & {"mengipas", "membalik_sate"})
    return "panci" in props and "mengaduk" in poses


def _issues(ad, cues, cat=None):
    """Pemeriksa: cocokkan adegan dengan catatan visual. Kembalikan daftar kesalahan (teks untuk AI)."""
    out = []
    for s in ad:
        cs = cues[s["dari"]:s["sampai"] + 1]
        tag = f"adegan #{s['dari']}-#{s['sampai']} ({s.get('template')})"
        expected = _activity(" ".join(c["text"] for c in cs))
        if cat is not None and expected not in cat:
            expected = None
        if expected and not _activity_matches(s, expected):
            out.append(f"{tag}: tempat/aksi utama narasi belum tergambar. Gunakan {expected} atau komposisi dengan properti dan pose interaksi setara, sesuai cue audio.")
        if (_shows_ghost(s) and any(c.get("vis") for c in cs) and s["sampai"] < len(cues) - 1  # klimaks akhir boleh jumpscare
                and not any(GHOST.search(c["text"] + " " + c.get("vis", "")) for c in cs)):
            out.append(f"{tag} menampilkan hantu, padahal di cue itu tidak ada hantu (lihat baris visual). "
                       "Pilih template sesuai lokasi & tokoh di baris visual, tanpa sosok.")
        if s.get("template") == "judul_kartu" and any(len(c["text"].split()) > 5 for c in cs):
            out.append(f"{tag}: judul_kartu dipakai untuk kalimat narasi. Gambarkan isi kalimatnya.")
    return out


def _autofix(ad, cues, prev_tpl, log, cat=None):
    """Bila AI tetap salah setelah ditegur: buang hantu / kartu judul yang tidak pada tempatnya."""
    for s in ad:
        cs = cues[s["dari"]:s["sampai"] + 1]
        txt = " ".join(c["text"] + " " + c.get("vis", "") for c in cs)
        if not _issues([s], cues, cat):
            prev_tpl = s.get("template")
            continue
        expected = _activity(" ".join(c["text"] for c in cs))
        if cat is not None and expected not in cat:
            expected = None
        if expected and not _activity_matches(s, expected):
            s["template"] = expected
            s["params"] = {"sepi": bool(re.search(r"sepi|kosong", txt, re.I))}
            if expected != "pasar_ramai":
                s["params"]["aksi_mulai_cue"] = next(c["i"] for c in cs if _activity(c["text"]) == expected)
        if s.get("template") in ("sosok_dekat", "judul_kartu"):
            s["template"], s["params"] = _guess_template(txt, prev_tpl), {}
        else:
            s["params"] = {k: v for k, v in (s.get("params") or {}).items() if not k.startswith("sosok")}
        log(f"Perbaikan otomatis adegan #{s['dari']}-#{s['sampai']} -> {s['template']}")
        prev_tpl = s["template"]
    return ad


def _direct_range(cues, a, b, cat, style, story, prev_tpl, extra, log, single=False):
    """Sutradarai cue a..b; bagian dibelah otomatis bila tidak muat/terpotong. Kembalikan (adegan, peran, judul)."""
    ranges, done = [(a, b)], []
    while ranges:
        x, y = ranges.pop(0)
        selected = library.shortlist(cat, " ".join(c["text"] + " " + c.get("vis", "") for c in cues[x:y+1]), pinned=[prev_tpl] if prev_tpl else [])
        msgs = _chunk_msgs(cues, x, y, selected, style, story, prev_tpl, extra, single)
        refs = library.references(style["name"], selected, " ".join(c["text"] for c in cues[x:y+1]))
        if refs:
            msgs[-1]["content"] += "\nCONTOH TERVERIFIKASI:\n" + json.dumps(refs, ensure_ascii=False)
        log("Kandidat template: " + ", ".join(selected))
        err, critiqued = None, False
        for attempt in range(3):
            try:
                raw = parse_json(_chat(msgs, _schema(selected, x, y, single), log, min_out=min(3000, 300 + OUT_PER_CUE * (y - x + 1)), max_out=1200 + 500 * (y - x + 1)))
                ad, pr, jd = raw.get("adegan") or [], raw.get("peran") or [], str(raw.get("judul") or "")
            except TooLong as e:
                ad, pr, jd = [s for s in _salvage(e.partial) if s.get("template") in cat], [], ""
                if not ad:
                    err = e
                    break
                log(f"Bagian #{x}-#{y}: jawaban terpotong, {len(ad)} adegan utuh dipakai")
            except Exception as e:
                err = e
                log(f"Bagian #{x}-#{y} percobaan {attempt + 1} gagal: {e}")
                continue
            try:
                ad = _clip(ad, x, y, fill=False)
            except ValueError as e:
                err = e
                continue
            if not single:
                ad = _cut_long(ad, cues, style, log)
            if not single:  # /ubah: permintaan user boleh menyimpang dari pemeriksa
                bad = _issues(ad, cues, cat)
                if bad and not critiqued:
                    critiqued = True
                    log(f"Bagian #{x}-#{y}: pemeriksa menemukan {len(bad)} kesalahan, AI diminta memperbaiki")
                    msgs = msgs[:-1] + [{"role": "user", "content": msgs[-1]["content"] +
                                         "\n\nPERHATIAN, jawaban sebelumnya salah, jangan ulangi:\n- " + "\n- ".join(bad)}]
                    continue
                if bad:
                    ad = _autofix(ad, cues, prev_tpl, log, cat)
            if single:  # /ubah: satu adegan utuh menggantikan adegan lama
                ad[-1]["sampai"] = y
            ad = ad if single else _cut_long(ad, cues, style, log)
            end = ad[-1]["sampai"]
            if end < y:  # sisa cue belum punya adegan: minta lagi (rentang selalu mengecil), jangan ditarik
                log(f"Bagian #{x}-#{y}: AI hanya sampai #{end}, sisa #{end + 1}-#{y} diminta ulang")
                ranges.insert(0, (end + 1, y))
            done.append((ad, pr, jd))
            prev_tpl = ad[-1].get("template")
            err = None
            break
        if isinstance(err, TooLong) and y > x:
            mid = (x + y) // 2
            log(f"Bagian #{x}-#{y} terlalu panjang ({err}), dibelah dua")
            ranges[:0] = [(x, mid), (mid + 1, y)]
        elif err:
            raise err
    ad = [s for d in done for s in d[0]]
    peran = [p for d in done for p in d[1]]
    return ad, peran, next((d[2] for d in done if d[2].strip()), "")


_EDU_RULES = [  # (pola, template, params) dicek berurutan per kelompok kalimat
    (r"jembatan.*biasa|melihat sebuah jembatan|jembatan selesai", "cofferdam", {"tahap": "jembatan_selesai", "latar": "sungai"}),
    (r"ruang kerja kering|tanah yang kering|seolah-olah", "cofferdam", {"tahap": "kering", "latar": "sungai"}),
    (r"dinding besi.*dibongkar|dibongkar|air sungai kembali", "cofferdam", {"tahap": "bongkar", "latar": "sungai"}),
    (r"membangun fondasi|tiang jembatan di dalamnya|tiang jembatan", "cofferdam", {"tahap": "cor_tiang", "latar": "sungai"}),
    (r"rangka baja|penyangga untuk menahan|rangka|dinding diperkuat", "cofferdam", {"tahap": "rangka", "latar": "sungai"}),
    (r"tekanan air|mendorong dinding|kebanjiran", "cofferdam", {"tahap": "tekanan", "latar": "sungai"}),
    (r"pompa|menyedot air|air mulai turun|relatif kering", "cofferdam", {"tahap": "sedot", "latar": "sungai"}),
    (r"kotak besi|di dalam kotak", "cofferdam", {"tahap": "kotak_penuh", "latar": "sungai"}),
    (r"lembaran.*baja|ditancapkan|saling mengunci|dinding tertutup", "cofferdam", {"tahap": "tancap", "latar": "sungai"}),
    (r"cofferdam", "detail", {"benda": "cofferdam", "latar": "sungai", "panah": True, "label_objek": "Cofferdam"}),
    (r"sungai yang deras|di tengah sungai|aliran sungai|kedalaman air", "cofferdam", {"tahap": "sungai_deras", "latar": "sungai"}),
    (r"\bisolator\b|\bsirip(?:-sirip)?\b", "detail", {"benda": "isolator", "panah": True}),
    (r"terowongan|lorong", "bawah_tanah", {"isi": "terowongan"}),
    (r"runtuh|longsor", "masalah", {"kejadian": "runtuh"}),
    (r"rubuh|roboh|tumbang|jatuh", "masalah", {"kejadian": "rubuh"}),
    (r"banjir|tergenang", "masalah", {"kejadian": "banjir"}),
    (r"korslet|kesetrum|tersengat|hubungan pendek", "masalah", {"kejadian": "korsleting"}),
    (r"lapuk|busuk|rapuh|keropos", "bawah_tanah", {"isi": "tiang_bambu", "efek": "lapuk", "panah": True}),
    (r"lembap|basah|rembes", "bawah_tanah", {"isi": "tiang_bambu", "efek": "lembap", "panah": True}),
    (r"akar", "bawah_tanah", {"isi": "akar", "panah": True}),
    (r"pipa|saluran", "bawah_tanah", {"isi": "pipa", "panah": True}),
    (r"fondasi|pondasi", "bawah_tanah", {"isi": "fondasi", "panah": True}),
    (r"air tanah|sumur", "bawah_tanah", {"isi": "air_tanah"}),
    (r"gali|cangkul|lubang", "aktivitas", {"aksi": "gali"}),
    (r"panjat|naik ke|memanjat", "aktivitas", {"aksi": "panjat"}),
    (r"tanam|bibit|benih", "aktivitas", {"aksi": "tanam"}),
    (r"angkat|pikul|bawa", "aktivitas", {"aksi": "angkat"}),
    (r"\bkekeringan\b|\bkemarau\b|tanah kering", "masalah", {"kejadian": "kekeringan"}),
]


def edukasi_rule_based(cues, cat):
    """Cadangan gaya edukasi_3d tanpa AI: tebak latar & adegan dari kata kunci, ~4 detik per adegan."""
    full = " ".join(c["text"] for c in cues).lower()
    if not cues:
        return {"judul": "", "adegan": [], "peran": []}
    latar = ("sungai" if re.search(r"\b(?:sungai|jembatan|air|cofferdam|dasar sungai)\b", full)
             else "sawah" if re.search(r"\b(?:sawah|padi|petani|ikan)\b", full) else "kota" if re.search(r"\b(?:kota|gedung|kereta|jalan raya|mrt)\b", full)
             else "bukit" if re.search(r"\b(?:bukit|gunung|hutan|tambang)\b", full) else "kampung")
    groups, cur = [], [0]
    for i in range(1, len(cues)):
        if cues[i - 1]["end"] - cues[cur[0]]["start"] >= 2.8:
            groups.append(cur)
            cur = [i]
        else:
            cur.append(i)
    groups.append(cur)
    ad = []
    subject = "tiang_beton" if re.search(r"\btiang\b", full) else "tidak_ada"
    for gi, g in enumerate(groups):
        txt = " ".join(cues[i]["text"] for i in g).lower()
        previous = subject
        objects = [(r"\bisolator\b|\bsirip(?:-sirip)?\b", "isolator"),
                   (r"\bbambu\b", "tiang_bambu"), (r"\bbeton\b|\bkabel\b|\btiang listrik\b", "tiang_beton"),
                   (r"\btiang kayu\b", "tiang_kayu"), (r"\btiang besi\b", "tiang_besi"),
                   (r"\bpipa\b", "pipa"), (r"\bakar\b", "akar"),
                   (r"\bbibit\b|\bbenih\b", "bibit")]
        subject = next((obj for rx, obj in objects if re.search(rx, txt)), previous)
        if gi == 0:
            tpl, p = "pembuka", {"tokoh": True}
        elif gi == len(groups) - 1 and len(groups) > 2:
            tpl, p = "penutup", {}
        else:
            num = re.search(r"\b(\d+(?:[.,]\d+)?\s*(?:%|persen|meter|tahun|hari|jam|kilo\w*|ton|derajat|cm|km)?)", txt)
            hit = next(((t, dict(pp)) for rx, t, pp in _EDU_RULES if re.search(rx, txt)), None)
            if subject == "isolator" and re.search(r"sirip|permukaan|arus|basah|bocor|fungsi|menyangga", txt):
                tpl, p = "detail", {"benda": "isolator", "panah": True, "label_objek": "Isolator"}
            elif hit:
                tpl, p = hit
            elif num:
                tpl, p = "angka", {"nilai": num.group(1)[:16]}
            else:
                tpl, p = "aktivitas", {"aksi": "tunjuk" if subject != "tidak_ada" else "lapor"}
        if tpl not in cat:
            tpl, p = "aktivitas", {"aksi": "lapor"}
        p["latar"] = latar
        if tpl in ("pembuka", "aktivitas", "penutup"):
            p["objek"] = subject if subject != "akar" else "pohon"
        elif tpl == "bawah_tanah" and p.get("isi") == "tiang_bambu" and subject.startswith("tiang_"):
            p["isi"] = subject
        if subject != "tidak_ada":
            p.setdefault("judul", subject.replace("_", " ").title())
        ad.append({"dari": g[0], "sampai": g[-1], "template": tpl, "params": p,
                   "kamera": {"gerak": "mundur" if tpl == "penutup" else "diam" if tpl in ("bawah_tanah", "detail", "masalah") else "maju"}})
    title = ("Membangun Jembatan di Tengah Sungai" if re.search(r"\b(?:sungai|jembatan|cofferdam)\b", full)
             else "Cara Kerja Tiang Listrik" if re.search(r"\btiang listrik\b", full) else cues[0]["text"][:40])
    return {"judul": title, "adegan": ad, "peran": [{"i": c["i"], "peran": "narasi"} for c in cues]}


def stik_rule_based(cues, style):
    rules = json.loads((style_dir(style["name"]) / "rules.json").read_text(encoding="utf-8"))
    scenes = []
    template, params = "halaman", {}
    for i, cue in enumerate(cues):
        text = cue["text"].lower()
        rule = next((r for r in rules if re.search(r["match"], text)), None)
        if rule:
            template, params = rule["scene"], dict(rule["params"])
        else:
            params = dict(params)
        if template == "layang_layang" and re.search("jatuh|putus|terbang|naik", text):
            params["aksi"] = "jatuh" if re.search("jatuh|putus", text) else "terbang"
        if template == "layang_layang" and re.search("juara|menang|lomba", text):
            params["acara"] = "menang" if re.search("juara|menang", text) else "lomba"
        if template == "akar_kelapa" and re.search("mineral|hara|air", text):
            params["zat"] = "mineral" if re.search("mineral|hara", text) else "air"
        if template in ("halaman", "kebun_kelapa", "tangki") and "hujan" in text:
            params["cuaca"] = "hujan"
        if scenes and (template, params) == (scenes[-1]["template"], scenes[-1]["params"]):
            scenes[-1]["sampai"] = i
        else:
            scenes.append(dict(dari=i, sampai=i, template=template, params=params,
                               kamera={"gerak": "maju" if len(scenes) % 2 == 0 else "diam"}))
    return {"judul": "", "adegan": scenes, "peran": []}


def _fallback_plan(cues, events, cat, style):
    rb = style.get("fallback", "horor")
    if rb == "cerita_stik":
        return stik_rule_based(cues, style)
    if rb == "edukasi":
        return edukasi_rule_based(cues, cat)
    return rule_based(cues, events, cat) if rb == "horor" else generic_rule_based(cues, cat)


def _ai_direct(cues, events, style, cat, log, extra, progress=None, only=None, base=None, single=False):
    """Sutradara AI per bagian. only=[(a,b),...] -> hanya rentang itu yang dibuat ulang (sisanya dari base)."""
    n = len(cues)
    key = (library.VERSION, Cfg.LLM_MODEL, style["name"], tuple(c["text"] for c in cues))
    if key not in _ANALYSIS:  # ringkasan + catatan visual dipakai ulang oleh /ubah dan ronde review
        story = _summary(cues, log, style)
        if story:
            log("Ringkasan cerita: " + story.replace("\n", " | ")[:300])
        notes = _visual_notes(cues, story, log, style)
        log(f"Analisis visual: {len(notes)}/{n} kalimat")
        _ANALYSIS.clear()
        _ANALYSIS[key] = (story, notes)
    story, notes = _ANALYSIS[key]
    cues = [dict(c, vis=notes.get(c["i"], "")) for c in cues]
    if only:
        ranges = only
    else:
        size = CHUNK if _context() < 16000 else BIG_CHUNK  # model konteks besar: cerita utuh dalam sedikit bagian
        ranges = [(i, min(n, i + size) - 1) for i in range(0, n, size)]
        if len(ranges) > 1 and ranges[-1][1] - ranges[-1][0] < 3:  # bagian akhir terlalu pendek: gabung
            ranges[-2:] = [(ranges[-2][0], ranges[-1][1])]
    adegan, peran, judul, failed = [], [], "", 0
    fb = None
    for k, (a, b) in enumerate(ranges):
        if progress:
            progress(k, len(ranges))
        log(f"Sutradara AI: bagian {k + 1}/{len(ranges)} (cue #{a}-#{b})")
        prev = next((s["template"] for s in reversed((base or {}).get("adegan", []) + adegan) if s["sampai"] < a), None)
        try:
            ex = extra.get((a, b)) if isinstance(extra, dict) else extra  # /ubah: catatan per adegan
            ad, pr, jd = _direct_range(cues, a, b, cat, style, story, prev, ex, log, single)
        except Exception as e:
            failed += 1
            log(f"Bagian #{a}-#{b} gagal ({e}); pakai aturan cadangan untuk bagian ini saja")
            fb = fb or _fallback_plan(cues, events, cat, style)
            ad = _clip([dict(s) for s in fb["adegan"] if s["sampai"] >= a and s["dari"] <= b], a, b)
            pr = [p for p in fb["peran"] if a <= p["i"] <= b and p["peran"] != "narasi"]
            jd = ""
        adegan += ad
        peran += pr
        judul = judul or jd
    if failed == len(ranges):
        raise RuntimeError("semua bagian gagal")
    if base:  # edit sebagian: pertahankan adegan di luar rentang yang diubah
        keep = [s for s in base["adegan"] if not any(a <= s["dari"] <= b for a, b in ranges)]
        adegan = keep + adegan
        old = {p["i"]: p for p in base.get("peran", [])}
        for a, b in ranges:
            for i in range(a, b + 1):
                old.pop(i, None)
        peran = list(old.values()) + peran
        judul = base.get("judul") or judul
    return {"judul": judul, "adegan": adegan, "peran": peran, "continuity": {"story": story, "model": Cfg.LLM_MODEL, "library_version": library.VERSION}}, ("ai" if not failed else "ai+aturan")


_ANALYSIS = {}  # cache analisis cerita terakhir (satu job pada satu waktu)


def revise(plan, cues, style, fixes, log=print):
    """Sutradarai ulang adegan tertentu berdasarkan catatan review. fixes = {indeks_adegan: catatan}."""
    cat = load_catalog(style)
    note = {(plan["adegan"][k]["dari"], plan["adegan"][k]["sampai"]):
            f"Adegan untuk cue ini sekarang: {plan['adegan'][k]['template']} "
            f"{json.dumps(plan['adegan'][k]['params'], ensure_ascii=False)[:300]}. {txt} "
            "Buat adegan pengganti yang lebih cocok & lebih menarik; boleh ganti template." for k, txt in fixes.items()}
    # Beberapa adegan sekaligus menghindari puluhan request reasoning high dengan katalog sama.
    new = json.loads(json.dumps(plan))
    keys = list(fixes)
    for offset in range(0, len(keys), 4):
        group = keys[offset:offset + 4]
        ranges = {(plan["adegan"][k]["dari"], plan["adegan"][k]["sampai"]): k for k in group}
        selected = library.shortlist(cat, " ".join(note[r] for r in ranges), pinned=[plan["adegan"][k]["template"] for k in group])
        request = ("Perbaiki HANYA adegan yang disebut. Pertahankan persis dari/sampai setiap rentang; "
                   "jangan menambah adegan pada celah atau mengubah rentang lain. Satu pengganti per rentang.\n"
                   f"NASKAH LENGKAP (konteks tokoh/lokasi):\n{_cue_text(cues)}\n\n"
                   f"KATALOG:\n{_catalog_text(selected)}\n\nPERBAIKAN:\n" +
                   "\n".join(f"Rentang {r[0]}-{r[1]}: {note[r]}" for r in ranges) + "\n" + _COMPACT)
        try:
            raw = parse_json(_chat([{"role": "system", "content": style["_prompt"]}, {"role": "user", "content": request}],
                                   _schema(selected, min(r[0] for r in ranges), max(r[1] for r in ranges)), log,
                                   max_out=1200 + 1000 * len(group)))
            replacements = {}
            for scene in raw.get("adegan", []):
                r = (_int(scene.get("dari")), _int(scene.get("sampai")))
                if r in ranges and scene.get("template") in cat:
                    replacements[r] = scene
            if set(replacements) != set(ranges):
                raise ValueError("rentang revisi tidak lengkap/sesuai")
            for r, scene in replacements.items():
                new["adegan"][ranges[r]] = scene
            log(f"Revisi batch: {len(group)} adegan diperbaiki")
        except Exception as e:
            log(f"Revisi batch gagal ({e}); ulang per rentang")
            raw, _ = _ai_direct(cues, [], style, cat, log, {r: note[r] for r in ranges}, only=list(ranges), base=new, single=True)
            new = raw
    new, _ = normalize(new, cues, cat, style.get('maks_detik_adegan', 11))
    new["sumber"] = plan.get("sumber", "ai")
    return new


def direct(cues, events, style, log=print, extra=None, progress=None):
    cat = load_catalog(style)
    lim = style.get('maks_detik_adegan', 11)
    if Cfg.LLM_ENABLED:
        try:
            raw, src = _ai_direct(cues, events, style, cat, log, extra, progress)
            plan, warns = normalize(raw, cues, cat, lim)
            if warns:
                log("Perbaikan otomatis: " + "; ".join(warns[:5]))
            plan["sumber"] = src
            plan.update(schema_version=library.SCHEMA_VERSION, library_version=library.VERSION)
            return plan
        except Exception as e:
            log(f"Sutradara AI gagal total: {e}")
    log("Memakai sutradara berbasis aturan (cadangan)")
    plan, _ = normalize(_fallback_plan(cues, events, cat, style), cues, cat, lim)
    plan["sumber"] = "aturan"
    return plan


def edit(plan, instruction, cues, style, log=print):
    """Ubah rencana sesuai instruksi bebas, mis. 'adegan 3 ganti kuburan dengan pocong'."""
    cat = load_catalog(style)
    lim = style.get('maks_detik_adegan', 11)
    m = re.match(r"\s*(\d+)\s+([a-z_]+)\s*$", instruction.strip().lower())
    if m and m.group(2) in cat:  # format cepat: "<no adegan> <template>"
        k = int(m.group(1)) - 1
        if 0 <= k < len(plan["adegan"]):
            plan["adegan"][k]["template"] = m.group(2)
            plan["adegan"][k]["params"] = {}
            plan["adegan"][k].pop("momen", None)
            return normalize(plan, cues, cat, lim)[0] | {"sumber": plan.get("sumber", "ai")}
    if not Cfg.LLM_ENABLED:
        raise RuntimeError("LLM nonaktif; gunakan format: /ubah <no_adegan> <nama_template>")
    # Adegan yang disebut ("adegan 3", "adegan 2 dan 5") dibuat ulang; tanpa nomor -> seluruh rencana.
    groups = re.findall(r"adegan\s*(?:ke-?\s*)?(\d+(?:\s*(?:,|dan|&)\s*\d+)*)", instruction.lower())
    nums = sorted({int(x) - 1 for g in groups for x in re.findall(r"\d+", g) if 0 < int(x) <= len(plan["adegan"])})
    ranges = [(plan["adegan"][k]["dari"], plan["adegan"][k]["sampai"]) for k in nums] or None
    note = instruction
    if ranges:
        req = re.sub(r"adegan\s*(?:ke-?\s*)?\d+(?:\s*(?:,|dan|&)\s*\d+)*", "", instruction, flags=re.I).strip(" ,.:;-") or instruction
        alternative = 'pakai "komposisi"' if "komposisi" in cat else "pilih template terdekat dari katalog gaya ini"
        note = {(plan["adegan"][k]["dari"], plan["adegan"][k]["sampai"]):
                f"Adegan untuk cue ini sekarang: {plan['adegan'][k]['template']} {json.dumps(plan['adegan'][k]['params'], ensure_ascii=False)[:300]}. "
                f"User minta DIUBAH: \"{req}\". Ini lebih penting daripada aturan kecocokan gambar: wajib pakai "
                f"template/tempat/sosok yang diminta. Bila template yang ada tidak punya parameter untuk itu, {alternative}."
                for k in nums}
    raw, src = _ai_direct(cues, [], style, cat, log, note, only=ranges, base=plan if ranges else None, single=bool(ranges))
    new, _ = normalize(raw, cues, cat, lim)
    new["sumber"] = src
    return new


def _boundary(prev_cue, cue):
    return round(max(prev_cue["end"] - 0.1, min(cue["start"] - 0.08, (prev_cue["end"] + cue["start"]) / 2)), 3)


def _action_time(item, cues, key="cue", end=False):
    """Cue audio -> detik; kata pemicu memakai timestamp Whisper bila tersedia."""
    i = max(0, min(len(cues) - 1, int(item[key])))
    c = cues[i]
    if end:
        return c.get("pe", c["end"])
    word = re.sub(r"\W", "", str(item.get("kata", "")).lower())
    if word and c.get("wt"):
        for j, w in enumerate(c["text"].split()):
            if re.sub(r"\W", "", w.lower()) == word and j < len(c["wt"]):
                return c["wt"][j]
    if word:  # tanpa timestamp kata: perkiraan proporsional seperti subtitle karaoke (bukan sinkron terverifikasi)
        words = c["text"].split()
        tot, acc = sum(len(w) + 1 for w in words), 0
        for w in words:
            if re.sub(r"\W", "", w.lower()) == word:
                return round(c["start"] + (c.get("pe", c["end"]) - c["start"]) * acc / max(1, tot), 3)
            acc += len(w) + 1
    return c["start"]


def resolve(plan, cues, events, duration, style, title_bar="", watermark="", seed=0):
    """Rencana sutradara -> rencana render (detik absolut) untuk engine."""
    cat = load_catalog(style)
    ad = plan["adegan"]
    scenes, synth, actions = [], [], []
    for k, a in enumerate(ad):
        start = 0.0 if k == 0 else _boundary(cues[a["dari"] - 1], cues[a["dari"]])
        end = duration if k == len(ad) - 1 else _boundary(cues[ad[k + 1]["dari"] - 1], cues[ad[k + 1]["dari"]])
        p = {}
        for key, v in a["params"].items():
            if key.endswith("_cue"):
                if v is not None and 0 <= int(v) < len(cues):
                    p[key[:-4] + "_t"] = _action_time({"cue": v, "kata": a["params"].get("pemicu", "")}, cues, end=key == "aksi_selesai_cue")
            elif isinstance(v, list):  # item daftar dengan "cue" -> waktu absolut "t"
                items = []
                for it in v:
                    it = dict(it)
                    cv = it.get("cue")
                    if cv is not None:
                        try:
                            it["t"] = _action_time(it, cues)
                        except (TypeError, ValueError):
                            pass
                    if it.get("akhir_cue") is not None:
                        try:
                            it["akhir_t"] = _action_time(it, cues, "akhir_cue", end=True)
                        except (TypeError, ValueError):
                            pass
                    for ik, iv in list(it.items()):
                        if ik.endswith("_cue") and ik != "akhir_cue" and iv is not None:
                            try:
                                it[ik[:-4] + "_t"] = _action_time(it, cues, ik)
                            except (TypeError, ValueError):
                                pass
                    items.append(it)
                p[key] = items
            else:
                p[key] = v
        spec = cat.get(a["template"], {}).get("params", {})
        full = {k: s.get("default") for k, s in spec.items() if s["type"] != "cue"}
        full.update(p)
        if a["template"] == "rumah_panggung" and int(full.get("ketukan") or 0) > 0:
            full["pos_ronda"] = True
            N = int(full["ketukan"])
            synth += [{"type": "ketuk_jauh", "t": round(end - 0.65 - (N - 1 - i) * 0.15, 3), "scene": k} for i in range(N)]
        if a["template"] == "pintu_diketuk" and int(full.get("ketukan") or 0) > 0:
            N = int(full["ketukan"])
            word = next(((c, m.group(0)) for c in cues[a["dari"]:a["sampai"] + 1] for m in [re.search(r"\w*(?:ketuk|ketok)\w*", c["text"], re.I)] if m), None)
            if word:  # ketukan menyusul kata "ketukan" di audio, bukan di ujung adegan
                k0 = min(_action_time({"cue": word[0]["i"], "kata": word[1]}, cues) + 0.35, end - 0.35 - (N - 1) * 0.27)
                synth += [{"type": "ketuk_pintu", "t": round(k0 + i * 0.27, 3), "scene": k} for i in range(N)]
            else:
                synth += [{"type": "ketuk_pintu", "t": round(end - 0.35 - (N - 1 - i) * 0.27, 3), "scene": k} for i in range(N)]
        if a["template"] == "masalah" and full.get("kejadian") in ("rubuh", "runtuh"):  # bunyi + guncangan saat benda jatuh
            kt = full.get("kejadian_t", start + min(1.4, (end - start) * 0.35))
            synth.append({"type": "brak", "t": round(kt + (0.92 if full["kejadian"] == "rubuh" else 0.25), 3), "scene": k})
        meta = cat.get(a["template"], {}).get("metadata")
        if meta and meta.get("action"):
            actions.append({"scene": k, "id": meta["action"], "actor": "person0", "target": meta["target"], "tool": meta["tool"], "start": full.get("aksi_mulai_t", start), "end": full.get("aksi_selesai_t", end), "stages": meta["stages"]})
        scenes.append({"template": a["template"], "start": round(start, 3), "end": round(end, 3), "params": full, "camera": a["kamera"]})
    for source, scene in zip(ad, scenes):
        if source.get("momen"):
            scene["directions"] = [{"t": _action_time(item, cues), "focus": item["fokus"]} for item in source["momen"]]
    coverage.plan_shots(scenes, cues, actions, Cfg.FPS)
    roles = {x["i"]: x["peran"] for x in plan.get("peran", [])}
    rc = [dict(c, role=roles.get(c["i"], c.get("role", "narasi"))) for c in cues]
    return {"schema_version": plan.get("schema_version", 1), "library_version": plan.get("library_version", library.VERSION), "duration": round(duration, 3), "seed": seed, "title_bar": title_bar, "watermark": watermark,
            "style": {k: style[k] for k in ("warna_subtitle", "warna_aktif", "grade", "crossfade", "subtitle_kata") if k in style},
            "scenes": scenes, "actions": actions, "cues": rc, "events": sorted(events + synth, key=lambda e: e["t"])}
