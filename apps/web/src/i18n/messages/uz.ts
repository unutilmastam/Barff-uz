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

    statsEyebrow: 'Raqamlarda',
    statsTitle: 'BARFF bir qarashda',
    statFounded: 'Tashkil etilgan',
    statCapacity: 'Ishlab chiqarish quvvati',
    statProducts: 'Mahsulot turlari',
    statRegions: 'Yetkazib berish hududlari',

    factoryEyebrow: 'Ishlab chiqarish',
    factoryTitle: 'Zamonaviy liniya, nazorat ostidagi jarayon',
    factoryBody:
      'Xomashyoni qabul qilishdan qadoqlashgacha — har bosqich yozib boriladi va nazorat qilinadi.',

    productsEyebrow: 'Mahsulotlar',
    productsTitle: 'Assortiment',
    productsAll: 'Barcha mahsulotlar',

    processEyebrow: 'Jarayon',
    processTitle: 'Xomashyodan yetkazib berishgacha',

    qualityEyebrow: 'Sifat',
    qualityTitle: 'Sifat nazorati va hujjatlar',
    qualityEmpty: 'Sertifikatlar hali yuklanmagan.',

    ctaTitle: "BARFF hamkori bo'ling",
    ctaBody: "Dilerlik shartlari, narxlar va yetkazib berish bo'yicha bog'lanamiz.",
    ctaAction: 'Ariza qoldirish',

    newsEyebrow: 'Yangiliklar',
    newsTitle: "So'nggi yangiliklar",
    newsAll: 'Barcha yangiliklar',
  },
  company: {
    title: 'Kompaniya',
    subtitle: 'BARFF haqida',
    intro:
      "BARFF — ichimliklar ishlab chiqaruvchi korxona. Kompaniya tomonidan tasdiqlangan ma'lumotlar kelgach, bu bo'lim to'ldiriladi.",
    missionTitle: 'Yondashuvimiz',
    missionBody:
      "Har bir partiya nazoratdan o'tadi, har bir jarayon yozib boriladi. Bu — mahsulot sifatining asosi.",
    valuesTitle: 'Tamoyillar',
    valueQuality: 'Sifat',
    valueQualityBody: "Kirish nazoratidan tayyor mahsulotgacha bo'lgan tekshiruv.",
    valueTransparency: 'Shaffoflik',
    valueTransparencyBody: "Hujjatlar va sertifikatlar ochiq ko'rinishda.",
    valuePartnership: 'Hamkorlik',
    valuePartnershipBody: 'Dilerlar bilan uzoq muddatli ish.',
  },
  products: {
    title: 'Mahsulotlar',
    subtitle: 'BARFF assortimenti',
    empty: "Mahsulotlar hali qo'shilmagan.",
    volume: 'Hajm',
    volumeUnit: 'ml',
    perPack: 'Blokda',
    sku: 'Artikul',
    ingredients: 'Tarkibi',
    storage: 'Saqlash sharoiti',
    shelfLife: 'Yaroqlilik muddati',
    shelfLifeDays: 'kun',
    nutrition: 'Oziqaviy qiymati (100 ml)',
    documents: 'Hujjatlar',
    variants: 'Variantlar',
    priceOnRequest: "Narx so'rov bo'yicha",
    category: 'Kategoriya',
    backToProducts: 'Mahsulotlarga qaytish',
  },
  footer: {
    rights: 'Barcha huquqlar himoyalangan',
    privacy: 'Maxfiylik siyosati',
    terms: 'Foydalanish shartlari',
    madeNote: 'Sayt ishlab chiqilmoqda',
  },
  common: {
    loading: 'Yuklanmoqda',
    /** Tasdiqlanmagan ma'lumot yonida turadi (CLAUDE.md §1). */
    mockBadge: 'MOCK',
    mockNotice:
      "Bu bo'limdagi raqamlar NAMUNA. Ular BARFF tomonidan tasdiqlangandan keyin almashtiriladi.",
    unavailableTitle: "Ma'lumot vaqtincha mavjud emas",
    unavailableBody: "Ma'lumotni yuklab bo'lmadi. Sahifani biroz keyinroq yangilang.",
    empty: "Hozircha ma'lumot yo'q",
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
