FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY . .

RUN pnpm --filter @addon-platform/shared build
RUN pnpm --filter @addon-platform/web build

# Production
FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/packages/web/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
