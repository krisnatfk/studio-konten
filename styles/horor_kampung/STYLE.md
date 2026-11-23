# STYLE.md — Horor Kampung

Panduan produksi untuk video animasi horor kampung vertikal di project `horor-studio`.
Gaya: siluet hitam, lampu teplok oranye, kabut, cahaya bulan biru, grain film. Mesin: SVG 2D
(`engine/core.js` + `engine/lib/*.js` + `styles/horor_kampung/scenes/*.js`), pustaka 2.0 berisi 120 template.

---

## 1. Identitas visual (dikunci mesin, jangan dilawan)

| Unsur | Aturan |
|---|---|
| Format | 1080×1920, 30 fps, durasi = MP3. Awal fade dari hitam 0,7 dtk, akhir ke hitam 1 dtk. |
| Palet | Siluet hitam pekat di depan; latar biru-ungu malam dengan bulan; sumber cahaya hangat oranye (teplok, lentera, api); kabut berlapis; debu melayang; grain. Grade: brightness 1,4, contrast 1,08, saturate 1,2, vignette 0,6, handheld halus. |
| Tokoh | Siluet dengan rig sendi (IK). Jenis: pria, bapak, wanita, gadis, anak, nenek, kakek. **Satu orang = satu jenis** sepanjang video. |
| Hantu | bayangan, kuntilanak, pocong, genderuwo, tuyul. Hanya muncul jika cerita menghadirkannya, tepat pada kalimat yang menyebutnya. |
| Subtitle | Peran `narasi` (krem), `dialog` (oranye, ucapan langsung/aturan/pesan), `seram` (merah + hentakan kamera; 1–3 kalimat paling menakutkan, twist, penutup). Minimal satu `seram`. Tanpa `*`/markdown. |
| Suara | Ambience angin + dengung + jangkrik (jangkrik berhenti sebelum ketukan). SFX otomatis dari kata: tok/dok → `ketuk`, ketukan pintu → `ketuk_pintu`, brak/roboh → `brak` (kilat + guncangan). VO diberi gema tipis. |
| Judul | Maksimal 4 kata, bikin penasaran. |

---

## 2. Cara produksi

1. **Draf otomatis**:
   ```bash
   python -m studio.cli audio.mp3 --naskah naskah.txt --gaya horor_kampung --judul "Judul"
   ```
   Pipeline menjalankan Whisper → `cues.json` (+ timing per kata) → sutradara LLM → `plan.json` → render → review AI → `quality_report.json`. Hasilnya `data/jobs/<job>/final.mp4` (lolos) atau `preview.mp4` (draft).
2. **Periksa** `storyboard.jpg`, `quality_report.json`, `review_report.json`, lalu tonton bagian yang meragukan.
3. **Sempurnakan dengan tangan**: edit `data/jobs/<job>/plan.json` (adegan, template, params, kamera, `momen`), lalu:
   ```bash
   python scripts/render_ulang.py <job>            # tanpa LLM
   python scripts/render_ulang.py <job> --review   # + review AI per adegan
   ```
   Ulangi sampai semua lolos.

Struktur `plan.json`: `judul`, `adegan[]` (`dari`, `sampai` = rentang cue inklusif, tanpa celah/tumpang tindih; `template`; `params`; `kamera.gerak`; `momen[]` = `{cue, kata, fokus}`), `peran[]` (`{i, peran}` untuk cue dialog/seram).

---

## 3. Memilih adegan

- **Template khusus dulu**, `komposisi` bila tak ada. Cek `catalog.json`: 16 template suasana (kampung_malam, rumah_panggung, pos_ronda_kosong, kentongan_dekat, pintu_diketuk, kamar_lampu, rumah_kosong_pagi, meja_makan, jendela_malam, kamar_tidur, hutan_kabut, kuburan, sumur, jalan_setapak, sosok_dekat, judul_kartu) + `komposisi` + 100+ template aktivitas pustaka 2.0 (pasar_ramai, bakar_sate, dapur_memasak, menyapu_lantai, membajak_sawah, menebar_jala, …).
- **Gambar = kalimat.** Lokasi, tokoh, aksi, dan benda yang diucapkan harus terlihat saat diucapkan. "Tidak/jangan/belum melakukan X" bukan instruksi menggambar X.
- **Aksi utuh**: persiapan → kontak → perubahan benda → selesai. Beri rentang cue yang cukup. Jangan mempercepat gerak secara tidak wajar.
- **Barang terikat tangan** (`aktor` + `tangan`), benda di meja memakai `di_atas`. Tangan dalam jangkauan wajar (`tangan_x/tangan_y`).
- **Tata letak 9:16**: tokoh utama x 25–75 (y 75–82, skala 0,8–1), figuran y 55–70 skala 0,3–0,55. Jarak antar tokoh ≥ 25. Maksimal 3 tokoh besar. Bangunan tidak menutupi aksi. Tokoh tergeletak tidak tertutup subtitle.
- **Komposisi kaya**: 1 aksi utama terbaca + 3–8 detail lingkungan yang membuktikan tempat (sawah = pematang + rumpun padi; pasar = lapak + pedagang).

---

## 4. Ritme, shot, dan kamera (supaya halus & mencekam)

- Adegan **2–6 dtk** (maks 8–9). Ganti gambar saat lokasi, tokoh, aksi, atau fokus kalimat berubah. Klimaks dipotong lebih cepat (1–2 kalimat per adegan).
- **Minimal 20 shot berbeda & 50 momen visual** per video. Tiap momen = informasi baru (aksi, reaksi, benda muncul, cahaya berubah), dikunci ke `kata` pemicu.
- **Variasi skala shot**: lebar (kampung_malam, rumah_panggung) untuk tempat → sedang (komposisi/aktivitas) untuk aksi → dekat (kentongan_dekat, sosok_dekat, kamar_lampu) untuk emosi/kejutan. Template sama tidak lebih dari 2 adegan berturut-turut.
- `kamera.gerak`:
  - `maju` untuk ketegangan naik.
  - `mundur` untuk mengungkap atau kesepian.
  - `geser_kiri/kanan` untuk perjalanan.
  - `naik` untuk sosok tinggi atau langit.
  - `diam` untuk hening sebelum kejutan.
  - Jangan memakai gerak yang sama 3 kali berturut-turut.
- **Kehalusan** (dijamin mesin, jangan diakali):
  - Antar-adegan crossfade 0,32 dtk.
  - Pergantian shot `detail`/`samping`/`luas` di dalam adegan berupa gerak kamera 0,45 dtk (bukan lompatan zoom).
  - Kamera ease antar kunci.
  - Hindari dua adegan sangat pendek (< 1,5 dtk) berurutan, karena crossfade akan saling menumpuk.
- **Kejutan yang disengaja** (boleh melonjak): kilat ketukan/brak, hentakan `seram`, `lampu_padam_cue`, sosok muncul. Taruh **tepat** di kata pemicunya.
- **Ketegangan sebelum hantu**: lokasi sepi → tokoh menoleh → lampu redup → baru sosok muncul (`sosok_muncul_cue`/`muncul`).
- **Penutup**: adegan terakhir paling kuat (sosok_dekat / sosok muncul di kalimat terakhir / lampu padam). Twist diberi gambar bukti.

---

## 5. Gerbang kualitas (wajib sebelum menyerahkan)

1. `quality_report.json` **lulus**, `review_report.json` tiap adegan ≥ 8/10.
2. **Inspeksi mata**: `storyboard.jpg` + frame di tengah tiap adegan. Cek:
   - aksi terbaca;
   - tokoh tidak terpotong atau bertumpuk;
   - barang menempel di tangan;
   - hantu hanya muncul di saat yang tepat;
   - subtitle tidak menutupi aksi.
3. **Kehalusan**: `python scripts/cek_halus.py final.mp4 render_plan.json`. Setiap lonjakan yang tersisa harus **kejutan yang disengaja** (kilat/hentakan/lampu padam di kata pemicu). Lonjakan lain = perbaiki.
4. **Teknis**: durasi = MP3, 1080×1920, 30 fps, ada audio, SFX ketukan jatuh pada kata ("tok", "diketuk") ±0,1 dtk.
5. **Storyboard**: daftar adegan (waktu, template, kamera, aksi/momen) + lembar keyframe.

---

## 6. Jebakan yang pernah terjadi

- Hantu ditambahkan ke penutup cerita biasa → dilarang.
- Ketukan pintu jatuh di fade-out → ketukan dikunci ke kata "ketuk/ketok" di audio.
- Jala tampil seperti cakram, bajak seperti balok, tongkat tidak menyentuh kambing → kontak alat–objek harus terlihat di frame tengah aksi.
- Kalender/papan nama berupa kotak putih kosong → pakai props `kalender`/`papan_nama` dengan teks.
- Zoom shot lompat di tengah adegan (versi mesin lama) → sudah diperhalus; jangan menambah perubahan zoom mendadak lewat params.
