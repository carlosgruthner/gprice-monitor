# ESTÁGIO 1: Construção das dependências nativas
FROM node:22-alpine AS builder
WORKDIR /app
# Instala ferramentas necessárias para compilar o better-sqlite3
RUN apk add --no-cache build-base python3 make g++
COPY package*.json ./
RUN npm ci --only=production

# ESTÁGIO 2: Execução leve
FROM node:22-alpine
WORKDIR /app

# Instala o Chromium e bibliotecas necessárias para o Puppeteer rodar no Alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    tzdata

# Variáveis de ambiente para o Puppeteer não baixar o Chrome e usar o do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV TZ=America/Sao_Paulo

# Copia apenas o necessário do estágio anterior
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Garante que a pasta de dados exista para o SQLite
RUN mkdir -p /app/data

EXPOSE 4000
CMD ["node", "index.js"]