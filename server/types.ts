import type { Db } from './db';

export interface AuthUser {
  id: number;
  nama: string;
  username: string;
  role: 'Administrator' | 'Kepala SPPG' | 'Relawan';
  id_relawan?: number | null;
}

export type AppEnv = {
  Bindings: {
    DB: D1Database;
    JWT_SECRET: string;
  };
  Variables: {
    db: Db;
    user: AuthUser;
  };
};
