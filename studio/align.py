"""Naskah + audio -> cue subtitle bertimestamp + event (bunyi 'tok', dll).

Tiga jalur:
  1. naskah + kata Whisper  -> teks dari naskah, waktu dari Whisper (paling presisi)
  2. naskah saja            -> waktu dari segmen bicara (deteksi jeda) via dynamic programming
  3. Whisper saja           -> teks & waktu dari Whisper
"""
import difflib
import re

ONO_KETUK = {"tok", "dok", "tuk", "duk", "tek", "thok", "tokk", "dokk"}
ONO_BRAK = {"brak", "gubrak", "bruk", "dor", "duar", "jder", "brakk"}


def _toks(s):
    s = s.lower()
    s = re.sub(r"\bdua\s+belas\b", "12", s)
    s = re.sub(r"\btiga\s+belas\b", "13", s)
    s = re.sub(r"\bempat\s+belas\b", "14", s)
    s = re.sub(r"\blima\s+belas\b", "15", s)
    s = re.sub(r"\bdua\s+ribu\s+tiga\b", "2003", s)
    return re.findall(r"[a-z0-9]+", s)


def ono_type(text):
    t = _toks(text)
    if not t or len(t) > 6:
        return None
    if all(x in ONO_KETUK for x in t):
        return "ketuk"
    if all(x in ONO_BRAK for x in t):
        return "brak"
    return None


def clean_script(text):
    text = re.sub(r"<break[^>]*>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\[[^\]]{1,40}\]", " ", text)  # tag v3 seperti [whispers]
    text = text.replace("…", "...")
    return text


def split_phrases(text, max_len=84):
    out = []
    for line in clean_script(text).split("\n"):
        line = " ".join(line.split())
        if not line:
            continue
        pieces = re.split(r"(?<=[.!?])\s+", line)
        merged = []
        for pc in pieces:
            if merged and merged[-1].endswith("...") and (len(merged[-1]) < 14 or len(pc) < 14) \
                    and not ono_type(pc) and not ono_type(merged[-1]):
                merged[-1] += " " + pc
            else:
                merged.append(pc)
        for m in merged:
            out.extend(_split_long(m, max_len))
    return [{"text": t, "ono": ono_type(t)} for t in out if _toks(t)]


def _split_long(s, max_len):
    if len(s) <= max_len:
        return [s]
    cands = [m.end() for m in re.finditer(r"[,;:]\s+|\.\.\.\s+", s)]
    if not cands:
        words = s.split()
        h = len(words) // 2
        return _split_long(" ".join(words[:h]), max_len) + _split_long(" ".join(words[h:]), max_len)
    mid = len(s) / 2
    cut = min(cands, key=lambda x: abs(x - mid))
    return _split_long(s[:cut].strip(), max_len) + _split_long(s[cut:].strip(), max_len)


def _weight(p):
    return 3 if p["ono"] else max(4, len(re.sub(r"\W", "", p["text"])))


# ---------- jalur 2: naskah + segmen bicara ----------
def align_by_segments(phr, segs):
    segs = [list(x) for x in segs]
    P = len(phr)
    if P == 0:
        return []
    if not segs:
        raise ValueError("Audio tidak berisi suara yang terdeteksi.")
    while len(segs) < P:  # audio lebih sedikit jeda daripada kalimat -> belah segmen terpanjang
        i = max(range(len(segs)), key=lambda k: segs[k][1] - segs[k][0])
        s, e = segs[i]
        m = (s + e) / 2
        segs[i:i + 1] = [[s, m - 0.02], [m + 0.02, e]]
    S = len(segs)
    w = [_weight(p) for p in phr]
    dur = [e - s for s, e in segs]
    pre = [0.0]
    for d in dur:
        pre.append(pre[-1] + d)
    rate = pre[-1] / sum(w)
    gaps = [segs[j + 1][0] - segs[j][1] for j in range(S - 1)] + [2.0]
    allow = [p["text"].count("...") + p["text"].count(",") for p in phr]
    INF = float("inf")
    MAXSPAN = 14
    f = [[INF] * (S + 1) for _ in range(P + 1)]
    bk = [[-1] * (S + 1) for _ in range(P + 1)]
    f[0][0] = 0.0
    for i in range(1, P + 1):
        e_exp = w[i - 1] * rate
        jmin, jmax = i, S - (P - i)
        for j in range(jmin, jmax + 1):
            best, arg = INF, -1
            for k in range(max(i - 1, j - MAXSPAN), j):
                if f[i - 1][k] == INF:
                    continue
                d = pre[j] - pre[k]
                c = ((d - e_exp) / (e_exp + 0.4)) ** 2 * 3.0
                internal = sorted(gaps[k:j - 1])
                if internal:
                    m = allow[i - 1]
                    pen = internal[:-m] if m else internal
                    c += 1.5 * sum(max(0.0, g - 0.3) for g in pen)
                c -= 1.0 * min(gaps[j - 1], 1.2)
                v = f[i - 1][k] + c
                if v < best:
                    best, arg = v, k
            f[i][j], bk[i][j] = best, arg
    # telusuri balik
    res, j = [], S
    for i in range(P, 0, -1):
        k = bk[i][j]
        res.append((segs[k][0], segs[j - 1][1]))
        j = k
    res.reverse()
    out = []
    for p, (s, e) in zip(phr, res):
        q = dict(p)
        q["start"], q["end"] = round(s, 3), round(e, 3)
        out.append(q)
    return out


# ---------- jalur 1: naskah + kata Whisper ----------
def align_by_words(phr, words):
    stoks, owner = [], []
    for pi, p in enumerate(phr):
        for t in _toks(p["text"]):
            stoks.append(t)
            owner.append(pi)
    wtoks, widx = [], []
    for wi, w in enumerate(words):
        for t in _toks(w["word"]):
            wtoks.append(t)
            widx.append(wi)
    sm = difflib.SequenceMatcher(None, stoks, wtoks, autojunk=False)
    match = {}
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            match[a + k] = widx[b + k]
    out = []
    for pi, p in enumerate(phr):
        idx = [match[t] for t in range(len(stoks)) if owner[t] == pi and t in match]
        q = dict(p)
        q["matched"] = bool(idx)
        q["coverage"] = len(idx) / max(1, sum(1 for own in owner if own == pi))
        if idx:
            q["start"], q["end"] = words[min(idx)]["start"], words[max(idx)]["end"]
            if p["ono"]:
                q["ono_times"] = [words[i]["start"] for i in sorted(set(idx))]
        else:
            q["start"] = q["end"] = None
        out.append(q)
    _interpolate(out, words[-1]["end"] if words else 0)
    return out


def _interpolate(ph, total):
    n = len(ph)
    for i, p in enumerate(ph):
        if p["start"] is not None:
            continue
        prev = next((ph[k]["end"] for k in range(i - 1, -1, -1) if ph[k]["end"] is not None), 0.0)
        j = next((k for k in range(i + 1, n) if ph[k]["start"] is not None), None)
        nxt = ph[j]["start"] if j is not None else total
        gap_n = (j if j is not None else n) - i
        span = max(0.4, (nxt - prev) / (gap_n + 0.0001))
        p["start"] = round(prev + 0.05, 3)
        p["end"] = round(min(nxt, prev + span), 3)
        ph[i] = p
    # pastikan monoton
    for i in range(1, n):
        if ph[i]["start"] < ph[i - 1]["end"] - 0.05:
            ph[i]["start"] = ph[i - 1]["end"]
            ph[i]["end"] = max(ph[i]["end"], ph[i]["start"] + 0.3)


# ---------- jalur 3: Whisper saja ----------
def phrases_from_words(words, max_len=70):
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        txt = "".join(x["word"] for x in cur).strip()
        gap = words[i + 1]["start"] - w["end"] if i + 1 < len(words) else 9
        end_sent = re.search(r"[.!?]$", w["word"].strip()) is not None
        if end_sent or gap > 0.55 or len(txt) > max_len:
            out.append({"text": txt, "ono": ono_type(txt), "start": cur[0]["start"], "end": cur[-1]["end"],
                        "ono_times": [x["start"] for x in cur] if ono_type(txt) else None})
            cur = []
    return out


# ---------- hasil akhir ----------
def make_cues(ph, total):
    cues, events = [], []
    for i, p in enumerate(ph):
        nxt = ph[i + 1]["start"] if i + 1 < len(ph) else total
        s = max(0.0, p["start"] - 0.05)
        e = min(nxt - 0.06, p["end"] + 0.55)
        e = max(e, min(s + 0.5, nxt - 0.02))
        role = "dialog" if re.search(r"[\"“”]", p["text"]) else "narasi"
        text = p["text"].strip().strip('"“”').strip()
        if text and text[0].islower():
            text = text[0].upper() + text[1:]
        cues.append({"i": i, "text": text, "start": round(s, 3), "end": round(e, 3), "pe": round(p["end"], 3),
                     "role": role, "big": bool(p.get("ono"))})
        if p.get("ono"):
            times = p.get("ono_times") or []
            n = len(_toks(p["text"]))
            if len(times) != n:
                span = max(0.12, p["end"] - p["start"])
                times = [p["start"] + span * k / n for k in range(n)]
            for t in times:
                events.append({"type": p["ono"], "t": round(t, 3)})
    return cues, events


def word_times(cues, words):
    """Cocokkan kata naskah dengan Whisper; interpolasi hanya kata yang tidak dikenali."""
    for c in cues:
        n = len(c["text"].split())
        nearby = [w for w in words if c["start"] - 0.15 <= w["start"] <= c.get("pe", c["end"]) + 0.05]
        ws = [w["start"] for w in nearby]
        if n and ws:
            script_tokens, owners, audio_tokens, stamps = [], [], [], []
            for j, w in enumerate(c["text"].split()):
                ts = _toks(w)
                script_tokens.extend(ts)
                owners.extend([j] * len(ts))
            for w in nearby:
                ts = _toks(w["word"])
                audio_tokens.extend(ts)
                stamps.extend([w["start"]] * len(ts))
            matched = {}
            for a, b, size in difflib.SequenceMatcher(None, script_tokens, audio_tokens, autojunk=False).get_matching_blocks():
                for k in range(size):
                    matched.setdefault(owners[a + k], stamps[b + k])
            times = []
            for j in range(n):
                if j in matched:
                    t = matched[j]
                else:
                    left = max((k for k in matched if k < j), default=-1)
                    right = min((k for k in matched if k > j), default=n)
                    t0, t1 = matched.get(left, c["start"]), matched.get(right, c.get("pe", c["end"]))
                    t = t0 + (t1 - t0) * (j - left) / max(1, right - left)
                times.append(round(max(c["start"], times[-1] if times else c["start"], min(c.get("pe", c["end"]), t)), 3))
            c["wt"] = times
    return cues
