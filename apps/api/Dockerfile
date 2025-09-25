# --- build stage ---
FROM public.ecr.aws/docker/library/node:20-alpine AS build
WORKDIR /app
ENV PNPM_HOME=/root/.local/share/pnpm
RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

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
