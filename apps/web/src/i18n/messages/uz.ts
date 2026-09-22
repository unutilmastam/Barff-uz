/**
 * O'zbekcha — MANBA til.
 *
 * Boshqa tillardagi fayllar shu obyektning tipiga bo'ysunadi, shuning uchun
 * yangi kalit qo'shilsa va tarjima qilinmasa, TypeScript xato beradi.
 * Ya'ni tarjimani "keyin qo'shamiz" deb unutib bo'lmaydi.
 */
export const uz = {
  meta: {
    title: 'BARFF — ichimliklar ishlab chiqaruvchi',
    description:
      'BARFF — ichimliklar ishlab chiqarish korxonasi. Mahsulotlar, ishlab chiqarish va hamkorlik.',
  },
  nav: {
    home: 'Bosh sahifa',
    company: 'Kompaniya',
    products: 'Mahsulotlar',
    production: 'Ishlab chiqarish',
    quality: 'Sifat',
    partners: 'Hamkorlar',
    news: 'Yangiliklar',
    contact: 'Aloqa',
    becomePartner: "Hamkor bo'lish",
  },
  home: {
    heroTitle: 'Tabiat tomchisi',
    heroSubtitle: "Zamonaviy ishlab chiqarish, qat'iy sifat nazorati.",
    heroCta: "Mahsulotlarni ko'rish",
    heroSecondaryCta: "Hamkor bo'lish",
  },
  footer: {
    rights: 'Barcha huquqlar himoyalangan',
    privacy: 'Maxfiylik siyosati',
    terms: 'Foydalanish shartlari',
    madeNote: 'Sayt ishlab chiqilmoqda',
  },
  common: {
    loading: 'Yuklanmoqda',
    skipToContent: 'Asosiy kontentga o’tish',
    languageSwitcher: 'Tilni tanlash',
    openMenu: 'Menyuni ochish',
    closeMenu: 'Menyuni yopish',
  },
  errors: {
    notFoundTitle: 'Sahifa topilmadi',
    notFoundBody: "Siz izlagan sahifa mavjud emas yoki ko'chirilgan.",
    notFoundCta: 'Bosh sahifaga qaytish',
    genericTitle: 'Xatolik yuz berdi',
    genericBody: "Kutilmagan xato. Iltimos, birozdan so'ng qayta urinib ko'ring.",
    genericCta: 'Qayta urinish',
  },
};

/**
 * Barcha tarjimalar shu tipga mos bo'lishi shart.
 *
 * `as const` ATAYLAB ishlatilmagan: u har bir qiymatni literal tipga
 * aylantirib, boshqa tillardan AYNAN o'zbekcha matnni talab qilardi.
 * Bizga kerak bo'lgani — tuzilma (qaysi kalitlar bor), qiymat emas.
 */
export type Messages = typeof uz;
