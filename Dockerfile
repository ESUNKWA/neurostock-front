# ---------- Build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# URL de l'API vue par le navigateur. Par défaut "/api" : nginx proxifie vers le backend.
ARG API_URL=/api
RUN sed -i "s#API_URL: *'[^']*'#API_URL: '${API_URL}'#" src/app/environnement/environnement.prod.ts \
    && npx ng build --configuration production

# ---------- Runtime ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/neurostock/browser /usr/share/nginx/html
EXPOSE 80
