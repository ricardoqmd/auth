# ADR-008: Public API surface for 1.0 — surface structured `AuthError`, hide machine internals

**Date:** 2026-06-01  
**Status:** Accepted

## Context

ADR-006 makes "freeze the public API" a prerequisite for 1.0. Freezing a surface
that has not been deliberately reviewed risks committing — under semver — to
exports that were never meant to be public. A pre-1.0 surface review of the three
packages found that `auth-keycloak` and `auth-nextjs` only export intentional
contracts, but `auth-core`'s barrel (`src/index.ts`) re-exported three types from
the state machine: `AuthContext`, `AuthEvent`, and `AuthError`.

`AuthContext` and `AuthEvent` are XState machine internals — the context shape and
the event union. No package or test consumes them (`auth-nextjs` imports only
`createAuthMachine`, the `AuthProvider` port, and `AuthUserClaims`). Exposing them
in a frozen 1.0 would couple consumers to the machine's internal wiring: the
machine's context or events could not change without a major bump.

`AuthError` is different — it is a domain contract (`{ code, message }` with a
discriminated `code`). But it was an **orphaned** public export: the binding threw
it away. Both `useAuth().error` and the `AuthProvider` `errorComponent` prop
flattened the structured error into `new Error(message)`, discarding `code`.
Consumers received only a message string and could not distinguish, for example,
an expired session (re-login) from a network failure (retry).

This is the right moment to decide the surface: pre-1.0, no semver promise is in
force yet.

## Decision

Draw the line between **domain contracts** (portable, public, shared across
bindings) and **implementation wiring** (internal):

1. **`AuthContext` and `AuthEvent` leave the public surface.** They are removed
   from the `auth-core` barrel and marked `@internal`. They still exist in
   `machine.ts` for internal use; they are no longer reachable through the
   package's `exports` map.

2. **`AuthError` becomes a first-class, *consumed* public type.** The binding
   stops flattening it. `AuthState.error` and the `errorComponent` argument are
   now typed `AuthError | null` / `AuthError`, and the structured value is passed
   straight through. Consumers branch on `error.code`.

The intentional public surface is therefore: `auth-core` —
`AuthTokens`, `AuthUserClaims`, `AuthInitResult`, `LogoutOptions`, `AuthProvider`,
`createAuthMachine`, `AuthError`; `auth-keycloak` — `KeycloakProviderConfig`,
`KeycloakProviderOptions`, `KeycloakIdpClaims`, `hasResourceRole`,
`createKeycloakProvider`; `auth-nextjs` — `AuthState`, `AuthProviderProps`,
`AuthProvider`, `useAuth`.

## Reasons

- A frozen 1.0 must not expose machine internals; doing so would block changing
  the machine without a major bump.
- Surfacing `AuthError` turns an orphaned export into genuinely useful API. In the
  target domain (government / health SPAs), distinguishing `TOKEN_EXPIRED` from
  `NETWORK_ERROR` from `INIT_FAILED` is necessary UX, not a nicety.
- `AuthError` lives in `auth-core` (framework-agnostic), so it is the *shared*
  contract: a future `auth-vue` binding surfaces the same type via its own
  idiomatic delivery (composable / slot). The contract is portable; only the
  binding shape is framework-specific.

## Alternatives considered

**Keep `errorComponent`/`useAuth().error` as a flattened `Error` and drop
`AuthError` from the barrel.**  
Smaller surface, but the `code` discriminator would be lost for good in 1.0, and
consumers could only read a message string. Rejected: it removes information the
machine already produces, for no real simplicity gain.

**Make `AuthError extends Error` (a custom Error subclass).**  
Gives `instanceof Error` and `.code` at once. Rejected as over-engineering for
1.0: a plain `{ code, message }` is idiomatic for React/Vue state and easy to
branch on; consumers rarely need to `throw` the auth error or read its stack.

**Leave `AuthContext`/`AuthEvent` exported "just in case."**  
Rejected. Nothing consumes them, and exporting them freezes the machine's internal
shape into the public contract.

## Consequences

**Positive:**

- The 1.0 surface is intentional and reviewed; nothing public leaks the machine.
- Consumers get a structured, branchable error — and the same contract will carry
  to the future Vue binding.
- Covered by a new test asserting `errorComponent` receives the structured
  `AuthError`; this also guards `AuthError`'s public importability.

**Negative / neutral:**

- Breaking change to `AuthState.error` and `errorComponent`'s argument
  (`Error` → `AuthError`). Pre-1.0, this lands in a MINOR per the repo convention.
- `error` is no longer an `Error` instance (no `stack`, not throwable). For state
  and UX branching this is preferable; consumers who need an `Error` can wrap it.

## Forward compatibility

The `code` union is extensible: **adding** a new code later (e.g.
`REFRESH_EXPIRED`) is non-breaking as long as consumers keep a `default` branch.
Only removing or renaming a code is breaking. Document the `default` guidance for
consumers.

## Revisit if

A universal need arises to expose machine state/events to consumers, or a future
binding requires `AuthError` to be an `Error` subclass.
