# --- build stage ---
FROM public.ecr.aws/docker/library/node:20-alpine AS build
WORKDIR /app

# Базовые утилиты + сертификаты, чтобы TLS не падал
RUN apk add --no-cache ca-certificates curl && update-ca-certificates

# PNPM
ENV PNPM_HOME=/root/.local/share/pnpm
RUN corepack enable

# Опционально можно передать альтернативный реестр: --build-arg NPM_REGISTRY=https://registry.npmjs.org/
ARG NPM_REGISTRY=https://registry.npmjs.org/
ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY}

# Скопируем только манифесты — это улучшает кеш сборки
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/

# Настроим pnpm на более выносливые сети
RUN pnpm config set registry ${NPM_REGISTRY} \
 && pnpm config set store-dir /root/.local/share/pnpm/store \
 && pnpm config set fetch-retries 5 \
 && pnpm config set fetch-retry-factor 2 \
 && pnpm config set fetch-retry-mintimeout 20000 \
 && pnpm config set fetch-retry-maxtimeout 120000 \
 && pnpm config set network-timeout 600000

# Предзагрузим tarball’ы в стор (меньше одновременных запросов), затем установим
RUN pnpm fetch || true
RUN pnpm install --frozen-lockfile

# Теперь переносим исходники
COPY apps/web apps/web
WORKDIR /app/apps/web

# Build-time env
ARG NEXT_PUBLIC_API_BASE=/api
ARG NEXT_PUBLIC_ENABLE_TELEGRAM=false
ARG NEXT_PUBLIC_ENABLE_GOOGLE=true
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_ENABLE_TELEGRAM=$NEXT_PUBLIC_ENABLE_TELEGRAM
ENV NEXT_PUBLIC_ENABLE_GOOGLE=$NEXT_PUBLIC_ENABLE_GOOGLE

RUN pnpm build

# --- runtime stage ---
FROM public.ecr.aws/docker/library/node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["sh","-c","[ -f apps/web/server.js ] && node apps/web/server.js || node apps/web/server.mjs"]
