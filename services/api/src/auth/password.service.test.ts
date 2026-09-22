import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service';

const passwords = new PasswordService();

describe('PasswordService', () => {
  it('argon2id hash yaratadi va ochiq parolni saqlamaydi', async () => {
    const hash = await passwords.hash('Juda-Kuchli-Parol-2026');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain('Juda-Kuchli-Parol-2026');
  });

  it("to'g'ri parolni tasdiqlaydi", async () => {
    const hash = await passwords.hash('Juda-Kuchli-Parol-2026');
    expect(await passwords.verify(hash, 'Juda-Kuchli-Parol-2026')).toBe(true);
  });

  it("noto'g'ri parolni rad etadi", async () => {
    const hash = await passwords.hash('Juda-Kuchli-Parol-2026');
    expect(await passwords.verify(hash, 'boshqa-parol')).toBe(false);
  });

  it('bir xil parol har safar boshqa hash beradi (salt)', async () => {
    const [a, b] = await Promise.all([passwords.hash('bir-xil'), passwords.hash('bir-xil')]);
    expect(a).not.toBe(b);
  });

  it('buzilgan hash uchun xato tashlamaydi', async () => {
    expect(await passwords.verify('bu-hash-emas', 'parol')).toBe(false);
  });
});
