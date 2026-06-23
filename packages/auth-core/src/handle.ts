import type { Actor } from "xstate";
import type { createAuthMachine } from "./machine.js";
import type { AuthError } from "./machine.js";
import type { AuthUserClaims } from "./index.js";

/**
 * The started auth actor type, derived from the core machine factory. Bindings
 * create the actor with `createActor(createAuthMachine(provider))` and pass it
 * to `createAuthHandle`.
 */
export type AuthActor<TIdpClaims = unknown> = Actor<
  ReturnType<typeof createAuthMachine<TIdpClaims>>
>;

/**
 * Framework-agnostic, imperative view over a running auth actor.
 *
 * Built for code that runs OUTSIDE a framework's render tree — route guards
 * (vue-router `beforeEach`, Angular `CanActivate`) and HTTP interceptors — where
 * reactive hooks/composables cannot run. Bindings layer their own reactivity on
 * top of this; the handle is the single home of the state derivations.
 *
 * Surface is intentionally closed (no raw snapshot): see ADR-014. Needs not
 * covered here (e.g. token expiry) are added as new accessors (additive).
 */
export interface AuthHandle<TIdpClaims = unknown> {
  isAuthenticated(): boolean;
  isLoading(): boolean;
  getToken(): string | null;
  getUser(): AuthUserClaims | null;
  getIdpClaims(): TIdpClaims | null;
  getError(): AuthError | null;
  hasRole(role: string): boolean;
  hasAnyRole(roles: string[]): boolean;
  /**
   * Resolves once the actor has settled into authenticated, unauthenticated, or
   * error (init finished). Resolves immediately if already settled. Use in a
   * route guard before reading auth state so the first navigation does not race
   * a pending `init()`.
   */
  whenReady(): Promise<void>;
  /** Subscribe to any state change; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

/** True once init has settled into authenticated | unauthenticated | error. */
function isSettled(value: unknown): boolean {
  if (typeof value === "object" && value !== null) {
    return "authenticated" in value;
  }
  return value === "unauthenticated" || value === "error";
}

/** Top-level state name (the compound `authenticated` collapses to its key). */
function topState(value: unknown): string {
  return typeof value === "string"
    ? value
    : (Object.keys(value as Record<string, unknown>)[0] as string);
}

/**
 * Wrap a running auth actor in an imperative, framework-agnostic handle.
 *
 * @example
 * const actor = createActor(createAuthMachine(provider));
 * actor.start();
 * actor.send({ type: "INIT" });
 * const auth = createAuthHandle(actor);
 * await auth.whenReady();
 * if (!auth.isAuthenticated()) { ...redirect... }
 */
export function createAuthHandle<TIdpClaims = unknown>(
  actor: AuthActor<TIdpClaims>,
): AuthHandle<TIdpClaims> {
  return {
    isAuthenticated() {
      const v = actor.getSnapshot().value;
      return typeof v === "object" && v !== null && "authenticated" in v;
    },
    isLoading() {
      const top = topState(actor.getSnapshot().value);
      return top === "initializing" || top === "loggingOut";
    },
    getToken() {
      return actor.getSnapshot().context.token;
    },
    getUser() {
      return actor.getSnapshot().context.user;
    },
    getIdpClaims() {
      return actor.getSnapshot().context.idpClaims;
    },
    getError() {
      return actor.getSnapshot().context.error;
    },
    hasRole(role) {
      return actor.getSnapshot().context.user?.roles?.includes(role) ?? false;
    },
    hasAnyRole(roles) {
      const userRoles = actor.getSnapshot().context.user?.roles;
      return roles.some((r) => userRoles?.includes(r) ?? false);
    },
    whenReady() {
      if (isSettled(actor.getSnapshot().value)) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const sub = actor.subscribe((snapshot) => {
          if (isSettled(snapshot.value)) {
            sub.unsubscribe();
            resolve();
          }
        });
      });
    },
    subscribe(listener) {
      const sub = actor.subscribe(() => listener());
      return () => sub.unsubscribe();
    },
  };
}
