/*
  S37 — HISOBOTLAR BRAUZERDA VA HAQIQIY XLSX O'QUVCHI BILAN.

  Nega bu skript, `reports.e2e-spec.ts` bor bo'lsa:

  1. XLSX'ni sinovda MEN YOZGAN zip o'quvchi bilan ochdim. Yozuvchi va
     o'quvchi bir xil xatoga ega bo'lishi mumkin. Bu yerda fayl
     `openpyxl` — mustaqil, keng tarqalgan o'quvchi — bilan ochiladi.
  2. Ekran: filtrlar hisobotga qarab chiqishi, qisqartirish xabari,
     yuklab olish.

  Tayyorgarlik: `openpyxl` (`pip install openpyxl`), servislar ishlab
  turishi va `ADMIN_PASSWORD`.
*/
import AxeBuilder from '@axe-core/playwright';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:3002';
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const OUT = process.env.OUT;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@barff.uz';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (ADMIN_PASSWORD === undefined) {
  console.error('XATO: `ADMIN_PASSWORD` shart (CLAUDE.md §12).');
  process.exit(2);
}

const path = process.env.CHROMIUM_PATH;
const browser = await chromium.launch({
  ...(path ? { executablePath: path } : {}),
  args: ['--no-sandbox'],
});

let failures = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? ' OK ' : 'XATO'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures += 1;
};

const problems = [];
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/api/')) problems.push(`${r.status()} ${r.url()}`);
});

await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' });
await page.getByLabel('Email').fill(ADMIN_EMAIL);
await page.getByLabel('Parol').fill(ADMIN_PASSWORD);
await page.getByRole('button', { name: 'Kirish' }).click();
await page.waitForURL(`${ADMIN}/`, { timeout: 20000 });
check(true, 'admin panelga kirdi');

// ---------------------------------------------------------------- ro'yxat
await page.goto(`${ADMIN}/reports`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/1-hisobotlar.png`, fullPage: true });

const cards = await page.locator('main ul li a').count();
check(cards === 10, 'ro‘yxatda 10 ta hisobot bor', String(cards));
check((await page.locator('nav [aria-current="page"]').count()) === 1, 'menyuda BITTA faol bo‘lim');

// ---------------------------------------------------------------- filtrlar hisobotga qarab
await page.goto(`${ADMIN}/reports/stock`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
check((await page.getByLabel('Dan').count()) === 0, 'qoldiq hisobotida SANA filtri YO‘Q');
check((await page.getByLabel('Diler').count()) === 0, 'qoldiq hisobotida DILER filtri YO‘Q');
check((await page.getByLabel('Hudud').count()) === 1, 'qoldiq hisobotida HUDUD filtri bor');
await page.screenshot({ path: `${OUT}/2-qoldiqlar.png`, fullPage: true });

await page.goto(`${ADMIN}/reports/sales`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
check((await page.getByLabel('Dan').count()) === 1, 'sotuv hisobotida sana filtri bor');
check((await page.getByLabel('Mahsulot').count()) === 0, 'sotuv hisobotida MAHSULOT filtri YO‘Q');
await page.screenshot({ path: `${OUT}/3-sotuv.png`, fullPage: true });

// Noto'g'ri oraliq — so'rov yuborilmaydi va sabab ko'rinadi.
await page.getByLabel('Dan').fill('2031-03-12');
await page.getByLabel('Gacha').fill('2031-03-10');
await page.waitForTimeout(500);
check(
  (await page.getByText(/«Dan» sanasi «gacha» dan keyin/).count()) > 0,
  'noto‘g‘ri sana oralig‘i SABAB bilan ko‘rsatildi',
);
await page.getByRole('button', { name: 'Filtrlarni tozalash' }).click();

// ---------------------------------------------------------------- XLSX — HAQIQIY O'QUVCHI
const dir = mkdtempSync(join(tmpdir(), 'barff-xlsx-'));

async function fetchBoth(key, query = '') {
  const jsonRes = await page.request.get(`${API}/reports/${key}?limit=5000${query}`);
  const xlsxRes = await page.request.get(
    `${API}/reports/${key}/export.xlsx?${query.replace(/^&/, '')}`,
  );
  const csvRes = await page.request.get(
    `${API}/reports/${key}/export.csv?${query.replace(/^&/, '')}`,
  );

  return {
    json: await jsonRes.json(),
    xlsx: await xlsxRes.body(),
    xlsxStatus: xlsxRes.status(),
    csv: await csvRes.text(),
  };
}

function readWithOpenpyxl(file) {
  const script = `
import json, sys
import openpyxl
wb = openpyxl.load_workbook(sys.argv[1], data_only=False)
ws = wb.active
rows = [[c.value for c in row] for row in ws.iter_rows()]
print(json.dumps({"title": ws.title, "rows": rows, "freeze": ws.freeze_panes}))
`;
  const run = spawnSync('python3', ['-c', script, file], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(run.stderr.trim().split('\n').pop());

  return JSON.parse(run.stdout);
}

for (const key of [
  'sales',
  'orders',
  'dealer-performance',
  'product-sales',
  'regional-sales',
  'stock',
  'deliveries',
  'driver-performance',
  'lead-conversion',
]) {
  const { json, xlsx, xlsxStatus, csv } = await fetchBoth(key);
  if (xlsxStatus !== 200) {
    check(false, `${key}: XLSX olindi`, String(xlsxStatus));
    continue;
  }

  const file = join(dir, `${key}.xlsx`);
  writeFileSync(file, xlsx);

  let sheet;
  try {
    sheet = readWithOpenpyxl(file);
  } catch (error) {
    check(false, `${key}: openpyxl OCHA OLMADI`, String(error).slice(0, 120));
    continue;
  }

  const [header, ...body] = sheet.rows;
  const keys = json.columns.map((c) => c.key);

  const sameRows =
    body.length === json.rows.length &&
    body.every((row, i) => keys.every((k, j) => (row[j] ?? null) === (json.rows[i][k] ?? null)));

  const csvLines = csv.replace('﻿', '').trim().split('\r\n');

  check(
    sameRows && header.length === json.columns.length,
    `${key}: openpyxl ochdi, ${body.length} qator JSON ga TENG`,
    `CSV ${csvLines.length - 1} qator`,
  );
  check(csvLines.length - 1 === json.rows.length, `${key}: CSV qatorlari JSON ga teng`);
}

// ---------------------------------------------------------------- yuklab olish tugmasi
await page.goto(`${ADMIN}/reports/sales`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 15000 }),
  page.getByRole('button', { name: 'XLSX' }).click(),
]);
check(
  download.suggestedFilename() === 'sales.xlsx',
  'XLSX tugmasi fayl yukladi',
  download.suggestedFilename(),
);

// ---------------------------------------------------------------- qulaylik
for (const [name, url] of [
  ['ro‘yxat', `${ADMIN}/reports`],
  ['sotuv', `${ADMIN}/reports/sales`],
  ['qoldiqlar', `${ADMIN}/reports/stock`],
  ['harakatlar', `${ADMIN}/reports/stock-movements`],
]) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  console.log(`axe ${name}: ${violations.length} buzilish`);
  for (const v of violations) problems.push(`axe ${name}: ${v.id} — ${v.help}`);
}

// Telefon: jadval o'zi skroll bo'ladi, SAHIFA emas.
const phone = await browser.newContext({ viewport: { width: 393, height: 851 }, isMobile: true });
await phone.addCookies(await ctx.cookies());
const small = await phone.newPage();
for (const key of ['sales', 'dealer-performance']) {
  await small.goto(`${ADMIN}/reports/${key}`, { waitUntil: 'networkidle' });
  await small.waitForTimeout(1200);
  const overflow = await small.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  console.log(`telefon ${key}: gorizontal ortiqcha ${overflow}px`);
  if (overflow > 1) problems.push(`telefon ${key}: ${overflow}px gorizontal skroll`);
  await small.screenshot({ path: `${OUT}/telefon-${key}.png`, fullPage: true });
}

console.log(problems.length === 0 ? '\nXATO YO‘Q' : `\nXATOLAR:\n${problems.join('\n')}`);
if (problems.length > 0) failures += 1;

await browser.close();
console.log(`\nNATIJA: ${failures === 0 ? 'HAMMASI OK' : failures + ' ta muammo'}`);
process.exit(failures === 0 ? 0 : 1);
