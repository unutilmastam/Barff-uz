import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — oddiy .mjs skript, tip e'lonlari yo'q
import { parseEnvFile, validateReleaseEnv } from '../../../scripts/release-env.mjs';

const validate = validateReleaseEnv as (env: Record<string, string>) => string[];
const parse = parseEnvFile as (text: string) => Record<string, string>;

const good = {
  NEXT_PUBLIC_API_BASE_URL: 'https://api.barff.uz/api/v1',
  NEXT_PUBLIC_SITE_URL: 'https://barff.uz',
};

describe('validateReleaseEnv', () => {
  it('to‘g‘ri qiymatlarni qabul qiladi', () => {
    expect(validate(good)).toEqual([]);
  });

  it('berilmagan majburiy o‘zgaruvchini topadi', () => {
    expect(validate({})).toHaveLength(2);
    expect(validate({ ...good, NEXT_PUBLIC_SITE_URL: '  ' })[0]).toMatch(/SITE_URL: berilmagan/);
  });

  it.each([
    'http://localhost:3000/api/v1',
    'https://localhost/api/v1',
    'https://127.0.0.1:4000/api/v1',
    'http://api.barff.uz/api/v1',
    'not a url',
    'https://api.barff.uz',
  ])('API manzili rad etiladi: %s', (value) => {
    expect(validate({ ...good, NEXT_PUBLIC_API_BASE_URL: value })).toHaveLength(1);
  });

  it('ixtiyoriy manzillar berilsa ular ham tekshiriladi', () => {
    expect(validate({ ...good, NEXT_PUBLIC_ADMIN_URL: 'http://localhost:3002' })).toHaveLength(1);
    expect(validate({ ...good, NEXT_PUBLIC_ADMIN_URL: 'https://admin.barff.uz' })).toEqual([]);
  });

  it('NEXT_PUBLIC_ALLOW_INDEXING faqat true/false', () => {
    expect(validate({ ...good, NEXT_PUBLIC_ALLOW_INDEXING: 'yes' })).toHaveLength(1);
    expect(validate({ ...good, NEXT_PUBLIC_ALLOW_INDEXING: 'true' })).toEqual([]);
  });

  it('repodagi release.env.example o‘zi yaroqli', () => {
    const text = readFileSync(resolve(__dirname, '../../../release.env.example'), 'utf8');
    expect(validate(parse(text))).toEqual([]);
  });
});

describe('parseEnvFile', () => {
  it('izoh, bo‘sh qator va tirnoqlarni to‘g‘ri o‘qiydi', () => {
    const out = parse('# izoh\n\nA=1\nB = "two"\nC=\'3\'\nURL=https://x.uz/a=b\n=bad\nnoeq\n');
    expect(out).toEqual({ A: '1', B: 'two', C: '3', URL: 'https://x.uz/a=b' });
  });
});
