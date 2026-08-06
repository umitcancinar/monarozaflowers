/* =========================================================
   UI — menü, tema, akordeon, slider, lightbox, formlar
   ========================================================= */

import { qs, qsa, esc, get, toast, debounce } from '../core/utils.js';
import { waLink, buildContactMessage } from '../core/whatsapp.js';

/* ---------- MOBİL MENÜ ---------- */
export function initMobileMenu() {
  const burger = qs('#burger');
  const menu = qs('#mobile-menu');
  if (!burger || !menu) return;

  const setOpen = (open) => {
    menu.classList.toggle('open', open);
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('no-scroll', open);
  };
  burger.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('nav:go', () => setOpen(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

/* ---------- TEMA ---------- */
export function initTheme() {
  const btn = qs('#theme-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('mrf_theme', next);
  });
}

/* ---------- YUKARI ÇIK ---------- */
export function initScrollTop() {
  qs('#top-btn')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ---------- FAQ ---------- */
export function initFaq() {
  const list = qs('#faq-list');
  if (!list) return;
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.faq-q');
    if (!btn) return;
    const item = btn.closest('.faq-item');
    const body = item.querySelector('.faq-a');
    const open = item.classList.contains('open');

    qsa('.faq-item.open', list).forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-a').style.maxHeight = '';
      i.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
    });
    if (!open) {
      item.classList.add('open');
      body.style.maxHeight = body.scrollHeight + 'px';
      btn.setAttribute('aria-expanded', 'true');
    }
  });
}

/* ---------- YORUM SLIDER ---------- */
export function initTestimonials() {
  const track = qs('#testi-track');
  const dots = qs('#testi-dots');
  if (!track || !track.children.length) return;

  let index = 0, timer = null;
  const perView = () => (innerWidth <= 680 ? 1 : innerWidth <= 1000 ? 2 : 3);
  const pages = () => Math.max(1, Math.ceil(track.children.length / perView()));

  function paint() {
    const p = pages();
    index = ((index % p) + p) % p;
    const card = track.children[0];
    const gap = parseFloat(getComputedStyle(track).gap) || 20;
    const step = (card.offsetWidth + gap) * perView();
    track.style.transform = `translateX(${-index * step}px)`;
    if (dots) qsa('i', dots).forEach((d, i) => d.classList.toggle('on', i === index));
  }
  function buildDots() {
    if (!dots) return;
    dots.innerHTML = Array.from({ length: pages() }, (_, i) => `<i data-i="${i}"></i>`).join('');
  }
  const go = (d) => { index += d; paint(); restart(); };
  const restart = () => { clearInterval(timer); timer = setInterval(() => { index++; paint(); }, 6000); };

  qs('#testi-next')?.addEventListener('click', () => go(1));
  qs('#testi-prev')?.addEventListener('click', () => go(-1));
  dots?.addEventListener('click', (e) => {
    const i = e.target.dataset.i;
    if (i != null) { index = +i; paint(); restart(); }
  });
  window.addEventListener('resize', debounce(() => { buildDots(); paint(); }, 200));

  // dokunmatik kaydırma
  let sx = 0;
  track.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  }, { passive: true });

  buildDots(); paint(); restart();
}

/* ---------- LIGHTBOX ---------- */
export function initLightbox(getContent) {
  const box = qs('#lightbox');
  const img = qs('#lb-img');
  const cap = qs('#lb-caption');
  if (!box) return;
  let items = [], i = 0;

  const open = (idx) => {
    items = get(getContent(), 'sections.gallery.items', []);
    if (!items.length) return;
    i = idx;
    show();
    box.classList.add('open');
    box.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  };
  const show = () => {
    const it = items[((i % items.length) + items.length) % items.length];
    img.src = it.image;
    img.alt = it.caption || '';
    cap.textContent = it.caption || '';
  };
  const close = () => {
    box.classList.remove('open');
    box.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  };

  document.addEventListener('click', (e) => {
    const fig = e.target.closest('.mas-item');
    if (fig) open(+fig.dataset.lb || 0);
  });
  qs('.lb-close')?.addEventListener('click', close);
  qs('.lb-next')?.addEventListener('click', () => { i++; show(); });
  qs('.lb-prev')?.addEventListener('click', () => { i--; show(); });
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  document.addEventListener('keydown', (e) => {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') { i++; show(); }
    if (e.key === 'ArrowLeft') { i--; show(); }
  });
}

/* ---------- ATÖLYE VİDEOSU ---------- */
export function initAtelierVideo() {
  const stage = qs('#atelier-stage');
  const video = qs('#atelier-video');
  const orb = qs('#play-orb');
  if (!stage || !video || !orb) return;

  orb.addEventListener('click', () => {
    if (!video.getAttribute('src')) {
      toast('Video henüz eklenmedi', 'Admin panelinden video bağlantısı ekleyebilirsiniz', 'warn');
      return;
    }
    video.play().then(() => stage.classList.add('playing')).catch(() => {
      toast('Video oynatılamadı', 'Bağlantıyı kontrol edin', 'warn');
    });
  });
  stage.addEventListener('click', (e) => {
    if (e.target === orb || orb.contains(e.target)) return;
    if (!stage.classList.contains('playing')) return;
    video.pause(); stage.classList.remove('playing');
  });
}

/* ---------- İLETİŞİM FORMU ---------- */
export function initContactForm(getContent) {
  const form = qs('#contact-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const c = getContent();
    const fields = [
      ['#cf-name', v => v.length >= 2],
      ['#cf-phone', v => v.replace(/\D/g, '').length >= 10],
      ['#cf-msg', v => v.length >= 5]
    ];
    let ok = true;
    const vals = fields.map(([sel, test]) => {
      const node = qs(sel);
      const v = node.value.trim();
      const valid = test(v);
      node.closest('.field').classList.toggle('err', !valid);
      if (!valid) ok = false;
      return v;
    });
    if (!ok) { toast('Lütfen alanları kontrol edin', 'Telefon en az 10 hane olmalı', 'warn'); return; }

    const text = buildContactMessage({ name: vals[0], phone: vals[1], message: vals[2] }, c);
    window.open(waLink(get(c, 'integrations.whatsapp.phone', ''), text), '_blank', 'noopener');
    form.reset();
    toast('WhatsApp açılıyor', 'Mesajınız hazır, sadece gönder demeniz yeterli');
  });
}
