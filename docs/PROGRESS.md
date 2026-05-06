# Project progress log

> **Format:** reverse-chronological. Newest entries at the top.
> Each entry: date, milestone, what was done, key decisions and why.

---

## 2026-05-XX (Session: foundations)

### Milestone: complete monorepo scaffold + first commit pushed

#### What was done
- Created monorepo structure: pnpm workspaces with `packages/` (publishable) and `apps/` (private demo).
- Initialized three packages: `auth-core`, `auth-keycloak`, `auth-nextjs`.
- Configured TypeScript with project references, composite projects, shared `tsconfig.base.json`.
- Configured `tsup` for dual ESM+CJS+types output for each package.
- Set up Changesets with linked versioning across the three publishable packages.
- Added Docker Compose with Keycloak 26.6 and a preconfigured demo realm.
- Created `apps/demo` Next.js 14 app consuming the packages via workspace symlinks.
- MIT license, public GitHub repo at github.com/ricardoqmd/auth.
- Initial commit pushed to `main`.

#### Key decisions

**1. Naming: scope `@ricardoqmd/` and packages `auth-core`, `auth-keycloak`, `auth-nextjs`.**
- Why: scope matches GitHub username for portfolio coherence.
- Why these names: each describes its single responsibility clearly. Generic enough that
  future packages (`auth-vue`, `auth-auth0`) fit the same pattern.
- Alternative considered: `auth-keycloak-next` for the Next.js-specific package.
  Rejected because it couples framework + IDP in one name, blocking future combinations.

**2. Repository name: just `auth`, not `auth-keycloak-next`.**
- Why: the repo represents the project (a domain), not a single package.
- Pattern follows industry standard (e.g. nextauthjs/next-auth, trpc/trpc).
- Rejected alternative: domain-specific naming. Would require renaming or fragmenting
  when expanding to other frameworks/IDPs.

**3. Keycloak version: 26.6 (not 25 as initially scaffolded).**
- Why: 26.x is LTS, 26.6 is current stable, recently released.
- Bonus: keycloak-js separated from server in 26.2, allowing independent versioning.
- This means our peer dependency `keycloak-js >=26 <28` can support multiple server versions.

**4. License: MIT.**
- Why: industry default for npm packages, no friction for commercial adoption,
  no patent ambiguity for our use case.
- Rejected: Apache 2.0 (overkill, sometimes triggers legal review in conservative orgs).
- Rejected: GPL (forces consumers to publish their code, blocks adoption).

**5. Goal of the project: Option 3 (separate packages strategy).**
- Generic packages first (auth-core, auth-keycloak, auth-nextjs) for portfolio + open source.
- Specialized packages later (auth-policy for org-specific PDP/PEP pattern) as opt-in.
- Why: keeps the main packages broadly useful while still serving the owner's specific
  enterprise use case via composition.

**6. Default behavior: redirect-on-boot (login-required).**
- Why: matches SPA expectations. App is a private dashboard, not a marketing page with login.
- User never sees an "unauthenticated state" — either redirected or already authenticated.
- Configurable via `onLoad` option for consumers who want check-sso behavior.

**7. RBAC scope in v1: realm roles + client roles helpers, no ABAC.**
- The package will expose `hasRole`, `hasAnyRole`, `hasResourceRole`.
- ABAC (resource-level permissions) is OUT OF SCOPE for these packages.
- ABAC will be addressed in a separate, optional package (`auth-policy`) once main
  packages are mature.

#### Open questions for next session
- Implementation of XState machine: should we model "logging in" as a substate or
  rely entirely on Keycloak's redirect (no UI state for it)?
- Token refresh strategy: time-based (`after`) vs event-based (intercept fetch)?
- Error states: how granular should the error model be in the public API?

---

## 2026-05-XX (Session: planning)

### Milestone: architectural decisions and roadmap

#### What was done
- Studied 5 conceptual blocks: monorepo, TypeScript references, package.json,
  build/release, Docker/Keycloak/OIDC.
- Defined the hexagonal architecture (core / adapter / binding).
- Decided on dependency strategy: workspace internal, peer for external runtime libs.
- Designed the public API contract.

#### Key decisions

**1. Architecture: hexagonal / ports & adapters.**
- `auth-core` defines the `AuthProvider` interface (port).
- `auth-keycloak` implements the port (adapter).
- `auth-nextjs` consumes only the port, not the adapter directly.
- Why: allows future IDPs (Auth0, Cognito) without changing the binding.

**2. Dependency strategy.**
- Internal: `workspace:*` for cross-package within the monorepo.
- External UI/framework libs: `peerDependencies` (React, Next, keycloak-js).
- Internal-only build tools: `devDependencies` (tsup, vitest, typescript).
- Why peer: avoids duplicate instances, common cause of "useState only in client component"
  type bugs. Aligns with Maven `<scope>provided</scope>` pattern.

**3. Public API: small surface, stable contract.**
- 1 component (`AuthProvider`), 1 hook (`useAuth`), 1 factory (`createKeycloakProvider`),
  1 interface (`AuthProvider`).
- Why: smaller API = fewer breaking changes = more stable for consumers.

#### Open questions resolved
- ✅ Multiple npm scopes? No, just `@ricardoqmd/`.
- ✅ Public or private? Public for portfolio + open source.
- ✅ License? MIT.
- ✅ Package manager? pnpm (despite owner's npm familiarity).

---

## Project roadmap (planned)

### v0.1.0 — First publishable version (NEXT)
- [ ] Implement real XState machine in `auth-core/src/machine.ts`
- [ ] Implement real Keycloak adapter in `auth-keycloak/src/index.ts`
- [ ] Implement real React bindings in `auth-nextjs/src/index.tsx`
- [ ] Demo app authenticates end-to-end against local Keycloak
- [ ] Basic unit tests on the state machine
- [ ] Publish all three packages to npm

### v0.2.0 — Robustness
- [ ] Comprehensive XState test coverage with `@xstate/test`
- [ ] Edge cases: token refresh race conditions, network errors, Keycloak unavailable
- [ ] CI with GitHub Actions: lint, typecheck, test on PR
- [ ] E2E test with Playwright against Docker Keycloak

### v0.3.0 — SSR support
- [ ] New package: `@ricardoqmd/auth-nextjs-ssr`
- [ ] Middleware factory using `jose` for JWKS validation
- [ ] Server Component / Route Handler helpers

### v0.5.0 — Stability hardening
- [ ] Doc site (Nextra or similar)
- [ ] Migration guides
- [ ] Troubleshooting guide
- [ ] At least one external project consuming these packages in production

### v1.0.0 — Stable API contract
- [ ] Public API frozen for backward compatibility commitments
- [ ] Comprehensive documentation
- [ ] Performance benchmarks

### Beyond v1.0.0 — Ecosystem expansion
- [ ] `@ricardoqmd/auth-policy` (optional, for PDP/PEP pattern users)
- [ ] `@ricardoqmd/auth-vue` (Vue 3 bindings)
- [ ] `@ricardoqmd/auth-auth0` (Auth0 adapter)

---

## How to update this document

When you complete a milestone or make an architecture decision:

1. Add a new entry at the TOP of the chronological log (under the "Project progress log" header).
2. Date format: `2026-05-XX (Session: <topic>)` for sessions, `2026-05-XX` for daily progress.
3. Sections: Milestone, What was done, Key decisions, Open questions.
4. Each "Key decision" includes: what was decided, WHY, and what alternative was considered/rejected.
5. Update the roadmap section if priorities shift.

The "why" matters more than the "what". In 6 months, you (or a new contributor) will not
remember why a decision was made. The entry should answer the question.
