import { Hono } from 'hono';
import { authenticateToken } from '../auth';
import { nowWib } from '../time';
import type { AppEnv } from '../types';

const router = new Hono<AppEnv>();

router.get('/stats', authenticateToken, async (c) => {
  const db = c.get('db');

  try {
    // 1. Total Sekolah
    const sekolahStat = await db.prepare("SELECT COUNT(*) as count FROM sekolah WHERE status = 'Aktif'").get();
    const totalSekolah = sekolahStat.count;

    // 2. Total Posyandu
    const posyanduStat = await db.prepare("SELECT COUNT(*) as count FROM posyandu WHERE status = 'Aktif'").get();
    const totalPosyandu = posyanduStat.count;

    // 3. Total Relawan
    const relawanStat = await db.prepare("SELECT COUNT(*) as count FROM relawan WHERE status = 'Aktif'").get();
    const totalRelawan = relawanStat.count;

    // 4. Penerima dari Sekolah
    const penerimaSekolahStat = await db.prepare("SELECT COALESCE(SUM(jumlah_penerima), 0) as total FROM sekolah WHERE status = 'Aktif'").get();
    const penerimaSekolah = penerimaSekolahStat.total;

    // 5. Penerima dari Posyandu
    const penerimaPosyanduStat = await db.prepare("SELECT COALESCE(SUM(jumlah_penerima), 0) as total FROM posyandu WHERE status = 'Aktif'").get();
    const penerimaPosyandu = penerimaPosyanduStat.total;

    // 6. Total Penerima Manfaat
    const totalPenerima = penerimaSekolah + penerimaPosyandu;

    // 7. Today's or latest menu
    const latestMenu = await db.prepare('SELECT * FROM menu_harian ORDER BY tanggal DESC, id_menu DESC LIMIT 1').get();

    // 8. Latest Organoleptic evaluation
    const latestUji = await db.prepare(`
      SELECT u.*, m.nama_menu
      FROM uji_organoleptik u
      JOIN menu_harian m ON u.id_menu = m.id_menu
      ORDER BY u.tanggal DESC, u.id_uji DESC
      LIMIT 1
    `).get();

    let avgOrganoleptik: string | null = null;
    if (latestUji) {
      avgOrganoleptik = ((latestUji.warna + latestUji.aroma + latestUji.rasa + latestUji.tekstur) / 4).toFixed(1);
    }

    // 9. Absensi statistics
    const absensiHariIni = await db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Hadir' THEN 1 ELSE 0 END) as hadir,
        SUM(CASE WHEN status = 'Izin' THEN 1 ELSE 0 END) as izin,
        SUM(CASE WHEN status = 'Sakit' THEN 1 ELSE 0 END) as sakit,
        SUM(CASE WHEN status = 'Alpa' THEN 1 ELSE 0 END) as alpa
      FROM absensi
      WHERE tanggal = ? OR tanggal = (SELECT MAX(tanggal) FROM absensi)
    `).get(nowWib().tanggal);

    // 10. Jenjang distribution
    const jenjangDistribution = await db.prepare(`
      SELECT jenjang, COUNT(*) as jumlah_lembaga, SUM(jumlah_penerima) as total_penerima
      FROM sekolah
      WHERE status = 'Aktif'
      GROUP BY jenjang
    `).all();

    // Formatter utility
    const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(num);

    return c.json({
      sekolah: {
        count: totalSekolah,
        formatted: formatNumber(totalSekolah),
      },
      posyandu: {
        count: totalPosyandu,
        formatted: formatNumber(totalPosyandu),
      },
      relawan: {
        count: totalRelawan,
        formatted: formatNumber(totalRelawan),
      },
      penerima: {
        total: totalPenerima,
        formattedTotal: formatNumber(totalPenerima),
        sekolah: penerimaSekolah,
        formattedSekolah: formatNumber(penerimaSekolah),
        posyandu: penerimaPosyandu,
        formattedPosyandu: formatNumber(penerimaPosyandu),
      },
      latestMenu,
      latestUji: latestUji ? { ...latestUji, avgScore: avgOrganoleptik } : null,
      absensiStat: absensiHariIni,
      jenjangDistribution,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return c.json({ message: 'Terjadi kesalahan saat mengambil statistik data dashboard.' }, 500);
  }
});

export default router;
