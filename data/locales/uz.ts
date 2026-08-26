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
