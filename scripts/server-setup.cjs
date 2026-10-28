/*
  SERVER SOZLASH ASBOBI (cPanel / VPS) — `api/tools/setup.cjs`.

  Nima uchun: cPanel SSH terminalida ilova muhit o'zgaruvchilari YO'Q,
  `npm run db:deploy` / `db:seed` / `catalog:import` esa ularsiz
  ishlamaydi. Bu asbob bitta `api/.env` yaratadi (rejim 600, faqat egasi
  o'qiydi): API ham, buyruqlar ham shu fayldan o'qiydi. Fayl ilova
  katalogida turadi va VEB'GA BERILMAYDI (Node ilovasi hujjat ildizi emas).

  Buyruqlar (api katalogida):

    npm run setup        savol-javob, `.env` yaratadi (mavjudini BOSMAYDI)
    npm run env:check    `.env` to'g'riligini tekshiradi
    npm run env:scrub    birinchi admin parolini `.env` dan O'CHIRADI

  Hech qanday sir repoda yoki to'plamda emas: tasodifiy sirlar SHU YERDA,
  serverning o'zida yaratiladi (`nodeCrypto.randomBytes`).
*/
'use strict';

const nodeCrypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');

const ENV_FILE = path.join(__dirname, '..', '.env');
const DEFAULT_DOMAIN = 'barff.uz';

const secret = () => nodeCrypto.randomBytes(48).toString('base64url');

/** Ko'zni adashtiradigan `0 O 1 l I` belgilarsiz parol. */
function password(length = 16) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  while (out.length < length) {
    for (const byte of nodeCrypto.randomBytes(length)) {
      if (byte < 256 - (256 % alphabet.length) && out.length < length) {
        out += alphabet[byte % alphabet.length];
      }
    }
  }
  return out;
}

function parseEnv(text) {
  const result = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq > 0) result[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return result;
}

function subdomain(domain, name) {
  return `https://${name}.${domain}`;
}

function buildEnv({ domain, databaseUrl, mediaRoot, adminEmail, adminName, adminPassword }) {
  const origins = [
    `https://${domain}`,
    subdomain(domain, 'admin'),
    subdomain(domain, 'partner'),
    subdomain(domain, 'delivery'),
  ].join(',');

  return [
    '# BARFF API — avtomatik yaratilgan (`npm run setup`). Bu fayl SIR saqlaydi:',
    '# repoga, chatga va e-pochtaga YUBORMANG. Rejim 600.',
    'NODE_ENV=production',
    `DATABASE_URL=${databaseUrl}`,
    `API_BASE_URL=${subdomain(domain, 'api')}`,
    `API_CORS_ORIGINS=${origins}`,
    "# 1 — to'g'ridan-to'g'ri; Cloudflare orqali bo'lsa 2",
    'API_TRUST_PROXY_HOPS=1',
    `JWT_ACCESS_SECRET=${secret()}`,
    `JWT_REFRESH_SECRET=${secret()}`,
    `COOKIE_DOMAIN=.${domain}`,
    'COOKIE_SECURE=true',
    `MEDIA_ROOT=${mediaRoot}`,
    `MEDIA_PUBLIC_URL=${subdomain(domain, 'api')}/api/v1/media`,
    `MEDIA_SIGNING_SECRET=${secret()}`,
    'SWAGGER_ENABLED=false',
    '',
    '# Birinchi administrator (`npm run db:seed`). Seeddan keyin: `npm run env:scrub`',
    `SEED_ADMIN_EMAIL=${adminEmail}`,
    `SEED_ADMIN_NAME=${adminName}`,
    `SEED_ADMIN_PASSWORD=${adminPassword}`,
    '',
  ].join('\n');
}

/** `.env` ni tekshiradi; muammolar ro'yxatini qaytaradi. */
function check(env, domain) {
  const problems = [];
  const need = (key) => {
    if (!env[key]) problems.push(`${key}: berilmagan`);
    return Boolean(env[key]);
  };

  if (need('DATABASE_URL') && !/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) {
    problems.push('DATABASE_URL: postgresql:// bilan boshlanishi kerak (MySQL emas)');
  }
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MEDIA_SIGNING_SECRET']) {
    if (need(key) && env[key].length < 32) problems.push(`${key}: kamida 32 belgi`);
  }
  if (env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    problems.push("JWT_ACCESS_SECRET va JWT_REFRESH_SECRET BIR XIL bo'lmasin");
  }
  if (env.NODE_ENV !== 'production') problems.push("NODE_ENV=production bo'lishi kerak");
  if (env.COOKIE_SECURE !== 'true') problems.push("COOKIE_SECURE=true bo'lishi kerak (https)");
  if (need('API_BASE_URL') && !env.API_BASE_URL.startsWith('https://')) {
    problems.push('API_BASE_URL: https:// bilan boshlanishi kerak');
  }
  if (need('MEDIA_PUBLIC_URL') && !/\/api\/v1\/media$/.test(env.MEDIA_PUBLIC_URL)) {
    problems.push('MEDIA_PUBLIC_URL: /api/v1/media bilan tugashi kerak (aks holda rasmlar 404)');
  }
  if (env.SWAGGER_ENABLED === 'true') problems.push("SWAGGER_ENABLED productionda false bo'lsin");
  if (env.REDIS_URL) problems.push("REDIS_URL: bu hostda Redis yo'q — o'chiring");

  const cors = (env.API_CORS_ORIGINS ?? '').split(',').map((s) => s.trim());
  for (const origin of [
    `https://${domain}`,
    subdomain(domain, 'admin'),
    subdomain(domain, 'partner'),
    subdomain(domain, 'delivery'),
  ]) {
    if (!cors.includes(origin))
      problems.push(`API_CORS_ORIGINS: ${origin} yo'q (kirish jim ishlamaydi)`);
  }
  if (cors.includes('*')) problems.push('API_CORS_ORIGINS: `*` taqiqlangan');

  if (env.MEDIA_ROOT) {
    try {
      fs.mkdirSync(env.MEDIA_ROOT, { recursive: true });
      fs.accessSync(env.MEDIA_ROOT, fs.constants.W_OK);
    } catch {
      problems.push(`MEDIA_ROOT: ${env.MEDIA_ROOT} ga yozib bo'lmaydi`);
    }
  }

  return problems;
}

/**
 * Savol berish.
 *
 * Terminalda (TTY) — oddiy savol-javob, parol ekranga chiqmaydi. Terminal
 * bo'lmasa (`printf ... | npm run setup`, testlar) javoblar oldindan
 * o'qib olingan QATORLAR navbatidan olinadi: `readline.question` bunda
 * tez kelgan qatorlarni yo'qotib yuboradi.
 */
function makeAsker() {
  if (process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (question, { hidden = false, fallback = '' } = {}) =>
      new Promise((resolve) => {
        const suffix = fallback !== '' ? ` [${fallback}]` : '';
        if (!hidden) {
          rl.question(`${question}${suffix}: `, (answer) => resolve(answer.trim() || fallback));
          return;
        }
        process.stdout.write(`${question}: `);
        const original = rl._writeToOutput;
        rl._writeToOutput = () => {};
        rl.question('', (answer) => {
          rl._writeToOutput = original;
          process.stdout.write('\n');
          resolve(answer);
        });
      });
    return { ask, close: () => rl.close() };
  }

  const lines = fs.readFileSync(0, 'utf8').split('\n');
  const ask = async (question, { fallback = '' } = {}) => {
    const answer = (lines.shift() ?? '').trim();
    process.stdout.write(`${question}: ${answer === '' ? fallback : '(kiritildi)'}\n`);
    return answer || fallback;
  };
  return { ask, close: () => {} };
}

async function setup(argv) {
  if (fs.existsSync(ENV_FILE) && !argv.includes('--force')) {
    console.error(
      `XATO: ${ENV_FILE} allaqachon bor. Ustidan yozish barcha sessiyalarni bekor qiladi ` +
        "(yangi JWT sirlari). Kerak bo'lsa --force bering.",
    );
    process.exit(1);
  }

  const flag = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const { ask, close } = makeAsker();
  const domain = flag('domain') ?? (await ask('Domen', { fallback: DEFAULT_DOMAIN }));

  console.log(
    "\ncPanel → PostgreSQL Databases bo'limidagi ma'lumotlar (nomlar odatda `cpuser_` bilan boshlanadi):",
  );
  const dbName = await ask('Baza nomi');
  const dbUser = await ask('Baza foydalanuvchisi');
  const dbPass = await ask("Baza paroli (ekranda ko'rinmaydi)", { hidden: true });
  const host = await ask('Baza serveri', { fallback: '127.0.0.1:5432' });
  const adminEmail = await ask('Birinchi administrator emaili');
  const adminName = await ask('Administrator ismi', { fallback: 'BARFF Administrator' });
  const defaultMedia = path.join(os.homedir(), 'barff', 'media');
  const mediaRoot = await ask('Rasmlar saqlanadigan papka', { fallback: defaultMedia });
  close();

  const adminPassword = password();
  const databaseUrl = `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPass)}@${host}/${encodeURIComponent(dbName)}`;

  const text = buildEnv({ domain, databaseUrl, mediaRoot, adminEmail, adminName, adminPassword });
  const problems = check(parseEnv(text), domain);
  if (problems.length > 0) {
    console.error('\nXATO:\n - ' + problems.join('\n - '));
    process.exit(1);
  }

  fs.writeFileSync(ENV_FILE, text, { mode: 0o600 });
  console.log(`\n✓ ${ENV_FILE} yaratildi (rejim 600).`);
  console.log("\nBirinchi administrator (BIR MARTA ko'rsatiladi — yozib oling):");
  console.log(`   email:  ${adminEmail}`);
  console.log(`   parol:  ${adminPassword}`);
  console.log('\nKeyingi qadamlar:');
  console.log('   npm run db:deploy');
  console.log('   npm run db:seed');
  console.log("   npm run env:scrub     # admin parolini .env dan o'chiradi");
  console.log('   (cPanel → Setup Node.js App → api → RESTART)');
}

function main() {
  const [command = 'setup', ...rest] = process.argv.slice(2);

  if (command === 'setup') return setup(rest);

  if (!fs.existsSync(ENV_FILE)) {
    console.error(`XATO: ${ENV_FILE} yo'q. Avval \`npm run setup\`.`);
    process.exit(1);
  }

  if (command === 'check') {
    const idx = rest.indexOf('--domain');
    const domain = idx >= 0 ? rest[idx + 1] : DEFAULT_DOMAIN;
    const problems = check(parseEnv(fs.readFileSync(ENV_FILE, 'utf8')), domain);
    if (problems.length === 0) {
      console.log("✓ .env to'g'ri.");
      return;
    }
    console.error('XATO:\n - ' + problems.join('\n - '));
    process.exit(1);
  }

  if (command === 'scrub') {
    const text = fs.readFileSync(ENV_FILE, 'utf8');
    const kept = text.split('\n').filter((line) => !line.startsWith('SEED_ADMIN_PASSWORD='));
    fs.writeFileSync(ENV_FILE, kept.join('\n'), { mode: 0o600 });
    console.log("✓ SEED_ADMIN_PASSWORD .env dan o'chirildi.");
    return;
  }

  console.error(`Noma'lum buyruq: ${command} (setup | check | scrub)`);
  process.exit(2);
}

module.exports = { buildEnv, check, parseEnv, password };

if (require.main === module) void main();
