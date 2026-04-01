FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/builder/package.json packages/builder/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/builder/node_modules ./packages/builder/node_modules
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/builder/ packages/builder/
RUN pnpm --filter @addon-platform/shared build
RUN pnpm --filter @addon-platform/builder build

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/builder/node_modules ./packages/builder/node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/builder/dist ./packages/builder/dist
COPY packages/shared/package.json packages/shared/
COPY packages/builder/package.json packages/builder/
COPY packages/builder/templates/ packages/builder/templates/
COPY packages/builder/config/ packages/builder/config/

WORKDIR /app/packages/builder
EXPOSE 3002
CMD ["node", "dist/server.js"]
