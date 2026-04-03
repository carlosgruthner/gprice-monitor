# ESTÁGIO 1: CONSTRUÇÃO
FROM node:22-alpine AS builder
WORKDIR /app
# Instalamos o que é preciso para compilar o SQLite
RUN apk add --no-cache build-base python3 make g++
COPY package*.json ./
# Instalamos apenas o necessário para rodar, limpando o cache em seguida
RUN npm ci --only=production && npm cache clean --force

# ESTÁGIO 2: EXECUÇÃO
FROM node:22-alpine
# Instalamos o Chromium (é o que mais ocupa espaço, mas é necessário)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /app
# Copiamos APENAS os módulos prontos e o código
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Variáveis do Puppeteer para usar o Chromium do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

EXPOSE 4000
CMD ["node", "index.js"]