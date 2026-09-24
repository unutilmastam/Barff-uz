#!/usr/bin/env node
/**
 * cPanel uchun joylash to'plamini yig'adi.
 *
 * NEGA SKRIPT, NEGA QO'LLANMA EMAS
 *
 * Next `output: 'standalone'` bilan `server.js` ni beradi, lekin
 * `.next/static` va `public` ni uning YONIGA KO'CHIRMAYDI — buni
 * chiqish egasi bajarishi kerak. Bu qadam unutilsa server ko'tariladi
 * va HTML ham qaytaradi, ya'ni "ishlayapti" ko'rinadi; faqat CSS va JS
 * `400` bilan yiqiladi va sahifa uslubsiz chiqadi. Bu xatoni shu
 * loyihada bir marta MAHALLIY tekshiruvda ko'rdik (`qa/README.md`,
 * 1-tuzoq) — serverda esa uni topish ancha qiyin.
 *
 * Shuning uchun ko'chirish qadamlari qo'llanma matnida emas, shu
 * skriptda. Qo'llanma: `docs/DEPLOY-CPANEL.md`.
 *
 * Ishlatish:
 *   pnpm build && node scripts/package-cpanel.mjs
 *
 * Natija: `dist-cpanel/` — serverga o'sha holicha yuklanadi.
 * Ichida SIR YO'Q: `.env` fayllari SERVERDA, cPanel interfeysida
 * to'ldiriladi (`CLAUDE.md` §12).
 */
import { cp, mkdir, rm, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist-cpanel');

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Next standalone ilovasini to'liq, ishga tushadigan holatga keltiradi. */
async function packNextApp(app) {
  const from = join(root, 'apps', app);
  const standalone = join(from, '.next', 'standalone');

  if (!(await exists(standalone))) {
    throw new Error(
      `${app}: .next/standalone yo'q. Avval \`pnpm build\` ni yurgizing ` +
        `(va next.config.ts da output: 'standalone' turganini tekshiring).`,
    );
  }

  const target = join(out, app);
  await mkdir(target, { recursive: true });

  // Standalone ishchi maydon tuzilmasini saqlaydi: server.js
  // `<standalone>/apps/<app>/server.js` da bo'ladi, `node_modules`
  // esa ildizda. Ikkalasi ham kerak, shuning uchun BUTUN daraxt.
  await cp(standalone, target, { recursive: true });

  const appRoot = join(target, 'apps', app);

  // Next ATAYLAB ko'chirmaydigan ikki katalog.
  await cp(join(from, '.next', 'static'), join(appRoot, '.next', 'static'), { recursive: true });

  if (await exists(join(from, 'public'))) {
    await cp(join(from, 'public'), join(appRoot, 'public'), { recursive: true });
  }

  /*
   * cPanel `Setup Node.js App` ilova ildizidan BITTA kirish faylini
   * ishga tushiradi. Standalone'da u ichkarida (`apps/<app>/server.js`),
   * shuning uchun ildizga ko'rsatkich qo'yiladi. Ish katalogi ham
   * o'zgartiriladi: `server.js` o'z yonidagi `.next` ni qidiradi.
   */
  await writeFile(
    join(target, 'server.js'),
    [
      '// cPanel `Setup Node.js App` uchun kirish nuqtasi.',
      "// Haqiqiy server ichkarida — bu faqat ko'rsatkich.",
      "process.chdir(new URL('./apps/" + app + "/', import.meta.url).pathname);",
      "await import('./apps/" + app + "/server.js');",
      '',
    ].join('\n'),
  );

  // `type: module` bo'lmasa yuqoridagi `import` ishlamaydi.
  await writeFile(
    join(target, 'package.json'),
    JSON.stringify({ name: `barff-${app}`, private: true, type: 'module' }, null, 2) + '\n',
  );

  console.log(`  ✓ ${app} → dist-cpanel/${app}`);
}

/**
 * Ishchi maydon paketlari — API ular BILAN ishlaydi.
 *
 * `nest build` ularni dist ichiga KO'CHIRMAYDI: qurilgan kodda
 * `require("@barff/db")` shundayligicha qoladi. Shuning uchun ular
 * to'plamga qo'shiladi va `file:` bog'liqlik sifatida e'lon qilinadi.
 */
const WORKSPACE_PACKAGES = ['db', 'types', 'utils', 'validation'];

async function readJson(path) {
  const { readFile } = await import('node:fs/promises');
  return JSON.parse(await readFile(path, 'utf8'));
}

/**
 * Ishchi maydon paketini to'plamga ko'chiradi.
 *
 * `workspace:*` bog'liqliklar OLIB TASHLANADI: npm ularni tushunmaydi.
 * Ular baribir topiladi — hammasi `api/node_modules` ga o'rnatiladi va
 * Node qidiruvi katalog daraxti bo'ylab yuqoriga chiqadi.
 */
async function packWorkspacePackage(name, target) {
  const from = join(root, 'packages', name);
  const pkg = await readJson(join(from, 'package.json'));
  const to = join(target, 'packages', name);

  await mkdir(to, { recursive: true });

  /*
   * `@barff/db` ning `generated/` katalogi TO'PLAMGA KIRMAYDI.
   *
   * Prisma klienti ichida shu platformaga qurilgan so'rov dvigateli bor
   * (`libquery_engine-...so.node`). Boshqa serverda u ishlamaydi —
   * shuning uchun u YERDA `prisma generate` bilan qaytadan yaratiladi
   * (`postinstall`). Sxemadagi chiqish yo'li (`../packages/db/generated`)
   * shu tuzilmaga aynan mos keladi.
   */
  const built = name === 'db' ? null : 'dist';

  if (built !== null) {
    if (!(await exists(join(from, built)))) {
      throw new Error(`${name}: ${built}/ yo'q. Avval \`pnpm build\` ni yurgizing.`);
    }
    await cp(join(from, built), join(to, built), { recursive: true });
  }

  const deps = Object.fromEntries(
    Object.entries(pkg.dependencies ?? {}).filter(([, v]) => !String(v).startsWith('workspace:')),
  );

  await writeFile(
    join(to, 'package.json'),
    JSON.stringify(
      { name: pkg.name, version: '0.0.0', private: true, main: pkg.main, dependencies: deps },
      null,
      2,
    ) + '\n',
  );
}

/** NestJS API: qurilgan `dist`, sxema va ishchi maydon paketlari. */
async function packApi() {
  const from = join(root, 'services', 'api');

  if (!(await exists(join(from, 'dist', 'main.js')))) {
    throw new Error("api: dist/main.js yo'q. Avval `pnpm build` ni yurgizing.");
  }

  const target = join(out, 'api');
  await mkdir(target, { recursive: true });

  await cp(join(from, 'dist'), join(target, 'dist'), { recursive: true });
  await cp(join(root, 'prisma'), join(target, 'prisma'), { recursive: true });

  for (const name of WORKSPACE_PACKAGES) {
    await packWorkspacePackage(name, target);
  }

  /*
   * Bog'liqliklar SERVERDA o'rnatiladi (`npm install`), chunki ba'zilari
   * nativ modul (`argon2`, `sharp`) — ular o'rnatilgan mashinaga moslab
   * quriladi va shu yerdan ko'chirilsa serverda ishlamasligi mumkin.
   */
  const pkg = await readJson(join(from, 'package.json'));

  const deps = Object.fromEntries(
    Object.entries(pkg.dependencies ?? {}).filter(([, v]) => !String(v).startsWith('workspace:')),
  );

  for (const name of WORKSPACE_PACKAGES) {
    deps[`@barff/${name}`] = `file:./packages/${name}`;
  }

  await writeFile(
    join(target, 'package.json'),
    JSON.stringify(
      {
        name: 'barff-api',
        private: true,
        scripts: {
          start: 'node dist/main.js',
          postinstall: 'prisma generate --schema prisma/schema.prisma',
          'db:deploy': 'prisma migrate deploy --schema prisma/schema.prisma',
        },
        dependencies: deps,
        devDependencies: { prisma: pkg.devDependencies?.prisma ?? '^6.19.1' },
      },
      null,
      2,
    ) + '\n',
  );

  // cPanel kirish fayli ildizda turishini kutadi.
  await writeFile(
    join(target, 'server.js'),
    ['// cPanel `Setup Node.js App` uchun kirish nuqtasi.', "require('./dist/main.js');", ''].join(
      '\n',
    ),
  );

  console.log('  ✓ api → dist-cpanel/api');
}

async function main() {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  console.log("cPanel to'plami yig'ilmoqda…");
  await packApi();
  await packNextApp('web');
  await packNextApp('admin');

  await writeFile(
    join(out, 'README.txt'),
    [
      "BARFF — cPanel joylash to'plami",
      '',
      "Bu katalog `scripts/package-cpanel.mjs` tomonidan yig'ilgan.",
      "Ichida SIR YO'Q: `.env` qiymatlari cPanel interfeysida kiritiladi.",
      '',
      'Qadamlar: repodagi `docs/DEPLOY-CPANEL.md`.',
      '',
    ].join('\n'),
  );

  console.log(`\nTayyor: ${out}`);
  console.log('Keyingi qadam: docs/DEPLOY-CPANEL.md');
}

await main();
