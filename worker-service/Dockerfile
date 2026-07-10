# Build stage
FROM node:latest AS builder

WORKDIR /app

COPY ./package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Runtime Stage
FROM node:alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV LOG_LEVEL=info

CMD ["npm", "run", "start"]