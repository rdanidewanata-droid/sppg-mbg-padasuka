import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { Db } from './db';
import type { AppEnv } from './types';

import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import sekolahRouter from './routes/sekolah';
import posyanduRouter from './routes/posyandu';
import relawanRouter from './routes/relawan';
import penerimaRouter from './routes/penerima';
import menuRouter from './routes/menu';
import organoleptikRouter from './routes/organoleptik';
import absensiRouter from './routes/absensi';
import laporanRouter from './routes/laporan';

const app = new Hono<AppEnv>();

app.use('*', cors());
app.use('*', async (c, next) => {
  c.set('db', new Db(c.env.DB));
  await next();
});

app.route('/api/auth', authRouter);
app.route('/api/dashboard', dashboardRouter);
app.route('/api/sekolah', sekolahRouter);
app.route('/api/posyandu', posyanduRouter);
app.route('/api/relawan', relawanRouter);
app.route('/api/penerima', penerimaRouter);
app.route('/api/menu', menuRouter);
app.route('/api/organoleptik', organoleptikRouter);
app.route('/api/absensi', absensiRouter);
app.route('/api/laporan', laporanRouter);

app.get('/api/health', (c) =>
  c.json({
    status: 'ok',
    appName: 'Sistem Informasi Pelaksanaan Program Makan Bergizi Gratis (MBG)',
    unit: 'SPPG Padasuka 2 Cimahi Tengah',
    timestamp: new Date().toISOString(),
  })
);

app.notFound((c) => c.json({ message: 'Endpoint tidak ditemukan.' }, 404));

export default app;
