/* =========================================================
   MOTION — preloader, scroll reveal, imleç, parallax,
   yaprak canvas'ı, sayaçlar, manyetik butonlar
   ========================================================= */

import { qs, qsa, clamp, lerp, throttle } from '../core/utils.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- PRELOADER ---------- */
export function initPreloader() {
  const pre = qs('#preloader');
  const done = () => {
    pre?.classList.add('done');
    document.body.classList.remove('is-loading');
    qs('#hero')?.classList.add('ready');
    setTimeout(() => pre?.remove(), 800);
  };
  const minWait = new Promise(r => setTimeout(r, reduced ? 200 : 900));
  const loaded = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise(r => window.addEventListener('load', r, { once: true }));
  // Yavaş bir görsel tüm sayfayı kilitlemesin
  Promise.race([Promise.all([minWait, loaded]), new Promise(r => setTimeout(r, 4000))]).then(done);
}

/* ---------- SCROLL REVEAL ---------- */
let revealObserver = null;
export function initReveal() {
  if (revealObserver) revealObserver.disconnect();
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      revealObserver.unobserve(e.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

  observeReveal();
}
export function observeReveal(root = document) {
  if (!revealObserver) return;
  qsa('.reveal, .blur-reveal, .stagger, .p-card, .bento-item, .mas-item, .signature', root)
    .forEach(n => { if (!n.classList.contains('in')) revealObserver.observe(n); });
}

/* ---------- HEADER ---------- */
export function initHeader() {
  const header = qs('#site-header');
  const bar = qs('#scroll-bar');
  const top = qs('#top-btn');
  let lastY = 0;

  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('scrolled', y > 20);
    if (header) {
      const goingDown = y > lastY && y > 460 && !document.body.classList.contains('no-scroll');
      header.classList.toggle('hidden', goingDown);
    }
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = `${clamp(max > 0 ? (y / max) * 100 : 0, 0, 100)}%`;
    top?.classList.toggle('show', y > 640);
    lastY = y;
    highlightNav();

    // Küçük ekranlarda sepet/whatsapp/maskot, hero içeriğiyle çakışmasın diye
    // hero görünürken gizlenir; kullanıcı biraz kaydırınca belirir.
    if (innerWidth <= 640) {
      const hero = qs('#hero');
      const stillInHero = hero && !hero.hidden && hero.getBoundingClientRect().bottom > 120;
      document.body.classList.toggle('hero-in-view', !!stillInHero);
    } else {
      document.body.classList.remove('hero-in-view');
    }
  };
  window.addEventListener('scroll', throttle(onScroll, 60), { passive: true });
  onScroll();
}

function highlightNav() {
  const links = qsa('.nav-link');
  if (!links.length) return;
  const y = window.scrollY + 140;
  let current = '';
  qsa('main section[id]').forEach(sec => {
    if (sec.hidden) return;
    if (y >= sec.offsetTop) current = '#' + sec.id;
  });
  links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === current));
}

/* ---------- SMOOTH ANCHORS ---------- */
export function initAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const target = qs(id);
    if (!target) return;
    e.preventDefault();
    const headerH = qs('#site-header')?.offsetHeight || 0;
    const y = target.getBoundingClientRect().top + window.scrollY - headerH + 2;
    window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    document.dispatchEvent(new CustomEvent('nav:go'));
  });
}

/* ---------- CUSTOM CURSOR ---------- */
export function initCursor() {
  if (reduced || window.matchMedia('(hover: none)').matches) return;
  const dot = qs('.cursor-dot');
  const ring = qs('.cursor-ring');
  if (!dot || !ring) return;

  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  document.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    document.body.classList.add('cursor-on');
    dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
  }, { passive: true });

  const loop = () => {
    rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  };
  loop();

  const hoverSel = 'a,button,.p-card,.bento-item,.mas-item,input,textarea,select,.arc-item';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverSel)) document.body.classList.add('cursor-hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverSel)) document.body.classList.remove('cursor-hover');
  });
  document.addEventListener('mouseleave', () => document.body.classList.remove('cursor-on'));
}

/* ---------- MAGNETIC BUTTONS ---------- */
export function initMagnetic(root = document) {
  if (reduced || window.matchMedia('(hover: none)').matches) return;
  qsa('.magnetic', root).forEach(node => {
    if (node.dataset.mag === '1') return;
    node.dataset.mag = '1';
    node.addEventListener('mousemove', (e) => {
      const r = node.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.28;
      const y = (e.clientY - r.top - r.height / 2) * 0.34;
      node.style.transform = `translate(${x}px, ${y}px)`;
    });
    node.addEventListener('mouseleave', () => { node.style.transform = ''; });
  });
}

/* ---------- PARALLAX ---------- */
export function initParallax() {
  if (reduced) return;
  const nodes = qsa('[data-speed]');
  const hero = qs('.hero-media');
  const onScroll = () => {
    const y = window.scrollY;
    nodes.forEach(n => {
      const r = n.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const speed = parseFloat(n.dataset.speed) || 0.1;
      const offset = (r.top + r.height / 2 - innerHeight / 2) * speed;
      n.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
    if (hero && y < innerHeight * 1.2) {
      hero.style.transform = `translate3d(0, ${(y * 0.28).toFixed(1)}px, 0)`;
      const copy = qs('.hero-copy');
      if (copy) { copy.style.transform = `translate3d(0, ${(y * 0.12).toFixed(1)}px, 0)`; copy.style.opacity = String(clamp(1 - y / 620, 0, 1)); }
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------- COUNTERS ---------- */
export function initCounters() {
  const nodes = qsa('[data-count]');
  if (!nodes.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const node = e.target;
      io.unobserve(node);
      const raw = node.dataset.count || '0';
      const target = parseFloat(String(raw).replace(/[^\d.]/g, '')) || 0;
      const suffix = node.parentElement?.querySelector('i')?.textContent || '';
      if (reduced) { node.textContent = raw + suffix; return; }
      const dur = 1500, t0 = performance.now();
      const tick = (t) => {
        const p = clamp((t - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        node.textContent = Math.round(target * eased).toLocaleString('tr-TR') + (p === 1 ? suffix : '');
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.5 });
  nodes.forEach(n => io.observe(n));
}

/* ---------- FLOATING PETALS ---------- */
export function initPetals() {
  const canvas = qs('#petal-canvas');
  if (!canvas || reduced) { canvas?.remove(); return; }
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, petals = [], raf = null, running = true;

  const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#C2415C';
  const accent2 = () => getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim() || '#E28FA3';

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(n) {
    const colors = [accent(), accent2(), '#B8934A'];
    petals = Array.from({ length: n }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: 5 + Math.random() * 8,
      sp: 0.25 + Math.random() * 0.7,
      sw: 0.6 + Math.random() * 1.4,
      a: Math.random() * Math.PI * 2,
      va: (Math.random() - 0.5) * 0.02,
      o: 0.18 + Math.random() * 0.35,
      c: colors[Math.floor(Math.random() * colors.length)]
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of petals) {
      p.y += p.sp;
      p.x += Math.sin(p.y / 70) * p.sw * 0.35;
      p.a += p.va;
      if (p.y - p.r > innerHeight) { p.y = -20; p.x = Math.random() * innerWidth; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.globalAlpha = p.o;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r * 0.55, p.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (running) raf = requestAnimationFrame(draw);
  }

  resize();
  spawn(innerWidth < 720 ? 14 : 26);
  draw();

  window.addEventListener('resize', throttle(() => { resize(); spawn(innerWidth < 720 ? 14 : 26); }, 250));
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) draw(); else cancelAnimationFrame(raf);
  });
}
