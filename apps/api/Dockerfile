# ... (Build stage без изменений) ...
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache ca-certificates curl wget && update-ca-certificates
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/username-generator/package.json packages/username-generator/
RUN pnpm install --frozen-lockfile
COPY tsconfig.json .
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @station-eden/shared build

# Сборка API с Webpack (теперь с бандлингом модулей)
WORKDIR /app/apps/api
RUN pnpm build

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache wget
ENV NODE_ENV=production

# Копируем ТОЛЬКО один файл - main.js
COPY --from=build /app/apps/api/dist/main.js ./main.js

# Запуск
EXPOSE 4000
CMD ["node", "main.js"]