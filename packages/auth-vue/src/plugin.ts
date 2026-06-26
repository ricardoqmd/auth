import type { App, Plugin } from "vue";
import { createActor } from "xstate";
import {
  createAuthHandle,
  createAuthMachine,
  type AuthHandle,
  type AuthProvider,
} from "@ricardoqmd/auth-core";
import { AUTH_INJECTION_KEY, type AuthActor } from "./injection-key.js";

export interface CreateAuthOptions<TIdpClaims = unknown> {
  /** Adapter instance (e.g. createKeycloakProvider()). IDP-agnostic. */
  provider: AuthProvider<TIdpClaims>;
}

/**
 * Wire @ricardoqmd/auth-core into a Vue app.
 *
 * Returns a value that is BOTH a Vue plugin and an imperative AuthHandle:
 * - `app.use(auth)` installs it (provides the actor for useAuth()).
 * - the same `auth` object exposes whenReady()/isAuthenticated()/hasRole()/... for
 *   use OUTSIDE components — a vue-router `beforeEach` guard or an HTTP interceptor,
 *   where useAuth() cannot run.
 *
 * Creates ONE actor per call (SSR-safe: never a module-level singleton). The actor
 * is started and initialized here, so the handle is usable before mount (guards run
 * before the app renders). Scope is SPA/client-only (ADR-012): the eager INIT
 * assumes a browser; SSR-ready by construction but not a supported target in 0.x.
 *
 * @example
 * const auth = createAuth({ provider });
 * app.use(auth);
 * router.beforeEach(async (to) => {
 *   await auth.whenReady();
 *   if (to.meta.requiresAuth && !auth.isAuthenticated()) return { name: "login" };
 *   if (to.meta.roles && !auth.hasAnyRole(to.meta.roles as string[])) {
 *     return { name: "forbidden" };
 *   }
 * });
 */
export function createAuth<TIdpClaims = unknown>(
  options: CreateAuthOptions<TIdpClaims>,
): Plugin & AuthHandle<TIdpClaims> {
  const machine = createAuthMachine<TIdpClaims>(options.provider);
  const actor = createActor(machine);
  actor.start();
  actor.send({ type: "INIT" });
  const handle = createAuthHandle<TIdpClaims>(actor);

  return {
    ...handle,
    install(app: App) {
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
