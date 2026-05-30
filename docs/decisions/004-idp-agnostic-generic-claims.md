# ADR-004: IDP-agnostic design with generic `idpClaims<TIdpClaims>`

**Date:** 2026-05-28  
**Status:** Accepted

## Context

In v0.1.x, the `AuthContext` and `useAuth()` hook exposed Keycloak-specific fields directly: `realmRoles: string[]`, `resourceRoles: Record<string, { roles: string[] }>`, and the `hasResourceRole()` method. These are shaped after Keycloak's token structure (`realm_access.roles`, `resource_access`).

This created a structural problem: `auth-core` — which is supposed to be IDP-agnostic — was carrying Keycloak-specific knowledge in its context shape. A future Entra ID adapter would have to either map its claims into a Keycloak-shaped structure (inverting the dependency) or fork the core.

The v0.2.0 refactor was the right moment to fix this before the API stabilizes.

## Decision

1. Replace Keycloak-specific fields in `AuthContext` with a single generic field: `idpClaims: TIdpClaims | null`. The generic defaults to `unknown`.

2. Add a universal `user.roles: string[]` field to `AuthUserClaims`. Every adapter is responsible for mapping its IDP-specific role representation into this array. For Keycloak, this means mapping `realm_access.roles`.

3. Expose `hasRole()` and `hasAnyRole()` in `useAuth()` operating on `user.roles` — these are the universal role checks, valid across all IDPs.

4. Move `hasResourceRole()` to `auth-keycloak` as a standalone utility (see ADR-005).

Consumers opt into typed IDP-specific access by passing their adapter's claims interface to the hook:

```tsx
const { idpClaims } = useAuth<KeycloakIdpClaims>();
// idpClaims is now KeycloakIdpClaims | null — full type safety
```

## Alternatives considered

**Keep Keycloak's shape as the universal contract**  
Rejected. This permanently couples `auth-core` to Keycloak's token structure. Every future adapter (Entra ID, Cognito, Auth0) would have to map its claims into a Keycloak-flavored object, which is backwards — the port should not know about the adapter's internals.

**Discriminated union of all known IDP claim shapes**  
Rejected. This couples `auth-core` to every IDP that will ever be supported. Adding a new adapter would require a change in `auth-core`, breaking the hexagonal isolation.

**`any` type for idpClaims**  
Rejected. `any` propagates unsafety across the codebase. `unknown` with opt-in generic typing gives consumers full type safety when they want it and explicit type narrowing when they don't pass a type parameter.

**Separate typed hook per adapter (e.g., `useKeycloakAuth()`)**  
Rejected. Would require each adapter to re-implement the hook instead of just exporting a claims interface. The framework binding would proliferate with adapter-specific hooks.

## Consequences

**Positive:**
- `auth-core` has zero knowledge of any specific IDP's claim structure.
- New adapters only need to implement the `AuthProvider<TIdpClaims>` interface and export their claims type — no changes to `auth-core` or `auth-nextjs` required.
- Consumers get full TypeScript autocomplete on IDP-specific fields when they pass the type parameter.

**Negative:**
- Breaking change for v0.1.x consumers: `realmRoles`, `resourceRoles`, and `hasResourceRole()` are removed from the hook return value. Migration requires updating imports (see PROGRESS.md 2026-05-28 entry).
- Slightly more verbose usage for Keycloak consumers who need resource roles: must import `hasResourceRole` explicitly from `@ricardoqmd/auth-keycloak`.
