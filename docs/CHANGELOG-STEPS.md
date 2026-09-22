# QADAMLAR JURNALI

> `ROADMAP.md` §4: har tugallangan qadam uchun bitta qator.
>
> Format: `S00 | 2026-08-27 | bootstrap monorepo | PR #1 | notes: ...`

```
S00 | 2026-09-21 | bootstrap monorepo | branch step/S00-repo-bootstrap | notes: pnpm 10 + turbo 2; minio lokal S3 uchun; `docker compose up` bu muhitda sinalmagan (daemon yo'q), faqat `docker compose config` bilan sintaksis tekshirildi
S01 | 2026-09-21 | shared packages skeleton | branch step/S01-shared-packages | notes: @barff/{types,utils,validation,config}; CommonJS build (Next + Nest ikkalasi o'qiy oladi); 53 ta vitest testi; tailwind theme.css CSS-first preset, yashil rang hali REPLACE_WITH_REAL_DATA (Q2)
S02 | 2026-09-22 | nestjs api skeleton | branch step/S02-api-skeleton | notes: validatsiya class-validator emas, Zod orqali (S01 sxemalari server va klientda BITTA manba); readiness/liveness ajratilgan; rate limit instansiya xotirasida (Q19); API_TRUST_PROXY_HOPS qo'shildi (Q20); consistent-type-imports API'da o'chirilgan — u Nest DI metadata'sini buzadi
```
