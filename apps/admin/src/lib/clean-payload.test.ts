import { describe, expect, it } from 'vitest';
import { cleanPayload } from './clean-payload';

describe('cleanPayload', () => {
  it("bo'sh ko'p tilli maydonni TUSHIRIB QOLDIRADI", () => {
    // Aks holda server "kamida bitta tilda matn shart" deb rad etardi.
    const result = cleanPayload({
      title: { uz: 'Bor', ru: '', en: '' },
      excerpt: { uz: '', ru: '', en: '' },
    });

    expect(result).toEqual({ title: { uz: 'Bor' } });
    expect('excerpt' in result).toBe(false);
  });

  it('null va undefined ni tushirib qoldiradi', () => {
    const result = cleanPayload({ coverImageId: null, categoryId: undefined, slug: 'x' });

    expect(result).toEqual({ slug: 'x' });
  });

  it("bo'sh satrni tushirib qoldiradi", () => {
    expect(cleanPayload({ issuer: '   ', number: 'A-1' })).toEqual({ number: 'A-1' });
  });

  it('nol va `false` SAQLANADI', () => {
    // Bular haqiqiy qiymatlar: tartib raqami 0, "ommaviy emas" false.
    const result = cleanPayload({ displayOrder: 0, isPublic: false, isActive: false });

    expect(result).toEqual({ displayOrder: 0, isPublic: false, isActive: false });
  });

  it('massiv va obyektni tegmasdan otkazadi', () => {
    const nutrition = { kcal: 40 };
    const result = cleanPayload({ nutrition, tags: ['a'] });

    expect(result['nutrition']).toBe(nutrition);
    expect(result['tags']).toEqual(['a']);
  });
});
