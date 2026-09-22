# QADAMLAR JURNALI

> `ROADMAP.md` §4: har tugallangan qadam uchun bitta qator.
>
> Format: `S00 | 2026-08-27 | bootstrap monorepo | PR #1 | notes: ...`

```
S00 | 2026-09-21 | bootstrap monorepo | branch step/S00-repo-bootstrap | notes: pnpm 10 + turbo 2; minio lokal S3 uchun; `docker compose up` bu muhitda sinalmagan (daemon yo'q), faqat `docker compose config` bilan sintaksis tekshirildi
S01 | 2026-09-21 | shared packages skeleton | branch step/S01-shared-packages | notes: @barff/{types,utils,validation,config}; CommonJS build (Next + Nest ikkalasi o'qiy oladi); 53 ta vitest testi; tailwind theme.css CSS-first preset, yashil rang hali REPLACE_WITH_REAL_DATA (Q2)
S02 | 2026-09-22 | nestjs api skeleton | branch step/S02-api-skeleton | notes: validatsiya class-validator emas, Zod orqali (S01 sxemalari server va klientda BITTA manba); readiness/liveness ajratilgan; rate limit instansiya xotirasida (Q19); API_TRUST_PROXY_HOPS qo'shildi (Q20); consistent-type-imports API'da o'chirilgan — u Nest DI metadata'sini buzadi
S03 | 2026-09-22 | prisma core schema and seed | branch step/S03-prisma-core-schema | notes: sxema ildizdagi prisma/ da, klient packages/db/generated ga chiqadi (commit qilinmaydi); parollar argon2id, seed'da standart parol YO'Q — production'da SEED_ADMIN_PASSWORD majburiy; ruxsatlar katalogi @barff/types da yagona manba; VISITOR bazaga yozilmaydi; haqiqiy PostgreSQL 16 bilan migrate+seed noldan ikki marta sinaldi
S04 | 2026-09-22 | auth and server-side rbac | branch step/S04-auth-rbac | notes: endpoint'lar standart holatda YOPIQ (@Public() bilan ochiladi); ruxsatlar token ichidan emas, bazadan o'qiladi — rol o'zgarishi darhol kuchga kiradi; refresh rotation + qayta ishlatishni aniqlash (butun oila bekor bo'ladi); HttpOnly cookie; kirish urinishlari email va IP bo'yicha alohida cheklanadi (IP chegarasi NAT uchun ancha yuqori — Q21); 84 ta API testi, parol/token loglarga tushmasligi chiqish oqimini ushlab tekshiriladi
S05 | 2026-09-22 | ci pipeline and docker images | branch step/S05-ci-docker | notes: Dockerfile bookworm-slim (alpine emas — Prisma engine target), non-root; CI'da build seed'dan OLDIN (turbo Prisma klientini yaratadi, seed @barff/types dist'ini o'qiydi); deploy OIDC orqali, uzoq muddatli AWS kalitlarisiz; Next.js app Dockerfile'lari S06 da; tasvir lokalda qurilmadi (bu muhitda docker daemon yo'q), lekin CI'da muvaffaqiyatli qurildi va tekshirildi: non-root, native modullar yuklanadi, bazasiz ham ko'tariladi; CI 4 ta haqiqiy xatoni topdi — prettierignore, pnpm TTY, turbo env passthrough, modul qidirish katalogi
```
