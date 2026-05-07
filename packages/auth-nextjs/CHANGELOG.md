# @ricardoqmd/auth-nextjs

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
