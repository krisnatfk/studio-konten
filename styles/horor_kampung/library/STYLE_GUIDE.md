# Horor Kampung — panduan pustaka 2.0

Siluet tubuh tetap gelap dengan rim hangat, rumah kayu/panggung, dagangan lokal,
pepohonan, kabut dan warna bulan yang sama dengan katalog lama. Ukuran dunia
1080×1400 dipotong ke video vertikal: letakkan aksi utama di bagian tengah dan
jaga ruang subtitle. Benda kecil harus berukuran wajar terhadap telapak/lengan;
benda panjang harus mencapai permukaan kerjanya. Bayangan tidak menggantikan tokoh
biasa. Motor, ponsel dan listrik modern hanya untuk cerita yang mendukung eranya.

Koordinat aset: kotak lokal 200×200; `baseline` adalah titik dasar yang menyentuh
permukaan, `grip` titik genggaman dan `surface` bidang penyangga. Ukuran, pegangan,
dan kontak ditentukan per kegiatan. Jangan menaruh meja di atas meja atau
menggunakan bentuk manusia untuk mewakili benda. Gunakan rig manusia untuk manusia.

Gerak: persiapan → aksi → kontak/perubahan objek → penyelesaian. Kamera diam harus
tetap memperlihatkan aktivitas. Tempo ditentukan waktu audio, bukan nomor frame.
Transisi pose memakai envelope halus; gerak tangan memakai IK bila menyentuh alat,
orang lain atau benda. Transfer benda memiliki pemilik awal/akhir, bukan dua salinan.

Referensi berstatus `authored_pending_visual_review` belum layak menjadi contoh AI.
Hanya referensi yang cocok dengan hasil render, lolos penilaian visual dan pemeriksaan
teknis boleh diberi status `verified`. Catat versi sumber dan bukti pemeriksaannya.
Jangan menaikkan skor secara manual demi melewati ambang. Setelah aset atau renderer
berubah, lakukan pemeriksaan ulang sebelum menjadikannya contoh lagi.

Ekstensi: tambahkan satu resep dengan aksi yang berbeda, aset, contoh positif dan
negatif, lalu render klip enam detik. Variasi kamera/warna bukan template baru.
Simpan kegagalan sebagai draft; never mark an unreviewed clip as final.

## Koreografi deklaratif

`manifest.recipes[id].choreography` menyimpan latar, tokoh, objek, keyframe dan
aliran cairan. World pixel dipakai untuk koordinat koreografi; parameter latar
`scenery` mengikuti komposisi lama (persen). Keyframe `at` berada dalam0..1.
Titik `(100,200)` pada aset menjadi dasar objek; `grip_x/grip_y` menentukan titik
kontak. Objek dapat mengikuti tangan atau berpindah dari pemilik awal ke akhir.
Jangan memasang tangan pada objek yang sekaligus mengikuti tangan itu (siklus).

Interpolasi pose dilakukan sebelum IK. Pangkal lengan mengikuti rotasi bahu.
Pose meraih ke tanah mempertahankan panjang lengan; titik yang tetap tidak
terjangkau menjadi masalah teknis, bukan dipaksa lewat pemanjangan lengan.
`render(t)` menyelesaikan satu paint browser sebelum promise selesai agar capture
frame tidak membaca raster efek cahaya yang masih tertinggal setelah seek.

Contoh positif hanya layak diambil jika hash sumber template masih cocok dengan
bukti review. Perubahan template lain tidak membatalkan adegan yang tidak memakai
aset/koreografi tersebut, sedangkan perubahan rig atau aset bersama membatalkannya.
