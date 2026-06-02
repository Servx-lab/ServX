FROM node:20-slim

# Install system libraries needed for headless Chrome/Chromium execution
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       wget \
       gnupg \
       ca-certificates \
       libxss1 \
       libasound2 \
       libatk1.0-0 \
       libc6 \
       libcairo2 \
       libcups2 \
       libdbus-1-3 \
       libexpat1 \
       libfontconfig1 \
       libgbm1 \
       libgcc1 \
       libgconf-2-4 \
       libgdk-pixbuf2.0-0 \
       libglib2.0-0 \
       libgtk-3-0 \
       libnspr4 \
       libpango-1.0-0 \
       libpangocairo-1.0-0 \
       libstdc++6 \
       libx11-6 \
       libx11-xcb1 \
       libxcb1 \
       libxcomposite1 \
       libxcursor1 \
       libxdamage1 \
       libxext6 \
       libxfixes3 \
       libxi6 \
       libxrandr2 \
       libxrender1 \
       libxtst6 \
       xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=5001
ENV NODE_ENV=production
EXPOSE 5001

CMD ["npm", "start"]
