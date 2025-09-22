# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
ENV PNPM_HOME=/root/.local/share/pnpm
RUN corepack enable

# корневые манифесты для monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# нужны оба package.json — api и web (для корректного резолва рабочих пространств)
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# исходники API
COPY apps/api apps/api
WORKDIR /app/apps/api

# prod env внутрь образа (только на build стадии; правильный путь)
COPY apps/api/.env.production ./.env

# сборка
RUN pnpm build

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# копируем только то, что нужно для рантайма
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=build /app/apps/api/dist /app/dist
COPY --from=build /app/apps/api/.env /app/.env

EXPOSE 4000
CMD ["node", "dist/main.js"]
