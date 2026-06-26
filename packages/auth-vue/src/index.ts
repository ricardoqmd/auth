/**
 * @ricardoqmd/auth-vue
 *
 * Vue 3 (client-side) bindings for @ricardoqmd/auth-core.
 * createAuth plugin + useAuth() composable with RBAC helpers.
 *
 * IDP-agnostic: inject any AuthProvider (e.g. createKeycloakProvider() from
 * @ricardoqmd/auth-keycloak). The contract (AuthError, claims, init/login/
 * logout) lives in auth-core and is identical to @ricardoqmd/auth-nextjs.
 */
export { createAuth, type CreateAuthOptions } from "./plugin.js";
export { useAuth, type AuthState } from "./composable.js";
export type { AuthActor } from "./injection-key.js";

// Re-export the shared contract from core for consumer convenience.
export type {
  AuthError,
  AuthTokens,
  AuthUserClaims,
  AuthInitResult,
  LogoutOptions,
  AuthProvider,
  AuthHandle,
} from "@ricardoqmd/auth-core";
