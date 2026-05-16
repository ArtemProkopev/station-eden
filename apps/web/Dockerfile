# apps/web/Dockerfile

# --- build stage ---
FROM node:20-alpine AS build

WORKDIR /app

RUN apk add --no-cache \
  ca-certificates \
  wget \
  && update-ca-certificates

# pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

# ===== build args, инлайнятся в next build =====
ARG NEXT_PUBLIC_API_BASE="https://api.stationeden.ru"
ARG NEXT_PUBLIC_WS_BASE="wss://api.stationeden.ru"
ARG NEXT_PUBLIC_ENABLE_GOOGLE="true"
ARG NEXT_PUBLIC_ENABLE_YANDEX="true"
ARG NEXT_PUBLIC_ASSETS_BASE="https://cdn.assets.stationeden.ru"
ARG NEXT_PUBLIC_ASSETS_FALLBACK="https://station-eden-media.s3.ru-1.storage.selcloud.ru"
ARG NEXT_PUBLIC_CDN_IMAGE_QUALITY="80"

ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_WS_BASE=$NEXT_PUBLIC_WS_BASE
ENV NEXT_PUBLIC_ENABLE_GOOGLE=$NEXT_PUBLIC_ENABLE_GOOGLE
ENV NEXT_PUBLIC_ENABLE_YANDEX=$NEXT_PUBLIC_ENABLE_YANDEX
ENV NEXT_PUBLIC_ASSETS_BASE=$NEXT_PUBLIC_ASSETS_BASE
ENV NEXT_PUBLIC_ASSETS_FALLBACK=$NEXT_PUBLIC_ASSETS_FALLBACK
ENV NEXT_PUBLIC_CDN_IMAGE_QUALITY=$NEXT_PUBLIC_CDN_IMAGE_QUALITY

# manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

# sources
COPY tsconfig.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web

# build shared
RUN pnpm --filter @station-eden/shared build

# next build
WORKDIR /app/apps/web

RUN pnpm build

# --- runtime stage ---
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache wget

ENV NEXT_PUBLIC_API_BASE="https://api.stationeden.ru"
ENV NEXT_PUBLIC_WS_BASE="wss://api.stationeden.ru"
ENV NEXT_PUBLIC_ENABLE_GOOGLE="true"
ENV NEXT_PUBLIC_ENABLE_YANDEX="true"
ENV NEXT_PUBLIC_ASSETS_BASE="https://cdn.assets.stationeden.ru"
ENV NEXT_PUBLIC_ASSETS_FALLBACK="https://station-eden-media.s3.ru-1.storage.selcloud.ru"
ENV NEXT_PUBLIC_CDN_IMAGE_QUALITY="80"

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]