/*
  ADMIN XODIMLAR TEKSHIRUVI (A02).

  Brauzerda, haqiqiy administrator kabi:
    xodim yaratish -> u kira oladi -> rolni almashtirish -> parolni
    yangilash (eski parol ishlamaydi) -> bloklash (kira olmaydi)
    -> o'zini bloklashga urinish rad etiladi.

  Yaratilgan xodimlar oxirida BLOKLANADI (o'chirish yo'q: audit
  jurnalidagi havolalar buzilmasligi uchun, CLAUDE.md §23).

    ADMIN_PASSWORD="..." node qa/admin-users-check.mjs
*/
import AxeBuilder from '@axe-core/playwright';
import { chromium, request } from 'playwright';

const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:3002';
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@barff.uz';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (ADMIN_PASSWORD === undefined) {
  console.error('XATO: `ADMIN_PASSWORD` berilishi shart (CLAUDE.md §12).');
  process.exit(2);
}

const stamp = Date.now();
const email = `qa-users-${stamp}@barff.uz`;
const problems = [];
let failed = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${ok ? '' : ` — ${extra}`}`);
  if (!ok) failed += 1;
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
// Kutilgan rad etishlar (409/403/401) xato emas: ularni skript o'zi qo'zg'atadi.
const expected = [];
page.on('response', async (r) => {
  if (process.env.DEBUG_NET && r.request().method() !== 'GET')
    console.log(
      'NET',
      r.request().method(),
      r.url().split('/api/v1')[1],
      r.status(),
      r.request().headers()['authorization'] ?? '(cookie)',
      (await r.text().catch(() => '')).slice(0, 80),
    );
  if (r.status() >= 400 && r.url().includes('/api/v1/')) {
    expected.push(`${r.status()} ${r.url().replace(API, '')}`);
  }
});

// ALOHIDA kontekst: `page.request` brauzer cookie'lari bilan BO'LISHADI, ya'ni
// xodim sifatida kirish administrator sessiyasini jimgina almashtirib yuborardi.
const anonymous = await request.newContext();
const login = (e, p) => anonymous.post(`${API}/auth/login`, { data: { email: e, password: p } });
const api = async (path, init) => (await page.request.fetch(`${API}${path}`, init)).json();

let userId = null;
const password1 = 'Qa-Xodim-Parol-2026';
const password2 = 'Qa-Xodim-Yangi-2026';

try {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Kirish' }).click();
  await page.waitForURL(`${ADMIN_URL}/`, { timeout: 20000 });
  check(true, 'admin panelga kirdi');

  console.log('\n=== 1. Yaratish ===');
  await page.goto(`${ADMIN_URL}/system/users`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Yangi xodim' }).click();
  let dialog = page.getByRole('dialog');
  const suggested = await dialog.getByLabel(/^Parol/).inputValue();
  check(suggested.length >= 10, 'parol avtomatik yaratildi (≥10 belgi)', suggested);

  // Rol tanlanmasa — saqlanmaydi
  await dialog.getByLabel('To‘liq ismi').fill('QA Xodim');
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByLabel(/^Parol/).fill(password1);
  await dialog.getByRole('button', { name: 'Saqlash' }).click();
  await dialog
    .getByRole('alert')
    .filter({ hasText: 'Kamida bitta rol' })
    .waitFor({ timeout: 5000 });
  check(true, 'rolsiz xodim rad etildi');

  await dialog.getByLabel('Omborchi').click();
  await dialog.getByRole('button', { name: 'Saqlash' }).click();
  await page.getByText(email).first().waitFor({ timeout: 10000 });
  check(true, 'xodim ro‘yxatda ko‘rindi');

  const list = await api('/admin/users?limit=100');
  const created = list.items.find((u) => u.email === email);
  userId = created?.id ?? null;
  check(
    created?.roles.join() === 'WAREHOUSE',
    'serverda WAREHOUSE roli bilan',
    JSON.stringify(created),
  );
  check(!JSON.stringify(list).includes('passwordHash'), 'javobda parol hash’i yo‘q');

  const loginOk = await login(email, password1);
  check(loginOk.status() === 200, 'yangi xodim kira oldi', String(loginOk.status()));

  console.log('\n=== 2. Rolni almashtirish ===');
  const row = page.locator('tr', { hasText: email });
  await row.getByRole('button', { name: 'Tahrirlash' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Omborchi').click(); // olib tashlaydi
  await dialog.getByLabel('Logist').click();
  await dialog.getByRole('button', { name: 'Saqlash' }).click();
  await row.getByText('Logist').waitFor({ timeout: 10000 });
  const afterRole = (await api('/admin/users?limit=100')).items.find((u) => u.id === userId);
  check(
    afterRole.roles.join() === 'LOGISTICS',
    'rol LOGISTICS ga almashdi',
    afterRole.roles.join(),
  );

  console.log('\n=== 3. Parol ===');
  await row.getByRole('button', { name: 'Parol' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Yangi parol').fill('qisqa');
  await dialog.getByRole('button', { name: 'Parolni almashtirish' }).click();
  await dialog.getByRole('alert').waitFor({ timeout: 5000 });
  check(true, 'qisqa parol rad etildi');
  await dialog.getByLabel('Yangi parol').fill(password2);
  await dialog.getByRole('button', { name: 'Parolni almashtirish' }).click();
  await page.getByText('Parol yangilandi').waitFor({ timeout: 10000 });
  check((await login(email, password1)).status() === 401, 'eski parol ishlamaydi');
  check((await login(email, password2)).status() === 200, 'yangi parol ishlaydi');

  console.log('\n=== 4. Bloklash ===');
  await row.getByRole('button', { name: 'Tahrirlash' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Faol').click();
  await dialog.getByRole('button', { name: 'Saqlash' }).click();
  await row.getByText('Bloklangan').waitFor({ timeout: 10000 });
  const blocked = await login(email, password2);
  check(blocked.status() === 403, 'bloklangan xodim kira olmaydi', String(blocked.status()));

  console.log('\n=== 5. O‘zini bloklash (rad etilishi kerak) ===');
  const me = page.locator('tr', { hasText: ADMIN_EMAIL });
  await me.getByRole('button', { name: 'Tahrirlash' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Faol').click();
  await dialog.getByRole('button', { name: 'Saqlash' }).click();
  await dialog.getByRole('alert').filter({ hasText: 'bloklab bo' }).waitFor({ timeout: 5000 });
  check(true, 'o‘zini bloklash 409 bilan rad etildi');
  await dialog.getByRole('button', { name: 'Bekor qilish' }).click();

  console.log('\n=== 6. Qulaylik ===');
  for (const [name, theme, viewport] of [
    ['xodimlar-light', 'light', { width: 1440, height: 1000 }],
    ['xodimlar-dark', 'dark', { width: 1440, height: 1000 }],
    ['xodimlar-mobil', 'light', { width: 390, height: 844 }],
  ]) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(`${ADMIN_URL}/system/users`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Xodimlar' }).waitFor();
    await page.waitForTimeout(500);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    check(violations.length === 0, `axe ${name}`, violations.map((v) => v.id).join(','));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(overflow <= 0, `${name}: gorizontal skroll yo‘q`, `${overflow}px`);
  }
} catch (error) {
  check(false, 'skript yiqildi', String(error).split('\n')[0]);
  await page
    .screenshot({ path: '/tmp/claude-0/admin-users-fail.png', fullPage: true })
    .catch(() => {});
} finally {
  if (userId !== null) {
    await page.request
      .patch(`${API}/admin/users/${userId}`, { data: { isActive: false } })
      .catch(() => {});
  }
  await browser.close();
}

console.log('\n=== Konsol/tarmoq ===');
// Kutilgan rad etishlar: 400 (qisqa parol), 409 (o'zini bloklash), 403/401 (login tekshiruvlari).
const unexpected = problems.filter((p) => !/status of (400|401|403|409)/.test(p));
check(unexpected.length === 0, 'kutilmagan konsol xatolari yo‘q', unexpected.join(' | '));
const surprising = expected.filter((e) => !/^(400|401|403|409) /.test(e));
check(surprising.length === 0, 'kutilmagan HTTP xatolari yo‘q', surprising.join(' | '));
console.log(failed === 0 ? '\nHAMMASI O‘TDI' : `\n${failed} TA TEKSHIRUV YIQILDI`);
process.exit(failed === 0 ? 0 : 1);
