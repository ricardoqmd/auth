/**
 * @ricardoqmd/auth-nextjs
 *
 * Next.js (client-side) bindings for @ricardoqmd/auth-core.
 * Provides <AuthProvider> and useAuth() hook with RBAC helpers.
 *
 * STATUS: Skeleton — full implementation lands in next step.
 */

"use client";

import * as React from "react";
import type { AuthProvider as IAuthProvider, AuthUserClaims } from "@ricardoqmd/auth-core";

// ============================================================================
// Public types — part of the stable API contract
// ============================================================================

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: AuthUserClaims | null;
  error: Error | null;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasResourceRole: (resource: string, role: string) => boolean;
}

export interface AuthProviderProps {
  /** Adapter instance — typically from createKeycloakProvider(). */
  provider: IAuthProvider;
  /** Rendered while the auth flow is initializing or redirecting. */
  loadingComponent?: React.ReactNode;
  /** Rendered when initialization fails (e.g. IDP unreachable). */
  errorComponent?: (error: Error) => React.ReactNode;
  children: React.ReactNode;
}

// ============================================================================
// Stub implementation — replaced with XState wiring in next step
// ============================================================================

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children, loadingComponent }: AuthProviderProps) {
  // TODO: wire useMachine(createAuthMachine(provider)), handle INIT, expose state.
  return (
    <AuthContext.Provider value={null}>
      {loadingComponent ?? <>{children}</>}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      "useAuth must be used inside <AuthProvider>. (Note: skeleton implementation — full hook lands next.)",
    );
  }
  return ctx;
}
