/* =========================================================
   SHOP — ürün ızgarası, filtre, hızlı bakış, sepet, WhatsApp checkout
   ========================================================= */

import { qs, qsa, esc, safeUrl, get, money, icon, norm, debounce, toast, FALLBACK_IMG, bindImgFallback } from '../core/utils.js';
import { cart } from '../core/cart.js';
import { waLink, buildOrderMessage, buildProductMessage } from '../core/whatsapp.js';
import { logOrder } from '../core/orders.js';
import { observeReveal } from './motion.js';

let C = null;                 // aktif içerik
let state = { cat: 'all', q: '', sort: 'default', page: 1 };
let pageSize = 9;

const sym = () => get(C, 'meta.currencySymbol', '₺');
const products = () => get(C, 'catalog.products', []);
const categories = () => [...get(C, 'catalog.categories', [])].sort((a, b) => (a.order || 0) - (b.order || 0));
const catName = (id) => categories().find(c => c.id === id)?.name || id || '';
const findProduct = (id) => products().find(p => String(p.id) === String(id));

/* ---------------- LİSTELEME ---------------- */
function filtered() {
  const q = norm(state.q);
  let list = products().filter(p => {
    if (state.cat !== 'all' && p.category !== state.cat) return false;
    if (!q) return true;
    return norm(`${p.name} ${p.id} ${p.desc} ${(p.tags || []).join(' ')} ${catName(p.category)}`).includes(q);
  });

  switch (state.sort) {
    case 'price-asc': list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0)); break;
    case 'price-desc': list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0)); break;
    case 'name': list = [...list].sort((a, b) => String(a.name).localeCompare(String(b.name), 'tr')); break;
    default: list = [...list].sort((a, b) => (b.featured === true) - (a.featured === true));
  }
  return list;
}

function cardHtml(p) {
  const hasSale = Number(p.oldPrice) > Number(p.price);
  const off = hasSale ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const out = p.stock === false;
  return `
  <article class="p-card${out ? ' out' : ''}" data-id="${esc(p.id)}">
    <div class="p-media">
      <img src="${esc(safeUrl(p.image, FALLBACK_IMG))}" alt="${esc(p.name)}" loading="lazy">
      <div class="p-badges">
        ${p.badge ? `<span class="p-badge${/indirim/i.test(p.badge) ? ' sale' : ''}">${esc(p.badge)}</span>` : ''}
        ${hasSale ? `<span class="p-badge sale">%${off} İNDİRİM</span>` : ''}
      </div>
      <span class="p-code">${esc(p.id)}</span>
      ${out ? '<div class="p-out-label">TÜKENDİ</div>' : `
      <div class="p-quick">
        <button class="pq-view" data-act="view" type="button">${icon('eye')} İncele</button>
        <button class="pq-add" data-act="add" type="button">${icon('cart')} Sepete Ekle</button>
      </div>`}
    </div>
    <div class="p-body">
      <span class="p-cat">${esc(catName(p.category))}</span>
      <h3 class="p-name">${esc(p.name)}</h3>
      <p class="p-desc">${esc(p.desc || '')}</p>
      <div class="p-foot">
        <div class="p-price">
          <b>${money(p.price, sym())}</b>
          ${hasSale ? `<s>${money(p.oldPrice, sym())}</s>` : ''}
        </div>
        ${out ? '' : `<button class="p-add" data-act="add" aria-label="Sepete ekle" type="button">${icon('plus')}</button>`}
      </div>
    </div>
  </article>`;
}

export function renderProducts() {
  const grid = qs('#product-grid');
  if (!grid) return;
  const list = filtered();
  const shown = list.slice(0, state.page * pageSize);

  grid.innerHTML = shown.map(cardHtml).join('');
  qs('#product-empty').hidden = list.length > 0;
  qs('.load-more-wrap').hidden = shown.length >= list.length;
  bindImgFallback(grid);
  observeReveal(grid);
  // görünüm alanındaki kartlar hemen açılsın
  requestAnimationFrame(() => qsa('.p-card', grid).forEach((c, i) => {
    if (c.getBoundingClientRect().top < innerHeight) setTimeout(() => c.classList.add('in'), i * 55);
  }));
}

function renderFilters() {
  const bar = qs('#filter-bar');
  if (!bar) return;
  if (get(C, 'sections.products.showFilter', true) === false) { bar.hidden = true; return; }
  bar.hidden = false;
  const counts = products().reduce((m, p) => (m[p.category] = (m[p.category] || 0) + 1, m), {});
  const chips = [`<button class="chip${state.cat === 'all' ? ' active' : ''}" data-cat="all" role="tab">Tümü <b>${products().length}</b></button>`]
    .concat(categories().map(c =>
      `<button class="chip${state.cat === c.id ? ' active' : ''}" data-cat="${esc(c.id)}" role="tab">${esc(c.name)} <b>${counts[c.id] || 0}</b></button>`));
  bar.innerHTML = chips.join('');
}

/* ---------------- SEPETE EKLEME + UÇUŞ ANİMASYONU ---------------- */
function flyToCart(sourceImg) {
  const target = qs('#cart-btn');
  if (!sourceImg || !target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const from = sourceImg.getBoundingClientRect();
  const to = target.getBoundingClientRect();

  const ghost = document.createElement('img');
  ghost.src = sourceImg.currentSrc || sourceImg.src;
  ghost.className = 'fly-img';
  Object.assign(ghost.style, {
    left: from.left + 'px', top: from.top + 'px',
    width: from.width + 'px', height: from.height + 'px'
  });
  document.body.appendChild(ghost);

  const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
  const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
  const anim = ghost.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1, borderRadius: '14px' },
    { transform: `translate(${dx * 0.55}px, ${dy * 0.5 - 90}px) scale(.5) rotate(-12deg)`, opacity: .95, offset: .55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.08) rotate(8deg)`, opacity: 0, borderRadius: '50%' }
  ], { duration: 850, easing: 'cubic-bezier(.5,0,.35,1)' });
  anim.onfinish = () => ghost.remove();
}

export function addToCart(product, qty = 1, sourceImg = null) {
  if (!product) return;
  if (product.stock === false) { toast('Bu ürün şu an tükendi', '', 'warn'); return; }
  cart.add(product, qty);
  flyToCart(sourceImg);
  const badge = qs('#cart-count');
  badge?.classList.remove('pop');
  void badge?.offsetWidth;
  badge?.classList.add('pop');
  toast('Sepete eklendi', `${product.name} · ${qty} adet`);
  document.dispatchEvent(new CustomEvent('mascot:say', { detail: 'Sepetine eklendi! Devam edelim mi? 🌸' }));
}

/* ---------------- HIZLI BAKIŞ ---------------- */
let qvProduct = null;
function openQuickView(id) {
  const p = findProduct(id);
  if (!p) return;
  qvProduct = p;
  const modal = qs('#quickview');
  const gallery = [p.image, ...(p.images || [])].filter(Boolean);
  const hasSale = Number(p.oldPrice) > Number(p.price);

  qs('#qv-code').textContent = `Ürün Kodu: ${p.id}`;
  qs('#qv-name').textContent = p.name;
  qs('#qv-price').textContent = money(p.price, sym());
  qs('#qv-old').textContent = hasSale ? money(p.oldPrice, sym()) : '';
  qs('#qv-old').hidden = !hasSale;
  qs('#qv-desc').textContent = p.desc || '';
  qs('#qv-tags').innerHTML = (p.tags || []).map(t => `<span>#${esc(t)}</span>`).join('');
  qs('#qv-qty').value = 1;
  qs('#qv-img').src = safeUrl(gallery[0], FALLBACK_IMG);
  qs('#qv-img').alt = p.name;
  qs('#qv-thumbs').innerHTML = gallery.length > 1
    ? gallery.map((g, i) => `<img src="${esc(safeUrl(g, FALLBACK_IMG))}" class="${i === 0 ? 'active' : ''}" alt="">`).join('')
    : '';

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  bindImgFallback(modal);
}
function closeQuickView() {
  const modal = qs('#quickview');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
}

/* ---------------- SEPET ÇEKMECESİ ---------------- */
function openCart(open = true) {
  const drawer = qs('#cart-drawer');
  const ov = qs('#drawer-overlay');
  drawer.classList.toggle('open', open);
  ov.classList.toggle('show', open);
  drawer.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('no-scroll', open);
}

function renderCart() {
  const body = qs('#cart-body');
  const drawer = qs('#cart-drawer');
  if (!body || !drawer) return;

  drawer.classList.toggle('empty', cart.items.length === 0);
  qs('#cart-count').textContent = cart.count;
  qs('#cart-head-count').textContent = `(${cart.count} ürün)`;
  qs('#cart-total').textContent = money(cart.total, sym());

  body.innerHTML = cart.items.map(i => `
    <div class="cart-item" data-id="${esc(i.id)}">
      <img class="ci-img" src="${esc(safeUrl(i.image, FALLBACK_IMG))}" alt="${esc(i.name)}">
      <div class="ci-info">
        <h4>${esc(i.name)}</h4>
        <span class="ci-code">${esc(i.id)}</span>
        <div class="ci-price">${money(i.price * i.qty, sym())}</div>
      </div>
      <div class="ci-right">
        <div class="qty-box">
          <button class="qty-btn" data-act="dec" aria-label="Azalt">−</button>
          <input type="number" value="${i.qty}" min="1" max="99" aria-label="Adet">
          <button class="qty-btn" data-act="inc" aria-label="Artır">+</button>
        </div>
        <button class="ci-del" data-act="del">Kaldır</button>
      </div>
    </div>`).join('');

  const note = qs('#order-note');
  if (note && note.value !== cart.note) note.value = cart.note;
  qs('#note-len').textContent = (cart.note || '').length;
  bindImgFallback(body);
}

/* ---------------- CHECKOUT ---------------- */
function checkout() {
  if (!cart.items.length) { toast('Sepetiniz boş', 'Önce birkaç çiçek ekleyin', 'warn'); return; }
  const phone = get(C, 'integrations.whatsapp.phone', '');
  if (!String(phone).replace(/\D/g, '')) {
    toast('WhatsApp numarası tanımlı değil', 'Admin panelinden ekleyin', 'warn');
    return;
  }
  const { text, ref } = buildOrderMessage(cart, C);
  window.open(waLink(phone, text), '_blank', 'noopener');
  logOrder({ ref, items: cart.items, note: cart.note, total: cart.total, count: cart.count, text });
  toast('Siparişiniz WhatsApp\'a taşındı', `Sipariş no: #${ref}`);
  document.dispatchEvent(new CustomEvent('mascot:say', { detail: 'Siparişin bize ulaştı, teşekkürler! 💐' }));
}

/* ---------------- ARAMA KATMANI ---------------- */
function initSearchOverlay() {
  const ov = qs('#search-overlay');
  const input = qs('#so-input');
  const res = qs('#so-results');
  if (!ov) return;

  const open = (v = true) => {
    ov.classList.toggle('open', v);
    ov.setAttribute('aria-hidden', String(!v));
    document.body.classList.toggle('no-scroll', v);
    if (v) setTimeout(() => input.focus(), 120);
  };

  const paint = () => {
    const q = norm(input.value.trim());
    if (!q) { res.innerHTML = '<p class="so-hint">Ürün adı, kategori veya ürün kodu yazın.</p>'; return; }
    const hits = products().filter(p =>
      norm(`${p.name} ${p.id} ${(p.tags || []).join(' ')} ${catName(p.category)}`).includes(q)).slice(0, 8);
    res.innerHTML = hits.length ? hits.map(p => `
      <div class="so-item" data-id="${esc(p.id)}">
        <img src="${esc(safeUrl(p.image, FALLBACK_IMG))}" alt="">
        <div><h5>${esc(p.name)}</h5><small>${esc(p.id)} · ${esc(catName(p.category))}</small></div>
        <b>${money(p.price, sym())}</b>
      </div>`).join('') : '<p class="so-hint">Sonuç bulunamadı.</p>';
    bindImgFallback(res);
  };

  qs('#search-btn')?.addEventListener('click', () => { open(true); paint(); });
  qs('#so-close')?.addEventListener('click', () => open(false));
  ov.addEventListener('click', (e) => { if (e.target === ov) open(false); });
  input?.addEventListener('input', debounce(paint, 140));
  res?.addEventListener('click', (e) => {
    const item = e.target.closest('.so-item');
    if (!item) return;
    open(false);
    openQuickView(item.dataset.id);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ov.classList.contains('open')) open(false);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(true); paint(); }
  });
}

/* ---------------- OLAY BAĞLARI ---------------- */
function bindEvents() {
  // ürün kartı aksiyonları
  qs('#product-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.p-card');
    if (!card) return;
    const id = card.dataset.id;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'add') { addToCart(findProduct(id), 1, card.querySelector('img')); return; }
    if (act === 'view' || !act) openQuickView(id);
  });

  // filtreler
  qs('#filter-bar')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.cat = chip.dataset.cat;
    state.page = 1;
    renderFilters();
    renderProducts();
  });

  qs('#product-search')?.addEventListener('input', debounce((e) => {
    state.q = e.target.value; state.page = 1; renderProducts();
  }, 180));

  qs('#product-sort')?.addEventListener('change', (e) => {
    state.sort = e.target.value; state.page = 1; renderProducts();
  });

  qs('#load-more')?.addEventListener('click', () => { state.page++; renderProducts(); });
  qs('#reset-filters')?.addEventListener('click', () => {
    state = { cat: 'all', q: '', sort: 'default', page: 1 };
    qs('#product-search').value = '';
    qs('#product-sort').value = 'default';
    renderFilters(); renderProducts();
  });

  // koleksiyon kartından ürünlere filtreli geçiş
  qs('#bento')?.addEventListener('click', (e) => {
    const item = e.target.closest('.bento-item');
    if (!item) return;
    state.cat = item.dataset.filter || 'all';
    state.page = 1;
    renderFilters(); renderProducts();
    const head = qs('#site-header')?.offsetHeight || 0;
    window.scrollTo({ top: qs('#products').getBoundingClientRect().top + scrollY - head, behavior: 'smooth' });
  });

  // hızlı bakış
  const modal = qs('#quickview');
  modal?.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeQuickView();
    const thumb = e.target.closest('.qv-thumbs img');
    if (thumb) {
      qs('#qv-img').src = thumb.src;
      qsa('.qv-thumbs img', modal).forEach(t => t.classList.toggle('active', t === thumb));
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) closeQuickView();
  });
  qs('#qv-minus')?.addEventListener('click', () => {
    const i = qs('#qv-qty'); i.value = Math.max(1, (+i.value || 1) - 1);
  });
  qs('#qv-plus')?.addEventListener('click', () => {
    const i = qs('#qv-qty'); i.value = Math.min(99, (+i.value || 1) + 1);
  });
  qs('#qv-add')?.addEventListener('click', () => {
    addToCart(qvProduct, +qs('#qv-qty').value || 1, qs('#qv-img'));
    closeQuickView();
  });

  // sepet
  qs('#cart-btn')?.addEventListener('click', () => openCart(true));
  qs('#cart-close')?.addEventListener('click', () => openCart(false));
  qs('#drawer-overlay')?.addEventListener('click', () => openCart(false));
  qs('#cart-shop')?.addEventListener('click', () => {
    openCart(false);
    const head = qs('#site-header')?.offsetHeight || 0;
    window.scrollTo({ top: qs('#products').getBoundingClientRect().top + scrollY - head, behavior: 'smooth' });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && qs('#cart-drawer')?.classList.contains('open')) openCart(false);
  });

  qs('#cart-body')?.addEventListener('click', (e) => {
    const row = e.target.closest('.cart-item');
    if (!row) return;
    const id = row.dataset.id;
    const act = e.target.closest('[data-act]')?.dataset.act;
    const item = cart.items.find(i => i.id === id);
    if (act === 'inc') cart.setQty(id, item.qty + 1);
    if (act === 'dec') cart.setQty(id, item.qty - 1);
    if (act === 'del') {
      row.classList.add('removing');
      setTimeout(() => cart.remove(id), 280);
    }
  });
  qs('#cart-body')?.addEventListener('change', (e) => {
    const row = e.target.closest('.cart-item');
    if (row && e.target.matches('input')) cart.setQty(row.dataset.id, e.target.value);
  });

  qs('#order-note')?.addEventListener('input', (e) => {
    cart.setNote(e.target.value);
    qs('#note-len').textContent = (cart.note || '').length;
  });

  qs('#checkout-btn')?.addEventListener('click', checkout);

  initSearchOverlay();
}

/* ---------------- GİRİŞ ---------------- */
export function initShop(content) {
  C = content;
  pageSize = parseInt(get(C, 'sections.products.pageSize', 9), 10) || 9;
  renderFilters();
  renderProducts();
  bindEvents();
  cart.subscribe(renderCart);
}

/** İçerik güncellendiğinde (admin) yeniden çizer. */
export function refreshShop(content) {
  C = content;
  pageSize = parseInt(get(C, 'sections.products.pageSize', 9), 10) || 9;
  if (state.cat !== 'all' && !categories().some(c => c.id === state.cat)) state.cat = 'all';
  renderFilters();
  renderProducts();
  renderCart();
}

export { openQuickView, openCart };
