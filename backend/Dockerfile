FROM node:22-alpine

# Adicionamos build-base, python3 e g++ para o npm conseguir compilar módulos nativos
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      build-base \
      python3 \
      make \
      g++

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Dica: use o cache do Docker a seu favor
COPY package*.json ./

# Se o erro persistir, use 'npm install --quiet' para ver o log limpo
RUN npm install

COPY . .

EXPOSE 4000
CMD ["node", "index.js"]