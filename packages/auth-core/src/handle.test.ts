import { createActor } from "xstate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuthMachine } from "./machine.js";
import { createAuthHandle } from "./handle.js";
import type { AuthProvider } from "./index.js";

// Provider that initializes straight into the authenticated state, carrying an
// idpClaims object so getIdpClaims() can be asserted non-null. Override any
// method to exercise a different path.
function authedProvider(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    init: () =>
      Promise.resolve({
        authenticated: true,
        token: "access-0",
        refreshToken: "refresh-0",
        expiresAt: Date.now() + 60_000,
        user: { sub: "user-1", name: "Ada Lovelace", roles: ["admin"] },
        idpClaims: { realm_access: { roles: ["admin"] } },
      }),
    login: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    refreshToken: () => Promise.resolve(null),
    ...overrides,
  };
}

const unauthenticatedProvider: AuthProvider = {
  init: () => Promise.resolve({ authenticated: false }),
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  refreshToken: () => Promise.resolve(null),
};

describe("createAuthHandle", () => {
  let actor: ReturnType<typeof createActor>;

  afterEach(() => {
    if (actor) {
      actor.stop();
    }
    vi.useRealTimers();
  });

  it("exposes the authenticated session once init settles", async () => {
    actor = createActor(createAuthMachine(authedProvider()));
    actor.start();
    actor.send({ type: "INIT" });
    const handle = createAuthHandle(actor);

    // Before init settles the actor is still initializing.
    expect(handle.isLoading()).toBe(true);
    expect(handle.isAuthenticated()).toBe(false);

    await handle.whenReady();

    expect(handle.isAuthenticated()).toBe(true);
    expect(handle.isLoading()).toBe(false);
    expect(handle.getToken()).toBe("access-0");
    expect(handle.getUser()?.name).toBe("Ada Lovelace");
    expect(handle.getIdpClaims()).toEqual({ realm_access: { roles: ["admin"] } });
    expect(handle.getError()).toBeNull();
    expect(handle.hasRole("admin")).toBe(true);
    expect(handle.hasRole("editor")).toBe(false);
    expect(handle.hasAnyRole(["editor", "admin"])).toBe(true);
    expect(handle.hasAnyRole(["editor", "viewer"])).toBe(false);
  });

  it("reports unauthenticated when init resolves authenticated: false", async () => {
    actor = createActor(createAuthMachine(unauthenticatedProvider));
    actor.start();
    actor.send({ type: "INIT" });
    const handle = createAuthHandle(actor);

    await handle.whenReady();

    expect(handle.isAuthenticated()).toBe(false);
    expect(handle.isLoading()).toBe(false);
    expect(handle.getToken()).toBeNull();
    expect(handle.getUser()).toBeNull();
    expect(handle.getIdpClaims()).toBeNull();
    expect(handle.hasRole("admin")).toBe(false);
  });

  it("surfaces INIT_FAILED when init() rejects", async () => {
    const provider = authedProvider({
      init: () => Promise.reject(new Error("keycloak down")),
    });
    actor = createActor(createAuthMachine(provider));
    actor.start();
    actor.send({ type: "INIT" });
    const handle = createAuthHandle(actor);

    await handle.whenReady();

    expect(handle.isAuthenticated()).toBe(false);
    expect(handle.getError()?.code).toBe("INIT_FAILED");
    expect(handle.getError()?.message).toBe("keycloak down");
  });

  it("whenReady resolves immediately once already settled", async () => {
    actor = createActor(createAuthMachine(unauthenticatedProvider));
    actor.start();
    actor.send({ type: "INIT" });
    const handle = createAuthHandle(actor);

    await handle.whenReady();
    // Already settled: subsequent calls resolve without ever subscribing.
    await expect(handle.whenReady()).resolves.toBeUndefined();
    await expect(handle.whenReady()).resolves.toBeUndefined();
  });

  it("subscribe fires on state changes and stops after unsubscribe", async () => {
    actor = createActor(createAuthMachine(authedProvider()));
    actor.start();
    actor.send({ type: "INIT" });
    const handle = createAuthHandle(actor);
    await handle.whenReady();

    const listener = vi.fn();
    const unsubscribe = handle.subscribe(listener);

    // LOGOUT triggers a synchronous transition to loggingOut.
    actor.send({ type: "LOGOUT" });
    expect(listener).toHaveBeenCalled();

    const callsBeforeUnsub = listener.mock.calls.length;
    unsubscribe();

    // The logout actor resolves into unauthenticated; the listener is gone now,
    // so its call count must not grow.
    await vi.waitFor(() => {
      expect(actor.getSnapshot().value).toBe("unauthenticated");
    });
    expect(listener.mock.calls.length).toBe(callsBeforeUnsub);
  });
});
