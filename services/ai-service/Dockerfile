# Etapa 1: Compilación y empaquetado con esbuild
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Etapa 2: Runtime ultraligero para VPS de 1GB RAM (sin node_modules de desarrollo)
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist/index.cjs ./dist/index.cjs
EXPOSE 4001
CMD ["node", "--max-old-space-size=128", "dist/index.cjs"]
