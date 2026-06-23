# ADR-014: Imperative auth access — `createAuthHandle` in core

**Date:** 2026-06-23  
**Status:** Accepted

## Context

ADR-012 added `auth-vue`. Integrating it against a real `vue-router` SPA surfaced
a gap: `useAuth()` is a composable — it depends on `inject` and a component effect
scope, so it can only be called inside `setup()`. A `router.beforeEach` guard runs
**outside** any component, so route-level RBAC (`meta.roles` + guard) is impossible
in v0.x: the composable throws there. A naive guard also faces a startup race — on
the first navigation it runs before `provider.init()` resolves (the actor is still
`initializing`), so reading `isAuthenticated` too early would bounce an
authenticated user to login.

The same underlying need already exists on the React side. A Next.js application
built on this library attaches the bearer token in its HTTP layer by reading it
imperatively from a module-level variable, kept in sync by a small effect-only
component that pushes `useAuth().token` outward. That bridge exists only because
the library offers no imperative way to read auth state outside the render tree.

So the need — **read auth state imperatively, outside the framework's render
tree** — is concrete in real usage of both bindings: a token for an HTTP
interceptor (Next.js) and roles + readiness for a router guard (Vue). The "promote
at second consumer" bar is met by real usage, not speculation. Separately, the
derivations involved (`isAuthenticated`, `isLoading`, `hasRole`, token/user/error
reads) are framework-agnostic and are currently duplicated in each binding's
hook/composable. The underlying XState actor already exposes `getSnapshot()` and
`subscribe()`.

## Decision

Add `createAuthHandle(actor)` to `auth-core` — a framework-agnostic façade over the
actor, with **semantic accessors only**:

```ts
export interface AuthHandle<TIdpClaims = unknown> {
  isAuthenticated(): boolean;
  isLoading(): boolean;
  getToken(): string | null;
  getUser(): AuthUserClaims | null;
  getIdpClaims(): TIdpClaims | null;
  getError(): AuthError | null;
  hasRole(role: string): boolean;
  hasAnyRole(roles: string[]): boolean;
  whenReady(): Promise<void>;            // resolves once the actor leaves `initializing`
  subscribe(listener: () => void): () => void;
}
export function createAuthHandle<TIdpClaims = unknown>(actor): AuthHandle<TIdpClaims>;
```

This is **additive** to a frozen-1.0 package (ADR-009): `auth-core` goes `1.0.0 →
1.1.0`, no existing surface changes, nothing breaks.

- **Closed surface — no raw `snapshot()` escape hatch.** The handle never exposes
  the raw XState snapshot, honoring ADR-008 ("surface a semantic API, hide machine
  internals"). If a consumer needs a value not yet covered (e.g. `expiresAt`), a
  specific accessor is added — additive (MINOR). Opening a closed surface later is
  cheap; closing an open one is breaking, so we start closed.
- **Single home for the derivations.** The handle owns the derivation logic;
  bindings reimplement only their framework reactivity *on top of* the handle,
  removing the per-binding duplication.

Realization is spread across additive, independently-versioned releases (ADR-013):

1. **`auth-core` 1.1.0** — adds `createAuthHandle`.
2. **`auth-vue` 0.2.0** — `createAuth()` returns `Plugin & AuthHandle`; `useAuth()`
   is reimplemented over the handle with no surface change; route guards become
   possible via `whenReady()` + the imperative accessors. (Also folds in README
   install and peer-dependency corrections found during integration.)
3. **`auth-nextjs` 1.1.0** — exposes the handle, so a Next.js consumer can drop the
   token bridge and read `handle.getToken()` directly in its HTTP layer.

Steps are independent: stopping after step 2 (Vue unblocked) is valid; step 3
happens whenever `auth-nextjs` is next touched.

## Alternatives considered

- **Keep the handle in `auth-vue` only.** Rejected: imperative access is needed in
  real usage of both the React and Vue bindings, so a Vue-only handle would force
  the Next.js binding — and any future binding (e.g. Angular) — to re-solve the
  same problem and re-duplicate the derivations.
- **Expose the raw actor / a `snapshot()` escape hatch.** Maximizes flexibility but
  leaks XState internals, contradicts ADR-008, and lets consumers couple to
  internal state names (`"refreshing"`, etc.) that were never public — renaming a
  state would then break them. Rejected; open additively later only if a real need
  appears.
- **Leave the module-global token bridge as the pattern.** Rejected as the target
  state: duplicated source of truth (the token lives in the actor *and* the
  global), an SSR-unsafe module-level mutable, and a fragile effect-driven sync.
  Existing consumers keep their bridge until `auth-nextjs` adopts the handle — not
  forced.
- **Reactive-only access (no imperative path).** Rejected: the need is precisely
  *outside* the render tree (guards, interceptors), where reactive hooks cannot run.

## Consequences

**Positive:**

- Imperative auth access for route guards (Vue `beforeEach`, Angular `CanActivate`)
  and HTTP interceptors (token), framework-agnostic, from a single source.
- The derivation logic lives once in core; new bindings (e.g. Angular) become
  thin — handle plus the framework's reactivity glue — instead of re-deriving.
- Retires the effect-component + module-global token bridge on the React side: one
  source of truth, SSR-safe.
- Everything is additive (core 1.1.0; bindings adopt on their own schedule,
  ADR-013) — no breaking change anywhere.

**Negative:**

- Three coordinated (but independent) releases to fully realize.
- Slightly larger core public surface (one factory + the `AuthHandle` type);
  bounded by the closed accessor set.
- `auth-nextjs` adoption is optional/deferred; existing consumers keep their bridge
  until then.

## Revisit if

- A consumer needs internal state not covered by the accessors (`expiresAt`, the
  `refreshing` sub-state, …) — add that specific accessor (additive); do **not**
  open a raw snapshot.
- A framework-neutral *reactive* primitive is needed beyond `subscribe()` (e.g.
  core-level signals) — reconsider whether `subscribe()` suffices.
