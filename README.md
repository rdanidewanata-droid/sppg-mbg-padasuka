<<<<<<< HEAD
# sistem-mbg-app
=======
# Sistem Informasi Pelaksanaan Program Makan Bergizi Gratis (MBG)
### Satuan Pelayanan Program Gizi (SPPG) Padasuka 2 Cimahi Tengah
*Implementasi Proyek Penelitian Skripsi*

---

## 📌 Deskripsi Proyek
Aplikasi berbasis web untuk mendukung manajemen operasional terpadu pelaksanaan **Program Makan Bergizi Gratis (MBG)** di wilayah **SPPG Padasuka 2, Kecamatan Cimahi Tengah, Kota Cimahi**.

Sistem ini mengintegrasikan seluruh kanal distribusi (23 Sekolah/PAUD dan 18 Posyandu), mengelola presensi 47 relawan operasional dapur, mencatat formulasi siklus menu gizi harian, pengujian kualitas makanan (Uji Organoleptik skala 1-5), serta menyajikan laporan rekapitulasi resmi siap cetak berstandar Badan Gizi Nasional (BGN).

---

## 🚀 Teknologi Utama
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend**: Hono di Cloudflare Workers, TypeScript
- **Database**: Cloudflare D1 (SQLite) dengan integritas *Foreign Key Constraints*; skema di `migrations/`
- **Keamanan & Autentikasi**: JSON Web Token (JWT) + Hashing Password PBKDF2-SHA256 (Web Crypto)
- **Build Tool**: Vite 8, Wrangler & Concurrently

---

## 👥 Akun Demo Pengujian

| Peran (Role) | Username | Password | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin 123` *(ada spasi)* | CRUD Seluruh Data Master, Menu, Uji Organoleptik, Presensi, dan Laporan |
| **Kepala SPPG** | `kepala` | `kepala 123` | Monitoring Dashboard, Melihat Semua Data, Cetak Laporan (Read-only) |
| **Relawan** | `relawan01` | `relawan 123` | Presensi Mandiri (Catat Masuk & Pulang), Riwayat Presensi Sendiri |

---

## 📊 Metrik Statistik Database Riil
- **23 Sekolah / PAUD** di Cimahi Tengah (Jenjang PAUD, TK, SD, SMP)
- **18 Posyandu** (Mencakup RW 01 s/d RW 18 Kelurahan Padasuka)
- **47 Relawan** (Koordinator Dapur, Juru Masak, Pengemasan, Distribusi, QC, Kebersihan)
- **3.179 Total Sasaran Penerima Manfaat**:
  - Penerima dari Sekolah / PAUD: **1.358 Siswa** (42,7%)
  - Penerima dari Posyandu: **1.821 Jiwa** (Balita, Ibu Hamil, Ibu Menyusui) (57,3%)

---

## 📂 Fitur & Modul Aplikasi
1. **Autentikasi Lokal**: Halaman Login resmi dengan proteksi session dan selektor akun demo.
2. **Dashboard Interaktif**: 4 kartu statistik utama, grafik distribusi penerima, menu harian terkini, ringkasan uji organoleptik, dan informasi standar AKG MBG.
3. **Data Sekolah**: Pencarian, filter jenjang (PAUD, TK, SD, SMP), kontak kepsek, jumlah penerima, dan CRUD terlindungi relasi.
4. **Data Posyandu**: Pengelolaan pos pelayanan balita/ibu hamil RW 01 - 18 Kelurahan Padasuka.
5. **Data Relawan**: Pendataan 47 personel operasional SPPG beserta pembagian pos tugas.
6. **Data Penerima Manfaat**: Rincian profil siswa dan balita/ibu hamil lengkap dengan catatan alergi makanan.
7. **Menu Harian**: Siklus paket gizi harian (Contoh menu 6 April 2026: *Nasi, Chicken Katsu, Sapo Tahu, Mix Vegetable, Lengkeng*) terhubung ke uji organoleptik.
8. **Uji Organoleptik**: Form penilaian sensorik mutu makanan (Rasa, Aroma, Warna, Tekstur skala 1-5).
9. **Absensi Relawan**: Presensi mandiri relawan (Catat Masuk & Pulang) serta manajemen presensi bagi admin.
10. **Laporan & Cetak**: Cetak resmi Kop Surat SPPG Padasuka 2 Cimahi Tengah untuk 4 jenis laporan (Penerima Manfaat, Absensi, Menu, dan Uji Organoleptik).

---

## 💻 Cara Menjalankan Secara Lokal

1. **Clone repository:**
   ```bash
   git clone <URL_REPOSITORY_ANDA>
   cd sistem-mbg
   ```

2. **Install dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan Aplikasi (Backend API & Frontend Client bersamaan):**
   ```bash
   npm run dev
   ```

4. **Buka di Browser:**
   - Frontend Client: `http://localhost:5173`
   - Backend API: `http://localhost:5001/api`

---

## ☁️ Panduan Hosting Vercel
1. Hubungkan repository GitHub ini ke akun [Vercel](https://vercel.com).
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Konfigurasi SPA routing sudah disediakan otomatis pada file `vercel.json`.

---
*Dikembangkan untuk implementasi Skripsi Program Studi Sistem Informasi / Teknik Informatika.*
>>>>>>> a608e95 (Initial commit)


---

## ☁️ Menjalankan di Cloudflare Workers + D1

**Pengembangan lokal**
```bash
pnpm install
cp .dev.vars.example .dev.vars   # isi JWT_SECRET
pnpm db:migrate:local            # buat tabel + data seed di D1 lokal
pnpm dev                         # Worker API (:5001) + Vite (:5173)
```

**Deploy**
```bash
pnpm wrangler d1 create sistem-mbg      # salin database_id ke wrangler.jsonc
pnpm wrangler secret put JWT_SECRET
pnpm db:migrate:remote
pnpm deploy                             # build frontend + wrangler deploy
```

Data seed ada di `server/seed.ts`; setelah mengubahnya jalankan `pnpm db:seed:generate` untuk membuat ulang `migrations/0002_seed.sql`.
