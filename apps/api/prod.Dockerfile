FROM node:22-alpine AS builder
WORKDIR /usr/src/app

COPY package.json yarn.lock nx.json tsconfig.base.json ./
RUN yarn install --frozen-lockfile

COPY . .

RUN yarn nx run api:build:production

FROM node:22-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=builder /usr/src/app/dist/apps/api ./app

WORKDIR /usr/src/app/app

RUN yarn install --production --frozen-lockfile

EXPOSE 3000
CMD ["node", "main.js"]
