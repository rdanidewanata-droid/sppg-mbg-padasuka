-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('Administrator', 'Kepala SPPG', 'Relawan')),
  no_telepon TEXT,
  alamat TEXT,
  status TEXT DEFAULT 'Aktif' CHECK(status IN ('Aktif', 'Nonaktif')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sekolah
CREATE TABLE IF NOT EXISTS sekolah (
  id_sekolah INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_sekolah TEXT NOT NULL,
  npsn TEXT,
  jenjang TEXT NOT NULL CHECK(jenjang IN ('PAUD', 'TK', 'SD', 'SMP')),
  alamat TEXT NOT NULL,
  nama_kontak TEXT,
  no_telepon TEXT,
  jumlah_penerima INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'Aktif' CHECK(status IN ('Aktif', 'Nonaktif')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. Posyandu
CREATE TABLE IF NOT EXISTS posyandu (
  id_posyandu INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_posyandu TEXT NOT NULL,
  rw TEXT NOT NULL,
  kelurahan TEXT DEFAULT 'Padasuka',
  ketua_posyandu TEXT NOT NULL,
  no_telepon TEXT,
  jumlah_penerima INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'Aktif' CHECK(status IN ('Aktif', 'Nonaktif')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. Relawan
CREATE TABLE IF NOT EXISTS relawan (
  id_relawan INTEGER PRIMARY KEY AUTOINCREMENT,
  id_user INTEGER,
  nama_relawan TEXT NOT NULL,
  nik TEXT,
  no_telepon TEXT,
  alamat TEXT,
  tugas_posisi TEXT NOT NULL,
  status TEXT DEFAULT 'Aktif' CHECK(status IN ('Aktif', 'Nonaktif')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_user) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Penerima Manfaat
CREATE TABLE IF NOT EXISTS penerima_manfaat (
  id_penerima INTEGER PRIMARY KEY AUTOINCREMENT,
  tipe TEXT NOT NULL CHECK(tipe IN ('Sekolah', 'Posyandu')),
  id_sekolah INTEGER,
  id_posyandu INTEGER,
  nama_penerima TEXT NOT NULL,
  kategori TEXT NOT NULL,
  kelas_atau_usia TEXT,
  jenis_kelamin TEXT NOT NULL CHECK(jenis_kelamin IN ('L', 'P')),
  alergi_pantangan TEXT DEFAULT 'Tidak Ada',
  status TEXT DEFAULT 'Aktif' CHECK(status IN ('Aktif', 'Nonaktif')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_sekolah) REFERENCES sekolah(id_sekolah) ON DELETE RESTRICT,
  FOREIGN KEY (id_posyandu) REFERENCES posyandu(id_posyandu) ON DELETE RESTRICT
);

-- 6. Menu Harian
CREATE TABLE IF NOT EXISTS menu_harian (
  id_menu INTEGER PRIMARY KEY AUTOINCREMENT,
  tanggal TEXT NOT NULL,
  nama_menu TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 7. Uji Organoleptik
CREATE TABLE IF NOT EXISTS uji_organoleptik (
  id_uji INTEGER PRIMARY KEY AUTOINCREMENT,
  id_menu INTEGER NOT NULL,
  tanggal TEXT NOT NULL,
  warna INTEGER NOT NULL CHECK(warna BETWEEN 1 AND 5),
  aroma INTEGER NOT NULL CHECK(aroma BETWEEN 1 AND 5),
  rasa INTEGER NOT NULL CHECK(rasa BETWEEN 1 AND 5),
  tekstur INTEGER NOT NULL CHECK(tekstur BETWEEN 1 AND 5),
  keterangan TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_menu) REFERENCES menu_harian(id_menu) ON DELETE RESTRICT
);

-- 8. Absensi Relawan
CREATE TABLE IF NOT EXISTS absensi (
  id_absensi INTEGER PRIMARY KEY AUTOINCREMENT,
  id_relawan INTEGER NOT NULL,
  tanggal TEXT NOT NULL,
  waktu_masuk TEXT,
  waktu_pulang TEXT,
  status TEXT NOT NULL CHECK(status IN ('Hadir', 'Izin', 'Sakit', 'Alpa')),
  keterangan TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_relawan) REFERENCES relawan(id_relawan) ON DELETE RESTRICT
);
