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

export interface AuthUserClaims {
  /** Subject — unique user ID */
  sub?: string;
  /** Preferred username */
  preferred_username?: string;
  /** Full name */
  name?: string;
  /** Email */
  email?: string;
  /** Realm-level roles (Keycloak) */
  realm_access?: { roles: string[] };
  /** Per-resource roles (Keycloak) */
  resource_access?: Record<string, { roles: string[] }>;
  /** Standard expiration claim — epoch seconds */
  exp?: number;
  /** Standard issued-at claim — epoch seconds */
  iat?: number;
  /** Allow extra claims without losing typing */
  [key: string]: unknown;
}

export interface AuthInitResult {
  authenticated: boolean;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenParsed?: AuthUserClaims;
  realmRoles?: string[];
  resourceRoles?: Record<string, { roles: string[] }>;
}

/**
 * Adapter contract — implement this to plug any IDP into the state machine.
 * Reference implementation: @ricardoqmd/auth-keycloak
 */
export interface AuthProvider {
  init(): Promise<AuthInitResult>;
  login(): Promise<void>;
  logout(): Promise<void>;
  refreshToken(minValidity?: number): Promise<AuthTokens | null>;
}

// ============================================================================
// Machine — see ./machine.ts (will be implemented in next step)
// ============================================================================

export { createAuthMachine } from "./machine.js";
export type { AuthContext, AuthEvent } from "./machine.js";
