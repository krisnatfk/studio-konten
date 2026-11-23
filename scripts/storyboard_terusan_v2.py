"""Storyboard untuk terusan_panama_v2.mp4: tabel shot (Markdown) + lembar keyframe dari video final."""
import json
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data/jobs/panama-v2"
VIDEO = ROOT / "Hasil Produksi/Edukasi/Terusan Panama/Video/terusan_panama_v2.mp4"
rp = json.loads((OUT / "render_plan.json").read_text())

# (kamera, aksi/visual) per adegan, urut sesuai render_plan
DESK = [
    ("Rendah dari haluan, naik & mundur (crane-up)", "Kapal kontainer membelah laut; asap cerobong; kartu ± 50.000 TON"),
    ("Medium, dorong pelan ke crane", "Kait crane turun ke kapal → tanda DILARANG, crane memudar abu-abu"),
    ("Over-the-shoulder pekerja di dermaga", "Pekerja berpose berpikir menatap kapal; ikon tanya"),
    ("Sudut sangat rendah (worm's-eye) dari air", "Lambung kapal menjulang; teks MUSTAHIL?"),
    ("Crane-up cepat ke langit (transisi)", "Dermaga mengecil dari atas, burung terbang"),
    ("Top-down turun jadi miring 60°", "Peta tanah genting: garis terusan tergambar, pin jatuh, kapal mini melintas; label Pasifik & Karibia"),
    ("Potongan miring, pelan bergeser", "Time-lapse: air masuk → kapal NAIK; air keluar → kapal TURUN"),
    ("(lanjut tanpa potong)", "Ikon lift muncul pada kata 'lift'"),
    ("Aerial orbit 50°", "Crane & tali hantu merah muncul lalu dicoret ✕ (tali, mesin)"),
    ("(lanjut) turun ke air", "Ikon tanya 'bagaimana caranya?'"),
    ("(lanjut) menukik ke permukaan air", "Permukaan air menyala biru; ikon tetes air"),
    ("Chase dari buritan", "Kapal melaju di kanal hilir, buih buritan & haluan"),
    ("(lanjut) whip-pan ke depan", "Kapal melambat; 'EH?!' — gerbang terlihat"),
    ("(lanjut) dorong ke gerbang, tilt-up", "Gerbang baja raksasa; kartu ± 25 m"),
    ("Top-down tepat di atas gerbang", "Dua daun gerbang berayun membuka"),
    ("Tracking samping lalu naik", "Kapal masuk ruang; label 'Ruang berisi air'"),
    ("Aerial tinggi, orbit pelan", "Bingkai kuning berdenyut: LOCK = PINTU AIR; garis ukuran ± 300 m"),
    ("High-angle dari dinding belakang", "Kapal berhenti; pekerja berjalan di dinding"),
    ("Dari kanal hilir, low-high", "Gerbang belakang menutup → KLANG! + guncangan kamera"),
    ("Frontal lebar", "Dinding depan & tanah tenggelam → tampak potongan (cutaway)"),
    ("Pan bawah: gerbang depan → gorong-gorong", "Air hulu lebih tinggi; katup kuning terangkat; air mengalir lewat saluran"),
    ("Close-up lantai", "Air menyembur naik dari lubang lantai; riak di permukaan"),
    ("Close-up mistar tinggi air", "Garis air naik melewati angka; meter +x,x m"),
    ("Close-up lambung bawah air", "Tiga panah hijau 'Gaya apung' mendorong lambung"),
    ("Potongan lebar, crane-up", "Kapal terangkat bersama air; panah TERANGKAT; meter naik"),
    ("Miring tinggi", "Crane hantu → ✕ 'Tanpa crane'"),
    ("(lanjut)", "Tali hantu turun ke kapal → ✕ 'Tanpa ditarik'"),
    ("Potongan rendah di bawah kapal", "Garis ukur antara lambung dan dasar: tidak menyentuh"),
    ("Dari belakang anjungan ke depan", "Gerbang depan masih tertutup; ikon '!'"),
    ("(lanjut) dorong ke gerbang", "Ikon tanya 'melanjutkan perjalanan?'"),
    ("Frontal di gerbang depan", "Dua garis permukaan menyatu → tanda '=' hijau; katup ditutup"),
    ("POV di atas kontainer", "Gerbang depan membuka di depan haluan"),
    ("Tracking miring", "Kapal maju ke ruang berikutnya, buih buritan"),
    ("Aerial besar, sweep panjang", "Time-lapse ruang 1→2→3, gerbang membuka bergantian; kartu +26 m Danau Gatun"),
    ("Potongan frontal", "Kapal di posisi tinggi; ikon 'dibalik'"),
    ("Close-up katup buang", "Katup buang terbuka; air mengalir ke kanal bawah"),
    ("Close-up mistar", "Garis air turun; meter berkurang; panah TURUN"),
    ("Potongan lebar", "Kapal ikut turun perlahan; panah IKUT TURUN"),
    ("Aerial orbit", "Crane & tali hantu → tanda larangan: tidak pernah diangkat"),
    ("Potongan frontal", "Air naik lalu turun; permukaan air menyala + label"),
    ("Aerial sangat tinggi, pull-back", "Tiga kapal di tiga ketinggian; label Rendah → Tinggi"),
    ("Low-angle ruang atas", "Kapal naik di ruang 3; kartu 50.000 TON → +26 m"),
    ("Potongan, pull-back penutup", "Air mengalir masuk; ikon AIR + GRAVITASI; fade putih"),
]


def ts(t):
    return f"{int(t // 60)}:{t % 60:05.2f}"


def main():
    sc = rp["scenes"]
    assert len(sc) == len(DESK), (len(sc), len(DESK))
    lines = ["# Storyboard — Cara Kerja Pintu Air Terusan Panama", "",
             f"Video 1080×1920, 30 fps, {rp['duration']:.1f} detik. Gaya edukasi_3d (template `terusan`).",
             "Semua aksi dikunci ke waktu kata di narasi (Whisper per kata).", "",
             "| # | Waktu | Judul layar | Kamera | Aksi / momen visual |", "|---|---|---|---|---|"]
    moments = 0
    setups = 0
    for i, (s, (camd, act)) in enumerate(zip(sc, DESK), 1):
        p = s["params"]
        setups += 0 if s.get("sambung") else 1
        moments += len(p.get("hud") or []) + 1
        lines.append(f"| {i} | {ts(s['start'])}–{ts(s['end'])} | {p.get('judul', '')} | {camd} | {act} |")
    lines += ["", f"**{len(sc)} shot** ({setups} setup kamera berbeda, sisanya gerak kamera bersambung tanpa potongan), "
              f"**{moments} momen visual** (aksi dunia 3D + label/ikon yang muncul pada kata).", ""]
    (OUT / "storyboard.md").write_text("\n".join(lines), encoding="utf-8")
    # lembar keyframe dari video final
    kf = OUT / "kf"
    kf.mkdir(exist_ok=True)
    cells = []
    for i, s in enumerate(sc):
        t = s["start"] + (s["end"] - s["start"]) * 0.6
        f = kf / f"k{i:02d}.jpg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(VIDEO), "-frames:v", "1", "-vf", "scale=270:480", str(f)], check=True)
        cells.append((i + 1, t, f))
    cols = 8
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
    out = ROOT / "Hasil Produksi/Edukasi/Terusan Panama/Gambar/storyboard_terusan_panama_v2.jpg"
    im.save(out, quality=88)
    md = ROOT / "Hasil Produksi/Edukasi/Terusan Panama/Dokumen/storyboard_terusan_panama_v2.md"
    md.write_text((OUT / "storyboard.md").read_text(), encoding="utf-8")
    print(out, md, moments, setups)


if __name__ == "__main__":
    main()
