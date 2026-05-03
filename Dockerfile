FROM node:22-slim AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
COPY shared/package.json shared/
COPY client/package.json client/
COPY server/package.json server/

RUN npm install

COPY shared/ shared/
COPY client/ client/
COPY server/ server/

# Build shared → client → server
RUN npm run build -w shared
RUN npm run build -w client
RUN npm run build -w server

# --- Production ---
FROM node:22-slim

WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared/package.json shared/
COPY --from=builder /app/shared/dist/ shared/dist/
COPY --from=builder /app/server/package.json server/
COPY --from=builder /app/server/dist/ server/dist/
COPY --from=builder /app/client/dist/ client/dist/

# Install production dependencies only
COPY --from=builder /app/node_modules/ node_modules/

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/dist/index.js"]
