# Prompt pembuatan video

Cara pakai:
1. Buka Claude Code di folder `horor-studio`.
2. Lampirkan tiga hal:
   - **STYLE.md** gaya yang dipilih: `styles/edukasi_3d/STYLE.md`, `styles/horor_kampung/STYLE.md`, atau `styles/cerita_stik/STYLE.md`;
   - **naskah**, ditempel atau dikirim sebagai file .txt;
   - **file MP3**.
3. Salin prompt di bawah. Isi bagian dalam `[ ... ]`.

---

## Prompt

```
Buat video animasi vertikal 1080×1920 dari naskah dan audio MP3 yang saya lampirkan, mengikuti STYLE.md terlampir.

Gaya: [edukasi_3d / horor_kampung / cerita_stik]
Judul: [judul singkat, atau "pilihkan"]
Audio: [path file mp3]
Naskah: [tempel naskah di sini, atau path file .txt]

Ketentuan wajib:
1. Ikuti STYLE.md secara penuh: identitas visual, cara produksi, bahasa kamera, aturan animasi, dan jebakan yang harus dihindari. Jika STYLE.md bertentangan dengan kebiasaanmu, STYLE.md yang menang.
2. Sinkron dengan audio: pakai timing per kata dari Whisper. Setiap adegan, aksi, label/ikon, dan subtitle dikunci ke kata yang diucapkan, bukan ke detik perkiraan. Durasi video = durasi MP3.
3. Minimal 20 shot berbeda dan 50 momen visual yang benar-benar berbeda. Setiap momen harus menyampaikan informasi baru yang membuktikan kalimat yang sedang diucapkan. Tidak boleh ada gambar berulang atau shot yang hanya diam menunggu.
4. Kamera dan transisi harus halus dan profesional:
   - variasikan jarak (aerial/lebar, sedang, close-up detail, sudut rendah, top-down, POV, over-the-shoulder) sesuai fungsi tiap kalimat;
   - adegan yang menyambung memakai gerak kamera kontinu;
   - untuk edukasi_3d dan horor_kampung, pindah sudut memakai dissolve halus dan hindari hard cut;
   - untuk cerita_stik, potongan langsung boleh dipakai pada pergantian adegan seperti perpindahan dari cerita ke diagram;
   - hindari lompatan zoom, header/HUD yang berkedip, atau kamera yang menembus objek.
5. Detail animasi:
   - aksi utuh (persiapan → kejadian → akibat) dengan fisika yang masuk akal;
   - kontinuitas posisi dan keadaan antar-adegan;
   - dunia terasa hidup (tokoh kecil bergerak, partikel, riak, cahaya);
   - teks di layar terbaca dan tidak menabrak header atau subtitle.
6. Uji sendiri sebelum menyerahkan, dan ulangi sampai semua lolos:
   a. Render stills (minimal 2 frame per adegan), lalu periksa dengan mata. Perbaiki framing, oklusi, timing, dan HUD.
   b. Render penuh.
   c. Jalankan `python scripts/cek_halus.py <video> <render_plan.json>`. Perbaiki lonjakan tak disengaja. Untuk edukasi_3d hasilnya harus LULUS. Untuk horor_kampung, sisa lonjakan hanya boleh berupa kejutan yang disengaja tepat di kata pemicunya. Untuk cerita_stik, cocokkan setiap tanda lonjakan dengan batas potongan yang direncanakan dan periksa kedua frame yang mengapitnya.
   d. Cek teknis dengan ffprobe: 1080×1920, 30 fps, ada audio, durasi = MP3.
   e. Cek subtitle bersih (tanpa * atau markdown) dan judul tidak berkedip.
7. Serahkan:
   - MP4 final di folder project;
   - storyboard berupa tabel shot (nomor, waktu, judul layar, kamera, aksi/momen) dalam .md;
   - lembar keyframe .jpg yang diambil dari video final;
   - ringkasan jumlah shot dan momen;
   - hasil cek_halus.
   Sebutkan dengan jujur bagian yang belum sempurna.

Jangan berhenti di draf pertama. Iterasikan stills → perbaikan → render sampai kualitasnya sesuai referensi gaya terpilih (contoh edukasi_3d: [terusan_panama_v2.mp4](../Hasil%20Produksi/Edukasi/Terusan%20Panama/Video/terusan_panama_v2.mp4), cerita_stik: [pratinjau_cerita_stik.mp4](../Hasil%20Produksi/Demo%20Animasi/Cerita%20Stik/Video/pratinjau_cerita_stik.mp4)).
```

---

## Tips agar hasil maksimal

- **Naskah**: satu kalimat per baris. Tulis istilah persis seperti yang diucapkan di MP3 (angka sebagai kata bila diucapkan sebagai kata). Jangan pakai `*` untuk penekanan.
- **Audio**: MP3 bersih tanpa musik latar memberi timing per kata paling akurat.
- **Edukasi 3D**: sebutkan di prompt objek utama dan mekanisme yang harus terlihat, mis. "tunjukkan potongan mesin, aliran, dan angka penting". Topik baru akan dibuatkan dunia 3D khusus (template + builder), jadi butuh waktu lebih lama dari Telegram.
- **Horor kampung**: sebutkan tokoh (siapa, jenis) dan kapan hantu boleh muncul, mis. "hantu hanya muncul di 2 kalimat terakhir".
- **Cerita Stik**: sebutkan tokoh, benda yang dipegang, dan bagian yang perlu diperbesar menjadi diagram atau penampang.
- Untuk video cepat tanpa penyempurnaan manual, jalur Telegram (`/gaya` → kirim naskah + MP3) tetap bisa dipakai. Prompt ini untuk hasil kualitas tertinggi.
