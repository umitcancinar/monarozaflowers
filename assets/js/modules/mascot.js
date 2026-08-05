/* =========================================================
   MASCOT — "Roza" çiçekçi maskotu
   İmleci takip eder, bağlama göre konuşur, tıklanınca yardım eder.
   ========================================================= */

import { qs, get, clamp, esc } from '../core/utils.js';

let bubbleTimer = null, cycleTimer = null, messages = [], idx = 0;

function say(text, ms = 4200) {
  const bubble = qs('#mascot-bubble');
  if (!bubble || !text) return;
  bubble.textContent = text;
  bubble.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove('show'), ms);
}

function startCycle() {
  clearInterval(cycleTimer);
  if (messages.length < 2) return;
  cycleTimer = setInterval(() => {
    if (document.hidden) return;
    idx = (idx + 1) % messages.length;
    say(messages[idx]);
  }, 16000);
}

export function initMascot(content) {
  const root = qs('#mascot');
  if (!root) return;

  if (get(content, 'mascot.enabled', true) === false || localStorage.getItem('mrf_mascot_off') === '1') {
    root.classList.add('hidden');
    return;
  }
  messages = get(content, 'mascot.messages', []);

  setTimeout(() => {
    root.classList.remove('hidden');
    root.classList.add('show');
    if (messages[0]) say(messages[0], 5200);
  }, 2600);
  startCycle();

  // baş ve gözler imleci takip eder
  const head = qs('#m-head');
  const eyes = qs('#m-eyes');
  if (head && !window.matchMedia('(hover: none)').matches) {
    document.addEventListener('mousemove', (e) => {
      const r = root.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.28;
      const dx = clamp((e.clientX - cx) / 260, -1, 1);
      const dy = clamp((e.clientY - cy) / 260, -1, 1);
      head.style.transform = `translate(${dx * 4}px, ${dy * 2.5}px) rotate(${dx * 6}deg)`;
      if (eyes) eyes.style.transform = `translate(${dx * 2}px, ${dy * 1.6}px)`;
    }, { passive: true });
  }

  // tıklama → ürünlere götür
  qs('#mascot-body')?.addEventListener('click', () => {
    say('Hadi koleksiyona bakalım! 🌷', 2600);
    const target = qs('#products');
    if (target && !target.hidden) {
      const head = qs('#site-header')?.offsetHeight || 0;
      window.scrollTo({ top: target.getBoundingClientRect().top + scrollY - head, behavior: 'smooth' });
    }
  });

  qs('#mascot-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    root.classList.remove('show');
    localStorage.setItem('mrf_mascot_off', '1');
    setTimeout(() => root.classList.add('hidden'), 700);
  });

  // uygulama içi olaylar
  document.addEventListener('mascot:say', (e) => say(e.detail, 4200));

  // sepet uzun süre bekliyorsa nazik hatırlatma
  let idleTimer = null;
  const nudge = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      try {
        const items = JSON.parse(localStorage.getItem('mrf_cart_v1') || '[]');
        if (items.length) say('Sepetinde çiçekler seni bekliyor 💐', 5000);
      } catch {}
    }, 45000);
  };
  ['scroll', 'click', 'keydown'].forEach(ev => window.addEventListener(ev, nudge, { passive: true }));
  nudge();
}

export function refreshMascot(content) {
  const root = qs('#mascot');
  if (!root) return;
  messages = get(content, 'mascot.messages', []);
  const off = get(content, 'mascot.enabled', true) === false;
  root.classList.toggle('hidden', off);
  if (!off) startCycle();
}

export { say };
