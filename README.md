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

| Buyruq             | Vazifasi                                 |
| ------------------ | ---------------------------------------- |
| `pnpm dev`         | barcha app'larni ishlab chiqish rejimida |
| `pnpm build`       | hammasini qurish                         |
| `pnpm lint`        | ESLint                                   |
| `pnpm typecheck`   | TypeScript tekshiruvi                    |
| `pnpm test`        | testlar                                  |
| `pnpm format`      | Prettier bilan formatlash                |
| `pnpm docker:up`   | lokal infratuzilma (detached)            |
| `pnpm docker:down` | infratuzilmani to'xtatish                |

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
prisma          sxema va migratsiyalar
infrastructure  IaC va deploy
docs            ochiq savollar, qadamlar jurnali
```

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

## Jonli sahifa haqida

Ildizdagi `index.html` va `CNAME` — `barff.uz` da **hozir ishlab turgan** "tez orada"
sahifasi (GitHub Pages). Ular platforma quriladigan vaqtda **tegilmaydi**; almashtirish
vaqti `docs/OPEN-QUESTIONS.md` dagi **Q1** savoliga bog'liq.

## Qoidalar

- `.env` hech qachon commit qilinmaydi; maxfiy qiymatlar AWS Secrets Manager'da.
- BARFF haqidagi faktlar o'ylab topilmaydi — `MOCK` / `REPLACE_WITH_REAL_DATA`
  belgisi qo'yiladi va savol `docs/OPEN-QUESTIONS.md` ga yoziladi.
- Bitta qadam = bitta branch = bitta PR (`step/S00-repo-bootstrap`).
