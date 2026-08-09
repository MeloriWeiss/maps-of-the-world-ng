FROM node:22-alpine AS builder
WORKDIR /usr/src/app

RUN corepack enable

COPY package.json yarn.lock nx.json tsconfig.base.json .yarnrc.yml ./
RUN yarn install --immutable

COPY . .

RUN yarn nx run api:build:production

FROM builder AS migrator
CMD ["yarn", "db:main:deploy"]

FROM node:22-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

RUN corepack enable

COPY --from=builder /usr/src/app/.yarnrc.yml ./.yarnrc.yml
COPY --from=builder /usr/src/app/dist/apps/api ./app

WORKDIR /usr/src/app/app

RUN yarn install --immutable

COPY --from=builder /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /usr/src/app/node_modules/@prisma/client-runtime-utils ./node_modules/@prisma/client-runtime-utils

EXPOSE 3000
USER node
CMD ["node", "main.js"]
