import type { App, Plugin } from "vue";
import { createActor } from "xstate";
import { createAuthMachine, type AuthProvider } from "@ricardoqmd/auth-core";
import { AUTH_INJECTION_KEY, type AuthActor } from "./injection-key.js";

export interface CreateAuthOptions<TIdpClaims = unknown> {
  /** Adapter instance (e.g. createKeycloakProvider()). IDP-agnostic. */
  provider: AuthProvider<TIdpClaims>;
}

/**
 * Vue plugin wiring @ricardoqmd/auth-core into a Vue app.
 *
 * Creates ONE auth actor per app instance (SSR-safe: never a module-level
 * singleton), starts it, kicks off initialization, and provides it app-wide
 * for useAuth(). Scope is SPA/client-only (ADR-012): the eager INIT below
 * assumes a browser. SSR-ready by construction (per-app instance) but not
 * SSR-supported.
 */
export function createAuth<TIdpClaims = unknown>(
  options: CreateAuthOptions<TIdpClaims>,
): Plugin {
  return {
    install(app: App) {
      const machine = createAuthMachine<TIdpClaims>(options.provider);
      const actor = createActor(machine);
      actor.start();
      actor.send({ type: "INIT" });
      app.provide(AUTH_INJECTION_KEY, actor as AuthActor);
      // Stop the actor when the app unmounts (avoids leaks in tests/HMR).
      // app.onUnmount requires Vue 3.5+; guard so older runtimes still install.
      const unmountable = app as App & { onUnmount?: (cb: () => void) => void };
      if (typeof unmountable.onUnmount === "function") {
        unmountable.onUnmount(() => actor.stop());
      }
    },
  };
}
