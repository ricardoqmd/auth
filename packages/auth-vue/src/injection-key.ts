import type { InjectionKey } from "vue";
import type { Actor } from "xstate";
import type { createAuthMachine } from "@ricardoqmd/auth-core";

/** The started auth actor type, derived from the core machine factory. */
export type AuthActor<TIdpClaims = unknown> = Actor<
  ReturnType<typeof createAuthMachine<TIdpClaims>>
>;

/** App-wide injection key for the auth actor created by the createAuth plugin. */
export const AUTH_INJECTION_KEY: InjectionKey<AuthActor> = Symbol("ricardoqmd-auth");
