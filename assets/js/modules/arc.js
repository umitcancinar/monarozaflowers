/* =========================================================
   ARC — yarım çember görsel çarkı
   Kaydırma ilerlemesi, ok tuşları, sürükleme ve tekerlek ile döner.
   ========================================================= */

import { qs, qsa, esc, safeUrl, get, clamp, FALLBACK_IMG, bindImgFallback } from '../core/utils.js';

const STEP = 26;           // iki görsel arasındaki açı (derece)
let items = [], active = 0, wheel = null, stage = null, locked = false;

function layout() {
  if (!wheel) return;
  const n = items.length;
  wheel.innerHTML = items.map((it, i) => {
    const a = (i - (n - 1) / 2) * STEP;
    return `
      <figure class="arc-item" style="--a:${a}deg" data-i="${i}">
        <div class="arc-inner"><img src="${esc(safeUrl(it.image, FALLBACK_IMG))}" alt="${esc(it.label || '')}" loading="lazy"></div>
      </figure>`;
  }).join('');
  bindImgFallback(wheel);
  qs('#arc-total').textContent = String(n).padStart(2, '0');
}

function paint() {
  if (!wheel || !items.length) return;
  const n = items.length;
  active = clamp(active, 0, n - 1);
  const a = (active - (n - 1) / 2) * STEP;
  wheel.style.setProperty('--rot', `${-a}deg`);
  qsa('.arc-item', wheel).forEach((node, i) => node.classList.toggle('active', i === active));
  qs('#arc-num').textContent = String(active + 1).padStart(2, '0');
  qs('#arc-label').textContent = items[active]?.label || '';
}

function go(delta) {
  active = clamp(active + delta, 0, items.length - 1);
  locked = true;                       // kullanıcı müdahale ettiyse scroll devralmasın
  setTimeout(() => { locked = false; }, 1400);
  paint();
}

/** Bölüm ekranda ilerledikçe çark kendiliğinden döner. */
function bindScroll() {
  const onScroll = () => {
    if (locked || !stage || !items.length) return;
    const r = stage.getBoundingClientRect();
    const total = r.height + innerHeight;
    const p = clamp((innerHeight - r.top) / total, 0, 1);
    const idx = Math.round(p * (items.length - 1));
    if (idx !== active) { active = idx; paint(); }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function bindDrag() {
  let startX = null, moved = false;
  const down = (x) => { startX = x; moved = false; };
  const move = (x) => {
    if (startX == null) return;
    const dx = x - startX;
    if (Math.abs(dx) > 60) { go(dx < 0 ? 1 : -1); startX = x; moved = true; }
  };
  const up = () => { startX = null; };

  stage.addEventListener('mousedown', (e) => down(e.clientX));
  window.addEventListener('mousemove', (e) => move(e.clientX));
  window.addEventListener('mouseup', up);
  stage.addEventListener('touchstart', (e) => down(e.touches[0].clientX), { passive: true });
  stage.addEventListener('touchmove', (e) => move(e.touches[0].clientX), { passive: true });
  stage.addEventListener('touchend', up);

  stage.addEventListener('click', (e) => {
    const item = e.target.closest('.arc-item');
    if (item && !moved) { active = +item.dataset.i; locked = true; setTimeout(() => locked = false, 1400); paint(); }
  });
}

export function initArc(content) {
  stage = qs('#arc-stage');
  wheel = qs('#arc-wheel');
  if (!stage || !wheel) return;

  items = get(content, 'sections.wheel.items', []);
  if (!items.length) { qs('#showcase').hidden = true; return; }

  layout();
  paint();
  bindScroll();
  bindDrag();

  qs('#arc-next')?.addEventListener('click', () => go(1));
  qs('#arc-prev')?.addEventListener('click', () => go(-1));
  document.addEventListener('keydown', (e) => {
    const r = stage.getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < 0) return;
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });

  // ekran boyutuna göre çember çapı
  const sizeWheel = () => {
    const w = Math.min(innerWidth * 1.25, 1400);
    wheel.style.setProperty('--wheel-size', `${Math.max(760, w)}px`);
  };
  sizeWheel();
  window.addEventListener('resize', sizeWheel);
}

export function refreshArc(content) {
  if (!wheel) return;
  items = get(content, 'sections.wheel.items', []);
  const sec = qs('#showcase');
  if (sec) sec.hidden = !items.length || get(content, 'sections.wheel.enabled', true) === false;
  if (!items.length) return;
  active = clamp(active, 0, items.length - 1);
  layout();
  paint();
}
