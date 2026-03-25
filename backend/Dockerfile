# Usa uma versão leve do Node
FROM node:18-alpine

# Instala dependências necessárias para o Puppeteer e SQLite no Alpine
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Define que o Puppeteer deve usar o Chromium instalado no sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4000
CMD ["node", "index.js"]