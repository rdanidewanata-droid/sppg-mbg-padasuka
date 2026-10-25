import { Hono } from 'hono';
import { authenticateToken, requireRoles } from '../auth';
import type { AppEnv } from '../types';

const router = new Hono<AppEnv>();

// List Relawan (Administrator, Kepala SPPG, Relawan)
router.get('/', authenticateToken, async (c) => {
  const db = c.get('db');
  const { search, posisi, status } = c.req.query();
  let query = 'SELECT * FROM relawan WHERE 1=1';
  const params: any[] = [];

  if (search) {
    query += ' AND (nama_relawan LIKE ? OR nik LIKE ? OR no_telepon LIKE ? OR alamat LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (posisi && posisi !== 'Semua') {
    query += ' AND tugas_posisi = ?';
    params.push(posisi);
  }

  if (status && status !== 'Semua') {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY id_relawan ASC';

  try {
    const list = await db.prepare(query).all(...params);
    return c.json(list);
  } catch (error) {
    return c.json({ message: 'Gagal mengambil data relawan.' }, 500);
  }
});

// Create Relawan (Administrator only)
router.post('/', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const { nama_relawan, nik, no_telepon, alamat, tugas_posisi, status, id_user } = await c.req.json().catch(() => ({}));

  if (!nama_relawan || !tugas_posisi) {
    return c.json({ message: 'Nama relawan dan tugas posisi wajib diisi.' }, 400);
  }

  try {
    const result = await db.prepare(`
      INSERT INTO relawan (nama_relawan, nik, no_telepon, alamat, tugas_posisi, status, id_user)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      nama_relawan,
      nik || '',
      no_telepon || '',
      alamat || '',
      tugas_posisi,
      status || 'Aktif',
      id_user || null
    );

    const created = await db.prepare('SELECT * FROM relawan WHERE id_relawan = ?').get(result.lastInsertRowid);
    return c.json(created, 201);
  } catch (error: any) {
    return c.json({ message: 'Gagal menambahkan relawan: ' + error.message }, 500);
  }
});

// Update Relawan (Administrator only)
router.put('/:id', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { nama_relawan, nik, no_telepon, alamat, tugas_posisi, status, id_user } = await c.req.json().catch(() => ({}));

  try {
    const result = await db.prepare(`
      UPDATE relawan
      SET nama_relawan = ?, nik = ?, no_telepon = ?, alamat = ?, tugas_posisi = ?, status = ?, id_user = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id_relawan = ?
    `).run(
      nama_relawan,
      nik || '',
      no_telepon || '',
      alamat || '',
      tugas_posisi,
      status || 'Aktif',
      id_user || null,
      id
    );

    if (result.changes === 0) {
      return c.json({ message: 'Data relawan tidak ditemukan.' }, 404);
    }

    const updated = await db.prepare('SELECT * FROM relawan WHERE id_relawan = ?').get(id);
    return c.json(updated);
  } catch (error: any) {
    return c.json({ message: 'Gagal memperbarui relawan: ' + error.message }, 500);
  }
});

// Delete Relawan (Administrator only) - with relation guard to Absensi
router.delete('/:id', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  try {
    // Check relation with absensi
    const relatedCount = await db.prepare('SELECT COUNT(*) as count FROM absensi WHERE id_relawan = ?').get(id);
    if (relatedCount && relatedCount.count > 0) {
      return c.json({
        message: `Data relawan tidak dapat dihapus karena memiliki ${relatedCount.count} riwayat absensi.`,
      }, 400);
    }

    const result = await db.prepare('DELETE FROM relawan WHERE id_relawan = ?').run(id);
    if (result.changes === 0) {
      return c.json({ message: 'Data relawan tidak ditemukan.' }, 404);
    }

    return c.json({ message: 'Data relawan berhasil dihapus.' });
  } catch (error: any) {
    return c.json({ message: 'Gagal menghapus relawan: ' + error.message }, 500);
  }
});

export default router;
