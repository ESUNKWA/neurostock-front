// API_URL peut être fournie à l'exécution par /config.js (window.__env),
// généré par le conteneur Docker à partir de la variable API_URL.
// Sans config.js : '/api', proxifié par ng serve (proxy.config.json).
const runtimeEnv = (globalThis as { __env?: { API_URL?: string } }).__env ?? {};

export const environnement = {
    production: false,
    API_URL: (runtimeEnv.API_URL || '/api').replace(/\/+$/, ''),
}
