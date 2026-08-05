/* =========================================================
   MONA ROZA FLOWERS — GİRİŞ NOKTASI
   Sektör bağımsız içerik motoru: data/content.json + admin paneli
   ========================================================= */

import { qs, qsa, toast } from './core/utils.js';
import { store } from './core/store.js';
import { renderAll } from './modules/render.js';
import {
  initPreloader, initReveal, observeReveal, initHeader, initAnchors,
  initCursor, initMagnetic, initParallax, initCounters, initPetals
} from './modules/motion.js';
import {
  initMobileMenu, initTheme, initScrollTop, initFaq, initTestimonials,
  initLightbox, initAtelierVideo, initContactForm, initNewsletter
} from './modules/ui.js';
import { initShop, refreshShop } from './modules/shop.js';
import { initArc, refreshArc } from './modules/arc.js';
import { initMascot, refreshMascot } from './modules/mascot.js';

const getContent = () => store.data;

function fatal(err) {
  console.error(err);
  document.body.classList.remove('is-loading');
  qs('#preloader')?.classList.add('done');
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:auto 16px 16px;z-index:9999;background:#fff;color:#241417;border:1px solid #eadfe0;border-radius:16px;padding:18px 20px;max-width:420px;box-shadow:0 20px 60px -30px rgba(0,0,0,.5);font:14px/1.6 system-ui';
  box.innerHTML = `<b>İçerik yüklenemedi.</b><br>Site bir HTTP sunucusu üzerinden açılmalıdır
    (dosyayı çift tıklayarak değil).<br><br><code style="background:#f6efec;padding:4px 8px;border-radius:6px">python3 -m http.server 5173</code>
    <br><small style="opacity:.6">${err.message}</small>`;
  document.body.appendChild(box);
}

async function boot() {
  initPreloader();

  try {
    await store.init();
  } catch (err) {
    return fatal(err);
  }

  const content = getContent();

  // 1) İçerikten DOM
  renderAll(content);

  // 2) Hareket katmanı
  initReveal();
  initHeader();
  initAnchors();
  initCursor();
  initMagnetic();
  initParallax();
  initCounters();
  initPetals();

  // 3) Arayüz bileşenleri
  initMobileMenu();
  initTheme();
  initScrollTop();
  initFaq();
  initTestimonials();
  initLightbox(getContent);
  initAtelierVideo();
  initContactForm(getContent);
  initNewsletter(getContent);

  // 4) Mağaza + özel bölümler
  initShop(content);
  initArc(content);
  initMascot(content);

  // 5) Admin panelinden gelen canlı değişiklikler
  store.subscribe((next) => {
    renderAll(next);
    refreshShop(next);
    refreshArc(next);
    refreshMascot(next);
    observeReveal();
    initMagnetic();
    initCounters();
    window.dispatchEvent(new Event('resize'));
  });

  // 6) Admin önizleme çerçevesi: kaydetmeden canlı deneme
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.data?.type !== 'mrf-preview' || !e.data.payload) return;
    store.data = e.data.payload;
    const next = store.data;
    renderAll(next);
    refreshShop(next);
    refreshArc(next);
    refreshMascot(next);
    observeReveal();
    qsa('.reveal, .blur-reveal, .stagger').forEach(n => n.classList.add('in'));
  });

  // REST modundaysa diğer cihaz/adminlerden gelen değişiklikleri de yakala
  store.startPolling(15000);

  // hero animasyonunu preloader kapanmadan önce hazırla
  setTimeout(() => qs('#hero')?.classList.add('ready'), 200);

  console.info('%c🌸 Mona Roza Flowers', 'color:#C2415C;font-weight:700;font-size:14px',
    '\nİçerik motoru hazır. Yönetim paneli: /admin.html');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
