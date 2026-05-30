# @ricardoqmd/auth-nextjs

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

## 0.1.1

### Patch Changes

- 688e273: Support Next.js 16

  Next.js 16 was released on May 6, 2026, after the v0.1.0 publication. The
  previous peerDependency range "<16.0.0" prevented installation in projects
  using Next.js 16. The range has been expanded to ">=14.0.0 <17.0.0" to allow
  Next.js 14, 15, and 16.

  Internal devDependency @xstate/react was bumped from 4.1.3 to 5.0.5 to support
  React 19 (no API changes for consumers).

  No source code changes required. Package code is forward-compatible.

  Verified end-to-end with Next.js 16 + Keycloak (local and production):

  - Login flow
  - Proactive token refresh
  - Logout
  - Session persistence on reload
  - RBAC helpers (hasRole, hasAnyRole, hasResourceRole)

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
