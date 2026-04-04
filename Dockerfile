FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm install --workspaces

COPY backend backend
COPY frontend frontend
RUN npm run build --workspace frontend

FROM node:20-alpine AS runtime
WORKDIR /app

COPY package.json ./
COPY backend/package.json backend/package.json
RUN npm install --workspace backend --omit=dev

COPY --from=build /app/backend backend
COPY --from=build /app/frontend/dist frontend/dist

EXPOSE 4000
CMD ["node", "backend/src/server.js"]
