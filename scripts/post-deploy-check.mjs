/*
  DEPLOYDAN KEYINGI TEKSHIRUV.

  Joylangandan so'ng "ishlayaptimi" degan savolga ko'z bilan emas, so'rov
  bilan javob beradi. Faqat ommaviy manzillar tekshiriladi; hech narsa
  o'zgartirilmaydi.

    node scripts/post-deploy-check.mjs                       # barff.uz
    node scripts/post-deploy-check.mjs --domain boshqa.uz
    node scripts/post-deploy-check.mjs --local               # localhost portlar (rep. uchun)
    ADMIN_EMAIL=.. ADMIN_PASSWORD=.. node scripts/post-deploy-check.mjs   # kirish + cookie bayroqlari

  Chiqish kodi 0 — hammasi joyida.
*/
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const local = args.includes('--local');
const domain = flag('domain') ?? 'barff.uz';

const urls = local
  ? {
      api: 'http://localhost:3000',
      web: 'http://localhost:3001',
      admin: 'http://localhost:3002',
      dealer: 'http://localhost:3003',
      delivery: 'http://localhost:3004',
    }
  : {
      api: `https://api.${domain}`,
      web: `https://${domain}`,
      admin: `https://admin.${domain}`,
      dealer: `https://partner.${domain}`,
      delivery: `https://delivery.${domain}`,
    };

let failed = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${ok ? '' : ` — ${extra}`}`);
  if (!ok) failed += 1;
};

async function get(url, init = {}) {
  try {
    return await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...init });
  } catch (error) {
    return {
      status: 0,
      headers: new Headers(),
      text: async () => '',
      error: String(error.cause ?? error),
    };
  }
}

console.log(`\nTekshiruv: ${local ? 'lokal' : domain}\n`);

console.log('=== API ===');
const ready = await get(`${urls.api}/api/v1/health/ready`);
check(
  ready.status === 200,
  '/health/ready 200 (baza ulangan)',
  `${ready.status} ${ready.error ?? ''}`,
);

const list = await get(`${urls.api}/api/v1/products?limit=1`);
const body = list.status === 200 ? await list.json() : null;
check(list.status === 200, 'mahsulotlar ro‘yxati ochiladi', String(list.status));

const docs = await get(`${urls.api}/api/docs`);
check(
  docs.status === 404 || docs.status === 401,
  'Swagger production’da yopiq',
  String(docs.status),
);

for (const [name, origin] of Object.entries({
  sayt: urls.web,
  admin: urls.admin,
  diler: urls.dealer,
  haydovchi: urls.delivery,
})) {
  const res = await get(`${urls.api}/api/v1/products?limit=1`, { headers: { Origin: origin } });
  check(
    res.headers.get('access-control-allow-origin') === origin,
    `CORS: ${name} (${origin}) ruxsat etilgan`,
    'API_CORS_ORIGINS da yo‘q — kirish JIM ishlamaydi',
  );
}
const foreign = await get(`${urls.api}/api/v1/products?limit=1`, {
  headers: { Origin: 'https://begona.example' },
});
check(
  foreign.headers.get('access-control-allow-origin') === null,
  'CORS: begona manba rad etiladi',
);

console.log('\n=== Ommaviy sayt ===');
const home = await get(`${urls.web}/uz`);
const html = home.status === 200 ? await home.text() : '';
check(home.status === 200, '/uz 200', String(home.status));
check(
  !/localhost:\d{4}/.test(html),
  'sahifada lokal manzil yo‘q',
  'bundle noto‘g‘ri manzil bilan yig‘ilgan',
);

const css = html.match(/\/_next\/static\/css\/[a-z0-9]+\.css/)?.[0];
if (css !== undefined) {
  const res = await get(`${urls.web}${css}`);
  check(res.status === 200, 'CSS fayli 200 (uslubsiz sahifa emas)', String(res.status));
} else {
  check(false, 'CSS havolasi topildi', 'HTML da /_next/static/css yo‘q');
}

for (const path of ['/robots.txt', '/sitemap.xml', '/ru', '/en']) {
  const res = await get(`${urls.web}${path}`);
  check(res.status === 200, `${path} 200`, String(res.status));
}

const robots = await (await get(`${urls.web}/robots.txt`)).text();
console.log(
  `     robots.txt: ${/Disallow:\s*\/\s*$/m.test(robots) ? 'QIDIRUV TIZIMLARIGA YOPIQ (NEXT_PUBLIC_ALLOW_INDEXING=false)' : 'ochiq'}`,
);

const firstImage = body?.items?.[0]?.images?.[0]?.sources?.find((s) => s.format === 'webp')?.url;
if (firstImage !== undefined) {
  const res = await get(firstImage);
  check(
    res.status === 200 && (res.headers.get('content-type') ?? '').startsWith('image/'),
    'mahsulot rasmi ochiladi',
    `${res.status} ${firstImage}`,
  );
} else {
  console.log('     (mahsulot rasmi yo‘q — rasm tekshiruvi o‘tkazib yuborildi)');
}

console.log('\n=== Admin / diler / haydovchi ===');
for (const [name, base] of [
  ['admin', urls.admin],
  ['diler', urls.dealer],
  ['haydovchi', urls.delivery],
]) {
  const res = await get(`${base}/login`);
  check(res.status === 200, `${name} /login 200`, String(res.status));
}
const adminLogin = await get(`${urls.admin}/login`);
check(
  /noindex/i.test(adminLogin.headers.get('x-robots-tag') ?? ''),
  'admin qidiruv tizimlaridan yashirin (X-Robots-Tag)',
);
for (const path of ['/sw.js', '/manifest.webmanifest']) {
  const res = await get(`${urls.delivery}${path}`);
  check(res.status === 200, `haydovchi ${path} 200 (ilova o‘rnatilishi uchun)`, String(res.status));
}

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (email !== undefined && password !== undefined) {
  console.log('\n=== Kirish ===');
  const res = await get(`${urls.api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: urls.admin },
    body: JSON.stringify({ email, password }),
  });
  check(res.status === 200, 'administrator kira oldi', String(res.status));
  const cookies = res.headers.getSetCookie?.() ?? [];
  check(cookies.length >= 2, 'ikkala cookie qaytdi (access + refresh)', String(cookies.length));
  if (!local) {
    check(
      cookies.every((c) => /;\s*Secure/i.test(c)),
      'cookie’lar Secure',
    );
    check(
      cookies.every((c) => /;\s*HttpOnly/i.test(c)),
      'cookie’lar HttpOnly',
    );
    check(
      cookies.every((c) => new RegExp(`Domain=\\.?${domain.replace('.', '\\.')}`, 'i').test(c)),
      `cookie domeni .${domain}`,
    );
  }
}

console.log(failed === 0 ? '\nHAMMASI JOYIDA' : `\n${failed} TA TEKSHIRUV YIQILDI`);
process.exit(failed === 0 ? 0 : 1);
