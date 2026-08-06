/* =========================================================
   ADMIN — Mona Roza Yönetim Paneli
   Şema tabanlı, canlı senkron içerik yöneticisi.
   ========================================================= */

import { qs, qsa, esc, get, set, clone, money, toast, debounce, norm, FALLBACK_IMG } from '../core/utils.js';
import { store } from '../core/store.js';
import { waLink } from '../core/whatsapp.js';
import { readOrdersLocal, removeOrderLocal, clearOrdersLocal } from '../core/orders.js';
import { SCHEMA, PRODUCT_FIELDS, PANEL_ICONS } from './schema.js';

const LS_PIN = 'mrf_admin_pin';
const LS_TOKEN = 'mrf_token';
const DEFAULT_PIN = '1234';
let remoteOrders = null; // REST modunda sunucudan çekilen siparişler (null = henüz çekilmedi)

let draft = null;       // üzerinde çalışılan kopya
let dirty = false;
let activePanel = 'dashboard';
let productFilter = { q: '', cat: 'all' };

/* ================= YARDIMCILAR ================= */
const svg = (d, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

async function hash(text) {
  if (!crypto?.subtle) return 'plain:' + text;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function markDirty(on = true) {
  dirty = on;
  qs('#save-bar')?.classList.toggle('active', on);
  qs('#dirty-dot')?.classList.toggle('on', on);
}

const categories = () => get(draft, 'catalog.categories', []);
const currency = () => get(draft, 'meta.currencySymbol', '₺');

/* ================= GİRİŞ =================
   local modda  : cihazda saklanan (SHA-256) PIN
   rest modda   : sunucudaki gerçek e-posta/şifre — JWT alınır
   ================================================= */
async function initAuth() {
  const gate = qs('#login-gate');
  const emailInput = qs('#gate-email');
  const input = qs('#pin-input');
  const btn = qs('#pin-btn');
  const err = qs('#pin-error');
  const hint = qs('#gate-hint');
  const desc = qs('#gate-desc');

  const isRest = store.isRest;
  const apiBase = store.resolvedApiBase;

  if (isRest) {
    emailInput.hidden = false;
    emailInput.value = store.config.lastEmail || '';
    desc.textContent = 'Yönetici e-posta ve şifrenizle giriş yapın.';
    hint.innerHTML = 'Sunucu tarafında tanımlı bir hesap gereklidir.';
    if (sessionStorage.getItem('mrf_admin_ok') === '1' && localStorage.getItem(LS_TOKEN)) {
      gate.remove();
      return true;
    }
  } else {
    if (!localStorage.getItem(LS_PIN)) localStorage.setItem(LS_PIN, await hash(DEFAULT_PIN));
    if (sessionStorage.getItem('mrf_admin_ok') === '1') { gate.remove(); return true; }
  }

  return new Promise((resolve) => {
    const fail = (msg) => {
      err.textContent = msg;
      qs('.gate-card').classList.add('shake');
      setTimeout(() => qs('.gate-card')?.classList.remove('shake'), 500);
    };

    const tryLogin = async () => {
      const val = input.value.trim();
      if (!val) return;
      btn.disabled = true;

      if (isRest) {
        try {
          const res = await fetch(`${apiBase}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput.value.trim(), password: val })
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) { fail(body.error || 'Giriş başarısız.'); input.value = ''; btn.disabled = false; return; }
          localStorage.setItem(LS_TOKEN, body.token);
          // Bu cihazda REST modunu ve e-postayı kalıcı yapar — bir sonraki
          // açılışta otomatik algılama zaten aynı sonuca varır, bu sadece garantiye alır.
          store.setConfig({ storage: 'rest', apiBase, lastEmail: emailInput.value.trim() });
          sessionStorage.setItem('mrf_admin_ok', '1');
          gate.classList.add('done');
          setTimeout(() => gate.remove(), 500);
          resolve(true);
        } catch {
          fail('Sunucuya ulaşılamadı.'); btn.disabled = false;
        }
        return;
      }

      if (await hash(val) === localStorage.getItem(LS_PIN)) {
        sessionStorage.setItem('mrf_admin_ok', '1');
        gate.classList.add('done');
        setTimeout(() => gate.remove(), 500);
        resolve(true);
      } else {
        fail('Hatalı şifre.');
        input.value = '';
        btn.disabled = false;
      }
    };
    btn.addEventListener('click', tryLogin);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });
    (isRest ? emailInput : input).focus();
  });
}

/* ================= ALAN RENDER ================= */
function fieldHtml(f, value, keyPath) {
  const id = 'f_' + keyPath.replace(/[^\w]/g, '_');
  const label = `<label class="fl" for="${id}">${esc(f.label)}${f.help ? `<i title="${esc(f.help)}">?</i>` : ''}</label>`;
  const v = value ?? '';

  switch (f.type) {
    case 'toggle':
      return `<div class="field-row toggle-row">
        <label class="switch"><input type="checkbox" id="${id}" data-path="${esc(keyPath)}" data-type="toggle" ${value !== false ? 'checked' : ''}><span></span></label>
        <div><b>${esc(f.label)}</b>${f.help ? `<small>${esc(f.help)}</small>` : ''}</div></div>`;

    case 'color':
      return `<div class="field-row">${label}
        <div class="color-wrap">
          <input type="color" id="${id}" data-path="${esc(keyPath)}" data-type="color" value="${esc(v || '#000000')}">
          <input type="text" class="color-text" data-mirror="${esc(keyPath)}" value="${esc(v)}">
        </div></div>`;

    case 'textarea':
      return `<div class="field-row">${label}
        <textarea id="${id}" rows="${f.rows || 3}" data-path="${esc(keyPath)}" data-type="text">${esc(v)}</textarea></div>`;

    case 'lines':
      return `<div class="field-row">${label}
        <textarea id="${id}" rows="${Math.max(3, (Array.isArray(v) ? v.length : 0) + 1)}" data-path="${esc(keyPath)}" data-type="lines">${esc((Array.isArray(v) ? v : []).join('\n'))}</textarea>
        ${f.help ? `<small class="hint">${esc(f.help)}</small>` : ''}</div>`;

    case 'tags':
      return `<div class="field-row">${label}
        <input type="text" id="${id}" data-path="${esc(keyPath)}" data-type="tags" value="${esc((Array.isArray(v) ? v : []).join(', '))}">
        <small class="hint">Virgülle ayırın.</small></div>`;

    case 'pairs':
      return `<div class="field-row">${label}
        <textarea id="${id}" rows="5" data-path="${esc(keyPath)}" data-type="pairs">${esc((Array.isArray(v) ? v : []).map(l => `${l.label} | ${l.href}`).join('\n'))}</textarea>
        <small class="hint">${esc(f.help || 'Her satır: Etiket | #hedef')}</small></div>`;

    case 'number':
      return `<div class="field-row">${label}
        <input type="number" id="${id}" data-path="${esc(keyPath)}" data-type="number"
          ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} value="${esc(v)}"></div>`;

    case 'select': {
      const opts = (f.options || []).map(o => Array.isArray(o) ? o : [o, o])
        .map(([val, txt]) => `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(txt)}</option>`).join('');
      return `<div class="field-row">${label}<select id="${id}" data-path="${esc(keyPath)}" data-type="text">${opts}</select></div>`;
    }

    case 'category': {
      const opts = ['<option value="all">Tümü</option>']
        .concat(categories().map(c => `<option value="${esc(c.id)}" ${v === c.id ? 'selected' : ''}>${esc(c.name)}</option>`)).join('');
      return `<div class="field-row">${label}<select id="${id}" data-path="${esc(keyPath)}" data-type="text">${opts}</select></div>`;
    }

    case 'image':
      return `<div class="field-row">${label}
        <div class="img-field">
          <div class="img-prev"><img src="${esc(v || FALLBACK_IMG)}" alt="" onerror="this.src='${FALLBACK_IMG}'"></div>
          <div class="img-ctrl">
            <input type="text" id="${id}" data-path="${esc(keyPath)}" data-type="image" value="${esc(v)}" placeholder="https://... veya yükleyin">
            <div class="img-btns">
              <button type="button" class="mini" data-upload="${esc(keyPath)}">Bilgisayardan yükle</button>
              <button type="button" class="mini ghost" data-clear="${esc(keyPath)}">Temizle</button>
            </div>
          </div>
        </div></div>`;

    case 'imagelist': {
      const arr = Array.isArray(v) ? v : [];
      return `<div class="field-row">${label}
        <div class="imglist" data-imglist="${esc(keyPath)}">
          ${arr.map((src, i) => `<figure><img src="${esc(src)}" alt="" onerror="this.src='${FALLBACK_IMG}'"><button type="button" data-imgdel="${i}">×</button></figure>`).join('')}
          <button type="button" class="imgadd" data-imgadd="${esc(keyPath)}">+ Görsel</button>
        </div></div>`;
    }

    default:
      return `<div class="field-row">${label}
        <input type="text" id="${id}" data-path="${esc(keyPath)}" data-type="text" value="${esc(v)}">
        ${f.help ? `<small class="hint">${esc(f.help)}</small>` : ''}</div>`;
  }
}

function groupHtml(group) {
  return `<section class="card">
    <h3 class="card-title">${esc(group.title)}</h3>
    <div class="card-body">${group.fields.map(f => fieldHtml(f, get(draft, f.path), f.path)).join('')}</div>
  </section>`;
}

function listHtml(list) {
  const items = get(draft, list.path, []) || [];
  return `<section class="card">
    <h3 class="card-title">${esc(list.title)} <span class="count">${items.length}</span>
      <button class="btn-mini" data-add-list="${esc(list.path)}">+ Yeni Ekle</button>
    </h3>
    <div class="card-body list-body" data-list="${esc(list.path)}">
      ${items.map((item, i) => `
        <details class="li-item" ${items.length <= 3 ? 'open' : ''}>
          <summary>
            <span class="li-drag">⋮⋮</span>
            <b>${esc(item[list.itemLabel] || `#${i + 1}`)}</b>
            <span class="li-tools">
              <button class="li-btn" data-move="${esc(list.path)}" data-i="${i}" data-dir="-1" title="Yukarı">↑</button>
              <button class="li-btn" data-move="${esc(list.path)}" data-i="${i}" data-dir="1" title="Aşağı">↓</button>
              <button class="li-btn danger" data-del-list="${esc(list.path)}" data-i="${i}" title="Sil">×</button>
            </span>
          </summary>
          <div class="li-fields">
            ${list.fields.map(f => fieldHtml(f, item[f.path], `${list.path}.${i}.${f.path}`)).join('')}
          </div>
        </details>`).join('') || '<p class="empty">Henüz kayıt yok.</p>'}
    </div>
  </section>`;
}

/* ================= ÖZEL PANELLER ================= */
function dashboardHtml() {
  const p = get(draft, 'catalog.products', []);
  const orders = readOrders();
  const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const stat = (val, label, sub = '') => `<div class="stat"><b>${esc(val)}</b><span>${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;

  return `
  <div class="stats">
    ${stat(p.length, 'Ürün', `${p.filter(x => x.stock !== false).length} stokta`)}
    ${stat(categories().length, 'Kategori')}
    ${stat(orders.length, 'WhatsApp Siparişi', isRestMode() ? 'tüm cihazlardan (sunucu)' : 'bu tarayıcıdan')}
    ${stat(money(revenue, currency()), 'Toplam Sepet Tutarı')}
  </div>

  <section class="card">
    <h3 class="card-title">Hızlı İşlemler</h3>
    <div class="card-body quick-grid">
      <button class="quick" data-go="products">${svg(PANEL_ICONS.box)}<b>Ürün Ekle / Düzenle</b><small>Fiyat, görsel, stok</small></button>
      <button class="quick" data-go="theme">${svg(PANEL_ICONS.palette)}<b>Renkleri Değiştir</b><small>Tema anında güncellenir</small></button>
      <button class="quick" data-go="integrations">${svg(PANEL_ICONS.chat)}<b>WhatsApp Numarası</b><small>Sipariş hattı</small></button>
      <button class="quick" data-go="hero">${svg(PANEL_ICONS.star)}<b>Anasayfa Metni</b><small>Başlık ve görsel</small></button>
    </div>
  </section>

  <section class="card">
    <h3 class="card-title">Son Siparişler</h3>
    <div class="card-body">
      ${orders.length ? `<div class="table-wrap"><table class="tbl">
        <thead><tr><th>No</th><th>Tarih</th><th>Ürün</th><th>Tutar</th></tr></thead>
        <tbody>${orders.slice(0, 6).map(o => `<tr>
          <td><b>#${esc(o.ref)}</b></td>
          <td>${esc(new Date(o.at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }))}</td>
          <td>${esc(o.count)} adet</td>
          <td><b>${esc(money(o.total, currency()))}</b></td></tr>`).join('')}</tbody>
      </table></div>` : '<p class="empty">Henüz sipariş kaydı yok. Siteden verilen siparişler burada listelenir.</p>'}
    </div>
  </section>`;
}

function productsPanelHtml() {
  const all = get(draft, 'catalog.products', []);
  const q = norm(productFilter.q);
  const list = all.filter(p => {
    if (productFilter.cat !== 'all' && p.category !== productFilter.cat) return false;
    return !q || norm(`${p.name} ${p.id} ${(p.tags || []).join(' ')}`).includes(q);
  });

  return `
  ${SCHEMA.find(s => s.id === 'products').groups.map(groupHtml).join('')}

  <section class="card">
    <h3 class="card-title">Ürün Kataloğu <span class="count">${all.length}</span>
      <button class="btn-mini" id="new-product">+ Yeni Ürün</button>
    </h3>
    <div class="card-body">
      <div class="prod-filters">
        <input type="search" id="prod-q" placeholder="Ürün adı veya kodu ara…" value="${esc(productFilter.q)}">
        <select id="prod-cat">
          <option value="all">Tüm kategoriler</option>
          ${categories().map(c => `<option value="${esc(c.id)}" ${productFilter.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
      </div>

      <div class="table-wrap"><table class="tbl prod-tbl">
        <thead><tr><th></th><th>Kod</th><th>Ürün</th><th>Kategori</th><th>Fiyat</th><th>Stok</th><th></th></tr></thead>
        <tbody>
          ${list.map(p => {
    const idx = all.indexOf(p);
    return `<tr data-i="${idx}">
            <td><img class="thumb" src="${esc(p.image || FALLBACK_IMG)}" alt="" onerror="this.src='${FALLBACK_IMG}'"></td>
            <td><code>${esc(p.id)}</code></td>
            <td><b>${esc(p.name)}</b>${p.featured ? '<span class="pill">Öne çıkan</span>' : ''}</td>
            <td>${esc(categories().find(c => c.id === p.category)?.name || '—')}</td>
            <td><b>${esc(money(p.price, currency()))}</b>${p.oldPrice > p.price ? `<s>${esc(money(p.oldPrice, currency()))}</s>` : ''}</td>
            <td>${p.stock === false ? '<span class="pill off">Tükendi</span>' : '<span class="pill ok">Var</span>'}</td>
            <td class="row-tools">
              <button class="li-btn" data-edit-prod="${idx}" title="Düzenle">✎</button>
              <button class="li-btn" data-copy-prod="${idx}" title="Kopyala">⧉</button>
              <button class="li-btn danger" data-del-prod="${idx}" title="Sil">×</button>
            </td></tr>`;
  }).join('') || '<tr><td colspan="7" class="empty">Kayıt bulunamadı.</td></tr>'}
        </tbody>
      </table></div>
    </div>
  </section>`;
}

/** REST modunda sunucu bağlantısı hazırsa oradan, değilse tarayıcıdan sipariş listesi döner. */
function isRestMode() { return store.isRest; }

function apiUrl(path) { return `${store.resolvedApiBase}${path}`; }
function authHeaders() {
  const token = localStorage.getItem(LS_TOKEN);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function readOrders() {
  if (isRestMode() && Array.isArray(remoteOrders)) {
    return remoteOrders.map(o => ({
      ref: o.ref, at: o.created_at, total: Number(o.total) || 0,
      count: o.item_count, items: o.items || [], note: o.note || '', status: o.status
    }));
  }
  return readOrdersLocal();
}

/** Sunucudan sipariş listesini tazeler ve açık panel siparişse yeniden çizer. */
async function loadRemoteOrders() {
  if (!isRestMode()) return;
  try {
    const res = await fetch(apiUrl('/orders'), { headers: authHeaders() });
    if (res.status === 401) { toast('Oturum süresi doldu', 'Tekrar giriş yapın', 'warn'); return; }
    if (!res.ok) return;
    remoteOrders = await res.json();
    if (activePanel === 'orders' || activePanel === 'dashboard') renderPanel(activePanel);
  } catch { /* sessiz geç — bağlantı geçicidir */ }
}

function ordersPanelHtml() {
  const orders = readOrders();
  const rest = isRestMode();
  return `
  <section class="card">
    <h3 class="card-title">WhatsApp Siparişleri <span class="count">${orders.length}</span>
      <span class="head-tools">
        ${rest ? '<button class="btn-mini ghost" id="orders-refresh">Yenile</button>' : ''}
        <button class="btn-mini ghost" id="orders-csv">CSV indir</button>
        <button class="btn-mini danger" id="orders-clear">Tümünü sil</button>
      </span>
    </h3>
    <div class="card-body">
      <p class="hint">${rest
        ? 'Bu liste sunucudaki (Neon) sipariş tablosundan geliyor — tüm cihazlarda ortaktır.'
        : 'Bu kayıtlar siparişin verildiği tarayıcıda tutulur. Tüm cihazlarda ortak görmek için Sistem sekmesinden REST bağlantısı tanımlayın.'}</p>
      ${orders.length ? orders.map((o, i) => `
        <details class="li-item">
          <summary><b>#${esc(o.ref)}</b>
            <span class="li-sub">${esc(new Date(o.at).toLocaleString('tr-TR'))} · ${esc(o.count)} ürün · ${esc(money(o.total, currency()))}</span>
            <span class="li-tools">
              <button class="li-btn" data-order-wa="${i}" title="WhatsApp'ta aç">↗</button>
              <button class="li-btn danger" data-order-del="${i}" title="Sil">×</button>
            </span>
          </summary>
          <div class="li-fields">
            <ul class="order-items">${(o.items || []).map(it => `<li><code>${esc(it.id)}</code> ${esc(it.name)} — <b>${esc(it.qty)} adet</b> · ${esc(money(it.price * it.qty, currency()))}</li>`).join('')}</ul>
            ${o.note ? `<div class="order-note"><b>Sipariş notu:</b><br>${esc(o.note)}</div>` : ''}
          </div>
        </details>`).join('') : '<p class="empty">Henüz sipariş yok.</p>'}
    </div>
  </section>`;
}

function systemPanelHtml() {
  const cfg = store.config;
  const resolvedRest = store.isRest;
  const auto = !cfg.storage; // kullanıcı elle bir şey seçmediyse otomatik algılama devrede
  return `
  <section class="card">
    <h3 class="card-title">İçerik Kaynağı</h3>
    <div class="card-body">
      ${auto ? `<p class="hint" style="margin:0 0 4px">
        ${resolvedRest
          ? '✓ Bu cihaz aynı adresteki sunucuyu otomatik buldu ve <b>REST modunda</b> çalışıyor. Hiçbir cihazda elle ayar yapmanıza gerek yok — bu ekran sadece istisnai durumlar (test, geçici zorlama) içindir.'
          : 'Bu cihaz bir sunucu bulamadığı için <b>local modda</b> çalışıyor (değişiklikler sadece bu tarayıcıda kalır).'}
      </p>` : ''}
      <div class="field-row">
        <label class="fl">Depolama modu</label>
        <select id="cfg-storage">
          <option value="local" ${!resolvedRest ? 'selected' : ''}>Tarayıcı (local) — sunucu gerekmez</option>
          <option value="rest" ${resolvedRest ? 'selected' : ''}>REST API — çok kullanıcılı / canlı</option>
        </select>
        <small class="hint">Bu seçim yalnızca BU CİHAZI etkiler. Diğer ziyaretçiler her zaman otomatik algılama kullanır.</small>
      </div>
      <div class="field-row">
        <label class="fl">API adresi</label>
        <input type="text" id="cfg-api" value="${esc(store.resolvedApiBase)}" placeholder="https://siteniz.com/api">
        <small class="hint">Sunucu <code>GET /content</code> ve <code>PUT /content</code> uçlarını sunmalıdır.</small>
      </div>
      <button class="btn primary" id="cfg-save">Bu Cihaz İçin Zorla Kaydet</button>
    </div>
  </section>

  <section class="card">
    <h3 class="card-title">Yedekleme</h3>
    <div class="card-body btn-row">
      <button class="btn" id="export-json">content.json indir</button>
      <button class="btn" id="import-json">Yedekten yükle</button>
      <button class="btn danger" id="factory-reset">Fabrika ayarlarına dön</button>
      <input type="file" id="import-file" accept="application/json" hidden>
    </div>
  </section>

  <section class="card">
    <h3 class="card-title">Panel Şifresi</h3>
    <div class="card-body">
      <div class="field-row"><label class="fl">Yeni şifre</label><input type="password" id="new-pin" placeholder="En az ${isRestMode() ? 6 : 4} karakter" autocomplete="new-password"></div>
      <button class="btn primary" id="save-pin">Şifreyi Güncelle</button>
      <small class="hint">${isRestMode()
        ? 'Sunucudaki gerçek yönetici hesabınızın şifresi güncellenir (bcrypt ile şifreli saklanır).'
        : 'Şifre bu cihazda saklanır (SHA-256). Tüm cihazlarda ortak / gerçek kullanıcı yönetimi için REST modunu kullanın.'}</small>
    </div>
  </section>`;
}

/* ================= PANEL RENDER ================= */
function renderPanel(id) {
  activePanel = id;
  const def = SCHEMA.find(s => s.id === id);
  const main = qs('#panel-body');
  qsa('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.panel === id));
  qs('#panel-title').textContent = def?.label || '';

  let html = '';
  if (def?.custom === 'dashboard') html = dashboardHtml();
  else if (def?.custom === 'products') html = productsPanelHtml();
  else if (def?.custom === 'orders') html = ordersPanelHtml();
  else if (def?.custom === 'system') html = systemPanelHtml();
  else {
    html = (def?.groups || []).map(groupHtml).join('') + (def?.lists || []).map(listHtml).join('');
  }

  if ((id === 'orders' || id === 'dashboard') && isRestMode() && remoteOrders === null) loadRemoteOrders();
  main.innerHTML = html;
  main.scrollTop = 0;
  qs('#mobile-nav')?.classList.remove('open');
}

/* ================= ÜRÜN DÜZENLEYİCİ ================= */
function openProductEditor(index) {
  const all = get(draft, 'catalog.products', []);
  const isNew = index == null;
  if (isNew) {
    const next = `MR-${String(1000 + all.length + 1)}`;
    all.push({ id: next, name: 'Yeni Ürün', category: categories()[0]?.id || '', price: 0, oldPrice: 0, badge: '', desc: '', tags: [], image: '', images: [], featured: false, stock: true });
    set(draft, 'catalog.products', all);
    index = all.length - 1;
    markDirty();
  }
  const p = all[index];
  const modal = qs('#prod-modal');
  qs('#prod-modal-title').textContent = isNew ? 'Yeni Ürün' : p.name;
  qs('#prod-form').innerHTML = PRODUCT_FIELDS.map(f => fieldHtml(f, p[f.path], `catalog.products.${index}.${f.path}`)).join('');
  modal.classList.add('open');
  modal.dataset.i = index;
}
function closeProductEditor() {
  qs('#prod-modal').classList.remove('open');
  renderPanel('products');
}

/* ================= DEĞER YAZMA ================= */
function applyInput(el) {
  const path = el.dataset.path;
  if (!path) return;
  const type = el.dataset.type;
  let val;
  switch (type) {
    case 'toggle': val = el.checked; break;
    case 'number': val = el.value === '' ? 0 : Number(el.value); break;
    case 'lines': val = el.value.split('\n').map(s => s.trim()).filter(Boolean); break;
    case 'tags': val = el.value.split(',').map(s => s.trim()).filter(Boolean); break;
    case 'pairs': val = el.value.split('\n').map(l => {
      const [label, href] = l.split('|').map(s => (s || '').trim());
      return label ? { label, href: href || '#' } : null;
    }).filter(Boolean); break;
    default: val = el.value;
  }
  set(draft, path, val);
  markDirty();
  livePreview();
}

/* Canlı önizleme: kaydetmeden iframe'i günceller */
const livePreview = debounce(() => {
  const frame = qs('#preview-frame');
  if (!frame?.contentWindow) return;
  try {
    frame.contentWindow.postMessage({ type: 'mrf-preview', payload: clone(draft) }, location.origin);
  } catch {}
}, 260);

/* ================= DOSYA / GÖRSEL ================= */
/**
 * Görsel seçici. Sunucu (REST) modundaysa dosya ImgBB'ye yüklenir ve
 * sadece barındırılan URL saklanır (DB şişmez, site hızlı kalır).
 * Sunucu yoksa (local mod) eski davranış: küçük görseller base64 olarak gömülür.
 */
function pickImage(path, onDone) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;

    if (isRestMode()) {
      if (file.size > 12 * 1024 * 1024) {
        toast('Görsel çok büyük', 'En fazla 12 MB yükleyin', 'warn');
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        toast('Yükleniyor…', file.name);
        try {
          const res = await fetch(apiUrl('/upload'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ image: reader.result, name: file.name })
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error || 'Yükleme başarısız');
          onDone(body.url);
          toast('Görsel yüklendi ve barındırıldı');
        } catch (err) {
          toast('Sunucuya yüklenemedi', err.message + ' — geçici olarak tarayıcıda saklanıyor', 'warn');
          if (file.size <= 900 * 1024) onDone(reader.result);
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    if (file.size > 900 * 1024) {
      toast('Görsel çok büyük', 'Local modda en fazla ~900 KB — Sistem sekmesinden REST moduna geçerek ImgBB üzerinden büyük görsel yükleyebilirsiniz', 'warn');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { onDone(reader.result); };
    reader.readAsDataURL(file);
  };
  input.click();
}

/* ================= KAYDET / DIŞA AKTAR ================= */
async function saveAll() {
  try {
    await store.save(draft);
    markDirty(false);
    toast('Yayınlandı', 'Açık olan site sekmeleri anında güncellendi');
  } catch (err) {
    toast('Kaydedilemedi', err.message, 'warn');
  }
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'content.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('content.json indirildi', 'data/ klasörüne koyup depoya gönderin');
}

function ordersCsv() {
  const orders = readOrders();
  const rows = [['Sipariş No', 'Tarih', 'Ürün Kodu', 'Ürün', 'Adet', 'Birim Fiyat', 'Tutar', 'Not']];
  orders.forEach(o => (o.items || []).forEach(it => rows.push([
    o.ref, new Date(o.at).toLocaleString('tr-TR'), it.id, it.name, it.qty, it.price, it.price * it.qty, (o.note || '').replace(/\n/g, ' ')
  ])));
  const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'siparisler.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ================= OLAYLAR ================= */
function bindGlobalEvents() {
  // menü
  qs('#side-nav').addEventListener('click', (e) => {
    const item = e.target.closest('.nav-item');
    if (item) renderPanel(item.dataset.panel);
  });

  qs('#panel-body').addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.path) {
      applyInput(el);
      if (el.dataset.type === 'color') {
        const mirror = qs(`[data-mirror="${el.dataset.path}"]`);
        if (mirror) mirror.value = el.value;
      }
      if (el.dataset.type === 'image') {
        const prev = el.closest('.img-field')?.querySelector('img');
        if (prev) prev.src = el.value || FALLBACK_IMG;
      }
    }
    if (el.dataset.mirror) {
      const target = qs(`[data-path="${el.dataset.mirror}"][data-type="color"]`);
      if (target && /^#[0-9a-f]{3,8}$/i.test(el.value)) { target.value = el.value; applyInput(target); }
    }
    if (el.id === 'prod-q') { productFilter.q = el.value; renderPanel('products'); qs('#prod-q')?.focus(); }
  });

  qs('#panel-body').addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.path) applyInput(el);
    if (el.id === 'prod-cat') { productFilter.cat = el.value; renderPanel('products'); }
    if (el.id === 'cfg-storage' || el.id === 'cfg-api') { /* kaydet butonuyla */ }
  });

  qs('#panel-body').addEventListener('click', (e) => {
    const t = e.target;

    const go = t.closest('[data-go]');
    if (go) return renderPanel(go.dataset.go);

    // liste işlemleri
    const add = t.closest('[data-add-list]');
    if (add) {
      const path = add.dataset.addList;
      const arr = get(draft, path, []) || [];
      const def = SCHEMA.flatMap(s => s.lists || []).find(l => l.path === path);
      const blank = {};
      (def?.fields || []).forEach(f => {
        blank[f.path] = f.type === 'toggle' ? true : f.type === 'number' ? 0 : (f.type === 'pairs' || f.type === 'tags' || f.type === 'imagelist') ? [] : '';
      });
      arr.push(blank);
      set(draft, path, arr);
      markDirty(); livePreview(); renderPanel(activePanel);
      return;
    }

    const del = t.closest('[data-del-list]');
    if (del) {
      const path = del.dataset.delList;
      const arr = get(draft, path, []) || [];
      arr.splice(+del.dataset.i, 1);
      set(draft, path, arr);
      markDirty(); livePreview(); renderPanel(activePanel);
      return;
    }

    const mv = t.closest('[data-move]');
    if (mv) {
      const path = mv.dataset.move;
      const arr = get(draft, path, []) || [];
      const i = +mv.dataset.i, j = i + (+mv.dataset.dir);
      if (j >= 0 && j < arr.length) {
        [arr[i], arr[j]] = [arr[j], arr[i]];
        set(draft, path, arr);
        markDirty(); livePreview(); renderPanel(activePanel);
      }
      return;
    }

    // görsel
    const up = t.closest('[data-upload]');
    if (up) {
      pickImage(up.dataset.upload, (dataUrl) => {
        set(draft, up.dataset.upload, dataUrl);
        markDirty(); livePreview();
        const wrap = up.closest('.img-field');
        wrap.querySelector('img').src = dataUrl;
        wrap.querySelector('input').value = dataUrl.slice(0, 64) + '…';
        wrap.querySelector('input').dataset.raw = '1';
        toast('Görsel yüklendi');
      });
      return;
    }
    const clr = t.closest('[data-clear]');
    if (clr) {
      set(draft, clr.dataset.clear, '');
      markDirty(); livePreview();
      const wrap = clr.closest('.img-field');
      wrap.querySelector('img').src = FALLBACK_IMG;
      wrap.querySelector('input').value = '';
      return;
    }
    const imgAdd = t.closest('[data-imgadd]');
    if (imgAdd) {
      const path = imgAdd.dataset.imgadd;
      pickImage(path, (dataUrl) => {
        const arr = get(draft, path, []) || [];
        arr.push(dataUrl);
        set(draft, path, arr);
        markDirty(); livePreview();
        if (activePanel === 'products') openProductEditor(+qs('#prod-modal').dataset.i);
      });
      return;
    }

    // ürünler
    if (t.closest('#new-product')) return openProductEditor(null);
    const ep = t.closest('[data-edit-prod]');
    if (ep) return openProductEditor(+ep.dataset.editProd);
    const cp = t.closest('[data-copy-prod]');
    if (cp) {
      const arr = get(draft, 'catalog.products', []);
      const copy = clone(arr[+cp.dataset.copyProd]);
      copy.id = copy.id + '-K';
      copy.name = copy.name + ' (kopya)';
      arr.splice(+cp.dataset.copyProd + 1, 0, copy);
      set(draft, 'catalog.products', arr);
      markDirty(); livePreview(); renderPanel('products');
      return;
    }
    const dp = t.closest('[data-del-prod]');
    if (dp) {
      const arr = get(draft, 'catalog.products', []);
      if (confirm(`"${arr[+dp.dataset.delProd].name}" silinsin mi?`)) {
        arr.splice(+dp.dataset.delProd, 1);
        set(draft, 'catalog.products', arr);
        markDirty(); livePreview(); renderPanel('products');
      }
      return;
    }

    // siparişler
    const owa = t.closest('[data-order-wa]');
    if (owa) {
      const o = readOrders()[+owa.dataset.orderWa];
      const text = o.text || `Sipariş #${o.ref}\n` + (o.items || []).map(it => `${it.qty}x ${it.name} (${it.id})`).join('\n') + (o.note ? `\nNot: ${o.note}` : '');
      window.open(waLink(get(draft, 'integrations.whatsapp.phone', ''), text), '_blank', 'noopener');
      return;
    }
    const odel = t.closest('[data-order-del]');
    if (odel) {
      const i = +odel.dataset.orderDel;
      if (isRestMode()) {
        const ref = readOrders()[i]?.ref;
        fetch(apiUrl(`/orders/${encodeURIComponent(ref)}`), { method: 'DELETE', headers: authHeaders() })
          .then(() => loadRemoteOrders()).catch(() => toast('Silinemedi', '', 'warn'));
      } else {
        removeOrderLocal(i);
        renderPanel('orders');
      }
      return;
    }
    if (t.closest('#orders-refresh')) { loadRemoteOrders(); toast('Siparişler tazelendi'); return; }
    if (t.closest('#orders-clear')) {
      if (!confirm('Tüm sipariş kayıtları silinsin mi? Bu işlem geri alınamaz.')) return;
      if (isRestMode()) {
        Promise.all(readOrders().map(o => fetch(apiUrl(`/orders/${encodeURIComponent(o.ref)}`), { method: 'DELETE', headers: authHeaders() })))
          .then(() => loadRemoteOrders());
      } else {
        clearOrdersLocal();
        renderPanel('orders');
      }
      return;
    }
    if (t.closest('#orders-csv')) return ordersCsv();

    // sistem
    if (t.closest('#export-json')) return downloadJson();
    if (t.closest('#import-json')) return qs('#import-file').click();
    if (t.closest('#factory-reset')) {
      if (confirm('Tüm özelleştirmeler silinip fabrika içeriğine dönülecek. Onaylıyor musunuz?')) {
        store.reset().then(() => { draft = clone(store.data); markDirty(false); renderPanel(activePanel); toast('Fabrika ayarlarına dönüldü'); });
      }
      return;
    }
    if (t.closest('#cfg-save')) {
      store.setConfig({ ...store.config, storage: qs('#cfg-storage').value, apiBase: qs('#cfg-api').value.trim() });
      toast('Bağlantı kaydedildi', 'Değişikliğin etkili olması için sayfa yenilenecek');
      setTimeout(() => location.reload(), 900);
      return;
    }
    if (t.closest('#save-pin')) {
      const val = qs('#new-pin').value.trim();
      const min = isRestMode() ? 6 : 4;
      if (val.length < min) return toast(`Şifre en az ${min} karakter olmalı`, '', 'warn');

      if (isRestMode()) {
        fetch(apiUrl('/auth/change-password'), {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ password: val })
        }).then(async (res) => {
          if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Güncellenemedi'); }
          qs('#new-pin').value = '';
          toast('Sunucu şifresi güncellendi');
        }).catch(err => toast('Şifre güncellenemedi', err.message, 'warn'));
      } else {
        hash(val).then(h => { localStorage.setItem(LS_PIN, h); qs('#new-pin').value = ''; toast('Şifre güncellendi'); });
      }
      return;
    }
  });

  // ürün modalı
  qs('#prod-form').addEventListener('input', (e) => { if (e.target.dataset.path) applyInput(e.target); });
  qs('#prod-form').addEventListener('change', (e) => { if (e.target.dataset.path) applyInput(e.target); });
  qs('#prod-form').addEventListener('click', (e) => {
    const up = e.target.closest('[data-upload]');
    if (up) {
      pickImage(up.dataset.upload, (dataUrl) => {
        set(draft, up.dataset.upload, dataUrl);
        markDirty(); livePreview();
        up.closest('.img-field').querySelector('img').src = dataUrl;
      });
      return;
    }
    const clr = e.target.closest('[data-clear]');
    if (clr) {
      set(draft, clr.dataset.clear, '');
      markDirty(); livePreview();
      clr.closest('.img-field').querySelector('img').src = FALLBACK_IMG;
      clr.closest('.img-field').querySelector('input').value = '';
    }
    const iadd = e.target.closest('[data-imgadd]');
    if (iadd) {
      pickImage(iadd.dataset.imgadd, (dataUrl) => {
        const arr = get(draft, iadd.dataset.imgadd, []) || [];
        arr.push(dataUrl);
        set(draft, iadd.dataset.imgadd, arr);
        markDirty(); livePreview();
        openProductEditor(+qs('#prod-modal').dataset.i);
      });
    }
    const idel = e.target.closest('[data-imgdel]');
    if (idel) {
      const listPath = idel.closest('[data-imglist]').dataset.imglist;
      const arr = get(draft, listPath, []) || [];
      arr.splice(+idel.dataset.imgdel, 1);
      set(draft, listPath, arr);
      markDirty(); livePreview();
      openProductEditor(+qs('#prod-modal').dataset.i);
    }
  });
  qs('#prod-close').addEventListener('click', closeProductEditor);
  qs('#prod-modal').addEventListener('click', (e) => { if (e.target.id === 'prod-modal') closeProductEditor(); });

  // içe aktarma
  qs('#import-file')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object') throw new Error('Geçersiz dosya');
        draft = data;
        markDirty();
        renderPanel(activePanel);
        toast('Yedek yüklendi', 'Yayınlamak için Kaydet deyin');
      } catch (err) { toast('Dosya okunamadı', err.message, 'warn'); }
    };
    reader.readAsText(file);
  });

  // üst bar
  qs('#save-btn').addEventListener('click', saveAll);
  qs('#revert-btn').addEventListener('click', () => {
    draft = clone(store.data);
    markDirty(false);
    renderPanel(activePanel);
    livePreview();
    toast('Değişiklikler geri alındı');
  });
  qs('#preview-toggle').addEventListener('click', () => {
    const on = document.body.classList.toggle('preview-on');
    if (on && !qs('#preview-frame').src) qs('#preview-frame').src = 'index.html';
    setTimeout(livePreview, 900);
  });
  qs('#logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('mrf_admin_ok');
    localStorage.removeItem(LS_TOKEN);
    location.reload();
  });
  qs('#burger-admin').addEventListener('click', () => qs('#mobile-nav').classList.toggle('open'));
  qs('#theme-admin').addEventListener('click', () => {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('mrf_admin_theme', next);
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveAll(); }
    if (e.key === 'Escape' && qs('#prod-modal').classList.contains('open')) closeProductEditor();
  });

  window.addEventListener('beforeunload', (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });
}

/* ================= BAŞLAT ================= */
async function boot() {
  document.documentElement.setAttribute('data-theme', localStorage.getItem('mrf_admin_theme') || 'dark');

  try {
    await store.init();
  } catch (err) {
    document.body.innerHTML = `<div style="padding:40px;font:15px/1.7 system-ui;color:#e6d">
      <h2>İçerik yüklenemedi</h2><p>${esc(err.message)}</p>
      <p>Paneli bir HTTP sunucusu üzerinden açın: <code>python3 -m http.server 5173</code></p></div>`;
    return;
  }

  await initAuth();
  draft = clone(store.data);

  qs('#side-nav').innerHTML = SCHEMA.map(s => `
    <button class="nav-item ${s.id === 'dashboard' ? 'active' : ''}" data-panel="${s.id}">
      ${svg(PANEL_ICONS[s.icon] || PANEL_ICONS.grid)}<span>${esc(s.label)}</span>
    </button>`).join('');
  qs('#mobile-nav').innerHTML = qs('#side-nav').innerHTML;
  qs('#mobile-nav').addEventListener('click', (e) => {
    const item = e.target.closest('.nav-item');
    if (item) renderPanel(item.dataset.panel);
  });

  qs('#brand-name').textContent = get(draft, 'brand.name', 'YÖNETİM');
  renderPanel('dashboard');
  bindGlobalEvents();

  console.info('%c🌸 Mona Roza Admin', 'color:#C2415C;font-weight:700', 'hazır');
}

boot();
