# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# 1. Устанавливаем системные зависимости (включая Rust для сборки WASM)
RUN apk add --no-cache ca-certificates curl wget build-base gcc curl \
    && update-ca-certificates

# Устанавливаем Rust и Cargo
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Устанавливаем wasm-pack
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Настройка PNPM
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 2. Копируем манифесты (Root + Web + Shared + Rust)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/username-generator/package.json packages/username-generator/

# 3. Устанавливаем JS зависимости
RUN pnpm install --frozen-lockfile

# 4. Копируем исходный код
COPY tsconfig.json .
COPY packages/shared packages/shared
COPY packages/username-generator packages/username-generator
COPY apps/web apps/web

# 5. БИЛД (Порядок важен!)

# A. Собираем Shared (типы)
RUN pnpm --filter @station-eden/shared build

# B. Собираем WASM (Rust)
# Мы запускаем скрипт из apps/web, он сам найдет код в packages/username-generator
WORKDIR /app/apps/web
RUN pnpm build:wasm

# C. Собираем Next.js
# Передаем ARG для сборки статики
ARG NEXT_PUBLIC_API_BASE=https://api.stationeden.ru
ARG NEXT_PUBLIC_WS_BASE=wss://api.stationeden.ru
ARG NEXT_PUBLIC_ENABLE_GOOGLE=true
ARG NEXT_PUBLIC_ASSETS_BASE=https://cdn.assets.stationeden.ru

ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_WS_BASE=$NEXT_PUBLIC_WS_BASE
ENV NEXT_PUBLIC_ENABLE_GOOGLE=$NEXT_PUBLIC_ENABLE_GOOGLE
ENV NEXT_PUBLIC_ASSETS_BASE=$NEXT_PUBLIC_ASSETS_BASE

RUN pnpm build

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache wget

# Переменные окружения для рантайма
ENV NEXT_PUBLIC_API_BASE=https://api.stationeden.ru
ENV NEXT_PUBLIC_WS_BASE=wss://api.stationeden.ru
ENV NEXT_PUBLIC_ENABLE_GOOGLE=true
ENV NEXT_PUBLIC_ASSETS_BASE=https://cdn.assets.stationeden.ru

# Копируем standalone сборку Next.js
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]