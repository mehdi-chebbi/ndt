FROM oven/bun:1 AS base

WORKDIR /app

# Install dependencies stage
FROM base AS deps
COPY package.json ./
RUN rm -f bun.lock && bun install

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build

# Production stage
FROM oven/bun:1-slim AS production
WORKDIR /app

# Copy standalone output
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "server.js"]
