FROM oven/bun:1

WORKDIR /app

# Copy package files
COPY package.json ./

# Remove existing lockfile and install fresh
RUN rm -f bun.lock && bun install --production

# Copy source code
COPY . .

EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]