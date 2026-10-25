import { Hono } from 'hono';
import { authenticateToken, requireRoles } from '../auth';
import type { AppEnv } from '../types';

const router = new Hono<AppEnv>();

// 1. Laporan Penerima Manfaat
router.get('/penerima-manfaat', authenticateToken, requireRoles('Administrator', 'Kepala SPPG'), async (c) => {
  const db = c.get('db');
  const { tipe, kategori } = c.req.query();

  try {
    let query = `
      SELECT
        p.*,
        COALESCE(s.nama_sekolah, pos.nama_posyandu) as nama_instansi,
        s.jenjang,
        pos.rw
      FROM penerima_manfaat p
      LEFT JOIN sekolah s ON p.id_sekolah = s.id_sekolah
      LEFT JOIN posyandu pos ON p.id_posyandu = pos.id_posyandu
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tipe && tipe !== 'Semua') {
      query += ' AND p.tipe = ?';
      params.push(tipe);
    }

    if (kategori && kategori !== 'Semua') {
      query += ' AND p.kategori = ?';
      params.push(kategori);
    }

    query += ' ORDER BY p.tipe ASC, p.nama_penerima ASC';
    const detailList = await db.prepare(query).all(...params);

    // Summary aggregates
    const summarySekolah = await db.prepare(`
      SELECT
        'Sekolah / PAUD' as kelompok,
        COUNT(id_sekolah) as jumlah_lembaga,
        COALESCE(SUM(jumlah_penerima), 0) as total_penerima
      FROM sekolah
      WHERE status = 'Aktif'
    `).get();

    const summaryPosyandu = await db.prepare(`
      SELECT
        'Posyandu' as kelompok,
        COUNT(id_posyandu) as jumlah_lembaga,
        COALESCE(SUM(jumlah_penerima), 0) as total_penerima
      FROM posyandu
      WHERE status = 'Aktif'
    `).get();

    const breakdownSekolah = await db.prepare(`
      SELECT nama_sekolah as instansi, jenjang, alamat, jumlah_penerima
      FROM sekolah
      WHERE status = 'Aktif'
      ORDER BY jenjang ASC, nama_sekolah ASC
    `).all();

    const breakdownPosyandu = await db.prepare(`
      SELECT nama_posyandu as instansi, rw, ketua_posyandu, jumlah_penerima
      FROM posyandu
      WHERE status = 'Aktif'
      ORDER BY id_posyandu ASC
    `).all();

    return c.json({
      title: 'Laporan Penerima Manfaat Program Makan Bergizi Gratis (MBG)',
      generatedAt: new Date().toISOString(),
      summary: {
        totalSekolahLembaga: summarySekolah.jumlah_lembaga,
        totalPenerimaSekolah: summarySekolah.total_penerima,
        totalPosyanduLembaga: summaryPosyandu.jumlah_lembaga,
        totalPenerimaPosyandu: summaryPosyandu.total_penerima,
        grandTotalPenerima: summarySekolah.total_penerima + summaryPosyandu.total_penerima,
      },
      breakdownSekolah,
      breakdownPosyandu,
      sampleDetails: detailList,
    });
  } catch (error: any) {
    return c.json({ message: 'Gagal menghasilkan laporan penerima manfaat: ' + error.message }, 500);
  }
});

// 2. Laporan Absensi Relawan
router.get('/absensi-relawan', authenticateToken, requireRoles('Administrator', 'Kepala SPPG'), async (c) => {
  const db = c.get('db');
  const { tanggal_awal, tanggal_akhir, status } = c.req.query();

  try {
    let query = `
      SELECT
        a.*,
        r.nama_relawan,
        r.nik,
        r.tugas_posisi,
        r.no_telepon
      FROM absensi a
      JOIN relawan r ON a.id_relawan = r.id_relawan
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tanggal_awal) {
      query += ' AND a.tanggal >= ?';
      params.push(tanggal_awal);
    }
    if (tanggal_akhir) {
      query += ' AND a.tanggal <= ?';
      params.push(tanggal_akhir);
    }
    if (status && status !== 'Semua') {
      query += ' AND a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.tanggal DESC, a.waktu_masuk ASC';
    const rows = await db.prepare(query).all(...params);

    // Summary counts
    let hadir = 0, izin = 0, sakit = 0, alpa = 0;
    rows.forEach((r: any) => {
      if (r.status === 'Hadir') hadir++;
      else if (r.status === 'Izin') izin++;
      else if (r.status === 'Sakit') sakit++;
      else if (r.status === 'Alpa') alpa++;
    });

    return c.json({
      title: 'Laporan Rekapitulasi Absensi Relawan MBG',
      periode: tanggal_awal && tanggal_akhir ? `${tanggal_awal} s/d ${tanggal_akhir}` : 'Semua Periode',
      summary: {
        total: rows.length,
        hadir,
        izin,
        sakit,
        alpa,
        persentaseKehadiran: rows.length > 0 ? ((hadir / rows.length) * 100).toFixed(1) + '%' : '0%',
      },
      data: rows,
    });
  } catch (error: any) {
    return c.json({ message: 'Gagal menghasilkan laporan absensi: ' + error.message }, 500);
  }
});

// 3. Laporan Menu Harian
router.get('/menu-harian', authenticateToken, requireRoles('Administrator', 'Kepala SPPG'), async (c) => {
  const db = c.get('db');
  const { tanggal_awal, tanggal_akhir } = c.req.query();

  try {
    let query = `
      SELECT
        m.*,
        COUNT(u.id_uji) as jumlah_uji,
        ROUND(AVG((u.warna + u.aroma + u.rasa + u.tekstur) / 4.0), 1) as avg_skor
      FROM menu_harian m
      LEFT JOIN uji_organoleptik u ON m.id_menu = u.id_menu
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tanggal_awal) {
      query += ' AND m.tanggal >= ?';
      params.push(tanggal_awal);
    }
    if (tanggal_akhir) {
      query += ' AND m.tanggal <= ?';
      params.push(tanggal_akhir);
    }

    query += ' GROUP BY m.id_menu ORDER BY m.tanggal DESC';
    const rows = await db.prepare(query).all(...params);

    return c.json({
      title: 'Laporan Siklus & Distribusi Menu Harian MBG',
      periode: tanggal_awal && tanggal_akhir ? `${tanggal_awal} s/d ${tanggal_akhir}` : 'Semua Periode',
      totalMenu: rows.length,
      data: rows,
    });
  } catch (error: any) {
    return c.json({ message: 'Gagal menghasilkan laporan menu harian: ' + error.message }, 500);
  }
});

// 4. Laporan Uji Organoleptik
router.get('/uji-organoleptik', authenticateToken, requireRoles('Administrator', 'Kepala SPPG'), async (c) => {
  const db = c.get('db');
  const { tanggal_awal, tanggal_akhir } = c.req.query();

  try {
    let query = `
      SELECT
        u.*,
        m.nama_menu,
        m.deskripsi as rincian_menu,
        ROUND((u.warna + u.aroma + u.rasa + u.tekstur) / 4.0, 2) as skor_rata_rata
      FROM uji_organoleptik u
      JOIN menu_harian m ON u.id_menu = m.id_menu
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tanggal_awal) {
      query += ' AND u.tanggal >= ?';
      params.push(tanggal_awal);
    }
    if (tanggal_akhir) {
      query += ' AND u.tanggal <= ?';
      params.push(tanggal_akhir);
    }

    query += ' ORDER BY u.tanggal DESC, u.id_uji DESC';
    const rows = await db.prepare(query).all(...params);

    // Compute grand averages
    let totalScore = 0;
    rows.forEach((r: any) => {
      totalScore += Number(r.skor_rata_rata);
    });
    const grandAvg = rows.length > 0 ? (totalScore / rows.length).toFixed(2) : '0';

    return c.json({
      title: 'Laporan Penilaian Kualitas Makanan (Uji Organoleptik) MBG',
      periode: tanggal_awal && tanggal_akhir ? `${tanggal_awal} s/d ${tanggal_akhir}` : 'Semua Periode',
      summary: {
        totalUji: rows.length,
        rataRataKeseluruhan: grandAvg,
        statusKelayakan: Number(grandAvg) >= 4.0 ? 'Sangat Layak & Memenuhi Standar Gizi' : 'Cukup Layak',
      },
      data: rows,
    });
  } catch (error: any) {
    return c.json({ message: 'Gagal menghasilkan laporan uji organoleptik: ' + error.message }, 500);
  }
});

export default router;
