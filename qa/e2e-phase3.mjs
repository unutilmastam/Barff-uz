/*
  FAZA 3 DARVOZASI (ROADMAP.md S35).

  Shart bitta jumlada: "fizik bajarish tizimda TO'LIQ kuzatiladi".

  Shuning uchun bu skript butun zanjirni BRAUZERDA yuradi va har
  bir bosqichda QOLDIQ RAQAMINI o'qiydi:

    diler buyurtma berdi
      -> admin tasdiqladi        (qoldiq O'ZGARMAYDI)
      -> zaxiraga oldi           (BAND oshadi, qoldiq O'ZGARMAYDI)
      -> ombor yig'di
      -> qadoqladi               (qoldiq KAMAYADI, band BO'SHAYDI)
      -> jo'natishga tayyor      (YETKAZMA tug'iladi)
      -> logist haydovchi biriktirdi
      -> haydovchi topshirdi     (buyurtma YETKAZILDI)

  HAR BIR HOLAT ALOHIDA ROL BILAN. Adminning hamma ruxsati bor va
  butun zanjirni u bilan yurish "omborchi o'z ishini qila oladimi"
  degan savolga javob bermasdi — u darvozaning asl savoli.

  QOLDIQ EKRANDAN EMAS, API'DAN o'qiladi: ekrandagi raqam keshdan
  kelgan bo'lishi mumkin. Yakuniy yarashtirish esa BAZADAN —
  `reconcile-phase3.mjs`.

  TAYYORGARLIK:

    STAFF_PASSWORD="..." node qa/seed-staff.mjs

  U ombor, logist, haydovchi va tasdiqlangan diler akkauntlarini
  yaratadi. Diler ARIZASI bu yerda takrorlanmaydi — u Faza 2
  darvozasi (S29) va `POST /dealers/register` soatiga 5 ta.

  MUHIT TUZOQLARI — `qa/README.md`.
*/
import { chromium } from 'playwright';

const DEALER_URL = process.env.DEALER_URL ?? 'http://localhost:3003';
const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:3002';
const DRIVER_URL = process.env.DRIVER_URL ?? 'http://localhost:3004';
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@barff.uz';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const STAFF_PASSWORD = process.env.STAFF_PASSWORD;

if (ADMIN_PASSWORD === undefined || STAFF_PASSWORD === undefined) {
  console.error(
    'XATO: `ADMIN_PASSWORD` va `STAFF_PASSWORD` berilishi shart.\n' +
      'Parol kodda saqlanmaydi (CLAUDE.md §12).',
  );
  process.exit(2);
}

const STAFF = {
  dealer: 'qa3-diler@barff.uz',
  warehouse: 'qa3-ombor@barff.uz',
  logistics: 'qa3-logist@barff.uz',
  driver: 'qa3-haydovchi@barff.uz',
};

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

const errors = [];

/**
 * Qadamni QO'RIQLAB bajaradi.
 *
 * Playwright element topilmasa 30 soniyadan keyin USHLANMAGAN xato
 * beradi va butun skript to'xtaydi — hisobot yarim qoladi. Sinov
 * yiqilishi kerak, lekin ZANJIRNING QOLGANINI ham aytib berishi
 * kerak.
 */
async function step(label, run) {
  try {
    await run();
  } catch (error) {
    check(false, label, String(error).split('\n')[0].slice(0, 140));
  }
}

async function open(url, email, password, tag, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));

  await page.goto(`${url}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Kirish' }).click();
  await page.waitForURL(`${url}/`, { timeout: 20000 });

  return { ctx, page };
}

const admin = await open(ADMIN_URL, ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
check(true, 'admin panelga kirdi');

/**
 * Variantning QOLDIG'I — raqam bilan isbot uchun.
 *
 * API'dan, ekrandan emas: ekrandagi raqam keshdan kelgan bo'lishi
 * mumkin va sinov o'zgarmagan qiymatni "o'zgardi" deb ko'rardi.
 *
 * QOLDIQ O'QILMASA `null` QAYTADI, `-1` emas.
 *
 * Avval bu funksiya `-1` qaytarardi va butun sinov JIM YOLG'ON
 * berardi: "qoldiq o'zgarmadi" tekshiruvi `-1 === -1` bo'lib
 * O'TARDI, holbuki qoldiq umuman o'qilmagan edi. Buni birinchi
 * yurishda ko'rdim — ikkita tekshiruv NOTO'G'RI SABABDAN yashil
 * edi.
 */
async function stockOf(sku) {
  const stock = await (
    await admin.page.request.get(`${API}/warehouse/stock?search=${sku}&limit=50`)
  ).json();
  const row = (stock.items ?? []).find((entry) => entry.productVariant?.sku === sku);

  if (row === undefined) return null;

  return { quantity: row.quantity, reserved: row.reservedQuantity };
}

/** Qoldiq o'qilmasa — bu TEKSHIRUV emas, NOSOZLIK. */
function readStock(snapshot, label) {
  if (snapshot === null) {
    check(false, `${label}: qoldiq OQILMADI — tekshiruv otkazib yuborilmaydi`);
    return null;
  }
  return snapshot;
}

// =====================================================================
// 0. HAYDOVCHI PROFILI — «PARK» BO'LIMIDA
// =====================================================================
console.log('\n=== 0. Haydovchi profili ===');
await step('haydovchi profili qadami bajarildi', async () => {
  const drivers = await (await admin.page.request.get(`${API}/delivery/drivers`)).json();
  const existing = Array.isArray(drivers)
    ? drivers.find((row) => row.user?.email === STAFF.driver)
    : undefined;

  if (existing !== undefined) {
    check(true, 'haydovchi profili bor', existing.user.fullName);
    return;
  }

  await admin.page.goto(`${ADMIN_URL}/logistics/fleet`, { waitUntil: 'networkidle' });
  await admin.page.waitForTimeout(1500);

  await admin.page.getByRole('button', { name: 'Haydovchi profili' }).click();
  await admin.page.waitForTimeout(1500);

  /*
    TANLOV RADIX, NATIV `<select>` EMAS.

    Birinchi yurishda `selectOption` ishlatgandim va u JIM
    yiqildi (`.catch()` ostida) — profil ochilmadi, haydovchi
    keyin `403` oldi va sabab uchta qadam narida ko'rindi.
    Radix'da tugma bosiladi, keyin variant tanlanadi.
  */
  const trigger = admin.page.getByLabel('Foydalanuvchi');
  check((await trigger.count()) > 0, 'nomzodlar royxati bor');
  if ((await trigger.count()) === 0) return;

  await trigger.click();
  await admin.page.waitForTimeout(600);

  const option = admin.page.getByRole('option', { name: new RegExp(STAFF.driver) });
  check((await option.count()) > 0, 'QA haydovchisi nomzodlar orasida bor', STAFF.driver);
  if ((await option.count()) === 0) return;

  await option.first().click();
  await admin.page.waitForTimeout(500);

  await admin.page.getByRole('button', { name: 'Saqlash' }).click();
  await admin.page.waitForTimeout(2500);

  const after = await (await admin.page.request.get(`${API}/delivery/drivers`)).json();
  const created = Array.isArray(after)
    ? after.some((row) => row.user?.email === STAFF.driver)
    : false;
  check(created, 'haydovchi profili «Park» bolimida ochildi');
});

// =====================================================================
// 1. DILER BUYURTMA BERADI
// =====================================================================
console.log('\n=== 1. Diler buyurtma beradi ===');
const dealer = await open(DEALER_URL, STAFF.dealer, STAFF_PASSWORD, 'diler', {
  width: 390,
  height: 844,
});
check(true, 'diler portalga kirdi');

let orderNumber = null;
let targetSku = null;
let orderedQuantity = 0;

/*
  QAYSI VARIANT — TASODIFAN EMAS, QOLDIG'I BORI.

  Birinchi yurishda skript katalogdagi BIRINCHI tugmani bosdi va u
  API sinovlaridan qolgan, qoldig'i umuman yo'q variant bo'lib
  chiqdi: zaxira `409` berdi va butun zanjir shu yerda to'xtadi.
  Sabab ilovada emas edi.

  Endi variant QOLDIQ bo'yicha tanlanadi: ombor ro'yxatidan
  mavjudi bor variant olinadi va katalogda AYNAN o'sha bosiladi.
*/
await step('buyurtma qadami bajarildi', async () => {
  const stock = await (await admin.page.request.get(`${API}/warehouse/stock?limit=100`)).json();
  const stocked = new Map(
    (stock.items ?? [])
      .filter((row) => row.quantity - row.reservedQuantity > 0)
      .map((row) => [row.productVariant.id, row.productVariant.sku]),
  );

  check(stocked.size > 0, 'omborda qoldigi bor variant bor', `${stocked.size} ta`);
  if (stocked.size === 0) return;

  /*
    `limit` — 60, 100 EMAS.

    Dilerlar katalogi eng ko'pi 60 ta qabul qiladi va 100 bilan
    `400` qaytaradi. Birinchi yurishda men 100 yozgandim: javob
    xato bo'lib, `items` UNDEFINED bo'ldi va "mos variant yo'q"
    degan xulosa chiqdi. Sabab ilovada emas, so'rovda edi.
  */
  const catalog = await (await dealer.page.request.get(`${API}/dealer/products?limit=60`)).json();

  if (!Array.isArray(catalog.items)) {
    check(false, 'katalog oqildi', JSON.stringify(catalog).slice(0, 160));
    return;
  }

  /* Narxi yo'q variant savatga tushmaydi (S25) — u ham chiqarib tashlanadi. */
  let target = null;
  for (const product of catalog.items) {
    for (const variant of product.variants ?? []) {
      if (variant.price !== null && stocked.has(variant.id)) {
        target = { id: variant.id, sku: stocked.get(variant.id) };
        break;
      }
    }
    if (target !== null) break;
  }

  check(target !== null, 'katalogda qoldigi ham, narxi ham bor variant bor', target?.sku ?? '—');
  if (target === null) return;

  targetSku = target.sku;

  await dealer.page.goto(`${DEALER_URL}/catalog`, { waitUntil: 'networkidle' });
  await dealer.page.waitForTimeout(2000);

  /*
    QATOR MIQDOR TANLAGICHI BO'YICHA TOPILADI.

    Uning yorlig'ida variant `id` sining boshi bor
    (`CatalogBrowser.tsx`: «Miqdor — <id>»), ya'ni bu YAGONA
    bog'lanish. Matn bo'yicha qidirish mahsulot nomi takrorlansa
    boshqa qatorni bosardi.
  */
  const row = dealer.page
    .locator('li')
    .filter({ has: dealer.page.getByLabel(`Miqdor — ${target.id.slice(0, 8)}`) });

  check((await row.count()) > 0, 'kerakli variant katalogda KORINDI', target.sku);
  if ((await row.count()) === 0) return;

  await row.first().getByRole('button', { name: 'Savatga' }).click();
  await dealer.page.waitForTimeout(1800);

  await dealer.page.goto(`${DEALER_URL}/cart`, { waitUntil: 'networkidle' });
  await dealer.page.waitForTimeout(1500);

  const review = dealer.page.getByRole('button', { name: 'Ko‘rib chiqish' });
  check((await review.count()) > 0, 'savat yuklandi va rasmiylashtirish ochildi');
  if ((await review.count()) === 0) return;

  await review.first().click();
  await dealer.page.waitForTimeout(800);

  await dealer.page.getByRole('button', { name: 'Buyurtmani yuborish' }).click();
  await dealer.page.waitForURL(/\/orders\/[0-9a-f-]+/, { timeout: 25000 }).catch(() => {});
  await dealer.page.waitForTimeout(2000);

  orderNumber = ((await dealer.page.locator('h1').first().textContent()) ?? '').trim();
  check(/^BRF-\d{4}-\d{6}$/.test(orderNumber), 'buyurtma RAQAM oldi', orderNumber);
});

if (orderNumber !== null && targetSku !== null) {
  const list = await (
    await admin.page.request.get(`${API}/admin/orders?search=${orderNumber}&limit=1`)
  ).json();
  const orderId = list.items?.[0]?.id;

  if (orderId !== undefined) {
    const detail = await (await admin.page.request.get(`${API}/admin/orders/${orderId}`)).json();
    orderedQuantity = (detail.items ?? []).find((item) => item.sku === targetSku)?.quantity ?? 0;
  }
}

if (orderNumber === null || !/^BRF-/.test(orderNumber) || targetSku === null) {
  console.log('\nBuyurtma yaratilmadi — zanjirning qolgani tekshirilmaydi.');
  await browser.close();
  console.log(`\nNATIJA: ${failures} ta muammo`);
  process.exit(1);
}

const start = readStock(await stockOf(targetSku), 'boshlangich');

if (start === null || orderedQuantity === 0) {
  console.log('\nBoshlangich qoldiq yoki miqdor oqilmadi — taqqoslashning manosi yoq.');
  await browser.close();
  console.log(`\nNATIJA: ${failures} ta muammo`);
  process.exit(1);
}

console.log(
  `   ${targetSku}: qoldiq ${start.quantity}, band ${start.reserved}, buyurtma ${orderedQuantity} dona`,
);

/** Admin buyurtma sahifasidagi holat tugmasini bosadi. */
async function press(page, label, wait = 2500) {
  const button = page.getByRole('button', { name: label });
  const found = (await button.count()) > 0;
  if (found) {
    await button.first().click();
    await page.waitForTimeout(wait);
  }
  return found;
}

// =====================================================================
// 2. ADMIN TASDIQLAYDI — QOLDIQ O'ZGARMAYDI
// =====================================================================
console.log('\n=== 2. Tasdiqlash: qoldiq OZGARMAYDI ===');
await step('tasdiqlash qadami bajarildi', async () => {
  await admin.page.goto(`${ADMIN_URL}/orders`, { waitUntil: 'networkidle' });
  await admin.page.waitForTimeout(1500);

  const row = admin.page.getByRole('link', { name: orderNumber });
  check((await row.count()) > 0, 'buyurtma admin royxatida KORINDI', orderNumber);
  if ((await row.count()) === 0) return;

  await row.first().click();
  await admin.page.waitForTimeout(1500);

  check(await press(admin.page, 'Tasdiqlandi'), 'tasdiqlandi');

  const after = readStock(await stockOf(targetSku), 'tasdiqlashdan keyin');
  if (after === null) return;

  check(
    after.quantity === start.quantity && after.reserved === start.reserved,
    'tasdiqlashda qoldiq ham, band ham OZGARMADI',
    `${start.quantity}/${start.reserved} -> ${after.quantity}/${after.reserved}`,
  );
});

// =====================================================================
// 3. ZAXIRA — BAND OSHADI, QOLDIQ O'ZGARMAYDI
// =====================================================================
console.log('\n=== 3. Zaxira: BAND oshadi, qoldiq OZGARMAYDI ===');
await step('zaxira qadami bajarildi', async () => {
  check(await press(admin.page, 'Zaxiraga olindi'), 'zaxiraga olindi');

  const after = readStock(await stockOf(targetSku), 'zaxiradan keyin');
  if (after === null) return;

  check(
    after.quantity === start.quantity,
    'zaxirada QOLDIQ ozgarmadi',
    `${start.quantity} -> ${after.quantity}`,
  );
  check(
    after.reserved === start.reserved + orderedQuantity,
    'BAND buyurtma miqdoricha OSHDI',
    `${start.reserved} -> ${after.reserved} (+${orderedQuantity})`,
  );
});

// =====================================================================
// 4. OMBOR YIG'ADI VA QADOQLAYDI — QOLDIQ KAMAYADI
// =====================================================================
console.log('\n=== 4. Ombor: yigish va qadoqlash ===');
const warehouse = await open(ADMIN_URL, STAFF.warehouse, STAFF_PASSWORD, 'ombor');
check(true, 'ombor xodimi panelga kirdi');

await step('ombor qadami bajarildi', async () => {
  await warehouse.page.goto(`${ADMIN_URL}/warehouse/picking`, { waitUntil: 'networkidle' });
  await warehouse.page.waitForTimeout(1800);

  const link = warehouse.page.getByRole('link', { name: orderNumber });
  check((await link.count()) > 0, 'buyurtma YIGISH NAVBATIDA korindi', orderNumber);
  if ((await link.count()) === 0) return;

  await link.first().click();
  await warehouse.page.waitForTimeout(1800);

  const lines = await warehouse.page.locator('input[type="checkbox"]').count();
  check(lines > 0, 'yigiladigan pozitsiyalar bor', `${lines} ta`);

  check(await press(warehouse.page, 'Yig‘ilmoqda'), 'yigish boshlandi');
  check(await press(warehouse.page, 'Qadoqlandi', 3000), 'qadoqlandi');

  const after = readStock(await stockOf(targetSku), 'qadoqlashdan keyin');
  if (after === null) return;

  check(
    after.quantity === start.quantity - orderedQuantity,
    'qadoqlashda QOLDIQ aynan buyurtma miqdoricha kamaydi',
    `${start.quantity} -> ${after.quantity} (-${orderedQuantity})`,
  );
  check(
    after.reserved === start.reserved,
    'BAND boshadi — tovar endi zaxirada emas, CHIQIB ketdi',
    `${after.reserved}`,
  );
});

// =====================================================================
// 5. JO'NATISHGA TAYYOR — YETKAZMA TUG'ILADI
// =====================================================================
console.log('\n=== 5. Jonatishga tayyor: YETKAZMA tugiladi ===');
let deliveryNumber = null;
await step('yetkazma qadami bajarildi', async () => {
  check(await press(warehouse.page, 'Jo‘natishga tayyor', 3000), 'jonatishga tayyor');

  const list = await (
    await admin.page.request.get(`${API}/admin/orders?search=${orderNumber}&limit=1`)
  ).json();
  const orderId = list.items?.[0]?.id;

  const deliveries = await (
    await admin.page.request.get(`${API}/delivery/assignments?limit=50&openOnly=true`)
  ).json();
  const mine = (deliveries.items ?? []).find((row) => row.order?.id === orderId);

  check(mine !== undefined, 'yetkazma AVTOMATIK yaratildi', mine?.number ?? '—');
  deliveryNumber = mine?.number ?? null;
});

// =====================================================================
// 6. LOGIST HAYDOVCHI BIRIKTIRADI
// =====================================================================
console.log('\n=== 6. Logist haydovchi biriktiradi ===');
const logistics = await open(ADMIN_URL, STAFF.logistics, STAFF_PASSWORD, 'logist');
check(true, 'logist panelga kirdi');

await step('biriktirish qadami bajarildi', async () => {
  if (deliveryNumber === null) {
    check(false, 'yetkazma yoq — biriktirish otkazildi');
    return;
  }

  await logistics.page.goto(`${ADMIN_URL}/logistics?search=${deliveryNumber}`, {
    waitUntil: 'networkidle',
  });
  await logistics.page.waitForTimeout(1800);

  const assign = logistics.page.getByRole('button', { name: 'Biriktirish' });
  check((await assign.count()) > 0, 'biriktirilmagan yetkazma taxtada korindi');
  if ((await assign.count()) === 0) return;

  await assign.first().click();
  await logistics.page.waitForTimeout(1200);

  /*
    HAYDOVCHI ANIQ TANLANADI.

    Birinchi yurishda tanlamasdan tasdiqladim va yetkazma
    ro'yxatdagi BIRINCHI haydovchiga ketdi — QA haydovchisiga
    emas. O'shanda oyna birinchi haydovchini oldindan tanlab
    qo'yardi; endi u «Tanlang» bilan ochiladi (S34 ekrani
    shu darvoza tufayli tuzatildi).
  */
  /*
    TANLOV OYNA ICHIDA QIDIRILADI.

    Taxtada ham «Haydovchi» yorlig'i bor (filtr), ya'ni sahifada
    bu nom UCHTA elementga to'g'ri keladi va Playwright qat'iy
    rejimda to'xtaydi. Oyna bilan chegaralash shuni hal qiladi.
  */
  const driverSelect = logistics.page.locator('[role="dialog"]').getByLabel('Haydovchi');
  await driverSelect.click();
  await logistics.page.waitForTimeout(600);

  const driverOption = logistics.page.getByRole('option', { name: /QA Haydovchi/ });
  check((await driverOption.count()) > 0, 'QA haydovchisi royxatda bor');
  if ((await driverOption.count()) === 0) return;

  await driverOption.first().click();
  await logistics.page.waitForTimeout(500);

  // Oynadagi «Biriktirish» — tasdiqlash tugmasi.
  await logistics.page.getByRole('button', { name: 'Biriktirish' }).last().click();
  await logistics.page.waitForTimeout(2500);

  const deliveries = await (
    await admin.page.request.get(`${API}/delivery/assignments?limit=50&search=${deliveryNumber}`)
  ).json();
  const row = (deliveries.items ?? [])[0];

  check(
    row?.driver?.user?.fullName === 'QA Haydovchi',
    'AYNAN QA haydovchisi biriktirildi',
    row?.driver?.user?.fullName ?? '—',
  );
  check(row?.status === 'ASSIGNED', 'yetkazma holati BIRIKTIRILDI ga otdi', row?.status ?? '—');
});

// =====================================================================
// 7. HAYDOVCHI TOPSHIRADI
// =====================================================================
console.log('\n=== 7. Haydovchi topshiradi ===');
await step('haydovchi qadami bajarildi', async () => {
  const driver = await open(DRIVER_URL, STAFF.driver, STAFF_PASSWORD, 'haydovchi', {
    width: 393,
    height: 851,
  });
  check(true, 'haydovchi PWA ga kirdi');

  /*
    RO'YXAT MIJOZDA YUKLANADI — KUTISH SHART.

    Kirishdan keyin manzil darhol `/` ga o'tadi, ro'yxat esa
    keyinroq keladi. Kutmasdan qidirganimda "ish yo'q" chiqdi,
    holbuki API'da yetkazma BOR edi — sinov ilovani
    ayblardi.
  */
  await driver.page.waitForLoadState('networkidle');
  await driver.page.waitForTimeout(2500);

  const job = driver.page.getByRole('link', { name: new RegExp(deliveryNumber ?? 'DLV-') });
  check((await job.count()) > 0, 'bugungi ish royxatida yetkazma bor', deliveryNumber ?? '—');
  if ((await job.count()) === 0) return;

  await job.first().click();
  await driver.page.waitForTimeout(1800);

  /*
    TO'RTTA QADAM KETMA-KET.

    Har biri alohida bosiladi: haydovchi PWA'si bitta "topshirdim"
    tugmasi bermaydi va bermasligi ham kerak — oraliq holatlar
    logistga "yuk qayerda" degan savolga javob beradi.
  */
  for (const label of ['Olindi', 'Yo‘lda', 'Yetib keldi', 'Topshirildi']) {
    const pressed = await press(driver.page, label, 2500);
    check(pressed, `«${label}» bosildi`);
    if (!pressed) break;
  }

  await driver.ctx.close();
});

// =====================================================================
// 8. ZANJIR YOPILDI
// =====================================================================
console.log('\n=== 8. Zanjir yopildi ===');
await step('yakuniy tekshiruv bajarildi', async () => {
  const list = await (
    await admin.page.request.get(`${API}/admin/orders?search=${orderNumber}&limit=1`)
  ).json();
  const order = list.items?.[0];

  check(order?.status === 'DELIVERED', 'BUYURTMA holati YETKAZILDI', order?.status ?? '—');

  const deliveries = await (
    await admin.page.request.get(`${API}/delivery/assignments?limit=50&search=${deliveryNumber}`)
  ).json();
  const delivery = (deliveries.items ?? [])[0];

  check(delivery?.status === 'DELIVERED', 'YETKAZMA holati TOPSHIRILDI', delivery?.status ?? '—');

  const final = readStock(await stockOf(targetSku), 'yakuniy');
  if (final === null) return;

  check(
    final.quantity === start.quantity - orderedQuantity,
    'YAKUNIY qoldiq aynan buyurtma miqdoricha kam',
    `${start.quantity} -> ${final.quantity}`,
  );
  check(final.reserved === start.reserved, 'yakuniy BAND boshlangichga TENG', `${final.reserved}`);
});

console.log('\n=== Konsol ===');
check(errors.length === 0, 'brauzer konsolida xato YOQ', `${errors.length} ta`);
for (const error of errors.slice(0, 8)) console.log(`   ${error}`);

await browser.close();

console.log(`\nBUYURTMA: ${orderNumber} · YETKAZMA: ${deliveryNumber ?? '—'}`);
console.log('Yarashtirish: `node qa/reconcile-phase3.mjs`');
console.log(`\nNATIJA: ${failures === 0 ? 'ZANJIR TOLIQ ISHLADI' : failures + ' ta muammo'}`);
process.exit(failures === 0 ? 0 : 1);
