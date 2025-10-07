# --- build stage ---
FROM public.ecr.aws/docker/library/node:20-alpine AS build
WORKDIR /app

# Утилиты + сертификаты для стабильного TLS
RUN apk add --no-cache ca-certificates curl && update-ca-certificates

# PNPM
ENV PNPM_HOME=/root/.local/share/pnpm
RUN corepack enable

# Опциональный реестр, можно переопределять через --build-arg
ARG NPM_REGISTRY=https://registry.npmjs.org/
ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY}

# Манифесты для кеша
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

# Настройки устойчивости pnpm
RUN pnpm config set registry ${NPM_REGISTRY} \
 && pnpm config set store-dir /root/.local/share/pnpm/store \
 && pnpm config set fetch-retries 5 \
 && pnpm config set fetch-retry-factor 2 \
 && pnpm config set fetch-retry-mintimeout 20000 \
 && pnpm config set fetch-retry-maxtimeout 120000 \
 && pnpm config set network-timeout 600000

# Предварительная закачка + установка
RUN pnpm fetch || true
RUN pnpm install --frozen-lockfile

# Исходники API и сборка
COPY apps/api apps/api
WORKDIR /app/apps/api
RUN pnpm build

# --- runtime stage ---
FROM public.ecr.aws/docker/library/node:20-alpine AS runtime
WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV PNPM_HOME=/root/.local/share/pnpm

COPY --from=build /root/.local/share/pnpm /root/.local/share/pnpm
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist

EXPOSE 4000
CMD ["node", "dist/main.js"]
