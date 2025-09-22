# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
ENV PNPM_HOME=/root/.local/share/pnpm
RUN corepack enable

# монорепо: корневые манифесты + пакеты приложений
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# исходники API
COPY apps/api apps/api
WORKDIR /app/apps/api

# prod env внутрь образа (только на стадии сборки)
COPY apps/api/.env.production ./.env

# сборка
RUN pnpm build

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
# Важно: такой же путь, как в build-стадии
ENV PNPM_HOME=/root/.local/share/pnpm

# Копируем pnpm-store и node_modules (иначе симлинки будут битые)
COPY --from=build /root/.local/share/pnpm /root/.local/share/pnpm
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/node_modules /app/apps/api/node_modules

# Прод-артефакты
COPY --from=build /app/apps/api/dist /app/dist
COPY --from=build /app/apps/api/.env /app/.env

EXPOSE 4000
CMD ["node", "dist/main.js"]
