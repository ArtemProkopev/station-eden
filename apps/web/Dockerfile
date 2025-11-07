# --- build stage ---
FROM public.ecr.aws/docker/library/node:20-alpine AS build
WORKDIR /app

RUN apk add --no-cache ca-certificates curl wget && update-ca-certificates
ENV PNPM_HOME=/root/.local/share/pnpm
RUN corepack enable

ARG NPM_REGISTRY=https://registry.npmjs.org/
ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY}

# манифесты
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/

# настройки pnpm
RUN pnpm config set registry ${NPM_REGISTRY} \
 && pnpm config set store-dir /root/.local/share/pnpm/store \
 && pnpm config set fetch-retries 5 \
 && pnpm config set fetch-retry-factor 2 \
 && pnpm config set fetch-retry-mintimeout 20000 \
 && pnpm config set fetch-retry-maxtimeout 120000 \
 && pnpm config set network-timeout 600000

RUN pnpm fetch || true
RUN pnpm install --frozen-lockfile

# исходники web
COPY apps/web apps/web
WORKDIR /app/apps/web

# ---- build-time args / env ----
# ЖЕСТКО ПРОПИСЫВАЕМ ПЕРЕМЕННЫЕ ДЛЯ PRODUCTION
ARG NEXT_PUBLIC_API_BASE=https://api.stationeden.ru
ARG NEXT_PUBLIC_WS_BASE=wss://api.stationeden.ru
ARG NEXT_PUBLIC_ENABLE_TELEGRAM=false
ARG NEXT_PUBLIC_ENABLE_GOOGLE=true
ARG NEXT_PUBLIC_ASSETS_BASE=https://cdn.assets.stationeden.ru

ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_WS_BASE=$NEXT_PUBLIC_WS_BASE
ENV NEXT_PUBLIC_ENABLE_TELEGRAM=$NEXT_PUBLIC_ENABLE_TELEGRAM
ENV NEXT_PUBLIC_ENABLE_GOOGLE=$NEXT_PUBLIC_ENABLE_GOOGLE
ENV NEXT_PUBLIC_ASSETS_BASE=$NEXT_PUBLIC_ASSETS_BASE

# диагностика
RUN echo "BUILD ENV:"
RUN echo "NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE"
RUN echo "NEXT_PUBLIC_WS_BASE=$NEXT_PUBLIC_WS_BASE"
RUN echo "NEXT_PUBLIC_ASSETS_BASE=$NEXT_PUBLIC_ASSETS_BASE"

RUN pnpm build

# --- runtime stage ---
FROM public.ecr.aws/docker/library/node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Устанавливаем wget для healthcheck
RUN apk add --no-cache wget

# ЖЕСТКО ПРОПИСЫВАЕМ ПЕРЕМЕННЫЕ ДЛЯ RUNTIME
ENV NEXT_PUBLIC_API_BASE=https://api.stationeden.ru
ENV NEXT_PUBLIC_WS_BASE=wss://api.stationeden.ru
ENV NEXT_PUBLIC_ENABLE_TELEGRAM=false
ENV NEXT_PUBLIC_ENABLE_GOOGLE=true
ENV NEXT_PUBLIC_ASSETS_BASE=https://cdn.assets.stationeden.ru

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["sh","-c","[ -f apps/web/server.js ] && node apps/web/server.js || node apps/web/server.mjs"]