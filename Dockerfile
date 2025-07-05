# Build stage
FROM node:20-slim AS builder

# Tạo thư mục app
WORKDIR /usr/src/app

# Copy package files và cài dependency
COPY package.json package-lock.json ./

RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build app (NestJS build ra dist/)
RUN npm run build

# Production dependencies stage
FROM node:20-slim AS prod-deps

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm install --legacy-peer-deps --only=production

# Final stage
FROM node:20-slim

ARG PORT=3000

# Tạo thư mục app
WORKDIR /usr/src/app

# Copy built dist và node_modules từ các stage trước
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules

# Copy các file cần thiết khác (ví dụ env, config)
COPY package.json ./

# Expose port
EXPOSE $PORT

# Run app
CMD ["npm", "run", "start:prod"]