# Base Image
FROM node:lts-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install dependencies (Only prod dependencies)
FROM base AS deps
COPY package*.json .
RUN npm ci --omit=dev

# Install dependencies + dev dependencies
FROM deps AS build-deps
ENV NODE_ENV=development
RUN npm ci

# Build
FROM build-deps AS build
COPY . .
RUN npm run build

# Production
FROM base AS prod
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist .
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT [ "node", "index.js" ]