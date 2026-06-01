import { describe, expect, it, vi, beforeEach } from "vitest";
import { createKeycloakProvider, hasResourceRole } from "./index.js";
import type { KeycloakIdpClaims } from "./index.js";

let mockKeycloakInstance: {
  init: ReturnType<typeof vi.fn>;
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  updateToken: ReturnType<typeof vi.fn>;
  token: string | undefined;
  refreshToken: string | undefined;
  tokenParsed: Record<string, unknown> | undefined;
}


// vi.mock() is hoisted to the top of the file by Vitest before any imports run.
// This is necessary because index.ts does `import Keycloak from 'keycloak-js'`
// at module load time — the mock must be registered before that import executes.
//
// The factory function returns the fake module shape.
// keycloak-js uses a default export (the Keycloak class), so we return { default: ... }.
vi.mock("keycloak-js", () => {
  // Must be a class (or regular function), not an arrow function.
  // Arrow functions are not constructors in JS — `new arrowFn()` throws TypeError.
  // The adapter calls `new Keycloak({...})`, so the mock must be constructable.
  class MockKeycloak {
    // never-resolving Promise: lets the test assert that the second provider.init()
    // call returns the same Promise object before the first one settles.
    init = vi.fn(() => new Promise<boolean>(() => {}));
    login = vi.fn(() => Promise.resolve());
    logout = vi.fn(() => Promise.resolve());
    updateToken = vi.fn(() => Promise.resolve(true));
    token: string | undefined = undefined;
    refreshToken: string | undefined = undefined;
    tokenParsed: Record<string, unknown> | undefined = undefined;

    // When the adapter creates a `new Keycloak(...)`,
    // it is stored in the external variable mockKeycloakInstance
    constructor() {
      mockKeycloakInstance = this;
    }
  }

  return { default: MockKeycloak };
});

const testConfig = {
  config: { url: "http://localhost:8080", realm: "test", clientId: "test-app" },
};

describe("createKeycloakProvider", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an object implementing the AuthProvider interface", () => {
    const provider = createKeycloakProvider(testConfig);

    // We're not testing behavior here — just that the factory produces
    // an object with the four methods the AuthProvider contract requires.
    expect(typeof provider.init).toBe("function");
    expect(typeof provider.login).toBe("function");
    expect(typeof provider.logout).toBe("function");
    expect(typeof provider.refreshToken).toBe("function");
  });

  it("init() called twice returns the exact same Promise (idempotency guard)", () => {
    const provider = createKeycloakProvider(testConfig);

    const first = provider.init();
    const second = provider.init();

    // toBe checks reference equality (===), not value equality.
    // We want to verify that the second call didn't start a new kc.init() —
    // it joined the in-flight promise from the first call.
    // This is what prevents keycloak-js from throwing
    // "A Keycloak instance can only be initialized once".
    expect(first).toBe(second);
  });

  it("calls kc.init() with the correct default parameters ", () => {
    const provider = createKeycloakProvider(testConfig);
    provider.init();

    expect(mockKeycloakInstance.init).toHaveBeenCalled();
    expect(mockKeycloakInstance.init).toHaveBeenCalledTimes(1);
    expect(mockKeycloakInstance.init).toHaveBeenCalledWith({
      onLoad: 'login-required',
      checkLoginIframe: false,
      pkceMethod: 'S256',
      silentCheckSsoRedirectUri: undefined
    });

  });

  it("init() returns { authenticated: false } when Keycloak reports not authenticated", async () => {
    const provider = createKeycloakProvider(testConfig);
    mockKeycloakInstance.init.mockResolvedValueOnce(false);

    const result = await provider.init();
    expect(result).toEqual({ authenticated: false });
  });

  it("init() maps Keycloak token data into an authenticated result", async () => {
    const provider = createKeycloakProvider(testConfig);
    mockKeycloakInstance.init.mockResolvedValueOnce(true);
    mockKeycloakInstance.token = "access-token";
    mockKeycloakInstance.refreshToken = "refresh-token";
    mockKeycloakInstance.tokenParsed = {
      sub: "user-1",
      preferred_username: "ricardo",
      email: "r@example.com",
      realm_access: { roles: ["app-user"] },
      exp: 2_000_000,
      iat: 1_000_000,
    };

    const result = await provider.init();

    expect(result.authenticated).toBe(true);
    expect(result.token).toBe("access-token");
    expect(result.refreshToken).toBe("refresh-token");
    // keycloak exp is epoch seconds; the contract uses epoch ms.
    expect(result.expiresAt).toBe(2_000_000 * 1000);
    expect(result.user?.sub).toBe("user-1");
    expect(result.user?.roles).toEqual(["app-user"]);
  });

  it("login() delegates to kc.login()", async () => {
    const provider = createKeycloakProvider(testConfig);
    await provider.login();
    expect(mockKeycloakInstance.login).toHaveBeenCalledTimes(1);
  });

  it("logout() uses the per-call redirectUri when provided", async () => {
    const provider = createKeycloakProvider(testConfig);
    await provider.logout({ redirectUri: "https://app.example.com/bye" });
    expect(mockKeycloakInstance.logout).toHaveBeenCalledWith({
      redirectUri: "https://app.example.com/bye",
    });
  });

  it("logout() falls back to the provider-level logoutRedirectUri", async () => {
    const provider = createKeycloakProvider({
      ...testConfig,
      logoutRedirectUri: "https://app.example.com",
    });
    await provider.logout();
    expect(mockKeycloakInstance.logout).toHaveBeenCalledWith({
      redirectUri: "https://app.example.com",
    });
  });

  it("refreshToken() returns the current tokens after a successful update", async () => {
    const provider = createKeycloakProvider(testConfig);
    mockKeycloakInstance.updateToken.mockResolvedValueOnce(true);
    mockKeycloakInstance.token = "new-access";
    mockKeycloakInstance.refreshToken = "new-refresh";
    mockKeycloakInstance.tokenParsed = { exp: 3_000_000 };

    const tokens = await provider.refreshToken();

    expect(tokens).toEqual({
      token: "new-access",
      refreshToken: "new-refresh",
      expiresAt: 3_000_000 * 1000,
    });
  });

  it("refreshToken() returns null when token fields are absent after update", async () => {
    const provider = createKeycloakProvider(testConfig);
    mockKeycloakInstance.updateToken.mockResolvedValueOnce(true);
    // token / refreshToken / tokenParsed stay undefined on a fresh instance

    const tokens = await provider.refreshToken();
    expect(tokens).toBeNull();
  });

  it("refreshToken() propagates the error when kc.updateToken() rejects", async () => {
    const provider = createKeycloakProvider(testConfig);
    mockKeycloakInstance.updateToken.mockRejectedValueOnce(new Error("session expired"));

    await expect(provider.refreshToken()).rejects.toThrow("session expired");
  });
});

// ============================================================================
// hasResourceRole — pure utility, no Keycloak mocks needed
// ============================================================================

  describe("hasResourceRole", () => {
    it("returns true when the user has the role in the given resource", () => {
      const claims: KeycloakIdpClaims = {
        resource_access: {
          "my-app": { roles: ["editor", "viewer"] },
        },
      };

      expect(hasResourceRole(claims, "my-app", "editor")).toBe(true);
    });

    it("returns false when the user does not have the role in the resource", () => {
      const claims: KeycloakIdpClaims = {
        resource_access: {
          "my-app": { roles: ["viewer"] },
        },
      };

      expect(hasResourceRole(claims, "my-app", "editor")).toBe(false);
    });

    it("returns false when the resource is not present in claims", () => {
      const claims: KeycloakIdpClaims = {
        resource_access: {
          "other-app": { roles: ["editor"] },
        },
      };

      expect(hasResourceRole(claims, "my-app", "editor")).toBe(false);
    });

    it("returns false when claims is null", () => {
      // Defensive null handling — the user might not be authenticated yet
      // when this helper is called from a React component.
      expect(hasResourceRole(null, "my-app", "editor")).toBe(false);
    });

    it("returns false when resource_access is missing from claims", () => {
      // Edge case: a token without Keycloak-specific claims (e.g. minimal OIDC token).
      const claims: KeycloakIdpClaims = {
        sub: "user-123",
        // no resource_access
      };

      expect(hasResourceRole(claims, "my-app", "editor")).toBe(false);
    });
});
