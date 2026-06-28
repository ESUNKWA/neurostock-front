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

**Auth** — JWT stored in `localStorage` (`access_token` + `user`). `AuthService` manages the token and exposes a `currentUser$` BehaviorSubject. The functional interceptor `authInterceptor` appends the `Authorization: Bearer <token>` header and redirects to `/login` on 401.

**UI libraries** — [ng-zorro-antd](https://ng.ant.design) (Ant Design for Angular) for UI components, Bootstrap Icons (`bi bi-*` classes) for icons, `ngx-toastr` for notifications, and `sweetalert2` for confirmation dialogs. Charts use `chart.js`.

**Locale** — app is configured for `fr-FR` (`LOCALE_ID`). All labels, menu items, and route segments are in French.

**Sidebar menu** — defined statically in [src/app/layout/sidebar/menu.ts](src/app/layout/sidebar/menu.ts) as a plain array; add new top-level sections there.

**Environment config** — [src/app/environnement/environnement.ts](src/app/environnement/environnement.ts) (dev) and [environnement.prod.ts](src/app/environnement/environnement.prod.ts). The API base URL is `/api` in both environments (proxied in dev, expected to be at the same origin in prod).

## Key conventions

- Feature modules live under `src/app/pages/<feature>/` and each expose a `routes.ts` (or `*.route.ts`) for lazy loading.
- Services are organized under `src/app/services/<feature>/`.
- The `ThousandSeparatorDirective` ([src/app/helpers/thousand-separator.directive.ts](src/app/helpers/thousand-separator.directive.ts)) formats numeric inputs; apply it to currency/quantity fields.
- Styles are component-scoped SCSS; global styles live in [src/styles.scss](src/styles.scss).
