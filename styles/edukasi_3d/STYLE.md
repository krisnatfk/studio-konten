# STYLE.md — Edukasi 3D ("gimana bisa?")

Panduan produksi untuk video animasi edukasi 3D vertikal di project `horor-studio`.
Patokan kualitas: `terusan_panama_v2.mp4` (template `styles/edukasi_3d/scenes/60_terusan.js`,
builder `scripts/make_terusan_v2.py`). Setiap video baru harus setara atau lebih baik dari itu.

---

## 1. Identitas visual (wajib, jangan diubah)

| Unsur | Aturan |
|---|---|
| Format | 1080×1920, 30 fps, H.264 + AAC, durasi = durasi MP3 |
| Dunia | Diorama 3D low-poly yang cerah: langit biru gradasi, rumput hijau, beton abu muda, baja biru-gelap, aksen kuning keselamatan. Tanpa tekstur foto. |
| Potongan (cutaway) | Saat menjelaskan "yang ada di dalam", dinding/tanah depan **tenggelam perlahan** (≥ 2,5 dtk) memperlihatkan penampang tanah berlapis cokelat dan mekanisme di dalamnya. |
| Air | Badan transparan dengan gradasi kedalaman (terang di atas, gelap di bawah) + kulit beriak halus. Partikel/buih untuk aliran. |
| Tokoh | Pekerja kecil berhelm kuning untuk skala, selalu bergerak (jalan, menunjuk, berpikir). |
| Header | Pojok kiri atas: label kecil kapital (mis. `LANGKAH 3`) + judul ≤ 5 kata, kata kunci disorot kotak biru `#3157e8`. |
| Subtitle | Putih tebal, outline hitam, 1–3 kata per potong, karaoke per kata (timing Whisper), kata kunci disorot biru. Posisi y≈1300. |
| HUD | Ikon bulat (✕, ?, !, larangan, tetes air), label callout (titik + garis + kotak gelap), panah tebal (hijau naik / merah turun), kartu angka putih besar, bingkai kuning putus-putus berdenyut, meter tinggi air di kanan. |
| Akhir | Fade ke putih 0,6 dtk; awal fade dari putih 0,45 dtk. |

Zona layar (jangan ditabrak):
- **0–330 px**: header.
- **380–1250 px**: zona aman HUD.
- **1250–1450 px**: subtitle, jangan taruh HUD penting di sini.
- **Kanan 760–1000 px**: meter.

---

## 2. Cara produksi (metode yang terbukti)

Jangan mengandalkan template generik untuk topik baru. Buat **satu dunia 3D khusus topik** dan **satu builder**:

1. `styles/edukasi_3d/scenes/NN_<topik>.js`: `ENG.def('<topik>', {...})`. Contoh lengkap: `60_terusan.js`.
   - Bangun set yang dibutuhkan cerita (mis. `laut`, `peta`, `dunia`), memakai `K.*` dari `20_kit.js` (kapal, gerbang, orang, pohon, crane, HUD).
   - **Keadaan dunia = fungsi waktu global** (`PLAN.tl`): posisi objek, level air, buka-tutup gerbang, katup, dll. ditulis sebagai keyframe `[[t, nilai], ...]` dan diinterpolasi ease. Adegan boleh menimpa (`p.tl`) untuk time-lapse/flashback.
   - Kamera = **spline Hermite** dari `PLAN.cams[nama]`: kunci `[t, tx, ty, tz, jarak, yaw, pitch, fov]`. Opsi `camRel: "x"` membuat target mengikuti objek utama.
2. `scripts/make_<topik>.py`: menyalin pola `make_terusan_v2.py`.
   - Memuat `cues.json` (+ `wt` per kata dari `align.word_times`) lalu menyusun `TL`, `CAMS`, daftar `scene(...)`, dan HUD.
   - **Semua waktu dikunci ke kata** lewat `W(cue, "awalan_kata")` dan `C(cue)`. Jangan menulis detik "kira-kira".
   - Perintah `stills` merender frame uji dan `full` merender + encode.
3. Audio dan timing: `audio.to_wav` → `transcribe.transcribe` → `align.split_phrases/align_by_words/make_cues` → `align.word_times`. Buang `*`/markdown dari teks cue.

Struktur adegan di `render_plan.json`: `template`, `start`, `end`, `params` (label/judul/sorot, set, cam, tl, hud, focus, bayang), `sambung` (true = kamera kontinu tanpa dissolve), `transisi` (0,45 dtk), `camera: {gerak: "tetap"}`.

---

## 3. Bahasa kamera (supaya halus & sinematik)

**Aturan halus (penyebab utama patah-patah):**
- Selalu `camera.gerak = "tetap"`. Gerak `maju/mundur/diam` lama mengubah jarak per adegan dan menimbulkan lompatan di setiap batas adegan.
- Satu gerak kamera per adegan dari kunci ke kunci. Spline Hermite tanpa overshoot. Jangan lebih dari 4 kunci per 5 detik.
- Adegan berurutan di dunia yang sama dan sudut yang menyambung → satu jalur kamera (`cam` sama) + `sambung: true`. Tidak ada potongan, tidak ada dissolve.
- Pindah sudut atau set → dissolve 0,45 dtk (`transisi`). Tidak ada hard cut.
- HUD dari adegan sebelumnya harus selesai (`t1`) **sebelum** batas adegan `sambung`, supaya tidak hilang mendadak.
- Perubahan besar dunia (dinding tenggelam, kapal pindah ruang) ≥ 2,5 dtk dengan ease.

**Jenis shot dan kapan dipakai:**

| Shot | Jarak (m) | Pitch | Untuk |
|---|---|---|---|
| Aerial / establishing | 90–240 | 30–50° | Memperkenalkan sistem utuh, penutup, "sistem sederhana" |
| Top-down | 40–50 | 80–86° | Gerak mekanik terbaca dari atas (gerbang berayun, peta) |
| Wide potongan | 55–95 | 5–10° | Hubungan sebab-akibat: air naik → kapal naik |
| Medium tracking | 40–55 | 15–30° | Objek bergerak (`camRel`) |
| Close-up detail | 20–35 | 0–12° | Katup, mistar, lubang, celah, angka |
| Worm's-eye | 10–12 | −25 s/d −31° | Skala raksasa / "mustahil" |
| Over-the-shoulder | 14–16 | 3–12° | Tokoh berpikir / bertanya |
| POV | 30–36 | 14–17° | Dari atas objek melihat ke depan (gerbang dibuka) |
| Crane-up / whip | naik cepat ke 150 / pitch 86 | | Transisi bab ("tapi ternyata…") |

**Hitungan framing (layar portrait sempit!)**
- Lebar terlihat ≈ `0,365 × jarak` pada fov 36°, dan ≈ `0,41 × jarak` pada fov 40°.
- Objek 25 m perlu jarak ≥ 60 m bila dilihat frontal. Pakai sudut miring (yaw ±30–60°) agar objek panjang muat diagonal.
- Posisi kamera = target + jarak·(cos p·sin y, sin p, cos p·cos y). yaw 0 = dari depan (+z), yaw −90 = dari belakang (−x).
- Sebelum memakai kunci, pastikan **kamera tidak di dalam geometri** (tanah, dinding, kapal, pohon).
- Kamera untuk potongan harus berada di depan bidang potong. Di jalur kamera tidak boleh ada pohon.

**Variasi:** minimal 20 setup kamera berbeda per 2 menit. Jangan memakai jenis shot yang sama lebih dari 2 kali berturut-turut. Pola bab: wide → medium → close → wide.

---

## 4. Animasi & detail

- Setiap aksi punya **persiapan → kejadian → akibat**, contohnya katup terangkat → partikel mengalir → level naik → objek naik → meter bertambah.
- Kecepatan fisik masuk akal. Aliran melambat ketika beda tinggi mengecil (`sqrt(beda)`). Kapal melambat sebelum berhenti, ada buih saat bergerak.
- Kontinuitas: posisi, level, dan status gerbang tidak boleh lompat antar adegan. Gunakan `PLAN.tl` global. Override hanya untuk time-lapse yang diberi tanda visual.
- Dunia hidup: pekerja berjalan, burung, asap tipis, riak air, goyang apung kecil (≤ 0,06 m).
- Detail yang membuktikan narasi: mistar/angka saat bicara tinggi, ikon ✕ saat "tanpa…", tanda "=" saat "sama tinggi", label callout saat istilah baru diperkenalkan ("LOCK = PINTU AIR").
- HUD muncul **tepat pada kata**: `t0 = W(cue, kata)`, biasanya 0–0,2 dtk sebelum kata. Satu HUD utama per momen. Maksimal 3 elemen HUD sekaligus.
- Teks kustom tidak memakai `bunyi` (durasinya tetap 1,6 dtk) bila adegan akan disambung. Pakai `teks` dengan `t1`.

---

## 5. Gerbang kualitas (wajib sebelum menyerahkan)

1. **Stills**: `python scripts/make_<topik>.py stills` (2 frame per adegan) lalu periksa lembarnya **dengan mata**. Cek: subjek terlihat utuh, tidak terhalang pohon/dinding, kamera tidak di dalam objek, HUD tidak menabrak header/subtitle, teks terbaca, aksi sesuai kalimat.
2. Perbaiki, lalu ulangi stills sampai semua adegan bersih.
3. **Render penuh**: `X264_PRESET=slow python scripts/make_<topik>.py full`.
4. **Kehalusan**: `python scripts/cek_halus.py video.mp4 data/jobs/<job>/render_plan.json` harus **LULUS** (tidak ada frame dengan beda > 12 selain fade awal/akhir). Lonjakan di +0,02 dtk dari batas adegan = ada sesuatu yang hilang/muncul mendadak (header, HUD, kamera).
5. **Teknis**: `ffprobe` durasi = audio ±0,1 dtk, 1080×1920, 30 fps, ada stream audio. Subtitle tanpa `*`.
6. **Storyboard**: tabel shot (waktu, judul, kamera, aksi) + lembar keyframe dari video final (contoh: `scripts/storyboard_terusan_v2.py`). Hitung jumlah shot dan momen.

Target minimal: **≥ 20 shot berbeda, ≥ 50 momen visual**, 0 lonjakan, semua stills lolos inspeksi.

---

## 6. Jebakan yang pernah terjadi (jangan diulang)

- `p.laju || 3` → nilai 0 dianggap kosong dan objek melaju pergi. Pakai `??`.
- Header hilang 1 frame di setiap batas adegan → sudah diperbaiki di runtime (crossfade 0,2 + 0,3 dtk). Jangan diubah.
- Kamera close-up menembus lambung/dinding → selalu hitung posisi kamera dari rumus di atas.
- Pohon di depan memblok semua shot frontal → pohon depan hanya jauh (z > 40) dan di luar jalur kamera.
- Dinding terlalu tinggi menutupi objek → tinggi dinding ≈ level air maks + 1 m.
- `pkill -f <pola>` dari shell ikut membunuh shell sendiri. `pgrep -f` dalam loop tunggu ikut menghitung dirinya sendiri. Hentikan task lewat TaskStop atau PID yang jelas.
- Teks naskah ber-markdown (`*lock*`) tampil apa adanya di subtitle → bersihkan.
