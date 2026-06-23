# ADR-012: Vue binding (`auth-vue`) — plugin + composable, client-only scope

**Date:** 2026-06-10  
**Status:** Accepted

## Context

ADR-006 deferred Vue bindings and SSR to post-1.0, to be built only when a
concrete consumer needs them. That demand arrived: a department team is building
a Vue 3 SPA that needs authentication and intends to use it as the base for a
broader platform. `auth-core` (the contract and state machine) is frozen and
tested (ADR-009). The hexagonal architecture (ADR-002) claims a second framework
binding can be added by writing a new adapter against the core port, without
touching `auth-core` or `auth-keycloak`. This is the first time that claim is
exercised on the framework axis. The immediate consumer is a client-side SPA
(Vite), not Nuxt/SSR.

## Decision

Build `@ricardoqmd/auth-vue` as a second framework binding, parallel to
`auth-nextjs`, consuming `auth-core` unchanged and importing no IdP adapter
(IDP-agnostic — the consumer injects the provider).

- **Shape: a Vue plugin plus a composable.** `createAuth({ provider })` returns a
  plugin; `app.use(...)` creates **one** XState actor per app instance via
  `createActor(createAuthMachine(provider))`, starts it, sends `INIT`, and
  `provide`s it app-wide. `useAuth()` injects that actor and returns reactive
  `ComputedRef`s (`isLoading`, `isAuthenticated`, `token`, `user`, `idpClaims`,
  `error`) plus methods (`login`, `logout`, `hasRole`, `hasAnyRole`), with
  reactivity from `@xstate/vue`'s `useSelector`.
- **One actor per app instance, never a module-level singleton** — the property
  that keeps state from leaking between requests, so the binding is SSR-ready by
  construction.
- **Identical contract to `auth-nextjs`.** `AuthError`, claims, and the
  init/login/logout semantics live in `auth-core` (ADR-008). Vue exposes the same
  surface; only the reactivity wrapper differs (`ComputedRef` vs React's plain
  values), which is the binding's job.
- **Scope: SPA / client-only.** SSR-ready by construction, but **SSR is not a
  supported target** in v0.x — not tested, not maintained.
- **No state-library dependency** (no Pinia). State lives in the XState actor; a
  consumer wanting Pinia wraps `useAuth()` in their own store.
- **Starts at 0.x.** The contract is mature, but the binding layer is new; it
  earns its 1.0 with a real Vue consumer in production (ADR-006 / ADR-010
  criterion). Pre-1.0, breaking changes to its own surface go in MINOR.

## Alternatives considered

- **A root `<AuthProvider>` component instead of a plugin.** Visual symmetry with
  the React `<AuthProvider>` and the same SSR-safe property (`provide` in `setup`,
  per app). Rejected as the default because the plugin is idiomatic and leaves the
  consumer's root clean; the component remains a possible drop-in.
- **A module-level singleton actor.** Simpler, but hostile to SSR and to testing.
  Rejected.
- **Support SSR (Nuxt) from v0.** Contradicts the `auth-nextjs-ssr` deferral and
  adds surface with no concrete demand. Rejected; SSR stays a separate, on-demand
  decision.
- **Pinia as the base mechanism.** Couples the binding to a state library and
  breaks neutrality. Rejected; a Pinia adapter remains possible on demand.
- **Modify `auth-core` to accommodate Vue.** Would mean the hexagonal design did
  not hold. Explicitly out of scope — had it been needed, that is a finding to
  document, not a patch.

## Consequences

**Positive:**

- A second framework binding shipped with **zero changes to `auth-core` or
  `auth-keycloak`** — concrete validation of the hexagonal design. (Realized:
  `auth-vue@0.1.0` published; the only contract coupling is a peer-dependency
  range.)
- A homogeneous contract across Next and Vue; consumers migrate frameworks reusing
  the same mental model.
- SSR-ready at near-zero cost without committing to maintain SSR.

**Negative:**

- A third binding setup to maintain (Next, Vue) with its own demo and tests.
- `@xstate/vue` enters as a dependency, and the plugin needs `xstate` directly for
  `createActor` (see ADR-013) — `auth-nextjs` never imports `xstate` because
  `@xstate/react` creates the actor inside its hook.
- `auth-vue` stays on 0.x until it earns 1.0 — its API is not yet frozen.

A built-in gating component (`<AuthGate>`, mirroring React's
`loadingComponent`/`errorComponent`) was deliberately deferred; in v0.x the
consumer gates with `v-if` on `isLoading`/`error`. Adding it later is additive
(non-breaking).

## Revisit if

- Concrete SSR/Nuxt demand appears for Vue — scoped as a separate decision, not
  smuggled in through the binding.
- Making Vue work requires touching `auth-core` / `auth-keycloak` — the hexagonal
  design did not hold; document and redesign.
- A second Vue consumer needs first-class Pinia integration — evaluate an optional
  Pinia adapter without making it a base dependency.
