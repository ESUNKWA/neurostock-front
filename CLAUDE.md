# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development server (with proxy to backend)
npm start              # ng serve — starts on http://localhost:4200

# Build
npm run build          # production build
npm run watch          # build in watch mode (development)

# Tests
npm test               # ng test (Karma + Jasmine)
```

The dev server proxies `/api` to `http://localhost:3000` (see [proxy.config.json](proxy.config.json)), so the backend must be running locally on port 3000.

## Architecture

**Angular 19 standalone components** — no NgModule. All components use `standalone: true`. The app is bootstrapped via `appConfig` in [src/app/app.config.ts](src/app/app.config.ts).

**Routing** — fully lazy-loaded via `loadComponent` and `loadChildren`. The shell route (empty path) renders `HomeComponent` which provides the layout (header + sidebar + footer + `<router-outlet>`). All authenticated pages are children of this shell and protected by `AuthGuard`.

```
/login              → LoginComponent (public)
/                   → HomeComponent (shell, requires auth)
  /dashboard        → DashboardComponent
  /gestion-des-produits/...
  /gestion-des-approvisionnements/...
  /gestion-des-ventes/...
  /utilisateurs/...
  /structure/...
```

**HTTP layer** — All HTTP calls go through `HttpClientService` ([src/app/services/http-client/http-client.service.ts](src/app/services/http-client/http-client.service.ts)), a thin wrapper around `HttpClient`. Domain services (e.g. `VentesService`, `AchatsService`) inject `HttpClientService` and build URLs from `environnement.API_URL` (`'/api'`).

**Auth** — JWT stored in `localStorage` (`access_token` + `user`). `AuthService` manages the token and exposes a `currentUser$` BehaviorSubject. The functional interceptor `authInterceptor` appends the `Authorization: Bearer <token>` header and redirects to `/login` on 401. The JWT payload now contains `structureId` — the backend uses it to route every request to the correct tenant database automatically; the frontend does not need to pass it explicitly.

## Multi-tenancy SaaS

The backend is a **multi-tenant SaaS** where each structure has its own isolated database.

### Database layout

```
Master DB  (DATABASE_DB in .env)
├── utilisateurs, t_profils, t_structures
└── tenant_configs          ← connexion metadata per structure

Tenant DB  (one per structure, e.g. stockflow_structure_2)
└── all business tables: boutiques, produits, ventes, achats, …
```

### How routing works

1. User logs in → backend resolves `structureId` from `user.structure_id` (or via boutique → structure chain) and embeds it in the JWT.
2. Every subsequent request carries the JWT; `TenantMiddleware` reads `structureId`, fetches the right `DataSource` from `AsyncLocalStorage`, and all services hit the correct tenant DB transparently.
3. The frontend sends **no extra header** — the Bearer token is sufficient.

### Provisioning a new structure (admin workflow)

```
# 1. Create the structure (master DB)
POST /structure
{ "nom": "Ma Boutique SARL", … }   → returns structureId (e.g. 2)

# 2. Provision the tenant database
POST /tenant/provision
{
  "structureId": 2,
  "host": "localhost",
  "port": 5432,
  "username": "postgres",
  "password": "postgres",
  "database": "stockflow_structure_2"
}
# → creates the DB if missing + synchronises all tables

# 3. Create the responsible user with structure_id
POST /utilisateur
{ "nom": "…", "telephone": "…", "structure_id": 2, "profil": { … } }
```

### Tenant management endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/tenant/provision` | Create DB + sync schema |
| `GET`  | `/tenant` | List all tenant configs |
| `GET`  | `/tenant/:structureId` | Config for one structure |
| `DELETE` | `/tenant/:structureId/reset` | Flush connection pool |

### Frontend implications

- `structure_id` is a nullable field on `Utilisateur`; it must be set when creating a user so the JWT can carry the correct `structureId`.
- Never hardcode a `structureId` in service calls — it is resolved server-side from the token.
- The caisse flow (`gestion_caisse_activee`) is a per-boutique flag stored in the **tenant** DB, so it is only readable after login (i.e. after the tenant context is established).

**UI libraries** — [ng-zorro-antd](https://ng.ant.design) (Ant Design for Angular) for UI components, Bootstrap Icons (`bi bi-*` classes) for icons, `ngx-toastr` for notifications, and `sweetalert2` for confirmation dialogs. Charts use `chart.js`.

**Locale** — app is configured for `fr-FR` (`LOCALE_ID`). All labels, menu items, and route segments are in French.

**Sidebar menu** — defined statically in [src/app/layout/sidebar/menu.ts](src/app/layout/sidebar/menu.ts) as a plain array; add new top-level sections there.

**Environment config** — [src/app/environnement/environnement.ts](src/app/environnement/environnement.ts) (dev) and [environnement.prod.ts](src/app/environnement/environnement.prod.ts). The API base URL is `/api` in both environments (proxied in dev, expected to be at the same origin in prod).

## Key conventions

- Feature modules live under `src/app/pages/<feature>/` and each expose a `routes.ts` (or `*.route.ts`) for lazy loading.
- Services are organized under `src/app/services/<feature>/`.
- The `ThousandSeparatorDirective` ([src/app/helpers/thousand-separator.directive.ts](src/app/helpers/thousand-separator.directive.ts)) formats numeric inputs; apply it to currency/quantity fields.
- Styles are component-scoped SCSS; global styles live in [src/styles.scss](src/styles.scss).
