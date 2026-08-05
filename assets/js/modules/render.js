/* =========================================================
   RENDER — içerik JSON'undan DOM üretimi
   Tüm bölümler buradan beslenir; admin bir alanı değiştirdiğinde
   bu dosya yeniden çalışır ve sayfa anında güncellenir.
   ========================================================= */

import { qs, qsa, esc, safeUrl, get, money, icon, el, FALLBACK_IMG, bindImgFallback } from '../core/utils.js';
import { waLink, buildContactMessage } from '../core/whatsapp.js';

/* ---------- TEMA ---------- */
export function applyTheme(c) {
  const t = c.theme || {};
  const root = document.documentElement;
  const map = { accent: '--accent', accent2: '--accent2', gold: '--gold', deep: '--deep', cream: '--cream' };
  for (const [k, v] of Object.entries(map)) {
    if (t.colors?.[k]) root.style.setProperty(v, t.colors[k]);
  }
  if (t.radius) root.style.setProperty('--radius', `${parseInt(t.radius, 10) || 20}px`);
  if (t.fontDisplay) root.style.setProperty('--font-display', `'${t.fontDisplay}', Georgia, serif`);
  if (t.fontBody) root.style.setProperty('--font-body', `'${t.fontBody}', system-ui, sans-serif`);

  const saved = localStorage.getItem('mrf_theme');
  const mode = saved || t.mode || 'light';
  root.setAttribute('data-theme', mode === 'dark' ? 'dark' : 'light');
  const meta = qs('meta[name="theme-color"]');
  if (meta && t.colors?.accent) meta.setAttribute('content', t.colors.accent);
}

/* ---------- SEO ---------- */
function applySeo(c) {
  const seo = get(c, 'brand.seo', {});
  const brand = [get(c, 'brand.name', ''), get(c, 'brand.accent', '')].filter(Boolean).join(' ');
  if (seo.title) document.title = seo.title;
  const setMeta = (sel, val) => { const n = qs(sel); if (n && val) n.setAttribute('content', val); };
  setMeta('meta[name="description"]', seo.description);
  setMeta('meta[name="keywords"]', seo.keywords);
  setMeta('meta[property="og:title"]', seo.title);
  setMeta('meta[property="og:description"]', seo.description);
  setMeta('meta[property="og:image"]', seo.ogImage);

  // Zengin sonuç: yerel işletme + ürün listesi
  qs('#ld-json')?.remove();
  const products = get(c, 'catalog.products', []).slice(0, 12).map(p => ({
    '@type': 'Product', name: p.name, sku: p.id, image: p.image,
    offers: { '@type': 'Offer', price: p.price, priceCurrency: get(c, 'meta.currency', 'TRY'), availability: p.stock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' }
  }));
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Florist',
    name: brand,
    description: seo.description,
    image: seo.ogImage,
    telephone: get(c, 'sections.contact.phone', ''),
    email: get(c, 'sections.contact.email', ''),
    address: { '@type': 'PostalAddress', streetAddress: get(c, 'sections.contact.address', '') },
    openingHours: get(c, 'sections.contact.hours', []).map(h => `${h.days} ${h.time}`),
    makesOffer: products
  };
  const s = el('script', { type: 'application/ld+json', id: 'ld-json' });
  s.textContent = JSON.stringify(ld);
  document.head.appendChild(s);
}

/* ---------- data-b / data-bimg bağlayıcı ---------- */
function bindStatic(c) {
  qsa('[data-b]').forEach(node => {
    const v = get(c, node.dataset.b, null);
    if (v == null || typeof v === 'object') return;
    node.textContent = v;
  });
  qsa('[data-bimg]').forEach(node => {
    const v = safeUrl(get(c, node.dataset.bimg, ''), '');
    if (v) node.src = v;
  });
}

/* ---------- Blur reveal için kelime bölme ---------- */
export function splitWords(node) {
  if (!node || node.dataset.split === '1') return;
  const text = node.textContent.trim();
  if (!text) return;
  node.dataset.split = '1';
  node.innerHTML = text.split(/\s+/).map((w, i) =>
    `<span class="w" style="transition-delay:${(i * 45)}ms">${esc(w)}</span>`
  ).join(' ');
}

/* ---------- NAV ---------- */
function renderNav(c) {
  const links = get(c, 'nav.links', []);
  const list = qs('#nav-list');
  const mm = qs('#mm-list');
  if (list) list.innerHTML = links.map(l =>
    `<li><a class="nav-link" href="${esc(safeUrl(l.href, '#'))}">${esc(l.label)}</a></li>`).join('');
  if (mm) mm.innerHTML = links.map((l, i) =>
    `<li style="animation-delay:${80 + i * 70}ms"><a href="${esc(safeUrl(l.href, '#'))}"><i>0${i + 1}</i>${esc(l.label)}</a></li>`).join('');

  const cta = qs('#nav-cta');
  if (cta) { cta.href = safeUrl(get(c, 'nav.cta.href', '#products'), '#products'); }
}

/* ---------- TOPBAR + MARQUEE ---------- */
function renderTickers(c) {
  const items = get(c, 'sections.marquee.items', []);
  const enabled = get(c, 'sections.marquee.enabled', true) && items.length;

  const top = qs('#topbar-track');
  if (top) {
    top.innerHTML = enabled ? [...items, ...items].map(t => `<span>${esc(t)}</span>`).join('') : '';
    qs('#topbar').hidden = !enabled;
  }
  const band = qs('#marquee-track');
  if (band) {
    band.innerHTML = enabled ? [...items, ...items].map(t => `<span>${esc(t)}</span>`).join('') : '';
    qs('#marquee-band').hidden = !enabled;
  }
}

/* ---------- HERO ---------- */
function renderHero(c) {
  const h = get(c, 'sections.hero', {});
  const title = qs('#hero-title');
  if (title) {
    const hl = String(h.highlight || '').trim();
    title.innerHTML = (h.titleLines || []).map(line => {
      let safe = esc(line);
      if (hl && line.includes(hl)) {
        safe = safe.replace(esc(hl), `<span class="hl">${esc(hl)}</span>`);
      }
      return `<span class="line"><span>${safe}</span></span>`;
    }).join('');
  }

  const btns = qs('#hero-btns');
  if (btns) btns.innerHTML = (h.buttons || []).map(b =>
    `<a class="btn ${b.style === 'primary' ? 'btn-primary' : 'btn-light'} magnetic" href="${esc(safeUrl(b.href, '#'))}">${esc(b.label)}</a>`
  ).join('');

  const stats = qs('#hero-stats');
  if (stats) stats.innerHTML = (h.stats || []).map(s =>
    `<div class="hero-stat"><b data-count="${esc(s.value)}">0</b><span>${esc(s.label)}</span><i hidden>${esc(s.suffix || '')}</i></div>`
  ).join('');

  // Video varsa arka planda otomatik oynat, yoksa görsel kalır
  const vid = qs('#hero-video');
  const src = safeUrl(h.media?.video || '', '');
  if (vid) {
    if (src) {
      vid.src = src;
      vid.setAttribute('poster', safeUrl(h.media?.poster || h.media?.src || '', ''));
      vid.play?.().then(() => vid.classList.add('playing')).catch(() => vid.classList.remove('playing'));
    } else { vid.removeAttribute('src'); vid.classList.remove('playing'); }
  }
}

/* ---------- ABOUT ---------- */
function renderAbout(c) {
  const box = qs('#about-features');
  if (!box) return;
  box.innerHTML = get(c, 'sections.about.features', []).map(f => `
    <div class="feat">
      <span class="feat-ic">${icon(f.icon)}</span>
      <div><h4>${esc(f.title)}</h4><p>${esc(f.text)}</p></div>
    </div>`).join('');
}

/* ---------- COLLECTIONS (BENTO) ---------- */
function renderBento(c) {
  const box = qs('#bento');
  if (!box) return;
  box.innerHTML = get(c, 'sections.collections.items', []).map(i => `
    <article class="bento-item size-${esc(i.size || 'sm')}" data-filter="${esc(i.filter || 'all')}">
      <img src="${esc(safeUrl(i.image, FALLBACK_IMG))}" alt="${esc(i.title)}" loading="lazy">
      <div class="bento-cap">
        <h3>${esc(i.title)}</h3>
        <p>${esc(i.text)}</p>
        <span class="go">Koleksiyonu gör ${icon('arrow')}</span>
      </div>
    </article>`).join('');
}

/* ---------- ATELIER ---------- */
function renderAtelier(c) {
  const steps = qs('#atelier-steps');
  if (steps) steps.innerHTML = get(c, 'sections.atelier.steps', []).map(s => `
    <li class="step"><b>${esc(s.no)}</b><h4>${esc(s.title)}</h4><p>${esc(s.text)}</p></li>`).join('');

  const vid = qs('#atelier-video');
  const src = safeUrl(get(c, 'sections.atelier.media.video', ''), '');
  const orb = qs('#play-orb');
  if (vid) {
    if (src) { vid.src = src; orb?.removeAttribute('hidden'); }
    else { vid.removeAttribute('src'); if (orb) orb.hidden = true; }
  }
}

/* ---------- OCCASIONS ---------- */
function renderOccasions(c) {
  const box = qs('#occ-grid');
  if (!box) return;
  box.innerHTML = get(c, 'sections.occasions.items', []).map(o => `
    <article class="occ">
      <span class="occ-ic">${icon(o.icon)}</span>
      <h3>${esc(o.title)}</h3>
      <p>${esc(o.text)}</p>
    </article>`).join('');
}

/* ---------- GALLERY ---------- */
function renderGallery(c) {
  const box = qs('#masonry');
  if (!box) return;
  box.innerHTML = get(c, 'sections.gallery.items', []).map((g, i) => `
    <figure class="mas-item" data-lb="${i}">
      <img src="${esc(safeUrl(g.image, FALLBACK_IMG))}" alt="${esc(g.caption || 'Galeri görseli')}" loading="lazy">
      <figcaption class="mas-cap">${esc(g.caption || '')}</figcaption>
    </figure>`).join('');
}

/* ---------- TESTIMONIALS ---------- */
function renderTestimonials(c) {
  const track = qs('#testi-track');
  if (!track) return;
  const items = get(c, 'sections.testimonials.items', []);
  track.innerHTML = items.map(t => {
    const stars = Array.from({ length: 5 }, (_, i) => i < (Number(t.rating) || 5) ? icon('star') : '').join('');
    const av = safeUrl(t.avatar || '', '');
    return `
    <article class="testi-card">
      <div class="testi-stars">${stars}</div>
      <p>${esc(t.text)}</p>
      <div class="testi-user">
        ${av ? `<img class="testi-av" src="${esc(av)}" alt="${esc(t.name)}">`
             : `<span class="testi-av">${esc((t.name || '?').charAt(0))}</span>`}
        <div><h5>${esc(t.name)}</h5><span>${esc(t.role || '')}</span></div>
      </div>
    </article>`;
  }).join('');
}

/* ---------- FAQ ---------- */
function renderFaq(c) {
  const box = qs('#faq-list');
  if (!box) return;
  box.innerHTML = get(c, 'sections.faq.items', []).map((f, i) => `
    <div class="faq-item">
      <button class="faq-q" aria-expanded="false" aria-controls="faq-a-${i}">
        <span>${esc(f.q)}</span><i>+</i>
      </button>
      <div class="faq-a" id="faq-a-${i}"><p>${esc(f.a)}</p></div>
    </div>`).join('');
}

/* ---------- CONTACT ---------- */
function renderContact(c) {
  const ct = get(c, 'sections.contact', {});
  const list = qs('#contact-list');
  if (list) {
    const phone = ct.phone || '';
    list.innerHTML = `
      <li><span class="cl-ic">${icon('pin')}</span><div><small>Adres</small><b>${esc(ct.address)}</b></div></li>
      <li><a href="tel:${esc(phone.replace(/\s/g, ''))}" style="display:flex;gap:14px;align-items:center"><span class="cl-ic">${icon('phone')}</span><div><small>Telefon</small><b>${esc(phone)}</b></div></a></li>
      <li><a href="mailto:${esc(ct.email)}" style="display:flex;gap:14px;align-items:center"><span class="cl-ic">${icon('mail')}</span><div><small>E-posta</small><b>${esc(ct.email)}</b></div></a></li>`;
  }

  const hours = qs('#hours-card');
  if (hours) {
    hours.innerHTML = `
      <h4>${icon('clock')} Çalışma Saatleri</h4>
      <ul>${(ct.hours || []).map(h => `<li><span>${esc(h.days)}</span><b>${esc(h.time)}</b></li>`).join('')}</ul>
      <div id="open-state"></div>`;
    renderOpenState(ct);
  }

  const map = qs('#map-frame');
  const embed = safeUrl(ct.mapEmbed || '', '');
  if (map) {
    map.innerHTML = embed
      ? `<iframe src="${esc(embed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Harita" allowfullscreen></iframe>`
      : '';
  }
}

/** Basit açık/kapalı rozeti — ilk satırdaki saat aralığına bakar. */
function renderOpenState(ct) {
  const box = qs('#open-state');
  if (!box) return;
  const today = new Date();
  const rule = (ct.hours || [])[today.getDay() === 0 ? Math.min(1, (ct.hours || []).length - 1) : 0];
  const m = String(rule?.time || '').match(/(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/);
  if (!m) { box.innerHTML = ''; return; }
  const now = today.getHours() * 60 + today.getMinutes();
  const open = (+m[1]) * 60 + (+m[2]);
  const close = (+m[3]) * 60 + (+m[4]);
  const isOpen = now >= open && now < close;
  box.innerHTML = `<span class="open-now ${isOpen ? '' : 'closed'}"><i></i>${isOpen ? 'Şu anda açığız' : 'Şu anda kapalıyız'}</span>`;
}

/* ---------- FOOTER ---------- */
function renderFooter(c) {
  const cols = qs('#footer-cols');
  if (cols) cols.innerHTML = get(c, 'sections.footer.columns', []).map(col => `
    <div><h4>${esc(col.title)}</h4>
      <ul>${(col.links || []).map(l => `<li><a href="${esc(safeUrl(l.href, '#'))}">${esc(l.label)}</a></li>`).join('')}</ul>
    </div>`).join('');

  const soc = qs('#socials');
  const waHref = waLink(get(c, 'integrations.whatsapp.phone', ''), get(c, 'integrations.whatsapp.greeting', ''));
  if (soc) soc.innerHTML = get(c, 'sections.footer.social', []).map(s => {
    const href = s.icon === 'whatsapp' ? waHref : safeUrl(s.href, '#');
    return `<a href="${esc(href)}" target="_blank" rel="noopener" aria-label="${esc(s.label)}">${icon(s.icon)}</a>`;
  }).join('');

  const y = qs('#year');
  if (y) y.textContent = new Date().getFullYear();
}

/* ---------- WHATSAPP BAĞLANTILARI ---------- */
function renderWaLinks(c) {
  const wa = get(c, 'integrations.whatsapp', {});
  const href = waLink(wa.phone, wa.greeting);
  const btn = qs('#wa-btn');
  if (btn) {
    btn.href = href;
    btn.dataset.tip = wa.floatingLabel || 'WhatsApp';
    btn.hidden = wa.enabled === false;
  }
  const faqWa = qs('#faq-wa');
  if (faqWa) { faqWa.href = href; faqWa.target = '_blank'; faqWa.rel = 'noopener'; }
}

/* ---------- BÖLÜM AÇ/KAPAT ---------- */
function applyVisibility(c) {
  const map = {
    about: '#about', collections: '#collections', products: '#products', wheel: '#showcase',
    atelier: '#atelier', occasions: '#occasions', gallery: '#gallery',
    testimonials: '#testimonials', faq: '#faq', contact: '#contact'
  };
  for (const [key, sel] of Object.entries(map)) {
    const node = qs(sel);
    if (node) node.hidden = get(c, `sections.${key}.enabled`, true) === false;
  }
  const mascot = qs('#mascot');
  if (mascot) mascot.classList.toggle('hidden', get(c, 'mascot.enabled', true) === false);
}

/* ---------- ANA GİRİŞ ---------- */
export function renderAll(c) {
  applyTheme(c);
  applySeo(c);
  bindStatic(c);
  renderNav(c);
  renderTickers(c);
  renderHero(c);
  renderAbout(c);
  renderBento(c);
  renderAtelier(c);
  renderOccasions(c);
  renderGallery(c);
  renderTestimonials(c);
  renderFaq(c);
  renderContact(c);
  renderFooter(c);
  renderWaLinks(c);
  applyVisibility(c);

  qsa('.blur-reveal').forEach(splitWords);
  bindImgFallback(document);
}

export { renderContact, buildContactMessage };
