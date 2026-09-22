import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

/**
 * Parol hashlash.
 *
 * argon2id — parolga maxsus mo'ljallangan algoritm; GPU hujumlariga bcrypt'dan
 * ko'ra chidamliroq. Parametrlar OWASP tavsiyasiga yaqin.
 */
@Injectable()
export class PasswordService {
  private readonly options = {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  } as const;

  hash(password: string): Promise<string> {
    return argon2.hash(password, this.options);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      // Buzilgan yoki notanish formatdagi hash — tekshiruv muvaffaqiyatsiz.
      return false;
    }
  }

  /**
   * Mavjud bo'lmagan foydalanuvchi uchun "bo'sh" tekshiruv.
   *
   * Busiz javob vaqti farq qilardi: mavjud email uchun argon2 ishlaydi
   * (~50ms), mavjud bo'lmagani uchun esa darhol qaytardi. Shu farq orqali
   * qaysi emaillar ro'yxatdan o'tganini aniqlash mumkin edi.
   */
  async burnTime(): Promise<void> {
    await argon2.hash('vaqt-tenglashtirish-uchun', this.options);
  }
}
