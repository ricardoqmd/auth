---
"@ricardoqmd/auth-core": minor
"@ricardoqmd/auth-keycloak": minor
"@ricardoqmd/auth-nextjs": minor
---

First real implementation of core packages

- auth-core: XState v5 machine for authentication flows with typed context, guards, delayed transitions, and async actors. Public types include AuthError discriminated by code (INIT_FAILED, REFRESH_FAILED, TOKEN_EXPIRED, NETWORK_ERROR) and LogoutOptions for per-call redirect override.

- auth-keycloak: createKeycloakProvider implementing the AuthProvider contract using keycloak-js >=26.0 as peer dependency. Idempotent init() guard handles React 18 Strict Mode correctly. Multi-level fallback for logout redirect URI.

- auth-nextjs: AuthProvider gate component (loadingComponent, errorComponent, renderOnUnauthenticated) and useAuth() hook with RBAC helpers (hasRole, hasAnyRole, hasResourceRole). Designed for SPA redirect-on-boot pattern.

This is the first publishable version. End-to-end tested manually against local Keycloak.
