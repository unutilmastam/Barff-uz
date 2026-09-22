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
process.env['REDIS_URL'] ??= 'redis://127.0.0.1:6379';
process.env['API_CORS_ORIGINS'] ??= 'http://localhost:3001';
process.env['SWAGGER_ENABLED'] ??= 'true';
