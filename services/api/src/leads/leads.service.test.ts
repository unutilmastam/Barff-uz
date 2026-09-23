import { describe, expect, it } from 'vitest';
import { LeadsService } from './leads.service';

describe('LeadsService.dedupeKey', () => {
  /**
   * Bir xil odam turli formatda yozgan telefon BITTA kalit berishi
   * kerak — aks holda "takroriy ariza" tekshiruvi hech qachon
   * ishlamasdi.
   */
  it('telefon formatini hisobga olmaydi', () => {
    const a = LeadsService.dedupeKey('Anor Savdo', '+998 90 123-45-67');
    const b = LeadsService.dedupeKey('Anor Savdo', '998901234567');

    expect(a).toBe(b);
  });

  it('kompaniya nomidagi registr va bosh joylarni tenglashtiradi', () => {
    const a = LeadsService.dedupeKey('  Anor   Savdo ', '998901234567');
    const b = LeadsService.dedupeKey('anor savdo', '998901234567');

    expect(a).toBe(b);
  });

  it('boshqa kompaniya — boshqa kalit', () => {
    const a = LeadsService.dedupeKey('Anor Savdo', '998901234567');
    const b = LeadsService.dedupeKey('Olma Savdo', '998901234567');

    expect(a).not.toBe(b);
  });

  it('boshqa telefon — boshqa kalit', () => {
    const a = LeadsService.dedupeKey('Anor Savdo', '998901234567');
    const b = LeadsService.dedupeKey('Anor Savdo', '998901234568');

    expect(a).not.toBe(b);
  });
});
