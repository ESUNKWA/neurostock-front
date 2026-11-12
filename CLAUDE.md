# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commandes

```bash
npm start              # ng serve --host 0.0.0.0 sur http://localhost:4200 (proxy vers le backend)
npm run build          # build de production → dist/neurostock/browser (utilise environnement.prod.ts)
npm run watch          # build de développement en mode watch
npm test               # ng test (Karma + Jasmine)
npx ng test --include='src/app/chemin/vers/fichier.spec.ts'   # lancer un seul spec
```

Il n'y a pas de script de lint. Il n'existe pour l'instant aucun fichier `*.spec.ts` : `npm test` n'a donc rien de réel à exécuter.

Le serveur de dev redirige `/api` (en retirant le préfixe `/api`) et `/socket.io` (WebSocket) vers `http://localhost:3000` (voir [proxy.config.json](proxy.config.json)). Le backend doit donc tourner en local sur le port 3000.

### Docker

```bash
cp .env.example .env                       # régler API_URL, FRONT_PORT, FRONT_DEV_PORT
docker compose up -d --build               # image de prod (nginx) sur :8080
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build   # ng serve + rechargement à chaud sur :4200
```

Le [Dockerfile](Dockerfile) comporte trois étapes : `dev`, `build` et `runtime` (nginx, la cible par défaut). Le front est déployé seul, séparément de l'API. **nginx ne fait pas de proxy pour `/api`** : le navigateur appelle directement le backend à l'adresse `API_URL`.

## URL de l'API à l'exécution (important)

L'URL de l'API est fixée **au démarrage de l'application, pas au moment du build** :

1. [src/index.html](src/index.html) charge `config.js` avant l'application. Ce fichier définit `window.__env = { API_URL }`.
2. Dans l'image nginx, [docker/40-runtime-config.sh](docker/40-runtime-config.sh) écrit `config.js` à partir de la variable d'environnement `API_URL` à chaque démarrage du conteneur. Pour changer d'API, modifier `.env` puis lancer `docker compose up -d`. Aucun rebuild n'est nécessaire.
3. [public/config.js](public/config.js) est une valeur de repli vide. Le service worker ([ngsw-config.json](ngsw-config.json)) et nginx sont tous deux configurés pour ne jamais mettre `config.js` en cache.
4. [environnement.ts](src/app/environnement/environnement.ts) lit `window.__env.API_URL` et se replie sur `'/api'` (le proxy de dev). [environnement.prod.ts](src/app/environnement/environnement.prod.ts) se replie sur une URL de serveur codée en dur. Les slashs finaux sont supprimés.

Conséquence : **ne jamais coder en dur des URL `/api/...`**. Toujours les construire à partir de `environnement.API_URL`. En prod, un chemin relatif `/api` arrive sur nginx et renvoie `index.html`. Le code qui ne peut pas passer par `HttpClient` doit tenir compte d'un backend situé sur une autre origine :
- Socket.io déduit l'origine à partir de `API_URL` (voir `pos-vente.component.ts`).
- L'impression thermique récupère le HTML et l'injecte dans une iframe `srcdoc` de même origine avant d'appeler `print()`.

## Architecture

**Composants standalone Angular 19**. Il n'y a aucun NgModule. L'application démarre via `appConfig` dans [src/app/app.config.ts](src/app/app.config.ts), qui enregistre aussi le service worker (en production uniquement) et la locale `fr-FR`.

**Routage** ([src/app/app.routes.ts](src/app/app.routes.ts)) : chargement différé via `loadComponent`/`loadChildren`. Les composants de page utilisent `export default`.
- **Public :** `/login`, `/landing`, `/inscription`, `/abonnement-expire`, `/no-access`.
- **Shell :** le chemin vide affiche `HomeComponent` (header + sidebar + footer + `<router-outlet>`) derrière `AuthGuard`. Les fonctionnalités métier (produits, ventes, achats, stocks, caisse, clients, devis, utilisateurs, structure, …) sont des enfants de ce shell.
- **Plein écran, hors du shell :** `/pos` (point de vente, `AuthGuard`) et `/ekwatech` (administration de la plateforme, `ekwatechGuard` → profil `super_admin` uniquement).

**Couche HTTP.** Les services métier injectent `HttpClientService` ([src/app/services/http-client/http-client.service.ts](src/app/services/http-client/http-client.service.ts)), une fine surcouche de `HttpClient`, et construisent leurs URL à partir de `environnement.API_URL`.

**Intercepteurs** (enregistrés dans `appConfig`) :
- `authInterceptor` ajoute `Authorization: Bearer <token>` et redirige vers `/login` en cas de 401. Le JWT est stocké dans `localStorage` (`access_token` + `user`). `AuthService` expose `currentUser$`.
- `tenantContextInterceptor` : pour un `super_admin` qui a sélectionné une structure (`SelectedTenantService`), il ajoute `X-Structure-Id`. Pour les autres utilisateurs, une erreur 500 contenant « Aucun contexte tenant actif » les déconnecte avec une alerte SweetAlert.

## SaaS multi-tenant

Le backend est un **SaaS multi-tenant** : chaque structure dispose de sa propre base de données isolée.

```
Base master :  utilisateurs, t_profils, t_structures, tenant_configs (métadonnées de connexion par structure)
Base tenant :  une par structure (ex. stockflow_structure_2) — boutiques, produits, ventes, achats, …
```

- À la connexion, le backend intègre `structureId` dans le JWT. Son `TenantMiddleware` dirige ensuite chaque requête vers la bonne base tenant. Les utilisateurs ordinaires n'envoient **aucun en-tête supplémentaire**. Seul le `super_admin` change de tenant via `X-Structure-Id`.
- Ne jamais coder en dur un `structureId` dans les appels de service.
- `structure_id` est un champ nullable de `Utilisateur`. Il doit être renseigné à la création d'un utilisateur pour que le JWT porte le bon `structureId`.
- Les indicateurs propres à une boutique, comme `gestion_caisse_activee`, sont stockés dans la base **tenant** : ils ne sont donc lisibles qu'après la connexion.

Création d'une nouvelle structure (procédure admin) : `POST /structure` → `POST /tenant/provision` `{ structureId, host, port, username, password, database }` (crée la base et synchronise le schéma) → `POST /utilisateur` avec `structure_id`. Les autres endpoints tenant sont `GET /tenant`, `GET /tenant/:structureId` et `DELETE /tenant/:structureId/reset` (vide le pool de connexions).

## UI et conventions

- UI : composants [ng-zorro-antd](https://ng.ant.design), Bootstrap Icons (`bi bi-*`), `ngx-toastr` pour les notifications, `sweetalert2` pour les confirmations, `chart.js` pour les graphiques. `xlsx` sert à l'export Excel et `qrcode` aux QR codes.
- Tout est en français : libellés, entrées de menu, segments de route et commentaires de code.
- Le menu latéral est un tableau statique dans [src/app/layout/sidebar/menu.ts](src/app/layout/sidebar/menu.ts).
- Les fonctionnalités se trouvent sous `src/app/pages/<fonctionnalité>/`, et chacune expose un `routes.ts` pour le chargement différé. Les services se trouvent sous `src/app/services/<fonctionnalité>/`.
- Appliquer `ThousandSeparatorDirective` ([src/app/helpers/thousand-separator.directive.ts](src/app/helpers/thousand-separator.directive.ts)) aux champs de montant et de quantité.
- Les styles sont en SCSS propre à chaque composant. Les styles globaux sont dans [src/styles.scss](src/styles.scss).
