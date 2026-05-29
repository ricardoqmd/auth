/**
 * @ricardoqmd/auth-core
 *
 * Framework-agnostic authentication primitives.
 * No runtime dependencies on React, Next.js, or any specific IDP client.
 */

// ============================================================================
// Types — public contract (changes here = MAJOR bump)
// ============================================================================

export interface AuthTokens {
  token: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

/**
 * Standard OIDC user claims, normalized across IDPs.
 *
 * Every adapter is responsible for mapping its IDP-specific claims to this
 * shape. For example, auth-keycloak maps `realm_access.roles` to `roles`.
 * auth-entra (future) maps the `roles` claim directly.
 */
export interface AuthUserClaims {
  /** Subject — unique user ID */
  sub?: string;
  /** Preferred username */
  preferred_username?: string;
  /** Full name */
  name?: string;
  /** Email */
  email?: string;
  /** Normalized list of role strings.
   * Each adapter maps its native role representation to this universal field.
   */
  roles?: string[];
  /** Standard expiration claim — epoch seconds */
  exp?: number;
  /** Standard issued-at claim — epoch seconds */
  iat?: number;
}

export interface AuthInitResult<TIdpClaims = unknown>{
  authenticated: boolean;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: AuthUserClaims;
  idpClaims?: TIdpClaims;
}

/** Options accepted by AuthProvider.logout() on a per-call basis. */
export interface LogoutOptions {
  /**
   * URI to redirect to after logout completes.
   * Must be an absolute URL registered in the IDP client's allowed redirect URIs.
   * Falls back to the provider-level default when omitted.
   */
  redirectUri?: string;
}

/**
 * Adapter contract — implement this to plug any IDP into the state machine.
 * Reference implementation: @ricardoqmd/auth-keycloak
 */
export interface AuthProvider<TIdpClaims = unknown> {
  init(): Promise<AuthInitResult<TIdpClaims>>;
  login(): Promise<void>;
  logout(options?: LogoutOptions): Promise<void>;
  refreshToken(minValidity?: number): Promise<AuthTokens | null>;
}

// ============================================================================
// Machine — see ./machine.ts (will be implemented in next step)
// ============================================================================

export { createAuthMachine } from "./machine.js";
export type { AuthContext, AuthError, AuthEvent } from "./machine.js";
