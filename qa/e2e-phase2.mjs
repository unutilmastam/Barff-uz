/*
  FAZA 2 DARVOZASI (ROADMAP.md S29).

  Shart bitta jumlada: "diler QO'LDA aralashuvsiz buyurtma bera
  oladi". Shuning uchun bu skript butun zanjirni BRAUZERDA, haqiqiy
  foydalanuvchi kabi yuradi:

    ariza -> tasdiqlash -> kirish -> manzil -> savat -> buyurtma
    -> admin tasdig'i -> diler buyurtmani KO'RDI

  Hech bir qadam `curl` bilan ham, bazaga SQL bilan ham
  bajarilmaydi: aynan shu "qo'lda aralashuv" darvoza taqiqlaydigan
  narsa. Yagona istisno — tozalash (oxirida), u sinov yozuvlarini
  baza orqali o'chiradi, chunki diler yozuvini O'CHIRISH endpointi
  ataylab yo'q (ariza biznes yozuvi).

  XAVFSIZLIK TEKSHIRUVI ham shu yerda: tasdiqlanmagan diler
  katalogga KIRA OLMASLIGI kerak. Bu tugma yashirish bilan emas,
  server javobi bilan tekshiriladi.

  MUHIT TUZOQLARI — `qa/README.md` da. Eng muhimi ikkitasi:

  1. Qayta qurgandan keyin `next start` jarayonini ham qayta ishga
     tushiring (`pkill -f next-server`).
  2. `POST /dealers/register` soatiga 5 ta. Bu TO'G'RI cheklov
     (akkaunt yaratadi), lekin sinovni takroran yurgizganda `429`
     beradi. Skript javob statusini chop etadi, shuning uchun bu
     "ilova buzilgan" bilan adashtirilmaydi.
*/
import { chromium } from 'playwright';

function launchOptions() {
  const path = process.env.CHROMIUM_PATH;
  return path ? { executablePath: path } : {};
}

const DEALER = process.env.DEALER_URL ?? 'http://localhost:3003';
const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:3002';
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@barff.uz';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin-Lokal-Parol-2026';

const browser = await chromium.launch({ ...launchOptions(), args: ['--no-sandbox'] });

let failures = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? ' OK ' : 'XATO'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures += 1;
};

/**
 * Qadamni QO'RIQLAB bajaradi.
 *
 * Playwright'ning `click`/`fill` lari element topilmasa 30 soniyadan
 * keyin USHLANMAGAN xato beradi va butun skript to'xtaydi — qolgan
 * qadamlar bajarilmaydi, hisobot yarim qoladi. Sinov yiqilishi
 * kerak, lekin QOLGANINI ham aytib berishi kerak: bitta buzilgan
 * qadamdan keyin "zanjirning qolgani qanday?" degan savol javobsiz
 * qolmasin.
 */
async function step(label, run) {
  try {
    await run();
  } catch (error) {
    check(false, label, String(error).split('\n')[0].slice(0, 120));
  }
}

const stamp = Date.now();
const company = `Faza2 Sinov ${stamp}`;
const email = `faza2-${stamp}@example.test`;
const password = 'Faza2-Sinov-Parol-2026';

/*
  TELEFON HAR YURISHDA BOSHQACHA BO'LISHI SHART.

  Men dastlab uni QATTIQ yozgan edim va ikkinchi yurishda butun
  zanjir jim yiqildi: `User.phone` `@unique`, ya'ni band telefon
  bilan ariza (S29 dagi tuzatishdan keyin) "qabul qilindi" deb
  javob beradi, lekin YANGI YOZUV YARATMAYDI — bu ataylab, akkaunt
  borligini oshkor qilmaslik uchun.

  Natija chalg'ituvchi edi: ariza "OK", keyin kirish ishlamadi va
  panelda ariza ko'rinmadi. Aybdor ilova emas, sinovning O'ZI edi.
*/
const phoneDigits = String(stamp).slice(-7);
const phone = `+998 94 ${phoneDigits.slice(0, 3)} ${phoneDigits.slice(3, 5)} ${phoneDigits.slice(5, 7)}`;
const taxId = String(stamp).slice(-9).padStart(9, '1');

/** Konsol xatolari yig'iladi: oq ekran ko'pincha shu yerda ko'rinadi. */
const consoleErrors = [];
function watchConsole(page, tag) {
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`${tag}: ${message.text()}`);
  });
  page.on('pageerror', (error) => consoleErrors.push(`${tag}: ${error.message}`));
}

// =====================================================================
// 1. ARIZA — DILER PORTALIDA
// =====================================================================
console.log('\n=== 1. Diler arizasi ===');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  watchConsole(page, 'ariza');

  let postStatus = 0;
  page.on('response', (res) => {
    if (res.url().endsWith('/dealers/register') && res.request().method() === 'POST') {
      postStatus = res.status();
    }
  });

  await page.goto(`${DEALER}/register`, { waitUntil: 'networkidle' });

  await page.getByLabel(/kompaniya nomi/i).fill(company);
  await page.getByLabel(/^stir/i).fill(taxId);
  await page.getByLabel(/hudud/i).fill('Samarqand');
  await page.getByLabel(/kontakt shaxs/i).fill('Faza2 Kontakt');
  await page.getByLabel(/^telefon/i).fill(phone);
  await page.getByLabel(/^email/i).fill(email);
  await page.getByLabel(/^parol/i).fill(password);

  await page.getByRole('button', { name: /ariza yuborish/i }).click();
  await page.waitForTimeout(2500);

  const accepted = await page
    .getByText(/ariza qabul qilindi/i)
    .isVisible()
    .catch(() => false);

  check(accepted, 'ariza yuborildi va tasdiq korindi', `POST /dealers/register = ${postStatus}`);
  if (postStatus === 429) {
    console.log('   ESLATMA: soatlik limit tugagan — API ni qayta ishga tushiring.');
  }

  await ctx.close();
}

// =====================================================================
// 2. TASDIQLANMAGAN DILER ISHLAY OLMAYDI
// =====================================================================
console.log('\n=== 2. Tasdiqlanmagan diler ISHLAY OLMAYDI ===');
const dealerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const dealer = await dealerCtx.newPage();
watchConsole(dealer, 'diler');
{
  await dealer.goto(`${DEALER}/login`, { waitUntil: 'domcontentloaded' });
  await dealer.locator('input[type="email"]').fill(email);
  await dealer.locator('input[type="password"]').fill(password);
  await dealer.getByRole('button', { name: 'Kirish' }).click();
  await dealer.waitForTimeout(2500);

  // Kirish O'ZI ruxsat bermaydi — ariza egasi holatini ko'rishi kerak.
  check(!dealer.url().includes('/login'), 'ariza egasi portalga kira oldi', dealer.url());

  /*
    Tekshiruv SERVER JAVOBI bo'yicha, ekrandagi matn bo'yicha emas:
    tugmani yashirish himoya emas (CLAUDE.md §3).
  */
  const catalog = await dealer.request.get(`${API}/dealer/products?limit=1`);
  const body = await catalog.json().catch(() => ({}));
  check(
    catalog.status() === 403 && body.code === 'DEALER_NOT_ACTIVE',
    'tasdiqlanmagan diler katalogga KIRA OLMADI',
    `${catalog.status()} · ${body.code ?? '—'}`,
  );
}

// =====================================================================
// 3. ADMIN ARIZANI TASDIQLAYDI
// =====================================================================
console.log('\n=== 3. Admin arizani tasdiqlaydi ===');
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const admin = await adminCtx.newPage();
watchConsole(admin, 'admin');
await step('tasdiqlash qadami bajarildi', async () => {
  await admin.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' });
  await admin.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await admin.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await admin.getByRole('button', { name: 'Kirish' }).click();
  await admin.waitForURL(`${ADMIN}/`, { timeout: 15000 });
  check(true, 'admin panelga kirdi');

  await admin.goto(`${ADMIN}/dealers`, { waitUntil: 'networkidle' });
  await admin.waitForTimeout(1500);

  // Boshlang'ich filtr `PENDING` — yangi ariza ro'yxatning boshida.
  /*
    HAR BIR QADAM QO'RIQLANADI.

    Ilgari bu yerda `click()` to'g'ridan-to'g'ri chaqirilardi va
    ariza topilmasa Playwright 30 soniya kutib, butun skriptni
    USHLANMAGAN xato bilan to'xtatardi — qolgan qadamlar umuman
    bajarilmasdi va hisobot yarim qolardi. Sinov yiqilishi kerak,
    lekin QOLGANINI ham aytib berishi kerak.
  */
  const link = admin.getByRole('link', { name: company });
  const linkFound = (await link.count()) > 0;
  check(linkFound, 'yangi ariza panelda KORINDI');

  if (!linkFound) {
    check(false, 'tasdiqlash tugmasi bor — ariza topilmadi, qadam otkazildi');
    check(false, 'holat TASDIQLANGAN ga otdi — ariza topilmadi, qadam otkazildi');
  } else {
    await link.first().click();
    await admin.waitForTimeout(1500);

    const approve = admin.getByRole('button', { name: 'Tasdiqlangan' });
    const approveFound = (await approve.count()) > 0;
    check(approveFound, 'tasdiqlash tugmasi bor');

    if (approveFound) {
      await approve.first().click();
      await admin.waitForTimeout(2000);

      /*
    TEKSHIRUV TUGMANING YO'QOLISHI BO'YICHA, matn bo'yicha EMAS.

    "Tasdiqlangan" matni tugmaning O'ZIDA ham bor edi, ya'ni
    `getByText('Tasdiqlangan')` bosishdan OLDIN ham topilardi va
    tasdiqlash umuman ishlamasa ham sinov YASHIL bo'lardi. Men
    dastlab aynan shunday yozgan edim.

    `APPROVED` dan faqat `SUSPENDED` ga o'tish mumkin
    (`DEALER_STATUS_TRANSITIONS`), ya'ni HAQIQIY o'tishdan keyin
    "Tasdiqlangan" tugmasi YO'QOLADI va "To'xtatilgan" paydo
    bo'ladi. Bu ikkisi birga faqat o'tish bo'lganda to'g'ri keladi.
  */
      const approveGone = await admin.getByRole('button', { name: 'Tasdiqlangan' }).count();
      const suspendShown = await admin.getByRole('button', { name: 'To‘xtatilgan' }).count();

      check(
        approveGone === 0 && suspendShown > 0,
        'holat TASDIQLANGAN ga otdi (tugmalar almashdi)',
        `tasdiqlash=${approveGone} · to'xtatish=${suspendShown}`,
      );
    } else {
      check(false, 'holat TASDIQLANGAN ga otdi — tugma yoq, qadam otkazildi');
    }
  }
});

// =====================================================================
// 4. DILER MANZIL QO'SHADI
// =====================================================================
console.log('\n=== 4. Diler manzil qoshadi ===');
await step('manzil qadami bajarildi', async () => {
  await dealer.goto(`${DEALER}/addresses`, { waitUntil: 'networkidle' });
  await dealer.waitForTimeout(1200);

  await dealer.getByRole('button', { name: 'Manzil qo‘shish' }).click();
  await dealer.waitForTimeout(600);

  await dealer.getByLabel('Nomi').fill('Asosiy ombor');
  await dealer.getByLabel('Hudud').fill('Samarqand');
  await dealer.getByLabel('Ko‘cha va uy').fill('Registon ko‘chasi 1');
  await dealer.getByLabel('Qabul qiluvchi').fill('Faza2 Qabul');
  await dealer.getByLabel(/telefon/i).fill(phone);

  await dealer.getByRole('button', { name: 'Saqlash' }).click();
  await dealer.waitForTimeout(2000);

  const saved = await dealer
    .getByText('Asosiy ombor')
    .first()
    .isVisible()
    .catch(() => false);
  check(saved, 'manzil saqlandi va royxatda korindi');
});

// =====================================================================
// 5. KATALOG -> SAVAT
// =====================================================================
console.log('\n=== 5. Katalog va savat ===');
await step('katalog qadami bajarildi', async () => {
  await dealer.goto(`${DEALER}/catalog`, { waitUntil: 'networkidle' });
  await dealer.waitForTimeout(1800);

  const add = dealer.getByRole('button', { name: 'Savatga' });
  const count = await add.count();
  check(count > 0, 'katalogda mahsulot bor', `${count} ta variant`);

  if (count > 0) {
    await add.first().click();
    await dealer.waitForTimeout(1800);

    const added = await dealer
      .getByText('Qo‘shildi')
      .first()
      .isVisible()
      .catch(() => false);
    check(added, 'mahsulot savatga qoshildi');
  }

  await dealer.goto(`${DEALER}/cart`, { waitUntil: 'networkidle' });
  await dealer.waitForTimeout(1500);

  /*
    IJOBIY tekshiruv, inkor EMAS.

    Ilgari bu yerda "Savat bo'sh" matni YO'QLIGI tekshirilardi va u
    XATO sahifasida ham o'tardi: savat yuklanmasa ekranda "Savatni
    yuklab bo'lmadi" chiqadi, "Savat bo'sh" esa yo'q — ya'ni sinov
    savat umuman ishlamaganda ham YASHIL bo'lardi. (Mutatsiya
    yurgizganda aynan shu holat ko'rindi.)

    "Jami" qatori faqat savat HAQIQATAN yuklanganda chiziladi.
  */
  const totalRow = await dealer
    .getByText('Jami', { exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  check(totalRow, 'savatda JAMI qatori bor — savat yuklandi');
});

// =====================================================================
// 6. BUYURTMA YUBORISH
// =====================================================================
console.log('\n=== 6. Buyurtma yuborish ===');
let orderNumber = null;
let orderUrl = null;
await step('buyurtma qadami bajarildi', async () => {
  const review = dealer.getByRole('button', { name: 'Ko‘rib chiqish' });
  const hasReview = await review.count().then((n) => n > 0);
  check(hasReview, 'rasmiylashtirish ochildi (manzil tanlandi)');

  if (hasReview) {
    await review.first().click();
    await dealer.waitForTimeout(800);

    await dealer.getByRole('button', { name: 'Buyurtmani yuborish' }).click();
    await dealer.waitForURL(/\/orders\/[0-9a-f-]+/, { timeout: 20000 }).catch(() => {});
    await dealer.waitForTimeout(2000);

    orderUrl = dealer.url();
    const heading = await dealer.locator('h1').first().textContent();
    orderNumber = (heading ?? '').trim();

    check(
      /^BRF-\d{4}-\d{6}$/.test(orderNumber),
      'buyurtma yaratildi va RAQAM berildi',
      orderNumber || dealer.url(),
    );
  }
});

// =====================================================================
// 7. ADMIN BUYURTMANI TASDIQLAYDI
// =====================================================================
console.log('\n=== 7. Admin buyurtmani tasdiqlaydi ===');
if (orderNumber !== null) {
  await step('admin tasdigi qadami bajarildi', async () => {
    await admin.goto(`${ADMIN}/orders`, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(1500);

    const row = admin.getByRole('link', { name: orderNumber });
    check(await row.count().then((n) => n > 0), 'buyurtma admin royxatida KORINDI', orderNumber);

    if (await row.count().then((n) => n > 0)) {
      await row.first().click();
      await admin.waitForTimeout(1500);

      const confirm = admin.getByRole('button', { name: 'Tasdiqlandi' });
      check(await confirm.count().then((n) => n > 0), 'tasdiqlash tugmasi bor');

      await confirm.first().click();
      await admin.waitForTimeout(2000);

      /*
      Yana tugmalar bo'yicha (3-qadamdagi sabab bilan bir xil):
      `CONFIRMED` dan keyingi o'tish `RESERVED`, ya'ni "Tasdiqlandi"
      tugmasi yo'qolib, "Zaxiraga olindi" paydo bo'lishi kerak.
    */
      const confirmGone = await admin.getByRole('button', { name: 'Tasdiqlandi' }).count();
      const reserveShown = await admin.getByRole('button', { name: 'Zaxiraga olindi' }).count();

      check(
        confirmGone === 0 && reserveShown > 0,
        'buyurtma TASDIQLANDI (tugmalar almashdi)',
        `tasdiqlash=${confirmGone} · zaxira=${reserveShown}`,
      );
    }
  });
} else {
  check(false, 'buyurtma yoq — admin qadami otkazib yuborildi');
}

// =====================================================================
// 8. DILER YANGI HOLATNI KORADI — ZANJIR YOPILDI
// =====================================================================
console.log('\n=== 8. Diler yangi holatni koradi ===');
if (orderUrl !== null) {
  await dealer.goto(orderUrl, { waitUntil: 'networkidle' });
  await dealer.waitForTimeout(1800);

  const seen = await dealer
    .getByText('Tasdiqlandi')
    .first()
    .isVisible()
    .catch(() => false);
  check(seen, 'diler yangi holatni KORDI — zanjir yopildi');
} else {
  check(false, 'buyurtma yoq — oxirgi qadam otkazib yuborildi');
}

// =====================================================================
// KONSOL XATOLARI
// =====================================================================
console.log('\n=== Konsol xatolari ===');
check(consoleErrors.length === 0, 'brauzer konsolida xato YOQ', `${consoleErrors.length} ta`);
for (const error of consoleErrors.slice(0, 10)) console.log(`   ${error}`);

await browser.close();

console.log(`\nSINOV DILERI: ${company} · ${email} · ${phone}`);
console.log('Tozalash: `node qa/cleanup-phase2.mjs` yoki bazadan qo‘lda.');
console.log(`\nNATIJA: ${failures === 0 ? 'ZANJIR TOLIQ ISHLADI' : failures + ' ta muammo'}`);
process.exit(failures === 0 ? 0 : 1);
