/* =========================================================
   ADMIN ŞEMASI
   ---------------------------------------------------------
   Panel tamamen bu şemadan üretilir. Başka bir sektöre geçmek
   için sadece bu dosya + data/content.json değiştirilir;
   admin.js'e dokunmaya gerek yoktur.
   ========================================================= */

const ICONS = ['leaf', 'hand', 'truck', 'heart', 'gift', 'rings', 'baby', 'briefcase',
  'phone', 'mail', 'pin', 'clock', 'star', 'cart', 'plus', 'eye', 'check', 'arrow'];
const SOCIALS = ['instagram', 'facebook', 'whatsapp'];
const FONTS = ['Cormorant Garamond', 'Playfair Display', 'Manrope', 'Inter', 'Poppins', 'Montserrat', 'Lora', 'DM Serif Display'];

export const SCHEMA = [
  { id: 'dashboard', label: 'Genel Bakış', icon: 'grid', custom: 'dashboard' },

  {
    id: 'brand', label: 'Marka & SEO', icon: 'badge',
    groups: [
      {
        title: 'Marka Kimliği',
        fields: [
          { path: 'brand.name', label: 'Marka adı', type: 'text' },
          { path: 'brand.accent', label: 'Vurgu kelimesi', type: 'text', help: 'Logoda ikinci satırda küçük yazar.' },
          { path: 'brand.monogram', label: 'Monogram', type: 'text', help: 'Logo karesindeki tek harf.' },
          { path: 'brand.tagline', label: 'Slogan', type: 'text' },
          { path: 'brand.established', label: 'Kuruluş yılı', type: 'text' },
          { path: 'brand.logoImage', label: 'Logo görseli (opsiyonel)', type: 'image' }
        ]
      },
      {
        title: 'Arama Motoru (SEO)',
        fields: [
          { path: 'brand.seo.title', label: 'Sayfa başlığı', type: 'text' },
          { path: 'brand.seo.description', label: 'Açıklama', type: 'textarea' },
          { path: 'brand.seo.keywords', label: 'Anahtar kelimeler', type: 'text' },
          { path: 'brand.seo.ogImage', label: 'Paylaşım görseli', type: 'image' }
        ]
      }
    ]
  },

  {
    id: 'theme', label: 'Tema & Renkler', icon: 'palette',
    groups: [
      {
        title: 'Renk Paleti',
        fields: [
          { path: 'theme.colors.accent', label: 'Ana renk', type: 'color' },
          { path: 'theme.colors.accent2', label: 'İkincil renk', type: 'color' },
          { path: 'theme.colors.gold', label: 'Altın vurgu', type: 'color' },
          { path: 'theme.colors.deep', label: 'Koyu zemin', type: 'color' },
          { path: 'theme.colors.cream', label: 'Krem zemin', type: 'color' }
        ]
      },
      {
        title: 'Tipografi & Form',
        fields: [
          { path: 'theme.fontDisplay', label: 'Başlık yazı tipi', type: 'select', options: FONTS },
          { path: 'theme.fontBody', label: 'Metin yazı tipi', type: 'select', options: FONTS },
          { path: 'theme.radius', label: 'Köşe yuvarlaklığı (px)', type: 'number', min: 0, max: 40 },
          { path: 'theme.mode', label: 'Varsayılan mod', type: 'select', options: [['light', 'Açık'], ['dark', 'Koyu']] }
        ]
      }
    ]
  },

  {
    id: 'nav', label: 'Menü', icon: 'menu',
    lists: [{
      path: 'nav.links', title: 'Menü Bağlantıları', itemLabel: 'label',
      fields: [
        { path: 'label', label: 'Etiket', type: 'text' },
        { path: 'href', label: 'Bağlantı', type: 'text', help: 'Örn: #products' }
      ]
    }],
    groups: [{
      title: 'Menü Butonu',
      fields: [
        { path: 'nav.cta.label', label: 'Buton yazısı', type: 'text' },
        { path: 'nav.cta.href', label: 'Buton bağlantısı', type: 'text' }
      ]
    }]
  },

  {
    id: 'hero', label: 'Karşılama (Hero)', icon: 'star',
    groups: [{
      title: 'Metinler',
      fields: [
        { path: 'sections.hero.enabled', label: 'Bölüm aktif', type: 'toggle' },
        { path: 'sections.hero.eyebrow', label: 'Üst etiket', type: 'text' },
        { path: 'sections.hero.titleLines', label: 'Başlık satırları', type: 'lines', help: 'Her satır ayrı yazılır.' },
        { path: 'sections.hero.highlight', label: 'Vurgulanacak kelime', type: 'text' },
        { path: 'sections.hero.desc', label: 'Açıklama', type: 'textarea' },
        { path: 'sections.hero.scrollHint', label: 'Kaydırma ipucu', type: 'text' }
      ]
    }, {
      title: 'Görsel / Video',
      fields: [
        { path: 'sections.hero.media.src', label: 'Arka plan görseli', type: 'image' },
        { path: 'sections.hero.media.video', label: '🏠 Anasayfa arka plan videosu (mp4 URL)', type: 'text', help: 'Bu, sayfanın en üstündeki büyük görselin YERİNE oynar. Atölye videosuyla karıştırmayın — o ayrı bir alandır (Atölye/Video sekmesi).' }
      ]
    }],
    lists: [
      {
        path: 'sections.hero.buttons', title: 'Butonlar', itemLabel: 'label',
        fields: [
          { path: 'label', label: 'Yazı', type: 'text' },
          { path: 'href', label: 'Bağlantı', type: 'text' },
          { path: 'style', label: 'Stil', type: 'select', options: [['primary', 'Dolu'], ['ghost', 'Şeffaf']] }
        ]
      },
      {
        path: 'sections.hero.stats', title: 'İstatistikler', itemLabel: 'label',
        fields: [
          { path: 'value', label: 'Değer', type: 'text' },
          { path: 'suffix', label: 'Son ek', type: 'text' },
          { path: 'label', label: 'Etiket', type: 'text' }
        ]
      }
    ]
  },

  {
    id: 'marquee', label: 'Kayan Yazı', icon: 'flow',
    groups: [{
      title: 'Şerit',
      fields: [
        { path: 'sections.marquee.enabled', label: 'Aktif', type: 'toggle' },
        { path: 'sections.marquee.items', label: 'Yazılar', type: 'lines' }
      ]
    }]
  },

  {
    id: 'about', label: 'Hakkımızda', icon: 'book',
    groups: [{
      title: 'İçerik',
      fields: [
        { path: 'sections.about.enabled', label: 'Bölüm aktif', type: 'toggle' },
        { path: 'sections.about.eyebrow', label: 'Üst etiket', type: 'text' },
        { path: 'sections.about.title', label: 'Başlık', type: 'text' },
        { path: 'sections.about.text', label: 'Metin', type: 'textarea', rows: 6 },
        { path: 'sections.about.signature', label: 'İmza', type: 'text' },
        { path: 'sections.about.images.main', label: 'Ana görsel', type: 'image' },
        { path: 'sections.about.images.sub', label: 'İkinci görsel', type: 'image' },
        { path: 'sections.about.badge.value', label: 'Rozet değeri', type: 'text' },
        { path: 'sections.about.badge.label', label: 'Rozet etiketi', type: 'text' }
      ]
    }],
    lists: [{
      path: 'sections.about.features', title: 'Öne Çıkanlar', itemLabel: 'title',
      fields: [
        { path: 'icon', label: 'İkon', type: 'select', options: ICONS },
        { path: 'title', label: 'Başlık', type: 'text' },
        { path: 'text', label: 'Açıklama', type: 'textarea' }
      ]
    }]
  },

  {
    id: 'collections', label: 'Koleksiyonlar', icon: 'grid',
    groups: [{
      title: 'Bölüm',
      fields: [
        { path: 'sections.collections.enabled', label: 'Bölüm aktif', type: 'toggle' },
        { path: 'sections.collections.eyebrow', label: 'Üst etiket', type: 'text' },
        { path: 'sections.collections.title', label: 'Başlık', type: 'text' },
        { path: 'sections.collections.desc', label: 'Açıklama', type: 'textarea' }
      ]
    }],
    lists: [{
      path: 'sections.collections.items', title: 'Kartlar', itemLabel: 'title',
      fields: [
        { path: 'title', label: 'Başlık', type: 'text' },
        { path: 'text', label: 'Alt metin', type: 'text' },
        { path: 'image', label: 'Görsel', type: 'image' },
        { path: 'filter', label: 'Tıklayınca açılacak kategori', type: 'category' },
        { path: 'size', label: 'Boyut', type: 'select', options: [['lg', 'Büyük'], ['md', 'Orta'], ['sm', 'Küçük']] }
      ]
    }]
  },

  {
    id: 'products', label: 'Ürünler', icon: 'box', custom: 'products',
    groups: [{
      title: 'Bölüm Ayarları',
      fields: [
        { path: 'sections.products.enabled', label: 'Bölüm aktif', type: 'toggle' },
        { path: 'sections.products.eyebrow', label: 'Üst etiket', type: 'text' },
        { path: 'sections.products.title', label: 'Başlık', type: 'text' },
        { path: 'sections.products.desc', label: 'Açıklama', type: 'textarea' },
        { path: 'sections.products.showFilter', label: 'Kategori filtresi göster', type: 'toggle' },
        { path: 'sections.products.pageSize', label: 'Sayfa başına ürün', type: 'number', min: 3, max: 60 }
      ]
    }]
  },

  {
    id: 'categories', label: 'Kategoriler', icon: 'tag',
    lists: [{
      path: 'catalog.categories', title: 'Kategoriler', itemLabel: 'name',
      fields: [
        { path: 'id', label: 'Kod (benzersiz)', type: 'text', help: 'Ürünlerde bu kod kullanılır.' },
        { path: 'name', label: 'Görünen ad', type: 'text' },
        { path: 'order', label: 'Sıra', type: 'number' }
      ]
    }]
  },

  {
    id: 'wheel', label: 'Vitrin Çarkı', icon: 'circle',
    groups: [{
      title: 'Bölüm',
      fields: [
        { path: 'sections.wheel.enabled', label: 'Bölüm aktif', type: 'toggle' },
        { path: 'sections.wheel.eyebrow', label: 'Üst etiket', type: 'text' },
        { path: 'sections.wheel.title', label: 'Başlık', type: 'text' },
        { path: 'sections.wheel.desc', label: 'Açıklama', type: 'textarea' }
      ]
    }],
    lists: [{
      path: 'sections.wheel.items', title: 'Çark Görselleri', itemLabel: 'label',
      fields: [
        { path: 'image', label: 'Görsel', type: 'image' },
        { path: 'label', label: 'Etiket', type: 'text' }
      ]
    }]
  },

  {
    id: 'atelier', label: 'Atölye / Video', icon: 'play',
    groups: [{
      title: 'Bölüm',
      fields: [
        { path: 'sections.atelier.enabled', label: 'Bölüm aktif', type: 'toggle' },
        { path: 'sections.atelier.eyebrow', label: 'Üst etiket', type: 'text' },
        { path: 'sections.atelier.title', label: 'Başlık', type: 'text' },
        { path: 'sections.atelier.desc', label: 'Açıklama', type: 'textarea' },
        { path: 'sections.atelier.media.poster', label: 'Kapak görseli', type: 'image' },
        { path: 'sections.atelier.media.video', label: '🎬 Atölye videosu (mp4 URL)', type: 'text', help: 'Bu, "Atölyemizi İzle" oynat düğmesine basınca açılan videodur. Anasayfa arka plan videosuyla karıştırmayın — o ayrı bir alandır (Karşılama/Hero sekmesi).' }
      ]
    }],
    lists: [{
      path: 'sections.atelier.steps', title: 'Adımlar', itemLabel: 'title',
      fields: [
        { path: 'no', label: 'Numara', type: 'text' },
        { path: 'title', label: 'Başlık', type: 'text' },
        { path: 'text', label: 'Açıklama', type: 'textarea' }
      ]
    }]
  },

  {
    id: 'occasions', label: 'Özel Günler', icon: 'gift',
    groups: [{
      title: 'Bölüm',
      fields: [
        { path: 'sections.occasions.enabled', label: 'Bölüm aktif', type: 'toggle' },
        { path: 'sections.occasions.eyebrow', label: 'Üst etiket', type: 'text' },
        { path: 'sections.occasions.title', label: 'Başlık', type: 'text' }
      ]
    }],
    lists: [{
      path: 'sections.occasions.items', title: 'Kartlar', itemLabel: 'title',
      fields: [
        { path: 'icon', label: 'İkon', type: 'select', options: ICONS },
        { path: 'title', label: 'Başlık', type: 'text' },
        { path: 'text', label: 'Açıklama', type: 'textarea' }
      ]
    }]
  },

  {
    id: 'gallery', label: 'Galeri', icon: 'image',
    groups: [{
      title: 'Bölüm',
      fields: [
        { path: 'sections.gallery.enabled', label: 'Bölüm aktif', type: 'toggle' },
        { path: 'sections.gallery.eyebrow', label: 'Üst etiket', type: 'text' },
        { path: 'sections.gallery.title', label: 'Başlık', type: 'text' },
        { path: 'sections.gallery.desc', label: 'Açıklama', type: 'textarea' }
      ]
    }],
    lists: [{
      path: 'sections.gallery.items', title: 'Görseller', itemLabel: 'caption',
      fields: [
        { path: 'image', label: 'Görsel', type: 'image' },
        { path: 'caption', label: 'Açıklama', type: 'text' }
      ]
    }]
  },

  {
    id: 'testimonials', label: 'Yorumlar', icon: 'quote',
    groups: [{
      title: 'Bölüm',
      fields: [
        { path: 'sections.testimonials.enabled', label: 'Bölüm aktif', type: 'toggle' },
        { path: 'sections.testimonials.eyebrow', label: 'Üst etiket', type: 'text' },
        { path: 'sections.testimonials.title', label: 'Başlık', type: 'text' }
      ]
    }],
    lists: [{
      path: 'sections.testimonials.items', title: 'Müşteri Yorumları', itemLabel: 'name',
      fields: [
        { path: 'name', label: 'Ad Soyad', type: 'text' },
        { path: 'role', label: 'Şehir / Ünvan', type: 'text' },
        { path: 'rating', label: 'Puan (1-5)', type: 'number', min: 1, max: 5 },
        { path: 'text', label: 'Yorum', type: 'textarea' },
        { path: 'avatar', label: 'Fotoğraf (opsiyonel)', type: 'image' }
      ]
    }]
  },

  {
    id: 'faq', label: 'S.S.S.', icon: 'help',
    groups: [{
      title: 'Bölüm',
      fields: [
        { path: 'sections.faq.enabled', label: 'Bölüm aktif', type: 'toggle' },
        { path: 'sections.faq.eyebrow', label: 'Üst etiket', type: 'text' },
        { path: 'sections.faq.title', label: 'Başlık', type: 'text' }
      ]
    }],
    lists: [{
      path: 'sections.faq.items', title: 'Sorular', itemLabel: 'q',
      fields: [
        { path: 'q', label: 'Soru', type: 'text' },
        { path: 'a', label: 'Cevap', type: 'textarea', rows: 4 }
      ]
    }]
  },

  {
    id: 'contact', label: 'İletişim', icon: 'pin',
    groups: [{
      title: 'Bilgiler',
      fields: [
        { path: 'sections.contact.enabled', label: 'Bölüm aktif', type: 'toggle' },
        { path: 'sections.contact.eyebrow', label: 'Üst etiket', type: 'text' },
        { path: 'sections.contact.title', label: 'Başlık', type: 'text' },
        { path: 'sections.contact.desc', label: 'Açıklama', type: 'textarea' },
        { path: 'sections.contact.address', label: 'Adres', type: 'textarea' },
        { path: 'sections.contact.phone', label: 'Telefon', type: 'text' },
        { path: 'sections.contact.email', label: 'E-posta', type: 'text' },
        { path: 'sections.contact.mapEmbed', label: 'Google Harita embed URL', type: 'text' }
      ]
    }],
    lists: [{
      path: 'sections.contact.hours', title: 'Çalışma Saatleri', itemLabel: 'days',
      fields: [
        { path: 'days', label: 'Günler', type: 'text' },
        { path: 'time', label: 'Saat aralığı', type: 'text', help: 'Örn: 08:30 - 21:00' }
      ]
    }]
  },

  {
    id: 'footer', label: 'Alt Bilgi', icon: 'layout',
    groups: [{
      title: 'Alt Bilgi',
      fields: [
        { path: 'sections.footer.about', label: 'Tanıtım metni', type: 'textarea' },
        { path: 'sections.footer.copyright', label: 'Telif metni', type: 'text' },
        { path: 'sections.footer.credit', label: 'Kredi', type: 'text' }
      ]
    }],
    lists: [
      {
        path: 'sections.footer.columns', title: 'Bağlantı Sütunları', itemLabel: 'title',
        fields: [
          { path: 'title', label: 'Sütun başlığı', type: 'text' },
          { path: 'links', label: 'Bağlantılar', type: 'pairs', help: 'Her satır: Etiket | #hedef' }
        ]
      },
      {
        path: 'sections.footer.social', title: 'Sosyal Medya', itemLabel: 'label',
        fields: [
          { path: 'icon', label: 'İkon', type: 'select', options: SOCIALS },
          { path: 'label', label: 'Etiket', type: 'text' },
          { path: 'href', label: 'Bağlantı', type: 'text' }
        ]
      }
    ]
  },

  {
    id: 'integrations', label: 'WhatsApp', icon: 'chat',
    groups: [{
      title: 'WhatsApp Siparişi',
      fields: [
        { path: 'integrations.whatsapp.enabled', label: 'WhatsApp butonu aktif', type: 'toggle' },
        { path: 'integrations.whatsapp.phone', label: 'Numara (905xxxxxxxxx)', type: 'text', help: 'Ülke kodu ile, boşluksuz.' },
        { path: 'integrations.whatsapp.floatingLabel', label: 'Buton ipucu', type: 'text' },
        { path: 'integrations.whatsapp.greeting', label: 'Genel karşılama mesajı', type: 'textarea' },
        { path: 'integrations.whatsapp.orderTitle', label: 'Sipariş başlığı', type: 'text' },
        { path: 'integrations.whatsapp.footerNote', label: 'Sipariş sonu notu', type: 'textarea' },
        { path: 'integrations.instagram', label: 'Instagram adresi', type: 'text' },
        { path: 'integrations.phoneDisplay', label: 'Gösterilecek telefon', type: 'text' }
      ]
    }]
  },

  {
    id: 'mascot', label: 'Maskot', icon: 'smile',
    groups: [{
      title: 'Maskot',
      fields: [
        { path: 'mascot.enabled', label: 'Maskot aktif', type: 'toggle' },
        { path: 'mascot.name', label: 'Adı', type: 'text' },
        { path: 'mascot.messages', label: 'Konuşma balonları', type: 'lines' }
      ]
    }]
  },

  { id: 'orders', label: 'Siparişler', icon: 'receipt', custom: 'orders' },
  { id: 'system', label: 'Sistem & Yedek', icon: 'settings', custom: 'system' }
];

/** Ürün kartı alanları — products paneli bunu kullanır. */
export const PRODUCT_FIELDS = [
  { path: 'id', label: 'Ürün kodu', type: 'text', help: 'Siparişte WhatsApp mesajına eklenir.' },
  { path: 'name', label: 'Ürün adı', type: 'text' },
  { path: 'category', label: 'Kategori', type: 'category' },
  { path: 'price', label: 'Fiyat', type: 'number', min: 0 },
  { path: 'oldPrice', label: 'Eski fiyat (indirim için)', type: 'number', min: 0 },
  { path: 'badge', label: 'Rozet', type: 'text', help: 'Örn: Çok Satan, Yeni' },
  { path: 'desc', label: 'Açıklama', type: 'textarea', rows: 3 },
  { path: 'tags', label: 'Etiketler', type: 'tags' },
  { path: 'image', label: 'Ana görsel', type: 'image' },
  { path: 'images', label: 'Ek görseller', type: 'imagelist' },
  { path: 'featured', label: 'Öne çıkar', type: 'toggle' },
  { path: 'stock', label: 'Stokta var', type: 'toggle' }
];

export const PANEL_ICONS = {
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  badge: 'M12 3l7 3v6c0 4.4-3 8-7 9-4-1-7-4.6-7-9V6z',
  palette: 'M12 3a9 9 0 100 18c1.1 0 2-.9 2-2 0-1.6 1.3-2 2-2h1a4 4 0 004-4c0-5-4-10-9-10zM7.5 12a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4zm3-4a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4zm5 0a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4z',
  menu: 'M4 7h16M4 12h16M4 17h10',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z',
  flow: 'M3 8h6l3 8h9M3 16h4',
  book: 'M4 5h7v15H4zM13 5h7v15h-7z',
  box: 'M4 8l8-4 8 4-8 4zM4 8v8l8 4 8-4V8',
  tag: 'M4 4h7l9 9-7 7-9-9zM8 8h.01',
  circle: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v4l3 2',
  play: 'M6 4l14 8-14 8z',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13',
  image: 'M4 5h16v14H4zM8 11a2 2 0 100-4 2 2 0 000 4zM4 16l5-4 4 3 3-2 4 4',
  quote: 'M8 6c-3 1-4 4-4 8h5V8H8zM19 6c-3 1-4 4-4 8h5V8h-1z',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9a2.5 2.5 0 114 2c-.8.6-1.5 1.2-1.5 2.5M12 17h.01',
  pin: 'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z',
  layout: 'M3 5h18v14H3zM3 10h18M9 10v9',
  chat: 'M4 5h16v11H9l-5 4z',
  smile: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9 10h.01M15 10h.01M8.5 14c1.8 1.8 5.2 1.8 7 0',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z'
};
