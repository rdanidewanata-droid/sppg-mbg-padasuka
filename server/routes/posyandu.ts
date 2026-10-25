import { Hono } from 'hono';
import { authenticateToken, requireRoles } from '../auth';
import type { AppEnv } from '../types';

const router = new Hono<AppEnv>();

// List Posyandu (Administrator & Kepala SPPG)
router.get('/', authenticateToken, requireRoles('Administrator', 'Kepala SPPG'), async (c) => {
  const db = c.get('db');
  const { search, status } = c.req.query();
  let query = 'SELECT * FROM posyandu WHERE 1=1';
  const params: any[] = [];

  if (search) {
    query += ' AND (nama_posyandu LIKE ? OR rw LIKE ? OR ketua_posyandu LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status && status !== 'Semua') {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY id_posyandu ASC';

  try {
    const list = await db.prepare(query).all(...params);
    return c.json(list);
  } catch (error) {
    return c.json({ message: 'Gagal mengambil data posyandu.' }, 500);
  }
});

// Create Posyandu (Administrator only)
router.post('/', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const { nama_posyandu, rw, kelurahan, ketua_posyandu, no_telepon, jumlah_penerima, status } = await c.req.json().catch(() => ({}));

  if (!nama_posyandu || !rw || !ketua_posyandu) {
    return c.json({ message: 'Nama posyandu, RW, dan nama ketua posyandu wajib diisi.' }, 400);
  }

  try {
    const result = await db.prepare(`
      INSERT INTO posyandu (nama_posyandu, rw, kelurahan, ketua_posyandu, no_telepon, jumlah_penerima, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      nama_posyandu,
      rw,
      kelurahan || 'Padasuka',
      ketua_posyandu,
      no_telepon || '',
      Number(jumlah_penerima) || 0,
      status || 'Aktif'
    );

    const created = await db.prepare('SELECT * FROM posyandu WHERE id_posyandu = ?').get(result.lastInsertRowid);
    return c.json(created, 201);
  } catch (error: any) {
    return c.json({ message: 'Gagal menambahkan posyandu: ' + error.message }, 500);
  }
});

// Update Posyandu (Administrator only)
router.put('/:id', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { nama_posyandu, rw, kelurahan, ketua_posyandu, no_telepon, jumlah_penerima, status } = await c.req.json().catch(() => ({}));

  try {
    const result = await db.prepare(`
      UPDATE posyandu
      SET nama_posyandu = ?, rw = ?, kelurahan = ?, ketua_posyandu = ?, no_telepon = ?, jumlah_penerima = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id_posyandu = ?
    `).run(
      nama_posyandu,
      rw,
      kelurahan || 'Padasuka',
      ketua_posyandu,
      no_telepon || '',
      Number(jumlah_penerima) || 0,
      status || 'Aktif',
      id
    );

    if (result.changes === 0) {
      return c.json({ message: 'Data posyandu tidak ditemukan.' }, 404);
    }

    const updated = await db.prepare('SELECT * FROM posyandu WHERE id_posyandu = ?').get(id);
    return c.json(updated);
  } catch (error: any) {
    return c.json({ message: 'Gagal memperbarui posyandu: ' + error.message }, 500);
  }
});

// Delete Posyandu (Administrator only) - with relation guard
router.delete('/:id', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  try {
    // Check relation
    const relatedCount = await db.prepare('SELECT COUNT(*) as count FROM penerima_manfaat WHERE id_posyandu = ?').get(id);
    if (relatedCount && relatedCount.count > 0) {
      return c.json({
        message: `Posyandu tidak dapat dihapus karena masih memiliki ${relatedCount.count} data Penerima Manfaat yang terhubung.`,
      }, 400);
    }

    const result = await db.prepare('DELETE FROM posyandu WHERE id_posyandu = ?').run(id);
    if (result.changes === 0) {
      return c.json({ message: 'Data posyandu tidak ditemukan.' }, 404);
    }

    return c.json({ message: 'Data posyandu berhasil dihapus.' });
  } catch (error: any) {
    return c.json({ message: 'Gagal menghapus posyandu: ' + error.message }, 500);
  }
});

export default router;
