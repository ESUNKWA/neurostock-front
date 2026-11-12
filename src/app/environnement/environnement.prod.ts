// API_URL est fournie à l'exécution par /config.js (window.__env),
// généré par le conteneur Docker à partir de la variable API_URL.
// Valeur de repli si config.js est absent ou vide.
const runtimeEnv = (globalThis as { __env?: { API_URL?: string } }).__env ?? {};

export const environnement = {
    production: true,
    API_URL: (runtimeEnv.API_URL || 'http://fsqluwfvovqe9pypijx8rqen.38.242.232.151.sslip.io').replace(/\/+$/, ''),
    app_title: 'NeuroStock'
}
