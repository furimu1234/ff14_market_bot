FROM docker.io/library/node:22-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/bot/package.json ./packages/bot/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/lib/package.json ./packages/lib/package.json
COPY packages/universalis/package.json ./packages/universalis/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM docker.io/library/node:22-slim AS runner

WORKDIR /app/packages/bot

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages /app/packages

CMD ["node", "dist/index.js"]
