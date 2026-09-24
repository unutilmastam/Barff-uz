/**
 * Diler portali navigatsiyasi (CLAUDE.md §5).
 *
 * ADMIN PANELIDAN FARQI: bu yerda ruxsat emas, DILER HOLATI hal
 * qiladi. `DEALER` roli ariza yuborilgan zahoti beriladi (S22), ya'ni
 * u hech narsani ochmaydi.
 *
 * DIQQAT: bu KOSMETIKA. Menyuni yashirish himoya emas — foydalanuvchi
 * manzilni qo'lda yozishi yoki API'ni to'g'ridan-to'g'ri chaqirishi
 * mumkin. Haqiqiy himoya serverda: har bir diler endpoint'i
 * `requireActiveDealer()` dan o'tadi va tasdiqlanmagan dilerga `403`
 * qaytaradi (CLAUDE.md §3).
 */
export interface DealerNavItem {
  href: string;
  label: string;
  /**
   * Bo'lim QURILGANMI.
   *
   * Qurilmagan bo'lim menyuda KO'RINADI (rejani ko'rsatadi), lekin
   * HAVOLA bo'lmaydi: u 404 berardi va Next havolani oldindan
   * yuklamoqchi bo'lib so'rovni osiltirib qo'yardi.
   */
  ready: boolean;
}

export interface DealerNavGroup {
  label: string;
  items: DealerNavItem[];
}

const GROUPS: DealerNavGroup[] = [
  {
    label: 'Savdo',
    items: [
      { href: '/', label: 'Boshqaruv paneli', ready: true },
      { href: '/catalog', label: 'Mahsulotlar va narxlar', ready: false },
      { href: '/cart', label: 'Savat', ready: false },
      { href: '/orders', label: 'Buyurtmalar', ready: false },
    ],
  },
  {
    label: 'Yetkazib berish',
    items: [
      { href: '/deliveries', label: 'Yetkazib berish', ready: false },
      { href: '/addresses', label: 'Manzillar', ready: true },
    ],
  },
  {
    label: 'Moliya',
    items: [
      { href: '/invoices', label: 'Hisob-fakturalar', ready: false },
      { href: '/balance', label: 'Balans va to‘lovlar', ready: false },
    ],
  },
  {
    label: 'Akkaunt',
    items: [
      { href: '/profile', label: 'Profil', ready: true },
      { href: '/support', label: 'Yordam', ready: true },
    ],
  },
];

/**
 * Diler KO'RADIGAN bo'limlar.
 *
 * TASDIQLANMAGAN diler uchun menyu deyarli BO'SH: u faqat o'z
 * arizasi holatini va profilini ko'radi. Qolgan bo'limlarni
 * ko'rsatish uni bosishga undab, keyin `403` bilan qaytarardi.
 */
export function visibleNav(active: boolean): DealerNavGroup[] {
  if (active) return GROUPS;

  return [
    {
      label: 'Akkaunt',
      items: [
        { href: '/', label: 'Ariza holati', ready: true },
        { href: '/profile', label: 'Profil', ready: true },
        { href: '/support', label: 'Yordam', ready: true },
      ],
    },
  ];
}

/** Barcha bo'limlar — testlar va tekshiruvlar uchun. */
export const ALL_NAV_GROUPS = GROUPS;
