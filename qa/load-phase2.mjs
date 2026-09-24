/*
  FAZA 2 — YUK SOG'LIQ TEKSHIRUVI (ROADMAP.md S29).

  Bu YUK SINOVI EMAS. Maqsad "necha RPS ko'taradi" degan raqam emas:
  bunday raqam noutbukda o'lchanganda ishlab chiqarish uchun hech
  narsa anglatmaydi. Maqsad — IKKITA ANIQ SAVOL:

  1. Katalog bir vaqtda kelgan so'rovlarda YIQILMAYDIMI va javob
     vaqti keskin sakramaydimi.
  2. BIR VAQTDA yuborilgan buyurtmalar TAKRORLANMAS raqam oladimi.

  Ikkinchisi tasodifiy tanlanmagan. Buyurtma raqami yillik
  hisoblagichdan chiqadi va u S26 da `INSERT ... ON CONFLICT DO
  UPDATE RETURNING` bilan ATOMAR qilingan. Oddiy "o'qi-qo'sh-yoz"
  yondashuvida ikkita diler bir vaqtda buyurtma bersa IKKALASI
  BIR XIL raqam olardi — va buni faqat bir vaqtda urinib ko'rish
  ko'rsatadi.

  UCHINCHI SAVOL: takroriy yuborish (`idempotencyKey`) bitta
  buyurtma yaratadimi. Diler tugmani ikki marta bossa yoki tarmoq
  javobni yo'qotsa — bu har kuni bo'ladigan holat.

  ============================================================
  TEZLIK CHEKLOVI — AVVAL SHUNI O'QING
  ============================================================

  API'da soniyasiga emas, 60 soniyada 120 so'rov cheklovi bor
  (`API_RATE_LIMIT_MAX`, standart qiymat). Bu TO'G'RI himoya, lekin
  yuk tekshiruvida u O'LCHOVNI BUZADI: javoblar `429` bo'lib
  chiqadi va "tezlik" aslida cheklovning tezligi bo'ladi.

  Shuning uchun skript `429` larni ALOHIDA sanaydi va ular ko'p
  bo'lsa O'LCHOVNI HAQIQIY DEB HISOBLAMAYDI. Haqiqiy o'lchov uchun
  API'ni vaqtincha kattaroq chegara bilan qayta ishga tushiring:

      API_RATE_LIMIT_MAX=100000 node dist/main.js
*/
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@barff.uz';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin-Lokal-Parol-2026';

/** Nechta so'rov va qanchasi bir vaqtda. */
const CATALOG_REQUESTS = Number(process.env.CATALOG_REQUESTS ?? 200);
const CATALOG_CONCURRENCY = Number(process.env.CATALOG_CONCURRENCY ?? 20);
/*
  Nechta diler BIR VAQTDA buyurtma beradi. Har biri bitta arizani
  sarflaydi (`POST /dealers/register` soatiga 5 ta), shuning uchun
  standart qiymat kichik.
*/
const ORDER_DEALERS = Number(process.env.ORDER_DEALERS ?? 3);

let failures = 0;
/* Cheklovga urilgan yurish O'LCHOV emas — oxirida shu bilan aytiladi. */
let throttledRun = false;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? ' OK ' : 'XATO'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures += 1;
};

const stamp = Date.now();

async function call(path, { token, method = 'GET', body } = {}) {
  const started = performance.now();

  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token !== undefined ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await response.json().catch(() => null);

  return { status: response.status, ms: performance.now() - started, payload };
}

/** Foizli o'rin. Ro'yxat SARALANGAN bo'lishi kerak. */
function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);

  return sorted[index];
}

function report(label, samples, statuses) {
  const sorted = [...samples].sort((a, b) => a - b);
  const throttled = statuses.filter((status) => status === 429).length;
  const failed = statuses.filter((status) => status >= 400 && status !== 429).length;

  console.log(
    `  ${label}: n=${samples.length} · p50=${percentile(sorted, 50).toFixed(0)}ms · ` +
      `p95=${percentile(sorted, 95).toFixed(0)}ms · max=${Math.max(...sorted, 0).toFixed(0)}ms`,
  );

  return { throttled, failed };
}

// =====================================================================
// TAYYORGARLIK — o'lchanmaydi
// =====================================================================
console.log('=== Tayyorgarlik ===');

const adminLogin = await call('/auth/login', {
  method: 'POST',
  body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
});
const adminToken = adminLogin.payload?.accessToken;
check(typeof adminToken === 'string', 'admin kirdi', `${adminLogin.status}`);

/**
 * Tasdiqlangan diler yaratadi: ariza -> tasdiq -> kirish.
 *
 * Bu TAYYORGARLIK, o'lchanmaydi. Tasdiqlash admin API orqali —
 * bazaga qo'lda yozish `CLAUDE.md` §12 da taqiqlangan va darvoza
 * sharti ham aynan shuni rad etadi.
 */
async function makeDealer(suffix) {
  const digits = String(stamp + suffix * 7919).slice(-7);
  const registration = {
    companyName: `Yuk Sinov ${stamp}-${suffix}`,
    region: 'Toshkent',
    businessType: 'DISTRIBUTOR',
    contactName: 'Yuk Sinov',
    phone: `+99894${digits}`,
    email: `yuk-${stamp}-${suffix}@example.test`,
    password: 'Yuk-Sinov-Parol-2026',
  };

  const registered = await call('/dealers/register', { method: 'POST', body: registration });
  if (registered.status !== 202) {
    return { error: `ariza ${registered.status}`, registration };
  }

  const found = await call(
    `/admin/dealers?search=${encodeURIComponent(registration.companyName)}`,
    {
      token: adminToken,
    },
  );
  const id = found.payload?.items?.[0]?.id;
  if (typeof id !== 'string') return { error: 'diler topilmadi', registration };

  const approved = await call(`/admin/dealers/${id}/status`, {
    token: adminToken,
    method: 'PATCH',
    body: { status: 'APPROVED' },
  });
  if (approved.status !== 200) return { error: `tasdiq ${approved.status}`, registration };

  const login = await call('/auth/login', {
    method: 'POST',
    body: { email: registration.email, password: registration.password },
  });
  const token = login.payload?.accessToken;
  if (typeof token !== 'string') return { error: `kirish ${login.status}`, registration };

  const address = await call('/dealer/addresses', {
    token,
    method: 'POST',
    body: {
      label: 'Yuk sinov ombori',
      region: 'Toshkent',
      street: 'Sinov ko\u2018chasi 1',
      contactName: 'Yuk Qabul',
      contactPhone: registration.phone,
    },
  });
  const addressId = address.payload?.id;
  if (typeof addressId !== 'string') return { error: `manzil ${address.status}`, registration };

  return { token, addressId, registration };
}

/*
  BIR NECHTA DILER KERAK — VA BU SHART, QULAYLIK EMAS.

  Buyurtma SAVATDAN chiqadi va yuborilgach savat bo'shatiladi
  (S26), ya'ni BITTA diler bir vaqtda ikkita buyurtma bera OLMAYDI.
  Bitta diler bilan "parallel buyurtma" deb yozilgan har qanday
  o'lchov aslida KETMA-KET bo'lardi — men dastlab shunday yozib,
  bo'limni "bir vaqtda" deb nomlagan edim. Hisoblagich poygasi esa
  aynan HAQIQIY parallellikda ko'rinadi.

  DIQQAT: har bir diler bitta arizani sarflaydi va `POST
  /dealers/register` soatiga 5 ta. Ko'proq diler kerak bo'lsa
  cheklovni oshiring.
*/
const dealers = [];
for (let i = 0; i < ORDER_DEALERS; i += 1) {
  dealers.push(await makeDealer(i));
}

const ready = dealers.filter((dealer) => dealer.error === undefined);
check(
  ready.length === ORDER_DEALERS,
  'sinov dilerlari tayyor (ariza -> tasdiq -> kirish -> manzil)',
  `${ready.length}/${ORDER_DEALERS}${
    ready.length < ORDER_DEALERS
      ? ' · ' + dealers.find((dealer) => dealer.error !== undefined)?.error
      : ''
  }`,
);

const dealerToken = ready[0]?.token;

if (failures > 0) {
  console.log('\nTayyorgarlik yiqildi — o‘lchov o‘tkazilmaydi.');
  console.log(
    'Sabab `ariza 429` bo‘lsa: `POST /dealers/register` soatiga 5 ta va bu\n' +
      'yurish limitni tugatgan. Hisob instansiya XOTIRASIDA — API ni qayta\n' +
      'ishga tushirish uni nolga qaytaradi.',
  );
  process.exit(1);
}

// =====================================================================
// 1. KATALOG
// =====================================================================
console.log('\n=== 1. Katalog ===');
{
  // Isitish: birinchi so'rov keshni va ulanish hovuzini to'ldiradi.
  await call('/dealer/products?limit=24', { token: dealerToken });

  const samples = [];
  const statuses = [];
  let index = 0;

  const worker = async () => {
    while (index < CATALOG_REQUESTS) {
      index += 1;
      const result = await call('/dealer/products?limit=24', { token: dealerToken });
      samples.push(result.ms);
      statuses.push(result.status);
    }
  };

  const started = performance.now();
  await Promise.all(Array.from({ length: CATALOG_CONCURRENCY }, worker));
  const elapsed = performance.now() - started;

  const { throttled, failed } = report('katalog', samples, statuses);

  console.log(
    `  o‘tkazuvchanlik: ${((samples.length / elapsed) * 1000).toFixed(1)} so‘rov/s ` +
      `(${CATALOG_CONCURRENCY} ta parallel)`,
  );

  check(failed === 0, 'katalogda XATO javob yo‘q', `${failed} ta`);

  /*
    `429` O'LCHOVNI BUZADI, LEKIN NOSOZLIK EMAS.

    Cheklov ishlayotgani — bu TO'G'RI xatti-harakat (CLAUDE.md §12).
    Shuning uchun u alohida aytiladi va o'lchov "ishonchsiz" deb
    belgilanadi: aks holda p95 cheklovning tezligini ko'rsatib,
    ilova sekin degan xulosaga olib kelardi.
  */
  if (throttled > 0) {
    throttledRun = true;
    console.log(`  DIQQAT: ${throttled} ta javob 429 — o‘lchov ISHONCHSIZ.`);
    console.log('  Haqiqiy o‘lchov uchun API_RATE_LIMIT_MAX ni oshirib qayta yurgizing.');
  } else {
    check(
      percentile(
        [...samples].sort((a, b) => a - b),
        95,
      ) < 1000,
      'p95 < 1000ms',
    );
  }
}

// =====================================================================
// 2. BIR VAQTDA BUYURTMA — RAQAMLAR TAKRORLANMAYDIMI
// =====================================================================
/*
  CHEKLOVGA URILGAN BO'LSA — QOLGANI O'TKAZIB YUBORILADI.

  Men dastlab bu bo'limlarni baribir yurgizgan edim va natija
  CHALG'ITDI: katalog so'rovi `429` olgani uchun "narxi bor variant
  topilmadi" deb yozildi va sabab ilovada ko'rindi. Aslida sabab
  cheklov edi. Noto'g'ri sabab — yo'q sababdan yomonroq.
*/
console.log('\n=== 2. Bir vaqtda buyurtma ===');
if (throttledRun) {
  console.log('  O‘tkazib yuborildi: tezlik cheklovi o‘lchovni buzadi.');
} else {
  const catalog = await call('/dealer/products?limit=24', { token: dealerToken });
  const variant = catalog.payload?.items
    ?.flatMap((product) => product.variants ?? [])
    .find((item) => item.price !== null);

  check(variant !== undefined, 'narxi bor variant topildi');

  if (variant !== undefined && ready.length > 1) {
    const quantity = variant.minOrderQuantity ?? 1;

    // Savatlar KETMA-KET to'ldiriladi — bu tayyorgarlik, o'lchanmaydi.
    for (const dealer of ready) {
      await call('/dealer/cart/items', {
        token: dealer.token,
        method: 'POST',
        body: { variantId: variant.id, quantity },
      });
    }

    /*
      YUBORISH — BARCHASI BIRGA.

      Shu yerda yillik hisoblagich poygaga tushadi. "O'qi -> +1 ->
      yoz" yondashuvida ikkita diler bir xil raqam olardi; S26 da
      u `INSERT ... ON CONFLICT DO UPDATE RETURNING` bilan atomar
      qilingan va bu tekshiruv aynan o'sha da'voni sinaydi.
    */
    const results = await Promise.all(
      ready.map((dealer, index) =>
        call('/dealer/orders', {
          token: dealer.token,
          method: 'POST',
          body: {
            addressId: dealer.addressId,
            idempotencyKey: `${stamp}-parallel-${index}`,
          },
        }),
      ),
    );

    const samples = results.map((result) => result.ms);
    const statuses = results.map((result) => result.status);
    report('buyurtma (parallel)', samples, statuses);

    const numbers = results
      .map((result) => result.payload?.number)
      .filter((number) => typeof number === 'string');

    const unique = new Set(numbers);

    check(
      numbers.length === ready.length && unique.size === numbers.length,
      'bir vaqtda berilgan buyurtmalar TAKRORLANMAS raqam oldi',
      `${numbers.length} ta buyurtma · ${unique.size} ta noyob raqam · ${numbers.join(', ')}`,
    );

    const created = statuses.filter((status) => status === 201).length;
    check(created === ready.length, 'har bir buyurtma yaratildi', `${created}/${ready.length}`);
  } else {
    check(false, 'parallel buyurtma uchun kamida ikkita diler kerak');
  }
}

console.log('\n=== 3. Takroriy yuborish ===');
if (throttledRun) {
  console.log('  O‘tkazib yuborildi: tezlik cheklovi o‘lchovni buzadi.');
} else {
  const catalog = await call('/dealer/products?limit=24', { token: dealerToken });
  const variant = catalog.payload?.items
    ?.flatMap((product) => product.variants ?? [])
    .find((item) => item.price !== null);

  const addressId = ready[0]?.addressId;

  if (variant !== undefined && typeof addressId === 'string') {
    await call('/dealer/cart/items', {
      token: dealerToken,
      method: 'POST',
      body: { variantId: variant.id, quantity: variant.minOrderQuantity ?? 1 },
    });

    const key = `${stamp}-takror`;

    /*
      IKKALASI BIR VAQTDA — ketma-ket emas.

      Ketma-ket yuborish oson holat: birinchisi tugagan, ikkinchisi
      tayyor yozuvni ko'radi. Qiyini — POYGA: ikkalasi ham bir
      vaqtda `INSERT` qiladi va biri `P2002` oladi. S26 da aynan
      shu holat `500` qaytarardi va diler "buyurtma ketmadi" deb
      o'ylab qayta yuborardi.
    */
    const [first, second] = await Promise.all([
      call('/dealer/orders', {
        token: dealerToken,
        method: 'POST',
        body: { addressId, idempotencyKey: key },
      }),
      call('/dealer/orders', {
        token: dealerToken,
        method: 'POST',
        body: { addressId, idempotencyKey: key },
      }),
    ]);

    check(
      first.status < 400 && second.status < 400,
      'ikkala javob ham XATO EMAS',
      `${first.status} · ${second.status}`,
    );

    check(
      first.payload?.id !== undefined && first.payload?.id === second.payload?.id,
      'takroriy yuborish BITTA buyurtma yaratdi',
      `${first.payload?.number ?? '—'} · ${second.payload?.number ?? '—'}`,
    );
  } else {
    check(false, 'takror sinovi uchun variant yoki manzil topilmadi');
  }
}

console.log(`\nSINOV DILERLARI: Yuk Sinov ${stamp}-* (${ready.length} ta)`);
console.log('Tozalash: `node qa/cleanup-phase2.mjs` — u "Yuk Sinov" larni ham oladi.');
if (throttledRun) {
  console.log('\nNATIJA: O‘LCHOV BAJARILMADI — tezlik cheklovi.');
  console.log('Qayta yurgizing: API_RATE_LIMIT_MAX=100000 node dist/main.js');
  process.exit(2);
}

console.log(`\nNATIJA: ${failures === 0 ? 'SOG‘LIQ TEKSHIRUVI O‘TDI' : failures + ' ta muammo'}`);
process.exit(failures === 0 ? 0 : 1);
