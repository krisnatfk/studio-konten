"""Storyboard untuk gedung_berjalan.mp4: tabel shot (Markdown) + lembar keyframe dari video final."""
import json
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data/jobs/gedung-v1"
VIDEO = ROOT / "Hasil Produksi/Edukasi/Gedung Berjalan/Video/gedung_berjalan.mp4"
rp = json.loads((OUT / "render_plan.json").read_text())

DESK = [
    ("Low-angle 3/4, naik pelan", "Gedung 8 lantai Indiana Bell berdiri; garis ukur '8 lantai' tergambar di sudut"),
    ("Medium, dorong ke lantai atas", "Fasad turun sebagian: 3 lantai atas terbuka, karyawan mengetik; label 'Ratusan orang tetap kerja'"),
    ("Aerial orbit 40°", "Gedung + jalan + mobil 1930 + kabel; ikon tanya 'gimana cara mindahinnya?'"),
    ("Rendah di kaki gedung", "26 orang mencoba mengangkat beramai-ramai, gedung hanya bergetar; 'HEEEP!'"),
    ("Close-up trotoar", "Dua orang mendorong lemari, menabrak tiang lampu → 'DUK!', satu orang kaget"),
    ("Worm's-eye wide", "Gedung menjulang + pejalan kaki; ikon '!'"),
    ("Crane-up cepat ke aerial", "Kota mengecil, transisi bab"),
    ("Medium high-angle", "Kartu '1930 · Indianapolis'; tim insinyur berhelm di meja cetak biru; label & ikon '!'"),
    ("Close-up pintu masuk", "Papan 'INDIANA BELL' + pilar; label 'Gedung kantor Indiana Bell'"),
    ("Low-angle 3/4", "Panah berat turun + kartu '± 11.000 TON'"),
    ("Frontal dollhouse", "Fasad depan turun ke tanah: 8 lantai kantor terlihat; kartu '± 600 karyawan'"),
    ("Close-up karyawan", "Karyawan mengetik di mesin tik; 'tik tik tik'"),
    ("Tracking ikut gedung", "Gedung meluncur (khayalan) — 'JALAN-JALAN?!'"),
    ("Wide samping", "Gedung miring goyah 3,5° lalu kembali; ikon tanya 'tanpa roboh?'"),
    ("Medium dari belakang tim", "Insinyur menunjuk cetak biru; ikon lampu ide"),
    ("Low-angle fondasi", "Balok baja merah didorong menembus dasar gedung; pekerja mendorong; label"),
    ("Close-up dongkrak", "Dongkrak kuning keluar, piston naik, gedung terangkat; panah '+50 cm'"),
    ("Sangat rendah di samping", "Rel baja tergelar, rol baja muncul di bawah gedung; label Rel/Rol/Penopang"),
    ("Aerial 3/4 bergerak", "Pendorong hidrolik mendorong, rol berputar, gedung bergeser; teks '→ bergeser'"),
    ("Street-level", "Mobil merah ngebut lewat → 'WUSSH!', gedung merayap di belakang"),
    ("Close-up rol, ikut gedung", "Rol berputar pelan; kartu '38 cm / jam' + ikon jam"),
    ("Macro siput", "Siput menyalip gedung; ikon siput 'merayap!'"),
    ("Top-down miring 70°", "Ikon '!'; bingkai kuning posisi awal"),
    ("(lanjut, tanpa potong)", "Rel melingkar muncul, gedung berputar 90°; ikon putar + kartu '90°'"),
    ("Dollhouse ikut putaran", "Kantor tetap bekerja sambil gedung berputar; centang"),
    ("High-angle tiang & kabel", "Kabel listrik, telepon, dan selang air tetap tersambung & melentur; label + centang"),
    ("Tracking komuter", "Karyawan berangkat kerja membawa tas"),
    ("Over-the-shoulder", "Ia berhenti di lahan kosong, menggaruk kepala → 'LHO?!'; bingkai posisi lama"),
    ("Aerial orbit time-lapse", "Matahari berputar (sebulan); ikon kalender 30"),
    ("Low-angle posisi baru", "Gedung diturunkan di posisi baru menghadap jalan lain; centang + label 'Posisi lama'"),
    ("Wide", "Bola penghancur hantu → tanda larangan: tanpa dibongkar"),
    ("Dollhouse frontal", "Kantor tetap buka, karyawan bekerja; centang"),
    ("Close-up interior", "Bos berdasi berkata 'Kantor kita mau pindah!' (balon)"),
    ("Close-up → pull-back penutup", "Karyawan bertanya 'orangnya yang pindah… atau gedungnya?'; fasad naik kembali, kamera mundur"),
]


def ts(t):
    return f"{int(t // 60)}:{t % 60:05.2f}"


def main():
    sc = rp["scenes"]
    assert len(sc) == len(DESK), (len(sc), len(DESK))
    lines = ["# Storyboard — Gedung Raksasa yang Bisa Berjalan", "",
             f"Video 1080×1920, 30 fps, {rp['duration']:.1f} detik. Gaya edukasi_3d (template `gedung`, `styles/edukasi_3d/scenes/70_gedung.js`).",
             "Semua aksi dikunci ke waktu kata di narasi (Whisper per kata). Builder: `scripts/make_gedung.py`.", "",
             "| # | Waktu | Judul layar | Kamera | Aksi / momen visual |", "|---|---|---|---|---|"]
    moments = setups = 0
    for i, (s, (camd, act)) in enumerate(zip(sc, DESK), 1):
        p = s["params"]
        setups += 0 if s.get("sambung") else 1
        moments += len(p.get("hud") or []) + 1 + sum(1 for k in ("rame", "lemari", "insinyur", "pekerjaBaja", "siput", "bos", "hantu", "hari", "komuter", "ngebut", "tl") if k in p)
        lines.append(f"| {i} | {ts(s['start'])}–{ts(s['end'])} | {p.get('judul', '')} | {camd} | {act} |")
    lines += ["", f"**{len(sc)} shot** ({setups} setup kamera berbeda), **{moments} momen visual** "
              "(aksi dunia 3D, perubahan keadaan, label/ikon/kartu yang muncul tepat pada kata).", ""]
    md = ROOT / "Hasil Produksi/Edukasi/Gedung Berjalan/Dokumen/storyboard_gedung_berjalan.md"
    md.write_text("\n".join(lines), encoding="utf-8")
    kf = OUT / "kf"
    kf.mkdir(exist_ok=True)
    cells = []
    for i, s in enumerate(sc):
        t = s["start"] + (s["end"] - s["start"]) * 0.6
        f = kf / f"k{i:02d}.jpg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(VIDEO), "-frames:v", "1", "-vf", "scale=270:480", str(f)], check=True)
        cells.append((i + 1, t, f))
    cols = 7
    rows = math.ceil(len(cells) / cols)
    W, H = 270, 480
    im = Image.new("RGB", (cols * W, rows * (H + 34)), "#15171a")
    d = ImageDraw.Draw(im)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    except OSError:
        font = None
    for k, (n, t, f) in enumerate(cells):
        x, y = (k % cols) * W, (k // cols) * (H + 34)
        im.paste(Image.open(f), (x, y))
        d.text((x + 8, y + H + 6), f"Shot {n}  ·  {ts(t)}", fill="white", font=font)
    out = ROOT / "Hasil Produksi/Edukasi/Gedung Berjalan/Gambar/storyboard_gedung_berjalan.jpg"
    im.save(out, quality=88)
    print(out, md, "shot", len(sc), "setup", setups, "momen", moments)


if __name__ == "__main__":
    main()
