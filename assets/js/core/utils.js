/* =========================================================
   UTILS — DOM, format, guards
   ========================================================= */

export const qs  = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** XSS guard — kullanıcı/CMS kaynaklı her metin bundan geçer. */
export function esc(v) {
  if (v == null) return '';
  return String(v).replace(/[&<>"']/g, m => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));
}

/** Yalnızca güvenli şemalara izin verir (javascript: engellenir). */
export function safeUrl(v, fallback = '') {
  const s = String(v ?? '').trim();
  if (!s) return fallback;
  if (/^(https?:|mailto:|tel:|data:image\/|\/|#|\.\/|\.\.\/)/i.test(s)) return s;
  return fallback;
}

export function get(obj, path, fallback = undefined) {
  const val = String(path).split('.').reduce((a, k) => (a == null ? a : a[k]), obj);
  return val === undefined || val === null ? fallback : val;
}

export function set(obj, path, value) {
  const keys = String(path).split('.');
  const last = keys.pop();
  let node = obj;
  for (const k of keys) {
    if (typeof node[k] !== 'object' || node[k] === null) node[k] = {};
    node = node[k];
  }
  node[last] = value;
  return obj;
}

export const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

/** Derin birleştirme — kaynak alanları hedefin üzerine yazar. */
export function deepMerge(target, source) {
  if (Array.isArray(source)) return clone(source);
  if (typeof source !== 'object' || source === null) return source;
  const out = (typeof target === 'object' && target !== null && !Array.isArray(target)) ? { ...target } : {};
  for (const [k, v] of Object.entries(source)) out[k] = deepMerge(out[k], v);
  return out;
}

export function money(n, symbol = '₺') {
  const num = Number(n) || 0;
  return symbol + num.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function throttle(fn, ms = 60) {
  let last = 0, queued = null;
  return (...a) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...a); }
    else { clearTimeout(queued); queued = setTimeout(() => { last = Date.now(); fn(...a); }, ms - (now - last)); }
  };
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp  = (a, b, t) => a + (b - a) * t;

export function slug(str) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', İ: 'i', Ç: 'c', Ğ: 'g', Ö: 'o', Ş: 's', Ü: 'u' };
  return String(str || '').replace(/[çğıöşüİÇĞÖŞÜ]/g, m => map[m] || m)
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Türkçe duyarlı arama normalizasyonu. */
export function norm(str) {
  return String(str || '').toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, m => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[m]));
}

export function el(tag, attrs = {}, html = '') {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  if (html) node.innerHTML = html;
  return node;
}

/** Görsel yüklenemezse zarif bir degrade yer tutucuya düşer. */
export const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#F4DDE3"/><stop offset="1" stop-color="#E7C9D2"/></linearGradient></defs>
      <rect width="400" height="500" fill="url(#g)"/>
      <g fill="#C2415C" opacity=".55" transform="translate(200 250)">
        <circle cx="0" cy="-34" r="22"/><circle cx="32" cy="-10" r="22"/>
        <circle cx="20" cy="28" r="22"/><circle cx="-20" cy="28" r="22"/>
        <circle cx="-32" cy="-10" r="22"/><circle cx="0" cy="0" r="15" fill="#B8934A"/>
      </g></svg>`);

export function bindImgFallback(root = document) {
  qsa('img', root).forEach(img => {
    if (img.dataset.fbBound) return;
    img.dataset.fbBound = '1';
    img.addEventListener('error', () => {
      if (img.src !== FALLBACK_IMG) img.src = FALLBACK_IMG;
    }, { once: true });
  });
}

/* ---------- ICONS ---------- */
const P = (d, extra = '') => `<svg viewBox="0 0 24 24" ${extra}><path d="${d}"/></svg>`;
export const ICONS = {
  leaf:   P('M4 20c0-8 5-14 16-15 0 11-6 16-14 15zM4 20c3-3 6-5 10-7'),
  hand:   P('M8 13V5.5a1.5 1.5 0 013 0V12m0-1V4.5a1.5 1.5 0 013 0V12m0-1.5a1.5 1.5 0 013 0V13m0-.5a1.5 1.5 0 013 0V16a5 5 0 01-5 5h-3a6 6 0 01-6-6v-3a1.5 1.5 0 013 0'),
  truck:  P('M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 100-4 2 2 0 000 4zM18 19a2 2 0 100-4 2 2 0 000 4z'),
  heart:  P('M12 20s-7-4.6-7-9.4A4.1 4.1 0 0112 8a4.1 4.1 0 017 2.6C19 15.4 12 20 12 20z'),
  gift:   P('M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7S9.5 3 7.5 4.2 9 7 12 7zm0 0s2.5-4 4.5-2.8S15 7 12 7z'),
  rings:  P('M9 15a5 5 0 100-10 5 5 0 000 10zM15 19a5 5 0 100-10 5 5 0 000 10z'),
  baby:   P('M12 21a7 7 0 007-7 7 7 0 00-14 0 7 7 0 007 7zM9.5 12h.01M14.5 12h.01M10 16c1.3 1 2.7 1 4 0M12 7V3'),
  briefcase: P('M3 8h18v12H3zM8 8V5a2 2 0 012-2h4a2 2 0 012 2v3M3 13h18'),
  phone:  P('M6.5 3h3l1.5 4-2 1.5a12 12 0 006.5 6.5L17 13l4 1.5v3a2 2 0 01-2.2 2A17 17 0 014.5 5.2 2 2 0 016.5 3z'),
  mail:   P('M3 6h18v12H3zM3 7l9 6 9-6'),
  pin:    P('M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z'),
  clock:  P('M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2'),
  cart:   P('M6 7h12l-1 13H7L6 7zM9 7a3 3 0 016 0'),
  plus:   P('M12 5v14M5 12h14'),
  eye:    P('M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6zM12 15a3 3 0 100-6 3 3 0 000 6z'),
  check:  P('M5 13l4 4L19 7'),
  arrow:  P('M5 12h14M13 6l6 6-6 6'),
  star:   '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.2A6.6 6.6 0 1018.6 12 6.6 6.6 0 0012 5.4zm0 10.9A4.3 4.3 0 1116.3 12 4.3 4.3 0 0112 16.3zm6.9-11.1a1.5 1.5 0 11-1.5-1.5 1.5 1.5 0 011.5 1.5z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.5l.5-3H13v-2c0-.6.4-1 1-1z"/></svg>',
  whatsapp: '<svg viewBox="0 0 32 32"><path d="M16 3C8.8 3 3 8.8 3 16c0 2.3.6 4.5 1.7 6.4L3 29l6.8-1.8A13 13 0 1016 3zm0 23.6c-2 0-4-.5-5.7-1.6l-.4-.2-4 1 1.1-3.9-.3-.4A10.6 10.6 0 1116 26.6zm6-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.3-.7.1a8.7 8.7 0 01-2.6-1.6 9.6 9.6 0 01-1.8-2.2c-.2-.3 0-.5.1-.7l.5-.6.4-.6v-.6l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 00-.9.4 3.6 3.6 0 00-1.1 2.7 6.3 6.3 0 001.3 3.3 14.3 14.3 0 005.5 4.8c2.6 1 2.6.7 3.1.7a3.3 3.3 0 002.2-1.5 2.7 2.7 0 00.2-1.5c-.1-.2-.4-.3-.7-.5z"/></svg>',
};
export const icon = (name) => ICONS[name] || ICONS.leaf;

/* ---------- TOAST ---------- */
export function toast(msg, sub = '', type = 'ok') {
  const box = qs('#toasts');
  if (!box) return;
  const ic = type === 'warn' ? ICONS.heart : ICONS.check;
  const node = el('div', { class: `toast ${type}` }, `
    <span class="toast-ico">${ic}</span>
    <span class="toast-txt">${esc(msg)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>`);
  box.appendChild(node);
  setTimeout(() => {
    node.classList.add('hide');
    node.addEventListener('animationend', () => node.remove(), { once: true });
  }, 3200);
}
