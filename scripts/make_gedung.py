"""Video edukasi 3D 'Gedung Raksasa yang Bisa Berjalan' (Indiana Bell, 1930) — template edukasi_3d/gedung.

  python scripts/make_gedung.py stills [t1,t2,...]   -> frame uji + lembar stills
  python scripts/make_gedung.py full                 -> render penuh + encode
Semua waktu dikunci ke kata di audio (cues.json + wt Whisper).
"""
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from studio import director, render  # noqa: E402

OUT = ROOT / "data/jobs/gedung-v1"
VIDEO = ROOT / "Hasil Produksi/Edukasi/Gedung Berjalan/Video/gedung_berjalan.mp4"
CUES = json.loads((OUT / "cues.json").read_text())
cues, DUR = CUES["cues"], CUES["duration"]
for _c in cues:
    _c["text"] = _c["text"].replace("*", "")


def W(i, word):
    for w, t in zip(cues[i]["text"].split(), cues[i]["wt"]):
        if w.lower().strip("*.,?!\"").startswith(word.lower()):
            return t
    raise KeyError((i, word))


def C(i):
    return cues[i]["start"]


# ---------------- timeline global ----------------
TL = {
    "beam": [[W(20, "memasang"), 0], [W(20, "menopang"), 1]],
    "jack": [[W(21, "dongkrak") - 0.3, 0], [W(21, "dongkrak") + 0.3, 1], [W(24, "bergerak"), 1], [C(25) + 0.6, 0]],
    "lift": [[W(21, "mengangkat"), 0], [W(21, "hati"), 0.5], [W(40, "akhirnya"), 0.5], [W(40, "dipindahkan") + 0.4, 0]],
    "track": [[W(23, "bawah"), 0], [W(23, "rol"), 1], [W(40, "dipindahkan"), 1], [C(41) + 0.6, 0]],
    "roller": [[W(23, "rol") - 0.2, 0], [W(24, "Baja") + 0.4, 1], [W(40, "dipindahkan"), 1], [C(41), 0]],
    "ram": [[C(25), 0], [C(25) + 0.5, 1], [C(31) + 2.5, 1], [W(31, "itu"), 0]],
    "bx": [[W(25, "perlahan"), 0], [W(31, "itu"), 16]],
    "ring": [[W(31, "menggeser"), 0], [W(32, "juga"), 1], [W(40, "dipindahkan"), 1], [C(41) + 0.6, 0]],
    "rot": [[W(32, "MEMUTARNYA") - 0.1, 0], [C(34) + 0.2, 90]],
    "cut": 0, "jitter": 0, "tilt": 0,
}
CAMS = {}
S = []


def cam(name, *keys):
    CAMS[name] = [list(k) for k in keys]
    return name


def scene(c0, label, judul, sorot, **p):
    S.append({"c0": c0, "params": dict(label=label, judul=judul, sorot=sorot, **p)})


FOOT = [[-13.4, 0.15, -9.4], [13.4, 0.15, -9.4], [13.4, 0.15, 9.4], [-13.4, 0.15, 9.4]]

# ---- 1. tantangan ----
H1 = ("TANTANGAN", "Pindahkan gedung 8 lantai?", "8 lantai")
scene(0, *H1, focus=[0, 10, 0], cam=cam("buka", [0, 0, 15, 0, 92, 46, -2, 44], [C(1), 0, 16, 0, 84, 30, 6, 42]),
      hud=[{"k": "garis", "a": [13.6, 0.3, 9.6], "b": [13.6, 31, 9.6], "t0": W(0, "delapan") - 0.1, "text": "8 lantai", "tx": 110, "ujung": 1}])
scene(1, *H1, focus=[0, 20, 0], tl={"cut": [[W(1, "ratusan"), 0], [W(1, "dalamnya"), 0.32], [C(2) - 0.3, 0.32]]},
      cam=cam("jendela", [C(1), 0, 24, 0, 58, 14, 6, 36], [C(2), 0, 25, 0, 50, 4, 7, 36]),
      hud=[{"k": "tag", "at": "bld-6,25,-4", "text": "Ratusan orang tetap kerja", "t0": W(1, "orang"), "dy": 170, "col": "#3157e8"}])
scene(2, *H1, focus=[4, 10, 0], cam=cam("tanya", [C(2), 4, 10, 0, 125, -42, 40, 36], [C(3), 4, 10, 0, 118, -22, 44, 36]),
      hud=[{"k": "ikon", "name": "tanya", "x": 540, "y": 620, "t0": W(2, "Gimana"), "t1": C(3) - 0.05}])
scene(3, *H1, focus=[0, 3, 0], rame=[C(3) - 0.2, C(4) + 0.6], tl={"jitter": [[W(3, "diangkat"), 0], [W(3, "diangkat") + 0.2, 1], [C(4) - 0.1, 1], [C(4) + 0.1, 0]]},
      cam=cam("rame", [C(3), 0, 3, 0, 48, 30, 10, 40], [C(4), 0, 4, 0, 42, 42, 12, 40]),
      hud=[{"k": "teks", "text": "HEEEP!", "x": 540, "y": 640, "t0": W(3, "rame") - 0.1, "t1": C(4) - 0.05, "size": 120, "col": "#e2452f"}])
scene(4, "BAYANGKAN", "Lemari saja sudah ribet", "ribet", lemari={"t0": W(4, "mindahin") - 0.3, "pos": [-46, 21.6]}, focus=[-44, 1, 21],
      cam=cam("lemari", [C(4), -45.6, 1.4, 21.6, 12, 16, 8, 46], [C(5), -43.8, 1.5, 21.6, 11, 6, 7, 46]),
      hud=[{"k": "teks", "text": "DUK!", "x": 700, "y": 700, "t0": W(4, "ribut") + 0.25, "t1": C(5) - 0.05, "size": 120, "col": "#3157e8"}])
scene(5, "BAYANGKAN", "Apalagi satu gedung!", "gedung!", focus=[0, 12, 0],
      cam=cam("apalagi", [C(5), 0, 15, 0, 84, -26, -3, 42], [C(6), 0, 16, 0, 78, -18, -1, 42]),
      hud=[{"k": "ikon", "name": "seru", "x": 820, "y": 560, "t0": W(5, "gedung"), "s": 0.9}])
scene(6, "TAPI...", "Percaya atau nggak", "Percaya", focus=[0, 10, 0],
      cam=cam("naik", [C(6), 0, 15, 0, 72, -18, 6, 40], [C(7) + 0.3, 6, 6, 0, 210, 0, 72, 40]))
# ---- 2. sejarah ----
H2 = ("KISAH NYATA", "Amerika, tahun 1930", "1930")
scene(7, *H2, insinyur=[-22, -4], focus=[-22, 2, -4], bayang=25,
      cam=cam("insinyur", [C(7), -22, 2, -4, 18, -112, 24, 40], [C(9), -22, 2.2, -4, 14, -134, 20, 42]),
      hud=[{"k": "badge", "text": "1930", "sub": "Indianapolis, Amerika Serikat", "t0": W(7, "Tahun"), "t1": W(8, "insinyur") - 0.2, "y": 560, "w": 640},
           {"k": "tag", "at": [-22, 4.2, -4], "text": "Para insinyur", "t0": W(8, "insinyur"), "dy": -170, "col": "#1b1b1d"},
           {"k": "ikon", "name": "seru", "x": 820, "y": 560, "t0": W(8, "gila") - 0.1, "s": 0.85}])
S[-1]["c1"] = 9
scene(9, *H2, focus=[0, 6, 9], cam=cam("papan", [C(9), 0, 7.5, 9, 32, 14, 6, 38], [C(10), 0, 7.8, 9, 26, -8, 5, 38]),
      hud=[{"k": "tag", "at": "bld0,8.1,9.2", "text": "Gedung kantor Indiana Bell", "t0": W(9, "Indiana") - 0.1, "dy": -230, "col": "#3157e8"}])
H3 = ("MASALAHNYA", "Beratnya 11.000 ton", "11.000 ton")
scene(10, *H3, focus=[0, 12, 0], cam=cam("berat", [C(10), 0, 14, 0, 96, 42, 2, 40], [C(12), 0, 15, 0, 86, 30, 4, 40]),
      hud=[{"k": "arrow", "at": "bld0,33,0", "dir": "down", "t0": W(11, "beratnya"), "len": 160},
           {"k": "badge", "text": "± 11.000 TON", "sub": "berat gedung", "t0": W(11, "sebelas") - 0.1, "y": 600, "w": 660}])
H4 = ("NGGAK MASUK AKAL", "600 karyawan tetap kerja", "600 karyawan")
scene(12, *H4, focus=[0, 15, 0], tl={"cut": [[W(13, "Sekitar"), 0], [W(13, "bekerja"), 1]]},
      cam=cam("rumahboneka", [C(12), 0, 15, 0, 84, -6, 4, 36], [C(14), 0, 15.5, 0, 78, 6, 5, 36]),
      hud=[{"k": "ikon", "name": "seru", "x": 820, "y": 520, "t0": W(12, "nggak"), "t1": C(13) + 0.3, "s": 0.8},
           {"k": "badge", "text": "± 600 karyawan", "sub": "tetap bekerja di dalam", "t0": W(13, "enam") - 0.1, "y": 470, "w": 620, "size": 72}])
scene(14, "BAYANGIN", "Lagi serius ngetik...", "ngetik", tl={"cut": 1}, focus=[-3, 9, -3],
      cam=cam("ketik", [C(14), -3, 10.2, -3.4, 10, -14, 7, 40], [C(16), -3, 10.0, -3.6, 7.5, 10, 6, 40]),
      hud=[{"k": "teks", "text": "tik tik tik", "x": 540, "y": 600, "t0": W(15, "ngetik"), "size": 64, "col": "#ffd23f"}])
S[-1]["c1"] = 16
scene(16, "BAYANGIN", "Kantornya jalan-jalan!", "jalan-jalan!", camRel="x", focus=[2, 10, 0],
      tl={"bx": [[W(16, "ternyata"), 0], [C(17) - 0.2, 5]], "jitter": [[W(16, "ternyata"), 0], [W(16, "ternyata") + 0.2, 0.6]]},
      cam=cam("jalan", [C(16), 0, 12, 0, 74, 28, 9, 38], [C(17), 0, 12, 0, 70, 44, 11, 38]),
      hud=[{"k": "teks", "text": "JALAN-JALAN?!", "x": 540, "y": 600, "t0": W(16, "jalan") - 0.1, "t1": C(17) - 0.05, "size": 92, "col": "#e2452f"}])
scene(17, "PERTANYAANNYA", "Digeser tanpa roboh?", "roboh?", focus=[0, 12, 0],
      tl={"tilt": [[W(17, "tanpa"), 0], [W(17, "roboh") + 0.1, 3.5], [C(18) - 0.15, 0]]},
      cam=cam("roboh", [C(17), 0, 14, 0, 96, 72, 5, 40], [C(18), 0, 14, 0, 90, 80, 6, 40]),
      hud=[{"k": "ikon", "name": "tanya", "x": 820, "y": 560, "t0": W(17, "roboh") - 0.1, "s": 0.9}])
# ---- 3. caranya ----
H5 = ("TRIKNYA", "Trik para insinyur", "Trik")
scene(18, *H5, insinyur=[-22, -4], focus=[-22, 2, -4], bayang=25,
      cam=cam("ide", [C(18), -22, 2.2, -4, 20, -150, 28, 40], [C(20), -22, 2.4, -4, 16, -126, 22, 42]),
      hud=[{"k": "icon", "name": "ide", "x": 540, "y": 600, "t0": W(19, "trik") - 0.1, "s": 1.0}])
S[-1]["c1"] = 20
H6 = ("LANGKAH 1", "Pasang struktur baja", "baja")
scene(20, *H6, pekerjaBaja=[C(20), C(25)], focus=[0, 1, 10], bayang=20,
      cam=cam("baja", [C(20), 2, 1.2, 10, 27, 36, 12, 40], [C(21), 0, 1.0, 10, 22, 20, 10, 40]),
      hud=[{"k": "tag", "at": "bld6,0.7,11.6", "text": "Balok baja penopang", "t0": W(20, "baja") - 0.1, "dy": -190, "dx": 40, "col": "#c0452e"}])
H7 = ("LANGKAH 2", "Diangkat dongkrak", "dongkrak")
scene(21, *H7, pekerjaBaja=[C(20), C(25)], focus=[0, 1, 10], bayang=15,
      cam=cam("dongkrak", [C(21), 0, 0.9, 10.4, 10, 34, 10, 40], [C(22), 0, 1.1, 10.4, 10.5, 16, 8, 40]),
      hud=[{"k": "tag", "at": [0, 0.6, 10.4], "text": "Dongkrak", "t0": W(21, "dongkrak") - 0.1, "dy": 200, "col": "#d97706"},
           {"k": "arrow", "at": "bld0,1.8,9.6", "dir": "up", "t0": W(21, "mengangkat"), "text": "+50 cm", "len": 130}])
H8 = ("LANGKAH 3", "Rel & rol baja", "rol")
scene(22, *H8, focus=[-4, 0.6, 10], bayang=20,
      cam=cam("rol", [C(22), -6, 0.7, 10, 17, 62, 7, 40], [C(25), -4, 0.7, 10, 14, 78, 6, 40]),
      hud=[{"k": "tag", "at": [-15, 0.3, 10], "text": "Rel baja", "t0": W(23, "dipasang"), "dy": -150, "dx": -30, "col": "#1b1b1d"},
           {"k": "tag", "at": "bld-6,0.05,10", "text": "Rol baja", "t0": W(23, "rol"), "dy": 170, "col": "#3157e8"},
           {"k": "tag", "at": "bld3,0.7,11.6", "text": "Penopang", "t0": W(24, "penopang"), "dy": -180, "dx": 40, "col": "#c0452e"}])
S[-1]["c1"] = 25
H9 = ("LANGKAH 4", "Gedung mulai bergeser", "bergeser")
scene(25, *H9, focus=[8, 10, 0], bayang=50,
      cam=cam("geser", [C(25), 4, 12, 0, 104, -42, 15, 38], [C(27), 9, 12, 0, 94, -28, 17, 38]),
      hud=[{"k": "tag", "at": "bld-13,1,0", "text": "Pendorong hidrolik", "t0": W(25, "perlahan"), "dy": -160, "dx": -40, "col": "#d97706"},
           {"k": "teks", "text": "→ bergeser", "x": 540, "y": 560, "t0": W(26, "bergeser") - 0.1, "size": 76, "col": "#ffd23f"}])
S[-1]["c1"] = 27
scene(27, *H9, ngebut=W(27, "mobil") - 2.77, focus=[8, 6, 18],
      cam=cam("mobil", [C(27), 6, 5, 16, 42, 14, 8, 40], [C(28), 7, 5.5, 16, 38, 6, 8, 40]),
      hud=[{"k": "teks", "text": "WUSSH!", "x": 640, "y": 1040, "t0": W(27, "mobil") - 0.3, "t1": C(28) - 0.05, "size": 100, "col": "#e2452f"}])
scene(28, *H9, camRel="x", focus=[0, 1, 10], bayang=15,
      cam=cam("pelan", [C(28), -13, 1.2, 10, 15, 68, 10, 40], [C(29), -12, 1.2, 10, 13, 52, 10, 40]),
      hud=[{"k": "badge", "text": "38 cm / jam", "sub": "lebih lambat dari jalan kaki", "t0": W(28, "tiga") - 0.1, "y": 560, "w": 640},
           {"k": "ikon", "name": "jam", "x": 860, "y": 820, "t0": W(28, "jam") - 0.1, "s": 0.7}])
scene(29, *H9, siput=[C(29) - 0.3, 6, 15.2], focus=[9, 1, 15], bayang=12,
      cam=cam("siput", [C(29), 7.5, 1.0, 15.2, 10, 24, 12, 42], [C(30), 10, 1.2, 15.2, 11, 34, 14, 42]),
      hud=[{"k": "icon", "name": "siput", "x": 820, "y": 560, "t0": W(29, "merayap") - 0.1, "s": 0.85}])
# ---- 4. memutar ----
H10 = ("TUNGGU DULU", "Diputar 90 derajat!", "90 derajat!")
cam("putar", [C(30), 10, 4, 0, 120, 10, 70, 38], [C(32), 15, 4, 0, 112, 18, 68, 38], [C(34), 16, 4, 0, 104, 30, 64, 38])
scene(30, *H10, focus=[12, 0, 0], bayang=50, cam="putar",
      hud=[{"k": "ikon", "name": "seru", "x": 820, "y": 520, "t0": W(30, "tunggu"), "t1": C(31) + 0.4, "s": 0.85},
           {"k": "kotak", "pts": FOOT, "t0": W(31, "menggeser"), "t1": C(32) + 0.2}])
scene(32, *H10, focus=[16, 0, 0], bayang=50, cam="putar", sambung=1,
      hud=[{"k": "icon", "name": "putar", "x": 820, "y": 560, "t0": W(32, "MEMUTARNYA") - 0.1, "s": 1.0},
           {"k": "badge", "text": "90°", "sub": "diputar sambil digeser", "t0": W(32, "DERAJAT") - 0.1, "t1": C(34), "y": 1120, "w": 460, "size": 96}])
S[-1]["c1"] = 34
H11 = ("PALING MENGEJUTKAN", "Kantor tetap bekerja", "tetap bekerja")
scene(34, *H11, tl={"cut": 1}, camRel="br", focus=[16, 15, 0],
      cam=cam("dalam", [C(34), 0, 15, 0, 82, -8, 4, 36], [C(35), 0, 15.5, 0, 76, 4, 5, 36]),
      hud=[{"k": "ikon", "name": "centang", "x": 820, "y": 520, "t0": W(34, "tetap") - 0.1, "s": 0.85}])
scene(35, "UTILITAS", "Listrik, air, telepon aman", "Listrik,air,telepon", focus=[-8, 6, 10], bayang=40,
      cam=cam("utilitas", [C(35), -10, 7, 10, 58, -38, 16, 40], [C(36), -8, 7, 10, 52, -24, 15, 40]),
      hud=[{"k": "tag", "at": [-24, 11.3, 18], "text": "Listrik", "t0": W(35, "Listrik"), "dy": -150, "col": "#d97706"},
           {"k": "tag", "at": [-21, 1, 14], "text": "Air", "t0": W(35, "air"), "dy": 160, "col": "#1d6fb8"},
           {"k": "tag", "at": [-30, 11.3, 4], "text": "Telepon", "t0": W(35, "telepon"), "dy": -150, "dx": -30, "col": "#16a34a"},
           {"k": "ikon", "name": "centang", "x": 820, "y": 520, "t0": W(35, "terputus") - 0.1, "s": 0.8}])
# ---- 5. hasil ----
H12 = ("JADI BAYANGIN", "Kantormu pindah sendiri", "pindah")
scene(36, *H12, komuter={"t0": C(36), "x0": -6, "stop": 0, "z": 21.6}, focus=[-3, 2, 21],
      cam=cam("komuter", [C(36), -5.5, 1.6, 21.6, 9, -58, 6, 42], [C(38), -1.5, 1.8, 21.6, 10, -30, 8, 42]))
S[-1]["c1"] = 38
scene(38, *H12, komuter={"t0": C(36), "x0": -6, "stop": 0, "z": 21.6}, focus=[6, 4, 6],
      cam=cam("lho", [C(38), -1.0, 1.5, 18.5, 8.5, -4, 12, 46], [W(38, "pindah"), -0.3, 1.6, 18, 9, 0, 12, 46], [C(39), 1, 3, 11, 18, 8, 12, 46]),
      hud=[{"k": "teks", "text": "LHO?!", "x": 300, "y": 620, "t0": W(38, "pindah") - 0.1, "t1": C(39) - 0.05, "size": 110, "col": "#e2452f"},
           {"k": "kotak", "pts": FOOT, "t0": W(38, "posisi") - 0.2, "t1": C(39) - 0.05}])
H13 = ("SEKITAR SEBULAN", "Berhasil dipindahkan", "Berhasil")
scene(39, *H13, hari=[W(39, "proses"), C(40)], focus=[10, 8, 0], bayang=60,
      cam=cam("bulan", [C(39), 10, 8, 0, 150, -62, 44, 36], [C(40), 12, 8, 0, 140, -30, 40, 36]),
      hud=[{"k": "icon", "name": "kalender", "x": 820, "y": 560, "t0": W(39, "satu") - 0.1, "s": 0.9}])
scene(40, *H13, focus=[16, 12, 0], bayang=50,
      cam=cam("baru", [C(40), 16, 14, 0, 88, 74, 6, 40], [C(41), 16, 14, 0, 82, 62, 7, 40]),
      hud=[{"k": "ikon", "name": "centang", "x": 820, "y": 520, "t0": W(40, "berhasil"), "s": 0.85},
           {"k": "kotak", "pts": FOOT, "t0": W(40, "dipindahkan") - 0.2},
           {"k": "tag", "at": [-13.4, 0.2, 0], "text": "Posisi lama", "t0": W(40, "dipindahkan"), "dy": -150, "col": "#1b1b1d"}])
H14 = ("TANPA", "Tanpa dibongkar", "dibongkar")
scene(41, *H14, hantu=[C(41), C(42) - 0.05], focus=[18, 12, 0], bayang=50,
      cam=cam("bongkar", [C(41), 18, 14, 0, 92, 40, 10, 40], [C(42), 18, 14, 0, 88, 30, 11, 40]),
      hud=[{"k": "ikon", "name": "larangan", "x": 540, "y": 620, "t0": W(41, "dibongkar") - 0.1, "t1": C(42) - 0.05, "s": 1.1}])
scene(42, "TANPA", "Kantor tetap buka", "tetap buka", tl={"cut": [[C(42), 0.3], [W(42, "menghentikan"), 1]]}, camRel="br", focus=[16, 15, 0],
      cam=cam("tetapbuka", [C(42), 0, 15, 0, 80, 6, 4, 36], [C(43), 0, 15, 0, 74, -4, 5, 36]),
      hud=[{"k": "ikon", "name": "centang", "x": 820, "y": 520, "t0": W(42, "aktivitas") - 0.1, "s": 0.85}])
# ---- 6. punchline ----
H15 = ("SUATU HARI", "Kantor kita mau pindah!", "pindah!")
scene(43, *H15, tl={"cut": 1}, camRel="br", bos=[W(43, "bilang") - 0.2, C(45)], focus=[16, 9, 0], bayang=15,
      cam=cam("bos", [C(43), -3.3, 9.6, -1.8, 12, -10, 5, 40], [C(45), -3.3, 9.8, -2.0, 9.5, 6, 5, 40]),
      hud=[{"k": "tag", "at": "bld-3.6,11.4,-1", "text": "“Kantor kita mau pindah!”", "t0": W(44, "Kantor") - 0.1, "dy": -120, "col": "#3157e8"}])
S[-1]["c1"] = 45
scene(45, "COBA TANYA", "Orangnya atau gedungnya?", "gedungnya?", tl={"cut": [[C(47) + 1.0, 1], [DUR - 0.1, 0]]}, camRel="br", bos=[C(45), C(46)], focus=[16, 9, 0], bayang=50,
      cam=cam("akhir", [C(45), -3, 9.6, -3.4, 10, 12, 6, 40], [C(47), -3, 9.8, -3.6, 9, -6, 6, 40], [C(47) + 0.75, -2.5, 9.8, -3.4, 26, -2, 2, 40], [DUR, 0, 14, 0, 96, -24, 8, 38]),
      hud=[{"k": "tag", "at": "bld-3,11.2,-4.3", "text": "“Pak, orangnya yang pindah...”", "t0": W(46, "Pak") - 0.1, "t1": C(47) + 0.2, "dy": -130, "col": "#1b1b1d"},
           {"k": "tag", "at": "bld-3,11.2,-4.3", "text": "“...atau sekalian gedungnya?”", "t0": W(47, "Atau") - 0.1, "dy": -130, "col": "#e2452f"}])


def rplan():
    scenes = []
    for j, sc in enumerate(S):
        st = C(sc["c0"]) if j else 0.0
        en = C(S[j + 1]["c0"]) if j + 1 < len(S) else DUR
        p = dict(sc["params"])
        sam = p.pop("sambung", 0)
        scenes.append({"template": "gedung", "start": round(st, 3), "end": round(en, 3), "params": p,
                       "sambung": bool(sam), "transisi": 0.45, "camera": {"gerak": "tetap"}})
    return {"duration": DUR, "seed": 11, "title_bar": "", "watermark": "", "style": "edukasi_3d",
            "scenes": scenes, "cues": cues, "events": [], "tl": TL, "cams": CAMS}


def build():
    rp = rplan()
    (OUT / "render_plan.json").write_text(json.dumps(rp, ensure_ascii=False, indent=1))
    html = OUT / "page.html"
    render.build_page(rp, html, director.load_style("edukasi_3d"))
    return rp, html


def stills(times):
    rp, html = build()
    d = OUT / "stills"
    if d.exists():
        shutil.rmtree(d)
    d.mkdir()
    r = subprocess.run(render._worker_cmd(html, d, ["--times", ",".join(f"{t:.3f}" for t in times), "--prefix", "st"]),
                       cwd=str(ROOT), capture_output=True, text=True)
    if r.returncode:
        print(r.stdout[-2000:], r.stderr[-3000:])
        raise SystemExit(1)
    return sorted(d.glob("st*.jpg"))


def groups(files, times, per=12):
    from PIL import Image, ImageDraw
    outs = []
    for g in range(0, len(files), per):
        im = Image.new("RGB", (6 * 360, 2 * 662), "#111")
        dr = ImageDraw.Draw(im)
        for i, (f, t) in enumerate(zip(files[g:g + per], times[g:g + per])):
            x, y = (i % 6) * 360, (i // 6) * 662
            im.paste(Image.open(f).resize((360, 640)), (x, y))
            dr.text((x + 6, y + 644), f"{t:.2f}s", fill="white")
        o = OUT / f"grp{g // per}.jpg"
        im.save(o, quality=85)
        outs.append(o)
    return outs


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "stills"
    if mode == "stills":
        rp, _ = build()
        times = [float(x) for x in sys.argv[2].split(",")] if len(sys.argv) > 2 else \
            [round(s["start"] + (s["end"] - s["start"]) * k, 2) for s in rp["scenes"] for k in (0.35, 0.85)]
        fs = stills(times)
        print(*groups(fs, times), len(rp["scenes"]), "adegan")
    elif mode == "full":
        rp, html = build()
        fr = OUT / "frames"
        if fr.exists():
            shutil.rmtree(fr)
        render.render_frames(html, fr, DUR, lambda p: print(f"render {p:.0%}", flush=True))
        render.encode(fr, OUT / "input.mp3", VIDEO, DUR)
        print("OK", VIDEO)
