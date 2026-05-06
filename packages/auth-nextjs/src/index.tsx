/**
 * @ricardoqmd/auth-nextjs
 *
 * Next.js (client-side) bindings for @ricardoqmd/auth-core.
 * Provides <AuthProvider> and useAuth() with RBAC helpers.
 *
 * All exports are Client Components — this package is marked "use client" in its
 * dist output. Do NOT import from Server Components; use @ricardoqmd/auth-nextjs-ssr
 * (v0.3.0+) for server-side JWT validation and middleware.
 */

"use client";

import * as React from "react";
import { useMachine } from "@xstate/react";
import {
  createAuthMachine,
  type AuthProvider as IAuthProvider,
  type AuthUserClaims,
} from "@ricardoqmd/auth-core";

// ============================================================================
// Machine type alias — explicit to keep Context and hook types readable
// ============================================================================

/** The XState machine produced by createAuthMachine. */
type AuthMachine = ReturnType<typeof createAuthMachine>;

// Derive snapshot and send types from useMachine rather than importing directly
// from xstate, which is not a declared dependency of this package (it is a peer
// of @xstate/react and not directly accessible under pnpm's strict hoisting).
type UseMachineReturn = ReturnType<typeof useMachine<AuthMachine>>;

// ============================================================================
// Internal context shape — not part of the public API
// ============================================================================

interface AuthContextValue {
  snapshot: UseMachineReturn[0];
  send: UseMachineReturn[1];
}

// ============================================================================
// Public types — part of the stable API contract
// ============================================================================

/** Shape returned by useAuth(). */
export interface AuthState {
  /** True while the machine is in the `initializing` or `loggingOut` state. */
  isLoading: boolean;
  /** True when the machine is in the `authenticated` compound state. */
  isAuthenticated: boolean;
  /** Raw JWT access token, or null when not authenticated. */
  token: string | null;
  /** Decoded token claims, or null when not authenticated. */
  user: AuthUserClaims | null;
  /** Non-null when the machine is in the `error` state. */
  error: Error | null;
  /** Sends the LOGOUT event to the machine, triggering the logout flow. */
  logout: () => void;
  /** Returns true if the authenticated user has `role` in their realm roles. */
  hasRole: (role: string) => boolean;
  /** Returns true if the user has at least one of the given realm roles. */
  hasAnyRole: (roles: string[]) => boolean;
  /** Returns true if the user has `role` within the `resource` client roles. */
  hasResourceRole: (resource: string, role: string) => boolean;
}

export interface AuthProviderProps {
  /**
   * Adapter instance — typically from createKeycloakProvider().
   *
   * **IMPORTANT: create the provider OUTSIDE the component render.**
   * Each new instance creates a new Keycloak singleton, which resets the
   * authentication flow on every render.
   *
   * @example
   * ```tsx
   * // GOOD: module-level, created once
   * const provider = createKeycloakProvider({ config: { url, realm, clientId } });
   *
   * function App() {
   *   return <AuthProvider provider={provider}>...</AuthProvider>;
   * }
   * ```
   *
   * @example
   * ```tsx
   * // BAD: inside render, re-creates Keycloak on every render
   * function App() {
   *   const provider = createKeycloakProvider({ ... }); // ← DO NOT DO THIS
   *   return <AuthProvider provider={provider}>...</AuthProvider>;
   * }
   * ```
   *
   * In Next.js App Router, wrap in a dedicated Client Component and either
   * declare the provider at module scope or memoize it with useRef:
   * ```tsx
   * "use client";
   * const provider = createKeycloakProvider({ config: { url, realm, clientId } });
   * export function AuthShell({ children }: { children: React.ReactNode }) {
   *   return <AuthProvider provider={provider}>{children}</AuthProvider>;
   * }
   * ```
   */
  provider: IAuthProvider;
  /** Rendered while the auth flow is in `initializing`, `loggingOut`, or
   *  `unauthenticated` (when redirecting). Defaults to null (blank). */
  loadingComponent?: React.ReactNode;
  /** Rendered when initialization fails (e.g. IDP unreachable). Receives the
   *  error so the consumer can show a meaningful message. Defaults to null. */
  errorComponent?: (error: Error) => React.ReactNode;
  /**
   * When true, renders children in the `unauthenticated` state instead of
   * the loadingComponent.
   *
   * Default: false — assumes `onLoad: 'login-required'` in the provider config,
   * where Keycloak immediately redirects and the app never renders unauthenticated.
   *
   * Set to true only when the provider is configured with `onLoad: 'check-sso'`
   * and the app needs to display a login button or a public landing page.
   * Mismatching this flag with the provider's onLoad will produce unexpected UX.
   */
  renderOnUnauthenticated?: boolean;
  children: React.ReactNode;
}

// ============================================================================
// Internal context — not exported; accessed only via useAuth()
// ============================================================================

const AuthContext = React.createContext<AuthContextValue | null>(null);

// ============================================================================
// AuthProvider
// ============================================================================

export function AuthProvider({
  provider,
  children,
  loadingComponent,
  errorComponent,
  renderOnUnauthenticated = false,
}: AuthProviderProps): React.JSX.Element {
  const [snapshot, send] = useMachine(createAuthMachine(provider));

  // Send INIT once on mount to kick off the Keycloak initialization flow.
  // The provider's init() is idempotent — if React 18 Strict Mode causes a
  // double-mount in development, the adapter returns the cached result on the
  // second call without reinitializing keycloak-js.
  React.useEffect(() => {
    send({ type: "INIT" });
  }, [send]);

  // Derive the top-level state name. XState v5 snapshot.value is a string for
  // simple states and a { [stateName]: childValue } object for compound states.
  const topState =
    typeof snapshot.value === "string"
      ? snapshot.value
      : (Object.keys(snapshot.value)[0] as string);

  // Error state: show errorComponent before the context provider since the
  // machine has no valid auth session to expose.
  if (topState === "error") {
    const err = snapshot.context.error
      ? new Error(snapshot.context.error.message)
      : new Error("Authentication error");
    return <>{errorComponent?.(err) ?? null}</>;
  }

  // Gate: hold back children until auth is settled.
  const isGated =
    topState === "idle" ||
    topState === "initializing" ||
    topState === "loggingOut" ||
    (topState === "unauthenticated" && !renderOnUnauthenticated);

  if (isGated) {
    return <>{loadingComponent ?? null}</>;
  }

  return (
    <AuthContext.Provider value={{ snapshot, send }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// useAuth
// ============================================================================

/**
 * Returns the current authentication state and RBAC helpers.
 *
 * Must be called inside a component that is a descendant of <AuthProvider>.
 */
export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (ctx === null) {
    throw new Error(
      "useAuth must be called inside a component that is a descendant of <AuthProvider>.",
    );
  }

  const { snapshot, send } = ctx;
  const { context } = snapshot;

  // Authenticated when the machine is in any sub-state of the `authenticated`
  // compound state (active or refreshing). snapshot.value is an object in that
  // case, e.g. { authenticated: 'active' } or { authenticated: 'refreshing' }.
  const isAuthenticated =
    typeof snapshot.value === "object" && "authenticated" in snapshot.value;

  const topState =
    typeof snapshot.value === "string"
      ? snapshot.value
      : (Object.keys(snapshot.value)[0] as string);

  const isLoading = topState === "initializing" || topState === "loggingOut";

  const error = context.error ? new Error(context.error.message) : null;

  const logout = React.useCallback(() => {
    send({ type: "LOGOUT" });
  }, [send]);

  const hasRole = React.useCallback(
    (role: string) => context.realmRoles.includes(role),
    [context.realmRoles],
  );

  const hasAnyRole = React.useCallback(
    (roles: string[]) => roles.some((r) => context.realmRoles.includes(r)),
    [context.realmRoles],
  );

  const hasResourceRole = React.useCallback(
    (resource: string, role: string) =>
      context.resourceRoles[resource]?.roles.includes(role) ?? false,
    [context.resourceRoles],
  );

  return {
    isAuthenticated,
    isLoading,
    token: context.token,
    user: context.tokenParsed,
    error,
    logout,
    hasRole,
    hasAnyRole,
    hasResourceRole,
  };
}
