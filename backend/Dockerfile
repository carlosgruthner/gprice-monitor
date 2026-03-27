# --- ESTÁGIO 1: CONSTRUÇÃO (A Cozinha) ---
FROM node:22-alpine AS builder

# Instala ferramentas para compilar módulos nativos (SQLite)
RUN apk add --no-cache build-base python3 make g++

WORKDIR /app

# Copia apenas os arquivos de dependências
COPY package*.json ./

# Instala as dependências e limpa o cache do npm imediatamente
RUN npm ci --only=production && npm cache clean --force

# --- ESTÁGIO 2: EXECUÇÃO (O Prato Pronto) ---
FROM node:22-alpine

# Instala APENAS o necessário para o Puppeteer rodar
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Configurações do Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copia APENAS os node_modules prontos do estágio anterior
COPY --from=builder /app/node_modules ./node_modules
# Copia o seu código fonte
COPY . .

# Garante que o banco de dados tenha permissões (ajuste o caminho se necessário)
# RUN touch precos.db && chmod 666 precos.db

EXPOSE 4000
CMD ["node", "index.js"]