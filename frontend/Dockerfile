FROM node:20-alpine AS base

WORKDIR /app
COPY package.json ./

FROM base AS deps
RUN npm install

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
ENV PORT 3000
ENV NODE_ENV development

CMD ["npm", "run", "dev"]
