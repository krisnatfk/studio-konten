"""Re-edit Orang Asing di Pos Ronda against its aligned narration."""
import argparse
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from studio import director, render
from studio.config import Cfg

SOURCE = ROOT / "data/jobs/20261119-215317-d109"
WORK = ROOT / "data/jobs/ronda-cinematic"
NAME = "orang_asing_pos_ronda_sinematik"

# Cue, set, action, camera size, subject (x, y, zoom), travel (dx, dy, dz), visible beat.
# The cut follows the spoken phrase, with a slightly longer hold on the two reveals.
EDIT = [
    (0, "sawah", "desa", "Lebar", (583,740,1), (11,0,.02), "Siluet pos ronda dan atap desa di balik pematang"),
    (1, "pos", "buka", "Sedang", (755,762,1.56), (26,0,.07), "Penonton melihat penghuni tambahan di ujung bangku"),
    (2, "pos", "buka", "Dekat", (803,745,2.65), (14,-9,.18), "Kepala orang asing tertunduk, kaca gelas menangkap cahaya"),
    (3, "pos", "buka", "Makro", (825,727,4.4), (-7,0,.25), "Garis rambut dan wajah yang masih tersembunyi di bawah bayang"),
    (5, "pos", "buka", "Detail", (790,837,3.54), (3,6,.17), "Uap kopi melintas di depan sarung hitam"),
    (6, "sawah", "desa", "Lebar", (493,749,1.20), (-35,-14,-.12), "Lintasan atap dan pohon kelapa membuka kilas balik 2003"),
    (7, "sawah", "desa", "Rendah", (439,1009,1.56), (-36,32,.08), "Kilau tipis menyusuri petak sawah dan tepi pematang"),
    (8, "sawah", "patroli", "Lebar", (528,858,1.12), (48,-6,.07), "Lima warga berangkat beriringan"),
    (9, "sawah", "patroli", "Sedang", (587,891,1.91), (38,-13,.05), "Lentera Pak Karto lewat di antara dua baris siluet"),
    (10, "pos", "duduk", "Lebar", (497,746,1.02), (9,-4,.10), "Lima warga di bangku dengan teplok dan gelas di meja"),
    (11, "pos", "duduk", "Makro", (382,525,4.22), (4,-4,.10), "Kedua jarum jam bertemu di angka dua belas"),
    (12, "sawah", "mati", "Sedang", (491,845,1.86), (-9,0,.03), "Empat jendela rumah padam, teplok di pos tetap terlihat"),
    (13, "pos", "duduk", "Makro", (541,795,4.5), (-5,0,.15), "Nyala kecil di balik kaca teplok menerangi meja"),
    (14, "pos", "duduk", "Detail", (450,808,3.85), (-22,8,-.12), "Uap gelas dan serat meja membuka suasana tenang"),
    (15, "pos", "bisik", "Dua tokoh", (415,741,2.43), (29,-10,.11), "Udin merendahkan kepala ke arah narator"),
    (16, "pos", "bisik", "Dekat", (471,720,4.2), (4,0,.11), "Wajah Udin saat bertanya tentang jumlah mereka"),
    (17, "pos", "bisik", "Dekat", (364,724,3.9), (9,-2,.10), "Narator mengangguk satu kali"),
    (18, "pos", "bisik", "Sudut pandang", (627,747,1.65), (58,-6,.15), "Pandangan meninggalkan dua tokoh dan bergerak ke ujung bangku"),
    (21, "pos", "kenal", "Sedang", (808,774,2.08), (13,-3,.14), "Orang tua, duduk dengan sarung hitam di ujung bangku"),
    (22, "pos", "kenal", "Dekat", (823,728,4.15), (3,-1,.12), "Garis wajah tua ketika kepalanya masih menunduk"),
    (23, "pos", "kenal", "Makro", (781,806,4.85), (-8,0,.13), "Tangan tua dan gelas di pangkuan"),
    (24, "pos", "kenal", "Lebar", (686,747,1.50), (22,0,-.10), "Ruang kosong di sisi tiang tempat orang asing seharusnya terlihat masuk"),
    (26, "pos", "bisik", "Dua tokoh", (491,719,1.97), (34,0,.16), "Narator mengalihkan perhatian kepada Pak Karto"),
    (27, "pos", "bisik", "Dekat", (364,725,4.45), (-3,4,.09), "Wajah narator berhenti sebelum sempat bicara"),
    (28, "pos", "pegang", "Makro", (533,815,4.26), (20,1,.21), "Jari Pak Karto merapat dan mencengkeram lengan"),
    (30, "pos", "bisik", "Dekat", (598,722,4.35), (-3,6,.10), "Pak Karto berbisik dengan garis mata tetap tertuju ke bangku"),
    (31, "pos", "bisik", "Dekat", (364,726,4.35), (6,-8,.11), "Narator kaku dan menahan napas"),
    (32, "pos", "kenal", "Dekat", (814,737,3.25), (7,-17,.50), "Kepala orang asing naik perlahan ke cahaya"),
    (33, "pos", "kenal", "Makro", (807,732,5.5), (4,3,.22), "Senyum tipis terbentuk di wajah orang asing"),
    (35, "pos", "kenal", "Dekat", (824,726,4.22), (-6,1,.08), "Tatapan orang asing bertahan sepanjang pertanyaannya"),
    (37, "pos", "padam", "Makro", (541,798,4.67), (1,-6,-.05), "Teplok padam, bentuk kaca dan meja tersisa dalam warna biru"),
    (39, "pos", "gelap", "Lebar", (499,757,1.12), (0,0,0), "Kelima warga membeku dalam cahaya bulan"),
    (40, "pos", "lucu", "Sedang", (856,784,2.33), (29,6,.12), "Kamera menunggu di ujung bangku saat tawa terdengar"),
    (42, "pos", "langkah", "Rendah", (724,965,2.6), (103,43,.04), "Jejak basah timbul satu demi satu di depan tiang"),
    (43, "pos", "nyala", "Detail", (540,805,3.76), (0,0,-.37), "Teplok menyala lagi dan memulihkan cahaya sekitar"),
    (44, "pos", "hilang", "Sedang", (817,805,2.72), (19,-6,.07), "Ujung bangku kini kosong, gelas tertinggal"),
    (45, "pos", "hitung", "Lebar", (478,761,1.14), (3,-9,.09), "Susunan kelima warga terlihat sebelum dihitung"),
    (46, "pos", "hitung", "Lajur dekat", (253,736,3.80), (459,0,0), "Kamera berpindah dari Jaya ke narator, Udin, Pak Karto, dan Roni"),
    (51, "pos", "hitung", "Lebar", (478,752,1.14), (-17,9,-.10), "Kamera kembali ke susunan utuh dan narator menarik napas"),
    (53, "pos", "tanya", "Dekat", (594,724,3.89), (8,2,.18), "Kekhawatiran tampak pada wajah Pak Karto, pandangannya menyapu bangku"),
    (56, "pos", "tanya", "Dua tokoh", (657,735,2.56), (59,-5,.20), "Pak Karto mempertanyakan orang yang baru saja pergi"),
    (58, "pos", "tanya", "Detail", (785,824,4.00), (8,3,.14), "Gelas asing tinggal di ujung bangku ketika semua diam"),
    (59, "pos", "usir", "Sedang", (585,750,2.40), (12,0,.08), "Pak Karto mengayunkan tangan ke arah jalan dan menyuruh semua pulang"),
    (60, "sawah", "lari", "Lacak", (566,1010,1.63), (-48,-119,.18), "Narator berlari mengikuti jalur tanah di antara petak sawah"),
    (61, "rumah", "tiba", "Lebar", (572,762,1.11), (47,-6,.13), "Pintu rumah muncul di ujung pelarian"),
    (62, "rumah", "ketuk", "Makro", (647,704,4.31), (-5,2,.06), "Buku jari mengenai pintu mengikuti bunyi ketukan"),
    (63, "rumah", "buka", "Sedang", (546,732,1.98), (21,0,.15), "Daun pintu terbuka dan ibu tampak di ambang"),
    (64, "rumah", "buka", "Dekat", (559,683,3.86), (-4,3,.10), "Ibu bertanya dengan kepala sedikit miring"),
    (65, "rumah", "buka", "Dekat", (395,714,3.80), (-10,-8,.08), "Narator masih terengah sambil menjawab"),
    (67, "rumah", "buka", "Dekat", (559,681,3.95), (6,5,.12), "Ibu menggeleng lalu menyebut narator sudah pulang"),
    (70, "kamar", "tidur", "Sudut pandang", (560,816,2.45), (-13,0,.23), "Kilas balik ucapan ibu memperlihatkan orang tidur di dipan"),
    (71, "rumah", "buka", "Makro", (399,718,5.25), (9,-5,.11), "Reaksi narator menahan napas di ambang rumah"),
    (73, "kamar", "celah", "Lebar", (402,698,1.19), (93,34,.22), "Kamera melintas di balik kusen mengikuti arah pandangan"),
    (75, "kamar", "celah", "Sedang", (641,771,1.90), (13,-2,.15), "Sosok duduk di tepi dipan, membelakangi pintu"),
    (77, "kamar", "celah", "Detail", (639,765,3.60), (10,4,.28), "Dua garis pudar di baju sama dengan milik narator"),
    (79, "kamar", "celah", "Dekat", (636,701,3.80), (-12,5,.37), "Sosok mulai menoleh dan profilnya muncul dari bayangan"),
    (81, "kamar", "celah", "Makro", (621,692,5.22), (-4,3,.12), "Wajah kembaran terbaca dari rambut dan profil yang sama"),
    (82, "kamar", "celah", "Makro", (618,706,5.63), (-2,0,.06), "Ujung bibir kembaran terangkat"),
    (84, "kamar", "celah", "Sedang", (595,745,2.48), (-27,11,-.17), "Kembaran berbicara ke arah ibu di luar kamar"),
    (86, "pos", "buka", "Detail", (788,820,4.03), (12,-6,-.10), "Ingatan kembali pada gelas orang asing"),
    (87, "sawah", "ingat", "Lebar", (544,917,1.22), (-16,-44,.15), "Bayangan pelari mengecil mengikuti pematang dalam ingatan yang tak utuh"),
    (89, "sawah", "sunyi", "Rendah", (623,999,1.40), (72,63,.36), "Kabut menutup pematang yang sekarang kosong"),
    (91, "pos", "gelap", "Makro", (543,789,4.8), (0,0,.19), "Teplok mati dalam bisikan terakhir, lalu gambar tenggelam"),
]

DISSOLVES = {6: .55, 70: .5, 86: .55, 87: .5, 89: .6, 91: .6}  # kilas balik/ingatan: larut lebih panjang


def plan():
    original = json.loads((SOURCE / "render_plan.json").read_text())
    cues = original["cues"]
    if len(cues) != 92 or "giliran kamu" not in cues[-1]["text"]:
        raise ValueError("Render plan sumber bukan cerita Pos Ronda dengan 92 cue.")
    cues[30]["text"] = "“Jangan diajak bicara,” bisiknya."
    beats = {i: c["start"] for i, c in enumerate(cues)}
    for i, word in {12: "padam", 17: "mengangguk", 28: "mencengkeram", 32: "mengangkat", 38: "padam",
                    43: "menyalakan", 63: "membukakan", 79: "menoleh", 82: "tersenyum"}.items():
        words = cues[i]["text"].split()
        for j, value in enumerate(words):
            if word in value.casefold() and j < len(cues[i].get("wt", [])):
                beats[i] = cues[i]["wt"][j]
                break
    starts = [0 if i == 0 else round((cues[i]["start"] - .08) * Cfg.FPS) / Cfg.FPS for i, *_ in EDIT]
    scenes = []
    for j, (row, start, end) in enumerate(zip(EDIT, starts, [*starts[1:], original["duration"]]), 1):
        i, location, action, view, lens, move, focus = row
        onset = beats[i]
        key = max(start + .45, min(end - .16, max(onset + .65, (start + end) / 2)))
        # Show the completed action in the thumbnail while the moving shot starts on the cue.
        key = min(end - .07, max(key, onset + {28: .38, 32: 2.25, 43: .60, 63: 1.5, 79: 1.28, 82: .85}.get(i, 0)))
        if i == 37:
            key = min(end-.08, beats[38]+.36)
        moments = [dict(id=f"{j}.1", t=key, focus=focus)]
        params = dict(set=location, action=action, beats=beats, walk=beats[8], run=beats[60] if i < 86 else beats[87],
                      steps=beats[42]+.65, knocks=[e["t"] for e in original["events"] if e["type"] == "ketuk_pintu"])
        scene = dict(
            template="ronda_film", seed=1953, params=params, start=start, end=end, dissolve=DISSOLVES.get(i, 0.4 if j > 1 else 0),
            lens=[lens, [a + b for a, b in zip(lens, move)]],
            shots=[dict(no=j, start=start, end=end, view=view, moments=moments)],
        )
        if i == 46:
            residents = [("Jaya", 249), ("Narator", 361), ("Udin", 478), ("Pak Karto", 602), ("Roni", 712)]
            keys = [[start, residents[0][1], 736, 3.8]]
            moments.clear()
            for k, (resident, x) in enumerate(residents):
                timestamp = max(start+.06, cues[46+k]["start"])
                keys.append([timestamp+.02, x, 736, 3.8])
                hold = cues[47+k]["start"]-.33 if k < 4 else end-.03
                keys.append([hold, x, 736, 3.8])
                moments.append(dict(id=f"{j}.{k+1}", t=(timestamp+hold)/2, focus=f"Hitungan {k+1}, {resident}"))
            scene["lensKeys"] = keys
        scenes.append(scene)
    original.update(scenes=scenes, cinematic=True, title_bar="", watermark="", actions=[], render_source="ronda_film")
    original["style"]["grade"] = dict(brightness=1.02, contrast=1.14, saturate=.74, vignette=.9, handheld=.45)  # gelap, dingin, mencekam
    return original


def storyboard_text(rplan):
    lines = [
        "# Storyboard Orang Asing di Pos Ronda", "",
        f"{len(EDIT)} shot · 1080 × 1920 · 30 fps · {rplan['duration']:.0f} detik", "",
        "Waktu mengikuti narasi yang sama. Setiap pergantian shot memakai larut gambar 0,4 detik; kilas balik dan ingatan memakai larut lebih panjang.", "",
        "| Shot | Waktu (detik) | Kamera | Aksi atau detail |",
        "| --- | --- | --- | --- |",
    ]
    for sc in rplan["scenes"]:
        shot = sc["shots"][0]
        beats = " · ".join(m["focus"] for m in shot["moments"])
        lines.append(f"| {shot['no']} | {shot['start']:.2f}–{shot['end']:.2f} | {shot['view']} | {beats} |")
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--storyboard-only", action="store_true")
    parser.add_argument("--source", help="folder job berisi render_plan.json + mix.m4a (mis. suara baru)")
    parser.add_argument("--work")
    parser.add_argument("--name")
    args = parser.parse_args()
    global SOURCE, WORK, NAME
    if args.source: SOURCE = Path(args.source).resolve()
    if args.work: WORK = Path(args.work).resolve()
    if args.name: NAME = args.name
    Cfg.FPS = 30
    Cfg.MAX_VIDEO_MB = 0
    WORK.mkdir(parents=True, exist_ok=True)
    rplan = plan()
    (WORK / "render_plan.json").write_text(json.dumps(rplan, ensure_ascii=False, indent=2))
    page = render.build_page(
        rplan, WORK / "page.html", director.load_style("horor_kampung"),
        extra_scenes=[Path(__file__).with_name("ronda_film.js")],
    )
    board = WORK / "storyboard.jpg"
    render.storyboard(page, rplan, board, WORK / "board")
    (WORK / "storyboard.md").write_text(storyboard_text(rplan))
    print(f"Storyboard tersimpan ({len(EDIT)} shot).", flush=True)
    if args.storyboard_only:
        return
    frames = WORK / "frames-final"
    render.render_frames(page, frames, rplan["duration"], progress=lambda p: print(f"Render {p:.1%}", flush=True))
    final = WORK / "final.mp4"
    render.encode(frames, SOURCE / "mix.m4a", final, rplan["duration"])
    output = ROOT / "Hasil Produksi/Horor Kampung/Orang Asing di Pos Ronda"
    for source, category, name in [
        (final, "Video", NAME + ".mp4"),
        (board, "Gambar", "storyboard_" + NAME + ".jpg"),
        (WORK / "storyboard.md", "Dokumen", "storyboard_" + NAME + ".md"),
    ]:
        shutil.copy2(source, output / category / name)
    print(final, flush=True)


if __name__ == "__main__":
    main()
