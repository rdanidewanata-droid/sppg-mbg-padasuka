import { Hono } from 'hono';
import { authenticateToken, requireRoles } from '../auth';
import type { AppEnv } from '../types';

const router = new Hono<AppEnv>();

// List Menu Harian
router.get('/', authenticateToken, async (c) => {
  const db = c.get('db');
  const { search, tanggal_awal, tanggal_akhir } = c.req.query();
  let query = 'SELECT * FROM menu_harian WHERE 1=1';
  const params: any[] = [];

  if (search) {
    query += ' AND (nama_menu LIKE ? OR deskripsi LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (tanggal_awal) {
    query += ' AND tanggal >= ?';
    params.push(tanggal_awal);
  }

  if (tanggal_akhir) {
    query += ' AND tanggal <= ?';
    params.push(tanggal_akhir);
  }

  query += ' ORDER BY tanggal DESC, id_menu DESC';

  try {
    const list = await db.prepare(query).all(...params);
    return c.json(list);
  } catch (error: any) {
    return c.json({ message: 'Gagal mengambil data menu: ' + error.message }, 500);
  }
});

// Get single Menu Detail
router.get('/:id', authenticateToken, async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  try {
    const menu = await db.prepare('SELECT * FROM menu_harian WHERE id_menu = ?').get(id);
    if (!menu) {
      return c.json({ message: 'Menu tidak ditemukan.' }, 404);
    }
    // Also fetch associated organoleptic evaluations
    const ujiList = await db.prepare('SELECT * FROM uji_organoleptik WHERE id_menu = ? ORDER BY tanggal DESC').all(id);
    return c.json({ ...menu, uji_organoleptik: ujiList });
  } catch (error: any) {
    return c.json({ message: 'Gagal mengambil detail menu: ' + error.message }, 500);
  }
});

// Create Menu Harian (Administrator only)
router.post('/', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const { tanggal, nama_menu, deskripsi } = await c.req.json().catch(() => ({}));

  if (!tanggal || !nama_menu || !deskripsi) {
    return c.json({ message: 'Tanggal, nama menu, dan deskripsi wajib diisi.' }, 400);
  }

  try {
    const result = await db.prepare(`
      INSERT INTO menu_harian (tanggal, nama_menu, deskripsi)
      VALUES (?, ?, ?)
    `).run(tanggal, nama_menu, deskripsi);

    const created = await db.prepare('SELECT * FROM menu_harian WHERE id_menu = ?').get(result.lastInsertRowid);
    return c.json(created, 201);
  } catch (error: any) {
    return c.json({ message: 'Gagal menambahkan menu harian: ' + error.message }, 500);
  }
});

// Update Menu Harian (Administrator only)
router.put('/:id', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { tanggal, nama_menu, deskripsi } = await c.req.json().catch(() => ({}));

  try {
    const result = await db.prepare(`
      UPDATE menu_harian
      SET tanggal = ?, nama_menu = ?, deskripsi = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id_menu = ?
    `).run(tanggal, nama_menu, deskripsi, id);

    if (result.changes === 0) {
      return c.json({ message: 'Menu tidak ditemukan.' }, 404);
    }

    const updated = await db.prepare('SELECT * FROM menu_harian WHERE id_menu = ?').get(id);
    return c.json(updated);
  } catch (error: any) {
    return c.json({ message: 'Gagal memperbarui menu harian: ' + error.message }, 500);
  }
});

// Delete Menu Harian (Administrator only) - with relation guard to Uji Organoleptik
router.delete('/:id', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  try {
    // Check relation
    const relatedCount = await db.prepare('SELECT COUNT(*) as count FROM uji_organoleptik WHERE id_menu = ?').get(id);
    if (relatedCount && relatedCount.count > 0) {
      return c.json({ message: 'Menu ini tidak dapat dihapus karena sudah memiliki data penilaian Uji Organoleptik.' }, 400);
    }

    const result = await db.prepare('DELETE FROM menu_harian WHERE id_menu = ?').run(id);
    if (result.changes === 0) {
      return c.json({ message: 'Menu tidak ditemukan.' }, 404);
    }

    return c.json({ message: 'Menu harian berhasil dihapus.' });
  } catch (error: any) {
    return c.json({ message: 'Gagal menghapus menu: ' + error.message }, 500);
  }
});

export default router;
