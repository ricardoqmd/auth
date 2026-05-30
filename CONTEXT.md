# Project context for Claude Code

> **Purpose of this file:** brief any AI coding assistant or new contributor on the project's
> architecture, decisions, conventions, and current state. Read this BEFORE making changes.

## What this is

Monorepo of authentication packages for SPAs using Keycloak as Identity Provider.
Designed so new projects can do `npm install` and have a working auth setup in minutes,
freeing developers to focus on business logic.

**Owner:** ricardoqmd (15+ years experience, Java/Spring background, recent Next.js).
**Audience:** developers building SPAs (especially Next.js) that need Keycloak authentication
without writing the OIDC dance from scratch every time.

## High-level architecture (hexagonal / ports & adapters)

```
┌─────────────────────────────────────────────────────────────┐
│                  Consumer Next.js app                        │
│   <AuthProvider>     useAuth() → token, user, hasRole, etc. │
└──────────────────────────┬──────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │ @ricardoqmd/        │
                │   auth-nextjs       │   ← React/Next bindings
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────┐
                │ @ricardoqmd/        │
                │   auth-core         │   ← XState machine + types
                │                     │     (framework + IDP agnostic)
                └──────────┬──────────┘
                           │ AuthProvider interface
                ┌──────────▼──────────┐
                │ @ricardoqmd/        │
                │   auth-keycloak     │   ← keycloak-js adapter
                └─────────────────────┘
```

This split allows:
- Swapping the IDP (e.g. Auth0 adapter in the future) without touching consumer code.
- Swapping the framework (e.g. Vue binding) without touching the core or adapter.
- Each package versioning and publishing independently.

## Tech stack and key decisions

### Package management
- **pnpm workspaces** (NOT npm classic). Required for `workspace:*` protocol and proper hoisting.
- **Corepack** declared via `packageManager` field for reproducibility across contributors.

### Build system
- **tsup** (esbuild-based bundler) for all publishable packages.
- Generates dual format: ESM (`.js`) + CJS (`.cjs`) + types (`.d.ts`) + source maps.
- All `dependencies` and `peerDependencies` declared as `external` in tsup config.

### TypeScript
- **TypeScript 5.6+** with project references enabled (composite projects).
- `tsconfig.base.json` shared, each package extends it.
- Strict mode + `noUncheckedIndexedAccess` for safety.
- `moduleResolution: "Bundler"` (not NodeNext) — assumes consumer uses a bundler.

### State machine
- **XState v5** (not v4). API significantly different from v4, do not mix.
- Machine lives in `auth-core/src/machine.ts`, framework-agnostic.
- States: `idle → initializing → authenticated (active | refreshing) | unauthenticated → loggingOut → error`. `refreshing` is a sub-state of `authenticated`, not top-level.

### Identity provider
- **Keycloak server >=26** (LTS). Tested against 26.6.x.
- **keycloak-js >=26** as peer dependency. Since Keycloak 26.2 it versions independently
  from server and is backwards-compatible with all actively supported server versions.

### Versioning and release
- **Changesets** for coordinated releases.
- **Linked versioning** across `auth-core`, `auth-keycloak`, `auth-nextjs` (always same version).
- Demo app (`apps/demo`) is `private: true` and ignored by Changesets.
- SemVer: currently in `0.x.y` range — API may break between 0.x → 0.y.

### License and visibility
- **MIT** licensed.
- **Public** repo on GitHub: github.com/ricardoqmd/auth
- **Public** packages on npm under scope `@ricardoqmd/`.

## Default behavior: redirect-on-boot (SPA pattern)

Unlike libraries that show a "Login" button, this package defaults to:
- `onLoad: 'login-required'` in keycloak-js config.
- If user is not authenticated, immediate redirect to Keycloak.
- App content only renders if authenticated.
- This matches SPA expectations: app is a private dashboard, gated at boot.

If a consumer wants the "button login" behavior, they can override with `onLoad: 'check-sso'`.

## Current state (as of v0.2.0, published 2026-05-29)

### What's done
- ✅ Monorepo scaffold: pnpm workspaces, TypeScript references, tsup configs
- ✅ Three packages implemented end-to-end with real XState machine, Keycloak
     adapter, and React/Next.js bindings
- ✅ Demo Next.js app in `apps/demo` authenticating successfully against
     local Keycloak 26
- ✅ Docker Compose with Keycloak 26.6, realm `demo` preconfigured
- ✅ All three packages published to npm at v0.2.0:
  - `@ricardoqmd/auth-core@0.2.0`
  - `@ricardoqmd/auth-keycloak@0.2.0`
  - `@ricardoqmd/auth-nextjs@0.2.0`
- ✅ 16 unit tests across the three packages (passing)
- ✅ GitHub Actions CI: tests run on every PR to `main`
- ✅ Branch protection ruleset blocking merges without green CI
- ✅ Changesets configured with linked versioning, MIT-licensed
- ✅ IDP-agnostic refactor: generic `idpClaims<TIdpClaims>`, universal
     `user.roles[]` field, `hasResourceRole` moved to adapter package
- ✅ Package READMEs reflecting v0.2.0 API

### What's NOT done yet (planned for v0.3.0 → v1.0.0)
- ❌ Coverage at 70% (next: v0.3.0)
- ❌ Coverage at 80% (final: v1.0.0)
- ❌ API surface review marking `@internal` vs public exports
- ❌ Comprehensive documentation site (deferred to v1.0.0)
- ❌ Migration guides between minors

### Out of scope until post-v1.0.0
- `@ricardoqmd/auth-nextjs-ssr` — server-side middleware + JWT validation
- `@ricardoqmd/auth-vue` — Vue 3 bindings
- `@ricardoqmd/auth-entra` — Microsoft Entra ID adapter
- `@ricardoqmd/auth-cognito` — AWS Cognito adapter
- `@ricardoqmd/auth-policy` — PDP/PEP pattern (separate from main packages)

## Public API contract (v0.2.0; subject to change until v1.0.0)

Once v1.0.0 is released, these are the public contracts. Changing them requires major bump.

### From `@ricardoqmd/auth-core`
```typescript
export interface AuthProvider<TIdpClaims = unknown> {
  init(): Promise<AuthInitResult>;
  login(): Promise<void>;
  logout(options?: LogoutOptions): Promise<void>;
  refreshToken(minValidity?: number): Promise<AuthTokens | null>;
}

export interface AuthInitResult<TIdpClaims = unknown> {
  authenticated: boolean;
  tokens?: AuthTokens;
  user?: AuthUserClaims;
  idpClaims?: TIdpClaims;
}

export interface AuthUserClaims {
  sub?: string;                  // optional — not all tokens include it
  preferred_username?: string;
  name?: string;
  email?: string;
  roles?: string[];              // universal OIDC field; adapters map into this
  exp?: number;
  iat?: number;
}

export interface AuthTokens {
  token: string;                 // access token
  refreshToken: string;          // refresh token
  expiresAt: number;             // epoch ms (not seconds)
}

export interface LogoutOptions {
  redirectUri?: string;
}
```

### From `@ricardoqmd/auth-keycloak`
```typescript
export function createKeycloakProvider(
  options: KeycloakProviderOptions
): AuthProvider<KeycloakIdpClaims>;

export interface KeycloakIdpClaims {
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
}

export function hasResourceRole(
  claims: KeycloakIdpClaims | null,
  resource: string,
  role: string
): boolean;
```

### From `@ricardoqmd/auth-nextjs`
```typescript
export function AuthProvider(props: AuthProviderProps): JSX.Element;

export function useAuth<TIdpClaims = unknown>(): AuthState<TIdpClaims>;

export interface AuthState<TIdpClaims = unknown> {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: AuthUserClaims | null;
  idpClaims: TIdpClaims | null;
  error: Error | null;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}
```

## Conventions

### Code style
- Everything in **English** (code, comments, commits, docs).
- No emoji in code or commit messages (only acceptable in docs/READMEs).
- Use TypeScript everywhere, no plain JavaScript files.
- Functional style preferred over classes (except where libraries require classes, e.g. React).

### Git
- **Conventional Commits** for all messages: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`.
- **Branch naming:** `feat/<scope>-<short-description>`, `fix/<scope>-<bug>`.
- One logical change per PR. Squash-merge to keep main history clean.
- PR titles follow conventional commits format.

### Testing
- **Vitest** for all unit tests.
- Tests live next to source: `src/foo.ts` → `src/foo.test.ts`.
- Coverage target: >80% on `auth-core` (the most critical package), >60% on adapters/bindings.
- E2E tests with Playwright planned for `apps/demo` against local Keycloak.

### Documentation
- Each package has its own `README.md` with: install, quick start, API reference, license.
- Inline JSDoc on all public exports.
- Architectural decisions recorded as ADRs in `docs/decisions/`.
- Session history and milestone log in `docs/PROGRESS.md`.

## Working with this codebase

### Local development setup
```bash
# 1. Install
pnpm install

# 2. Start Keycloak (port 8080)
pnpm kc:up

# 3. Configure demo
cp apps/demo/.env.example apps/demo/.env.local

# 4. In one terminal: watch packages
pnpm dev

# 5. In another terminal: run demo
pnpm demo  # http://localhost:3000
```

### Demo Keycloak users
| Username | Password | Realm roles | Client roles (demo-app) |
|----------|----------|-------------|------------------------|
| ricardo  | password | admin, user | editor, viewer |
| viewer   | password | user        | viewer |

### Common pitfalls
- After editing `auth-core`, restart TS server in your IDE if types don't propagate.
- If `pnpm install` complains about peer deps, set `auto-install-peers=true` (already in `.npmrc`).
- The demo app (`apps/demo`) uses `transpilePackages` in `next.config.js` so it can consume
  workspace packages without a prior build step during local development. This is a monorepo
  dev convenience — published consumers do NOT need `transpilePackages` (the packages ship
  dual ESM+CJS and Next.js 14+ resolves them correctly out of the box).

## Related docs

- `README.md` — public-facing project description
- `docs/PROGRESS.md` — running log of decisions and milestones (read for project history)
- `docs/decisions/` — Architecture Decision Records (ADR-001 through ADR-005)
- Each `packages/*/README.md` — package-specific documentation

## When in doubt

The owner prefers:
- **Explicit over implicit.** Type everything, document everything.
- **Boring over clever.** Standard patterns over novel tricks.
- **Stable APIs over feature richness.** Small public API, deeply considered.
- **Quality over speed.** Take the time to do it right; the package is meant to last years.

If a decision affects the public API, **propose options and trade-offs**, don't pick unilaterally.
