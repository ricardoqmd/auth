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
        tokenParsed: {
          sub: "user-123",
          preferred_username: "test-user",
          email: "test@example.com",
        },
        realmRoles: ["app-user"],
        resourceRoles: {},
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
    expect(snapshot.context.tokenParsed?.sub).toBe("user-123");

  });

});
