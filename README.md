# Mona Roza Flowers 🌸

El yapımı buketler, kutuda çiçekler, orkideler ve özel tasarım aranjmanlar sunan bir çiçek atölyesi için tasarlanmış; sepet + WhatsApp sipariş akışı ve uçtan uca yönetim paneli olan modern bir web sitesi.

**Mimari not:** Bu proje sektörden bağımsız bir "içerik motoru" üzerine kurulmuştur. `data/content.json` içindeki her metin, görsel, renk, ürün ve bağlantı; sitedeki karşılığına `data-b="yol.adı"` ile bağlıdır (bkz. `assets/js/modules/render.js`). Bu sayede aynı altyapı, `assets/js/admin/schema.js` ve `data/content.json` güncellenerek tamamen farklı bir sektöre (kiralık araç, restoran, klinik, e-ticaret vb.) uyarlanabilir; `core/`, `store.js`, `cart.js`, `orders.js`, `whatsapp.js` gibi çekirdek modüllere dokunulmaz.

## Özellikler

- Yarım çember "vitrin çarkı", scroll ile açılan blur-reveal başlıklar, imleç takip eden çiçekçi maskotu, yaprak parçacık animasyonu
- Ürün kartları, kategori filtreleme, arama, hızlı bakış modali, sepet çekmecesi
- Sepeti WhatsApp'a aktarma: ürün kodları + adetler + toplam + kullanıcı notu otomatik mesaja eklenir
- Açık/koyu tema, tam responsive (mobil dâhil), erişilebilirlik odaklı
- **Yönetim paneli** (`/admin.html`): tüm metin/görsel/ürün/renk/tema alanları canlı düzenlenir, canlı önizleme, sipariş listesi, yedekleme
- **Veri katmanı iki modlu:**
  - `local` — tarayıcıda saklanır, sunucu gerekmez (hızlı demo/test)
  - `rest` — Node/Express + PostgreSQL (Neon) API'si; çok cihazlı gerçek yayın modu

## Kurulum (REST / production modu)

```bash
npm install
cp .env.example .env   # DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD doldurun
npm start                # http://localhost:5173
```

Sunucu ilk açılışta:
- Veritabanında **bağımsız bir şema** oluşturur (`DB_SCHEMA`, varsayılan `monaroza`) — aynı veritabanındaki başka projelerin tablolarına dokunmaz
- `data/content.json`'daki fabrika içeriğini veritabanına yazar
- `.env`'deki `ADMIN_EMAIL`/`ADMIN_PASSWORD` ile ilk yönetici hesabını oluşturur

Panelden **Sistem → İçerik Kaynağı** sekmesinde depolama modunu `REST API` yapıp API adresini girin (örn. `https://siteniz.com/api`); ardından e-posta/şifre ile giriş yaparsınız. Şifre panelden değiştirilebilir.

## Yerel/offline demo modu

Sunucu kurmadan sadece statik dosyaları bir HTTP sunucusuyla açmak yeterlidir:

```bash
python3 -m http.server 5173
```

Bu modda içerik tarayıcıda saklanır (varsayılan admin şifresi: `1234`, panelden değiştirilebilir).

## Klasör yapısı

```
assets/js/core/     içerik motoru, sepet, sipariş, whatsapp — sektörden bağımsız
assets/js/modules/  site render + arayüz (hero, ürünler, çark, maskot...)
assets/js/admin/    yönetim paneli şeması + mantığı
assets/css/         base / components / sections / admin
data/content.json   fabrika içeriği (sektöre göre değiştirilir)
server/             Express API + PostgreSQL bağlantısı
```

## Deploy (Render)

- Build command: `npm install`
- Start command: `npm start`
- Environment: `.env.example` içindeki değişkenleri Render panelinden girin
- Domain bağlarken CNAME/A kaydını Render'ın verdiği adrese yönlendirin

---
Tasarım & Yazılım: Ümitcan Çınar
