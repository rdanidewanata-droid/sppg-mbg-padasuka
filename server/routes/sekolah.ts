import { Hono } from 'hono';
import { authenticateToken, requireRoles } from '../auth';
import type { AppEnv } from '../types';

const router = new Hono<AppEnv>();

// List Sekolah (Administrator & Kepala SPPG)
router.get('/', authenticateToken, requireRoles('Administrator', 'Kepala SPPG'), async (c) => {
  const db = c.get('db');
  const { search, jenjang, status } = c.req.query();
  let query = 'SELECT * FROM sekolah WHERE 1=1';
  const params: any[] = [];

  if (search) {
    query += ' AND (nama_sekolah LIKE ? OR npsn LIKE ? OR alamat LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (jenjang && jenjang !== 'Semua') {
    query += ' AND jenjang = ?';
    params.push(jenjang);
  }

  if (status && status !== 'Semua') {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY id_sekolah ASC';

  try {
    const list = await db.prepare(query).all(...params);
    return c.json(list);
  } catch (error) {
    return c.json({ message: 'Gagal mengambil data sekolah.' }, 500);
  }
});

// Create Sekolah (Administrator only)
router.post('/', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const { nama_sekolah, npsn, jenjang, alamat, nama_kontak, no_telepon, jumlah_penerima, status } = await c.req.json().catch(() => ({}));

  if (!nama_sekolah || !jenjang || !alamat) {
    return c.json({ message: 'Nama sekolah, jenjang, dan alamat wajib diisi.' }, 400);
  }

  try {
    const result = await db.prepare(`
      INSERT INTO sekolah (nama_sekolah, npsn, jenjang, alamat, nama_kontak, no_telepon, jumlah_penerima, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nama_sekolah,
      npsn || '',
      jenjang,
      alamat,
      nama_kontak || '',
      no_telepon || '',
      Number(jumlah_penerima) || 0,
      status || 'Aktif'
    );

    const created = await db.prepare('SELECT * FROM sekolah WHERE id_sekolah = ?').get(result.lastInsertRowid);
    return c.json(created, 201);
  } catch (error: any) {
    return c.json({ message: 'Gagal menambahkan sekolah: ' + error.message }, 500);
  }
});

// Update Sekolah (Administrator only)
router.put('/:id', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { nama_sekolah, npsn, jenjang, alamat, nama_kontak, no_telepon, jumlah_penerima, status } = await c.req.json().catch(() => ({}));

  try {
    const result = await db.prepare(`
      UPDATE sekolah
      SET nama_sekolah = ?, npsn = ?, jenjang = ?, alamat = ?, nama_kontak = ?, no_telepon = ?, jumlah_penerima = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id_sekolah = ?
    `).run(
      nama_sekolah,
      npsn || '',
      jenjang,
      alamat,
      nama_kontak || '',
      no_telepon || '',
      Number(jumlah_penerima) || 0,
      status || 'Aktif',
      id
    );

    if (result.changes === 0) {
      return c.json({ message: 'Data sekolah tidak ditemukan.' }, 404);
    }

    const updated = await db.prepare('SELECT * FROM sekolah WHERE id_sekolah = ?').get(id);
    return c.json(updated);
  } catch (error: any) {
    return c.json({ message: 'Gagal memperbarui sekolah: ' + error.message }, 500);
  }
});

// Delete Sekolah (Administrator only) - with relation guard
router.delete('/:id', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  try {
    // Check relation
    const relatedCount = await db.prepare('SELECT COUNT(*) as count FROM penerima_manfaat WHERE id_sekolah = ?').get(id);
    if (relatedCount && relatedCount.count > 0) {
      return c.json({
        message: `Sekolah tidak dapat dihapus karena masih memiliki ${relatedCount.count} data Penerima Manfaat yang terhubung.`,
      }, 400);
    }

    const result = await db.prepare('DELETE FROM sekolah WHERE id_sekolah = ?').run(id);
    if (result.changes === 0) {
      return c.json({ message: 'Data sekolah tidak ditemukan.' }, 404);
    }

    return c.json({ message: 'Data sekolah berhasil dihapus.' });
  } catch (error: any) {
    return c.json({ message: 'Gagal menghapus sekolah: ' + error.message }, 500);
  }
});

export default router;
