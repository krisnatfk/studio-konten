"""Build the supplied cofferdam narration as a deterministic edu_3d project.

Run from the repository root with .venv/bin/python scripts/make_cofferdam_video.py
The job ID is read from data/cofferdam_current_job.txt.
"""
import json
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from studio import db, director, library, pipeline, render

JID = (ROOT / "data/cofferdam_current_job.txt").read_text().strip()
JOB = db.get(JID)
OUT = pipeline.jdir(JID)

# Inclusive cue indices, stage, chapter, short heading, emphasis, camera, annotation.
SHOTS = [
    (0, 0, "rencana_jembatan", "TANTANGAN", "Jembatan di sungai", "jembatan", "maju", ""),
    (1, 2, "rencana_tiang", "TANTANGAN", "Tiang di tengah arus", "tiang", "naik", "Tiang penyangga"),
    (3, 4, "sungai_deras", "TANTANGAN", "Air terus mengalir", "sungai", "geser_kiri", "Aliran sungai"),
    (5, 6, "gali_gagal", "MASALAH", "Galian terisi air", "air", "maju", "Lubang terisi air"),
    (7, 8, "gali_gagal", "MASALAH", "Tanah bisa runtuh", "runtuh", "mundur", "Tepi galian"),
    (9, 9, "cor_tiang", "TEKA-TEKI", "Fondasi di tengah sungai", "fondasi", "maju", ""),
    (10, 11, "kering", "TEKA-TEKI", "Ruang kerja kering", "kering", "geser_kanan", "Ruang kerja"),
    (12, 12, "kotak_penuh", "JAWABAN", "Teknik cofferdam", "cofferdam", "maju", "Cofferdam"),
    (13, 14, "lembaran_baja", "LANGKAH 1", "Baja ke dasar sungai", "baja", "maju", "Lembaran baja"),
    (15, 16, "sambungan_baja", "LANGKAH 1", "Dinding saling mengunci", "mengunci", "geser_kanan", "Sambungan baja"),
    (17, 18, "kotak_penuh", "LANGKAH 1", "Kotak di tengah sungai", "kotak", "diam", "Kotak baja"),
    (19, 20, "kotak_penuh", "LANGKAH 2", "Air masih di dalam", "air", "maju", "Air di dalam"),
    (21, 21, "rangka", "LANGKAH 2", "Dinding diperkuat", "dinding", "diam", "Rangka penahan"),
    (22, 24, "sedot", "LANGKAH 2", "Air dipompa keluar", "pompa", "maju", "Pompa"),
    (25, 25, "kering", "LANGKAH 2", "Area relatif kering", "kering", "diam", "Area kerja"),
    (26, 27, "tekanan", "MASALAH BARU", "Tekanan dari luar", "tekanan", "maju", "Tekanan air"),
    (28, 29, "tekanan", "MASALAH BARU", "Dinding harus kuat", "dinding", "diam", ""),
    (30, 30, "rangka", "SOLUSI", "Rangka baja penyangga", "rangka", "maju", "Rangka baja"),
    (31, 32, "cor_tiang", "KONSTRUKSI", "Fondasi dan tiang", "fondasi", "maju", "Tiang jembatan"),
    (33, 33, "cor_tiang", "KONSTRUKSI", "Tiang berdiri", "tiang", "naik", ""),
    (34, 35, "bongkar", "TAHAP AKHIR", "Dinding dibongkar", "dibongkar", "mundur", ""),
    (36, 38, "jembatan_selesai", "HASIL", "Jembatan terlihat biasa", "jembatan", "mundur", ""),
    (39, 40, "kering", "INTINYA", "Ruang kerja kering", "kering", "maju", "Ruang kerja"),
    (41, 41, "jembatan_selesai", "INTINYA", "Di tengah arus sungai", "sungai", "mundur", ""),
]


def srt_time(seconds):
    ms = round(seconds * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def main():
    data = json.loads((OUT / "cues.json").read_text())
    cues, events, duration = data["cues"], data["events"], data["duration"]
    assert len(cues) == 42 and SHOTS[0][0] == 0 and SHOTS[-1][1] == 41
    assert all(a[0] == SHOTS[i-1][1] + 1 for i, a in enumerate(SHOTS) if i)
    plan = {"judul": "Cara Kerja Cofferdam", "sumber": "storyboard manual sesuai narasi", "adegan": [],
            "peran": [{"i": c["i"], "peran": "narasi"} for c in cues]}
    for first, last, stage, chapter, title, emphasis, camera, annotation in SHOTS:
        params = {"tahap": stage, "latar": "sungai", "label": chapter, "judul": title,
                  "sorot": emphasis}
        if first == 7:
            params["runtuh"] = True
        if first == 3:
            params["arus"] = True
            params["kedalaman_cue"] = 4
        if first in (9, 31, 33):
            params["pekerja"] = True
        if first == 12:
            params["introduksi"] = True
        if first == 17:
            params["atas"] = True
        if first == 19:
            params["lihat_air"] = True
        if first == 21:
            params["instant"] = True
        if first == 28:
            params["ikon"] = "seru"
            params["risiko"] = True
        if first == 33:
            params["completed"] = True
        if annotation:
            params["label_objek"] = annotation
            params["label_cue"] = 32 if first == 31 else first
        plan["adegan"].append({"dari": first, "sampai": last, "template": "cofferdam",
                               "params": params, "kamera": {"gerak": camera}})
    (OUT / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2))
    style = director.load_style("edukasi_3d")
    rplan, page = pipeline._build(JOB, plan, cues, events, duration, style)
    render.storyboard(page, rplan, OUT / "storyboard.jpg", OUT / "_sb")
    srt = []
    for i, cue in enumerate(cues, 1):
        srt.extend([str(i), f"{srt_time(cue['start'])} --> {srt_time(cue['end'])}",
                    "\n".join(textwrap.wrap(cue["text"], width=45)), ""])
    (OUT / "subtitle.srt").write_text("\n".join(srt), encoding="utf-8")
    lines = ["# Storyboard — Cara Kerja Cofferdam", "", "Narasi: audio_sungai.mp3. Timing dari Whisper yang dicocokkan dengan naskah.", "",
             "| Waktu | Narasi | Shot | Objek/aksi | Kamera | Label/penekanan |", "|---|---|---|---|---|---|"]
    for shot, scene in zip(SHOTS, rplan["scenes"]):
        a, b, stage, chapter, title, emph, camera, ann = shot
        quote = " ".join(c["text"] for c in cues[a:b+1]).replace("|", "/")
        lines.append(f"| {scene['start']:.2f}–{scene['end']:.2f} s | {quote} | {chapter} | {stage.replace('_', ' ')} | {camera} | {title}; {ann or emph} |")
    (OUT / "storyboard.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(JID, "scenes", len(rplan["scenes"]), "duration", duration, "page", page, flush=True)


if __name__ == "__main__":
    main()
