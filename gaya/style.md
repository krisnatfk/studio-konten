# Referensi gaya animasi — edukasi_3d

Dokumen ini adalah referensi pendekatan visual, gerak, dan penyutradaraan untuk video edukasi pendek berbahasa Indonesia. Berikan kepada agen AI bersama brief, naskah, dan MP3 narasi. Konsep video dikembangkan dari naskah; referensi ini membantu menjaga nuansa animasi dan kualitas penyajiannya.

## Prinsip penggunaan: naskah menentukan konsep

Urutan pengambilan keputusan: **naskah dan brief → konsep adegan → karakter, objek, dan lingkungan yang relevan → penerapan gaya visual referensi**. Audio menentukan timing.

Karakter, pakaian, warna benda, lokasi, dan contoh aktivitas dalam dokumen ini adalah contoh implementasi awal. Semuanya dapat diganti sesuai cerita. Tokoh berbaju oranye dan bercaping, kampung, sawah, serta potongan tanah bukan unsur yang wajib muncul. Video boleh tanpa karakter manusia jika penjelasannya lebih tepat memakai objek, mesin, organisme, atau diagram 3D.

Yang diikuti adalah pendekatan animasi: bentuk 3D sederhana yang mudah dibaca, kedalaman diorama, material dan cahaya lembut, gerak yang menjelaskan proses, kamera terarah, serta teks yang jelas dan sinkron. Jaga konsistensi desain yang dipilih di dalam satu video; tidak perlu memakai tokoh atau latar yang sama untuk semua video.

Contoh adaptasi:

| Isi naskah | Konsep yang relevan dengan pendekatan visual serupa |
| --- | --- |
| Cara kerja jantung | Organ 3D sederhana, irisan ruang jantung, arah aliran darah; tidak perlu tokoh petani |
| Sistem tata surya | Planet, orbit, dan ruang angkasa; gunakan pencahayaan yang membuat objek jelas tanpa memaksakan langit siang |
| Cara kerja mesin | Mesin dan komponen 3D, potongan bagian dalam, animasi hubungan antarbagian |
| Pertumbuhan tanaman | Bibit, akar, tanah, dan air; tokoh manusia hanya jika membantu cerita |

## 1. Identitas visual

Animasi 3D sederhana bergaya diorama miniatur: lingkungan cerah, bentuk geometris bersih, warna alam hangat, bayangan lembut, dan gerakan yang memperlihatkan cara kerja sesuatu. Nuansanya penasaran, mudah dipahami, dan informatif. Penonton harus memahami penjelasan melalui kejadian dalam gambar, bukan hanya melalui teks.

Pendekatan visual yang menjadi acuan:

- Dunia 3D dengan kedalaman, permukaan benda, pencahayaan, dan bayangan yang jelas.
- Bentuk low-poly atau geometri sederhana dengan beberapa tepi membulat; tidak semua permukaan harus tampak bersudut tajam.
- Lingkungan dan subjek dipilih dari naskah; langit biru, karakter bercaping, dan kampung adalah contoh untuk topik yang sesuai.
- Penampang atau potongan bagian dalam dipakai jika membantu penjelasan, misalnya tanah, organ, atau mesin.
- Header krem terang, teks gelap tebal, dan kata penting pada bidang biru.
- Subtitle putih tebal bertepi gelap, muncul dalam kelompok pendek mengikuti suara.

Hindari perubahan ke gaya horor gelap, siluet hitam, fotorealisme, anime, gambar datar sebagai keseluruhan adegan, atau presentasi slide statis. Diagram dan ikon 2D boleh menjadi lapisan penjelas di atas dunia 3D.

## 2. Format dan komposisi

| Elemen | Acuan |
| --- | --- |
| Rasio | Vertikal 9:16 |
| Resolusi | 1080 × 1920 piksel |
| Frame rate | 30 fps; 60 fps bila diminta |
| Durasi | Mengikuti durasi MP3 final |
| Header | Area atas sekitar y=0–330; latar krem memudar ke transparan |
| Label babak | Sekitar x=58, y=96; teks kapital kecil |
| Judul adegan | Sekitar x=58, y=132; lebar maksimum 964 piksel |
| Subtitle | Sekitar x=50, y=1300; lebar 980 piksel |
| Watermark | Opsional, kanan bawah sekitar y=1820 |

Tata letak dan angka koordinat ini adalah contoh implementasi, dapat disesuaikan dengan kebutuhan konten dan brief. Angka koordinat mengacu pada kanvas 1080 × 1920. Skalakan proporsional bila resolusi berubah. Area penjelasan utama berada di antara header dan subtitle; lingkungan boleh memenuhi seluruh layar. Jangan biarkan tangan, alat, ujung tiang, atau bagian yang sedang dijelaskan tertutup header maupun subtitle. Periksa komposisi selama seluruh gerak kamera, bukan hanya pada satu frame. Sesuaikan batas aman tambahan dengan antarmuka platform tujuan.

## 3. Palet warna

Palet ini adalah contoh dari implementasi `edukasi_3d`, bukan kewajiban untuk setiap video. Sesuaikan warna karakter, pakaian, objek, dan latar dengan naskah; pertahankan keterbacaan serta harmoni warna. Biru-krem dapat dipakai sebagai acuan grafis judul, tetapi brief boleh menentukan palet lain yang tetap konsisten. Tampilan hasil render dapat berubah karena pencahayaan dan tone mapping.

| Fungsi | Warna |
| --- | --- |
| Biru penekanan judul, kata kunci | `#3157E8` |
| Garis luar bidang sorotan | `#A9BCFF` |
| Header krem | `#F6F2EA` |
| Teks judul | `#1B1B1D` |
| Teks label babak | `#5D5A55` |
| Subtitle | `#FFFFFF` |
| Tepi subtitle | `#17181C` |
| Peringatan | `#FFD23F` |
| Baju tokoh | `#F07A2C` |
| Celana tokoh | `#2B3552` |
| Kulit tokoh | `#C98A5B` |
| Caping | `#DCC58E` |
| Gradasi langit | `#2F7FD8` → `#5EA6EA` → `#A9D3F5` → `#D6ECFB` |
| Lapisan tanah kampung | `#3B2617`, `#6A4127`, `#B0552C`, `#D3A468`, `#8B5A36` |

Untuk latar permukiman atau alam, contoh pilihan warnanya adalah hijau alami untuk vegetasi, krem untuk dinding, dan warna genteng hangat. Biru penekanan digunakan untuk membantu perhatian, bukan mendominasi seluruh lingkungan.

## 4. Karakter dan properti

Tentukan kebutuhan tokoh dari naskah terlebih dahulu: profesi, usia, pakaian, alat, dan perannya harus relevan. Bila memakai manusia, bentuk sederhana dengan proporsi terbaca dan ekspresi seperlunya dapat menjadi acuan. Tokoh bercaping pada implementasi awal hanyalah contoh; desain dokter, siswa, teknisi, astronaut, hewan, atau subjek lain dapat dikembangkan sesuai cerita. Video yang berfokus pada organ, mesin, atau fenomena tidak harus memiliki tokoh. Pertahankan identitas dan proporsi tokoh yang sama saat muncul kembali dalam satu video.

Perhatikan kontak fisik:

- Kaki bertumpu pada permukaan; langkah tidak meluncur atau menembus tanah.
- Tangan menyentuh atau menggenggam alat saat menggunakannya.
- Cangkul menyentuh tanah saat menggali, dan tanah yang berpindah terlihat.
- Saat memanjat, tangan dan kaki bertumpu pada tiang atau anak tangga yang benar.
- Benda yang ditanam, diangkat, atau didorong mengikuti gerak pelaku secara masuk akal.
- Ukuran karakter, properti, dan lokasi tidak berubah tanpa penjelasan antarshot.

Material dominan matte dengan tekstur sederhana. Acuan engine: roughness sekitar 0,82 dan metalness 0 untuk material umum. Benda khusus boleh memakai karakter material berbeda jika diperlukan oleh penjelasan.

## 5. Lingkungan dan penampang bagian dalam

Pilih lingkungan dari isi naskah, lalu pertahankan kontinuitasnya hingga narasi berpindah tempat. Laboratorium, sekolah, pabrik, tubuh manusia, laut, dan ruang angkasa dapat menjadi latar sesuai kebutuhan. Daftar berikut adalah contoh latar yang tersedia pada engine saat ini, bukan batas konsep visual:

| Latar | Unsur utama |
| --- | --- |
| Kampung | Rumah genteng, pagar, pepohonan, kelapa atau pisang, tanah halaman |
| Sawah | Padi, pematang, gubuk, kelapa, pegunungan jauh |
| Kota | Gedung sederhana, jalan, lampu, pohon perkotaan |
| Bukit | Kontur hijau, pepohonan, tanah berlapis |

Untuk topik selain tanah, terapkan prinsip penampang yang sama pada bagian dalam organ, mesin, atau objek terkait. Bentuk serta warna mengikuti subjek yang dijelaskan.

Potongan tanah adalah salah satu contoh bidang irisan yang membuka bagian tertanam: pangkal tiang, akar, fondasi, pipa, air tanah, lubang, atau terowongan. Lapisan tanah menggunakan beberapa warna cokelat dengan variasi butiran dan retakan halus.

Objek yang sedang dijelaskan harus terlihat melalui irisan; jangan tertutup permukaan tanah yang opak. Sambungan antara bagian atas dan bawah permukaan harus jelas. Jangan memaksakan potongan tanah pada topik yang tidak membutuhkan bagian bawah permukaan.

## 6. Pencahayaan dan kamera

Gunakan pencahayaan lembut yang memperjelas bentuk, kedalaman, dan kontak objek. Untuk adegan luar ruang siang, acuan implementasinya adalah cahaya utama hangat dari atas dan samping dengan isian lembut. Sesuaikan kondisi cahaya untuk laboratorium, bawah air, ruang angkasa, atau konteks lain dari naskah; objek utama tetap mudah dibaca. Acuan engine memakai kamera perspektif dengan field of view sekitar 32°, bukan kamera ortografis murni.

| Jenis shot | Gerak yang disarankan |
| --- | --- |
| Pembuka | Shot lingkungan, kamera mendekat perlahan |
| Aktivitas | Medium atau close-up yang memperlihatkan kontak tubuh dan alat |
| Berjalan | Geser kiri atau kanan mengikuti aktivitas |
| Penjelasan bagian dalam | Kamera stabil, fokus pada bidang irisan |
| Detail benda | Close-up; putaran benda perlahan bila membantu |
| Melihat ke atas | Kamera naik mengikuti bagian yang disebut |
| Penutup | Kamera menjauh perlahan |

Perubahan kamera halus dan terarah. Hindari goyangan berlebihan, zoom mendadak, atau orbit yang menyembunyikan bagian penting. Depth of field lembut boleh dipakai pada detail, dengan objek penjelas tetap tajam.

## 7. Bahasa gerak dan penyutradaraan

Target durasi shot sekitar 2,5–6 detik; konfigurasi gaya menetapkan maksimum adegan 7 detik. Pergantian shot mengikuti perubahan ide atau langkah narasi. Jangan memecah kalimat secara sembarang demi mengejar jumlah shot.

Pola cerita yang dapat disesuaikan:

1. **Hook:** pertanyaan atau kejadian yang membuat penasaran.
2. **Aktivitas:** bagaimana sesuatu dilakukan atau bekerja.
3. **Masalah:** apa yang gagal atau menjadi pertanyaan.
4. **Penjelasan:** detail atau bagian dalam yang menunjukkan sebabnya.
5. **Solusi:** perubahan yang menyelesaikan masalah atau perbandingan.
6. **Kesimpulan:** inti pelajaran yang terlihat dan terdengar jelas.

Pola tersebut tidak wajib memuat masalah jika topiknya murni penjelasan. Semua narasi harus terwakili tanpa jeda adegan yang tidak disengaja atau tumpang tindih waktu.

Animasi memperlihatkan perubahan sebab-akibat: air mengalir, akar tumbuh, tanah terkikis, alat menyentuh benda, atau benda berpindah sesuai narasi. Jangan menambahkan kerusakan atau keruntuhan hanya untuk dramatisasi. Contoh: kata “lapuk” tidak otomatis berarti tiang harus langsung rubuh.

Acuan transisi engine adalah dissolve sekitar 0,32 detik, fade putih pembuka sekitar 0,45 detik, dan penutup sekitar 0,6 detik. Gerak kecil dan kemunculan teks boleh memakai easing lembut dengan pantulan ringan; hindari pantulan kartun pada semua benda.

## 8. Tipografi dan elemen penjelas

Gunakan Inter, Noto Sans, atau sans-serif serupa. Teks harus dirender sebagai teks yang benar-benar terbaca, bukan tulisan acak di dalam gambar hasil generatif.

- Label babak: sekitar 23 piksel, bobot 800, kapital, jarak huruf 3 piksel; titik biru kecil di kiri.
- Judul adegan: 2–5 kata, sekitar 54 piksel, bobot 800, warna gelap. Pertahankan judul pada beberapa shot dalam babak yang sama bila cocok.
- Kata kunci judul: putih di bidang biru dengan sudut membulat dan garis luar biru muda.
- Subtitle: sekitar 58–66 piksel, bobot 800, tepi gelap sekitar 11 piksel pada resolusi acuan.
- Pecah subtitle menjadi kelompok 1–3 kata; acuan engine membatasi kelompok sekitar 19 karakter bila memungkinkan, tanpa memotong kata.
- Kata yang diucapkan muncul atau menguat mengikuti timestamp audio; kemunculan boleh memakai pop kecil.
- Sorot kata penting yang benar-benar diucapkan dengan bidang biru. Kuning dipakai seperlunya untuk peringatan.
- Gunakan panah dan label dekat bagian yang ditunjuk. Titik ujung panah harus mengikuti objek saat kamera bergerak.
- Ikon sederhana dapat mewakili panas, listrik, air, uang, waktu, larangan, centang, atau silang.
- Angka besar dan perbandingan dua sisi hanya digunakan saat didukung naskah. Jangan membuat statistik atau ukuran baru.

## 9. Audio dan sinkronisasi

MP3 yang dilampirkan adalah narasi final, termasuk jika dibuat pengguna di ElevenLabs. Gunakan file tersebut langsung; tidak perlu koneksi atau panggilan API ElevenLabs, pembuatan ulang suara, ataupun permintaan API key.

Ukur durasi file yang sebenarnya. Cocokkan naskah dengan ucapan memakai transkripsi dan/atau alignment bila alat tersedia. Naskah menentukan ejaan subtitle; audio menentukan waktu ucapan. Jika keduanya berbeda secara material, laporkan bagian tersebut sebelum membuat perubahan isi. Jangan mengklaim timestamp presisi jika hanya memakai estimasi.

Kejadian, panah, label, dan kata sorot muncul ketika bagian terkait diucapkan. Hindari mengubah kecepatan atau pitch narasi demi menyesuaikan animasi. Musik bersifat opsional dan harus di bawah suara; konfigurasi engine memakai gain musik 0,16 sebagai titik awal, bukan target loudness universal. SFX singkat mendukung kontak atau kejadian, tanpa menutupi narasi. Narasi tetap bersih tanpa echo tambahan.

## 10. Pemakaian dalam proyek Horor Studio

Jika agen memiliki akses ke proyek ini, gunakan implementasi `edukasi_3d` sebagai referensi teknis dan titik awal. Karakter serta katalog bawaan menggambarkan kemampuan engine saat ini; keduanya bukan aturan kreatif yang mengharuskan semua naskah memakai dunia yang sama. Pilih `edukasi_3d` pada kolom **Gaya** di dashboard. Jangan memilih `horor_kampung` hanya karena nama proyeknya Horor Studio.

Referensi implementasi, relatif terhadap root proyek:

- `styles/edukasi_3d/style.json`: identitas gaya dan konfigurasi audio.
- `styles/edukasi_3d/page.html`: tata letak, tipografi, dan warna antarmuka video.
- `styles/edukasi_3d/scenes/10_runtime.js`: kamera, subtitle, transisi, dan render berdasarkan waktu.
- `styles/edukasi_3d/scenes/20_kit.js`: karakter, material, lingkungan, pencahayaan, dan HUD.
- `styles/edukasi_3d/scenes/30_templates.js`: implementasi adegan.
- `styles/edukasi_3d/catalog.json`: nama template, parameter, dan nilai yang didukung.

| Template engine | Fungsi |
| --- | --- |
| `pembuka` | Memperkenalkan lingkungan dan topik |
| `aktivitas` | Tokoh melakukan kegiatan |
| `bawah_tanah` | Memperlihatkan bagian tertanam atau proses di dalam tanah |
| `masalah` | Kejadian gagal yang memang disebut narasi |
| `detail` | Memperkenalkan benda dan bagiannya |
| `bandingkan` | Dua sisi untuk perbedaan atau pilihan |
| `angka` | Fakta atau ukuran yang ada dalam naskah |
| `penutup` | Kesimpulan dengan shot menjauh |

Aksi tokoh yang tersedia: `berdiri`, `jalan`, `gali`, `panjat`, `angkat`, `tanam`, `dorong`, `tunjuk`, `kaget`, `pikir`, `jongkok`, `lapor`. Baca katalog untuk parameter lengkap; jangan mengarang nama parameter. Nomor `*_cue` mengacu pada cue ucapan yang relevan, bukan detik sembarang.

Jika topik memerlukan karakter, lokasi, objek, atau aksi baru yang belum didukung, jelaskan keterbatasan engine. Tambahkan kemampuan tersebut jika brief mengizinkan. Jika tidak diizinkan, gunakan representasi alternatif hanya bila tetap menjelaskan naskah secara akurat; jika tidak ada alternatif yang memadai, laporkan kebutuhan aset atau implementasi baru. Jangan mengubah konsep menjadi cerita petani, tiang, atau kampung hanya untuk menyesuaikan katalog.

Jika bekerja di luar proyek ini, dokumen ini cukup sebagai arahan gaya untuk implementasi ulang. Kesamaan persis memerlukan kode/aset sumber atau contoh frame/video dari implementasi asli; dokumen teks saja tidak menjamin hasil identik.

## 11. Kriteria pemeriksaan hasil

- Konsep, karakter, objek, dan lingkungan dipilih berdasarkan naskah; contoh tokoh atau latar referensi tidak dipaksakan.
- Pendekatan diorama 3D, desain karakter yang dipilih, palet, dan tipografi konsisten sepanjang video.
- Setiap shot menjelaskan ucapan yang sedang terdengar.
- Setiap video memerlukan minimal 20 shot dan 50 momen visual berbeda, termasuk video pendek. Cocokkan gambar kunci dengan perubahan aksi, keadaan atau detail. Hitung hanya perubahan yang terlihat pada render.
- Bila memakai penampang, bagian dalam subjek terbuka dan terbaca; tidak tertutup dinding irisan.
- Tangan, kaki, alat, dan benda memiliki kontak yang masuk akal; tidak ada penetrasi mencolok.
- Objek utama tidak terpotong atau tertutup teks selama kamera bergerak.
- Subtitle benar, terbaca, dan mengikuti narasi; label serta kejadian tidak mendahului penjelasan secara mengganggu.
- Tidak ada klaim, statistik, atau kejadian tambahan yang mengubah isi naskah.
- Audio asli terdengar jelas sampai akhir; video tidak terpotong atau berakhir sebelum narasi.
- Periksa frame awal, tengah, akhir, dan saat interaksi penting pada setiap shot, lalu putar hasil video dengan audio.
- Laporkan kekurangan yang tersisa. Jika memakai alur proyek ini, hasil yang belum lolos pemeriksaan kualitas tetap dilabeli draft.
