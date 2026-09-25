/*
  S33 — HAYDOVCHI PWA BRAUZERDA.

  ==========================================================
  ASOSIY DA'VO (S33 DoD)
  ==========================================================

  "Aloqa uzilgandan keyin navbatdagi amal AYNAN BIR MARTA
  yuboriladi."

  Buni faqat kodga qarab tasdiqlab bo'lmaydi. Shuning uchun sinov
  brauzerni HAQIQATAN oflayn qiladi (`context.setOffline`), tugma
  bosadi, keyin aloqani tiklaydi va SERVERDAGI hodisalar sonini
  sanaydi.

  Ikkinchi tekshiruv — telefonga mos ekan: tugmalar 44px dan
  katta, gorizontal skroll yo'q, PWA fayllari joyida.
*/
import { chromium } from 'playwright';

const APP = process.env.DELIVERY_URL ?? 'http://localhost:3004';
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const path = process.env.CHROMIUM_PATH;

const DRIVER_EMAIL = process.env.DRIVER_EMAIL;
const DRIVER_PASSWORD = process.env.DRIVER_PASSWORD;
const DELIVERY_ID = process.env.DELIVERY_ID;

if (DRIVER_EMAIL === undefined || DELIVERY_ID === undefined) {
  console.log('DRIVER_EMAIL, DRIVER_PASSWORD va DELIVERY_ID kerak.');
  process.exit(2);
}

const browser = await chromium.launch({
  ...(path ? { executablePath: path } : {}),
  args: ['--no-sandbox'],
});

let failures = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? ' OK ' : 'XATO'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures += 1;
};

/*
  KONSOL XATOLARI — TARMOQNI O'ZIMIZ UZGANIMIZ HISOBGA OLINADI.

  Sinov ataylab oflayn qiladi, ya'ni `ERR_INTERNET_DISCONNECTED`
  KUTILGAN natija — nosozlik emas. Uni sanash sinovni doim qizil
  qilardi va haqiqiy xatolarni ko'mib yuborardi.

  Boshqa HAR QANDAY xato sanaladi.
*/
const EXPECTED_OFFLINE =
  /ERR_INTERNET_DISCONNECTED|Failed to fetch|NetworkError|ERR_NETWORK_CHANGED/i;
const errors = [];
const record = (text) => {
  if (!EXPECTED_OFFLINE.test(text)) errors.push(text);
};

/** Telefon: o'rtacha Android o'lchami. */
const ctx = await browser.newContext({
  viewport: { width: 393, height: 851 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
page.on('console', (m) => m.type() === 'error' && record(m.text()));
page.on('pageerror', (e) => record(e.message));

console.log('=== PWA fayllari ===');
for (const asset of ['/sw.js', '/icon-192.png', '/manifest.webmanifest']) {
  const response = await page.request.get(`${APP}${asset}`);
  check(response.ok(), `${asset} mavjud`, String(response.status()));
}

const manifest = await (await page.request.get(`${APP}/manifest.webmanifest`)).json();
check(manifest.display === 'standalone', 'manifest `standalone`', manifest.display);
check(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'ikonkalar ro‘yxati bor');

console.log('\n=== Kirish ===');
await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
await page.locator('#email').fill(DRIVER_EMAIL);
await page.locator('#password').fill(DRIVER_PASSWORD ?? '');
await page.getByRole('button', { name: 'Kirish' }).click();
await page.waitForURL(`${APP}/`, { timeout: 15000 });
check(true, 'haydovchi kirdi');

console.log('\n=== Bugungi ish ===');
await page.waitForTimeout(1500);

const jobLink = page.getByRole('link', { name: /DLV-/ });
const jobCount = await jobLink.count();
check(jobCount > 0, 'yetkazma ro‘yxatda ko‘rindi', `${jobCount} ta`);

/** Telefon uchun: bosiladigan maydonlar kamida 44px. */
const smallTargets = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('a, button, input, textarea')];

  return nodes
    .filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.height < 44;
    })
    .map((node) => `${node.tagName}: ${(node.textContent ?? '').trim().slice(0, 30)}`);
});
check(smallTargets.length === 0, 'bosiladigan maydonlar 44px dan katta', smallTargets.join(' | '));

const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
);
check(!overflow, 'gorizontal skroll YO‘Q');

console.log('\n=== Yetkazma tafsiloti ===');
await page.goto(`${APP}/${DELIVERY_ID}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

check((await page.getByRole('link', { name: /qo‘ng‘iroq/ }).count()) > 0, 'qo‘ng‘iroq tugmasi bor');
check(
  (await page.getByRole('link', { name: 'Xaritada ochish' }).count()) > 0,
  'xarita havolasi bor (tashqi navigatorga)',
);

const mapHref = await page.getByRole('link', { name: 'Xaritada ochish' }).getAttribute('href');
check((mapHref ?? '').startsWith('geo:'), 'xarita TASHQI ilovaga topshiriladi', mapHref ?? '');

// =====================================================================
// ASOSIY: OFLAYN -> NAVBAT -> AYNAN BIR MARTA
// =====================================================================
console.log('\n=== OFLAYN: amal navbatga tushadi ===');

/** Serverdagi hodisalar soni — HAQIQATNI shu ko'rsatadi. */
async function eventCount(status) {
  const api = await browser.newContext();
  const login = await api.request.post(`${API}/auth/login`, {
    data: { email: DRIVER_EMAIL, password: DRIVER_PASSWORD },
  });
  const token = (await login.json()).accessToken;

  const detail = await api.request.get(`${API}/delivery/my/${DELIVERY_ID}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await detail.json();
  await api.close();

  return (body.events ?? []).filter((e) => e.toStatus === status).length;
}

const before = await eventCount('PICKED_UP');
check(before === 0, 'boshlanishda `PICKED_UP` hodisasi yo‘q', String(before));

// ALOQANI UZAMIZ.
await ctx.setOffline(true);

const pickedUp = page.getByRole('button', { name: 'Olindi' });
check((await pickedUp.count()) > 0, 'oflayn holatda ham tugma bosiladigan');

await pickedUp.click();
await page.waitForTimeout(1200);

/*
  EKRAN DARHOL JAVOB BERADI.

  Bu muhim: "yuklanmoqda" aylanasi bilan turib qolgan ekran
  haydovchini tugmani qayta-qayta bosishga undardi.
*/
check((await page.getByText(/navbatda/i).count()) > 0, 'amal NAVBATDA deb ko‘rsatildi');

const offlineEvents = await eventCount('PICKED_UP');
check(offlineEvents === 0, 'oflayn holatda serverga HECH NARSA ketmadi', String(offlineEvents));

console.log('\n=== ALOQA TIKLANDI: navbat bo‘shaydi ===');
await ctx.setOffline(false);

// `online` hodisasi + davriy urinish. Biroz kutamiz.
await page.evaluate(() => window.dispatchEvent(new Event('online')));
await page.waitForTimeout(4000);

const afterSync = await eventCount('PICKED_UP');
check(afterSync === 1, 'amal AYNAN BIR MARTA yuborildi', `${afterSync} ta hodisa`);

/*
  QAYTA-QAYTA URINISH HAM BIR MARTA QOLDIRADI.

  Navbat har 20 soniyada va har `online` hodisasida uriniladi.
  Agar kalit ishlamasa, bu yerda hodisalar soni o'sardi.
*/
console.log('\n=== Takroriy urinishlar ham BIR MARTA qoldiradi ===');
for (let i = 0; i < 3; i += 1) {
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(800);
}

const afterRetries = await eventCount('PICKED_UP');
check(afterRetries === 1, 'takroriy urinishdan keyin ham BITTA', `${afterRetries} ta hodisa`);

console.log('\n=== Konsol ===');
check(errors.length === 0, 'konsolda xato YO‘Q', `${errors.length} ta`);
for (const error of errors.slice(0, 5)) console.log(`   ${error}`);

await browser.close();
console.log(`\nNATIJA: ${failures === 0 ? 'HAMMASI OK' : failures + ' ta muammo'}`);
process.exit(failures === 0 ? 0 : 1);
