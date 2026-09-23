#!/usr/bin/env node
/**
 * Tarjima qilinmagan matnni qidiradi (CLAUDE.md §18).
 *
 * NEGA skript, ESLint qoidasi emas: JSX ichidagi matnni ishonchli
 * ajratish uchun AST kerak, tayyor qoidalar esa har bir `className` va
 * texnik satrni ham matn deb hisoblab, foydasiz shovqin beradi. Bu
 * skript esa ANIQ bitta narsani qidiradi — JSX ichidagi ko'rinadigan
 * matn — va topilganini bitta ro'yxat bilan ko'rsatadi.
 *
 * Qoida: foydalanuvchi ko'radigan har bir satr `messages` dan kelishi
 * kerak. Istisno kerak bo'lsa, o'sha qatorga yoki undan oldingi qatorga
 * `i18n-exempt` izohi qo'yiladi — ya'ni istisno KO'RINIB turadi.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../src', import.meta.url).pathname;

/** Tarjima talab qilmaydigan satrlar: brend, raqam, belgilar. */
const ALLOWED = new Set(['BARFF', '404', '*', '—', '←', '→', '/', '·', ':', '…']);

/**
 * Bu fayllardagi matn foydalanuvchiga ko'rinmaydi yoki manba tarjima:
 *   - `i18n/` — tarjimalarning o'zi;
 *   - testlar;
 *   - `dev/` va `*.dev.tsx` — production bundle'iga tushmaydi.
 */
const SKIP = [/\/i18n\//, /\.test\.tsx?$/, /\.dev\.tsx$/, /\/dev\//];

const EXEMPT = /i18n-exempt/;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx$/.test(full)) out.push(full);
  }
  return out;
}

/**
 * Izohlardagi matnni o'chiradi, LEKIN qatorlar sonini saqlaydi.
 *
 * Qatorlar surilib ketsa, xabardagi qator raqami noto'g'ri bo'lardi —
 * shuning uchun izoh matni bo'sh joyga almashtiriladi, o'chirilmaydi.
 */
function stripComments(source) {
  let result = '';
  let inBlock = false;

  for (const line of source.split('\n')) {
    let out = '';
    let index = 0;

    while (index < line.length) {
      if (inBlock) {
        const end = line.indexOf('*/', index);
        if (end === -1) {
          index = line.length;
        } else {
          inBlock = false;
          index = end + 2;
        }
        continue;
      }

      const block = line.indexOf('/*', index);
      const lineComment = line.indexOf('//', index);

      if (block !== -1 && (lineComment === -1 || block < lineComment)) {
        out += line.slice(index, block);
        inBlock = true;
        index = block + 2;
      } else if (lineComment !== -1) {
        out += line.slice(index, lineComment);
        index = line.length;
      } else {
        out += line.slice(index);
        index = line.length;
      }
    }

    result += `${out}\n`;
  }

  return result;
}

const findings = [];

for (const file of walk(ROOT)) {
  if (SKIP.some((pattern) => pattern.test(file))) continue;

  const raw = readFileSync(file, 'utf8');
  const rawLines = raw.split('\n');
  const lines = stripComments(raw).split('\n');

  lines.forEach((line, index) => {
    // Istisno o'sha qatorda yoki undan oldingi qatorda belgilanadi.
    if (EXEMPT.test(rawLines[index] ?? '') || EXEMPT.test(rawLines[index - 1] ?? '')) return;

    for (const match of line.matchAll(/>([^<>{}\n]+)</g)) {
      const value = match[1].trim();
      if (value.length === 0 || ALLOWED.has(value)) continue;
      // Kamida ikkita harf — raqam va belgilar tarjima talab qilmaydi.
      if (!/\p{L}{2,}/u.test(value)) continue;

      findings.push(`${relative(ROOT, file)}:${index + 1}  ${value.slice(0, 60)}`);
    }
  });
}

if (findings.length > 0) {
  console.error(`Tarjima qilinmagan matn topildi (${findings.length} ta):\n`);
  for (const item of findings) console.error(`  ${item}`);
  console.error("\nHar bir foydalanuvchi ko'radigan satr `messages` dan kelishi kerak.");
  console.error("Ataylab tarjima qilinmasa, qatorga `i18n-exempt` izohini qo'ying.");
  process.exit(1);
}

console.log('Tarjima qilinmagan matn topilmadi.');
