/* =========================================================
   CART — sepet durumu (localStorage kalıcı, sekmeler arası senkron)
   ========================================================= */

const LS_CART = 'mrf_cart_v1';
const LS_NOTE = 'mrf_note_v1';
const MAX_QTY = 99;

class Cart {
  constructor() {
    this.items = this._read();
    this.note = localStorage.getItem(LS_NOTE) || '';
    this.listeners = new Set();
    window.addEventListener('storage', (e) => {
      if (e.key === LS_CART) { this.items = this._read(); this._emit(false); }
      if (e.key === LS_NOTE) { this.note = e.newValue || ''; this._emit(false); }
    });
  }

  _read() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_CART) || '[]');
      return Array.isArray(raw) ? raw.filter(i => i && i.id).map(i => ({
        id: String(i.id),
        name: String(i.name || ''),
        price: Number(i.price) || 0,
        image: String(i.image || ''),
        qty: Math.min(MAX_QTY, Math.max(1, parseInt(i.qty, 10) || 1))
      })) : [];
    } catch { return []; }
  }

  _persist() { localStorage.setItem(LS_CART, JSON.stringify(this.items)); }
  _emit(persist = true) {
    if (persist) this._persist();
    this.listeners.forEach(fn => { try { fn(this); } catch (e) { console.error(e); } });
  }

  subscribe(fn) { this.listeners.add(fn); fn(this); return () => this.listeners.delete(fn); }

  add(product, qty = 1) {
    const q = Math.max(1, parseInt(qty, 10) || 1);
    const found = this.items.find(i => i.id === product.id);
    if (found) found.qty = Math.min(MAX_QTY, found.qty + q);
    else this.items.push({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      image: product.image || '',
      qty: Math.min(MAX_QTY, q)
    });
    this._emit();
    return this.count;
  }

  setQty(id, qty) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    const q = parseInt(qty, 10);
    if (!q || q < 1) return this.remove(id);
    item.qty = Math.min(MAX_QTY, q);
    this._emit();
  }

  remove(id) { this.items = this.items.filter(i => i.id !== id); this._emit(); }
  clear() { this.items = []; this.setNote(''); this._emit(); }

  setNote(text) {
    this.note = String(text || '').slice(0, 500);
    localStorage.setItem(LS_NOTE, this.note);
  }

  has(id) { return this.items.some(i => i.id === id); }
  get count() { return this.items.reduce((s, i) => s + i.qty, 0); }
  get total() { return this.items.reduce((s, i) => s + i.price * i.qty, 0); }
}

export const cart = new Cart();
