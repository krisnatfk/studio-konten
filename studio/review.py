"""Review AI sebelum render: AI (vision) melihat 1 frame per adegan + narasinya, memberi skor,
dan adegan yang kurang layak disutradarai ulang. Diulang sampai lolos atau REVIEW_ROUNDS habis."""
import base64
import json
import shutil
import subprocess

from . import director, render
from .config import Cfg

BATCH = 3  # adegan per permintaan, masing-masing tiga waktu untuk memeriksa aksi

SYSTEM = """Kamu QA/kritikus video animasi horor kampung untuk TikTok. Gaya siluet gelap, kabut, lampu teplok, cahaya bulan itu DISENGAJA, jangan dikritik.
Untuk tiap adegan kamu diberi: narasi bertimestamp, rencana adegan, dan frame berurutan dengan waktunya; sebagian disertai crop detail area aktivitas dari frame yang sama. Nilai kontak pada crop detail juga, karena alat kecil sulit terlihat pada frame penuh.
Untuk narasi yang hanya memperkenalkan tempat/benda/suasana, jangan menuntut aktivitas manusia yang tidak disebut. Untuk narasi aktivitas, wajib ada bukti kegiatan dan kontak. Frame penuh menilai konteks; crop detail menilai benda dan kontak. Jangan menganggap crop detail sebagai seluruh bingkai.
Nilai tiap adegan (skor 1-10):
- KESESUAIAN: apakah gambar menggambarkan narasi (tempat, tokoh, aksi, benda penting, hantu bila disebut)?
- CACAT: tokoh/benda terpotong tepi layar, tokoh tidak terlihat atau bertumpuk, gambar kosong/membosankan, objek aneh/melayang/rusak, hantu muncul padahal narasi tidak menyebut/mengisyaratkan.
- AKSI/TIMING: perubahan tangan/tubuh/alat antar frame sesuai kegiatan dan cue audio, bukan sekadar kamera bergerak. Pasar perlu toko/lapak, dagangan dan aktivitas sesuai ramai/sepi. Sate perlu pedagang mengipas/membalik di panggangan dengan bara dan asap; tangan dan alat harus dekat objek interaksi.
PUSTAKA 2.0: template aktivitas mendukung kontak dua tokoh, serah-terima barang, bantuan, keranda bersama, serta IK. Nilai KONTAK dan perubahan objek yang benar-benar terlihat. Jangan menganggap gestur/kamera sebagai bukti sebuah aktivitas.
BATAS MESIN (jangan minta yang mustahil): semua tokoh adalah siluet tanpa ekspresi wajah; tidak bisa menggambar senyum,
air mata; kontak fisik dan berpegangan dapat dibuat dengan rig IK. Pose yang ada: diam, jalan, lari, lari_ketakutan, duduk, duduk_lantai,
jongkok, tidur, tergeletak, menoleh, menunduk, mengetuk, menunjuk, berdoa, mengipas, membalik_sate, mengaduk, berjualan, membeli, berbicara, membawa, makan, minum. Hantu: bayangan, kuntilanak, pocong, genderuwo, tuyul.
Bisa gunakan template pasar_ramai, bakar_sate, dapur_memasak; komposisi mendukung props kios_sayur/kios_buah/toko/panggangan/panci/dagangan dan aktor berkedalaman y, skala, cue, akhir_cue, alat.
Benda yang tidak ada di pustaka bisa digambar sebagai siluet "kustom". Nilai apakah gambar SUDAH mewakili narasi semaksimal
yang mungkin dengan batas ini (mis. "memeluk" cukup diwakili dua tokoh berdekatan saling menghadap).
Subtitle di frame bisa sedikit tertinggal/terdahulu dari narasi; abaikan subtitle, nilai GAMBARNYA.
Skor 8-10 = layak. Skor < 8 = harus diperbaiki: tulis "perbaikan" berupa instruksi konkret untuk sutradara
(template apa, latar, aktor+pose, props, sosok/hantu, posisi x) supaya gambar cocok & menarik.
Balas HANYA JSON: {"adegan":[{"no":1,"skor":8,"masalah":"...","perbaikan":"..."}]}"""


def _frames(html, rplan, tmp):
    """Tiga waktu setiap adegan: sebelum, saat, sesudah perkembangan aksi."""
    groups = []
    for scene_index, s in enumerate(rplan["scenes"]):
        a, b = s["start"], s["end"]
        visible_start = min(b - .01, a + (.46 if scene_index == 0 else .36))
        fractions = (.06,.25,.5,.72,.94) if s.get("template") not in ("judul_kartu",) else (.18,.5,.85)
        ts = [max(visible_start, a + (b - a) * f) for f in fractions]
        triggers = [v for k, v in s["params"].items() if k.endswith("_t") and isinstance(v, (int, float)) and a < v < b]
        triggers += [q["t"] for q in s["params"].get("aktor", []) if isinstance(q, dict) and isinstance(q.get("t"), (int, float)) and a < q["t"] < b]
        if triggers:
            at = min(triggers)
            ts += [max(visible_start, at - .1), max(visible_start, min(b - .01, at + .25))]
        groups.append(sorted({round(t, 3) for t in ts}))
    times = [t for ts in groups for t in ts]
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    subprocess.run(render._worker_cmd(html, tmp, ["--times", ",".join(map(str, times)), "--prefix", "rv"]),
                   cwd=str(render.ROOT), check=True, capture_output=True, text=True)
    # -start_number 0: tanpa ini ffmpeg menomori keluaran mulai 1 -> gambar tiap adegan bergeser satu
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(tmp / "rv%03d.jpg"), "-vf", "scale=540:-1", "-q:v", "4",
                    "-start_number", "0", str(tmp / "s%03d.jpg")], check=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(tmp / "rv%03d.jpg"), "-vf", "crop=880:1000:100:600,scale=720:-1", "-q:v", "3", "-start_number", "0", str(tmp / "d%03d.jpg")], check=True)
    missing = [i for i in range(len(times)) if not (tmp / f"s{i:03d}.jpg").exists() or not (tmp / f"d{i:03d}.jpg").exists()]
    if missing:
        raise RuntimeError(f"frame review tidak lengkap: {missing}")
    out, offset = [], 0
    for ts in groups:
        out.append([(t,tmp / f"{prefix}{offset+i:03d}.jpg") for i,t in enumerate(ts) for prefix in ("s","d")])
        offset += len(ts)
    return out


def _ask(items, log, system=SYSTEM):
    content = [{"type": "text", "text": "Nilai adegan-adegan berikut."}]
    for no, narr, plan_s, imgs in items:
        content.append({"type": "text", "text": f"\nADEGAN {no}\nNarasi: {narr}\nRencana: {plan_s}"})
        for t, img in imgs:
            view = "Crop detail dari frame yang sama; bukan seluruh bingkai" if img.name.startswith("d") else "Frame penuh"
            content.append({"type": "text", "text": f"{view} pada {t:.3f}s"})
            content.append({"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + base64.b64encode(img.read_bytes()).decode()}})
    out = director._chat([{"role": "system", "content": system}, {"role": "user", "content": content}], None, log,
                         max_out=600 * len(items) + 200)
    return director.parse_json(out).get("adegan", [])


def review(html, plan, rplan, cues, tmp, log, style=None):
    """Kembalikan {indeks_adegan: catatan perbaikan} untuk adegan yang skornya di bawah ambang."""
    custom = director.style_dir(style["name"]) / "review_prompt.md" if style else None
    system = custom.read_text(encoding="utf-8") if custom and custom.exists() else SYSTEM
    imgs = _frames(html, rplan, tmp)
    items = []
    for k, (a, img) in enumerate(zip(plan["adegan"], imgs)):
        narr = " ".join(f"[{c['start']:.2f}-{c['end']:.2f}s] {c['text']}" for c in cues[a["dari"]:a["sampai"] + 1])
        items.append((k + 1, narr, f"{a['template']} {json.dumps(rplan['scenes'][k]['params'], ensure_ascii=False)}", img))
    fixes, scores = {}, {}
    for i in range(0, len(items), BATCH):
        part = items[i:i + BATCH]
        try:
            res = _ask(part, log, system)
        except Exception as e:
            log(f"Review adegan {part[0][0]}-{part[-1][0]} dilewati: {e}")
            continue
        for x in res:
            try:
                no, sk = int(x.get("no")), float(x.get("skor"))
            except (TypeError, ValueError):
                continue
            if no not in {item[0] for item in part} or not 1 <= sk <= 10:
                continue
            scores[no - 1] = sk
            if sk < Cfg.REVIEW_MIN_SCORE:
                fixes[no - 1] = (f"Review gambar sebelumnya (skor {sk:g}/10): {str(x.get('masalah', ''))[:300]}. "
                                 f"Perbaikan yang diminta: {str(x.get('perbaikan', ''))[:400]}")
                log(f"Review adegan {no}: skor {sk:g} — {str(x.get('masalah', ''))[:160]}")
    for k in range(len(items)):
        if k not in scores:
            fixes[k] = "Penilaian visual belum lengkap. Periksa kesesuaian lokasi, aksi tangan/alat, kedalaman dan cue audio."
    shutil.rmtree(tmp, ignore_errors=True)
    avg = sum(scores.values()) / len(scores) if scores else 0
    return fixes, avg, scores


def visual_evidence(rplan, folder, style, log):
    """Review complete shots against previously accepted story information."""
    from PIL import Image, ImageDraw
    from io import BytesIO

    shots = [(s, shot) for s in rplan["scenes"] for shot in s.get("shots", []) if shot["moments"]]
    observations, views, issues = {}, {}, {}
    system = (
        "Tinjau storyboard animasi " + style + ". Gambar berurutan per shot; setiap gambar berlabel ID. "
        "Konfirmasi shot hanya jika komposisi atau subjeknya menyajikan pandangan yang dapat dibedakan "
        "dari shot sebelumnya dan memiliki fungsi yang berbeda dari shot terdahulu. "
        "Konfirmasi momen hanya jika terlihat aksi, tahap, hasil, atau detail baru sesuai narasi. "
        "Abaikan gerak kamera kecil, pose antara, arus/kabut berulang, subtitle dan perubahan angka waktu. "
        "Bandingkan dengan temuan sebelumnya. Untuk setiap shot dan momen yang layak sebutkan perbedaan "
        "konkret yang tampak. Abaikan ID yang tidak layak dan beri alasan singkat per shot di issues. Jawab JSON "
        '{"shots":{"1":"komposisi dan fokus"},"moments":{"1.1":"fakta visual spesifik"},"issues":{"2":"detail berulang dari shot 1"}}.'
    )
    for offset in range(0, len(shots), 4):
        batch = shots[offset:offset+4]
        content = [{"type":"text", "text": "Temuan sebelumnya: " + json.dumps(
            {"shots":views, "moments":observations}, ensure_ascii=False)}]
        allowed_views, allowed_moments = set(), set()
        for scene, shot in batch:
            moments = shot["moments"]
            strip = Image.new("RGB", (360*len(moments), 666), "#17191b")
            draw = ImageDraw.Draw(strip)
            for i,m in enumerate(moments):
                with Image.open(folder / f"key-{m['id']}.jpg") as im:
                    strip.paste(im, (360*i,0))
                draw.text((360*i+4,645), f"{m['id']}   {m['t']:.2f} s", fill="white")
                allowed_moments.add(m["id"])
            allowed_views.add(str(shot["no"]))
            source = BytesIO()
            strip.save(source, format="JPEG", quality=88)
            cues = [c["text"] for c in rplan["cues"] if c["end"]>shot["start"] and c["start"]<shot["end"]]
            content.append({"type":"text","text": f"Shot {shot['no']}, {scene['template']}, {shot['view']}. "
                            + " ".join(cues) + "\nFokus yang direncanakan: " + " | ".join(dict.fromkeys(m["focus"] for m in moments))})
            content.append({"type":"image_url","image_url":{"url":"data:image/jpeg;base64,"+base64.b64encode(source.getvalue()).decode()}})
        try:
            raw = director.parse_json(director._chat([{"role":"system","content":system},{"role":"user","content":content}],
                                                     None, log, max_out=2400))
            for key, allowed, dest in [("shots",allowed_views,views),("moments",allowed_moments,observations),("issues",allowed_views,issues)]:
                rows = raw.get(key, {})
                if isinstance(rows, dict):
                    dest.update({k:v.strip() for k,v in rows.items() if k in allowed and isinstance(v,str) and v.strip()})
        except Exception as exc:
            log(f"Review variasi shot {batch[0][1]['no']} belum lengkap: {exc}")
    return {"shots":views, "moments":observations, "issues":issues}
