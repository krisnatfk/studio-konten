"""Video edukasi 3D 'Cara kerja pintu air Terusan Panama' (template edukasi_3d/terusan).

Pemakaian:
  python scripts/make_terusan_v2.py stills [t1,t2,...]   -> render beberapa frame untuk diperiksa
  python scripts/make_terusan_v2.py full                 -> render penuh + encode MP4 + storyboard
Semua waktu dikunci ke kata di audio (cues.json + wt dari Whisper).
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
from studio.config import Cfg  # noqa: E402

OUT = ROOT / "data/jobs/panama-v2"
AUDIO = Path("/home/ai-center/Downloads/ElevenLabs_2026-11-19T10_15_15_Finn - Expressive & Ads Indonesian_pvc_s50_sim75_v4.mp3")
CUES = json.loads((OUT / "cues.json").read_text())
cues, DUR = CUES["cues"], CUES["duration"]

for _c in cues:
    _c["text"] = _c["text"].replace("*", "")  # penanda markdown naskah, jangan tampil


def W(i, word):
    """Waktu mulai kata (awalan) di cue i."""
    for w, t in zip(cues[i]["text"].split(), cues[i]["wt"]):
        if w.lower().strip("*.,?!").startswith(word.lower()):
            return t
    raise KeyError((i, word))


def C(i):
    return cues[i]["start"]


# ---------------- timeline keadaan dunia (detik absolut) ----------------
TL = {
    "x": [[33.7, -80], [38.9, -40], [42.9, -40], [46.9, 0], [88.4, 0], [91.8, 38]],
    "g0": [[41.0, 0], [42.7, 1], [52.4, 1], [53.9, 0]],
    "g1": [[86.6, 0], [88.3, 1]],
    "front": [[54.5, 0], [57.6, 1]],
    "vin": [[59.5, 0], [60.3, 1], [85.2, 1], [86.0, 0]],
    "lv0": [[60.0, 0], [66.0, 1.5], [71.0, 3.2], [76.0, 4.3], [83.9, 5]],
    "lv1": 5, "lv2": 10,
}

# ---------------- kamera: [t, tx, ty, tz, jarak, yaw, pitch, fov] ----------------
CAMS = {}


def cam(name, *keys):
    CAMS[name] = [list(k) for k in keys]
    return name


S = []  # adegan


def scene(c0, label, judul, sorot, **p):
    S.append({"c0": c0, "params": dict(label=label, judul=judul, sorot=sorot, **p)})


H1 = ("TANTANGAN", "Angkat kapal puluhan ribu ton?", "kapal")
# 1. kapal di laut lepas — kamera rendah dari buritan, naik memperlihatkan kapal utuh
scene(0, *H1, set="laut", laju=3, x0=-10, camRel="x", focus=[0, 0, 0], bayang=50,
      cam=cam("laut", [0, 4, 2, 0, 40, 58, 3, 40], [2.2, 3, 2.5, 0, 48, 42, 10, 38], [4.3, 2, 3, 0, 58, 26, 19, 36]),
      hud=[{"k": "badge", "text": "± 50.000 TON", "sub": "berat kapal + muatan", "t0": W(0, "puluhan"), "t1": C(1) + 0.1, "y": 600, "w": 640}])
# 2. crane pelabuhan: kait turun, lalu dilarang
scene(1, *H1, set="laut", laju=0, x0=0, dermaga=1, crane=[4.4, 5.3, W(1, "dilarang") + 0.1], focus=[0, 6, 0], bayang=50,
      cam=cam("crane", [C(1), 2, 8, 0, 64, 28, 10, 40], [C(2), 0, 10, 0, 54, 40, 17, 40]),
      hud=[{"k": "ikon", "name": "larangan", "x": 540, "y": 640, "t0": W(1, "dilarang"), "s": 1.15},
           {"k": "tag", "at": [0, 22, -1.4], "text": "Crane / mesin pengangkat", "t0": W(1, "mesin") - 0.2, "dy": 150, "dx": 60, "col": "#d9342b"}])
# 3. pekerja berpikir di dermaga (over-shoulder)
scene(2, *H1, set="laut", laju=0, x0=0, dermaga=1, orang=[5, -8.4, "pikir", 0], focus=[0, 3, -4], bayang=40,
      cam=cam("pikir", [C(2), 0, 5, 0, 14, 145, 3, 46], [C(3), 0, 6, 0, 16, 162, 12, 44]),
      hud=[{"k": "ikon", "name": "tanya", "x": 760, "y": 600, "t0": W(2, "Gimana"), "s": 1.0}])
# 4. sudut rendah: lambung kapal menjulang -> mustahil
scene(3, *H1, set="laut", laju=0, x0=0, dermaga=1, focus=[0, 3, 0], bayang=40,
      cam=cam("mustahil", [C(3), 2, 5.5, 0, 11.5, -12, -26, 66], [C(4), 2, 6.5, 0, 10.5, 8, -31, 68]),
      hud=[{"k": "bunyi", "text": "MUSTAHIL?", "x": 540, "y": 780, "t0": W(3, "mustahil") + 0.1, "col": "#e2452f"}])
# 5. "tapi ternyata" — kamera melesat ke langit
scene(4, "TAPI...", "Ternyata ada caranya", "caranya", set="laut", laju=0, x0=0, dermaga=1, focus=[0, 3, 0],
      cam=cam("langit", [C(4), 2, 4, 0, 34, -10, 24, 40], [C(5) + 0.2, 0, 4, 0, 150, 0, 86, 40]))
H2 = ("LOKASI", "Terusan Panama", "Panama")
scene(5, *H2, set="peta", garis=[W(5, "sebuah"), W(5, "Panama") + 0.3], pin=W(5, "Terusan"), focus=[0, 0, 0], bayang=80, kabut=[300, 900],
      cam=cam("peta", [C(5), 2, 3, 2, 190, 0, 88, 36], [C(6), 2, 3, 4, 125, 12, 60, 36]),
      hud=[{"k": "tag", "at": [-6, 1, 34], "text": "Samudra Pasifik", "t0": W(5, "sebuah"), "dy": 90, "col": "#1d6fb8"},
           {"k": "tag", "at": [8, 1, -26], "text": "Laut Karibia (Atlantik)", "t0": W(5, "tempat"), "dy": 80, "col": "#1d6fb8"},
           {"k": "tag", "at": [2, 12, 2], "text": "TERUSAN PANAMA", "t0": W(5, "Terusan") + 0.4, "dy": -140, "dx": 40, "col": "#e2452f"}])
# 7-8. konsep lift: potongan, air naik lalu turun (time-lapse)
H3 = ("KONSEP", "Kapal naik-turun seperti lift", "lift")
LIFT_TL = {"x": 0, "front": 1, "lv1": 5, "lv0": [[16.6, 0], [18.6, 5], [19.2, 5], [21.3, 0]],
           "vin": [[16.4, 0], [16.6, 1], [18.5, 1], [18.7, 0]], "vout": [[18.9, 0], [19.1, 1], [21.3, 1], [21.5, 0]]}
cam("lift", [C(6), 2, 0, 0, 76, -44, 10, 34], [C(8), 2, 1, 0, 66, -30, 8, 34])
scene(6, *H3, tl=LIFT_TL, cam="lift", focus=[0, 0, 0],
      hud=[{"k": "arrow", "at": "ship2,10,0", "dir": "up", "t0": W(6, "naik"), "t1": W(6, "turun") - 0.05, "text": "NAIK"},
           {"k": "arrow", "at": "ship2,10,0", "dir": "down", "t0": W(6, "turun"), "t1": C(8) - 0.1, "text": "TURUN"}])
scene(7, *H3, tl=LIFT_TL, cam="lift", focus=[0, 0, 0], sambung=1,
      hud=[{"k": "icon", "name": "lift", "x": 830, "y": 560, "t0": W(7, "lift") - 0.1, "t1": C(8)}])
# 9-11. tanpa tali / mesin -> rahasia ada pada air (satu gerak kamera panjang)
H4 = ("ANEHNYA", "Tanpa tali, tanpa mesin", "tali,mesin")
T9 = {"x": 0, "front": 0, "lv0": [[21.6, 1], [27.5, 3.5]], "lv1": 5}
cam("aneh", [C(8), 2, 3, 0, 80, -45, 32, 34], [C(10), 2, 3, 0, 86, 5, 36, 34], [W(10, "caranya"), -8, 4, 0, 40, -50, 40, 36],
    [W(11, "rahasianya"), -13.5, 3.5, 0, 17, 15, 48, 42], [C(12) - 0.2, -13.5, 3.5, 0, 13, 8, 54, 44])
scene(8, *H4, tl=T9, cam="aneh", focus=[2, 0, 0], hantu=[W(9, "diangkat"), C(10) - 0.2], tali=W(9, "tali") - 0.15,
      hud=[{"k": "ikon", "name": "silang", "x": 300, "y": 760, "t0": W(9, "tali"), "t1": C(10) - 0.2, "s": 0.8},
           {"k": "ikon", "name": "silang", "x": 760, "y": 560, "t0": W(9, "mesin"), "t1": C(10) - 0.2, "s": 0.8}])
H5 = ("RAHASIANYA", "Kuncinya ada pada air", "air")
T10 = {"x": 0, "front": 0, "lv0": 3.5, "lv1": 5, "glow": [[W(11, "rahasianya"), 0], [W(11, "rahasianya") + 0.5, 1], [C(12) - 0.3, 1]]}
scene(10, *H5, tl=T10, cam="aneh", focus=[0, 0, 0], sambung=1,
      hud=[{"k": "ikon", "name": "tanya", "x": 540, "y": 640, "t0": W(10, "bagaimana"), "t1": C(11) + 0.3}])
scene(11, *H5, tl=T10, cam="aneh", focus=[-6, 0, 0], sambung=1,
      hud=[{"k": "ikon", "name": "air", "x": 540, "y": 620, "t0": W(11, "air") - 0.1, "s": 1.25}])
# 12-15. kapal datang, gerbang baja, gerbang terbuka
H6 = ("LANGKAH 1", "Gerbang baja dibuka", "Gerbang")
cam("datang", [C(12), -4, 3, 0, 42, -125, 16, 40], [C(13), 2, 4, 0, 46, -75, 20, 38], [C(14), 21, 4, 0, 34, -78, 17, 40])
scene(12, *H6, cam="datang", camRel="x", focus=[-50, 0, 0], bayang=50)
scene(13, *H6, cam="datang", camRel="x", focus=[-40, 0, 0], bayang=50, sambung=1,
      hud=[{"k": "teks", "text": "EH?!", "x": 760, "y": 640, "t0": W(13, "Tiba") + 0.2, "t1": C(14) - 0.05, "size": 120, "col": "#e2452f"}])
scene(14, *H6, focus=[-20, 0, 0], sambung=1, camRel="x",
      cam=cam("gerbang", [C(14), 21, 4, 0, 34, -78, 17, 40], [W(14, "raksasa"), 21, 5.5, 0, 26, -70, 10, 44], [C(15), 21, 6, 0, 24, -66, 9, 46]),
      hud=[{"k": "tag", "at": [-17.3, 6.3, -2], "text": "Gerbang baja raksasa", "t0": W(14, "gerbang"), "t1": W(14, "raksasa") - 0.1, "dy": -170, "dx": 80, "col": "#3157e8"},
           {"k": "badge", "text": "± 25 m", "sub": "tinggi daun gerbang", "t0": W(14, "raksasa") - 0.1, "y": 560, "w": 520, "size": 84}])
scene(15, *H6, focus=[-17, 0, 0],
      cam=cam("atas", [C(15), -17, 0, 0, 50, -90, 84, 40], [C(16), -15, 0, 0, 44, -72, 80, 40]),
      hud=[{"k": "tag", "at": [-15, 8, 3.6], "text": "Daun gerbang berayun", "t0": W(15, "terbuka") - 0.4, "dy": -160, "dx": 60}])
# 16-17. masuk ruang panjang (lock)
H7 = ("LANGKAH 2", "Kapal masuk ruang lock", "lock")
scene(16, *H7, cam=cam("masuk", [C(16), 0, 2, 0, 52, -30, 26, 38], [W(16, "ruangan"), 4, 2, 0, 60, -40, 32, 38], [C(17), 8, 0, 0, 76, -50, 40, 36]),
      camRel="x", focus=[-10, 0, 0], bayang=50,
      hud=[{"k": "tag", "at": "lv06,0,3", "text": "Ruang berisi air", "t0": W(16, "dipenuhi") - 0.1, "dy": -150, "col": "#1d6fb8"}])
CH_TOP = [[-17, 7.8, -4], [21, 7.8, -4], [21, 7.8, 4], [-17, 7.8, 4]]
scene(17, *H7, focus=[2, 0, 0], bayang=50,
      cam=cam("lock", [C(17), 2, 0, 0, 100, -60, 48, 34], [C(18), 2, 0, 0, 92, -46, 44, 34]),
      hud=[{"k": "kotak", "pts": CH_TOP, "t0": W(17, "lock") - 0.3},
           {"k": "tag", "at": [2, 7.8, 4], "text": "LOCK = PINTU AIR", "t0": W(17, "lock"), "dy": 220, "col": "#3157e8"},
           {"k": "garis", "a": [-17, 9, -6], "b": [21, 9, -6], "t0": W(17, "pintu"), "text": "± 300 m (aslinya)", "ty": -40}])
# 18-19. kapal berhenti, gerbang belakang ditutup
H8 = ("LANGKAH 3", "Gerbang belakang ditutup", "ditutup")
scene(18, *H8, focus=[2, 6, -4], bayang=40,
      cam=cam("berhenti", [C(18), 2, 1, 0, 42, 160, 62, 40], [C(19), 0, 1, 0, 38, 176, 58, 40]),
      hud=[{"k": "tag", "at": "ship0,5,0", "text": "Kapal berhenti di dalam", "t0": W(18, "berada"), "dy": -200}])
scene(19, *H8, focus=[-18, 0, 0],
      cam=cam("tutup", [C(19), -18, 3, 0, 40, -97, 18, 42], [C(20), -18, 3, 0, 34, -80, 16, 42]),
      hud=[{"k": "bunyi", "text": "KLANG!", "x": 540, "y": 760, "t0": W(19, "rapat") + 0.05, "col": "#3157e8"}])
# 20-23. potongan: air dari tempat lebih tinggi lewat saluran khusus
H9 = ("LANGKAH 4", "Air dialirkan masuk", "Air")
scene(20, "BAGIAN TERBAIK", "Lihat ke dalam!", "dalam", focus=[2, -4, 0], bayang=50,
      cam=cam("potong", [C(20), 2, -2, 0, 94, -20, 9, 36], [C(21), 6, -3, 0, 86, -12, 6, 36]),
      hud=[{"k": "tag", "at": [-4, -14, 4.2], "text": "Tampak potongan", "t0": W(20, "menariknya"), "dy": 150, "col": "#3157e8"}])
scene(21, *H9, focus=[14, -4, 0], bayang=40,
      cam=cam("saluran", [C(21), 20, 0, 0, 54, -10, 6, 36], [W(21, "dialirkan") - 0.3, 18, -4, 0, 48, -7, 4, 36],
              [W(21, "saluran"), 6, -7, 0, 46, -4, 2, 36], [C(22), 2, -7, 0, 44, 0, 2, 36]),
      hud=[{"k": "tag", "at": "lv126,0,4", "text": "Air lebih tinggi", "t0": W(21, "tinggi") - 0.2, "dy": -160, "col": "#1d6fb8"},
           {"k": "tag", "at": [20.5, -9.6, 4.3], "text": "Katup dibuka", "t0": W(21, "dialirkan"), "dy": 170, "dx": 60, "col": "#d97706"},
           {"k": "tag", "at": [0, -11, 4.3], "text": "Saluran khusus", "t0": W(21, "saluran"), "dy": 180, "col": "#1b1b1d"}])
scene(22, *H9, focus=[0, -6, 0], bayang=30,
      cam=cam("lubang", [C(22), 0, -7, 0, 30, 8, 12, 38], [C(23), -2, -6, 0, 27, -2, 10, 38]),
      hud=[{"k": "arrow", "at": [-6, -5.5, 4.3], "dir": "up", "t0": W(22, "Perlahan") + 0.1, "col": "#2f8fd8", "len": 130},
           {"k": "arrow", "at": [6, -5.5, 4.3], "dir": "up", "t0": W(22, "Perlahan") + 0.3, "col": "#2f8fd8", "len": 130}])
scene(23, *H9, focus=[-12, 0, 0], bayang=30,
      cam=cam("mistar", [C(23), -12, 0, 0, 25, -10, 5, 38], [C(24), -11, 2, 0, 23, -4, 5, 38]),
      hud=[{"k": "meter", "t0": W(23, "Permukaan"), "x": 880, "y": 470},
           {"k": "arrow", "at": "lv0-9,0.4,4", "dir": "up", "t0": W(23, "naik"), "col": "#2f8fd8", "text": "NAIK"}])
# 24-28. hukum apung: kapal ikut terangkat, tanpa crane, tanpa tali, tak menyentuh dasar
H10 = ("KARENA MENGAPUNG", "Kapal ikut terangkat", "terangkat")
scene(24, *H10, focus=[0, -2, 0], bayang=30,
      cam=cam("apung", [C(24), 1, -1, 0, 44, -8, 3, 38], [C(25), 2, 0, 0, 40, 4, 4, 38]),
      hud=[{"k": "arrow", "at": "ship-6,-0.6,4.5", "dir": "up", "t0": W(24, "mengapung"), "col": "#2fb85a", "len": 120},
           {"k": "arrow", "at": "ship0,-0.6,4.5", "dir": "up", "t0": W(24, "mengapung") + 0.15, "col": "#2fb85a", "len": 140, "text": "Gaya apung"},
           {"k": "arrow", "at": "ship6,-0.6,4.5", "dir": "up", "t0": W(24, "mengapung") + 0.3, "col": "#2fb85a", "len": 120}])
scene(25, *H10, focus=[2, 0, 0], bayang=40,
      cam=cam("angkat", [C(25), 2, 1, 0, 72, -26, 9, 34], [C(26), 2, 4, 0, 66, -16, 11, 34]),
      hud=[{"k": "meter", "t0": C(25), "x": 880, "y": 470},
           {"k": "arrow", "at": "ship2,9.5,0", "dir": "up", "t0": W(25, "terangkat"), "text": "TERANGKAT", "len": 170}])
cam("hantu2", [C(26), 2, 7, 0, 66, -34, 22, 36], [C(28), 2, 8, 0, 60, -20, 20, 36])
scene(26, *H10, focus=[2, 4, 0], cam="hantu2", hantu=[C(26) + 0.05, C(28) - 0.1], tali=W(27, "ditarik") - 0.2,
      hud=[{"k": "ikon", "name": "silang", "x": 540, "y": 560, "t0": W(26, "crane"), "t1": C(27) - 0.05, "s": 1.0}])
scene(27, *H10, focus=[2, 4, 0], cam="hantu2", hantu=[C(26) + 0.05, C(28) - 0.1], tali=W(27, "ditarik") - 0.2, sambung=1,
      hud=[{"k": "ikon", "name": "silang", "x": 540, "y": 560, "t0": W(27, "ditarik"), "t1": C(28) - 0.05, "s": 1.0}])
scene(28, *H10, focus=[0, -5, 0], bayang=30,
      cam=cam("dasar", [C(28), -2, 0, 0, 34, -16, 4, 40], [C(29), -3, -0.5, 0, 31, -6, 4, 40]),
      hud=[{"k": "garis", "a": "ship-4,0,4.6", "b": [-4, -7, 4.6], "t0": W(28, "menyentuh") - 0.2, "text": "Tidak menyentuh dasar", "tx": 0, "ty": 20, "ujung": 1, "size": 38}])
# 29-31. tunggu dulu -> air sama tinggi
H11 = ("LANGKAH 5", "Tunggu air sama tinggi", "sama tinggi")
cam("depan", [C(29), 20, 6, 0, 42, -104, 21, 40], [C(31), 20, 8, 0, 32, -78, 15, 40])
scene(29, *H11, focus=[14, 6, 0], cam="depan",
      hud=[{"k": "ikon", "name": "seru", "x": 540, "y": 600, "t0": W(29, "tunggu"), "t1": C(30) + 0.2, "s": 0.9}])
scene(30, *H11, focus=[14, 6, 0], cam="depan", sambung=1,
      hud=[{"k": "ikon", "name": "tanya", "x": 540, "y": 600, "t0": W(30, "melanjutkan"), "t1": C(31) - 0.05, "s": 0.9},
           {"k": "tag", "at": [20.7, 11, 0], "text": "Gerbang depan masih tertutup", "t0": W(30, "Bagaimana"), "dy": -190}])
scene(31, *H11, focus=[19, 0, 0], bayang=40,
      cam=cam("sama", [C(31), 19, 1, 0, 48, -7, 5, 36], [C(34), 19, 3, 0, 40, -3, 6, 36]),
      hud=[{"k": "sama", "a": "lv012,0,4", "b": "lv129,0,4", "t0": W(32, "permukaan"), "t1": C(34), "teq": W(33, "Sama") + 0.1},
           {"k": "meter", "t0": C(31), "t1": C(34), "x": 880, "y": 470},
           {"k": "tag", "at": [20.5, -9.6, 4.3], "text": "Katup ditutup", "t0": 85.6, "dy": 160, "col": "#d97706"}])
# 34-35. gerbang depan dibuka, kapal lanjut
H12 = ("LANGKAH 6", "Gerbang depan dibuka", "dibuka")
scene(34, *H12, focus=[18, 5, 0], bayang=40,
      cam=cam("buka", [C(34), 24, 7, 0, 38, -97, 17, 42], [C(35), 26, 7, 0, 30, -90, 14, 42]),
      hud=[{"k": "tag", "at": [24, 11, 3.6], "text": "Gerbang depan dibuka", "t0": W(34, "dibuka") - 0.3, "dy": -170, "dx": -40, "col": "#3157e8"}])
scene(35, *H12, focus=[20, 5, 0], camRel="x", bayang=50,
      cam=cam("lanjut", [C(35), 0, 5, 0, 46, -42, 25, 38], [C(36), 4, 7, 0, 52, -16, 26, 38]))
# 36-37. bertingkat sampai danau
H13 = ("BERULANG", "Naik ruang demi ruang", "ruang")
STAIR = {"front": 0, "x": [[91.9, 38], [93.9, 38], [94.9, 76], [96.3, 76], [98.1, 120]], "lv0": 5,
         "lv1": [[92.0, 5], [93.7, 10]], "g1": [[91.9, 1], [92.2, 0]], "g2": [[93.6, 0], [94.0, 1]],
         "lv2": [[94.9, 10], [96.3, 15]], "g3": [[96.1, 0], [96.5, 1]]}
scene(36, *H13, tl=STAIR, focus=[60, 10, 0], bayang=90, kabut=[300, 1100],
      cam=cam("tangga", [C(36), 40, 8, 0, 150, -56, 33, 34], [C(38), 84, 13, 0, 160, -30, 29, 34]),
      hud=[{"k": "tag", "at": [0, 8, 4], "text": "Ruang 1", "t0": W(36, "diulangi"), "dy": 120, "col": "#1b1b1d"},
           {"k": "tag", "at": [38, 13, 4], "text": "Ruang 2", "t0": W(36, "beberapa"), "dy": 120, "col": "#1b1b1d"},
           {"k": "tag", "at": [76, 18, 4], "text": "Ruang 3", "t0": W(37, "Sampai"), "dy": 120, "col": "#1b1b1d"},
           {"k": "badge", "text": "+26 m", "sub": "Danau Gatun (jalur air atas)", "t0": W(37, "tinggi") - 0.2, "y": 600, "w": 620}])
scene(37, *H13, tl=STAIR, focus=[60, 10, 0], bayang=90, kabut=[300, 1100], cam="tangga", sambung=1,
      hud=[{"k": "badge", "text": "+26 m", "sub": "Danau Gatun (jalur air atas)", "t0": W(37, "tinggi") - 0.2, "y": 600, "w": 620}])
S.pop(); S[-1]["c1"] = 38  # adegan 36 sudah mencakup cue 37 (satu gerak kamera)
# 38-42. turun: dibalik
H14 = ("UNTUK TURUN", "Caranya dibalik", "dibalik")
DOWN = {"x": 0, "front": 1, "lv1": 5, "g0": 0, "g1": 0, "lv0": [[102.9, 5], [108.1, 0]],
        "vout": [[102.6, 0], [103.2, 1], [108.4, 1]]}
scene(38, *H14, tl=DOWN, focus=[2, 0, 0], bayang=40,
      cam=cam("turun", [C(38), 2, 4, 0, 66, -24, 9, 34], [C(40), 2, 2, 0, 58, -14, 7, 34]),
      hud=[{"k": "icon", "name": "balik", "x": 820, "y": 560, "t0": W(39, "dibalik") - 0.1, "s": 0.9}])
scene(39, *H14, tl=DOWN, focus=[2, 0, 0], cam="turun", sambung=1,
      hud=[{"k": "icon", "name": "balik", "x": 820, "y": 560, "t0": W(39, "dibalik") - 0.1, "s": 0.9}])
S.pop(); S[-1]["c1"] = 40
scene(40, *H14, tl=DOWN, focus=[-18, -6, 0], bayang=30,
      cam=cam("buang", [C(40), -14, -4, 0, 48, -8, 4, 36], [C(41), -19, -5, 0, 42, -14, 4, 36]),
      hud=[{"k": "tag", "at": [-21.2, -9.6, 4.3], "text": "Katup buang dibuka", "t0": W(40, "dialirkan"), "dy": 170, "dx": 60, "col": "#d97706"},
           {"k": "tag", "at": [-27, -5, 4.3], "text": "Ke kanal bawah", "t0": W(40, "keluar"), "dy": -150, "dx": -40, "col": "#1d6fb8"}])
scene(41, *H14, tl=DOWN, focus=[-12, 0, 0], bayang=30,
      cam=cam("mistar2", [C(41), -12, 3, 0, 25, -10, 5, 38], [C(42), -11, 1, 0, 23, -4, 5, 38]),
      hud=[{"k": "meter", "t0": C(41), "x": 880, "y": 470},
           {"k": "arrow", "at": "lv0-9,0.4,4", "dir": "down", "t0": W(41, "turun"), "text": "TURUN"}])
scene(42, *H14, tl=DOWN, focus=[2, 0, 0], bayang=40,
      cam=cam("turun2", [C(42), 2, 1, 0, 62, -20, 9, 34], [C(43), 2, -1, 0, 56, -10, 7, 34]),
      hud=[{"k": "arrow", "at": "ship2,9.5,0", "dir": "down", "t0": W(42, "turun"), "text": "IKUT TURUN", "len": 170}])
# 43-46. kesimpulan
H15 = ("JADI SELAMA INI", "Yang bergerak adalah air", "air")
scene(43, *H15, tl={"x": 0, "front": 0, "lv0": 2.5}, focus=[2, 0, 0], bayang=50,
      hantu=[W(44, "diangkat") - 0.6, C(45) - 0.1], tali=W(44, "diangkat") - 0.4,
      cam=cam("rekap", [C(43), 2, 4, 0, 84, -52, 30, 34], [C(45), 2, 5, 0, 76, -14, 26, 34]),
      hud=[{"k": "ikon", "name": "larangan", "x": 540, "y": 600, "t0": W(44, "tidak"), "t1": C(45) - 0.05, "s": 1.1}])
S[-1]["c1"] = 45
SURF = {"x": 0, "front": 1, "lv1": 5, "lv0": [[114.3, 0.5], [115.15, 4.5], [115.3, 4.5], [116.3, 2.0]],
        "vin": [[114.1, 0], [114.3, 1], [115.1, 1], [115.3, 0]], "vout": [[115.25, 0], [115.45, 1], [116.3, 1], [116.5, 0]],
        "glow": [[W(46, "permukaan") - 0.2, 0], [W(46, "permukaan") + 0.3, 1]]}
scene(45, *H15, tl=SURF, focus=[2, 0, 0], bayang=40,
      cam=cam("permukaan", [C(45), 2, 1, 0, 62, -14, 7, 34], [C(47), 0, 1, 0, 50, -6, 8, 34]),
      hud=[{"k": "arrow", "at": "lv0-6,0.5,4", "dir": "up", "t0": W(45, "dinaikkan"), "t1": W(45, "diturunkan"), "col": "#2fb85a"},
           {"k": "arrow", "at": "lv0-6,0.5,4", "dir": "down", "t0": W(45, "diturunkan"), "t1": C(46) + 0.4},
           {"k": "tag", "at": "lv0-8,0,4", "text": "Permukaan air", "t0": W(46, "permukaan"), "dy": -190, "col": "#1d6fb8"}])
S[-1]["c1"] = 47
# 47-49. penutup
H16 = ("INTINYA", "Air + gravitasi", "Air,gravitasi")
GRAND = {"front": 0, "x": 38, "lv0": 0, "lv1": 7.5, "lv2": 15, "g0": 0, "g1": 0}
scene(47, *H16, tl=GRAND, kapal2=[[0], [76], [134]], focus=[60, 10, 0], bayang=110, kabut=[400, 1300],
      cam=cam("akbar", [C(47), 40, 8, 0, 205, -44, 38, 34], [C(48), 60, 12, 0, 235, -22, 31, 34]),
      hud=[{"k": "tag", "at": [0, 1, 0], "text": "Rendah", "t0": W(47, "sistem"), "dy": 140, "col": "#1b1b1d"},
           {"k": "tag", "at": [134, 16, 0], "text": "Tinggi", "t0": W(47, "sistem") + 0.3, "dy": -140, "col": "#1b1b1d"}])
scene(48, *H16, tl={"front": 0, "x": 76, "lv2": [[122.7, 10], [125.9, 15]], "lv1": 10, "lv0": 5}, focus=[76, 12, 0], bayang=50,
      cam=cam("badge", [C(48), 72, 13, 0, 70, -58, 26, 36], [C(49), 76, 15, 0, 62, -40, 22, 36]),
      hud=[{"k": "badge", "text": "50.000 TON", "sub": "berpindah ketinggian", "t0": W(48, "puluhan") - 0.1, "t1": W(48, "berpindah") + 0.1, "y": 600, "w": 640},
           {"k": "badge", "text": "+26 m", "sub": "tanpa diangkat", "t0": W(48, "berpindah") + 0.1, "y": 600, "w": 560}])
scene(49, *H16, tl={"x": 0, "front": 1, "lv1": 5, "lv0": [[126.0, 0.4], [129.2, 3.2]], "vin": 1}, focus=[2, -3, 0], bayang=40,
      cam=cam("akhir", [C(49), 4, -3, 0, 56, -10, 5, 36], [DUR, 2, -1, 0, 74, -20, 9, 36]),
      hud=[{"k": "ikon", "name": "air", "x": 330, "y": 580, "t0": W(49, "air") - 0.1, "s": 0.9},
           {"k": "teks", "text": "+", "x": 540, "y": 610, "t0": W(49, "dan") - 0.05, "size": 110},
           {"k": "icon", "name": "gravitasi", "x": 750, "y": 580, "t0": W(49, "gravitasi") - 0.15, "s": 1.0}])


def rplan():
    scenes = []
    for j, sc in enumerate(S):
        st = C(sc["c0"]) if j else 0.0
        en = C(S[j + 1]["c0"]) if j + 1 < len(S) else DUR
        p = sc["params"]
        sam = p.pop("sambung", 0)
        scenes.append({"template": "terusan", "start": round(st, 3), "end": round(en, 3), "params": p,
                       "sambung": bool(sam), "transisi": 0.45, "camera": {"gerak": "tetap"}})
    events = [{"type": "brak", "t": W(19, "rapat") + 0.05}]
    return {"duration": DUR, "seed": 7, "title_bar": "", "watermark": "", "style": "edukasi_3d",
            "scenes": scenes, "cues": cues, "events": events, "tl": TL, "cams": CAMS}


def build():
    rp = rplan()
    (OUT / "render_plan.json").write_text(json.dumps(rp, ensure_ascii=False, indent=1))
    html = OUT / "page.html"
    render.build_page(rp, html, director.load_style("edukasi_3d"))
    return rp, html


def stills(times, tag="st"):
    rp, html = build()
    d = OUT / "stills"
    if d.exists():
        shutil.rmtree(d)
    d.mkdir()
    r = subprocess.run(render._worker_cmd(html, d, ["--times", ",".join(f"{t:.3f}" for t in times), "--prefix", tag]),
                       cwd=str(ROOT), capture_output=True, text=True)
    if r.returncode:
        print(r.stdout[-2000:], r.stderr[-3000:])
        raise SystemExit(1)
    return sorted(d.glob(f"{tag}*.jpg"))


def sheet(files, times, out, cols=6, w=240):
    from PIL import Image, ImageDraw
    h = int(w * 16 / 9)
    rows = math.ceil(len(files) / cols)
    im = Image.new("RGB", (cols * w, rows * (h + 22)), "#111")
    d = ImageDraw.Draw(im)
    for i, (f, t) in enumerate(zip(files, times)):
        x, y = (i % cols) * w, (i // cols) * (h + 22)
        im.paste(Image.open(f).resize((w, h)), (x, y))
        d.text((x + 4, y + h + 4), f"{t:.2f}s", fill="white")
    im.save(out, quality=88)
    return out


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "stills"
    if mode == "stills":
        rp, _ = build()
        if len(sys.argv) > 2:
            times = [float(x) for x in sys.argv[2].split(",")]
        else:
            times = [round(s["start"] + (s["end"] - s["start"]) * k, 2) for s in rp["scenes"] for k in (0.35, 0.85)]
        fs = stills(times)
        print(sheet(fs, times, OUT / "stills_sheet.jpg"), len(rp["scenes"]), "adegan")
    elif mode == "full":
        rp, html = build()
        fr = OUT / "frames"
        if fr.exists():
            shutil.rmtree(fr)
        render.render_frames(html, fr, DUR, lambda p: print(f"render {p:.0%}", flush=True))
        out = ROOT / "Hasil Produksi/Edukasi/Terusan Panama/Video/terusan_panama_v2.mp4"
        render.encode(fr, AUDIO, out, DUR)
        print("OK", out)
