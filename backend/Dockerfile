# ESTÁGIO 1: CONSTRUÇÃO
FROM node:22-alpine AS builder
WORKDIR /app
# Dependências para compilar o better-sqlite3
RUN apk add --no-cache build-base python3 make g++
COPY package*.json ./
RUN npm ci --only=production

# ESTÁGIO 2: EXECUÇÃO
FROM node:22-alpine

# Instalamos o Chromium e dependências do sistema
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /app

# Criamos a pasta data e definimos o dono ANTES de copiar o código
RUN mkdir -p /app/data && chown -R node:node /app/data

# Copiamos os módulos e o código
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Garantimos que o usuário 'node' seja dono de tudo em /app
RUN chown -R node:node /app

# Variáveis do Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Rodar como usuário não-root por segurança e para evitar erros de permissão no volume
USER node

EXPOSE 4000
CMD ["node", "index.js"]