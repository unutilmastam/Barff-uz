import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
// @ts-expect-error — oddiy .mjs skript, tip e'lonlari yo'q
import { FORBIDDEN_FILES, scanText } from '../../../scripts/check-secrets.mjs';

/**
 * Sirlar testda BO'LAKLAB yig'iladi: aks holda bu fayl o'zi skanerga
 * "topilma" bo'lib ko'rinardi (va haqiqiy sir kabi git tarixiga tushardi).
 */
const fake = {
  pem: ['-----BEGIN RSA ', 'PRIVATE KEY-----'].join(''),
  aws: ['AKIA', 'IOSFODNN7EXAMPLE'].join(''),
  github: ['ghp', '_', 'a'.repeat(36)].join(''),
  telegram: ['123456789', ':AA', 'b'.repeat(33)].join(''),
  jwt: [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6',
    '.',
    'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6',
    '.',
    'SflKxwRJSMeKKF2QT4fwpMeJf36',
  ].join(''),
  dbUrl: ['postgresql://app:', 'Hh8s7Xq2Lm9Z', '@db.example.net:5432/prod'].join(''),
};

describe('sir skaneri qoidalari', () => {
  for (const [name, value] of Object.entries(fake)) {
    it(`${name} topiladi`, () => {
      const hits = scanText(`const x = '${value}';`, 'src/config.ts');
      expect(hits.length, name).toBeGreaterThan(0);
    });
  }

  it('oddiy kod va placeholder ulanish satrlari TEGILMAYDI', () => {
    const benign = [
      'const url = process.env.DATABASE_URL;',
      'postgresql://FOYDALANUVCHI:PAROL@127.0.0.1:5432/BAZA',
      'postgresql://${USER}:${PASS}@localhost/db',
      'postgresql://barff:barff_local_dev@localhost:5432/barff',
      'const token = await login(); // access token qaytadi',
      'SEED_ADMIN_PASSWORD=',
      'JWT_ACCESS_SECRET=tasodifiy-uzun-qiymat-kiriting',
    ].join('\n');

    expect(scanText(benign, 'docs/x.md')).toEqual([]);
  });

  it('test fayllari ruxsat etilgan (soxta namunalar), boshqa fayllar — yo‘q', () => {
    expect(scanText(fake.jwt, 'services/api/test/audit.e2e-spec.ts')).toEqual([]);
    expect(scanText(fake.jwt, 'services/api/src/auth/x.ts').length).toBeGreaterThan(0);
  });

  it('topilma QIYMATNI chiqarmaydi', () => {
    const hit = scanText(fake.github, 'a.ts')[0];
    expect(JSON.stringify(hit)).not.toContain('ghp_');
  });

  it('repoda bo‘lmasligi kerak fayl nomlari', () => {
    for (const bad of ['.env', 'apps/web/.env.local', 'keys/server.pem', 'id_rsa']) {
      expect(
        FORBIDDEN_FILES.some((re: RegExp) => re.test(bad)),
        bad,
      ).toBe(true);
    }
    for (const ok of ['.env.example', 'docs/env.md']) {
      expect(
        FORBIDDEN_FILES.some((re: RegExp) => re.test(ok)),
        ok,
      ).toBe(false);
    }
  });
});

describe('sir skaneri — haqiqiy git repoda', () => {
  const root = mkdtempSync(join(tmpdir(), 'barff-secrets-'));
  const script = resolve(__dirname, '../../../scripts/check-secrets.mjs');

  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  const scan = (...flags: string[]) => {
    try {
      return {
        code: 0,
        out: execFileSync('node', [script, ...flags], {
          cwd: root,
          stdio: 'pipe',
          encoding: 'utf8',
        }),
      };
    } catch (error) {
      const e = error as { status: number; stderr: string };
      return { code: e.status, out: e.stderr };
    }
  };

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('tarixga tushgan sir keyin o‘chirilsa ham --history topadi', () => {
    git('init', '-q');
    git('config', 'user.email', 'qa@example.com');
    git('config', 'user.name', 'QA');
    mkdirSync(join(root, 'src'));

    writeFileSync(join(root, 'src', 'ok.ts'), 'export const a = 1;\n');
    git('add', '.');
    git('commit', '-qm', 'toza');
    expect(scan().code).toBe(0);

    writeFileSync(join(root, 'src', 'leak.ts'), `export const k = '${fake.github}';\n`);
    git('add', '.');
    git('commit', '-qm', 'tasodifan sir');
    expect(scan().code).toBe(1);

    // Sirni o'chirib commit qilamiz: hozirgi fayllar toza, lekin TARIXDA qoldi.
    writeFileSync(join(root, 'src', 'leak.ts'), 'export const k = process.env.K;\n');
    git('add', '.');
    git('commit', '-qm', 'sir olib tashlandi');

    expect(scan().code).toBe(0);
    const history = scan('--history');
    expect(history.code).toBe(1);
    expect(history.out).toContain('src/leak.ts');
    expect(history.out).not.toContain('ghp_');
  });

  it('kuzatiladigan .env fayli topiladi', () => {
    writeFileSync(join(root, '.env'), 'X=1\n');
    git('add', '-f', '.env');
    expect(scan().code).toBe(1);
    git('rm', '-qf', '--cached', '.env');
    copyFileSync(join(root, '.env'), join(root, 'env-bak'));
  });
});
