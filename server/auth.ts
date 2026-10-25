import { sign, verify } from 'hono/jwt';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv, AuthUser } from './types';

export type { AuthUser };

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export function generateToken(user: AuthUser, secret: string): Promise<string> {
  return sign(
    {
      id: user.id,
      nama: user.nama,
      username: user.username,
      role: user.role,
      id_relawan: user.id_relawan ?? null,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    },
    secret,
    'HS256'
  );
}

export const authenticateToken: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = c.req.header('authorization')?.split(' ')[1];

  if (!token) {
    return c.json({ message: 'Sesi kedaluwarsa atau token tidak ditemukan. Silakan masuk kembali.' }, 401);
  }

  try {
    const decoded = await verify(token, c.env.JWT_SECRET, 'HS256');
    c.set('user', decoded as unknown as AuthUser);
  } catch {
    return c.json({ message: 'Token tidak valid. Silakan masuk kembali.' }, 401);
  }
  await next();
};

export function requireRoles(...roles: string[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ message: 'Silakan masuk ke sistem terlebih dahulu.' }, 401);
    }

    if (!roles.includes(user.role)) {
      return c.json(
        { message: `Akses Ditolak: Hak akses '${user.role}' tidak diizinkan untuk melakukan tindakan ini.` },
        403
      );
    }
    await next();
  };
}
