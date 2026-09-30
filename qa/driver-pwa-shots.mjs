import { chromium } from 'playwright';

const APP = 'http://localhost:3004';
const OUT = process.env.OUT;
const EMAIL = process.env.DRIVER_EMAIL;
const PASS = process.env.DRIVER_PASSWORD;
const ID = process.env.DELIVERY_ID;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--no-sandbox'],
});

/** Telefon: o'rtacha Android. */
const ctx = await browser.newContext({
  viewport: { width: 393, height: 851 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

await page.goto(`${APP}/login`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/1-kirish.png` });
console.log('1-kirish');

await page.locator('#email').fill(EMAIL);
await page.locator('#password').fill(PASS);
await page.getByRole('button', { name: 'Kirish' }).click();
await page.waitForURL(`${APP}/`, { timeout: 15000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/2-bugungi-ish.png` });
console.log('2-bugungi-ish');

await page.goto(`${APP}/${ID}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/3-yetkazma.png`, fullPage: true });
console.log('3-yetkazma');

// OFLAYN
await ctx.setOffline(true);
await page.getByRole('button', { name: 'Olindi' }).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/4-oflayn-navbat.png`, fullPage: true });
console.log('4-oflayn-navbat');

// Aloqa tiklandi
await ctx.setOffline(false);
await page.evaluate(() => window.dispatchEvent(new Event('online')));
await page.waitForTimeout(4000);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/5-sinxronlandi.png`, fullPage: true });
console.log('5-sinxronlandi');

// "Yetkaza olmadim" — sabab SHART
await page.getByRole('button', { name: 'Yetkaza olmadim' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/6-bajarilmadi.png`, fullPage: true });
console.log('6-bajarilmadi');

await browser.close();
