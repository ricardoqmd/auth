import { computed, inject, type ComputedRef } from "vue";
import { useSelector } from "@xstate/vue";
import type { AuthError, AuthUserClaims } from "@ricardoqmd/auth-core";
import { AUTH_INJECTION_KEY } from "./injection-key.js";

/** Reactive auth state + helpers returned by useAuth(). */
export interface AuthState<TIdpClaims = unknown> {
  isLoading: ComputedRef<boolean>;
  isAuthenticated: ComputedRef<boolean>;
  token: ComputedRef<string | null>;
  user: ComputedRef<AuthUserClaims | null>;
  idpClaims: ComputedRef<TIdpClaims | null>;
  error: ComputedRef<AuthError | null>;
  login: () => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

/**
 * Reactive authentication state for the current app.
 * Must be called inside a component of an app that installed createAuth().
 */
export function useAuth<TIdpClaims = unknown>(): AuthState<TIdpClaims> {
  const actor = inject(AUTH_INJECTION_KEY);
  if (!actor) {
    throw new Error(
      "useAuth() must be called within an app that installed the auth plugin. " +
        "Did you forget app.use(createAuth({ provider }))?",
    );
  }

  const stateValue = useSelector(actor, (s) => s.value);
  const context = useSelector(actor, (s) => s.context);

  const isAuthenticated = computed(
    () =>
      typeof stateValue.value === "object" &&
      stateValue.value !== null &&
      "authenticated" in stateValue.value,
  );

  const topState = computed(() =>
    typeof stateValue.value === "string"
      ? stateValue.value
      : Object.keys(stateValue.value)[0],
  );

  const isLoading = computed(
    () => topState.value === "initializing" || topState.value === "loggingOut",
  );

  const token = computed(() => context.value.token);
  const user = computed(() => context.value.user);
  const idpClaims = computed(() => context.value.idpClaims as TIdpClaims | null);
  const error = computed(() => context.value.error);

  const login = () => actor.send({ type: "LOGIN" });
  const logout = () => actor.send({ type: "LOGOUT" });

  const hasRole = (role: string) =>
    user.value?.roles?.includes(role) ?? false;
  const hasAnyRole = (roles: string[]) =>
    roles.some((r) => user.value?.roles?.includes(r) ?? false);

  return {
    isLoading,
    isAuthenticated,
    token,
    user,
    idpClaims,
    error,
    login,
    logout,
    hasRole,
    hasAnyRole,
  };
}
