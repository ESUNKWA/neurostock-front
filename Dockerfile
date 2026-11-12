# ---------- Dev : ng serve + hot reload (code monté en volume, cf. docker-compose.dev.yml) ----------
FROM node:22-bookworm-slim AS dev
WORKDIR /app
EXPOSE 4200
CMD ["sh", "-c", "npm ci && npx ng serve --host 0.0.0.0 --port 4200 --poll 2000"]

# ---------- Build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

# ---------- Runtime (cible par défaut) ----------
# L'URL de l'API n'est pas figée au build : elle est lue au démarrage
# depuis la variable d'environnement API_URL (voir docker/40-runtime-config.sh).
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
COPY --from=build /app/dist/neurostock/browser /usr/share/nginx/html
EXPOSE 80
