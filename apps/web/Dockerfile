# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
ENV PNPM_HOME=/root/.local/share/pnpm
RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

COPY apps/web apps/web
WORKDIR /app/apps/web

# prod env внутрь образа на время сборки
COPY ./.env.production ./.env.production
# Next автоматически подхватит NEXT_PUBLIC_* из process.env при build, так что:
RUN export $(cat .env.production | xargs) && pnpm build

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next /app/.next
COPY --from=build /app/apps/web/public /app/public
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/web/node_modules /app/apps/web/node_modules
COPY --from=build /app/apps/web/package.json /app/package.json

EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
