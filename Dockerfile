FROM node:20-alpine AS builder
WORKDIR /app
COPY client/ ./client/
COPY server/ ./server/
COPY package*.json ./
RUN npm ci --ignore-scripts
WORKDIR /app/client
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
RUN mkdir -p /app/server/data/backups
EXPOSE 3001
CMD ["node", "server/index.js"]
