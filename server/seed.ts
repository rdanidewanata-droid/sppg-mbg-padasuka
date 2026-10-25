import { hashPassword } from './password';

// Minimal surface of a database needed to seed it. The generator script
// (scripts/generate-seed.ts) implements it by writing SQL statements instead of
// executing them, so the seed data lives in one place and ships as a D1 migration.
export interface SeedDb {
  prepare(sql: string): { run(...params: (string | number | null)[]): { lastInsertRowid: number } };
}

export async function seedData(db: SeedDb) {
  // Notice: password "admin 123", "kepala 123", "relawan 123"
  const adminPasswordHash = await hashPassword('admin 123');
  const kepalaPasswordHash = await hashPassword('kepala 123');
  const relawanPasswordHash = await hashPassword('relawan 123');

  const insertUser = db.prepare(`
    INSERT INTO users (nama, username, password, role, no_telepon, alamat, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    'Drs. H. Hendra Setiawan, M.Si',
    'admin',
    adminPasswordHash,
    'Administrator',
    '081223344550',
    'Jl. Padasuka Mandiri No. 12, Cimahi Tengah',
    'Aktif'
  );

  insertUser.run(
    'Dr. Hj. Ratna Juwita, M.Pd',
    'kepala',
    kepalaPasswordHash,
    'Kepala SPPG',
    '081334455660',
    'Jl. Pojok Utara No. 45, Cimahi Tengah',
    'Aktif'
  );

  const relawanUserResult = insertUser.run(
    'Siti Aminah, S.Sos',
    'relawan01',
    relawanPasswordHash,
    'Relawan',
    '081556677881',
    'RW 04 Kelurahan Padasuka, Cimahi Tengah',
    'Aktif'
  );

  // 2. SEED SEKOLAH (EXACTLY 23 SEKOLAH / PAUD, SUM = 1.358)
  const insertSekolah = db.prepare(`
    INSERT INTO sekolah (nama_sekolah, npsn, jenjang, alamat, nama_kontak, no_telepon, jumlah_penerima, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sekolahList = [
    { nama: 'SDN Padasuka Mandiri 1', npsn: '20224101', jenjang: 'SD', alamat: 'Jl. Padasuka No. 15', kontak: 'Budi Santoso, S.Pd', telp: '08122001001', penerima: 115 },
    { nama: 'SDN Padasuka Mandiri 2', npsn: '20224102', jenjang: 'SD', alamat: 'Jl. Padasuka No. 17', kontak: 'Endang Suryana, M.Pd', telp: '08122001002', penerima: 120 },
    { nama: 'SDN Padasuka Mandiri 3', npsn: '20224103', jenjang: 'SD', alamat: 'Jl. Babakan No. 8', kontak: 'Hj. Nurlaila, S.Pd', telp: '08122001003', penerima: 95 },
    { nama: 'SDN Padasuka Mandiri 4', npsn: '20224104', jenjang: 'SD', alamat: 'Jl. Babakan No. 10', kontak: 'Asep Supriatna, S.Pd', telp: '08122001004', penerima: 88 },
    { nama: 'SDN Cimahi Mandiri 1', npsn: '20224105', jenjang: 'SD', alamat: 'Jl. Rd. Demang Hardjakusumah', kontak: 'Dra. Sri Wahyuni', telp: '08122001005', penerima: 105 },
    { nama: 'SDN Cimahi Mandiri 2', npsn: '20224106', jenjang: 'SD', alamat: 'Jl. Pasirkaliki No. 22', kontak: 'Yayan Ruhian, M.Pd', telp: '08122001006', penerima: 92 },
    { nama: 'SDN Baros Mandiri 3', npsn: '20224107', jenjang: 'SD', alamat: 'Jl. Baros Utama No. 4', kontak: 'Dewi Kartika, S.Pd', telp: '08122001007', penerima: 80 },
    { nama: 'SDN Karangmekar Mandiri 1', npsn: '20224108', jenjang: 'SD', alamat: 'Jl. Karangmekar No. 3', kontak: 'Cecep Sudrajat, S.Pd', telp: '08122001008', penerima: 74 },
    { nama: 'SMPN 3 Cimahi', npsn: '20224201', jenjang: 'SMP', alamat: 'Jl. Raden Saleh No. 3', kontak: 'Drs. H. Mamat Slamet', telp: '08122001009', penerima: 110 },
    { nama: 'SMP Pasundan Cimahi', npsn: '20224202', jenjang: 'SMP', alamat: 'Jl. Mahar Martanegara', kontak: 'Deden Koswara, M.Pd', telp: '08122001010', penerima: 65 },
    { nama: 'SMP PGRI Cimahi', npsn: '20224203', jenjang: 'SMP', alamat: 'Jl. Kebon Jeruk No. 12', kontak: 'Ai Sumarni, S.Pd', telp: '08122001011', penerima: 55 },
    { nama: 'PAUD Melati Indah Padasuka', npsn: '69871001', jenjang: 'PAUD', alamat: 'RW 02 Padasuka', kontak: 'Ibu Rina Sugiarti', telp: '08122001012', penerima: 32 },
    { nama: 'PAUD Kasih Bunda RW 03', npsn: '69871002', jenjang: 'PAUD', alamat: 'RW 03 Padasuka', kontak: 'Ibu Wati Komalasari', telp: '08122001013', penerima: 28 },
    { nama: 'PAUD Ceria Padasuka', npsn: '69871003', jenjang: 'PAUD', alamat: 'RW 05 Padasuka', kontak: 'Ibu Tati Rohaeti', telp: '08122001014', penerima: 30 },
    { nama: 'PAUD Tunas Bangsa RW 07', npsn: '69871004', jenjang: 'PAUD', alamat: 'RW 07 Padasuka', kontak: 'Ibu Eni Rohaeni', telp: '08122001015', penerima: 25 },
    { nama: 'PAUD Pelangi Harapan', npsn: '69871005', jenjang: 'PAUD', alamat: 'RW 09 Padasuka', kontak: 'Ibu Lilis Suryani', telp: '08122001016', penerima: 26 },
    { nama: 'TK Kencana Padasuka', npsn: '69871006', jenjang: 'TK', alamat: 'Jl. Padasuka Barat No. 5', kontak: 'Ibu Dini Anggraeni', telp: '08122001017', penerima: 35 },
    { nama: 'TK Aisyiyah Bustanul Athfal', npsn: '69871007', jenjang: 'TK', alamat: 'Jl. Pojok Tengah No. 14', kontak: 'Hj. Euis Solihat, S.Pd.I', telp: '08122001018', penerima: 42 },
    { nama: 'TK Al-Hidayah Cimahi', npsn: '69871008', jenjang: 'TK', alamat: 'Jl. Sisingamangaraja No. 9', kontak: 'Ibu Farida Aryani', telp: '08122001019', penerima: 38 },
    { nama: 'TK Kartika Siliwangi', npsn: '69871009', jenjang: 'TK', alamat: 'Komp. Brigif 15 Kujang', kontak: 'Ibu Titin Fatimah', telp: '08122001020', penerima: 40 },
    { nama: 'POS PAUD Mawar RW 11', npsn: '69871010', jenjang: 'PAUD', alamat: 'RW 11 Padasuka', kontak: 'Ibu Yuliana', telp: '08122001021', penerima: 22 },
    { nama: 'POS PAUD Teratai RW 14', npsn: '69871011', jenjang: 'PAUD', alamat: 'RW 14 Padasuka', kontak: 'Ibu Nunung Nurjanah', telp: '08122001022', penerima: 20 },
    { nama: 'TK Pertiwi Cimahi', npsn: '69871012', jenjang: 'TK', alamat: 'Jl. Raden Demang Hardjakusumah', kontak: 'Ibu Ratna Dewi', telp: '08122001023', penerima: 21 },
  ];

  sekolahList.forEach(s => {
    insertSekolah.run(s.nama, s.npsn, s.jenjang, s.alamat, s.kontak, s.telp, s.penerima, 'Aktif');
  });

  // 3. SEED POSYANDU (EXACTLY 18 POSYANDU, SUM = 1.821)
  const insertPosyandu = db.prepare(`
    INSERT INTO posyandu (nama_posyandu, rw, kelurahan, ketua_posyandu, no_telepon, jumlah_penerima, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const posyanduList = [
    { nama: 'Posyandu Melati RW 01', rw: 'RW 01', ketua: 'Ibu Kokom Komariah', telp: '08132002001', penerima: 102 },
    { nama: 'Posyandu Mawar RW 02', rw: 'RW 02', ketua: 'Ibu Imas Masitoh', telp: '08132002002', penerima: 115 },
    { nama: 'Posyandu Anggrek RW 03', rw: 'RW 03', ketua: 'Ibu Siti Khodijah', telp: '08132002003', penerima: 98 },
    { nama: 'Posyandu Dahlia RW 04', rw: 'RW 04', ketua: 'Ibu Ani Sumarni', telp: '08132002004', penerima: 110 },
    { nama: 'Posyandu Flamboyan RW 05', rw: 'RW 05', ketua: 'Ibu Nenden Jubaedah', telp: '08132002005', penerima: 95 },
    { nama: 'Posyandu Cempaka RW 06', rw: 'RW 06', ketua: 'Ibu Rosita Hendrayani', telp: '08132002006', penerima: 105 },
    { nama: 'Posyandu Kenanga RW 07', rw: 'RW 07', ketua: 'Ibu Mamah Rohimah', telp: '08132002007', penerima: 92 },
    { nama: 'Posyandu Teratai RW 08', rw: 'RW 08', ketua: 'Ibu Entin Rustini', telp: '08132002008', penerima: 120 },
    { nama: 'Posyandu Bougenville RW 09', rw: 'RW 09', ketua: 'Ibu Neneng Hasanah', telp: '08132002009', penerima: 88 },
    { nama: 'Posyandu Kamboja RW 10', rw: 'RW 10', ketua: 'Ibu Yuyun Yuningsih', telp: '08132002010', penerima: 114 },
    { nama: 'Posyandu Nusa Indah RW 11', rw: 'RW 11', ketua: 'Ibu Teti Rostika', telp: '08132002011', penerima: 96 },
    { nama: 'Posyandu Asoka RW 12', rw: 'RW 12', ketua: 'Ibu Lina Marlina', telp: '08132002012', penerima: 104 },
    { nama: 'Posyandu Wijayakusuma RW 13', rw: 'RW 13', ketua: 'Ibu Popon Rostini', telp: '08132002013', penerima: 90 },
    { nama: 'Posyandu Sedap Malam RW 14', rw: 'RW 14', ketua: 'Ibu Maryati Sulaeman', telp: '08132002014', penerima: 112 },
    { nama: 'Posyandu Edelweiss RW 15', rw: 'RW 15', ketua: 'Ibu Dadah Jubaedah', telp: '08132002015', penerima: 86 },
    { nama: 'Posyandu Tulip RW 16', rw: 'RW 16', ketua: 'Ibu Siti Sarah', telp: '08132002016', penerima: 108 },
    { nama: 'Posyandu Sakura RW 17', rw: 'RW 17', ketua: 'Ibu Yayah Rokayah', telp: '08132002017', penerima: 94 },
    { nama: 'Posyandu Lavender RW 18', rw: 'RW 18', ketua: 'Ibu Cucun Cundari', telp: '08132002018', penerima: 92 },
  ];

  posyanduList.forEach(p => {
    insertPosyandu.run(p.nama, p.rw, 'Padasuka', p.ketua, p.telp, p.penerima, 'Aktif');
  });

  // 4. SEED RELAWAN (EXACTLY 47 RELAWAN)
  const insertRelawan = db.prepare(`
    INSERT INTO relawan (id_user, nama_relawan, nik, no_telepon, alamat, tugas_posisi, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const relawanNames = [
    { nama: 'Siti Aminah, S.Sos', nik: '3277015504950001', telp: '081556677881', alamat: 'RW 04 Kelurahan Padasuka', posisi: 'Quality Control', userId: Number(relawanUserResult.lastInsertRowid) },
    { nama: 'Agus Setiawan', nik: '3277011208900002', telp: '081234500002', alamat: 'RW 01 Kelurahan Padasuka', posisi: 'Koordinator Dapur', userId: null },
    { nama: 'Rina Maryana', nik: '3277014502880003', telp: '081234500003', alamat: 'RW 02 Kelurahan Padasuka', posisi: 'Koordinator Dapur', userId: null },
    { nama: 'Bambang Irawan', nik: '3277012306910004', telp: '081234500004', alamat: 'RW 03 Kelurahan Padasuka', posisi: 'Koordinator Dapur', userId: null },
    { nama: 'Hj. Ai Komariah', nik: '3277016503850005', telp: '081234500005', alamat: 'RW 04 Kelurahan Padasuka', posisi: 'Juru Masak', userId: null },
    { nama: 'Dedah Jubaedah', nik: '3277015207860006', telp: '081234500006', alamat: 'RW 05 Kelurahan Padasuka', posisi: 'Juru Masak', userId: null },
    { nama: 'Eni Kurniasih', nik: '3277014409890007', telp: '081234500007', alamat: 'RW 06 Kelurahan Padasuka', posisi: 'Juru Masak', userId: null },
    { nama: 'Cicih Rohaeti', nik: '3277015011870008', telp: '081234500008', alamat: 'RW 07 Kelurahan Padasuka', posisi: 'Juru Masak', userId: null },
    { nama: 'Tuti Alawiyah', nik: '3277016001920009', telp: '081234500009', alamat: 'RW 08 Kelurahan Padasuka', posisi: 'Juru Masak', userId: null },
    { nama: 'Lilis Karlina', nik: '3277014804900010', telp: '081234500010', alamat: 'RW 09 Kelurahan Padasuka', posisi: 'Juru Masak', userId: null },
    { nama: 'Yati Mulyati', nik: '3277015908880011', telp: '081234500011', alamat: 'RW 10 Kelurahan Padasuka', posisi: 'Juru Masak', userId: null },
    { nama: 'Maman Suratman', nik: '3277011905840012', telp: '081234500012', alamat: 'RW 11 Kelurahan Padasuka', posisi: 'Juru Masak', userId: null },
    { nama: 'Nunung Nurhayati', nik: '3277014312890013', telp: '081234500013', alamat: 'RW 12 Kelurahan Padasuka', posisi: 'Juru Masak', userId: null },
    { nama: 'Ratna Juwita Sari', nik: '3277016109930014', telp: '081234500014', alamat: 'RW 13 Kelurahan Padasuka', posisi: 'Juru Masak', userId: null },
    { nama: 'Suryadi Kusuma', nik: '3277012502860015', telp: '081234500015', alamat: 'RW 14 Kelurahan Padasuka', posisi: 'Juru Masak', userId: null },
    { nama: 'Kokom Komalasari', nik: '3277015403870016', telp: '081234500016', alamat: 'RW 15 Kelurahan Padasuka', posisi: 'Juru Masak', userId: null },
    { nama: 'Nia Kurniawati', nik: '3277016206910017', telp: '081234500017', alamat: 'RW 16 Kelurahan Padasuka', posisi: 'Juru Masak', userId: null },
    { nama: 'Wawan Gunawan', nik: '3277011508850018', telp: '081234500018', alamat: 'RW 17 Kelurahan Padasuka', posisi: 'Juru Masak', userId: null },
    { nama: 'Dini Fitriani', nik: '3277014810940019', telp: '081234500019', alamat: 'RW 01 Kelurahan Padasuka', posisi: 'Petugas Pengemasan', userId: null },
    { nama: 'Rika Sartika', nik: '3277015112950020', telp: '081234500020', alamat: 'RW 02 Kelurahan Padasuka', posisi: 'Petugas Pengemasan', userId: null },
    { nama: 'Mira Rostika', nik: '3277016701960021', telp: '081234500021', alamat: 'RW 03 Kelurahan Padasuka', posisi: 'Petugas Pengemasan', userId: null },
    { nama: 'Dewi Sartika', nik: '3277014903930022', telp: '081234500022', alamat: 'RW 04 Kelurahan Padasuka', posisi: 'Petugas Pengemasan', userId: null },
    { nama: 'Gina Sonia', nik: '3277015705970023', telp: '081234500023', alamat: 'RW 05 Kelurahan Padasuka', posisi: 'Petugas Pengemasan', userId: null },
    { nama: 'Fitri Handayani', nik: '3277016307950024', telp: '081234500024', alamat: 'RW 06 Kelurahan Padasuka', posisi: 'Petugas Pengemasan', userId: null },
    { nama: 'Anisa Rahmawati', nik: '3277015009960025', telp: '081234500025', alamat: 'RW 07 Kelurahan Padasuka', posisi: 'Petugas Pengemasan', userId: null },
    { nama: 'Nenden Suhartini', nik: '3277014611920026', telp: '081234500026', alamat: 'RW 08 Kelurahan Padasuka', posisi: 'Petugas Pengemasan', userId: null },
    { nama: 'Popi Novitasari', nik: '3277015802980027', telp: '081234500027', alamat: 'RW 09 Kelurahan Padasuka', posisi: 'Petugas Pengemasan', userId: null },
    { nama: 'Intan Permata', nik: '3277016404970028', telp: '081234500028', alamat: 'RW 10 Kelurahan Padasuka', posisi: 'Petugas Pengemasan', userId: null },
    { nama: 'Resti Rahayu', nik: '3277015106950029', telp: '081234500029', alamat: 'RW 11 Kelurahan Padasuka', posisi: 'Petugas Pengemasan', userId: null },
    { nama: 'Tia Monica', nik: '3277016908990030', telp: '081234500030', alamat: 'RW 12 Kelurahan Padasuka', posisi: 'Petugas Pengemasan', userId: null },
    { nama: 'Dadan Ramdani', nik: '3277011401910031', telp: '081234500031', alamat: 'RW 13 Kelurahan Padasuka', posisi: 'Tim Distribusi', userId: null },
    { nama: 'Hendri Kurniawan', nik: '3277012003920032', telp: '081234500032', alamat: 'RW 14 Kelurahan Padasuka', posisi: 'Tim Distribusi', userId: null },
    { nama: 'Rudi Hermawan', nik: '3277011805900033', telp: '081234500033', alamat: 'RW 15 Kelurahan Padasuka', posisi: 'Tim Distribusi', userId: null },
    { nama: 'Fajar Nugraha', nik: '3277012207940034', telp: '081234500034', alamat: 'RW 16 Kelurahan Padasuka', posisi: 'Tim Distribusi', userId: null },
    { nama: 'Ahmad Sofyan', nik: '3277011109930035', telp: '081234500035', alamat: 'RW 17 Kelurahan Padasuka', posisi: 'Tim Distribusi', userId: null },
    { nama: 'Rizki Maulana', nik: '3277011911950036', telp: '081234500036', alamat: 'RW 18 Kelurahan Padasuka', posisi: 'Tim Distribusi', userId: null },
    { nama: 'Iman Firmansyah', nik: '3277012802910037', telp: '081234500037', alamat: 'RW 01 Kelurahan Padasuka', posisi: 'Tim Distribusi', userId: null },
    { nama: 'Bayu Saputra', nik: '3277011604960038', telp: '081234500038', alamat: 'RW 02 Kelurahan Padasuka', posisi: 'Tim Distribusi', userId: null },
    { nama: 'Yusuf Maulana', nik: '3277012406930039', telp: '081234500039', alamat: 'RW 03 Kelurahan Padasuka', posisi: 'Tim Distribusi', userId: null },
    { nama: 'Galih Pratama', nik: '3277011708970040', telp: '081234500040', alamat: 'RW 04 Kelurahan Padasuka', posisi: 'Tim Distribusi', userId: null },
    { nama: 'dr. Farah Annisa', nik: '3277016503920041', telp: '081234500041', alamat: 'RW 05 Kelurahan Padasuka', posisi: 'Quality Control', userId: null },
    { nama: 'Gilar Gumilar, S.Gz', nik: '3277012905910042', telp: '081234500042', alamat: 'RW 06 Kelurahan Padasuka', posisi: 'Quality Control', userId: null },
    { nama: 'Novianti, A.Md.Gz', nik: '3277015407940043', telp: '081234500043', alamat: 'RW 07 Kelurahan Padasuka', posisi: 'Quality Control', userId: null },
    { nama: 'Asep Saepuloh', nik: '3277011409850044', telp: '081234500044', alamat: 'RW 08 Kelurahan Padasuka', posisi: 'Petugas Kebersihan & Sanitasi', userId: null },
    { nama: 'Jajang Nurjaman', nik: '3277012611870045', telp: '081234500045', alamat: 'RW 09 Kelurahan Padasuka', posisi: 'Petugas Kebersihan & Sanitasi', userId: null },
    { nama: 'Didin Samsudin', nik: '3277011501860046', telp: '081234500046', alamat: 'RW 10 Kelurahan Padasuka', posisi: 'Petugas Kebersihan & Sanitasi', userId: null },
    { nama: 'Ujang Suherman', nik: '3277012303880047', telp: '081234500047', alamat: 'RW 11 Kelurahan Padasuka', posisi: 'Petugas Kebersihan & Sanitasi', userId: null },
  ];

  relawanNames.forEach(r => {
    insertRelawan.run(r.userId, r.nama, r.nik, r.telp, r.alamat, r.posisi, 'Aktif');
  });

  // 5. SEED MENU HARIAN
  const insertMenu = db.prepare(`
    INSERT INTO menu_harian (tanggal, nama_menu, deskripsi)
    VALUES (?, ?, ?)
  `);

  // Target requirement: Tanggal 6 April 2026, Menu: Nasi, Chicken Katsu, Sapo Tahu, Mix Vegetable, Lengkeng
  const m1 = insertMenu.run(
    '2026-04-06',
    'Paket Gizi Seimbang Ayam Katsu',
    'Nasi, Chicken Katsu, Sapo Tahu, Mix Vegetable, Lengkeng'
  );

  const m2 = insertMenu.run(
    '2026-04-07',
    'Paket Ikan Fillet Asam Manis',
    'Nasi Putih Organik, Kakap Fillet Saus Asam Manis, Capcay Kuah Gurih, Tahu Bakso Kukus, Jeruk Medan'
  );

  const m3 = insertMenu.run(
    '2026-04-08',
    'Paket Semur Daging & Sayur Bening',
    'Nasi Beras Merah, Semur Daging Sapi Empuk, Sup Bayam Jagung Manis, Tempe Orek Wijen, Pisang Barangan'
  );

  insertMenu.run(
    '2026-04-09',
    'Paket Ayam Bakar Madu Bergizi',
    'Nasi Kuning Kunyit Asli, Ayam Bakar Bumbu Madu, Sayur Asem Segar, Tahu Tempe Bacem, Buah Melon Segar'
  );

  insertMenu.run(
    '2026-04-10',
    'Paket Rolade Daging & Sayur Pelangi',
    'Nasi Tim Bergizi, Rolade Daging Sapi Saus Tiram, Brokoli Wortel Kukus, Perkedel Kentang, Buah Semangka'
  );

  // 6. SEED UJI ORGANOLEPTIK
  const insertUji = db.prepare(`
    INSERT INTO uji_organoleptik (id_menu, tanggal, warna, aroma, rasa, tekstur, keterangan)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertUji.run(
    Number(m1.lastInsertRowid),
    '2026-04-06',
    5, // Warna: Sangat Baik
    5, // Aroma: Sangat Baik
    5, // Rasa: Sangat Baik
    4, // Tekstur: Baik
    'Aroma sedap khas kaldu ayam, katsu renyah di luar lembut di dalam, sapo tahu gurih pas, sayur segar renyah, lengkeng manis segar. Sangat layak disajikan.'
  );

  insertUji.run(
    Number(m2.lastInsertRowid),
    '2026-04-07',
    4, // Warna: Baik
    5, // Aroma: Sangat Baik
    4, // Rasa: Baik
    4, // Tekstur: Baik
    'Ikan kakap tidak berbau amis, saus asam manis seimbang, capcay sayur segar tidak overcooked, sangat disukai penerima manfaat.'
  );

  insertUji.run(
    Number(m3.lastInsertRowid),
    '2026-04-08',
    5,
    5,
    5,
    5,
    'Daging sangat empuk, bumbu meresap sempurna, sup bayam segar dan jernih, higienitas terjaga 100%.'
  );

  // 7. SEED ABSENSI RELAWAN
  const insertAbsensi = db.prepare(`
    INSERT INTO absensi (id_relawan, tanggal, waktu_masuk, waktu_pulang, status, keterangan)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Absensi untuk Siti Aminah (id_relawan = 1) dan relawan lainnya
  insertAbsensi.run(1, '2026-04-06', '06:15:00', '13:45:00', 'Hadir', 'Melakukan uji organoleptik dan quality control pengemasan');
  insertAbsensi.run(1, '2026-04-07', '06:20:00', '14:00:00', 'Hadir', 'Pemeriksaan organoleptik menu ikan fillet');
  insertAbsensi.run(1, '2026-04-08', '06:10:00', '13:50:00', 'Hadir', 'Inspeksi dapur bersih dan sampling makanan');
  insertAbsensi.run(2, '2026-04-06', '05:30:00', '13:00:00', 'Hadir', 'Memimpin persiapan bahan mentah dapur utama');
  insertAbsensi.run(3, '2026-04-06', '05:45:00', '13:15:00', 'Hadir', 'Koordinasi tim pemotongan sayur dan daging');
  insertAbsensi.run(4, '2026-04-06', '06:00:00', '13:30:00', 'Hadir', 'Distribusi alat masak dan monitoring gas');
  insertAbsensi.run(5, '2026-04-06', '05:30:00', '12:30:00', 'Hadir', 'Memasak katsu ayam kloter 1');
  insertAbsensi.run(6, '2026-04-06', '05:30:00', '12:30:00', 'Hadir', 'Memasak katsu ayam kloter 2');
  insertAbsensi.run(7, '2026-04-06', '-', '-', 'Sakit', 'Surat keterangan dokter terlampir demam flu');
  insertAbsensi.run(8, '2026-04-06', '-', '-', 'Izin', 'Keperluan keluarga mendesak');

  // 8. SEED REPRESENTATIVE PENERIMA MANFAAT
  const insertPenerima = db.prepare(`
    INSERT INTO penerima_manfaat (tipe, id_sekolah, id_posyandu, nama_penerima, kategori, kelas_atau_usia, jenis_kelamin, alergi_pantangan, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Siswa Sekolah (Representative samples)
  insertPenerima.run('Sekolah', 1, null, 'Muhammad Rizky Pratama', 'Siswa SD', 'Kelas 4A', 'L', 'Tidak Ada', 'Aktif');
  insertPenerima.run('Sekolah', 1, null, 'Siti Aisyah Humaira', 'Siswa SD', 'Kelas 4B', 'P', 'Alergi Kacang', 'Aktif');
  insertPenerima.run('Sekolah', 1, null, 'Fadhil Arkananta', 'Siswa SD', 'Kelas 5A', 'L', 'Tidak Ada', 'Aktif');
  insertPenerima.run('Sekolah', 2, null, 'Zahra Putri Azalea', 'Siswa SD', 'Kelas 3', 'P', 'Tidak Ada', 'Aktif');
  insertPenerima.run('Sekolah', 2, null, 'Dimas Arya Yudha', 'Siswa SD', 'Kelas 6', 'L', 'Alergi Seafood', 'Aktif');
  insertPenerima.run('Sekolah', 9, null, 'Raka Aditya Pratama', 'Siswa SMP', 'Kelas 7B', 'L', 'Tidak Ada', 'Aktif');
  insertPenerima.run('Sekolah', 9, null, 'Nabila Choirunnisa', 'Siswa SMP', 'Kelas 8A', 'P', 'Tidak Ada', 'Aktif');
  insertPenerima.run('Sekolah', 12, null, 'Alvaro Gavriel', 'Siswa PAUD/TK', 'Kelompok B', 'L', 'Tidak Ada', 'Aktif');
  insertPenerima.run('Sekolah', 17, null, 'Keisha Almira', 'Siswa PAUD/TK', 'Kelompok A', 'P', 'Tidak Ada', 'Aktif');

  // Posyandu (Representative samples: Balita, Ibu Hamil, Ibu Menyusui)
  insertPenerima.run('Posyandu', null, 1, 'Kenzi Alfarizqi', 'Balita', '2 Tahun 4 Bulan', 'L', 'Tidak Ada', 'Aktif');
  insertPenerima.run('Posyandu', null, 1, 'Mikayla Azzahra', 'Balita', '1 Tahun 8 Bulan', 'P', 'Alergi Susu Sapi', 'Aktif');
  insertPenerima.run('Posyandu', null, 2, 'Ny. Dewi Sartika (Hamil 6 Bln)', 'Ibu Hamil', 'Trimester 2 (28 Thn)', 'P', 'Tidak Ada', 'Aktif');
  insertPenerima.run('Posyandu', null, 2, 'Ny. Ratih Nurmalasari (Hamil 4 Bln)', 'Ibu Hamil', 'Trimester 2 (25 Thn)', 'P', 'Tidak Ada', 'Aktif');
  insertPenerima.run('Posyandu', null, 3, 'Ny. Fitri Handayani (Bayi 3 Bln)', 'Ibu Menyusui', 'Menyusui Eksklusif (27 Thn)', 'P', 'Tidak Ada', 'Aktif');
  insertPenerima.run('Posyandu', null, 4, 'Arkhan Raffa', 'Balita', '3 Tahun 1 Bulan', 'L', 'Tidak Ada', 'Aktif');
  insertPenerima.run('Posyandu', null, 4, 'Ny. Siska Melati (Hamil 8 Bln)', 'Ibu Hamil', 'Trimester 3 (31 Thn)', 'P', 'Tidak Ada', 'Aktif');

}
