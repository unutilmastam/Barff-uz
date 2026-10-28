#!/usr/bin/env node
/*
  BITTA BUYRUQ: tekshirish -> qurish -> paketlash.

    cp release.env.example release.env     # va qiymatlarni to'ldiring
    pnpm release:cpanel

  Nega bu kerak: `pnpm build` ni o'z `.env` (lokal) qiymatlari bilan
  yurgizsangiz, `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000` bundle
  ichiga yoziladi va sayt serverda ishlamaydi. Bu skript qiymatlarni
  `release.env` dan oladi, tekshiradi va quradi; lokal `.env` ta'sir qilmaydi.

  `release.env` repoga KIRMAYDI (`.gitignore`) va unda SIR bo'lmaydi: bu
  faqat ochiq manzillar. Sirlar (JWT, baza paroli) cPanel'da kiritiladi.
*/
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnvFile, validateReleaseEnv } from './release-env.mjs';

const root = resolve(import.meta.dirname, '..');
const file = resolve(root, process.argv[2] ?? 'release.env');

if (!existsSync(file)) {
  console.error(`XATO: ${file} topilmadi.\n  cp release.env.example release.env  va to'ldiring.`);
  process.exit(2);
}

const values = parseEnvFile(readFileSync(file, 'utf8'));
const problems = validateReleaseEnv(values);

if (problems.length > 0) {
  console.error("Chiqarish sozlamalari noto'g'ri:");
  for (const item of problems) console.error(`  - ${item}`);
  process.exit(2);
}

console.log("Sozlamalar to'g'ri:");
for (const [key, value] of Object.entries(values)) {
  if (key.startsWith('NEXT_PUBLIC_')) console.log(`  ${key}=${value}`);
}

// Lokal `.env` ni yuklamaslik uchun faqat kerakli o'zgaruvchilar beriladi.
const env = {
  ...process.env,
  ...Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith('NEXT_PUBLIC_'))),
  NODE_ENV: 'production',
};

for (const [label, args] of [
  ['qurish', ['build']],
  ['paketlash', ['package:cpanel']],
]) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync('pnpm', args, { cwd: root, env, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`XATO: ${label} muvaffaqiyatsiz.`);
    process.exit(result.status ?? 1);
  }
}
