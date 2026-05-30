# ADR-005: `hasResourceRole` as a standalone utility in `auth-keycloak`

**Date:** 2026-05-28  
**Status:** Accepted

## Context

In v0.1.x, `useAuth()` returned a `hasResourceRole(resource, role)` method alongside `hasRole()` and `hasAnyRole()`. This was convenient for consumers but created a coupling problem.

`resource_access` is a Keycloak-specific concept in JWT tokens. It represents client-level roles scoped to a specific OAuth resource (e.g., `resource_access["my-app"].roles`). Other identity providers handle this differently:
- **Cognito** uses groups, not resource-scoped roles.
- **Entra ID** has app roles, configured as flat claims.
- **Auth0** uses custom claims with no standard structure.

None of these have a direct analog to `resource_access`. Keeping `hasResourceRole()` in the `useAuth()` return type would mean `auth-nextjs` either needs to understand Keycloak's claim structure (breaking IDP-agnosticism) or the method becomes meaningless for non-Keycloak adapters.

This decision was made as part of the v0.2.0 IDP-agnostic refactor (ADR-004).

## Decision

Remove `hasResourceRole()` from the `useAuth()` hook return value and export it as a **standalone pure function** from `auth-keycloak`:

```typescript
// @ricardoqmd/auth-keycloak
export function hasResourceRole(
  claims: KeycloakIdpClaims | null,
  resource: string,
  role: string
): boolean {
  return claims?.resource_access?.[resource]?.roles?.includes(role) ?? false;
}
```

Consumers who need resource-level role checks import it explicitly:

```tsx
import { hasResourceRole } from "@ricardoqmd/auth-keycloak";
import type { KeycloakIdpClaims } from "@ricardoqmd/auth-keycloak";

const { idpClaims } = useAuth<KeycloakIdpClaims>();
hasResourceRole(idpClaims, "my-app", "editor");
```

## Alternatives considered

**Keep `hasResourceRole` in `useAuth()`, make it Keycloak-specific internally**  
Rejected. The `AuthState` interface is defined in `auth-nextjs`, which must not import from `auth-keycloak` (that would invert the dependency — the binding would depend on the adapter). The hook's return type would become adapter-specific, breaking the abstraction.

**Keep it in `useAuth()` but type it as a no-op for non-Keycloak adapters**  
Rejected. A method that silently returns `false` for non-Keycloak users is worse than no method — it misleads consumers into thinking they're checking roles when they're not.

**Move it to `auth-core` as a utility**  
Rejected. `auth-core` must remain IDP-agnostic. Hosting a utility that inspects `resource_access` would import Keycloak's claim structure into the core, breaking the hexagonal boundary.

## Consequences

**Positive:**
- `auth-nextjs` has no knowledge of any IDP-specific claim structure.
- The import site makes the Keycloak dependency explicit: `import { hasResourceRole } from "@ricardoqmd/auth-keycloak"` signals clearly that this is a Keycloak-specific check.
- The function is a pure utility — easily testable without any React or XState setup (5 tests, zero mocks needed).

**Negative:**
- Breaking change for v0.1.x consumers: must update the import source and call signature (from `hasResourceRole("resource", "role")` to `hasResourceRole(idpClaims, "resource", "role")`).
- Slightly less ergonomic — requires an explicit import instead of destructuring from the hook.
