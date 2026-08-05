/* =========================================================
   MONA ROZA FLOWERS — API + STATİK SUNUCU
   Tek servis: hem siteyi hem yönetim API'sini sunar.
   ========================================================= */

import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { q, table, initSchema } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 5173;
const JWT_SECRET = process.env.JWT_SECRET || 'degistirin-lutfen-' + Math.random().toString(36);
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@monarozaflowers.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'monaroza2026';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '12mb' }));

/* ---------- Güvenlik başlıkları ---------- */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

/* ---------- Basit hız sınırlayıcı (giriş denemeleri) ---------- */
const hits = new Map();
function rateLimit({ windowMs = 60_000, max = 20 } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const rec = hits.get(key) || { count: 0, reset: now + windowMs };
    if (now > rec.reset) { rec.count = 0; rec.reset = now + windowMs; }
    rec.count++;
    hits.set(key, rec);
    if (rec.count > max) return res.status(429).json({ error: 'Çok fazla deneme. Biraz sonra tekrar deneyin.' });
    next();
  };
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (now > v.reset) hits.delete(k); }, 120_000).unref();

/* ---------- Kimlik doğrulama ---------- */
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Yetkisiz' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş' });
  }
}

/* ---------- Sağlık ---------- */
app.get('/api/health', async (_req, res) => {
  try {
    await q('SELECT 1');
    res.json({ ok: true, db: true, time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ ok: false, db: false, error: err.message });
  }
});

/* ---------- İçerik ---------- */
app.get('/api/content', async (_req, res) => {
  try {
    const { rows } = await q(`SELECT data, updated_at FROM ${table('content')} WHERE id = 'site'`);
    if (!rows.length) return res.status(404).json({ error: 'İçerik bulunamadı' });
    res.set('Cache-Control', 'no-store');
    res.json(rows[0].data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/content', auth, async (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ error: 'Geçersiz içerik' });
  }
  try {
    data.meta = { ...(data.meta || {}), updatedAt: new Date().toISOString() };
    await q(
      `INSERT INTO ${table('content')} (id, data, updated_at, updated_by)
       VALUES ('site', $1, now(), $2)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now(), updated_by = EXCLUDED.updated_by`,
      [data, req.user?.email || 'admin']
    );
    res.json({ ok: true, updatedAt: data.meta.updatedAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Siparişler ---------- */
app.post('/api/orders', rateLimit({ max: 40 }), async (req, res) => {
  const { ref, items, note, total, count, customer } = req.body || {};
  if (!ref || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Geçersiz sipariş' });
  }
  try {
    await q(
      `INSERT INTO ${table('orders')} (ref, items, note, total, item_count, customer)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (ref) DO NOTHING`,
      [String(ref).slice(0, 32), JSON.stringify(items), String(note || '').slice(0, 2000),
       Number(total) || 0, parseInt(count, 10) || 0, customer ? JSON.stringify(customer) : null]
    );
    res.status(201).json({ ok: true, ref });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', auth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  try {
    const { rows } = await q(
      `SELECT ref, items, note, total, item_count, status, created_at
       FROM ${table('orders')} ORDER BY created_at DESC LIMIT $1`, [limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:ref', auth, async (req, res) => {
  const status = String(req.body?.status || '').slice(0, 24);
  if (!['new', 'preparing', 'delivered', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Geçersiz durum' });
  }
  try {
    await q(`UPDATE ${table('orders')} SET status = $1 WHERE ref = $2`, [status, req.params.ref]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/orders/:ref', auth, async (req, res) => {
  try {
    await q(`DELETE FROM ${table('orders')} WHERE ref = $1`, [req.params.ref]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Oturum ---------- */
app.post('/api/auth/login', rateLimit({ max: 8, windowMs: 300_000 }), async (req, res) => {
  const email = String(req.body?.email || ADMIN_EMAIL).toLowerCase().trim();
  const password = String(req.body?.password || '');
  try {
    const { rows } = await q(`SELECT email, pass_hash, name FROM ${table('admins')} WHERE email = $1`, [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.pass_hash))) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    }
    const token = jwt.sign({ email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, email: user.email, name: user.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/change-password', auth, async (req, res) => {
  const next = String(req.body?.password || '');
  if (next.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
  try {
    await q(`UPDATE ${table('admins')} SET pass_hash = $1 WHERE email = $2`,
      [await bcrypt.hash(next, 12), req.user.email]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', auth, (req, res) => res.json({ email: req.user.email, name: req.user.name }));

/* ---------- Statik site ---------- */
app.use(express.static(ROOT, {
  extensions: ['html'],
  setHeaders(res, filePath) {
    // CSS/JS dosya adları hash'lenmediği için uzun süre cache'lenmemeli —
    // aksi hâlde bir deploy sonrası kullanıcılar eski kodu görmeye devam eder.
    // ETag ile revalidate edilir: değişmediyse 304, değiştiyse anında yeni içerik.
    if (/\.(css|js)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (/\.(svg|png|jpg|jpeg|webp|woff2|ico)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));
app.get('/', (_req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Bulunamadı' });
  res.status(404).sendFile(path.join(ROOT, '404.html'));
});

/* ---------- Başlat ---------- */
async function start() {
  await initSchema();

  // İlk yönetici hesabı
  const { rows } = await q(`SELECT id FROM ${table('admins')} WHERE email = $1`, [ADMIN_EMAIL]);
  if (!rows.length) {
    await q(`INSERT INTO ${table('admins')} (email, pass_hash, name) VALUES ($1, $2, $3)`,
      [ADMIN_EMAIL, await bcrypt.hash(ADMIN_PASSWORD, 12), 'Mona Roza Yönetici']);
    console.log(`✓ Yönetici oluşturuldu: ${ADMIN_EMAIL}`);
  }

  app.listen(PORT, () => {
    console.log(`\n🌸 Mona Roza Flowers`);
    console.log(`   Site  : http://localhost:${PORT}/`);
    console.log(`   Panel : http://localhost:${PORT}/admin.html`);
    console.log(`   API   : http://localhost:${PORT}/api/health\n`);
  });
}

start().catch(err => {
  console.error('✖ Sunucu başlatılamadı:', err);
  process.exit(1);
});
