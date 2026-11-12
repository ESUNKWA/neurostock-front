#!/bin/sh
# Exécuté par l'entrypoint de l'image nginx au démarrage du conteneur :
# écrit /config.js à partir des variables d'environnement.
set -e
TARGET=/usr/share/nginx/html/config.js
# Échappe \ et ' pour une chaîne JS entre apostrophes
api_url=$(printf '%s' "${API_URL:-}" | sed -e "s/\\\\/\\\\\\\\/g" -e "s/'/\\\\'/g")
printf "window.__env = { API_URL: '%s' };\n" "$api_url" > "$TARGET"
echo "runtime-config: API_URL=${API_URL:-<défaut>}"
