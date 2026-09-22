import { describe, expect, it } from 'vitest';
import { REDACTED, redact } from './redact';

describe('redact', () => {
  it('parol va token maydonlarini yashiradi', () => {
    const out = redact({ email: 'a@b.uz', password: 'maxfiy', refreshToken: 'abc' });
    expect(out).toEqual({ email: 'a@b.uz', password: REDACTED, refreshToken: REDACTED });
  });

  it('kalit nomidagi katta-kichik harfga bogliq emas', () => {
    expect(redact({ Authorization: 'Bearer x' })).toEqual({ Authorization: REDACTED });
  });

  it('ichma-ich obyektlarga ham tushadi', () => {
    const out = redact({ body: { user: { secret: 'x', name: 'Ali' } } });
    expect(out).toEqual({ body: { user: { secret: REDACTED, name: 'Ali' } } });
  });

  it('massiv ichidagi elementlarni ham tozalaydi', () => {
    expect(redact([{ token: 't' }, { id: 1 }])).toEqual([{ token: REDACTED }, { id: 1 }]);
  });

  it('Error obyektini stack bilan birga saqlaydi', () => {
    const out = redact(new Error('buzildi')) as Record<string, unknown>;
    expect(out['name']).toBe('Error');
    expect(out['message']).toBe('buzildi');
  });

  it('juda chuqur tuzilmada toxtaydi', () => {
    let deep: Record<string, unknown> = { end: true };
    for (let i = 0; i < 20; i += 1) deep = { nested: deep };
    expect(JSON.stringify(redact(deep))).toContain('DEPTH_LIMIT');
  });

  it('oddiy qiymatlarni ozgartirmaydi', () => {
    expect(redact('matn')).toBe('matn');
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
  });
});
