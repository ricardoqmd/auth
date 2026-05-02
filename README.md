# @ricardoqmd/auth

> Reusable authentication primitives for Next.js apps using Keycloak — designed for SPAs, with a clean state machine at the core and pluggable adapters.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![pnpm](https://img.shields.io/badge/pnpm-9-orange)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

## Why?

Spinning up a new Next.js app with Keycloak shouldn't take a sprint. This monorepo packages the OIDC dance once — token init, refresh, logout, RBAC helpers — so every new project just runs `npm install` and gets a working `<AuthProvider>` and `useAuth()` hook with redirect-on-boot behavior out of the box.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Next.js app                         │
│                                                             │
│   <AuthProvider>     useAuth() { token, user, hasRole, ... }│
└──────────────────────────┬──────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │ @ricardoqmd/        │
                │   auth-nextjs       │   ← React/Next.js bindings
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────┐
                │ @ricardoqmd/        │
                │   auth-core         │   ← XState machine (framework-agnostic)
                └──────────┬──────────┘
                           │ AuthProvider interface
                ┌──────────▼──────────┐
                │ @ricardoqmd/        │
                │   auth-keycloak     │   ← keycloak-js adapter
                └─────────────────────┘
```

The split lets you swap the IDP adapter (Keycloak today, Auth0/Cognito tomorrow) without touching your Next.js app.

## Packages

| Package                          | Description                                            | Status |
| -------------------------------- | ------------------------------------------------------ | ------ |
| `@ricardoqmd/auth-core`          | Framework-agnostic XState machine + types              | 🚧 0.0.1 |
| `@ricardoqmd/auth-keycloak`      | Keycloak adapter using `keycloak-js`                   | 🚧 0.0.1 |
| `@ricardoqmd/auth-nextjs`        | Next.js client-side bindings (`AuthProvider`, `useAuth`) | 🚧 0.0.1 |
| `@ricardoqmd/auth-nextjs-ssr`    | Middleware + JWT validation (server-side)              | 🔜 planned |

## Local development

### Prerequisites

- Node.js >= 18.18
- pnpm >= 9 (`npm install -g pnpm`)
- Docker + Docker Compose

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start Keycloak (ports 8080)
pnpm kc:up

# 3. Wait ~30s for Keycloak to import the realm, then visit:
#    http://localhost:8080/admin   (admin / admin)
#    Realm: demo

# 4. Configure the demo app
cp apps/demo/.env.example apps/demo/.env.local

# 5. Run packages in watch mode + the demo app
pnpm dev          # builds packages on change
pnpm demo         # in another terminal — http://localhost:3000
```

### Demo users

| Username | Password   | Realm roles  | Client roles (`demo-app`) |
| -------- | ---------- | ------------ | ------------------------- |
| ricardo  | password   | admin, user  | editor, viewer            |
| viewer   | password   | user         | viewer                    |

### Useful scripts

```bash
pnpm kc:up        # start Keycloak
pnpm kc:down      # stop Keycloak
pnpm kc:logs      # tail Keycloak logs
pnpm kc:reset     # full reset (drops volume → re-imports realm)
pnpm build        # build all packages
pnpm test         # run tests
pnpm typecheck    # type-check all packages
pnpm changeset    # record a release-worthy change
```

## Roadmap

- **v0.1.0 (this iteration)** — usable end-to-end: redirect-on-boot, useAuth, RBAC helpers, demo app working against local Keycloak.
- **v0.2.0** — robust XState tests, error edge cases, refresh-token race conditions.
- **v0.3.0** — `auth-nextjs-ssr` package: middleware + JWT validation against JWKS for server components / route handlers.
- **v1.0.0** — stable public API, full docs site, migration guides, GitHub Actions CI.

## License

MIT © ricardoqmd
