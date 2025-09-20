# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
ENV PNPM_HOME=/root/.local/share/pnpm
RUN corepack enable

# корневые манифесты монорепы + package.json приложений
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# исходники фронта
COPY apps/web apps/web
WORKDIR /app/apps/web

# prod env на время сборки
COPY apps/web/.env.production ./.env.production
RUN export $(cat .env.production | xargs) && pnpm build

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Копируем standalone и ассеты в ожидаемые пути
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000
# если есть server.js — запустим его, иначе server.mjs
CMD ["sh","-c","[ -f apps/web/server.js ] && node apps/web/server.js || node apps/web/server.mjs"]
