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
