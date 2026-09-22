# syntax=docker/dockerfile:1.7
# =============================================================================
# BARFF API — production image
#
# BAZA TANLOVI: `bookworm-slim`, `alpine` emas. Prisma'ning standart query
# engine'i `debian-openssl-3.0.x` uchun qurilgan; Alpine (musl) da alohida
# binary target kerak bo'ladi va u jim ravishda mos kelmay qolishi mumkin.
# Tasvir hajmi biroz kattaroq, lekin ishga tushmaydigan kichik tasvirdan
# ishlaydigan kattasi afzal. Hajmni optimallashtirish — S40.
# =============================================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# openssl — Prisma query engine uchun; ca-certificates — HTTPS chaqiruvlar uchun.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable

# -----------------------------------------------------------------------------
# Qurish bosqichi
# -----------------------------------------------------------------------------
FROM base AS build
WORKDIR /repo

# Lockfile bilan aynan bir xil versiyalar o'rnatiladi: CI'da o'tgan narsa
# production'da boshqa versiya bilan qurilib qolmasligi kerak.
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile

# Prisma klienti va `@barff/api` ga kerakli barcha paketlar.
RUN pnpm db:generate
RUN pnpm --filter @barff/api... build

# devDependencies olib tashlanadi. `--frozen-lockfile` shu yerda ham:
# prune paytida versiya o'zgarib ketmasligi uchun.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --prod --ignore-scripts

# -----------------------------------------------------------------------------
# Ishga tushirish bosqichi
# -----------------------------------------------------------------------------
FROM base AS runtime
WORKDIR /repo

ENV NODE_ENV=production
# Konteyner ichida tashqaridan kelinadigan interfeysga bog'lanish shart.
ENV API_PORT=3000

COPY --from=build --chown=node:node /repo ./

# ROOT EMAS. Konteyner buzilgan taqdirda ham hujumchi root huquqini olmaydi.
USER node

EXPOSE 3000

# Healthcheck ORKESTRATOR darajasida (ECS task definition) sozlanadi —
# u yerda timeout va qayta urinishlar birga boshqariladi. Bu yerdagi
# HEALTHCHECK faqat `docker run` bilan lokal sinov uchun.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Nest `enableShutdownHooks()` bilan SIGTERM'ni o'zi ushlaydi, shuning uchun
# qo'shimcha init jarayoni kerak emas. Agar kelajakda zombi jarayonlar paydo
# bo'lsa, ECS'da `initProcessEnabled: true` yoqiladi.
CMD ["node", "services/api/dist/main.js"]
