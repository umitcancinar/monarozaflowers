/* =========================================================
   WHATSAPP — sipariş & iletişim mesajı üretimi
   ========================================================= */

import { money } from './utils.js';

const digits = (v) => String(v || '').replace(/\D/g, '');

/** wa.me linki — mobilde uygulamayı, masaüstünde WhatsApp Web'i açar. */
export function waLink(phone, text = '') {
  const p = digits(phone);
  return `https://wa.me/${p}${text ? '?text=' + encodeURIComponent(text) : ''}`;
}

/** Sipariş numarası — müşteri ve işletme aynı referansı konuşsun diye. */
export function orderRef() {
  const t = Date.now().toString(36).toUpperCase().slice(-4);
  const r = Math.floor(Math.random() * 36 ** 2).toString(36).toUpperCase().padStart(2, '0');
  return `${t}${r}`;
}

/**
 * Sipariş mesajı. Kullanıcının yazdığı not mesajın EN BAŞINDA yer alır,
 * ardından ürün kodları + adetler + toplam gelir.
 */
export function buildOrderMessage(cartState, content) {
  const wa   = content?.integrations?.whatsapp || {};
  const sym  = content?.meta?.currencySymbol || '₺';
  const brand = [content?.brand?.name, content?.brand?.accent].filter(Boolean).join(' ');
  const ref  = orderRef();
  const L = [];

  L.push(`*${wa.orderTitle || 'YENİ SİPARİŞ'}* — ${brand}`);
  L.push(`Sipariş No: *#${ref}*`);
  L.push('');

  const note = (cartState.note || '').trim();
  if (note) {
    L.push('📝 *Sipariş Notum:*');
    L.push(note);
    L.push('');
  }

  L.push('🛒 *Ürünler*');
  cartState.items.forEach((it, i) => {
    L.push(`${i + 1}) [${it.id}] ${it.name}`);
    L.push(`    ${it.qty} adet × ${money(it.price, sym)} = *${money(it.price * it.qty, sym)}*`);
  });

  L.push('');
  L.push(`💰 *Genel Toplam: ${money(cartState.total, sym)}*`);
  L.push(`📦 Ürün adedi: ${cartState.count}`);
  L.push(`🕒 ${new Date().toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}`);

  if (wa.footerNote) { L.push(''); L.push(wa.footerNote); }

  return { text: L.join('\n'), ref };
}

/** İletişim formu mesajı. */
export function buildContactMessage({ name, phone, message }, content) {
  const brand = [content?.brand?.name, content?.brand?.accent].filter(Boolean).join(' ');
  return [
    `*İLETİŞİM TALEBİ* — ${brand}`,
    '',
    `👤 *Ad Soyad:* ${name}`,
    `📞 *Telefon:* ${phone}`,
    '',
    '💬 *Mesaj:*',
    message
  ].join('\n');
}

/** Tek ürün için hızlı soru mesajı. */
export function buildProductMessage(product, content) {
  const sym = content?.meta?.currencySymbol || '₺';
  return [
    `Merhaba, bu ürün hakkında bilgi almak istiyorum:`,
    '',
    `🌸 *${product.name}*`,
    `🔖 Ürün kodu: *${product.id}*`,
    `💰 Fiyat: ${money(product.price, sym)}`
  ].join('\n');
}
