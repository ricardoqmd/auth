import { describe, it, expect } from "vitest";
import { defineComponent, nextTick } from "vue";
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

  return { wrapper, auth: captured.auth as AuthState };
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

    expect(() => mount(Harness)).toThrow(/auth plugin/);
  });
});
