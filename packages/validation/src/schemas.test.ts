import { describe, expect, it } from 'vitest';
import {
  leadCreateSchema,
  loginSchema,
  passwordChangeSchema,
  paginationQuerySchema,
} from './index';

const validLead = {
  companyName: 'Anor Savdo',
  contactName: 'Aziz Karimov',
  phone: '+998 90 123 45 67',
  region: 'Toshkent',
  businessType: 'DISTRIBUTOR',
} as const;

describe('leadCreateSchema', () => {
  it("minimal to'g'ri formani qabul qiladi", () => {
    const parsed = leadCreateSchema.parse(validLead);
    expect(parsed.phone).toBe('998901234567');
    expect(parsed.businessType).toBe('DISTRIBUTOR');
  });

  it('telefon raqamini normallashtiradi', () => {
    const parsed = leadCreateSchema.parse({ ...validLead, phone: '901234567' });
    expect(parsed.phone).toBe('998901234567');
  });

  it("noto'g'ri telefon raqamini rad etadi", () => {
    expect(leadCreateSchema.safeParse({ ...validLead, phone: '12345' }).success).toBe(false);
  });

  it("to'ldirilgan honeypot bilan so'rovni rad etadi", () => {
    expect(leadCreateSchema.safeParse({ ...validLead, honeypot: 'bot' }).success).toBe(false);
  });

  it("bo'sh honeypot'ga ruxsat beradi", () => {
    expect(leadCreateSchema.safeParse({ ...validLead, honeypot: '' }).success).toBe(true);
  });

  it("noma'lum business type'ni rad etadi", () => {
    expect(leadCreateSchema.safeParse({ ...validLead, businessType: 'FACTORY' }).success).toBe(
      false,
    );
  });
});

describe('loginSchema', () => {
  it("email'ni kichik harfga keltiradi va probellarni kesadi", () => {
    const parsed = loginSchema.parse({ email: '  Dealer@Barff.UZ ', password: 'x' });
    expect(parsed.email).toBe('dealer@barff.uz');
  });

  it('kirishda eski (qisqa) parolga ruxsat beradi', () => {
    expect(loginSchema.safeParse({ email: 'a@b.uz', password: 'qisqa' }).success).toBe(true);
  });

  it("bo'sh parolni rad etadi", () => {
    expect(loginSchema.safeParse({ email: 'a@b.uz', password: '' }).success).toBe(false);
  });
});

describe('passwordChangeSchema', () => {
  it('mos kelmagan tasdiq parolini rad etadi', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'eskiParol1',
      newPassword: 'yangiParol1',
      confirmPassword: 'boshqaParol1',
    });
    expect(result.success).toBe(false);
  });

  it('eski parol bilan bir xil yangi parolni rad etadi', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'birXilParol1',
      newPassword: 'birXilParol1',
      confirmPassword: 'birXilParol1',
    });
    expect(result.success).toBe(false);
  });

  it('qisqa yangi parolni rad etadi', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'eskiParol1',
      newPassword: 'qisqa',
      confirmPassword: 'qisqa',
    });
    expect(result.success).toBe(false);
  });

  it("to'g'ri parol almashtirishni qabul qiladi", () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'eskiParol1',
      newPassword: 'yangiParol1',
      confirmPassword: 'yangiParol1',
    });
    expect(result.success).toBe(true);
  });
});

describe('paginationQuerySchema', () => {
  it("standart qiymatlarni qo'yadi", () => {
    expect(paginationQuerySchema.parse({})).toMatchObject({
      page: 1,
      limit: 20,
      sortOrder: 'desc',
    });
  });

  it("query string'dagi raqamlarni songa aylantiradi", () => {
    expect(paginationQuerySchema.parse({ page: '3', limit: '50' })).toMatchObject({
      page: 3,
      limit: 50,
    });
  });

  it('limit yuqori chegarasini ushlaydi', () => {
    expect(paginationQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });
});
