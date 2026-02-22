# --- build stage ---
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

COPY tsconfig.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm --filter @station-eden/shared build

WORKDIR /app/apps/api
RUN pnpm build
RUN pnpm -s exec tsc -p tsconfig.migrations.json

# делаем "production bundle" с нормальным node_modules
WORKDIR /app
RUN pnpm --filter ./apps/api... deploy --prod --legacy /app/deploy

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/deploy ./

EXPOSE 4000
CMD ["node", "dist/main.js"]