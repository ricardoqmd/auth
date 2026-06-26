# @ricardoqmd/auth-vue

## 0.2.0

### Minor Changes

- Expose the imperative `AuthHandle` from `createAuth()`: the returned value is now
  `Plugin & AuthHandle`, so the same object installs as a Vue plugin and drives route
  guards / HTTP interceptors (`whenReady` / `isAuthenticated` / `hasRole` / ...) outside
  components, where `useAuth()` cannot run. `useAuth()` is unchanged. Requires
  auth-core ^1.1.0. See ADR-014.

## 0.1.0

### Minor Changes

- Initial release of @ricardoqmd/auth-vue: Vue 3 client-side binding for
  @ricardoqmd/auth-core — createAuth plugin + useAuth() composable with RBAC
  helpers. IDP-agnostic; SPA/client-only (SSR-ready by construction, SSR not a
  supported target in v0.x).
