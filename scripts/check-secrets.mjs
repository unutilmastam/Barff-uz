#!/usr/bin/env node
/*
  Sir skaneri (CLAUDE.md §12, S41): repoga KALIT, TOKEN yoki PAROL tushib
  qolmaganini tekshiradi.

    node scripts/check-secrets.mjs            # hozirgi (kuzatiladigan) fayllar
    node scripts/check-secrets.mjs --history  # butun git tarixi ham

  Topilsa chiqish kodi 1. Topilgan QIYMAT chiqishga YOZILMAYDI (faqat
  fayl, qator va qoida nomi) — skaner o'zi sirni log'ga sochmasligi kerak.

  Bu to'liq vosita (gitleaks) o'rnini bosmaydi, lekin tashqi bog'liqliksiz
  CI'da ishlaydi va eng keng tarqalgan xatolarni ushlaydi.
*/
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

/**
 * Qoidalar. Har biri ANIQ shaklni qidiradi (umumiy "parol=" emas) —
 * soxta ogohlantirish ko'p bo'lsa odamlar skanerga ishonmay qo'yadi.
 */
export const RULES = [
  {
    name: 'maxfiy kalit (PEM)',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/,
  },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'AWS secret', pattern: /aws_secret_access_key\s*[=:]\s*['"]?[A-Za-z0-9/+=]{30,}/i },
  {
    name: 'GitHub token',
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/,
  },
  { name: 'Slack token', pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'Telegram bot token', pattern: /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/ },
  { name: 'Stripe/boshqa sk_live kalit', pattern: /\bsk_live_[A-Za-z0-9]{16,}\b/ },
  {
    name: 'JWT',
    pattern: /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  {
    // Parol bilan ulanish satri. `${...}`, `$VAR`, placeholder va ma'lum lokal qiymat istisno.
    name: 'bazaga parol bilan ulanish satri',
    pattern:
      /\bpostgres(?:ql)?:\/\/[^:\s/@]+:(?![^@\s]*(?:\$\{|\$[A-Z_]|PAROL|PASSWORD|password|CHANGE|<|\*\*\*|barff_local_dev|example))[^@\s]{6,}@/,
  },
];

/**
 * Qasddan ruxsat etilganlar. Har biri sababi bilan: ro'yxat jimgina
 * o'smasligi uchun.
 */
export const ALLOW_PATHS = [
  // Test namunalari: ataylab soxta JWT/xesh bilan "yashirilishi kerak" tekshiriladi.
  /(^|\/)[^/]*\.(test|e2e-spec)\.(ts|tsx|mjs)$/,
  // Skanerning o'zi qoidalarni matn sifatida saqlaydi.
  /^scripts\/check-secrets\.mjs$/,
];

export function scanText(text, path = '') {
  if (ALLOW_PATHS.some((re) => re.test(path))) return [];

  const found = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i += 1) {
    for (const rule of RULES) {
      if (rule.pattern.test(lines[i])) found.push({ rule: rule.name, line: i + 1 });
    }
  }

  return found;
}

/** Repoda bo'lmasligi kerak bo'lgan FAYL nomlari. */
export const FORBIDDEN_FILES = [
  /(^|\/)\.env(\.(?!example$)[\w.-]+)?$/,
  /\.(pem|p12|pfx|key|jks)$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/,
];

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0')
    .filter(Boolean);
}

function scanWorkingTree() {
  const problems = [];

  for (const file of trackedFiles()) {
    if (FORBIDDEN_FILES.some((re) => re.test(file))) {
      problems.push(`${file}: repoda bo'lmasligi kerak bo'lgan fayl turi`);
      continue;
    }

    let text;
    try {
      const buffer = readFileSync(file);
      // Ikkilik fayl (rasm, shrift): NUL bayt bor.
      if (buffer.includes(0)) continue;
      text = buffer.toString('utf8');
    } catch {
      continue;
    }

    for (const hit of scanText(text, file)) problems.push(`${file}:${hit.line}: ${hit.rule}`);
  }

  return problems;
}

async function scanHistory() {
  const problems = [];
  const child = spawn('git', ['log', '--all', '-p', '-U0', '--no-color', '--format=@@COMMIT %h'], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  let commit = '';
  let file = '';
  const seen = new Set();

  for await (const line of createInterface({ input: child.stdout, crlfDelay: Infinity })) {
    if (line.startsWith('@@COMMIT ')) commit = line.slice(9);
    else if (line.startsWith('+++ b/')) file = line.slice(6);
    else if (line.startsWith('+') && !line.startsWith('+++')) {
      for (const hit of scanText(line.slice(1), file)) {
        const key = `${commit}:${file}:${hit.rule}`;
        if (!seen.has(key)) {
          seen.add(key);
          problems.push(`${commit} ${file}: ${hit.rule}`);
        }
      }
    }
  }

  return problems;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const problems = scanWorkingTree();
  if (process.argv.includes('--history')) problems.push(...(await scanHistory()));

  if (problems.length > 0) {
    console.error(`SIR SKANERI: ${problems.length} ta topilma (qiymat ko'rsatilmaydi):`);
    for (const item of problems) console.error(`  ${item}`);
    process.exit(1);
  }

  console.log(
    `Sir skaneri: toza (${trackedFiles().length} ta fayl${process.argv.includes('--history') ? ', butun tarix' : ''}).`,
  );
}
