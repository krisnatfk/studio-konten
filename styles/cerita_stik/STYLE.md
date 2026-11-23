# Cerita Stik

Kartun vertikal tentang orang kampung dan benda yang mereka gunakan. Tokoh berkepala bundar, berbaju warna solid dan berkaki garis tetap mudah dikenali saat kamera berpindah dari lapangan ke meja kerja atau ke bagian dalam tanah.

## Pembacaan tiga video

| Video | Momen yang menjadi acuan | Penerapan di studio |
| --- | --- | --- |
| Layang-layang · ssstik.io_1795279649269.mp4 · 91 detik | Sekitar detik 14, anak berponi menatap layangan dengan mulut melengkung turun. Babak berikutnya memperbesar kertas, lubang dan benang. Penjelasan angin beralih ke latar biru dan panah putih, lalu kembali ke lapangan lomba. | Kepala besar dengan alis dan mulut yang dapat berubah, tangan menempel pada gulungan, ekor bergoyang. Pilihan latihan, lomba dan menang menambahkan spanduk atau piala. |
| Kebun kelapa · ssstik.io_1795279406098.mp4 · 74,5 detik | Sekitar detik 14, tokoh berbaju hijau membaca buku di depan pagar bambu. Batang dekat kamera, kelapa di kejauhan, lalu sisipan buku dan akar memberi kedalaman yang berbeda. | Pohon berlapis dengan pelepah melengkung, bayangan dan bercak cahaya pada tanah merah. Pemuda dan tetua berpeci batik dapat memegang buah atau buku. Sisipan menampilkan catatan dan serabut akar. |
| Biogas · SaveClip.App_AQOelNWkiCgIg… · 89 detik | Sekitar detik 14, hujan melintas di depan pekerja dan lubang. Saat tangki muncul, penampang tetap memperlihatkan batas halaman. Warna ungu, gelembung, pipa dan label singkat menunjukkan perubahan sebelum kamera pindah ke kompor. | Lubang dengan tangga, pekerja berhelm, tangki bertahap, serpihan organik, mikroba, aliran gas dan nyala biru. Label proses bisa menggantikan subtitle. |

## Karakter, warna dan komposisi

- Pakai bingkai 9:16. Sisakan ruang di atas kepala untuk langit, layangan, atau label proses. Pada penampang, garis permukaan tetap terlihat saat fokus berpindah ke bawah.
- Kepala berupa lingkaran sedikit lonjong, hampir selebar bahu dan kedua lengan saat diam. Baju berisi dengan garis tepi tinta gelap. Lengan menekuk di siku, kaki tipis berakhir pada tapak pendek dan bayangan menyentuh tanah.
- Pilih tokoh melalui `tokoh`. Anak berbaju kuning, petani bercaping, pemuda berbaju hijau toska, tetua berpeci batik, warga berbaju biru, pekerja berhelm, dan ibu berkonde memiliki siluet yang berbeda. Pertahankan pilihan untuk tokoh yang sama sepanjang cerita.
- Gunakan `ekspresi` untuk senang, cemas, kaget atau bicara. Untuk dialog dua orang, gunakan `teman`. Pasangkan `baca` dengan buku, `pegang` dengan bibit atau kelapa, dan `angkat` dengan gulungan.
- Pakai tinta cokelat gelap, kertas layangan merah gading, daun hijau zaitun, tanah oker, serta langit biru. Di kebun, variasi warna batang dan warna tanah membedakan jarak. Di tangki, ungu menunjukkan ruang gas. Gunakan panah terang pada diagram angin.

## Memilih adegan

| Template | Pemakaian |
| --- | --- |
| `halaman` | Percakapan atau aktivitas umum. Atur latar, waktu, cuaca, benda dan pendamping. Tambahkan bentuk lokal dengan `kustom` bila cerita membutuhkan properti khusus. |
| `meja_kerja` | Perlihatkan rangka dan kertas di bengkel. Aktifkan lubang atau ubah aksi menjadi angkat untuk menunjukkan hasil. |
| `layang_layang` | Terbang atau jatuh. Benang menghubungkan tangan dengan layangan. Parameter `acara` mengatur latihan, lomba atau menang. |
| `diagram_angin` | Bandingkan permukaan rapat dengan berlubang. Gunakan satu adegan per kondisi agar arah panah dan perubahan pusat kertas jelas. |
| `kebun_kelapa` | Tokoh berjalan atau memeriksa buah dan buku di kebun. Pilih ekspresi serta barang di tangan. |
| `catatan` | Buku terbuka menampilkan satu sketsa dan catatan pendek dari naskah. |
| `akar_kelapa` | Perlihatkan serabut akar dan gerak air atau mineral dalam penampang. |
| `tangki` | Urutkan tahap yang disebut dalam narasi. Pilih lubang, isi, tertutup, terurai, gas atau aliran. |
| `dapur` | Panci di atas kompor sebagai akibat dari aliran gas. Ubah `nyala` untuk membandingkan kondisi sebelum dan sesudah. |

## Grafik dan ritme gerak

Subtitle cerita muncul satu kata pada sekitar dua pertiga tinggi layar. Huruf tebal berwarna putih gading dengan tepi tinta, dialog memakai aksen kuning. Renderer mengikuti waktu kata dari studio. Bila waktu kata belum tersedia, renderer membagi durasi cue secara merata.

Untuk diagram pilih label kapital pendek dalam kapsul bertepi gelap. Pilih kuning untuk langkah, ungu untuk gas, biru untuk air atau arah aliran, jingga untuk peringatan. `label_cue` dan `pemicu` mengunci kemunculan label ke kata tertentu. Pakai `subtitel: false` ketika label sudah menjelaskan satu tahap.

Utamakan gerak yang menjelaskan kejadian. Tangan harus mencapai benda, layangan terangkat sebelum benangnya tegang, dan gelembung bergerak menuju ruang gas. Perpindahan dari cerita ke diagram boleh memakai potongan langsung seperti pada referensi. Di dalam satu pengambilan gunakan dorongan kamera kecil, gerak daun dan kedipan. Untuk properti tambahan, koordinat `kustom` memakai bidang 540 × 960 yang dirender dua kali lipat.

## Memakai gaya

Pilih `cerita_stik` pada daftar gaya di web studio, kirim `/gaya cerita_stik` di Telegram, atau pakai `--gaya cerita_stik` pada CLI. [Tonton pratinjau dengan narasi contoh](../../pratinjau_cerita_stik.mp4).
