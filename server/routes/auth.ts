import { Hono } from 'hono';
import { verifyPassword } from '../password';
import { generateToken, authenticateToken } from '../auth';
import type { AppEnv } from '../types';

const router = new Hono<AppEnv>();

// Login
router.post('/login', async (c) => {
  const db = c.get('db');
  const { username, password } = await c.req.json().catch(() => ({}));

  if (!username || !password) {
    return c.json({ message: 'Nama pengguna atau password tidak sesuai.' }, 400);
  }

  const user = await db.prepare('SELECT * FROM users WHERE username = ? OR id = ?').get(username, username);

  if (!user) {
    return c.json({ message: 'Nama pengguna atau password tidak sesuai.' }, 401);
  }

  const isPasswordMatch = await verifyPassword(password, user.password);
  if (!isPasswordMatch) {
    return c.json({ message: 'Nama pengguna atau password tidak sesuai.' }, 401);
  }

  if (user.status !== 'Aktif') {
    return c.json({ message: 'Akun Anda berstatus nonaktif. Silakan hubungi Administrator.' }, 403);
  }

  // Check if linked to a relawan record
  let relawanRecord: { id_relawan: number } | undefined;
  if (user.role === 'Relawan') {
    relawanRecord = await db.prepare('SELECT id_relawan FROM relawan WHERE id_user = ?').get(user.id);
  }

  const tokenUser = {
    id: user.id,
    nama: user.nama,
    username: user.username,
    role: user.role,
    id_relawan: relawanRecord ? relawanRecord.id_relawan : null,
  };

  const token = await generateToken(tokenUser, c.env.JWT_SECRET);

  return c.json({
    message: 'Berhasil masuk ke sistem.',
    token,
    user: {
      id: user.id,
      nama: user.nama,
      username: user.username,
      role: user.role,
      no_telepon: user.no_telepon,
      alamat: user.alamat,
      status: user.status,
      id_relawan: relawanRecord ? relawanRecord.id_relawan : null,
    },
  });
});

// Current User Info
router.get('/me', authenticateToken, async (c) => {
  const db = c.get('db');
  const authUser = c.get('user');

  const user = await db.prepare('SELECT id, nama, username, role, no_telepon, alamat, status, created_at FROM users WHERE id = ?').get(authUser.id);
  if (!user) {
    return c.json({ message: 'Pengguna tidak ditemukan.' }, 404);
  }

  let id_relawan: number | null = null;
  if (user.role === 'Relawan') {
    const relawanRecord = await db.prepare('SELECT id_relawan FROM relawan WHERE id_user = ?').get(user.id);
    if (relawanRecord) {
      id_relawan = relawanRecord.id_relawan;
    }
  }

  return c.json({ ...user, id_relawan });
});

// Logout
router.post('/logout', (c) => c.json({ message: 'Berhasil keluar dari sistem.' }));

export default router;
