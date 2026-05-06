/**
 * Authentication state machine.
 * XState v5 — setup + createMachine pattern.
 */

import { assign, fromPromise, setup } from 'xstate';
import type { AuthInitResult, AuthProvider, AuthTokens, AuthUserClaims } from './index.js';

// ============================================================================
// Public types
// ============================================================================

export interface AuthError {
  code: 'INIT_FAILED' | 'REFRESH_FAILED' | 'TOKEN_EXPIRED' | 'NETWORK_ERROR';
  message: string;
}

export interface AuthContext {
  token: string | null;
  refreshToken: string | null;
  tokenParsed: AuthUserClaims | null;
  /** Epoch ms — when the access token expires. */
  expiresAt: number | null;
  realmRoles: string[];
  resourceRoles: Record<string, { roles: string[] }>;
  error: AuthError | null;
}

export type AuthEvent =
  | { type: 'INIT' }
  | { type: 'LOGIN' }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH' };

// ============================================================================
// Internal constants and helpers
// ============================================================================

/** How long (ms) to wait for any provider operation before declaring NETWORK_ERROR. */
const OPERATION_TIMEOUT_MS = 30_000;

/** Trigger token refresh this many ms before the token actually expires. */
const PROACTIVE_REFRESH_BUFFER_MS = 30_000;

/** Fallback refresh delay when expiresAt is unavailable (should not happen in practice). */
const FALLBACK_REFRESH_DELAY_MS = 5 * 60 * 1000;

const INITIAL_CONTEXT: AuthContext = {
  token: null,
  refreshToken: null,
  tokenParsed: null,
  expiresAt: null,
  realmRoles: [],
  resourceRoles: {},
  error: null,
};

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

// ============================================================================
// Machine factory
// ============================================================================

export function createAuthMachine(provider: AuthProvider) {
  return setup({
    types: {} as {
      context: AuthContext;
      events: AuthEvent;
    },

    delays: {
      TOKEN_REFRESH_DELAY: ({ context }: { context: AuthContext }) => {
        if (context.expiresAt === null) return FALLBACK_REFRESH_DELAY_MS;
        return Math.max(0, context.expiresAt - Date.now() - PROACTIVE_REFRESH_BUFFER_MS);
      },
      OPERATION_TIMEOUT: () => OPERATION_TIMEOUT_MS,
    },

    actors: {
      initActor: fromPromise<AuthInitResult>(() => provider.init()),
      refreshActor: fromPromise<AuthTokens | null>(() => provider.refreshToken()),
      logoutActor: fromPromise<void>(() => provider.logout()),
    },

    guards: {
      // event.output comes from onDone — not part of AuthEvent, so cast is required.
      isAuthenticated: ({ event }) =>
        (event as unknown as { output: AuthInitResult }).output.authenticated,
      hasTokens: ({ event }) =>
        (event as unknown as { output: AuthTokens | null }).output !== null,
    },

    actions: {
      clearError: assign({ error: null }),

      clearTokens: assign({
        token: null,
        refreshToken: null,
        tokenParsed: null,
        expiresAt: null,
        realmRoles: [],
        resourceRoles: {},
      }),

      assignTokensFromInit: assign(({ event }) => {
        const result = (event as unknown as { output: AuthInitResult }).output;
        return {
          token: result.token ?? null,
          refreshToken: result.refreshToken ?? null,
          tokenParsed: result.tokenParsed ?? null,
          expiresAt: result.expiresAt ?? null,
          realmRoles: result.realmRoles ?? [],
          resourceRoles: result.resourceRoles ?? {},
          error: null,
        };
      }),

      assignTokensFromRefresh: assign(({ event }) => {
        // Guard hasTokens ensures output is AuthTokens (not null) before this runs.
        const tokens = (event as unknown as { output: AuthTokens }).output;
        return {
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          error: null,
        };
      }),

      assignInitFailedError: assign({
        error: ({ event }): AuthError => ({
          code: 'INIT_FAILED',
          message: extractErrorMessage((event as unknown as { error: unknown }).error),
        }),
      }),

      assignRefreshFailedError: assign({
        error: ({ event }): AuthError => ({
          code: 'REFRESH_FAILED',
          message: extractErrorMessage((event as unknown as { error: unknown }).error),
        }),
      }),

      assignTokenExpiredError: assign({
        error: (): AuthError => ({
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired and could not be refreshed',
        }),
      }),

      assignTimeoutError: assign({
        error: (): AuthError => ({
          code: 'NETWORK_ERROR',
          message: 'Operation timed out',
        }),
      }),

      // Fire-and-forget: provider.login() triggers a browser redirect.
      // The app is destroyed before the promise resolves; we never await the result.
      callLogin: () => {
        void provider.login();
      },
    },
  }).createMachine({
    id: 'authMachine',
    initial: 'idle',
    context: INITIAL_CONTEXT,

    states: {
      idle: {
        on: { INIT: 'initializing' },
      },

      initializing: {
        entry: ['clearError'],
        invoke: {
          src: 'initActor',
          onDone: [
            {
              guard: 'isAuthenticated',
              target: 'authenticated',
              actions: ['assignTokensFromInit'],
            },
            {
              target: 'unauthenticated',
            },
          ],
          onError: {
            target: 'error',
            actions: ['assignInitFailedError'],
          },
        },
        after: {
          OPERATION_TIMEOUT: {
            target: 'error',
            actions: ['assignTimeoutError'],
          },
        },
      },

      authenticated: {
        initial: 'active',
        on: {
          LOGOUT: 'loggingOut',
        },
        states: {
          active: {
            after: {
              TOKEN_REFRESH_DELAY: { target: 'refreshing' },
            },
            on: {
              REFRESH: 'refreshing',
            },
          },

          refreshing: {
            entry: ['clearError'],
            invoke: {
              src: 'refreshActor',
              onDone: [
                {
                  guard: 'hasTokens',
                  target: 'active',
                  actions: ['assignTokensFromRefresh'],
                },
                {
                  // refreshToken() returned null: token is gone, cannot recover.
                  target: '#authMachine.error',
                  actions: ['assignTokenExpiredError'],
                },
              ],
              onError: {
                target: '#authMachine.error',
                actions: ['assignRefreshFailedError'],
              },
            },
            after: {
              OPERATION_TIMEOUT: {
                target: '#authMachine.error',
                actions: ['assignTimeoutError'],
              },
            },
          },
        },
      },

      unauthenticated: {
        on: {
          LOGIN: {
            // Stay in unauthenticated; the action fires the redirect.
            actions: ['callLogin'],
          },
        },
      },

      loggingOut: {
        entry: ['clearError'],
        invoke: {
          src: 'logoutActor',
          onDone: {
            target: 'unauthenticated',
            actions: ['clearTokens'],
          },
          // Logout always advances: a network error must not trap the user.
          onError: {
            target: 'unauthenticated',
            actions: ['clearTokens'],
          },
        },
      },

      error: {
        on: {
          INIT: 'initializing',
          LOGIN: {
            target: 'unauthenticated',
            actions: ['clearError', 'callLogin'],
          },
        },
      },
    },
  });
}
