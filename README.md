# BARFF Platform

BARFF ichimlik ishlab chiqaruvchisi uchun platforma: ommaviy sayt, diler portali,
admin CMS, haydovchi PWA va backend API.

Arxitektura va qoidalar: **[`CLAUDE.md`](./CLAUDE.md)** (yagona haqiqat manbai).
Qurilish tartibi va holat: **[`ROADMAP.md`](./ROADMAP.md)**.

---

## Talablar

| Vosita | Versiya                                        |
| ------ | ---------------------------------------------- |
| Node   | >= 22                                          |
| pnpm   | 10.x                                           |
| Docker | Compose v2+ (lokal Postgres/Redis/MinIO uchun) |

```bash
corepack enable          # pnpm o'rnatilmagan bo'lsa
```

## Ishga tushirish

```bash
pnpm install             # bog'liqliklar
cp .env.example .env     # qiymatlarni to'ldiring (.env commit QILINMAYDI)
pnpm docker:up           # postgres + redis + minio
pnpm dev                 # barcha app'lar (turbo)
```

## Skriptlar

| Buyruq             | Vazifasi                                  |
| ------------------ | ----------------------------------------- |
| `pnpm dev`         | barcha app'larni ishlab chiqish rejimida  |
| `pnpm build`       | hammasini qurish                          |
| `pnpm lint`        | ESLint                                    |
| `pnpm typecheck`   | TypeScript tekshiruvi                     |
| `pnpm test`        | testlar                                   |
| `pnpm format`      | Prettier bilan formatlash                 |
| `pnpm docker:up`   | lokal infratuzilma (detached)             |
| `pnpm docker:down` | infratuzilmani to'xtatish                 |
| `pnpm db:generate` | Prisma klientini qayta yaratish           |
| `pnpm db:migrate`  | yangi migratsiya yaratish va qo'llash     |
| `pnpm db:deploy`   | mavjud migratsiyalarni qo'llash (CI/prod) |
| `pnpm db:reset`    | bazani tozalab, qaytadan qurish           |
| `pnpm db:seed`     | boshlang'ich ma'lumotlar                  |
| `pnpm db:studio`   | Prisma Studio                             |

## Portlar

| Xizmat           | Port | Manzil                            |
| ---------------- | ---- | --------------------------------- |
| API (NestJS)     | 3000 | http://localhost:3000/api/v1      |
| Swagger          | 3000 | http://localhost:3000/api/v1/docs |
| Web (`barff.uz`) | 3001 | http://localhost:3001             |
| Dealer           | 3002 | http://localhost:3002             |
| Admin            | 3003 | http://localhost:3003             |
| Delivery PWA     | 3004 | http://localhost:3004             |
| PostgreSQL       | 5432 | —                                 |
| Redis            | 6379 | —                                 |
| MinIO (S3)       | 9000 | http://localhost:9000             |
| MinIO konsoli    | 9001 | http://localhost:9001             |

> Web/dealer/admin/delivery portlari S06 va keyingi qadamlarda app'lar qo'shilgach biriktiriladi.

## Struktura

```
apps/web        ommaviy sayt        barff.uz
apps/dealer     diler portali       partner.barff.uz
apps/admin      admin CMS           admin.barff.uz
apps/delivery   haydovchi PWA       delivery.barff.uz
services/api    NestJS API          api.barff.uz
packages/ui     dizayn tizimi
packages/types  umumiy TS tiplari
packages/config eslint/tsconfig/tailwind presetlari
packages/validation  Zod sxemalari
packages/utils  yordamchi funksiyalar
packages/db     Prisma klienti (generatsiya qilinadi)
prisma          sxema va migratsiyalar
infrastructure  IaC va deploy
docs            ochiq savollar, qadamlar jurnali
```

## Ma'lumotlar bazasi

Sxema va migratsiyalar repo ildizidagi `prisma/` da. Generatsiya qilingan
klient `packages/db/generated/` ga chiqadi va **commit qilinmaydi** — uni
`pnpm db:generate` qayta yaratadi (turbo `build` zanjirida avtomatik ishlaydi).

Ilovalar `@prisma/client` ni to'g'ridan-to'g'ri import qilmaydi:

```ts
import { PrismaClient, type User } from '@barff/db';
```

### Noldan qurish

```bash
pnpm docker:up                    # postgres + redis + minio
cp .env.example .env              # DATABASE_URL va DATABASE_SHADOW_URL ni to'ldiring
pnpm db:deploy                    # migratsiyalarni qo'llash
SEED_ADMIN_EMAIL=siz@barff.uz pnpm db:seed
```

`db:seed` **idempotent** — qayta ishga tushirilsa mavjud yozuvlarni buzmaydi
va admin parolini o'zgartirmaydi.

### Admin foydalanuvchisi

Kodda standart parol **yo'q**: u production'ga ko'chib o'tib, hammaga ma'lum
bo'lib qolardi (CLAUDE.md §12). Shuning uchun:

| Holat                                      | Nima bo'ladi                                             |
| ------------------------------------------ | -------------------------------------------------------- |
| `SEED_ADMIN_EMAIL` berilmagan              | admin yaratilmaydi, seed davom etadi                     |
| `SEED_ADMIN_PASSWORD` berilgan             | o'sha parol argon2id bilan hashlanadi                    |
| parol berilmagan, `NODE_ENV != production` | bir martalik tasodifiy parol yaratilib, konsolga chiqadi |
| parol berilmagan, `NODE_ENV = production`  | seed **xato bilan to'xtaydi**                            |

Parollar faqat argon2id hash ko'rinishida saqlanadi — ochiq parol hech qayerda
yozilmaydi.

### Seed nimani yaratadi

- 37 ta ruxsat (`@barff/types` dagi `PERMISSIONS` katalogidan)
- 6 ta rol: `ADMIN, SALES, WAREHOUSE, LOGISTICS, DRIVER, DEALER` va ularning
  standart ruxsatlari (`DEFAULT_ROLE_PERMISSIONS`)
- 3 ta tizim sozlamasi — qiymatlari hozircha `MOCK` / `REPLACE_WITH_REAL_DATA`

`VISITOR` bazaga yozilmaydi: u autentifikatsiyasiz mehmon holati, biriktirib
bo'ladigan rol emas.

> Rol-ruxsat jadvali seed'dan keyin CMS orqali o'zgartirilishi mumkin, shuning
> uchun kod avtorizatsiyani **bazadagi holatga** qarab hal qiladi, hech qachon
> `DEFAULT_ROLE_PERMISSIONS` konstantasiga qarab emas.

## API'ni lokal ishga tushirish

```bash
pnpm docker:up                    # postgres + redis + minio
cp .env.example .env              # qiymatlarni to'ldiring
pnpm --filter @barff/api dev      # http://localhost:3000/api/v1
```

Tekshirish:

| Yo'l                | Nima qiladi                                                  |
| ------------------- | ------------------------------------------------------------ |
| `GET /health`       | liveness — process tirikmi (tashqi bog'liqliklarga tegmaydi) |
| `GET /health/ready` | readiness — bog'liqliklar ishlayaptimi; nosozlikda `503`     |
| `GET /docs`         | Swagger UI                                                   |
| `GET /docs-json`    | OpenAPI hujjati (JSON)                                       |

Liveness va readiness ATAYLAB ajratilgan: Redis uzilganda readiness `503`
qaytarib instansiyani rotatsiyadan chiqaradi, liveness esa `200` bo'lib qoladi —
aks holda orkestrator konteynerni bekorga qayta ishga tushiraverardi.

### Muhim muhit o'zgaruvchilari

| O'zgaruvchi            | Izoh                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `REDIS_URL`            | majburiy — bo'lmasa API ishga tushmaydi (fail fast)                                 |
| `API_CORS_ORIGINS`     | vergul bilan ajratilgan ro'yxat; bo'sh bo'lsa brauzer so'rovlari o'tmaydi           |
| `API_TRUST_PROXY_HOPS` | API oldidagi proksi soni (Cloudflare + ALB = 2, lokalda 0) — pastdagi izohga qarang |
| `SWAGGER_ENABLED`      | berilmasa: production'da o'chiq, qolgan joyda yoniq                                 |

`API_TRUST_PROXY_HOPS` ni to'g'ri qo'yish muhim: qiymat haqiqiydan **katta**
bo'lsa, mijoz `X-Forwarded-For` ni o'zi yozib rate limiter'ni chetlab o'tadi;
**kichik** bo'lsa — barcha foydalanuvchilar bitta proksi IP'si ostida
birlashib, bir-birining limitini yeydi.

## Autentifikatsiya va RBAC

Endpoint'lar **standart holatda yopiq**: `JwtAuthGuard` global guard sifatida
ishlaydi, ochiq qilish uchun esa `@Public()` kerak. Ya'ni yangi endpoint
qo'shganda himoyani unutib bo'lmaydi — aksincha, ochishni unutish mumkin,
bu esa ancha xavfsiz xato turi.

```ts
@Roles('ADMIN', 'SALES')          // sanab o'tilganlardan kamida bittasi
@Permissions('orders.manage')     // sanab o'tilganlarning BARCHASI
```

Uchta qoida diqqatga loyiq:

1. **Ruxsatlar token ichidan O'QILMAYDI.** Access token'da `roles` bor, lekin
   guard'lar har so'rovda bazadan (qisqa muddatli kesh orqali) o'qiydi.
   Shuning uchun admin rolni olib tashlasa, o'zgarish token muddati tugashini
   kutmasdan darhol kuchga kiradi.
2. **Refresh rotation + qayta ishlatishni aniqlash.** Har refresh'da yangi
   juftlik beriladi, eskisi darhol bekor bo'ladi. Allaqachon ishlatilgan token
   qayta kelsa, bu o'g'irlanish belgisi deb hisoblanib, o'sha sessiyaning
   **barcha** token'lari bekor qilinadi.
3. **Xato xabarlari ma'lumot sizdirmaydi.** "Foydalanuvchi topilmadi" va
   "parol noto'g'ri" javoblari bir xil; mavjud bo'lmagan email uchun ham
   argon2 ishlatiladi, shunda javob vaqti farq qilmaydi.

Token'lar brauzerga **HttpOnly** cookie orqali beriladi — JavaScript ularni
o'qiy olmaydi, ya'ni XSS token'ni o'g'irlay olmaydi. Refresh cookie faqat
`/api/v1/auth` yo'liga yuboriladi.

Kirish urinishlari email va IP bo'yicha alohida cheklanadi. Bu S02 dagi umumiy
rate limiter'dan farq qiladi: u so'rovlar **sonini** cheklaydi, bu esa faqat
**muvaffaqiyatsiz** kirishlarni hisoblaydi, shuning uchun to'g'ri parol bilan
kirayotgan foydalanuvchi bloklanmaydi.

Kirish, chiqish, token yangilash, qayta ishlatish aniqlanishi va rol
o'zgarishi audit jurnaliga yoziladi (CLAUDE.md §23). Parol va token'lar
jurnalga ham, loglarga ham **hech qachon** tushmaydi — buni testlar chiqish
oqimlarini ushlab turib tekshiradi.

## Jonli sahifa haqida

Ildizdagi `index.html` va `CNAME` — `barff.uz` da **hozir ishlab turgan** "tez orada"
sahifasi (GitHub Pages). Ular platforma quriladigan vaqtda **tegilmaydi**; almashtirish
vaqti `docs/OPEN-QUESTIONS.md` dagi **Q1** savoliga bog'liq.

## Qoidalar

- `.env` hech qachon commit qilinmaydi; maxfiy qiymatlar AWS Secrets Manager'da.
- BARFF haqidagi faktlar o'ylab topilmaydi — `MOCK` / `REPLACE_WITH_REAL_DATA`
  belgisi qo'yiladi va savol `docs/OPEN-QUESTIONS.md` ga yoziladi.
- Bitta qadam = bitta branch = bitta PR (`step/S00-repo-bootstrap`).
