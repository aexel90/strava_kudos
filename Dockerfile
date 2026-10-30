FROM node:22-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY main.js .
COPY src/ src/

USER node

CMD ["node", "main.js", "-v"]