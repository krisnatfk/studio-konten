"""Tahapan job: analisis audio -> rencana -> render -> mix -> MP4."""
import html as _html
import json
import os
import shutil
import time
import traceback

from . import align, audio, db, director, mix, render, review, transcribe
from .config import Cfg
from . import coverage, library, quality, inspect_render

NOTIFIERS = []  # fungsi(job, jenis, teks, path) - diisi bot Telegram


class NeedScript(Exception):
    pass


def step(job, frac, text):
    """Simpan progres lalu perbarui kartu progres (Telegram) supaya tampil real time."""
    db.update(job["id"], progress=round(frac, 3))
    notify(job, "info", text)


def notify(job, kind, text=None, path=None):
    for fn in NOTIFIERS:
        try:
            fn(job, kind, text, path)
        except Exception as e:
            print("notifier error:", e)


def jdir(jid):
    return Cfg.JOBS_DIR / jid


def _log(jid):
    lf = jdir(jid) / "log.txt"

    def log(msg):
        line = time.strftime("%H:%M:%S ") + str(msg)
        print(f"[{jid}] {msg}", flush=True)
        with lf.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    return log


def rj(p):
    return json.loads(p.read_text(encoding="utf-8"))


def wj(p, obj):
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")


# ---------------- tahap 1: analisis ----------------
def analyze(job, log):
    d = jdir(job["id"])
    src = d / job["payload"]["audio"]
    script_p = d / "naskah.txt"
    script = script_p.read_text(encoding="utf-8").strip() if script_p.exists() else ""
    if not src.is_file():
        raise ValueError("File audio belum tersedia. Unggah MP3 secara manual untuk memproses video.")
    vo = audio.to_wav(src, d / "vo.wav")
    dur = audio.duration(vo)
    words = None
    word_source = "whisper"
    if not words and transcribe.available() and (not script or Cfg.WHISPER_WHEN_SCRIPT):
        step(job, 0.03, "🎧 Mentranskrip audio (Whisper)...")
        words = transcribe.transcribe(vo, log, prompt=align.clean_script(script) if script else None)
    if words:
        wj(d / "words.json", words)
    method = ""
    coverage = []
    if script:
        ph = align.split_phrases(script)
        if not ph:
            raise ValueError("Naskah kosong setelah dibersihkan.")
        al = None
        if words:
            al = align.align_by_words(ph, words)
            coverage = [p.get("coverage", 0) for p in al]
            ok = sum(coverage) / len(al)
            log(f"Kecocokan naskah-{word_source}: {ok:.0%}")
            method = "naskah+" + word_source
            if ok < 0.6:
                al = None
        if al is None:
            segs, nd = audio.speech_segments(vo, dur)
            log(f"{len(segs)} segmen bicara (ambang {nd:.0f} dB) untuk {len(ph)} kalimat")
            al = align.align_by_segments(ph, segs)
            method = "naskah+jeda"
    elif words:
        al = align.phrases_from_words(words)
        method = "whisper"
    else:
        raise NeedScript()
    cues, events = align.make_cues(al, dur)
    wj(d / "cues.json", {"duration": dur, "cues": cues, "events": events, "method": method, "alignment": {"reliable": method == "whisper" or (method == "naskah+whisper" and ok >= .85 and all(v >= .65 for v in coverage)), "coverage": coverage, "method": method}})
    log(f"{len(cues)} cue, {len(events)} event, metode {method}")
    return cues, events, dur


# ---------------- tahap 2: rencana ----------------
def plan(job, log, cues, events, style):
    step(job, 0.06, "🎬 Sutradara AI membaca naskah...")
    prog = lambda k, n: step(job, 0.06 + 0.04 * k / n, f"🎬 Sutradara AI menyusun adegan (bagian {k + 1}/{n})...")
    p = director.direct(cues, events, style, log, extra=job["payload"].get("extra"), progress=prog)
    if job["payload"].get("title"):
        p["judul"] = job["payload"]["title"]
    wj(jdir(job["id"]) / "plan.json", p)
    db.update(job["id"], title=p.get("judul", ""))
    return p


def plan_summary(p, rplan):
    shots = coverage.shots(rplan)
    lines = [f"🎞 <b>{_html.escape(p.get('judul') or 'Tanpa judul')}</b>",
             f"{len(p['adegan'])} adegan · {len(shots)} shot · {sum(len(s['moments']) for s in shots)} calon momen · rencana {_html.escape(str(p.get('sumber', '?')))}", ""]
    for k, (a, s) in enumerate(zip(p["adegan"], rplan["scenes"])):
        extra = ", ".join(f"{x}={y}" for x, y in a["params"].items())
        lines.append(f"{k + 1}. <b>{_html.escape(a['template'])}</b> · "
                     f"{s['start']:.1f}–{s['end']:.1f}s · {_html.escape(a['kamera']['gerak'])}")
        if extra:
            lines.append(f"     <code>{_html.escape(extra)[:100]}</code>")
    return "\n".join(lines)


# ---------------- tahap 3: render ----------------
def _build(job, p, cues, events, dur, style):
    d = jdir(job["id"])
    title_bar = (p.get("judul") or "") if Cfg.SHOW_TITLE_BAR else ""
    wm = job["payload"].get("watermark", Cfg.WATERMARK)
    if (d / "words.json").exists():
        align.word_times(cues, rj(d / "words.json"))
    rplan = director.resolve(p, cues, events, dur, style, title_bar=title_bar, watermark=wm)
    rplan["render_source"] = library.source_fingerprint(style["name"], [s["template"] for s in rplan["scenes"]])
    wj(d / "render_plan.json", rplan)
    return rplan, render.build_page(rplan, d / "page.html", style)


def _review(job, log, p, cues, events, dur, style):
    """AI melihat frame tiap adegan; adegan yang kurang layak disutradarai ulang lalu dicek lagi.
    Tiap rentang cue menyimpan versi dengan skor TERBAIK, jadi review tidak pernah memperburuk video."""
    d = jdir(job["id"])
    rplan, html = _build(job, p, cues, events, dur, style)
    board_fp = None
    complete_cut = None
    visual = {}
    best = {}  # (dari, sampai) -> (skor, adegan)
    for rnd in range(1, Cfg.REVIEW_ROUNDS + 2):
        last = rnd > Cfg.REVIEW_ROUNDS  # ronde terakhir: hanya menilai hasil perbaikan
        step(job, 0.1 + 0.03 * rnd, f"🔍 Review AI ronde {rnd}: memeriksa {len(p['adegan'])} adegan...")
        try:
            fixes, avg, scores = review.review(html, p, rplan, cues, d / "_review", log, style)
        except Exception as e:
            log(f"Review dilewati: {e}")
            break
        if not scores:
            log("Review tidak menghasilkan penilaian, dilewati")
            break
        fp = library.fingerprint(rplan, style["name"])
        if board_fp != fp:
            render.storyboard(html, rplan, d / "storyboard.jpg", d / "_sb")
            visual = review.visual_evidence(rplan, d / "_sb", style["name"], log)
            board_fp = fp
        variation = coverage.assess(rplan, visual, rj(d / "_sb" / "duplicates.json"))
        if not variation["issues"] and len(scores) == len(p["adegan"]):
            rank = (sum(sk >= Cfg.REVIEW_MIN_SCORE for sk in scores.values()), avg)
            if complete_cut is None or rank > complete_cut["rank"]:
                complete_cut = dict(rank=rank, plan=json.loads(json.dumps(p)), fingerprint=fp,
                                    visual=visual, scores=dict(scores), fixes=dict(fixes))
        confirmed = variation["confirmed"]
        log(f"Variasi ronde {rnd}: {variation['shots']} shot dan {variation['moments']} momen terkonfirmasi.")
        planned_shots = coverage.shots(rplan)
        if (variation["issues"] and confirmed and len(planned_shots) >= coverage.MIN_SHOTS and
                sum(len(shot["moments"]) for shot in planned_shots) >= coverage.MIN_MOMENTS):
            for idx, numbers in variation["fixes"].items():
                k = int(idx)
                notes = [confirmed[m["id"]] for shot in rplan["scenes"][k]["shots"]
                         for m in shot["moments"] if m["id"] in confirmed]
                fixes[k] = (fixes.get(k, "") + " Shot " + ", ".join(numbers)
                            + " perlu aksi atau detail baru sesuai ucapan. Yang sudah terlihat: "
                            + " / ".join(notes) + ". " + " ".join(visual.get("issues", {}).get(no, "") for no in numbers)
                            + " Atur pemicu aktor, perubahan objek, atau tahap yang dapat dirender.").strip()
        for k, sk in scores.items():
            a = p["adegan"][k]
            r = (a["dari"], a["sampai"])
            n = sum(m["id"] in confirmed for shot in rplan["scenes"][k]["shots"] for m in shot["moments"])
            rank = (sk >= Cfg.REVIEW_MIN_SCORE, n, sk)
            if r not in best or rank > best[r][4]:
                best[r] = (sk, json.loads(json.dumps(a)), library.source_fingerprint(style["name"], [a["template"]]), fixes.get(k, ""), rank, rplan["scenes"][k])
        log(f"Review ronde {rnd}: rata-rata skor {avg:.1f}/10, {len(fixes)} adegan di bawah {Cfg.REVIEW_MIN_SCORE:g}")
        if not fixes or last:
            break
        step(job, 0.1 + 0.03 * rnd, f"🛠 Review AI ronde {rnd}: memperbaiki {len(fixes)} adegan (skor rata-rata {avg:.1f}/10)...")
        try:
            p = director.revise(p, cues, style, fixes, log)
        except Exception as e:
            log(f"Perbaikan review gagal: {e}")
            break
        rplan, html = _build(job, p, cues, events, dur, style)
    # pakai versi terbaik tiap adegan (rentang sama karena perbaikan mempertahankan rentang)
    changed = 0
    for k, a in enumerate(p["adegan"]):
        b = best.get((a["dari"], a["sampai"]))
        if b and b[2] != library.source_fingerprint(style["name"], [b[1]["template"]]):
            best.pop((a["dari"], a["sampai"]), None)
            b = None
        if b and b[1] != a:
            p["adegan"][k] = b[1]
            changed += 1
    if best:
        tot = sum(v[0] for v in best.values()) / len(best)
        log(f"Hasil review: skor akhir rata-rata {tot:.1f}/10" + (f" ({changed} adegan dikembalikan ke versi lebih baik)" if changed else ""))
        passed = len(best) == len(p["adegan"]) and all(v[0] >= Cfg.REVIEW_MIN_SCORE for v in best.values())
        notify(job, "info", ("✅" if passed else "⚠️") + f" Review AI: skor rata-rata {tot:.1f}/10" + ("" if passed else "; sebagian adegan belum lolos ambang atau belum dinilai."))
    wj(d / "review_report.json", {"threshold": Cfg.REVIEW_MIN_SCORE, "scenes": [
        {"no": k + 1, "score": best.get((a["dari"], a["sampai"]), (None,))[0],
         "passed": best.get((a["dari"], a["sampai"]), (0,))[0] >= Cfg.REVIEW_MIN_SCORE, "issues": best.get((a["dari"],a["sampai"]),(None,None,None,"Review belum lengkap"))[3]}
        for k, a in enumerate(p["adegan"])]})
    wj(d / "plan.json", p)
    rplan, html = _build(job, p, cues, events, dur, style)
    report = rj(d / "review_report.json")
    # Global cut allocation and the preceding shot can change after combining
    # revisions. Only carry a scene score across an identical rendered timeline.
    changed_shots = []
    for k, scene in enumerate(p["adegan"]):
        saved = best.get((scene["dari"], scene["sampai"]))
        if saved and saved[5] != rplan["scenes"][k]:
            changed_shots.append(k)
    if changed_shots:
        try:
            final_fixes, _, final_scores = review.review(html, p, rplan, cues, d / "_review", log, style)
        except Exception as exc:
            log(f"Review komposisi akhir belum lengkap: {exc}")
            final_fixes, final_scores = {}, {}
        for k in changed_shots:
            score = final_scores.get(k)
            report["scenes"][k].update(score=score, passed=score is not None and score >= Cfg.REVIEW_MIN_SCORE,
                                       issues=final_fixes.get(k, "" if score is not None else "Review belum lengkap"))
    # Combining locally preferred scenes can erase the film's verified 50th moment.
    # Keep a complete, reviewed cut as a fallback in that case.
    fp = library.fingerprint(rplan, style["name"])
    if complete_cut and fp == complete_cut["fingerprint"]:
        if fp != board_fp:
            render.storyboard(html, rplan, d / "storyboard.jpg", d / "_sb")
        board_fp, visual = fp, complete_cut["visual"]
    elif complete_cut:
        if fp != board_fp:
            render.storyboard(html, rplan, d / "storyboard.jpg", d / "_sb")
            visual = review.visual_evidence(rplan, d / "_sb", style["name"], log)
            board_fp = fp
        if coverage.assess(rplan, visual, rj(d / "_sb" / "duplicates.json"))["issues"]:
            saved_plan = complete_cut["plan"]
            saved_render, saved_html = _build(job, saved_plan, cues, events, dur, style)
            if library.fingerprint(saved_render, style["name"]) == complete_cut["fingerprint"]:
                p, rplan, html = saved_plan, saved_render, saved_html
                visual = complete_cut["visual"]
                board_fp = complete_cut["fingerprint"]
                render.storyboard(html, rplan, d / "storyboard.jpg", d / "_sb")
                report["scenes"] = [
                    dict(no=k+1, score=sk, passed=sk >= Cfg.REVIEW_MIN_SCORE, issues=complete_cut["fixes"].get(k, ""))
                    for k,sk in sorted(complete_cut["scores"].items())
                ]
                wj(d / "plan.json", p)
                log("Memakai versi utuh yang memenuhi minimum shot dan momen visual.")
            else:
                rplan, html = _build(job, p, cues, events, dur, style)
    report["technical_issues"] = inspect_render.inspect(html, rplan)
    report["fingerprint"] = library.fingerprint(rplan, style["name"])
    if board_fp == report["fingerprint"]:
        report["visual_evidence"] = visual
    wj(d / "review_report.json", report)
    return p, rplan, html


def produce(job, log, p, cues, events, dur, style, ai_review=False):
    d = jdir(job["id"])
    if Cfg.LLM_ENABLED and Cfg.REVIEW_ROUNDS > 0:
        p, rplan, html = _review(job, log, p, cues, events, dur, style)
    else:
        rplan, html = _build(job, p, cues, events, dur, style)
    review_path = d / "review_report.json"
    report = rj(review_path) if review_path.exists() else {}
    fp = library.fingerprint(rplan, style["name"])
    sb = d / "storyboard.jpg"
    reviewed_board = Cfg.LLM_ENABLED and Cfg.REVIEW_ROUNDS > 0 and report.get("fingerprint") == fp and "visual_evidence" in report
    if not reviewed_board or not sb.exists() or not (d / "_sb" / "duplicates.json").is_file():
        render.storyboard(html, rplan, sb, d / "_sb")
    notify(job, "storyboard", plan_summary(p, rplan), sb)
    if report.get("fingerprint") == fp and "visual_evidence" not in report and Cfg.LLM_ENABLED and Cfg.REVIEW_ROUNDS > 0:
        step(job, .16, "🔍 Memeriksa variasi shot dan momen visual...")
        report["visual_evidence"] = review.visual_evidence(rplan, d / "_sb", style["name"], log)
        wj(review_path, report)
    duplicate_path = d / "_sb" / "duplicates.json"
    duplicates = rj(duplicate_path) if duplicate_path.exists() else None
    msg = f"🖥 Merender {dur:.0f} detik video ({render.workers()} worker)..."
    step(job, 0.2, msg)
    frames = d / "frames"
    shutil.rmtree(frames, ignore_errors=True)
    t0 = time.time()
    last = [0.0]

    def on_frames(x):
        db.update(job["id"], progress=round(0.2 + 0.7 * x, 3))
        if time.time() - last[0] >= 5:  # batasi edit pesan Telegram
            last[0] = time.time()
            notify(job, "info", msg)

    render.render_frames(html, frames, dur, progress=on_frames)
    log(f"Frame selesai dalam {time.time() - t0:.0f} dtk")
    bgm = next((x for x in [d / "bgm.mp3", d / "bgm.m4a"] + [__import__("pathlib").Path(style["_dir"]) / "bgm.mp3"] if x.exists()), None)
    step(job, 0.92, "🔊 Mixing audio & encode MP4...")
    m = mix.mix(d / "vo.wav", d / "mix.m4a", dur, rplan["events"], style, bgm=bgm)
    out = render.encode(frames, m, d / "preview.mp4", dur)
    cue_data = rj(d / "cues.json") if (d / "cues.json").exists() else {}
    verdict = quality.verdict(report, rplan, style["name"], cue_data.get("alignment", {"reliable": cue_data.get("method") in ("naskah+whisper", "whisper")}), duplicates)
    wj(d / "quality_report.json", verdict)
    final = d / "final.mp4"
    previous = d / f"previous_final_{time.time_ns()}.mp4"
    if verdict["passed"]:
        if final.is_file():
            try:
                os.link(final, previous)
            except OSError:
                shutil.copy2(final, previous)
        out.replace(final)
        out = final
    elif final.exists():
        final.replace(previous)
    if not Cfg.KEEP_FRAMES:
        shutil.rmtree(frames, ignore_errors=True)
    log(f"Render selesai: {out.name} {out.stat().st_size / 1e6:.1f} MB")
    return out


# ---------------- runner ----------------
def run(job):
    jid = job["id"]
    log = _log(jid)
    d = jdir(jid)
    task = job["task"]
    fps = job["payload"].get("fps")
    Cfg.FPS = fps if fps in (30, 60) else Cfg.DEFAULT_FPS
    style = director.load_style(job["payload"].get("style"))
    try:
        step(job, 0.02, "📥 Menganalisis audio...")
        if task == "full" or not (d / "cues.json").exists():
            cues, events, dur = analyze(job, log)
        else:
            c = rj(d / "cues.json")
            cues, events, dur = c["cues"], c["events"], c["duration"]
        db.update(jid, progress=0.06)
        if task in ("full", "replan") or not (d / "plan.json").exists():
            p = plan(job, log, cues, events, style)
        elif task == "repair":
            old = rj(d / "plan.json")
            report = rj(d / "review_report.json") if (d / "review_report.json").exists() else {"scenes": []}
            fixes = {r["no"]-1: r.get("issues") or "Perbaiki lokasi, aktivitas, interaksi dan timing; hasil sebelumnya belum lolos." for r in report["scenes"] if not r.get("passed")}
            quality_path = d / "quality_report.json"
            variation = rj(quality_path).get("variation", {}) if quality_path.exists() else {}
            if variation.get("issues"):
                for index, numbers in variation.get("fixes", {}).items():
                    i = int(index)
                    if 0 <= i < len(old["adegan"]):
                        fixes[i] = (fixes.get(i, "") + " Perjelas aksi dan perubahan keadaan yang berbeda pada shot " + ", ".join(numbers)).strip()
            if not fixes:
                fixes = {i: "Periksa kembali kesesuaian aksi dengan audio dan seluruh kontak." for i in range(len(old["adegan"]))}
            p = director.revise(old, cues, style, fixes, log)
            wj(d / "plan.json", p)
        elif task == "edit":
            notify(job, "info", "✏️ Mengubah rencana...")
            p = director.edit(rj(d / "plan.json"), job["payload"].get("instruction", ""), cues, style, log)
            wj(d / "plan.json", p)
        else:
            cat = director.load_catalog(style)
            p = director.normalize(rj(d / "plan.json"), cues, cat)[0] | {"sumber": rj(d / "plan.json").get("sumber", "manual")}
            wj(d / "plan.json", p)
        db.update(jid, progress=0.1, title=p.get("judul", ""))
        out = produce(job, log, p, cues, events, dur, style, ai_review=task in ("full", "replan"))
        q = rj(d / "quality_report.json")
        if not q["passed"]:
            db.update(jid, status="draft_review", progress=1.0, error="; ".join(q["issues"]))
            notify(db.get(jid), "draft", "📝 Draft belum lolos pemeriksaan: " + _html.escape("; ".join(q["issues"])), out)
            return
        db.update(jid, status="selesai", progress=1.0, error="")
        variation = q.get("variation", {})
        counts = f" · {variation['shots']} shot · {variation['moments']} momen" if variation else ""
        notify(db.get(jid), "video",
               f"🎬 <b>{_html.escape(p.get('judul') or jid)}</b>\n"
               f"🕒 {dur:.0f} detik · 📐 1080×1920 · 🎨 {_html.escape(style['name'])}{counts}", out)
    except NeedScript:
        db.update(jid, status="menunggu_naskah", error="")
        notify(job, "need_script", "🎙 <b>Butuh naskah</b>\n\nWhisper tidak aktif, jadi kirim naskahnya sekarang "
                                   "(teks atau file .txt).")
    except Exception as e:
        log(traceback.format_exc())
        db.update(jid, status="gagal", error=str(e)[:500])
        notify(job, "error", f"❌ <b>Gagal memproses</b>\n\n<code>{_html.escape(str(e))[:500]}</code>")
