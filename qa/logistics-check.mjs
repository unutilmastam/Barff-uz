/**
 * S34 — admin logistika ekranlarini HAQIQIY brauzerda tekshirish.
 *
 * Kod o'qish yetarli emas: sahifa mijozda ishlaydi, ma'lumot API'dan
 * keladi va xatolar faqat ishga tushganda ko'rinadi.
 */
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const APP = 'http://localhost:3002';
const OUT = process.env.OUT;
const EMAIL = process.env.ADMIN_EMAIL;
const PASS = process.env.ADMIN_PASSWORD;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/api/')) {
    problems.push(`${r.status()} ${r.url()}`);
  }
});

await page.goto(`${APP}/login`, { waitUntil: 'networkidle' });
await page.getByLabel('Email').fill(EMAIL);
await page.getByLabel('Parol').fill(PASS);
await page.getByRole('button', { name: 'Kirish' }).click();
await page.waitForURL(`${APP}/`, { timeout: 20000 });
console.log('kirdi');

// Menyuda Logistika guruhi bormi.
const nav = await page.getByRole('link', { name: 'Yetkazish' }).count();
const navFleet = await page.getByRole('link', { name: 'Park' }).count();
console.log(`menyu: Yetkazish=${nav} Park=${navFleet}`);

await page.getByRole('link', { name: 'Yetkazish' }).first().click();
await page.waitForURL(`${APP}/logistics`, { timeout: 20000 });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/1-taxta.png`, fullPage: true });
console.log('1-taxta');

const rows = await page.locator('table tbody tr').count();
console.log(`taxtada qator: ${rows}`);

// Yetkazma tafsiloti.
const first = page.locator('table tbody tr a').first();
if ((await first.count()) > 0) {
  await first.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/2-tafsilot.png`, fullPage: true });
  console.log('2-tafsilot');
}

// Park.
await page.goto(`${APP}/logistics/fleet`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/3-park-haydovchilar.png`, fullPage: true });
console.log('3-park-haydovchilar');

const driverRows = await page.locator('table tbody tr').count();
console.log(`haydovchi qatori: ${driverRows}`);

// Mashina qo'shish — HAQIQIY yozuv yaratiladi va o'chirilmaydi
// (park yozuvlari o'chirilmaydi, faolsiz qilinadi).
await page.getByRole('tab', { name: 'Mashinalar' }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/4-park-mashinalar.png`, fullPage: true });
console.log('4-park-mashinalar');

await page.getByRole('button', { name: 'Mashina qo‘shish' }).click();
await page.waitForTimeout(500);
const plate = `01Q${String(Date.now()).slice(-6)}`;
await page.getByLabel('Davlat raqami').fill(plate);
await page.getByLabel('Model').fill('Isuzu NPR (MOCK)');
await page.getByLabel('Sig‘im (kg)').fill('3000');
await page.screenshot({ path: `${OUT}/5-mashina-oynasi.png` });
console.log('5-mashina-oynasi');

await page.getByRole('button', { name: 'Saqlash' }).click();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/6-mashina-qoshildi.png`, fullPage: true });
const added = await page.getByText(plate).count();
console.log(`mashina qoshildi (${plate}): ${added > 0}`);

// Haydovchi profili oynasi — nomzod yo'q bo'lsa SABAB ko'rinishi kerak.
await page.getByRole('tab', { name: 'Haydovchilar' }).click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: 'Haydovchi profili' }).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/7-haydovchi-oynasi.png` });
console.log('7-haydovchi-oynasi');

// ---------------------------------------------------------------- marshrutlar
await page.goto(`${APP}/logistics/routes`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/9-marshrutlar-bosh.png`, fullPage: true });
console.log('9-marshrutlar-bosh');

const code = `QA${String(Date.now()).slice(-6)}`;
await page.getByRole('button', { name: 'Marshrut yaratish' }).click();
await page.waitForTimeout(500);
await page.getByLabel('Kod').fill(code);
await page.getByLabel('Nomi').fill('QA yo‘nalishi (MOCK)');
await page.getByRole('button', { name: 'Saqlash' }).click();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/10-marshrut-yaratildi.png`, fullPage: true });
console.log(`marshrut yaratildi (${code}): ${(await page.getByText(code).count()) > 0}`);

/*
  MARSHRUT BIRIKTIRMAYDI — BU EKRANDA HAM.

  Yetkazma qo'shilgandan keyin u "Biriktirilmagan" bo'lib
  qolishi kerak; aks holda ikkita haydovchi manbasi paydo
  bo'lardi (`docs/DELIVERY-POLICY.md` §6).
*/
const addButton = page.getByRole('button', { name: 'Yetkazma qo‘shish' }).first();
if ((await addButton.count()) > 0) {
  await addButton.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/11-yetkazma-qoshish.png` });

  const rows = page.locator('[role="dialog"] li');
  const count = await rows.count();
  console.log(`nomzod yetkazma: ${count}`);

  if (count > 0) {
    /*
      DA'VO: QO'SHISH HAYDOVCHINI O'ZGARTIRMAYDI.

      "Biriktirilmagan" so'zini qidirish YETARLI EMAS edi va bu
      tekshiruv birinchi yurishda YOLG'ON XATO berdi: nomzod
      allaqachon biriktirilgan yetkazma edi, ya'ni qatorda
      haydovchi ismi turishi TO'G'RI. Shuning uchun OLDIN va
      KEYIN solishtiriladi.
    */
    const label = (await rows.first().innerText()).split('\n')[0] ?? '';
    const number = label.split(' —')[0]?.trim() ?? '';

    await page.getByRole('button', { name: 'Bekor qilish' }).click();
    await page.waitForTimeout(500);

    await page.goto(`${APP}/logistics?search=${number}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const before = await page.locator('table tbody tr').first().innerText();

    await page.goto(`${APP}/logistics/routes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Yetkazma qo‘shish' }).first().click();
    await page.waitForTimeout(1500);
    await page.locator('[role="dialog"] [role="checkbox"]').first().click();
    await page.getByRole('button', { name: /tasini qo‘shish/ }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/12-marshrutda-yetkazma.png`, fullPage: true });

    const attached = (await page.getByText(number).count()) > 0;
    console.log(`${number} marshrutda: ${attached}`);
    if (!attached) problems.push(`${number} marshrutga qo‘shilmadi`);

    await page.goto(`${APP}/logistics?search=${number}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const after = await page.locator('table tbody tr').first().innerText();

    const same = before === after;
    console.log(`qoshilgandan keyin qator OZGARMADI: ${same}`);
    if (!same)
      problems.push(`marshrutga qo‘shish yetkazmani o‘zgartirdi:\n${before}\n---\n${after}`);
  } else {
    await page.getByRole('button', { name: 'Bekor qilish' }).click();
  }
}

/*
  QULAYLIK — IKKI EKRAN.

  Ommaviy sayt sweep'i (`a11y-axe.mjs`) admin panelga kirmaydi:
  u login orqasida. Yangi ekranlar shu yerda tekshiriladi.
*/
for (const [name, url] of [
  ['taxta', `${APP}/logistics`],
  ['park', `${APP}/logistics/fleet`],
  ['marshrutlar', `${APP}/logistics/routes`],
]) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  console.log(`axe ${name}: ${violations.length} buzilish`);
  for (const v of violations) {
    problems.push(`axe ${name}: ${v.id} — ${v.nodes.length} ta (${v.help})`);
  }
}

// Bir sahifada BITTA `aria-current="page"` bo'lishi kerak.
const currentCount = await page.locator('nav [aria-current="page"]').count();
console.log(`aria-current="page": ${currentCount}`);
if (currentCount !== 1) problems.push(`aria-current="page" ${currentCount} ta`);

/*
  TELEFON — GORIZONTAL SKROLL BO'LMASIN.

  Jadval o'zi skroll bo'ladi, lekin SAHIFA emas: butun sahifa
  siljisa, sarlavha va tugmalar ekrandan chiqib ketadi.
*/
const phone = await browser.newContext({
  viewport: { width: 393, height: 851 },
  isMobile: true,
  hasTouch: true,
});
const phonePage = await phone.newPage();
await phonePage.context().addCookies(await ctx.cookies());

for (const [name, url] of [
  ['taxta', `${APP}/logistics`],
  ['park', `${APP}/logistics/fleet`],
  ['marshrutlar', `${APP}/logistics/routes`],
]) {
  await phonePage.goto(url, { waitUntil: 'networkidle' });
  await phonePage.waitForTimeout(1000);
  const overflow = await phonePage.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  console.log(`telefon ${name}: gorizontal ortiqcha ${overflow}px`);
  if (overflow > 1) problems.push(`telefon ${name}: ${overflow}px gorizontal skroll`);
  await phonePage.screenshot({ path: `${OUT}/8-telefon-${name}.png`, fullPage: true });
}

console.log(problems.length === 0 ? 'XATO YO‘Q' : `XATOLAR:\n${problems.join('\n')}`);
process.exitCode = problems.length === 0 ? 0 : 1;
await browser.close();
