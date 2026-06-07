FROM node:20-alpine AS builder

WORKDIR /app

# Копируем зависимости
COPY package*.json ./
RUN npm ci --only=production=false

# Копируем код
COPY . .

# Даём права
RUN chmod -R +x node_modules/.bin/

ENV NEXT_TELEMETRY_DISABLED=1

# Сборка
RUN NODE_OPTIONS="--max-old-space-size=4096" npx next build

# Продакшен образ
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Копируем результаты сборки
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/middleware.ts ./
COPY --from=builder /app/lib ./lib


# Даём права
RUN chmod +x node_modules/.bin/*

EXPOSE 3000

CMD ["npm", "start"]
