FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY tsconfig.json tsconfig.build.json nest-cli.json ./

RUN npm ci

COPY src ./src

RUN npx prisma generate && npm run build

FROM node:24-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nestjs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

USER nestjs

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "dist/main"]