/* =========================================================
   VERİTABANI — Neon PostgreSQL
   ---------------------------------------------------------
   Tüm tablolar "monaroza" şemasında tutulur; aynı veritabanındaki
   diğer projelerin (public şeması vb.) verileriyle karışmaz.
   ========================================================= */

import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA = process.env.DB_SCHEMA || 'monaroza';

if (!process.env.DATABASE_URL) {
  console.error('✖ DATABASE_URL tanımlı değil. .env dosyasını kontrol edin.');
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30_000,
  // Neon (serverless Postgres) uzun süre boşta kalınca uykuya geçer; ilk
  // bağlantı "uyandırma" isteği birkaç saniye sürebilir. Kısa bir timeout
  // bu durumda sunucunun hiç açılmadan çökmesine yol açar.
  connectionTimeoutMillis: 25_000
});
pool.on('error', (err) => console.error('[db] havuz hatası (yakalandı, süreç düşmez):', err.message));

export const q = (text, params) => pool.query(text, params);
export const table = (name) => `"${SCHEMA}"."${name}"`;

/** Şema + tablolar + ilk içerik. Her açılışta güvenle çalışır. */
export async function initSchema() {
  await q(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}"`);

  await q(`CREATE TABLE IF NOT EXISTS ${table('content')} (
    id          text PRIMARY KEY,
    data        jsonb NOT NULL,
    updated_at  timestamptz NOT NULL DEFAULT now(),
    updated_by  text
  )`);

  await q(`CREATE TABLE IF NOT EXISTS ${table('orders')} (
    id          bigserial PRIMARY KEY,
    ref         text UNIQUE NOT NULL,
    items       jsonb NOT NULL DEFAULT '[]'::jsonb,
    note        text,
    total       numeric(12,2) NOT NULL DEFAULT 0,
    item_count  integer NOT NULL DEFAULT 0,
    customer    jsonb,
    status      text NOT NULL DEFAULT 'new',
    source      text DEFAULT 'web',
    created_at  timestamptz NOT NULL DEFAULT now()
  )`);
  await q(`CREATE INDEX IF NOT EXISTS orders_created_idx ON ${table('orders')} (created_at DESC)`);

  await q(`CREATE TABLE IF NOT EXISTS ${table('admins')} (
    id          bigserial PRIMARY KEY,
    email       text UNIQUE NOT NULL,
    pass_hash   text NOT NULL,
    name        text,
    created_at  timestamptz NOT NULL DEFAULT now()
  )`);

  await q(`CREATE TABLE IF NOT EXISTS ${table('media')} (
    id          bigserial PRIMARY KEY,
    name        text,
    mime        text,
    data        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
  )`);

  // İçerik ilk kez oluşturuluyorsa depodaki fabrika ayarını yaz
  const { rows } = await q(`SELECT id FROM ${table('content')} WHERE id = 'site'`);
  if (!rows.length) {
    const seedPath = path.join(__dirname, '..', 'data', 'content.json');
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    await q(`INSERT INTO ${table('content')} (id, data, updated_by) VALUES ('site', $1, 'seed')`, [seed]);
    console.log('✓ Fabrika içeriği veritabanına yazıldı.');
  }
}

export const SCHEMA_NAME = SCHEMA;
