# -------- build stage --------
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

# prod env во время сборки
COPY apps/api/.env.production ./.env

# сборка nest -> apps/api/dist
RUN pnpm build

# -------- runtime stage --------
FROM node:20-alpine AS runtime
# запускаемся прямо из каталога приложения
WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV PORT=4000
# важно для pnpm-симлинков
ENV PNPM_HOME=/root/.local/share/pnpm

# pnpm-store + корневые node_modules (включая .pnpm)
COPY --from=build /root/.local/share/pnpm /root/.local/share/pnpm
COPY --from=build /app/node_modules /app/node_modules

# локальные зависимости приложения и артефакты
COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/.env ./.env

EXPOSE 4000
CMD ["node", "dist/main.js"]
