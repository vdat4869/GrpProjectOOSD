FROM node:18-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN npm ci || npm install

COPY . .
RUN npm run build

EXPOSE 80
CMD ["npm","run","preview"]
