# syntax=docker/dockerfile:1.7
# =============================================================================
# BARFF diler portali (partner.barff.uz) — production image
#
# `output: 'standalone'` bilan Next.js faqat kerakli fayllarni yig'ib beradi,
# shuning uchun ishga tushirish bosqichiga butun `node_modules` ko'chirilmaydi.
# =============================================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS build
WORKDIR /repo

# pnpm dev -> prod o'tishida TTY so'ramasligi uchun.
ENV CI=true

# `NEXT_PUBLIC_*` qurish paytida bundle ichiga yoziladi. Standart qiymatlar
# faqat build o'tishi uchun; haqiqiy qiymatni `--build-arg` bilan bering.
ARG NEXT_PUBLIC_API_BASE_URL=https://api.example.invalid/api/v1
ARG NEXT_PUBLIC_SITE_URL=https://example.invalid
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile

# `@barff/dealer...` — ilovaning o'zi va u bog'liq bo'lgan paketlar.
RUN pnpm --filter @barff/dealer... build

# -----------------------------------------------------------------------------
FROM base AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3003
ENV HOSTNAME=0.0.0.0

# Standalone chiqishi o'z ichiga kerakli `node_modules` ni oladi.
COPY --from=build --chown=node:node /repo/apps/dealer/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/dealer/.next/static ./apps/dealer/.next/static

USER node

EXPOSE 3003

CMD ["node", "apps/dealer/server.js"]
