/* =========================================================
   ORDERS — sipariş kaydı (sektör bağımsız)
   ---------------------------------------------------------
   local modda   : tarayıcıda saklanır (admin panelinden görülür)
   rest modda    : ayrıca sunucuya POST edilir (tüm cihazlardan
                    tek admin panelinden görülebilir hâle gelir)
   Bu modül çiçekçiye özgü hiçbir şey içermez; sepet+WhatsApp
   akışı olan her proje (kiralık araç, restoran, e-ticaret...)
   aynen kullanabilir.
   ========================================================= */

import { store } from './store.js';

const LS_ORDERS = 'mrf_orders_v1';

export function readOrdersLocal() {
  try { return JSON.parse(localStorage.getItem(LS_ORDERS) || '[]'); } catch { return []; }
}

/** Siparişi yerel günlüğe yazar; REST modundaysa arka planda sunucuya da gönderir. */
export function logOrder({ ref, items, note, total, count, text }) {
  const entry = {
    ref, at: new Date().toISOString(), total, count,
    items: items.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
    note, text
  };
  try {
    const log = readOrdersLocal();
    log.unshift(entry);
    localStorage.setItem(LS_ORDERS, JSON.stringify(log.slice(0, 200)));
  } catch {}

  const cfg = store.config;
  if (cfg.storage === 'rest' && cfg.apiBase) {
    fetch(`${String(cfg.apiBase).replace(/\/$/, '')}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, items: entry.items, note, total, count })
    }).catch(err => console.warn('[orders] sunucuya kaydedilemedi (yerel kayıt korunuyor):', err.message));
  }
  return entry;
}

export function clearOrdersLocal() { localStorage.removeItem(LS_ORDERS); }
export function removeOrderLocal(index) {
  const log = readOrdersLocal();
  log.splice(index, 1);
  localStorage.setItem(LS_ORDERS, JSON.stringify(log));
}
