# @ricardoqmd/auth-keycloak

## 1.0.0

### Major Changes

- Promote the frozen public surface to a stable 1.0.0.

  No new breaking changes: the API was frozen at 0.3.0 (ADR-009) and validated
  end-to-end against real infrastructure (ADR-010). From 1.0.0 the surface is
  governed by SemVer — additive changes are non-breaking; removing or renaming an
  export, or adding a method to the AuthProvider port, is a major bump.

### Patch Changes

- Updated dependencies [6553344]
- Updated dependencies
  - @ricardoqmd/auth-core@1.0.0

## 0.3.0

### Patch Changes

- Updated dependencies [d54643a]
  - @ricardoqmd/auth-core@0.3.0

## 0.2.1

### Patch Changes

- Refresh package README and align docs with v0.2.0 (no API changes)
- Updated dependencies
  - @ricardoqmd/auth-core@0.2.1

## 0.2.0

### Minor Changes

- Refactor: IDP-agnostic claims via generic `idpClaims<T>`

  BREAKING CHANGE: All state and provider types are now generic.

  What changed:

  - `AuthState<TIdpClaims>`, `AuthProvider<TIdpClaims>`, `AuthContext<TIdpClaims>`
    are now generic with default `= unknown`.
  - `user.roles: string[]` is the new universal OIDC field (each adapter maps).
  - `hasRole()` and `hasAnyRole()` in auth-core operate on `user.roles`.
  - `hasResourceRole()` moved to auth-keycloak as a standalone utility:
    `import { hasResourceRole } from '@ricardoqmd/auth-keycloak'`.
  - `KeycloakIdpClaims` interface exported from auth-keycloak.

  Why:

  - Enables future IDP adapters (Entra ID, Cognito, Auth0) without forced mappings.
  - Keeps auth-core truly framework- and IDP-agnostic.
  - Preserves type safety per adapter via TypeScript generics.

  Migration (typed):
  const { hasRole, idpClaims } = useAuth<KeycloakIdpClaims>();

  Verified end-to-end against Keycloak 26 with realm + resource roles.

### Patch Changes

- Updated dependencies
  - @ricardoqmd/auth-core@0.2.0

## 0.1.0

### Minor Changes

- 87e8978: First real implementation of core packages

  - auth-core: XState v5 machine for authentication flows with typed context, guards, delayed transitions, and async actors. Public types include AuthError discriminated by code (INIT_FAILED, REFRESH_FAILED, TOKEN_EXPIRED, NETWORK_ERROR) and LogoutOptions for per-call redirect override.

  - auth-keycloak: createKeycloakProvider implementing the AuthProvider contract using keycloak-js >=26.0 as peer dependency. Idempotent init() guard handles React 18 Strict Mode correctly. Multi-level fallback for logout redirect URI.

  - auth-nextjs: AuthProvider gate component (loadingComponent, errorComponent, renderOnUnauthenticated) and useAuth() hook with RBAC helpers (hasRole, hasAnyRole, hasResourceRole). Designed for SPA redirect-on-boot pattern.

  This is the first publishable version. End-to-end tested manually against local Keycloak.

### Patch Changes

- Updated dependencies [87e8978]
  - @ricardoqmd/auth-core@0.1.0
