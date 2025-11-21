# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --only=production=false && \
    npm cache clean --force

# Copy source and build
COPY . .
RUN npm run build && \
    rm -rf node_modules && \
    rm -rf .vite && \
    rm -rf src

# Production stage with nginx
FROM nginx:alpine
# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove unnecessary packages
RUN apk del --no-cache apk-tools

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
