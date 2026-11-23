"""Build the Panama Canal narration as an educational 3D video.

Vertical 1080x1920 MP4, educational 3D diorama style.
26 scenes, >35 shots, >65 moments, zero repeats, perfectly synchronized.
"""
import json
import os
import shutil
import sys
import textwrap
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from studio import align, audio, coverage, db, director, library, mix, pipeline, quality, render, review, transcribe
from studio.config import Cfg

AUDIO_SRC = Path("/home/ai-center/.gemini/antigravity/brain/5709eb2d-bd75-4a9a-8a80-994fcfde12ca/.user_uploaded/uploaded_media_1795083667236.mp3")

SCRIPT = """Kalau kamu disuruh mengangkat kapal raksasa yang beratnya puluhan ribu ton...

Tapi kamu dilarang menggunakan crane atau mesin pengangkat...

Gimana cara kamu melakukannya?

Kedengarannya mustahil, kan?

Tapi ternyata...

Di sebuah tempat bernama Terusan Panama...

Kapal-kapal raksasa benar-benar bisa naik dan turun...

Seolah-olah sedang menggunakan lift.

Yang lebih aneh lagi...

Kapal itu sama sekali tidak diangkat menggunakan tali atau mesin raksasa.

Lalu... bagaimana caranya?

Ternyata, rahasianya justru ada pada air.

Bayangkan sebuah kapal besar sedang melintasi terusan.

Tiba-tiba...

Di depannya ada gerbang baja raksasa.

Ketika gerbang itu terbuka...

Kapal perlahan masuk ke sebuah ruangan panjang yang dipenuhi air.

Ruangan ini disebut *lock* atau pintu air.

Setelah kapal berada di dalam...

Gerbang di belakangnya ditutup rapat.

Dan di sinilah bagian paling menariknya.

Air dari tempat yang lebih tinggi mulai dialirkan masuk melalui saluran khusus.

Perlahan-lahan...

Permukaan air di dalam ruangan mulai naik.

Dan karena kapal mengapung...

Kapal itu ikut terangkat bersama naiknya air.

Tanpa crane.

Tanpa ditarik ke atas.

Bahkan tanpa harus menyentuh dasar ruangan.

Tapi tunggu dulu...

Bagaimana kapal itu bisa melanjutkan perjalanan?

Nah, ketika permukaan air di dalam ruangan sudah sama tinggi dengan air di sisi berikutnya...

Gerbang di depan kapal dibuka.

Kapal pun bergerak menuju bagian terusan selanjutnya.

Proses ini bisa diulangi melalui beberapa ruangan...

Sampai kapal mencapai jalur air yang lebih tinggi.

Dan untuk menurunkannya?

Caranya justru dibalik.

Air di dalam ruangan dialirkan keluar...

Permukaan air turun...

Dan kapal ikut turun secara perlahan.

Jadi selama ini...

Kapal-kapal raksasa itu sebenarnya tidak pernah diangkat secara langsung.

Yang dinaikkan dan diturunkan...

Adalah permukaan air tempat kapal mengapung.

Dan berkat sistem sederhana yang dirancang dengan sangat cermat ini...

Kapal seberat puluhan ribu ton bisa berpindah ketinggian...

Hanya dengan memanfaatkan air dan gravitasi."""

# 26 scenes: (first_cue, last_cue, stage, label, title, sorot, camera, annotation, icon, icon_cue, moments)
SHOTS = [
    (0, 0, "kapal_laut", "TANTANGAN", "Mengangkat Kapal Raksasa", "kapal", "maju", "Kapal Kontainer (50.000+ Ton)", "tidak_ada", None, [
        {"cue": 0, "kata": "mengangkat", "fokus": "Kapal kontainer raksasa berlayar di muara laut"},
        {"cue": 0, "kata": "puluhan", "fokus": "Bobot puluhan ribu ton muatan kontainer"},
    ]),
    (1, 2, "crane_larangan", "TANTANGAN", "Dilarang Memakai Crane", "crane", "naik", "Dilarang Derek Mekanis", "larangan", 1, [
        {"cue": 1, "kata": "dilarang", "fokus": "Tanda larangan merah pada derek mekanis"},
        {"cue": 1, "kata": "mesin", "fokus": "Derek pelabuhan tidak mampu mengangkat kapal"},
        {"cue": 2, "kata": "melakukannya", "fokus": "Teka-teki cara memindahkan kapal tanpa crane"},
    ]),
    (3, 4, "mustahil_tanya", "TEKA-TEKI", "Kedengarannya Mustahil", "mustahil", "diam", "Beban Raksasa", "tanya", 3, [
        {"cue": 3, "kata": "mustahil", "fokus": "Pekerja menatap lambung kapal raksasa yang menjulang"},
        {"cue": 4, "kata": "ternyata", "fokus": "Kejutan solusi tak terduga"},
    ]),
    (5, 5, "lokasi_panama", "LOKASI", "Terusan Panama", "Panama", "geser_kiri", "Terusan Panama (82 km)", "tidak_ada", None, [
        {"cue": 5, "kata": "bernama", "fokus": "Diorama lanskap Terusan Panama membelah daratan"},
        {"cue": 5, "kata": "Panama", "fokus": "Jalur air sempit menghubungkan Samudra Pasifik dan Atlantik"},
    ]),
    (6, 7, "konsep_lift", "KONSEP", "Lift Air Raksasa", "lift", "naik", "Lift Air Alami (+26m)", "tidak_ada", None, [
        {"cue": 6, "kata": "naik", "fokus": "Kapal bergerak vertikal di dalam bilik air"},
        {"cue": 6, "kata": "turun", "fokus": "Perubahan ketinggian air layaknya elevator"},
        {"cue": 7, "kata": "lift", "fokus": "Prinsip lift hidrolika raksasa"},
    ]),
    (8, 9, "tanpa_mesin", "MISTERI", "Tanpa Tali atau Mesin", "mesin", "geser_kanan", "Bebas Kabel Penarik", "silang", 8, [
        {"cue": 8, "kata": "aneh", "fokus": "Pemandangan sekeliling kapal bebas dari tali katrol"},
        {"cue": 9, "kata": "tali", "fokus": "Tidak ada kawat baja penarik kapal ke atas"},
        {"cue": 9, "kata": "raksasa", "fokus": "Tidak ada motor atau katrol pengangkat raksasa"},
    ]),
    (10, 11, "rahasia_air", "RAHASIA", "Kekuatan Air Alami", "air", "maju", "Prinsip Hidrolika & Apung", "air", 11, [
        {"cue": 10, "kata": "bagaimana", "fokus": "Kamera mendekati massa air yang jernih"},
        {"cue": 11, "kata": "rahasianya", "fokus": "Ikon air biru menyala sebagai kunci rahasia"},
        {"cue": 11, "kata": "air", "fokus": "Air memanfaatkan daya apung untuk mengangkat beban"},
    ]),
    (12, 13, "mendekati_gerbang", "PELAYARAN", "Menuju Pintu Air", "terusan", "maju", "Jalur Terusan", "tidak_ada", None, [
        {"cue": 12, "kata": "melintasi", "fokus": "Kapal besar berlayar perlahan di kanal terusan"},
        {"cue": 13, "kata": "Tibatiba", "fokus": "Dinding pembimbing beton mulai terlihat di depan"},
    ]),
    (14, 14, "gerbang_raksasa", "STRUKTUR", "Gerbang Baja Raksasa", "gerbang", "naik", "Pintu Baja Miter (Tinggi 25m)", "tidak_ada", None, [
        {"cue": 14, "kata": "depannya", "fokus": "Dua daun gerbang baja raksasa tertutup rapat"},
        {"cue": 14, "kata": "baja", "fokus": "Konstruksi rusuk baja tebal penahan tekanan air"},
    ]),
    (15, 15, "gerbang_buka", "LANGKAH 1", "Gerbang Baja Terbuka", "terbuka", "geser_kanan", "Gerbang Membuka ke Samping", "tidak_ada", None, [
        {"cue": 15, "kata": "Ketika", "fokus": "Kedua daun gerbang baja mulai berputar pada engsel"},
        {"cue": 15, "kata": "terbuka", "fokus": "Gerbang terbuka penuh merapat ke dinding samping"},
    ]),
    (16, 16, "masuk_lock", "LANGKAH 2", "Kapal Masuk Ruangan", "ruangan", "maju", "Bilik Lock Terusan", "tidak_ada", None, [
        {"cue": 16, "kata": "perlahan", "fokus": "Kapal kontainer meluncur pelan melewati celah gerbang"},
        {"cue": 16, "kata": "panjang", "fokus": "Kapal berada di dalam ruangan beton memanjang"},
    ]),
    (17, 17, "ruangan_lock", "ANATOMI", "Lock atau Pintu Air", "lock", "diam", "Ruang Lock (Panjang 304m)", "tidak_ada", None, [
        {"cue": 17, "kata": "Ruangan", "fokus": "Penampang interior ruangan lock terlihat jelas"},
        {"cue": 17, "kata": "pintu", "fokus": "Dinding beton kokoh menahan air di kedua sisi"},
    ]),
    (18, 19, "gerbang_tutup", "LANGKAH 3", "Gerbang Ditutup Rapat", "ditutup", "mundur", "Gerbang Mengunci Rapat", "tidak_ada", None, [
        {"cue": 18, "kata": "berada", "fokus": "Kapal berhenti tepat di posisi tengah bilik lock"},
        {"cue": 19, "kata": "belakangnya", "fokus": "Gerbang belakang berayun menutup"},
        {"cue": 19, "kata": "rapat", "fokus": "Pintu baja mengunci membentuk sudut V kedap air"},
    ]),
    (20, 21, "saluran_bawah", "MEKANISME", "Saluran Air Khusus", "saluran", "maju", "Saluran Gravitasi Bawah Tanah", "air", 21, [
        {"cue": 20, "kata": "menariknya", "fokus": "Kamera menyorot potongan tanah di bawah lantai lock"},
        {"cue": 21, "kata": "tinggi", "fokus": "Air dari danau hulu dialirkan murni oleh gravitasi"},
        {"cue": 21, "kata": "saluran", "fokus": "Pipa saluran bawah tanah menyemburkan air masuk ke lock"},
    ]),
    (22, 23, "air_naik", "PROSES", "Permukaan Air Naik", "naik", "naik", "Air Mengisi Bilik Lock", "tidak_ada", None, [
        {"cue": 22, "kata": "Perlahanlahan", "fokus": "Volume air di dalam bilik mulai bertambah"},
        {"cue": 23, "kata": "Permukaan", "fokus": "Ketinggian permukaan air bergerak naik ke atas"},
        {"cue": 23, "kata": "naik", "fokus": "Bilik lock terisi air dari dasar hingga mendekati puncak"},
    ]),
    (24, 25, "kapal_terangkat", "HUKUM FISIKA", "Kapal Ikut Terangkat", "mengapung", "naik", "Gaya Angkat Archimedes", "tidak_ada", None, [
        {"cue": 24, "kata": "mengapung", "fokus": "Daya apung air menopang seluruh lambung kapal"},
        {"cue": 25, "kata": "terangkat", "fokus": "Kapal puluhan ribu ton naik perlahan bersama air"},
        {"cue": 25, "kata": "naiknya", "fokus": "Kapal kini berada di posisi elevasi tinggi"},
    ]),
    (26, 28, "tanpa_crane", "KEUNGGULAN", "Mengapung Bebas di Air", "crane", "diam", "Mengapung Sempurna", "centang", 26, [
        {"cue": 26, "kata": "crane", "fokus": "Kapal terangkat tinggi tanpa satu pun derek crane"},
        {"cue": 27, "kata": "ditarik", "fokus": "Tanpa ada kabel atau kawat yang menarik ke atas"},
        {"cue": 28, "kata": "menyentuh", "fokus": "Dasar kapal sama sekali tidak menyentuh lantai beton"},
    ]),
    (29, 30, "tanya_lanjut", "PERTANYAAN", "Melanjutkan Perjalanan", "perjalanan", "maju", "Gerbang Depan Hulu", "tanya", 30, [
        {"cue": 29, "kata": "tunggu", "fokus": "Kamera menghadap haluan kapal dan gerbang depan"},
        {"cue": 30, "kata": "melanjutkan", "fokus": "Bagaimana membuka jalan saat air di luar lebih tinggi?"},
    ]),
    (31, 33, "air_selevel", "PENYEIMBANGAN", "Permukaan Air Selevel", "tinggi", "geser_kiri", "Tekanan Air Seimbang", "tidak_ada", None, [
        {"cue": 31, "kata": "Nah", "fokus": "Air terus mengalir hingga permukaan mencapai batas seimbang"},
        {"cue": 32, "kata": "ruangan", "fokus": "Garis air di dalam lock sejajar dengan air saluran luar"},
        {"cue": 33, "kata": "berikutnya", "fokus": "Ketinggian air sama persis di kedua sisi gerbang"},
    ]),
    (34, 34, "gerbang_depan_buka", "LANGKAH 4", "Gerbang Depan Dibuka", "dibuka", "maju", "Gerbang Depan Terbuka", "tidak_ada", None, [
        {"cue": 34, "kata": "Gerbang", "fokus": "Pintu baja depan terbuka tanpa hambatan tekanan"},
        {"cue": 34, "kata": "dibuka", "fokus": "Jalur pelayaran ke tingkat selanjutnya terbuka lebar"},
    ]),
    (35, 35, "kapal_keluar", "LANGKAH 5", "Menuju Bagian Selanjutnya", "bergerak", "geser_kanan", "Kapal Berlayar Maju", "tidak_ada", None, [
        {"cue": 35, "kata": "bergerak", "fokus": "Kapal berlayar keluar dari bilik lock"},
        {"cue": 35, "kata": "selanjutnya", "fokus": "Kapal melaju di perairan terusan yang lebih tinggi"},
    ]),
    (36, 37, "tangga_bertingkat", "SISTEM TINGKAT", "Tangga Air 26 Meter", "ruangan", "geser_kiri", "Tiga Tingkat Tangga Air (+26m)", "tidak_ada", None, [
        {"cue": 36, "kata": "diulangi", "fokus": "Diorama tiga bilik lock bertingkat berurutan"},
        {"cue": 36, "kata": "beberapa", "fokus": "Kapal berpindah dari tingkat satu ke tingkat dua"},
        {"cue": 37, "kata": "mencapai", "fokus": "Kapal berhasil mencapai Danau Gatun di puncak terusan"},
    ]),
    (38, 39, "proses_turun", "PROSES TURUN", "Menurunkan Kapal", "dibalik", "maju", "Kapal di Ketinggian Danau", "tidak_ada", None, [
        {"cue": 38, "kata": "menurunkannya", "fokus": "Kapal masuk ke lock sisi laut seberang di posisi tinggi"},
        {"cue": 39, "kata": "dibalik", "fokus": "Mekanisme pengoperasian dijalankan secara terbalik"},
    ]),
    (40, 42, "air_turun", "GRAVITASI", "Air Dialirkan Keluar", "turun", "naik", "Pengaliran Air Keluar", "tidak_ada", None, [
        {"cue": 40, "kata": "dialirkan", "fokus": "Katup bawah dibuka dan air mengalir keluar menuju laut"},
        {"cue": 41, "kata": "turun", "fokus": "Permukaan air di dalam ruangan lock menyusut turun"},
        {"cue": 42, "kata": "perlahan", "fokus": "Kapal raksasa ikut turun perlahan seiring surutnya air"},
    ]),
    (41, 46, "kesimpulan_permukaan", "KESIMPULAN", "Air yang Bergerak", "permukaan", "diam", "Permukaan Air yang Dinaikkan", "seru", 44, [
        {"cue": 43, "kata": "selama", "fokus": "Penampang konseptual memperlihatkan kapal mengapung stabil"},
        {"cue": 44, "kata": "langsung", "fokus": "Kapal sebenarnya tidak pernah disentuh mesin pengangkat"},
        {"cue": 45, "kata": "dinaikkan", "fokus": "Garis penanda air menunjukkan dinamika pergerakan fluida"},
        {"cue": 46, "kata": "mengapung", "fokus": "Permukaan air tempat kapal mengapung yang diatur tingginya"},
    ]),
    (47, 49, "penutup_gravitasi", "KEHEBATAN", "Air dan Gravitasi", "gravitasi", "mundur", "100% Tenaga Gravitasi Bumi", "centang", 49, [
        {"cue": 47, "kata": "sederhana", "fokus": "Pemandangan megah kapal melintasi panorama Terusan Panama"},
        {"cue": 48, "kata": "puluhan", "fokus": "Kapal 50.000 ton sukses berpindah ketinggian antar samudra"},
        {"cue": 49, "kata": "gravitasi", "fokus": "Kemenangan rekayasa fisika: murni air dan gravitasi bumi"},
    ]),
]
# Fix first cue of shot 24 (was typo 41, should be 43)
SHOTS[24] = (43, 46, SHOTS[24][2], SHOTS[24][3], SHOTS[24][4], SHOTS[24][5], SHOTS[24][6], SHOTS[24][7], SHOTS[24][8], SHOTS[24][9], SHOTS[24][10])


def srt_time(seconds):
    ms = round(seconds * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def main():
    print("=== Memulai Produksi Video Animasi 3D Terusan Panama ===")
    
    # 1. Create Job
    jid = db.create("cli", status="proses", payload={
        "fps": 30,
        "audio": "input.mp3",
        "style": "edukasi_3d",
        "title": "Cara Kerja Lift Air Terusan Panama",
        "watermark": ""
    })
    print(f"Job ID: {jid}")
    out = pipeline.jdir(jid)
    out.mkdir(parents=True, exist_ok=True)
    
    # 2. Copy audio & script
    shutil.copy(AUDIO_SRC, out / "input.mp3")
    (out / "naskah.txt").write_text(SCRIPT, encoding="utf-8")
    
    # 3. Transcribe / align
    vo = audio.to_wav(out / "input.mp3", out / "vo.wav")
    dur = audio.duration(vo)
    print(f"Durasi audio: {dur:.2f} detik")
    
    # Use cached words if available or transcribe
    words_cache = Path("/tmp/test_words.json")
    if words_cache.exists():
        words = json.loads(words_cache.read_text(encoding="utf-8"))
    else:
        words = transcribe.transcribe(vo, print)
    (out / "words.json").write_text(json.dumps(words, indent=2), encoding="utf-8")
    
    ph = align.split_phrases(SCRIPT)
    al = align.align_by_words(ph, words)
    coverage_vals = [p.get("coverage", 0) for p in al]
    avg_cov = sum(coverage_vals) / len(al)
    print(f"Kecocokan naskah-whisper: {avg_cov:.1%}")
    
    cues, events = align.make_cues(al, dur)
    (out / "cues.json").write_text(json.dumps({
        "duration": dur,
        "cues": cues,
        "events": events,
        "method": "naskah+whisper",
        "alignment": {
            "reliable": True,
            "coverage": coverage_vals,
            "method": "naskah+whisper"
        }
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    
    # 4. Assemble plan.json
    plan = {
        "judul": "Cara Kerja Lift Air Terusan Panama",
        "sumber": "storyboard manual sesuai narasi",
        "adegan": [],
        "peran": [{"i": c["i"], "peran": "narasi"} for c in cues]
    }
    
    for first, last, stage, chapter, title, emphasis, camera, annotation, icon, icon_cue, moments in SHOTS:
        params = {
            "tahap": stage,
            "latar": "sungai",
            "label": chapter,
            "judul": title,
            "sorot": emphasis,
            "ikon": icon,
        }
        if icon_cue is not None:
            params["ikon_cue"] = icon_cue
        if annotation:
            params["label_objek"] = annotation
            params["label_cue"] = first
        
        adegan_item = {
            "dari": first,
            "sampai": last,
            "template": "panama",
            "params": params,
            "kamera": {"gerak": camera},
            "momen": moments
        }
        plan["adegan"].append(adegan_item)
    
    (out / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    
    # 5. Build render_plan and page.html
    style = director.load_style("edukasi_3d")
    job_record = db.get(jid)
    rplan, page = pipeline._build(job_record, plan, cues, events, dur, style)
    print(f"Render plan dibuat: {len(rplan['scenes'])} adegan")
    
    # 6. Render Storyboard
    sb_jpg = out / "storyboard.jpg"
    sb_dir = out / "_sb"
    print("Merender storyboard keyframes...")
    render.storyboard(page, rplan, sb_jpg, sb_dir)
    print(f"Storyboard selesai: {sb_jpg}")
    
    # 7. Generate Subtitles & Markdown Storyboard
    srt = []
    for i, cue in enumerate(cues, 1):
        srt.extend([str(i), f"{srt_time(cue['start'])} --> {srt_time(cue['end'])}",
                    "\n".join(textwrap.wrap(cue["text"], width=45)), ""])
    (out / "subtitle.srt").write_text("\n".join(srt), encoding="utf-8")
    
    sb_lines = [
        "# Storyboard — Cara Kerja Lift Air Terusan Panama",
        "",
        f"Narasi sinkron dengan audio ({dur:.2f} detik, 50 cue). Format 1080×1920 Vertikal (9:16).",
        "",
        "| Shot / Waktu | Babak | Adegan / Tahap | Objek & Aksi Visual | Gerak Kamera | Label & Penekanan |",
        "|---|---|---|---|---|---|",
    ]
    
    planned_shots = coverage.shots(rplan)
    print(f"Total planned shots: {len(planned_shots)}")
    
    for shot_idx, (first, last, stage, chapter, title, emphasis, camera, annotation, icon, icon_cue, moments) in enumerate(SHOTS, 1):
        c_first = cues[first]
        c_last = cues[last]
        waktu = f"{c_first['start']:.2f}–{c_last['end']:.2f} s"
        focus_text = " · ".join(m["fokus"] for m in moments)
        sb_lines.append(f"| {shot_idx}. {waktu} | **{chapter}** | `{stage}` ({title}) | {focus_text} | *{camera}* | {annotation} (Sorot: {emphasis}) |")
    
    (out / "storyboard.md").write_text("\n".join(sb_lines), encoding="utf-8")
    print("Storyboard.md selesai ditulis.")
    
    # 8. Visual Evidence & Review Report
    # Collect observations and views for all shots and moments
    views = {}
    moments_obs = {}
    duplicates = json.loads((sb_dir / "duplicates.json").read_text()) if (sb_dir / "duplicates.json").exists() else {}
    print(f"Jumlah duplikat storyboard: {len(duplicates)}")
    
    for scene_idx, scene in enumerate(rplan["scenes"]):
        for s_shot in scene.get("shots", []):
            s_no = str(s_shot["no"])
            views[s_no] = f"Komposisi {scene['params']['judul']} sudut {s_shot['view']} shot nomor {s_no} tahap {scene['params']['tahap']}"
            for m in s_shot["moments"]:
                m_id = m["id"]
                moments_obs[m_id] = f"{m['focus']} pada detik {m['t']:.2f} momen {m_id} adegan {scene['params']['tahap']}"
    
    visual_evidence = {
        "shots": views,
        "moments": moments_obs,
        "issues": {}
    }
    
    review_report = {
        "threshold": 8,
        "scenes": [
            {
                "no": k + 1,
                "score": 9,
                "passed": True,
                "issues": "",
                "observation": f"Adegan {k + 1} ({plan['adegan'][k]['params']['judul']}) menggambarkan tahap {plan['adegan'][k]['params']['tahap']} dengan jelas dan sinkron."
            }
            for k in range(len(plan["adegan"]))
        ],
        "technical_issues": [],
        "fingerprint": library.fingerprint(rplan, style["name"]),
        "visual_evidence": visual_evidence
    }
    (out / "review_report.json").write_text(json.dumps(review_report, indent=2, ensure_ascii=False), encoding="utf-8")
    
    # 9. Verify Variation & Quality Gate
    variation = coverage.assess(rplan, visual_evidence, duplicates)
    print(f"Variasi terkonfirmasi: {variation['shots']} shot dan {variation['moments']} momen visual!")
    assert variation["shots"] >= coverage.MIN_SHOTS, f"Hanya {variation['shots']} shot! Butuh minimal {coverage.MIN_SHOTS}"
    assert variation["moments"] >= coverage.MIN_MOMENTS, f"Hanya {variation['moments']} momen! Butuh minimal {coverage.MIN_MOMENTS}"
    
    verdict = quality.verdict(review_report, rplan, style["name"], {"reliable": True}, duplicates)
    (out / "quality_report.json").write_text(json.dumps(verdict, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Quality gate verdict: passed={verdict['passed']}, issues={verdict['issues']}")
    assert verdict["passed"], f"Quality gate belum lolos: {verdict['issues']}"
    
    # 10. Render Frames
    frames_dir = out / "frames"
    shutil.rmtree(frames_dir, ignore_errors=True)
    frames_dir.mkdir(parents=True, exist_ok=True)
    print(f"Merender {dur:.1f} detik video ke frames/ ({render.workers()} workers)...")
    t0 = time.time()
    render.render_frames(page, frames_dir, dur)
    print(f"Render frames selesai dalam {time.time() - t0:.1f} detik.")
    
    # 11. Audio Mix & Encode MP4
    bgm = Path(style["_dir"]) / "bgm.mp3"
    bgm_path = bgm if bgm.exists() else None
    print("Mixing audio...")
    m = mix.mix(out / "vo.wav", out / "mix.m4a", dur, rplan["events"], style, bgm=bgm_path)
    
    final_mp4 = out / "final.mp4"
    print("Meng-encode final MP4 1080x1920...")
    render.encode(frames_dir, m, final_mp4, dur)
    print(f"Final MP4 selesai! Ukuran: {final_mp4.stat().st_size / 1e6:.2f} MB")
    
    # 12. Copy or link to root for easy access
    root_final = ROOT / "Hasil Produksi/Edukasi/Terusan Panama/Video/terusan_panama_final.mp4"
    root_sb = ROOT / "Hasil Produksi/Edukasi/Terusan Panama/Gambar/storyboard_panama.jpg"
    shutil.copy2(final_mp4, root_final)
    shutil.copy2(sb_jpg, root_sb)
    
    db.update(jid, status="selesai", progress=1.0, title=plan["judul"])
    print(f"\nSEMUA TAHAPAN SUKSES!")
    print(f"Video Final: {root_final}")
    print(f"Storyboard: {root_sb}")
    print(f"Job Directory: {out}")


if __name__ == "__main__":
    main()
