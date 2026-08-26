/**
 * O'zbek tili — tarjimalarning MANBA nusxasi (source of truth).
 * `ru.ts` va `en.ts` shu tuzilmani `Dictionary` tipi orqali takrorlashi SHART.
 *
 * Bu yerda faqat INTERFEYS matnlari. Mahsulot, yangilik va brend kontenti
 * `data/products.ts`, `data/news.ts` da — bu yerga ko'chirilmaydi.
 */
export const uz = {
  nav: {
    products: 'MAHSULOTLAR',
    about: 'BRAND HAQIDA',
    story: 'TARIX',
    news: 'YANGILIKLAR',
    contact: 'ALOQA',
  },
  hero: {
    scroll: 'PASTGA',
    cta: 'MAHSULOTLAR',
    productPending: 'Mahsulot fotosurati',
  },
  sections: {
    categories: 'Kategoriyalar',
    products: 'Mahsulotlar',
    showcase: 'Kolleksiya',
    philosophy: 'Falsafa',
    about: 'Brend haqida',
    story: 'Tarix',
    process: 'Jarayon',
    fruitToBottle: 'Mevadan shishagacha',
    video: 'Video',
    reels: 'Lavhalar',
    news: 'Yangiliklar',
    whereToBuy: 'Qayerdan olish mumkin',
    contact: 'Aloqa',
  },
  process: {
    fruit: 'MEVA',
    bottle: 'SHISHA',
  },
  video: {
    play: 'Videoni ochish',
    close: 'Videoni yopish',
  },
  contact: {
    name: 'Ismingiz',
    phone: 'Telefon',
    email: 'Email',
    message: 'Xabar',
    submit: 'Yuborish',
    sending: 'Yuborilmoqda…',
    success: 'Rahmat! Xabaringiz yuborildi.',
    error: 'Nimadir xato ketdi. Iltimos, qayta urinib ko\u2019ring.',
    required: 'Bu maydon to\u2019ldirilishi shart.',
    invalidEmail: 'Email manzili noto\u2019g\u2019ri.',
    invalidPhone: 'Telefon raqami noto\u2019g\u2019ri.',
    tooShort: 'Kamida {min} ta belgi kerak.',
    notConfigured: 'Forma hali ulanmagan — yuborish manzili sozlanishi kerak.',
  },
  whereToBuy: {
    cta: 'FIND YOUR BARFF',
    pending: 'Sotuv nuqtalari ro\u2019yxati mijozdan kutilmoqda.',
  },
  menu: {
    title: 'MENYU',
    social: 'IJTIMOIY TARMOQLAR',
    language: 'TIL',
  },
  footer: {
    navigation: 'NAVIGATSIYA',
    social: 'IJTIMOIY TARMOQLAR',
    language: 'TIL',
    rights: 'Barcha huquqlar himoyalangan.',
  },
  loader: {
    /** Ekran o'quvchilar uchun — vizual holda faqat foiz ko'rinadi. */
    status: 'Sahifa yuklanmoqda',
  },
  actions: {
    close: 'Yopish',
    back: 'Orqaga',
  },
  a11y: {
    skipToContent: 'Asosiy kontentga o‘tish',
    home: 'Bosh sahifa',
    openMenu: 'Menyuni ochish',
    closeMenu: 'Menyuni yopish',
    mainNavigation: 'Asosiy navigatsiya',
    footerNavigation: 'Quyi navigatsiya',
    selectLanguage: 'Tilni tanlash',
  },
};

/** Barcha tillar uchun majburiy tuzilma. */
export type Dictionary = typeof uz;
