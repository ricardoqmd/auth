import { describe, it, expect, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import type { AuthProvider, AuthInitResult } from "@ricardoqmd/auth-core";
import { createAuth } from "./plugin.js";
import { useAuth, type AuthState } from "./composable.js";

/**
 * Build a fake IDP adapter. login/logout/refreshToken are inert — these tests
 * exercise only the init -> authenticated/unauthenticated transitions.
 */
function fakeProvider(initResult: AuthInitResult): AuthProvider {
  return {
    init: async () => initResult,
    login: async () => {},
    logout: async () => {},
    refreshToken: async () => null,
  };
}

/**
 * Mount a harness that calls useAuth() in setup and exposes the returned
 * AuthState on the component instance. Lets the init actor settle before
 * returning so assertions see the resolved machine state.
 */
async function mountWithAuth(provider: AuthProvider) {
  const captured: { auth: AuthState | null } = { auth: null };

  const Harness = defineComponent({
    setup() {
      const auth = useAuth();
      captured.auth = auth;
      return () => null;
    },
  });

  const wrapper = mount(Harness, {
    global: { plugins: [createAuth({ provider })] },
  });

  // Settle the init promise (provider.init -> onDone) and let Vue flush the
  // reactive selector updates into the computed refs.
  await flushPromises();
  await nextTick();
  await flushPromises();

  if (!captured.auth) throw new Error("useAuth() did not run in setup");
  return { wrapper, auth: captured.auth };
}

describe("@ricardoqmd/auth-vue", () => {
  it("exposes the authenticated session after init resolves", async () => {
    const provider = fakeProvider({
      authenticated: true,
      token: "fake-token",
      user: { name: "Ada Lovelace", roles: ["admin"] },
    });

    const { auth } = await mountWithAuth(provider);

    expect(auth.isAuthenticated.value).toBe(true);
    expect(auth.isLoading.value).toBe(false);
    expect(auth.token.value).toBe("fake-token");
    expect(auth.user.value?.name).toBe("Ada Lovelace");
    expect(auth.hasRole("admin")).toBe(true);
    expect(auth.hasRole("editor")).toBe(false);
    expect(auth.hasAnyRole(["x", "admin"])).toBe(true);
    expect(auth.hasAnyRole(["x", "y"])).toBe(false);
    expect(auth.error.value).toBeNull();
  });

  it("reports unauthenticated when init resolves authenticated: false", async () => {
    const provider = fakeProvider({ authenticated: false });

    const { auth } = await mountWithAuth(provider);

    expect(auth.isAuthenticated.value).toBe(false);
    expect(auth.isLoading.value).toBe(false);
    expect(auth.token.value).toBeNull();
    expect(auth.user.value).toBeNull();
    expect(auth.hasRole("admin")).toBe(false);
  });

  it("throws when useAuth() is called without the plugin installed", () => {
    const Harness = defineComponent({
      setup() {
        useAuth();
        return () => null;
      },
    });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => mount(Harness)).toThrow(/auth plugin/);
    warn.mockRestore();
  });
  it("hasRole stays reactive when used in isolation", async () => {
    // Renders ONLY hasRole — no other reactive reads. With getSnapshot() this
    // never re-renders after auth settles; reading user.value tracks the dep.
    const RoleOnly = defineComponent({
      setup() {
        const { hasRole } = useAuth();
        return () => h("span", { class: "admin" }, String(hasRole("admin")));
      },
    });
    const provider: AuthProvider = {
      init: async () => ({ authenticated: true, token: "t", user: { roles: ["admin"] } }),
      login: async () => {}, logout: async () => {}, refreshToken: async () => null,
    };
    const wrapper = mount(RoleOnly, { global: { plugins: [createAuth({ provider })] } });
    await flushPromises();
    await nextTick();
    await flushPromises();
    expect(wrapper.find(".admin").text()).toBe("true");
  });

  it("surfaces INIT_FAILED when init() rejects", async () => {
    const ErrHarness = defineComponent({
      setup() {
        const { error, isAuthenticated } = useAuth();
        return () => h("div", [
          h("span", { class: "code" }, error.value?.code ?? ""),
          h("span", { class: "authed" }, String(isAuthenticated.value)),
        ]);
      },
    });
    const provider: AuthProvider = {
      init: async () => { throw new Error("keycloak unreachable"); },
      login: async () => {}, logout: async () => {}, refreshToken: async () => null,
    };
    const wrapper = mount(ErrHarness, { global: { plugins: [createAuth({ provider })] } });
    await flushPromises();
    await nextTick();
    await flushPromises();
    expect(wrapper.find(".code").text()).toBe("INIT_FAILED");
    expect(wrapper.find(".authed").text()).toBe("false");
  });
});

describe("@ricardoqmd/auth-vue imperative handle", () => {
  it("exposes the session before any component mounts (guard scenario)", async () => {
    const provider = fakeProvider({
      authenticated: true,
      token: "fake-token",
      user: { name: "Ada Lovelace", roles: ["admin"] },
    });

    // No mount(): the handle is the imperative path used in route guards /
    // interceptors, which run before the app renders.
    const auth = createAuth({ provider });
    await auth.whenReady();

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.isLoading()).toBe(false);
    expect(auth.getToken()).toBe("fake-token");
    expect(auth.getUser()?.name).toBe("Ada Lovelace");
    expect(auth.hasRole("admin")).toBe(true);
    expect(auth.hasRole("editor")).toBe(false);
    expect(auth.hasAnyRole(["x", "admin"])).toBe(true);
    expect(auth.hasAnyRole(["x", "y"])).toBe(false);
    expect(auth.getError()).toBeNull();
  });

  it("reports unauthenticated through the handle when init resolves false", async () => {
    const provider = fakeProvider({ authenticated: false });

    const auth = createAuth({ provider });
    await auth.whenReady();

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.getToken()).toBeNull();
    expect(auth.getUser()).toBeNull();
    expect(auth.hasRole("admin")).toBe(false);
  });

  it("is still a valid Vue plugin: useAuth() inside a mounted component works", async () => {
    const provider = fakeProvider({
      authenticated: true,
      token: "fake-token",
      user: { name: "Ada Lovelace", roles: ["admin"] },
    });

    // Build the handle once, install the SAME object as a plugin.
    const auth = createAuth({ provider });

    const captured: { auth: AuthState | null } = { auth: null };
    const Harness = defineComponent({
      setup() {
        captured.auth = useAuth();
        return () => null;
      },
    });

    mount(Harness, { global: { plugins: [auth] } });
    await flushPromises();
    await nextTick();
    await flushPromises();

    const reactive = captured.auth as AuthState;
    expect(reactive.isAuthenticated.value).toBe(true);
    expect(reactive.user.value?.name).toBe("Ada Lovelace");
    // The imperative handle and the reactive composable observe the same actor.
    expect(auth.isAuthenticated()).toBe(true);
  });
});