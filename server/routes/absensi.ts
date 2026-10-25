import { Hono } from 'hono';
import { authenticateToken, requireRoles } from '../auth';
import { nowWib } from '../time';
import type { AppEnv } from '../types';

const router = new Hono<AppEnv>();

// List all Absensi (Administrator & Kepala SPPG)
router.get('/', authenticateToken, requireRoles('Administrator', 'Kepala SPPG'), async (c) => {
  const db = c.get('db');
  const { search, tanggal_awal, tanggal_akhir, status, id_relawan } = c.req.query();

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

  if (search) {
    query += ' AND (r.nama_relawan LIKE ? OR r.nik LIKE ? OR a.keterangan LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (id_relawan) {
    query += ' AND a.id_relawan = ?';
    params.push(id_relawan);
  }

  if (status && status !== 'Semua') {
    query += ' AND a.status = ?';
    params.push(status);
  }

  if (tanggal_awal) {
    query += ' AND a.tanggal >= ?';
    params.push(tanggal_awal);
  }

  if (tanggal_akhir) {
    query += ' AND a.tanggal <= ?';
    params.push(tanggal_akhir);
  }

  query += ' ORDER BY a.tanggal DESC, a.waktu_masuk DESC, a.id_absensi DESC';

  try {
    const list = await db.prepare(query).all(...params);
    return c.json(list);
  } catch (error: any) {
    return c.json({ message: 'Gagal mengambil data absensi: ' + error.message }, 500);
  }
});

// Relawan views own attendance history
router.get('/my-history', authenticateToken, async (c) => {
  const db = c.get('db');
  const user = c.get('user');

  try {
    // Find linked relawan
    let relawanId = user.id_relawan;
    if (!relawanId) {
      const relawanRow = await db.prepare('SELECT id_relawan FROM relawan WHERE id_user = ?').get(user.id);
      if (relawanRow) {
        relawanId = relawanRow.id_relawan;
      }
    }

    if (!relawanId) {
      // Default to 1 for demonstration if not linked
      relawanId = 1;
    }

    const list = await db.prepare(`
      SELECT
        a.*,
        r.nama_relawan,
        r.tugas_posisi
      FROM absensi a
      JOIN relawan r ON a.id_relawan = r.id_relawan
      WHERE a.id_relawan = ?
      ORDER BY a.tanggal DESC, a.id_absensi DESC
    `).all(relawanId);

    // Also get today's record if any
    const todayRecord = await db.prepare('SELECT * FROM absensi WHERE id_relawan = ? AND tanggal = ?').get(relawanId, nowWib().tanggal);

    return c.json({
      history: list,
      todayRecord: todayRecord || null,
      relawanId,
    });
  } catch (error: any) {
    return c.json({ message: 'Gagal mengambil riwayat absensi: ' + error.message }, 500);
  }
});

// Check-in (Melakukan absensi / catat waktu masuk)
router.post('/checkin', authenticateToken, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const { id_relawan, status, keterangan } = await c.req.json().catch(() => ({}));
  const targetRelawanId = user.role === 'Relawan' ? (user.id_relawan || 1) : Number(id_relawan);

  if (!targetRelawanId) {
    return c.json({ message: 'Relawan tidak valid.' }, 400);
  }

  const { tanggal, waktu: waktuMasuk } = nowWib(); // HH:MM:SS

  try {
    // Check if already checked in today
    const existing = await db.prepare('SELECT * FROM absensi WHERE id_relawan = ? AND tanggal = ?').get(targetRelawanId, tanggal);
    if (existing) {
      return c.json({ message: 'Anda sudah melakukan absensi masuk untuk hari ini.' }, 400);
    }

    const result = await db.prepare(`
      INSERT INTO absensi (id_relawan, tanggal, waktu_masuk, waktu_pulang, status, keterangan)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      targetRelawanId,
      tanggal,
      status === 'Hadir' ? waktuMasuk : '-',
      '-',
      status || 'Hadir',
      keterangan || (status === 'Hadir' ? 'Hadir tepat waktu di SPPG' : status)
    );

    const created = await db.prepare(`
      SELECT a.*, r.nama_relawan, r.tugas_posisi
      FROM absensi a
      JOIN relawan r ON a.id_relawan = r.id_relawan
      WHERE a.id_absensi = ?
    `).get(result.lastInsertRowid);

    return c.json({ message: 'Absensi masuk berhasil dicatat.', data: created }, 201);
  } catch (error: any) {
    return c.json({ message: 'Gagal mencatat absensi: ' + error.message }, 500);
  }
});

// Check-out (Catat waktu pulang)
router.post('/checkout', authenticateToken, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const { id_absensi } = body;
  const { tanggal: today, waktu: waktuPulang } = nowWib();

  try {
    let absensiRecord: any;

    if (id_absensi) {
      absensiRecord = await db.prepare('SELECT * FROM absensi WHERE id_absensi = ?').get(id_absensi);
    } else {
      const targetRelawanId = user.role === 'Relawan' ? (user.id_relawan || 1) : body.id_relawan;
      absensiRecord = await db.prepare('SELECT * FROM absensi WHERE id_relawan = ? AND tanggal = ?').get(targetRelawanId, today);
    }

    if (!absensiRecord) {
      return c.json({ message: 'Data absensi hari ini tidak ditemukan. Silakan catat waktu masuk terlebih dahulu.' }, 404);
    }

    if (absensiRecord.waktu_pulang && absensiRecord.waktu_pulang !== '-') {
      return c.json({ message: 'Waktu pulang sudah dicatat sebelumnya.' }, 400);
    }

    await db.prepare(`
      UPDATE absensi
      SET waktu_pulang = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id_absensi = ?
    `).run(waktuPulang, absensiRecord.id_absensi);

    const updated = await db.prepare(`
      SELECT a.*, r.nama_relawan, r.tugas_posisi
      FROM absensi a
      JOIN relawan r ON a.id_relawan = r.id_relawan
      WHERE a.id_absensi = ?
    `).get(absensiRecord.id_absensi);

    return c.json({ message: 'Absensi pulang berhasil dicatat.', data: updated });
  } catch (error: any) {
    return c.json({ message: 'Gagal mencatat waktu pulang: ' + error.message }, 500);
  }
});

// Admin Manual Create Absensi
router.post('/admin-create', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const { id_relawan, tanggal, waktu_masuk, waktu_pulang, status, keterangan } = await c.req.json().catch(() => ({}));

  if (!id_relawan || !tanggal || !status) {
    return c.json({ message: 'Relawan, tanggal, dan status kehadiran wajib diisi.' }, 400);
  }

  try {
    const result = await db.prepare(`
      INSERT INTO absensi (id_relawan, tanggal, waktu_masuk, waktu_pulang, status, keterangan)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      Number(id_relawan),
      tanggal,
      waktu_masuk || '-',
      waktu_pulang || '-',
      status,
      keterangan || ''
    );

    const created = await db.prepare(`
      SELECT a.*, r.nama_relawan, r.tugas_posisi
      FROM absensi a
      JOIN relawan r ON a.id_relawan = r.id_relawan
      WHERE a.id_absensi = ?
    `).get(result.lastInsertRowid);

    return c.json(created, 201);
  } catch (error: any) {
    return c.json({ message: 'Gagal menambahkan absensi: ' + error.message }, 500);
  }
});

// Admin Update Absensi
router.put('/:id', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { id_relawan, tanggal, waktu_masuk, waktu_pulang, status, keterangan } = await c.req.json().catch(() => ({}));

  try {
    const result = await db.prepare(`
      UPDATE absensi
      SET id_relawan = ?, tanggal = ?, waktu_masuk = ?, waktu_pulang = ?, status = ?, keterangan = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id_absensi = ?
    `).run(
      Number(id_relawan),
      tanggal,
      waktu_masuk || '-',
      waktu_pulang || '-',
      status,
      keterangan || '',
      id
    );

    if (result.changes === 0) {
      return c.json({ message: 'Data absensi tidak ditemukan.' }, 404);
    }

    const updated = await db.prepare(`
      SELECT a.*, r.nama_relawan, r.tugas_posisi
      FROM absensi a
      JOIN relawan r ON a.id_relawan = r.id_relawan
      WHERE a.id_absensi = ?
    `).get(id);

    return c.json(updated);
  } catch (error: any) {
    return c.json({ message: 'Gagal memperbarui absensi: ' + error.message }, 500);
  }
});

// Admin Delete Absensi
router.delete('/:id', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  try {
    const result = await db.prepare('DELETE FROM absensi WHERE id_absensi = ?').run(id);
    if (result.changes === 0) {
      return c.json({ message: 'Data absensi tidak ditemukan.' }, 404);
    }
    return c.json({ message: 'Data absensi berhasil dihapus.' });
  } catch (error: any) {
    return c.json({ message: 'Gagal menghapus absensi: ' + error.message }, 500);
  }
});

export default router;
