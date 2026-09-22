/**
 * Testlar uchun muhit o'zgaruvchilari.
 *
 * `ConfigModule.forRoot()` modul IMPORT qilingan paytda ishlaydi, ya'ni
 * `beforeAll` dan oldin. Shuning uchun qiymatlar shu setup faylida — vitest
 * uni test fayllaridan avval yuklaydi — o'rnatiladi.
 *
 * Bu yerda faqat LOKAL, zararsiz qiymatlar turadi. Haqiqiy sirlar testlarga
 * hech qachon kirmaydi (CLAUDE.md §12).
 */
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'error';
process.env['API_PORT'] ??= '3000';
// Zaxira qiymatlar `docker-compose.yml` dagi ma'lumotlar bilan MOS bo'lishi
// kerak. Ilgari bu yerda parolsiz URL turardi va u lokal bazaning `trust`
// rejimi tufayli ishlayverardi — CI'da esa autentifikatsiya xatosi berardi.
process.env['DATABASE_URL'] ??=
  'postgresql://barff:barff_local_dev@127.0.0.1:5432/barff?schema=public';
process.env['REDIS_URL'] ??= 'redis://127.0.0.1:6379';
process.env['API_CORS_ORIGINS'] ??= 'http://localhost:3001';
process.env['SWAGGER_ENABLED'] ??= 'true';
process.env['JWT_ACCESS_SECRET'] ??= 'test-access-secret-kamida-32-belgi-uzunlikda';
process.env['JWT_REFRESH_SECRET'] ??= 'test-refresh-secret-kamida-32-belgi-uzunlikda';
process.env['JWT_ACCESS_TTL'] ??= '15m';
process.env['JWT_REFRESH_TTL'] ??= '30d';
