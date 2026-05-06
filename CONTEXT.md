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
- States planned: idle → initializing → authenticated/unauthenticated → refreshing → loggingOut → error.

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

## Current state (as of initial scaffold)

### What's done
- ✅ Monorepo scaffold: pnpm workspaces, TypeScript references, tsup configs
- ✅ Three packages exist with skeleton implementations only
- ✅ Demo Next.js 14 app in `apps/demo` consuming the packages via workspace
- ✅ Docker Compose with Keycloak 26.6, realm `demo` preconfigured
- ✅ Initial commit pushed to GitHub main branch
- ✅ Changesets configured with linked versioning
- ✅ MIT license, public repo

### What's NOT done yet
- ❌ Real XState machine implementation in `auth-core/src/machine.ts` (just a stub)
- ❌ Real Keycloak adapter in `auth-keycloak/src/index.ts` (just a stub)
- ❌ Real React hooks in `auth-nextjs/src/index.tsx` (just a stub)
- ❌ Tests (Vitest configured but no tests written)
- ❌ End-to-end test of the demo app actually authenticating
- ❌ First publish to npm (account exists but not yet published)

## Public API contract (DO NOT change without major version bump)

Once v1.0.0 is released, these are the public contracts. Changing them requires major bump:

### From `@ricardoqmd/auth-core`
```typescript
export interface AuthProvider {
  init(): Promise<AuthInitResult>;
  login(): Promise<void>;
  logout(): Promise<void>;
  refreshToken(minValidity?: number): Promise<AuthTokens | null>;
}

export interface AuthInitResult { ... }
export interface AuthTokens { ... }
export interface AuthUserClaims { ... }
```

### From `@ricardoqmd/auth-keycloak`
```typescript
export function createKeycloakProvider(options: KeycloakProviderOptions): AuthProvider;
export interface KeycloakProviderConfig { url, realm, clientId }
export interface KeycloakProviderOptions { config, onLoad?, ... }
```

### From `@ricardoqmd/auth-nextjs`
```typescript
export function AuthProvider(props: AuthProviderProps): JSX.Element;
export function useAuth(): AuthState;

export interface AuthState {
  isAuthenticated, isLoading, token, user, error,
  logout, hasRole, hasAnyRole, hasResourceRole
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
- Major architectural decisions documented in `docs/decisions/` as ADRs.

## Out of scope (planned for later)

- **`@ricardoqmd/auth-nextjs-ssr`** (planned v0.3.0+): middleware + server-side JWT validation
  using `jose` for routes that need server-rendered protection.
- **`@ricardoqmd/auth-policy`** (planned, optional, separate from main packages): PDP/PEP
  pattern client for organizations using externalized authorization. Specific to advanced
  use cases like the owner's government org architecture.
- **Vue/Svelte/Solid bindings**: only after Next.js is solid and there's demand.
- **Multi-realm support**: not v1.0.0 priority.
- **Auth0 / Cognito adapters**: only after Keycloak adapter is mature.

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
- Demo app uses `transpilePackages` in `next.config.js` to consume workspace packages directly
  without requiring a build step in development.

## Related docs

- `README.md` — public-facing project description
- `docs/PROGRESS.md` — running log of decisions and milestones (read for project history)
- `docs/decisions/` — ADRs for major architectural decisions
- Each `packages/*/README.md` — package-specific documentation

## When in doubt

The owner prefers:
- **Explicit over implicit.** Type everything, document everything.
- **Boring over clever.** Standard patterns over novel tricks.
- **Stable APIs over feature richness.** Small public API, deeply considered.
- **Quality over speed.** Take the time to do it right; the package is meant to last years.

If a decision affects the public API, **propose options and trade-offs**, don't pick unilaterally.
