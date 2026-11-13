import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
// @ts-expect-error — oddiy .cjs skript, tip e'lonlari yo'q
import * as setup from '../../../scripts/server-setup.cjs';

const { buildEnv, check, parseEnv, password } = setup as {
  buildEnv: (input: Record<string, string>) => string;
  check: (env: Record<string, string>, domain: string) => string[];
  parseEnv: (text: string) => Record<string, string>;
  password: (length?: number) => string;
};

const media = mkdtempSync(join(tmpdir(), 'barff-media-'));
afterAll(() => rmSync(media, { recursive: true, force: true }));

const build = () =>
  parseEnv(
    buildEnv({
      domain: 'barff.uz',
      databaseUrl: 'postgresql://u:p@127.0.0.1:5432/db',
      mediaRoot: media,
      adminEmail: 'owner@barff.uz',
      adminName: 'Owner',
      adminPassword: 'x',
    }),
  );

describe('server-setup: buildEnv + check', () => {
  it('yaratilgan .env o‘zi tekshiruvdan o‘tadi', () => {
    expect(check(build(), 'barff.uz')).toEqual([]);
  });

  it('CORS ro‘yxatida HAMMA to‘rt ilova bor, `*` yo‘q', () => {
    const env = build();
    expect(env['API_CORS_ORIGINS']!.split(',')).toEqual([
      'https://barff.uz',
      'https://admin.barff.uz',
      'https://partner.barff.uz',
      'https://delivery.barff.uz',
    ]);
  });

  it('uch sir ham har safar boshqacha, ≥32 belgi va bir-biridan farqli', () => {
    const a = build();
    const b = build();
    const secrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MEDIA_SIGNING_SECRET'] as const;

    for (const key of secrets) {
      expect(a[key]!.length).toBeGreaterThanOrEqual(32);
      expect(a[key]).not.toBe(b[key]);
    }
    expect(new Set(secrets.map((key) => a[key])).size).toBe(3);
  });

  it('rasm manzili /api/v1/media bilan tugaydi, Redis yo‘q', () => {
    const env = build();
    expect(env['MEDIA_PUBLIC_URL']).toBe('https://api.barff.uz/api/v1/media');
    expect('REDIS_URL' in env).toBe(false);
  });

  it.each([
    ['qisqa sir', { JWT_ACCESS_SECRET: 'qisqa' }, /JWT_ACCESS_SECRET/],
    [
      'bir xil JWT sirlari',
      { JWT_REFRESH_SECRET: 'same'.repeat(10), JWT_ACCESS_SECRET: 'same'.repeat(10) },
      /BIR XIL/,
    ],
    ['CORS da admin yo‘q', { API_CORS_ORIGINS: 'https://barff.uz' }, /admin\.barff\.uz/],
    [
      'CORS `*`',
      {
        API_CORS_ORIGINS:
          '*,https://barff.uz,https://admin.barff.uz,https://partner.barff.uz,https://delivery.barff.uz',
      },
      /taqiqlangan/,
    ],
    ['http API', { API_BASE_URL: 'http://api.barff.uz' }, /https/],
    [
      'noto‘g‘ri media manzili',
      { MEDIA_PUBLIC_URL: 'https://api.barff.uz/api/v1/media/file' },
      /MEDIA_PUBLIC_URL/,
    ],
    ['MySQL', { DATABASE_URL: 'mysql://u:p@h/db' }, /postgresql/],
    ['Redis', { REDIS_URL: 'redis://x' }, /Redis/],
    ['Swagger yoqilgan', { SWAGGER_ENABLED: 'true' }, /SWAGGER/],
    ['cookie Secure emas', { COOKIE_SECURE: 'false' }, /COOKIE_SECURE/],
  ])('%s topiladi', (_name, patch, expected) => {
    const problems = check({ ...build(), ...patch }, 'barff.uz');

    expect(problems.join('\n')).toMatch(expected);
  });
});

describe('server-setup: parol va .env o‘qish', () => {
  it('parol belgilar to‘plami va uzunligi', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      const value = password();
      expect(value).toMatch(/^[A-HJ-NP-Za-km-z2-9]{16}$/);
      seen.add(value);
    }
    expect(seen.size).toBe(100);
  });

  it('parseEnv izoh va bo‘sh qatorlarni o‘tkazadi, = ichidagi qiymatni saqlaydi', () => {
    expect(parseEnv('# x\n\nA=1\nB=postgresql://u:p=q@h/db\n')).toEqual({
      A: '1',
      B: 'postgresql://u:p=q@h/db',
    });
  });
});

describe('server-setup: preflight hukmlari', () => {
  const { evaluate } = setup as {
    evaluate: (facts: Record<string, unknown>) => { level: string; text: string }[];
  };

  const good = {
    node: 'v22.1.0',
    platform: 'linux',
    arch: 'x64',
    glibc: '2.34',
    memoryMb: 2048,
    diskFreeGb: 9,
    inodesFree: 300000,
    nproc: 500,
    tools: { pg_dump: true, psql: true },
    network: { 'registry.npmjs.org': true, 'binaries.prisma.sh': true },
  };
  const levels = (facts: Record<string, unknown>) =>
    evaluate({ ...good, ...facts }).map((v) => v.level);

  it('yetarli hosting — hammasi ok', () => {
    expect(new Set(levels({}))).toEqual(new Set(['ok']));
  });

  it.each([
    ['eski Node', { node: 'v18.19.0' }],
    ['eski glibc', { glibc: '2.17' }],
    ['xotira 1 GB dan kam', { memoryMb: 1024 }],
    ['disk 5 GB dan kam', { diskFreeGb: 3 }],
    ['inode kam', { inodesFree: 80000 }],
    ['npm yopiq', { network: { 'registry.npmjs.org': false, 'binaries.prisma.sh': true } }],
  ])('%s — JIDDIY', (_name, patch) => {
    expect(levels(patch)).toContain('fail');
  });

  it('xotira 1,3–2 GB oralig‘i — faqat ogohlantirish', () => {
    const result = levels({ memoryMb: 1500 });
    expect(result).toContain('warn');
    expect(result).not.toContain('fail');
  });

  it('pg_dump yo‘qligi — ogohlantirish (zaxira ishlamaydi)', () => {
    const result = evaluate({ ...good, tools: { pg_dump: false, psql: true } });
    expect(result.find((v) => /pg_dump/.test(v.text))?.level).toBe('warn');
  });
});
