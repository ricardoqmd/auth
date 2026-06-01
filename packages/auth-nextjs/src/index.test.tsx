import { render, renderHook, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { AuthProvider, useAuth } from "./index.js";
import type {
  AuthError,
  AuthProvider as IAuthProvider,
} from "@ricardoqmd/auth-core";

// A provider that never resolves — keeps the machine in 'initializing'.
// Useful for testing the gated (loading) state.
const pendingProvider: IAuthProvider = {
  init: () => new Promise(() => {}),
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  refreshToken: () => Promise.resolve(null),
};

// A provider that immediately returns unauthenticated.
// Lets the machine complete its init flow without needing a real Keycloak server.
const unauthenticatedProvider: IAuthProvider = {
  init: () => Promise.resolve({ authenticated: false }),
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  refreshToken: () => Promise.resolve(null),
};

// A provider whose init() rejects — drives the machine into the 'error' state.
const failingProvider: IAuthProvider = {
  init: () => Promise.reject(new Error("keycloak unreachable")),
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  refreshToken: () => Promise.resolve(null),
};

describe("AuthProvider", () => {
  it("renders loadingComponent while the auth flow is in progress", () => {
    render(
      <AuthProvider
        provider={pendingProvider}
        loadingComponent={<div>Authenticating…</div>}
      >
        <div>Authenticated content</div>
      </AuthProvider>,
    );

    // Machine starts in 'idle' (gated), then useEffect fires INIT → 'initializing' (still gated).
    // Since pendingProvider.init() never resolves, the machine stays in 'initializing'.
    // The gate shows loadingComponent and hides children.
    expect(screen.getByText("Authenticating…")).toBeInTheDocument();
    expect(screen.queryByText("Authenticated content")).not.toBeInTheDocument();
  });

  it("passes the structured AuthError to errorComponent when init fails", async () => {
    render(
      <AuthProvider
        provider={failingProvider}
        errorComponent={(error: AuthError) => (
          <div>{`${error.code}: ${error.message}`}</div>
        )}
      >
        <div>Authenticated content</div>
      </AuthProvider>,
    );

    // init() rejects → machine reaches 'error' with code INIT_FAILED, and the
    // original message is preserved. errorComponent receives the full AuthError.
    await waitFor(() => {
      expect(
        screen.getByText("INIT_FAILED: keycloak unreachable"),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Authenticated content")).not.toBeInTheDocument();
  });

  it("renders nothing in the error state when no errorComponent is given", async () => {
    render(
      <AuthProvider
        provider={failingProvider}
        loadingComponent={<div>Loading…</div>}
      >
        <div>Authenticated content</div>
      </AuthProvider>,
    );

    // Starts gated on loadingComponent; init() rejects → 'error' state, which
    // renders null (no errorComponent). The only way out of loading for a
    // failing provider is 'error', so the loading text disappearing confirms it.
    await waitFor(() => {
      expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("Authenticated content")).not.toBeInTheDocument();
  });
});

describe("useAuth", () => {
  it("returns isAuthenticated: false after the provider resolves unauthenticated", async () => {
    // renderHook creates a hidden component that calls useAuth() and captures the result.
    // The 'wrapper' option wraps that component with AuthProvider so the hook has
    // the React context it needs. Without a wrapper, useAuth() would throw because
    // it reads from AuthContext which only exists inside <AuthProvider>.
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        // renderOnUnauthenticated={true} tells AuthProvider to render children
        // (and therefore the hidden hook component) when the machine reaches
        // 'unauthenticated', instead of showing the loading gate.
        // Without this flag, the hook would never be called because the gate
        // would block children until authentication succeeds.
        <AuthProvider
          provider={unauthenticatedProvider}
          renderOnUnauthenticated={true}
        >
          {children}
        </AuthProvider>
      ),
    });

    // The machine transitions: idle → (INIT event) → initializing → unauthenticated.
    // Each transition is async (INIT is sent in useEffect; init() is a Promise).
    // waitFor retries the assertion on every React re-render until it passes
    // or the timeout expires (default 1000ms). This is the correct way to test
    // async state changes — do NOT use arbitrary sleeps.
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
    });

    // Belt-and-suspenders: verify the rest of the initial unauthenticated shape.
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("returns isAuthenticated: true when init resolves with authenticated:true", async () => {
    const authenticatedProvider: IAuthProvider = {
      init: () => Promise.resolve({
        authenticated: true,
        token: "fake-token",
        refreshToken: "fake-refresh",
        expiresAt: Date.now() + 60_000,
        user: {
          sub: "user-1",
          email: "test@example.com",
          roles: ["admin"]
        },
        idpClaims: {
          sub: "user-1",
          realm_access: { roles: ["admin"] },
          resourceRoles: {},
        }
      }),
      login: () => Promise.resolve(),
      logout: () => Promise.resolve(),
      refreshToken: () => Promise.resolve(null),
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthProvider provider={authenticatedProvider}>
          {children}
        </AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(result.current.token).toBe("fake-token");
    expect(result.current.user?.sub).toBe("user-1");
  });

  it("throws when called outside AuthProvider", () => {
        expect(() => {
          renderHook(() => useAuth())
        }).toThrow("useAuth must be called inside");
  });

});
