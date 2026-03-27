# --- ESTÁGIO 1: Dependências ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Instala tudo (incluindo devDependencies necessárias para o build)
RUN npm ci

# --- ESTÁGIO 2: Build ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Desativa a telemetria do Next durante o build (opcional, mais rápido)
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# --- ESTÁGIO 3: Runner (A imagem final que vai pro GHCR) ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Criamos um usuário sem privilégios por segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiamos apenas o que o modo standalone gerou
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

# O modo standalone gera um server.js próprio, não usamos mais "npm start"
CMD ["node", "server.js"]