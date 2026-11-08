TASKNOTE — PANDUAN PEMASANGAN (Bahasa Indonesia)
================================================

ISI PAKET
- index.html, styles.css, app.js: aplikasi web
- supabase-config.js: konfigurasi koneksi Supabase
- supabase-schema.sql: struktur database + keamanan RLS
- manifest.webmanifest, service-worker.js, icons/: dukungan PWA

LANGKAH 1 — BUAT PROJECT SUPABASE
1. Buka https://supabase.com/ lalu buat project baru.
2. Di Authentication > Providers, aktifkan Email.
3. Untuk penggunaan nyata, biarkan konfirmasi email aktif.
4. Buka SQL Editor, tempel seluruh isi supabase-schema.sql, lalu jalankan.
5. Buka Project Settings > API.
6. Salin Project URL dan anon/public key.

LANGKAH 2 — HUBUNGKAN TASKNOTE
1. Buka file supabase-config.js.
2. Ganti https://PROJECT-REF.supabase.co dengan Project URL milikmu.
3. Ganti PASTE_SUPABASE_ANON_KEY_HERE dengan anon/public key.
4. Jangan pernah memasukkan service_role key ke frontend.

LANGKAH 3 — PUBLIKASIKAN DI GITHUB PAGES
1. Buat repository GitHub baru.
2. Unggah semua file dan folder dari paket ini, dengan index.html di root repository.
3. Di Settings > Pages, pilih Deploy from a branch.
4. Pilih branch main dan folder /(root), lalu Save.
5. Tunggu proses deployment selesai dan buka URL Pages.

LANGKAH 4 — INSTAL SEBAGAI APLIKASI
- Android: buka URL TaskNote di Chrome, pilih Install app / Add to Home screen.
- Windows: buka URL di Chrome atau Edge, gunakan ikon Install di address bar atau tombol Instal di aplikasi.
- iPhone/iPad: buka di Safari > Share > Add to Home Screen.
- PWA memerlukan HTTPS (GitHub Pages sudah menyediakan HTTPS).

CATATAN PENTING
- Ini adalah starter versi pertama. Login, pendaftaran, pengelolaan tugas, mata pelajaran, backup JSON, tema, dan instalasi PWA disediakan.
- Tugas dan mata pelajaran disimpan di Supabase, terpisah per akun menggunakan Row Level Security.
- Offline: shell aplikasi dapat dibuka setelah aset berhasil dicache; operasi login dan sinkronisasi tugas tetap memerlukan internet.
- Email confirmation: jika diaktifkan, pengguna perlu mengonfirmasi email sebelum dapat login.
- Untuk pengembangan produksi, atur URL redirect/ Site URL di Supabase Authentication > URL Configuration ke alamat GitHub Pages.
- Google Fonts dan CDN Supabase memerlukan koneksi internet. Untuk offline penuh, library dan font perlu di-host secara lokal.
- Impor backup menambahkan tugas baru, tidak menghapus tugas yang sudah ada.
- Tidak ada kode iklan atau SDK iklan di aplikasi ini.

Jika halaman menampilkan pesan konfigurasi Supabase belum diisi, periksa kembali supabase-config.js.
