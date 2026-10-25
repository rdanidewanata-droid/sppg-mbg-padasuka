import { Hono } from 'hono';
import { authenticateToken, requireRoles } from '../auth';
import type { AppEnv } from '../types';

const router = new Hono<AppEnv>();

// List Uji Organoleptik
router.get('/', authenticateToken, async (c) => {
  const db = c.get('db');
  const { search, tanggal_awal, tanggal_akhir, id_menu } = c.req.query();

  let query = `
    SELECT
      u.*,
      m.nama_menu,
      m.deskripsi as deskripsi_menu
    FROM uji_organoleptik u
    JOIN menu_harian m ON u.id_menu = m.id_menu
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search) {
    query += ' AND (m.nama_menu LIKE ? OR u.keterangan LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (id_menu) {
    query += ' AND u.id_menu = ?';
    params.push(id_menu);
  }

  if (tanggal_awal) {
    query += ' AND u.tanggal >= ?';
    params.push(tanggal_awal);
  }

  if (tanggal_akhir) {
    query += ' AND u.tanggal <= ?';
    params.push(tanggal_akhir);
  }

  query += ' ORDER BY u.tanggal DESC, u.id_uji DESC';

  try {
    const list = await db.prepare(query).all(...params);
    return c.json(list);
  } catch (error: any) {
    return c.json({ message: 'Gagal mengambil data uji organoleptik: ' + error.message }, 500);
  }
});

// Create Uji Organoleptik (Administrator only)
router.post('/', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const { id_menu, tanggal, warna, aroma, rasa, tekstur, keterangan } = await c.req.json().catch(() => ({}));

  if (!id_menu || !tanggal || !warna || !aroma || !rasa || !tekstur) {
    return c.json({ message: 'Menu, tanggal, dan seluruh indikator organoleptik wajib diisi.' }, 400);
  }

  try {
    // Validate menu existence
    const menuExists = await db.prepare('SELECT id_menu FROM menu_harian WHERE id_menu = ?').get(id_menu);
    if (!menuExists) {
      return c.json({ message: 'Menu harian yang dipilih tidak valid.' }, 400);
    }

    const result = await db.prepare(`
      INSERT INTO uji_organoleptik (id_menu, tanggal, warna, aroma, rasa, tekstur, keterangan)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      Number(id_menu),
      tanggal,
      Number(warna),
      Number(aroma),
      Number(rasa),
      Number(tekstur),
      keterangan || ''
    );

    const created = await db.prepare(`
      SELECT u.*, m.nama_menu, m.deskripsi as deskripsi_menu
      FROM uji_organoleptik u
      JOIN menu_harian m ON u.id_menu = m.id_menu
      WHERE u.id_uji = ?
    `).get(result.lastInsertRowid);

    return c.json(created, 201);
  } catch (error: any) {
    return c.json({ message: 'Gagal menambahkan uji organoleptik: ' + error.message }, 500);
  }
});

// Update Uji Organoleptik (Administrator only)
router.put('/:id', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { id_menu, tanggal, warna, aroma, rasa, tekstur, keterangan } = await c.req.json().catch(() => ({}));

  try {
    const result = await db.prepare(`
      UPDATE uji_organoleptik
      SET id_menu = ?, tanggal = ?, warna = ?, aroma = ?, rasa = ?, tekstur = ?, keterangan = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id_uji = ?
    `).run(
      Number(id_menu),
      tanggal,
      Number(warna),
      Number(aroma),
      Number(rasa),
      Number(tekstur),
      keterangan || '',
      id
    );

    if (result.changes === 0) {
      return c.json({ message: 'Data uji organoleptik tidak ditemukan.' }, 404);
    }

    const updated = await db.prepare(`
      SELECT u.*, m.nama_menu, m.deskripsi as deskripsi_menu
      FROM uji_organoleptik u
      JOIN menu_harian m ON u.id_menu = m.id_menu
      WHERE u.id_uji = ?
    `).get(id);

    return c.json(updated);
  } catch (error: any) {
    return c.json({ message: 'Gagal memperbarui uji organoleptik: ' + error.message }, 500);
  }
});

// Delete Uji Organoleptik (Administrator only)
router.delete('/:id', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  try {
    const result = await db.prepare('DELETE FROM uji_organoleptik WHERE id_uji = ?').run(id);
    if (result.changes === 0) {
      return c.json({ message: 'Data uji organoleptik tidak ditemukan.' }, 404);
    }
    return c.json({ message: 'Data uji organoleptik berhasil dihapus.' });
  } catch (error: any) {
    return c.json({ message: 'Gagal menghapus data uji organoleptik: ' + error.message }, 500);
  }
});

export default router;
