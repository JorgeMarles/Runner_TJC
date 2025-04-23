#Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json .

COPY .env .

RUN npm install

COPY . .

RUN npm run build

#Production stage
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json .

COPY .env .

RUN npm ci --only=production

COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["node", "dist/index.js"]