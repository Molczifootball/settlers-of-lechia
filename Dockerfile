# Multi-stage Dockerfile — works for Fly.io, Railway, any container host

FROM node:20-alpine AS builder
WORKDIR /app

# Install deps for both server and client
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN cd server && npm ci --omit=dev
RUN cd client && npm ci

# Copy source and build client
COPY server ./server
COPY client ./client
RUN cd client && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist
COPY package.json ./
EXPOSE 3001
CMD ["node", "server/src/index.js"]
