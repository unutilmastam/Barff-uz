import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { toUpdateSchema } from './update-schema';

const createSchema = z.object({
  slug: z.string(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  title: z.string().optional(),
});

const updateSchema = toUpdateSchema(createSchema);

describe('toUpdateSchema', () => {
  it('berilmagan maydonga STANDART QIYMAT YOZMAYDI', () => {
    const parsed = updateSchema.parse({ slug: 'yangi-slug' });

    // Asosiy maqsad: `.partial()` bu yerda `isActive: true`,
    // `displayOrder: 0`, `status: 'DRAFT'` qo'shib yuborardi.
    expect(parsed).toEqual({ slug: 'yangi-slug' });
  });

  it('nashr holatini tasodifan qoralamaga tushirmaydi', () => {
    const parsed = updateSchema.parse({ title: 'Yangi sarlavha' });
    expect('status' in parsed).toBe(false);
  });

  it('berilgan maydonlarni saqlab qoladi', () => {
    const parsed = updateSchema.parse({ isActive: false, displayOrder: 5 });
    expect(parsed).toEqual({ isActive: false, displayOrder: 5 });
  });

  it('barcha maydonlar ixtiyoriy', () => {
    expect(updateSchema.parse({})).toEqual({});
  });

  it('validatsiya qoidalari saqlanadi', () => {
    // `.default()` yechilgani tekshiruvni yo'qotmasligi kerak.
    expect(updateSchema.safeParse({ displayOrder: 1.5 }).success).toBe(false);
    expect(updateSchema.safeParse({ status: 'NOMALUM' }).success).toBe(false);
  });

  it('yaratish sxemasi standart qiymatlarni SAQLAB qoladi', () => {
    const parsed = createSchema.parse({ slug: 'x' });
    expect(parsed.isActive).toBe(true);
    expect(parsed.status).toBe('DRAFT');
  });
});
