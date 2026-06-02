# ADR-009: Freeze the public API surface for 1.0

**Date:** 2026-06-02  
**Status:** Accepted

## Context

ADR-006 makes "freeze the public API" a prerequisite for 1.0, and ADR-008
finished the surface review: domain contracts are public, XState machine
internals are `@internal`. Coverage is at ~83% (above the 1.0 bar) and the three
packages shipped that surface in 0.3.0. What remained was to commit to it.

Before committing under semver, the surface was exercised end-to-end against real
Keycloak, not just unit tests:

- An integration spike wired a fresh Next.js app from the demo and ran it against
  **Keycloak 18** (current production) and **Keycloak 26** (next production) —
  both worked, confirming the `keycloak-js >=26 <28` peer range from the adapter
  side and that 18+ still speaks standard OIDC for our usage.
- The demo was turned into a reference app exercising the full consumer surface:
  public + protected routes via a consumer-side guard, `login()` / `logout()`,
  the role helpers (`hasRole` / `hasAnyRole` / `hasResourceRole`), typed
  `idpClaims`, and the structured `AuthError`.

The structured-error contract (`AuthError.code`) got specific attention because a
frozen union is a long-lived promise. All four mappings are pinned by green unit
tests in `auth-core` (`machine.test.ts`):

- `INIT_FAILED` — verified live (Keycloak down at boot).
- `NETWORK_ERROR` — verified live (refresh hangs past the operation timeout).
- `REFRESH_FAILED` — verified live (refresh token revoked while Keycloak is
  reachable → `invalid_grant` → fast reject).
- `TOKEN_EXPIRED` — **not reachable through `auth-keycloak`.** The machine emits
  it only when `refreshToken()` resolves `null`, and the adapter returns `null`
  only if `kc.updateToken()` resolves without token fields — which a real
  Keycloak never does (a dead refresh token *rejects*, surfacing as
  `REFRESH_FAILED`). This is the documented v0.x adapter limitation. The
  machine-level mapping `null → TOKEN_EXPIRED` is still proven by unit test.

## Decision

Freeze the public API surface as shipped in 0.3.0. The frozen surface is:

- **auth-core:** `AuthTokens`, `AuthUserClaims`, `AuthInitResult`,
  `LogoutOptions`, the `AuthProvider` port, `AuthError`, `createAuthMachine`.
  (`AuthContext` / `AuthEvent` remain `@internal` per ADR-008.)
- **auth-keycloak:** `KeycloakProviderConfig`, `KeycloakProviderOptions`,
  `KeycloakIdpClaims`, `hasResourceRole`, `createKeycloakProvider`.
- **auth-nextjs:** `AuthState`, `AuthProviderProps`, the `AuthProvider`
  component, `useAuth`.

Keep the `AuthError.code` union **as-is** (`INIT_FAILED` | `REFRESH_FAILED` |
`TOKEN_EXPIRED` | `NETWORK_ERROR`). `TOKEN_EXPIRED` is documented as **reserved /
not currently emitted by `auth-keycloak`** (JSDoc note on the type pointing here).

Post-1.0, changes follow semver: adding a new `code` is non-breaking when
consumers branch with a `default`; **removing or renaming** a `code`, or adding a
method to the `AuthProvider` port, is a MAJOR change.

This freezes the **API**; it does not declare 1.0. The 1.0 tag still waits on the
external gate from ADR-006: at least one real consumer in production.

## Rationale

A frozen 1.0 must rest on contracts that were actually used, not just compiled.
The spike (two Keycloak majors) plus the reference demo provide that evidence, and
the error-code matrix is fully unit-tested with three of four also verified live.

Keeping `TOKEN_EXPIRED` rather than dropping it is the conservative, semver-safe
choice: removing a union member is breaking (a consumer may already `switch` on
it), while a future adapter (e.g. Entra) or a future Keycloak refresh-token-`exp`
inspection could legitimately emit it. Documenting it as reserved keeps the
contract both stable and honest.

## Alternatives considered

- **Drop `TOKEN_EXPIRED` from the 1.0 union.** Smaller, fully-live-reachable
  surface — but removing a code is breaking, and re-adding it later would be a
  churn the "stable over comprehensive" principle argues against. Rejected.
- **Defer the freeze until `TOKEN_EXPIRED` is verified live.** Impossible by
  design with the current adapter; would block 1.0 on an unreachable state.
  Rejected — the unit test is the correct assurance here.
- **Freeze without the live spike.** Would commit under semver on compile-time
  confidence alone. Rejected — the spike surfaced the `TOKEN_EXPIRED`
  reachability gap, which is exactly what it was for.

## Consequences

- (+) Consumers (platform-react, RH) can depend on a stable surface; the path to
  the 1.0 tag is now only the external consumer gate.
- (+) The error contract is explicit and documented, including its one reserved
  member.
- (−) The frozen surface raises the cost of additions to existing types: adding a
  method to the `AuthProvider` port becomes a MAJOR change (every adapter must
  implement it). This is intentional friction.
- (−) `TOKEN_EXPIRED` ships as a reserved-but-unemitted code; harmless (consumers
  with a `default` handle it) but technically dead until an adapter emits it.

## Revisit if

- `auth-keycloak` gains a way to distinguish refresh-token expiry from network
  failure (e.g. inspecting the refresh token's `exp` before `updateToken()`),
  making `TOKEN_EXPIRED` live-reachable — update the reserved note.
- A second adapter or a new consumer requires a change to a frozen type, forcing
  a deliberate MAJOR bump.
