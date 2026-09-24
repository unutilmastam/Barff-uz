import { describe, expect, it } from 'vitest';
import { ALL_NAV_GROUPS, visibleNav } from './navigation';

describe('diler navigatsiyasi', () => {
  /**
   * ENG MUHIM QOIDA: tasdiqlanmagan diler savdo bo'limlarini
   * KO'RMAYDI.
   *
   * Bu kosmetika (server baribir `403` qaytaradi), lekin kosmetikaning
   * o'zi ham muhim: dilerga "Savat" ni ko'rsatib, bosgach xato berish
   * uni tizim buzuq deb o'ylashga majbur qilardi.
   */
  it("tasdiqlanmagan diler SAVDO bo'limlarini ko'rmaydi", () => {
    const hrefs = visibleNav(false).flatMap((group) => group.items.map((item) => item.href));

    expect(hrefs).not.toContain('/catalog');
    expect(hrefs).not.toContain('/cart');
    expect(hrefs).not.toContain('/orders');
    expect(hrefs).not.toContain('/addresses');
  });

  it("tasdiqlanmagan diler O'Z arizasi va profilini ko'radi", () => {
    const hrefs = visibleNav(false).flatMap((group) => group.items.map((item) => item.href));

    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/profile');
    expect(hrefs).toContain('/support');
  });

  it('tasdiqlangan diler TO‘LIQ menyuni ko‘radi', () => {
    const hrefs = visibleNav(true).flatMap((group) => group.items.map((item) => item.href));

    expect(hrefs).toContain('/catalog');
    expect(hrefs).toContain('/cart');
    expect(hrefs).toContain('/orders');
    expect(hrefs).toContain('/addresses');
  });

  /**
   * Qurilmagan bo'lim HAVOLA bo'lmasligi kerak: u 404 berardi va
   * Next havolani oldindan yuklamoqchi bo'lib so'rovni osiltirib
   * qo'yardi (ommaviy saytda o'lchangan xatti-harakat).
   */
  it('qurilgan bo‘limlar ro‘yxati aniq', () => {
    const ready = ALL_NAV_GROUPS.flatMap((group) =>
      group.items.filter((item) => item.ready).map((item) => item.href),
    );

    // S24 da shell, S25 da katalog va savat; buyurtmalar S26+ da.
    expect(ready).toEqual(['/', '/catalog', '/cart', '/addresses', '/profile', '/support']);
  });

  it('havolalar takrorlanmaydi', () => {
    const hrefs = ALL_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href));

    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
