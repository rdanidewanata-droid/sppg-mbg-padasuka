import { Hono } from 'hono';
import { authenticateToken, requireRoles } from '../auth';
import type { AppEnv } from '../types';

const router = new Hono<AppEnv>();

// List Penerima Manfaat
router.get('/', authenticateToken, requireRoles('Administrator', 'Kepala SPPG'), async (c) => {
  const db = c.get('db');
  const { search, tipe, kategori, status } = c.req.query();

  let query = `
    SELECT
      p.*,
      s.nama_sekolah,
      pos.nama_posyandu
    FROM penerima_manfaat p
    LEFT JOIN sekolah s ON p.id_sekolah = s.id_sekolah
    LEFT JOIN posyandu pos ON p.id_posyandu = pos.id_posyandu
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search) {
    query += ' AND (p.nama_penerima LIKE ? OR s.nama_sekolah LIKE ? OR pos.nama_posyandu LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (tipe && tipe !== 'Semua') {
    query += ' AND p.tipe = ?';
    params.push(tipe);
  }

  if (kategori && kategori !== 'Semua') {
    query += ' AND p.kategori = ?';
    params.push(kategori);
  }

  if (status && status !== 'Semua') {
    query += ' AND p.status = ?';
    params.push(status);
  }

  query += ' ORDER BY p.id_penerima DESC';

  try {
    const list = await db.prepare(query).all(...params);
    return c.json(list);
  } catch (error: any) {
    return c.json({ message: 'Gagal mengambil data penerima manfaat: ' + error.message }, 500);
  }
});

// Create Penerima Manfaat (Administrator only)
router.post('/', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const { tipe, id_sekolah, id_posyandu, nama_penerima, kategori, kelas_atau_usia, jenis_kelamin, alergi_pantangan, status } = await c.req.json().catch(() => ({}));

  if (!tipe || !nama_penerima || !kategori || !jenis_kelamin) {
    return c.json({ message: 'Tipe, nama penerima, kategori, dan jenis kelamin wajib diisi.' }, 400);
  }

  if (tipe === 'Sekolah' && !id_sekolah) {
    return c.json({ message: 'Sekolah asal wajib dipilih untuk penerima tipe Sekolah.' }, 400);
  }

  if (tipe === 'Posyandu' && !id_posyandu) {
    return c.json({ message: 'Posyandu asal wajib dipilih untuk penerima tipe Posyandu.' }, 400);
  }

  try {
    const result = await db.prepare(`
      INSERT INTO penerima_manfaat (tipe, id_sekolah, id_posyandu, nama_penerima, kategori, kelas_atau_usia, jenis_kelamin, alergi_pantangan, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tipe,
      tipe === 'Sekolah' ? Number(id_sekolah) : null,
      tipe === 'Posyandu' ? Number(id_posyandu) : null,
      nama_penerima,
      kategori,
      kelas_atau_usia || '',
      jenis_kelamin,
      alergi_pantangan || 'Tidak Ada',
      status || 'Aktif'
    );

    const created = await db.prepare(`
      SELECT p.*, s.nama_sekolah, pos.nama_posyandu
      FROM penerima_manfaat p
      LEFT JOIN sekolah s ON p.id_sekolah = s.id_sekolah
      LEFT JOIN posyandu pos ON p.id_posyandu = pos.id_posyandu
      WHERE p.id_penerima = ?
    `).get(result.lastInsertRowid);

    return c.json(created, 201);
  } catch (error: any) {
    return c.json({ message: 'Gagal menambahkan penerima manfaat: ' + error.message }, 500);
  }
});

// Update Penerima Manfaat (Administrator only)
router.put('/:id', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { tipe, id_sekolah, id_posyandu, nama_penerima, kategori, kelas_atau_usia, jenis_kelamin, alergi_pantangan, status } = await c.req.json().catch(() => ({}));

  try {
    const result = await db.prepare(`
      UPDATE penerima_manfaat
      SET tipe = ?, id_sekolah = ?, id_posyandu = ?, nama_penerima = ?, kategori = ?, kelas_atau_usia = ?, jenis_kelamin = ?, alergi_pantangan = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id_penerima = ?
    `).run(
      tipe,
      tipe === 'Sekolah' ? Number(id_sekolah) : null,
      tipe === 'Posyandu' ? Number(id_posyandu) : null,
      nama_penerima,
      kategori,
      kelas_atau_usia || '',
      jenis_kelamin,
      alergi_pantangan || 'Tidak Ada',
      status || 'Aktif',
      id
    );

    if (result.changes === 0) {
      return c.json({ message: 'Data penerima manfaat tidak ditemukan.' }, 404);
    }

    const updated = await db.prepare(`
      SELECT p.*, s.nama_sekolah, pos.nama_posyandu
      FROM penerima_manfaat p
      LEFT JOIN sekolah s ON p.id_sekolah = s.id_sekolah
      LEFT JOIN posyandu pos ON p.id_posyandu = pos.id_posyandu
      WHERE p.id_penerima = ?
    `).get(id);

    return c.json(updated);
  } catch (error: any) {
    return c.json({ message: 'Gagal memperbarui penerima manfaat: ' + error.message }, 500);
  }
});

// Delete Penerima Manfaat (Administrator only)
router.delete('/:id', authenticateToken, requireRoles('Administrator'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  try {
    const result = await db.prepare('DELETE FROM penerima_manfaat WHERE id_penerima = ?').run(id);
    if (result.changes === 0) {
      return c.json({ message: 'Data penerima manfaat tidak ditemukan.' }, 404);
    }
    return c.json({ message: 'Data penerima manfaat berhasil dihapus.' });
  } catch (error: any) {
    return c.json({ message: 'Gagal menghapus penerima manfaat: ' + error.message }, 500);
  }
});

export default router;
