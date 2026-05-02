/**
 * Authentication state machine.
 *
 * STATUS: Skeleton — full implementation lands in next step.
 * This file exists so types resolve and the package builds clean.
 */

import type { AuthProvider, AuthUserClaims } from "./index.js";

export interface AuthContext {
  token: string | null;
  refreshToken: string | null;
  tokenParsed: AuthUserClaims | null;
  expiresAt: number | null;
  realmRoles: string[];
  resourceRoles: Record<string, { roles: string[] }>;
  error: Error | null;
}

export type AuthEvent =
  | { type: "INIT" }
  | { type: "LOGIN" }
  | { type: "LOGOUT" }
  | { type: "TOKEN_EXPIRED" }
  | { type: "REFRESH" };

/**
 * Placeholder factory — returns a stub object until the machine is wired.
 * Will be replaced with `setup(...).createMachine(...)` in next implementation step.
 */
export function createAuthMachine(_provider: AuthProvider) {
  return {
    __stub: true as const,
    note: "Machine implementation pending — see roadmap track 1, step 'auth-core'.",
  };
}
