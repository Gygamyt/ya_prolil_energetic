FROM node:22-alpine AS build
WORKDIR /app

# При Monorepo лучше копировать только нужные workspace с помощью .npmrc + workspaces.
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json
# при необходимости — локальные пакетные модули
COPY packages ./packages
RUN npm ci --workspaces

COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
RUN npm run build

# Stage 2: runtime
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Скопировать только что нужно для запуска
COPY --from=build /app/apps/backend/package.json .
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/index.js"]
