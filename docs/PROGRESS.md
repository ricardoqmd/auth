# Project progress log

> **Format:** reverse-chronological. Newest entries at the top.
> Each entry: date, milestone, what was done, key decisions and why.

---

## 2026-05-29 (Session: v0.2.0 release + README updates)

### Milestone: v0.2.0 published — packages now IDP-agnostic by design

#### What was done
- Created changeset for v0.2.0, applied `pnpm version-packages`, validated build+test.
- Published all three packages to npm at v0.2.0.
- Updated `auth-core/README.md` and `auth-keycloak/README.md` from minimal stubs
  to full reference documentation reflecting the new API surface.
- Patched `auth-nextjs/README.md` to remove obsolete API and document the
  generic `useAuth<TIdpClaims>()` pattern.

#### Key decisions

**1. Granular npm token with 2FA bypass for releases.**
First publish attempt failed with E403 because the npm account has
`auth-and-writes` 2FA policy and Changesets' batch publish doesn't prompt for
OTP interactively. Solution: created a Granular Access Token scoped to the
`@ricardoqmd` namespace with "Bypass 2FA" enabled, configured via
`npm config set //registry.npmjs.org/:_authToken`. Token will be rotated
quarterly.

**2. Documentation precedes additional packages.**
Originally considered moving forward with `@ricardoqmd/auth-entra` for v0.3.0.
Decided instead to consolidate v1.0.0 with current packages (Next.js + Keycloak)
before expanding to new IDPs or frameworks. Cognito/Entra adapters will only
land when there is a concrete consumer need.

**3. Vue binding is post-v1.0.0, not a blocker.**
A Vue 3 binding (`auth-vue`) is desirable for the owner's broader portfolio but
will NOT block v1.0.0. The current scope for v1.0.0 is Next.js + Keycloak with
stable API and 80% test coverage.

---

## 2026-05-28 (Session: IDP-agnostic refactor for v0.2.0)

### Milestone: core/binding/adapter contracts refactored to support multiple IDPs without breaking the public surface

#### What was done
- Introduced generic `idpClaims<TIdpClaims>` on `AuthState`, `AuthProvider`,
  `AuthContext`. Default type: `unknown`. Consumers opt into typed access by
  passing their IDP's claims interface to bindings: `useAuth<KeycloakIdpClaims>()`.
- Added universal `user.roles: string[]` field on `AuthUserClaims`. Each adapter
  is responsible for mapping its IDP-specific claims into this field.
- Migrated `hasRole()` and `hasAnyRole()` in `auth-core` to operate on the
  universal `user.roles` instead of Keycloak-specific `realm_access.roles`.
- Moved `hasResourceRole()` from `auth-core` to `auth-keycloak` as a standalone
  utility: `hasResourceRole(claims, resource, role)`.
- Updated `KeycloakIdpClaims` interface and exported it from `auth-keycloak`.
- All 16 unit tests passing (4 auth-core + 8 auth-keycloak + 4 auth-nextjs).
- End-to-end validated against Keycloak 26 with realm + resource roles.

#### Key decisions

**1. Generic with `unknown` default, opt-in typing.**
Considered making `idpClaims` always-typed by exporting a discriminated union,
but rejected because it would couple `auth-core` to specific IDP shapes. The
generic with `unknown` default lets `auth-core` remain truly IDP-agnostic while
adapter consumers get full type safety when they pass the right type parameter.

**2. `user.roles` instead of preserving `realm_access` at the universal layer.**
Considered keeping Keycloak's `realm_access.roles` shape as the universal
contract, but this would force every future adapter (Entra ID, Cognito, Auth0)
to map their roles INTO a Keycloak-flavored structure. Inverted the dependency:
each adapter maps its specific roles INTO the universal `user.roles` field,
which is OIDC-standard.

**3. `hasResourceRole` moved out of `useAuth()`.**
Removed it from the hook's return value because it's specific to Keycloak's
`resource_access` concept. Other IDPs don't have a direct analog (Cognito has
groups, Entra has app roles, etc.). Made it a standalone utility importable
from the adapter package. Consumers who need it: `import { hasResourceRole }
from '@ricardoqmd/auth-keycloak'`.

#### Migration impact for consumers

Pre-1.0 minor bump with breaking changes (per SemVer pre-release convention).
Migration:

```tsx
// BEFORE (v0.1.x)
const { user, hasRole, hasResourceRole } = useAuth();
hasResourceRole("my-app", "editor");  // ← method on hook

// AFTER (v0.2.0)
import { hasResourceRole } from "@ricardoqmd/auth-keycloak";
import type { KeycloakIdpClaims } from "@ricardoqmd/auth-keycloak";

const { user, hasRole, idpClaims } = useAuth<KeycloakIdpClaims>();
hasResourceRole(idpClaims, "my-app", "editor");  // ← standalone utility
```

---

## 2026-05-20 (Session: tests + CI infrastructure)

### Milestone: 16 tests across 3 packages + automated CI on PRs to main

#### What was done
- Installed Vitest as the unified test runner across all packages.
- Created per-package `vitest.config.ts`:
  - `auth-core`: environment `node`, pure logic.
  - `auth-keycloak`: environment `jsdom` (defensive `window` access in the adapter).
  - `auth-nextjs`: environment `jsdom`, setup with `@testing-library/jest-dom/vitest`.
- Wrote tests covering:
  - `auth-core` (4): state machine transitions for idle, initializing,
    unauthenticated, and authenticated.active states.
  - `auth-keycloak` (8): interface contract, idempotency of `init()`, default
    parameters, defensive `window` access.
  - `auth-nextjs` (4): provider gating, useAuth states, error outside provider.
- Created `.github/workflows/test.yml`:
  - Triggers on PR to `main`.
  - `pnpm install --frozen-lockfile`, then `pnpm build`, then `pnpm test`.
  - Caches pnpm store between runs.
- Configured branch protection ruleset on `main` requiring "Test / Test packages"
  check to pass before merging.
- Added `packageManager: "pnpm@9.12.3"` to root `package.json` for reproducibility.

#### Key decisions

**1. `useIdleActorRef` mock pattern via never-resolving Promise.**
For testing the idempotency guard in `auth-keycloak`, the test needed to assert
that two calls to `init()` returned the same Promise. Solution: mock `kc.init()`
with a Promise that never resolves, so both calls find the cached Promise still
in flight. Same pattern used in `auth-core` for testing state during async
transitions.

**2. `vi.clearAllMocks()` in `beforeEach` for shared mocks.**
Adopted as a defensive practice even before tests assert specific call counts.
Prevents future tests from being polluted by previous test calls when checking
`toHaveBeenCalledTimes`.

**3. CI build step before test step.**
Required because workspace packages consume each other via `workspace:*`. Tests
in `auth-nextjs` import from `@ricardoqmd/auth-core`, which must be built first.
Without the build step, CI fails with module resolution errors that don't
reproduce locally (because local dev uses watch-mode rebuilds).

---

## 2026-05-08 (Session: auth-nextjs README and transpilePackages investigation)

### Milestone: auth-nextjs README expanded; transpilePackages documented as optional

#### What was done
- Expanded `packages/auth-nextjs/README.md` from a minimal scaffold stub into a
  full consumer-facing reference: Installation, Usage (3-step guide with code),
  API tables for `<AuthProvider>` props and `useAuth()` return values, and a
  Troubleshooting section.
- Investigated whether `transpilePackages` is required for Next.js consumers.

#### Key decision: transpilePackages is NOT required

*Initial assumption:* `transpilePackages` would be required because the package
ships ESM with `"use client"` directives and `next.config.js` in the demo app
has it configured.

*Verification:* Tested a clean Next.js 16.2.6 project (Turbopack) with
`rm -rf .next node_modules/.cache` and no `transpilePackages` configured.
Both `npm run dev` and `npm run build` succeeded with no errors or warnings.

*Conclusion:* Next.js 14+ handles ESM packages with `"use client"` directives
correctly out-of-the-box when the package ships a proper CJS fallback (which
ours does — tsup dual ESM+CJS output). The `transpilePackages` in the demo app
was scaffolded as a defensive measure during initial development and is not
needed in production consumers.

*Documentation decision:* Added `transpilePackages` to the Troubleshooting
section (not Installation) as an optional fallback for edge cases like corrupted
caches or complex monorepo setups. Also documented the cache-clear step
(`rm -rf .next node_modules/.cache`) as a first diagnostic to try before
concluding that `transpilePackages` is needed.

*Lesson:* Always verify assumptions with a clean environment before documenting
a requirement. The initial error (SSR failure) was caused by a corrupted cache,
not by a structural incompatibility. Documenting it as REQUIRED would have
created unnecessary friction for every consumer.

---

## 2026-05-07 (Session: v0.1.0 published to npm)

### Milestone: first public release — three packages live on npm

#### What was done
- Merged PR #1 (`feat/auth-core-state-machine`) via squash-merge into `main`.
- Added a Changeset entry for v0.1.0 via PR #2.
- Bumped versions to 0.1.0 and renamed the `version` script to `version-packages`
  via PR #3 (see Key technical issues #3 below).
- Added `LICENSE` file to each publishable package dist via PR #4.
- Published all three packages to npm:
  - `@ricardoqmd/auth-core@0.1.0`
  - `@ricardoqmd/auth-keycloak@0.1.0`
  - `@ricardoqmd/auth-nextjs@0.1.0`

#### Key technical issues resolved during release

**1. tsup + TypeScript composite: true conflict.**
`composite: true` in `tsconfig.json` is required for project references (IDE,
`tsc -b`) but conflicts with tsup's DTS build pipeline. Fix: split into two
configs per package — `tsconfig.json` (with `composite: true`) for tooling, and
`tsconfig.build.json` (without) for tsup. Applied to `auth-core` and
`auth-keycloak`. This pattern is used by Vite, tRPC, and TanStack.

**2. React 18 Strict Mode + keycloak-js double-init race condition.**
Two bugs caught during end-to-end testing before release:

- *Infinite re-renders*: `createAuthMachine(provider)` called on every render
  without memoization. `@xstate/react` v4's `useIdleActorRef` compares
  `logic.config` by reference; a new object each render triggered `setCurrent()`
  during render → infinite loop. Fix: `useMemo(() => createAuthMachine(provider),
  [provider])`.

- *Double `kc.init()` call*: a boolean `initialized` flag only becomes `true`
  after `kc.init()` resolves. React Strict Mode's simulated remount calls
  `init()` again while the first is still in flight — the flag is still `false`
  and the guard passes. Fix: cache the **Promise** itself instead of the boolean.
  A Promise reference is set synchronously before the `await`, so any concurrent
  call returns the same Promise and `kc.init()` is guaranteed to run exactly once.

**3. `pnpm version` conflicts with pnpm's built-in command.**
Running `pnpm version` executes pnpm's own version command (like `npm version`),
not the Changeset-based script declared in `package.json`. Renamed the script to
`version-packages` to avoid the collision. `pnpm changeset version` still works
as the underlying mechanism.

**4. npm 2FA (OTP) requirement on first publish.**
First-time publish to a new npm scope (`@ricardoqmd/`) requires OTP even when
automation tokens are configured. Passed `--otp <code>` to `pnpm publish` for
the initial release. Subsequent releases can use a `provenance` or CI token.

#### Workflow lessons learned

- **`pnpm pack --dry-run` before publishing.** Reveals exactly what files land in
  the tarball (dist, README, LICENSE). Caught the missing `LICENSE` file before
  pushing to npm.

- **Isolate the variable when debugging.** During the Strict Mode bugs, the
  re-render loop and the double-init looked like one problem. Fixing re-renders
  first (useMemo) exposed the race condition cleanly as a separate error.

- **Ship-now, polish-later on first release.** v0.1.0 ships without unit tests or
  CI. The package is functional and documented; tests and CI are v0.2.0. A late
  v0.1.0 would be worse than an imperfect one.

---

## 2026-05-06 (Session: end-to-end testing — two runtime bugs caught)

### Milestone: demo app runs end-to-end against local Keycloak

#### What was done
- Ran the full stack: Keycloak 26.6 + Next.js demo app against local Docker instance.
- Caught and fixed two bugs that only manifested at runtime (build and typecheck
  passed cleanly).
- Confirmed successful login flow with `ricardo` user, RBAC checks, and logout.

#### Bugs diagnosed and fixed

**Bug 1 — auth-nextjs: infinite re-renders (`Too many re-renders`)**

*Symptom:* App rendered, Keycloak login page appeared, user logged in, app crashed
with "React limits the number of renders to prevent an infinite loop."

*Root cause:* `createAuthMachine(provider)` was called inline in every render of
`AuthProvider`. Internally, `@xstate/react` v4's `useIdleActorRef` compares the
machine's `config` property by reference on every render:

```javascript
// inside useIdleActorRef (@xstate/react v4)
if (logic.config !== currentConfig) {
  setCurrent([logic.config, newActorRef]);  // setState during render!
}
```

Each call to `createAuthMachine` produces a new object with a new `config`
reference → the condition is always `true` → `setCurrent` is called during render
→ React triggers another render → another new machine → infinite loop.

*Fix:* Wrap `createAuthMachine(provider)` in `useMemo` keyed on `provider`.
Since `provider` is created at module level (stable reference), the machine is
created exactly once per component lifecycle.

*Lesson:* Any value passed to `useMachine` must be referentially stable. This
applies to any `@xstate/react` v4+ consumer. The `useMemo` pattern is the
canonical solution.

---

**Bug 2 — auth-keycloak: double `kc.init()` call (`A 'Keycloak' instance can only
be initialized once`)**

*Symptom:* After fixing Bug 1, the app showed "Authentication failed: A 'Keycloak'
instance can only be initialized once." immediately after successful Keycloak login.

*Root cause:* The idempotency guard used a boolean flag set only *after*
`kc.init()` resolved:

```typescript
if (initialized && lastResult !== null) { return lastResult; }  // guard
const authenticated = await kc.init({...});
initialized = true;  // set AFTER the async call
```

React 18 Strict Mode unmounts and remounts in development. The sequence was:

1. Mount 1: `init()` called → flag `false` → `kc.init()` starts (async, in flight)
2. Strict Mode cleanup: actor stops, but `kc.init()` is NOT cancelled
3. Mount 2: `init()` called again → flag still `false` (first call not resolved yet)
   → `kc.init()` called a second time → **throws**

The boolean flag is not atomic: it only protects against calls *after* resolution,
not against concurrent calls *during* resolution.

*Fix:* Cache the **Promise itself** instead of the boolean result:

```typescript
let initPromise: Promise<AuthInitResult> | null = null;

init(): Promise<AuthInitResult> {
  if (initPromise !== null) return initPromise;  // concurrent → same promise
  initPromise = (async () => { /* kc.init() */ })();
  return initPromise;
}
```

A Promise reference is set synchronously before `kc.init()` is awaited. Any
concurrent or subsequent call finds a non-null `initPromise` and returns it,
guaranteeing `kc.init()` is called exactly once regardless of concurrency.

*Lesson:* Idempotency guards for async operations must be based on the in-flight
Promise, not on a flag set in the resolution callback. This is a general pattern
applicable to any singleton async initialization (DB connections, SDK inits, etc.).

---

## 2026-05-06 (Session: auth-core + auth-keycloak implementation)

### Milestone: XState machine, Keycloak adapter, build pipeline verified

#### What was done
- Implemented the full XState v5 state machine in `auth-core/src/machine.ts`.
- Implemented the Keycloak adapter factory in `auth-keycloak/src/index.ts`.
- Added idempotency guard to `auth-keycloak/src/index.ts` `init()` (see decision #2 below).
- Implemented `auth-nextjs/src/index.tsx`: AuthProvider component + useAuth hook.
- Applied structural fix to TypeScript configs across all packages (see decision #3 below).
- Verified `pnpm build` succeeds end-to-end: all three packages emit `dist/index.js`,
  `dist/index.cjs`, `dist/index.d.ts`, `dist/index.d.cts` + source maps with zero errors.

#### Key decisions

**1. auth-nextjs: `xstate` types derived via `ReturnType<typeof useMachine<...>>` instead of direct import.**

*Problem:* Importing `type { Actor, StateFrom }` directly from `xstate` fails during DTS
generation because `xstate` is not a declared dependency of `auth-nextjs` — only a peer
of `@xstate/react`. Under pnpm's strict hoisting, packages can only access declared deps.

*Solution:* Derive the snapshot and send function types from `useMachine`'s own return type:
```ts
type UseMachineReturn = ReturnType<typeof useMachine<AuthMachine>>;
// snapshot: UseMachineReturn[0], send: UseMachineReturn[1]
```
This avoids declaring `xstate` as a devDependency of `auth-nextjs` and future-proofs the
types against `xstate` version changes (they'll always match what `@xstate/react` expects).

**2. auth-keycloak: idempotent init() guard.**

*Problem:* React 18 Strict Mode simulates unmount/remount in development. The `<AuthProvider>`
component sends the `INIT` event in a `useEffect`, which fires twice in Strict Mode. This
causes `provider.init()` to be called twice, and `keycloak-js` throws on the second call:
`"A 'Keycloak' instance can only be initialized once"`.

*Solution:* The adapter tracks `initialized: boolean` and `lastResult: AuthInitResult | null`
in closure scope. If `init()` is called after the first successful initialization, it returns
`lastResult` immediately without touching keycloak-js.

*Why the guard lives in the adapter, not in AuthProvider:*
The adapter owns the keycloak-js singleton and knows its limitations. The React component
should not know implementation details of the IDP library. This satisfies the hexagonal
architecture: concerns stay within the layer that owns them.

**3. Structural fix: split `tsconfig.json` / `tsconfig.build.json` per package.**

*Problem:* TypeScript's `composite: true` option — required for project references to work
(IDE navigation, incremental build, `tsc -b` at the root) — enforces constraints that conflict
with tsup's bundling pipeline:
- Forces `declaration: true` implicitly, so `tsc` tries to emit `.d.ts` files to `outDir`.
- Writes a `.tsbuildinfo` file that tracks outputs, conflicting with tsup's `clean: true`.
- In certain tsup versions the combination causes duplicate-emit or stale-artifact errors.

*Pattern applied:*
- `tsconfig.json` (per package): keeps `composite: true` + `tsBuildInfoFile`. Used by the
  IDE and by TypeScript project references (`tsc -b` at root, `references` in tsconfig.base).
- `tsconfig.build.json` (per package): identical except `composite` and `tsBuildInfoFile` are
  omitted. Used exclusively by tsup via `tsconfig: './tsconfig.build.json'` in tsup.config.ts.

*Why this is the standard:*
The same split is used by Vite (source/config tsconfig), tRPC, TanStack Query, and other
widely-adopted monorepo packages. It is the only way to satisfy both TypeScript's project
reference requirements and a bundler-driven build simultaneously, without hacks or suppressed
errors. Future contributors who maintain or add packages to this monorepo should follow the
same pattern.

---

## 2026-05-02 (Session: foundations)

### Milestone: complete monorepo scaffold + first commit pushed

#### What was done
- Created monorepo structure: pnpm workspaces with `packages/` (publishable) and `apps/` (private demo).
- Initialized three packages: `auth-core`, `auth-keycloak`, `auth-nextjs`.
- Configured TypeScript with project references, composite projects, shared `tsconfig.base.json`.
- Configured `tsup` for dual ESM+CJS+types output for each package.
- Set up Changesets with linked versioning across the three publishable packages.
- Added Docker Compose with Keycloak 26.6 and a preconfigured demo realm.
- Created `apps/demo` Next.js app consuming the packages via workspace symlinks (started on Next.js 14, upgraded to 16.2.6 in v0.1.1).
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

## 2026-05-02 (Session: planning)

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

## Project roadmap

The roadmap lives in [`ROADMAP.md`](../ROADMAP.md); rationale in
[ADR-006](./decisions/006-harden-before-expand.md). This file is the chronological
log only.

---

## How to update this document

When you complete a milestone or make an architecture decision:

1. Add a new entry at the TOP of the chronological log (under the "Project progress log" header).
2. Date format: `2026-05-XX (Session: <topic>)` for sessions, `2026-05-XX` for daily progress.
3. Sections: Milestone, What was done, Key decisions, Open questions.
4. Each "Key decision" includes: what was decided, WHY, and what alternative was considered/rejected.
5. Update ROADMAP.md if priorities shift.

The "why" matters more than the "what". In 6 months, you (or a new contributor) will not
remember why a decision was made. The entry should answer the question.
