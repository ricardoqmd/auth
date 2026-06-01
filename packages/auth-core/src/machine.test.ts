import { createActor } from "xstate";
import { describe, expect, it, vi, afterEach } from "vitest";
import { createAuthMachine } from "./machine.js";
import type { AuthProvider } from "./index.js";

// A minimal AuthProvider that never does anything real.
// Its only job is to satisfy TypeScript so we can test the machine logic
// without needing a real Keycloak server.
const noopProvider: AuthProvider = {
  init: () => new Promise(() => {}), // never resolves — keeps the machine in 'initializing'
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  refreshToken: () => Promise.resolve(null),
};

const unauthenticatedProvider: AuthProvider = {
  init: () => Promise.resolve({authenticated: false}),
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  refreshToken: () => Promise.resolve(null),
};

// Builds a provider that initializes straight into the authenticated state.
// Override any method (init, refreshToken, logout, login) to exercise a path.
function authedProvider(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    init: () =>
      Promise.resolve({
        authenticated: true,
        token: "access-0",
        refreshToken: "refresh-0",
        expiresAt: Date.now() + 60_000,
        user: { sub: "user-1", roles: ["app-user"] },
        idpClaims: null,
      }),
    login: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    refreshToken: () => Promise.resolve(null),
    ...overrides,
  };
}

describe("createAuthMachine", () => {
  let actor: ReturnType<typeof createActor>;

  // This hook runs after each test and prevents the test actor from affecting the next one.
  // Follow the DRY( Don't Repeat Yourself) principle.
  afterEach(() => {
    if(actor){
      actor.stop();
    }
  });

  it("starts in the idle state", () => {
    const machine = createAuthMachine(noopProvider);
    // createActor(machine) creates a live instance but does NOT start it yet.
    // Before .start(), the actor exists but no transitions have fired.
    actor = createActor(machine);
    actor.start();

    // snapshot.value holds the current state name.
    // For a simple (non-compound) state, this is a plain string.
    expect(actor.getSnapshot().value).toBe("idle");

  });

  it("transitions to initializing after receiving the INIT event", () => {
    const machine = createAuthMachine(noopProvider);
    actor = createActor(machine);
    actor.start();

    // .send() dispatches an event synchronously into the machine.
    // The machine processes the event and updates its state before this line returns.
    actor.send({ type: "INIT" });

    // In idle, INIT triggers → initializing, which invokes initActor (a fromPromise actor).
    // Our noopProvider.init() returns a promise that never resolves,
    // so the machine stays in 'initializing' — exactly what we want to assert.
    expect(actor.getSnapshot().value).toBe("initializing");

  });

  it("transitions to unauthenticated when init resolves with authenticated:false", async () => {
    const machine = createAuthMachine(unauthenticatedProvider);
    actor = createActor(machine);
    actor.start();

    actor.send({type: "INIT"});

    await vi.waitFor(() => {
      expect(actor.getSnapshot().value).toBe("unauthenticated");
    });

  });

  it("transitions to authenticated.active after successful init with tokens", async () => {
    const provider: AuthProvider = {
      init: () => Promise.resolve({
        authenticated: true,
        token: "fake-access-token",
        refreshToken: "fake-refresh-token",
        expiresAt: Date.now() + 60_000,  // expira en 60 segundos
        user: {
          sub: "user-123",
          preferred_username: "test-user",
          email: "test@example.com",
          roles: ["app-user"]
        },
        idpClaims: {
          sub: "user-123",
          realm_access: { roles: ["app-user"] },
          resource_access: {},
        }
      }),
      login: () => Promise.resolve(),
      logout: () => Promise.resolve(),
      refreshToken: () => Promise.resolve(null),
    };

    const machine = createAuthMachine(provider);
    actor = createActor(machine);
    actor.start();

    actor.send({ type: "INIT" });

    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches({ authenticated: 'active' })).toBe(true);
    });

    // Verify that the context also contains the expected data
    const snapshot = actor.getSnapshot();

    expect(snapshot.context.token).toBe("fake-access-token");
    expect(snapshot.context.refreshToken).toBe("fake-refresh-token");
    expect(snapshot.context.user?.sub).toBe("user-123");

  });

  it("goes to error with INIT_FAILED when init() rejects", async () => {
    const provider = authedProvider({
      init: () => Promise.reject(new Error("keycloak down")),
    });
    actor = createActor(createAuthMachine(provider));
    actor.start();
    actor.send({ type: "INIT" });

    await vi.waitFor(() => {
      expect(actor.getSnapshot().value).toBe("error");
    });
    expect(actor.getSnapshot().context.error?.code).toBe("INIT_FAILED");
    expect(actor.getSnapshot().context.error?.message).toBe("keycloak down");
  });

  it("fires provider.login() on LOGIN from unauthenticated, without changing state", async () => {
    const login = vi.fn(() => Promise.resolve());
    const provider = { ...unauthenticatedProvider, login };
    actor = createActor(createAuthMachine(provider));
    actor.start();
    actor.send({ type: "INIT" });

    await vi.waitFor(() => {
      expect(actor.getSnapshot().value).toBe("unauthenticated");
    });

    actor.send({ type: "LOGIN" });
    expect(login).toHaveBeenCalledTimes(1);
    expect(actor.getSnapshot().value).toBe("unauthenticated");
  });

  it("refreshes tokens on REFRESH and returns to authenticated.active", async () => {
    const provider = authedProvider({
      refreshToken: () =>
        Promise.resolve({
          token: "access-1",
          refreshToken: "refresh-1",
          expiresAt: Date.now() + 60_000,
        }),
    });
    actor = createActor(createAuthMachine(provider));
    actor.start();
    actor.send({ type: "INIT" });
    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches({ authenticated: "active" })).toBe(true);
    });

    actor.send({ type: "REFRESH" });
    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches({ authenticated: "active" })).toBe(true);
      expect(actor.getSnapshot().context.token).toBe("access-1");
    });
    expect(actor.getSnapshot().context.refreshToken).toBe("refresh-1");
  });

  it("goes to error with TOKEN_EXPIRED when refreshToken() resolves null", async () => {
    const provider = authedProvider({
      refreshToken: () => Promise.resolve(null),
    });
    actor = createActor(createAuthMachine(provider));
    actor.start();
    actor.send({ type: "INIT" });
    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches({ authenticated: "active" })).toBe(true);
    });

    actor.send({ type: "REFRESH" });
    await vi.waitFor(() => {
      expect(actor.getSnapshot().value).toBe("error");
    });
    expect(actor.getSnapshot().context.error?.code).toBe("TOKEN_EXPIRED");
  });

  it("goes to error with REFRESH_FAILED when refreshToken() rejects", async () => {
    const provider = authedProvider({
      refreshToken: () => Promise.reject(new Error("network blip")),
    });
    actor = createActor(createAuthMachine(provider));
    actor.start();
    actor.send({ type: "INIT" });
    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches({ authenticated: "active" })).toBe(true);
    });

    actor.send({ type: "REFRESH" });
    await vi.waitFor(() => {
      expect(actor.getSnapshot().value).toBe("error");
    });
    expect(actor.getSnapshot().context.error?.code).toBe("REFRESH_FAILED");
  });

  it("logs out cleanly: LOGOUT clears tokens and returns to unauthenticated", async () => {
    const provider = authedProvider();
    actor = createActor(createAuthMachine(provider));
    actor.start();
    actor.send({ type: "INIT" });
    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches({ authenticated: "active" })).toBe(true);
    });

    actor.send({ type: "LOGOUT" });
    await vi.waitFor(() => {
      expect(actor.getSnapshot().value).toBe("unauthenticated");
    });
    expect(actor.getSnapshot().context.token).toBeNull();
    expect(actor.getSnapshot().context.user).toBeNull();
  });

  it("still reaches unauthenticated even if logout() rejects", async () => {
    const provider = authedProvider({
      logout: () => Promise.reject(new Error("logout endpoint down")),
    });
    actor = createActor(createAuthMachine(provider));
    actor.start();
    actor.send({ type: "INIT" });
    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches({ authenticated: "active" })).toBe(true);
    });

    actor.send({ type: "LOGOUT" });
    await vi.waitFor(() => {
      expect(actor.getSnapshot().value).toBe("unauthenticated");
    });
    expect(actor.getSnapshot().context.token).toBeNull();
  });

  it("can retry INIT from the error state", async () => {
    const provider = authedProvider({
      init: () => Promise.reject(new Error("first attempt fails")),
    });
    actor = createActor(createAuthMachine(provider));
    actor.start();
    actor.send({ type: "INIT" });
    await vi.waitFor(() => {
      expect(actor.getSnapshot().value).toBe("error");
    });

    actor.send({ type: "INIT" });
    expect(actor.getSnapshot().value).toBe("initializing");
  });

  it("recovers from error via LOGIN (clears error and triggers login)", async () => {
    const login = vi.fn(() => Promise.resolve());
    const provider = authedProvider({
      init: () => Promise.reject(new Error("boom")),
      login,
    });
    actor = createActor(createAuthMachine(provider));
    actor.start();
    actor.send({ type: "INIT" });
    await vi.waitFor(() => {
      expect(actor.getSnapshot().value).toBe("error");
    });

    actor.send({ type: "LOGIN" });
    expect(login).toHaveBeenCalledTimes(1);
    expect(actor.getSnapshot().value).toBe("unauthenticated");
    expect(actor.getSnapshot().context.error).toBeNull();
  });

});
