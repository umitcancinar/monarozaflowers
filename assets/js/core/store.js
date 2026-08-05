/* =========================================================
   STORE — içerik katmanı (sektör bağımsız)
   ---------------------------------------------------------
   data/content.json  = fabrika ayarı (repo'da versiyonlanır)
   Adapter            = yayındaki içerik kaynağı
     · local : tarayıcı (localStorage) — sunucu gerekmez
     · rest  : { apiBase }/content GET/PUT — çok kullanıcılı
   Admin panelindeki her değişiklik, açık olan site sekmelerine
   BroadcastChannel + storage event ile anında yansır.
   ========================================================= */

import { deepMerge, clone, get } from './utils.js';

const LS_CONTENT = 'mrf_content_v1';
const LS_CONFIG  = 'mrf_config_v1';
const CHANNEL    = 'mrf_sync_v1';
const SEED_URL   = new URL('../../../data/content.json', import.meta.url).href;

/* ---------------- Adapters ---------------- */
const LocalAdapter = {
  id: 'local',
  async read() {
    try { return JSON.parse(localStorage.getItem(LS_CONTENT) || 'null'); }
    catch { return null; }
  },
  async write(data) {
    localStorage.setItem(LS_CONTENT, JSON.stringify(data));
    return true;
  },
  async clear() { localStorage.removeItem(LS_CONTENT); }
};

const RestAdapter = (apiBase) => ({
  id: 'rest',
  async read() {
    const res = await fetch(`${apiBase}/content`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) throw new Error('İçerik okunamadı: ' + res.status);
    // Sunucu birleşik içeriği döner; store'un "override" mantığına uysun diye
    // seed ile farkı almak yerine tamamını override kabul ediyoruz (bkz. init()).
    return await res.json();
  },
  async write(data) {
    const token = localStorage.getItem('mrf_token') || '';
    const res = await fetch(`${apiBase}/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: JSON.stringify(data)
    });
    if (res.status === 401) throw new Error('Oturum süresi doldu, tekrar giriş yapın');
    if (!res.ok) throw new Error('Kayıt başarısız: ' + res.status);
    return true;
  },
  async clear() {}
});

function readConfig() {
  try { return JSON.parse(localStorage.getItem(LS_CONFIG) || '{}'); } catch { return {}; }
}
export function writeConfig(cfg) {
  localStorage.setItem(LS_CONFIG, JSON.stringify(cfg));
}
function makeAdapter() {
  const cfg = readConfig();
  if (cfg.storage === 'rest' && cfg.apiBase) return RestAdapter(String(cfg.apiBase).replace(/\/$/, ''));
  return LocalAdapter;
}

/* ---------------- Store ---------------- */
class ContentStore {
  constructor() {
    this.seed = null;       // repo'daki fabrika içeriği
    this.data = null;       // yayındaki birleşik içerik
    this.overrides = null;  // seed üzerine yazılan farklar
    this.listeners = new Set();
    this.adapter = makeAdapter();
    this.channel = ('BroadcastChannel' in window) ? new BroadcastChannel(CHANNEL) : null;

    if (this.channel) {
      this.channel.onmessage = (e) => {
        if (e.data?.type === 'content' && e.data.payload) this._apply(e.data.payload, false);
      };
    }
    window.addEventListener('storage', (e) => {
      if (e.key === LS_CONTENT && e.newValue) {
        try { this._apply(JSON.parse(e.newValue), false); } catch {}
      }
    });
  }

  async init() {
    const res = await fetch(SEED_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error('data/content.json yüklenemedi (' + res.status + ')');
    this.seed = await res.json();

    let stored = null;
    try { stored = await this.adapter.read(); } catch (err) { console.warn('[store] adapter okunamadı:', err.message); }

    this.overrides = stored || {};
    this.data = deepMerge(clone(this.seed), this.overrides);
    return this.data;
  }

  /**
   * REST modunda diğer cihaz/sekmelerdeki değişiklikleri yakalamak için
   * periyodik olarak içeriği tazeler. Local modda hiçbir şey yapmaz
   * (zaten BroadcastChannel + storage event yeterli).
   */
  startPolling(intervalMs = 15000) {
    this.stopPolling();
    if (this.adapter.id !== 'rest') return;
    this._pollTimer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const fresh = await this.adapter.read();
        const freshAt = get(fresh, 'meta.updatedAt', '');
        const curAt = get(this.data, 'meta.updatedAt', '');
        if (fresh && freshAt && freshAt !== curAt) this._apply(fresh, false);
      } catch { /* geçici ağ hatalarını sessizce yut */ }
    }, intervalMs);
  }
  stopPolling() { clearInterval(this._pollTimer); this._pollTimer = null; }

  _apply(overrides, persist = true) {
    this.overrides = overrides;
    this.data = deepMerge(clone(this.seed), overrides);
    this.listeners.forEach(fn => { try { fn(this.data); } catch (e) { console.error(e); } });
    if (persist) {
      this.adapter.write(overrides).catch(err => console.error('[store] yazılamadı:', err));
      this.channel?.postMessage({ type: 'content', payload: overrides });
    }
  }

  get(path, fallback) { return get(this.data, path, fallback); }

  /** Admin: tüm içeriği (birleşik hâliyle) kaydeder. */
  async save(fullContent) {
    const payload = clone(fullContent);
    payload.meta = { ...(payload.meta || {}), updatedAt: new Date().toISOString() };
    this._apply(payload, true);
    return true;
  }

  /** Fabrika ayarlarına döner. */
  async reset() {
    await this.adapter.clear();
    this.overrides = {};
    this.data = clone(this.seed);
    this.listeners.forEach(fn => fn(this.data));
    this.channel?.postMessage({ type: 'content', payload: {} });
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  get config() { return readConfig(); }
  setConfig(cfg) { writeConfig(cfg); this.adapter = makeAdapter(); }
}

export const store = new ContentStore();
export { LS_CONTENT, LS_CONFIG };
