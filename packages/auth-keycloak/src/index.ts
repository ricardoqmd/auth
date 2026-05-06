/**
 * @ricardoqmd/auth-keycloak
 *
 * Keycloak adapter implementing the AuthProvider contract from @ricardoqmd/auth-core.
 * Uses keycloak-js to perform the OIDC/OAuth2 authentication flow against a
 * Keycloak server >= 26.
 */

import Keycloak from 'keycloak-js';
import type {
  AuthInitResult,
  AuthProvider,
  AuthTokens,
  AuthUserClaims,
  LogoutOptions,
} from '@ricardoqmd/auth-core';

// ============================================================================
// Public types
// ============================================================================

/** Connection parameters for the Keycloak server. */
export interface KeycloakProviderConfig {
  /** Keycloak server base URL, e.g. https://kc.example.com */
  url: string;
  /** Realm name as configured in the Keycloak admin console. */
  realm: string;
  /** Public client ID configured in the realm. */
  clientId: string;
}

/**
 * Options for {@link createKeycloakProvider}.
 *
 * All fields except `config` are optional and have secure, SPA-friendly defaults.
 */
export interface KeycloakProviderOptions {
  /** Keycloak server connection parameters. */
  config: KeycloakProviderConfig;
  /**
   * Controls what happens on init when the user is not authenticated.
   * - `'login-required'` (default): Keycloak redirects immediately. The app
   *   only renders after the user is authenticated. Use for private dashboards.
   * - `'check-sso'`: No redirect. The provider returns `authenticated: false`
   *   and the app decides what to show. Use for partly-public apps.
   */
  onLoad?: 'login-required' | 'check-sso';
  /**
   * Absolute URI of the silent SSO HTML document served by your app.
   * Required only when using `onLoad: 'check-sso'` with iframe-based SSO.
   * Example: `${window.location.origin}/silent-check-sso.html`
   */
  silentCheckSsoRedirectUri?: string;
  /**
   * Whether to enable the legacy login-status iframe that polls the Keycloak
   * session. Defaults to `false` (disabled). Modern SPAs should leave this off.
   */
  checkLoginIframe?: boolean;
  /**
   * PKCE challenge method. `'S256'` is the only value supported by keycloak-js
   * and is recommended for all public clients. Defaults to `'S256'`.
   */
  pkceMethod?: 'S256';
  /**
   * Default URI to redirect to after logout. Must be an absolute URL registered
   * in the Keycloak client's "Valid post-logout redirect URIs".
   *
   * Relative URLs are rejected by Keycloak at runtime — always use an absolute URL.
   *
   * Defaults to `window.location.origin`. Can be overridden per-call via
   * `logout({ redirectUri })`.
   */
  logoutRedirectUri?: string;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Creates a Keycloak-backed {@link AuthProvider} that connects the auth-core
 * state machine to a Keycloak server via keycloak-js.
 *
 * The returned provider wraps a single `Keycloak` instance and is stateful.
 * Create one instance per application, not per component or request.
 *
 * @example
 * ```ts
 * const provider = createKeycloakProvider({
 *   config: {
 *     url: 'https://kc.example.com',
 *     realm: 'my-realm',
 *     clientId: 'my-app',
 *   },
 * });
 * const machine = createAuthMachine(provider);
 * ```
 */
export function createKeycloakProvider(options: KeycloakProviderOptions): AuthProvider {
  const kc = new Keycloak({
    url: options.config.url,
    realm: options.config.realm,
    clientId: options.config.clientId,
  });

  // Resolved once at factory time to avoid reading window on every logout call.
  // SSR is out of scope until v0.3 (auth-nextjs-ssr); the '/' fallback exists
  // solely to prevent a ReferenceError if this factory is somehow called server-side.
  const defaultLogoutUri =
    options.logoutRedirectUri ??
    (typeof window !== 'undefined' ? window.location.origin : '/');

  // Idempotency guard for init().
  // keycloak-js throws if init() is called more than once on the same instance.
  // React 18 Strict Mode simulates unmount/remount in development, which causes
  // the host component to send INIT twice to the machine — and therefore to call
  // init() twice. Tracking initialized state here (in the adapter, which owns the
  // singleton) is the architecturally correct place for this guard.
  let initialized = false;
  let lastResult: AuthInitResult | null = null;

  return {
    /**
     * Initializes the Keycloak session and returns the current auth state.
     *
     * This method is idempotent: subsequent calls return the cached result from
     * the first invocation without re-initializing keycloak-js. This is intentional
     * and required to survive React 18 Strict Mode's simulated remount.
     *
     * With the default `onLoad: 'login-required'`, Keycloak redirects
     * unauthenticated users before this promise resolves, so `authenticated: false`
     * is only reachable when `onLoad: 'check-sso'` is configured.
     *
     * @throws when the Keycloak server is unreachable, the realm is invalid, or
     *   the OIDC discovery document cannot be fetched. The machine maps this to
     *   `INIT_FAILED`.
     */
    async init(): Promise<AuthInitResult> {
      if (initialized && lastResult !== null) {
        return lastResult;
      }

      const authenticated = await kc.init({
        onLoad: options.onLoad ?? 'login-required',
        checkLoginIframe: options.checkLoginIframe ?? false,
        pkceMethod: options.pkceMethod ?? 'S256',
        silentCheckSsoRedirectUri: options.silentCheckSsoRedirectUri,
      });

      initialized = true;

      if (!authenticated) {
        lastResult = { authenticated: false };
        return lastResult;
      }

      lastResult = {
        authenticated: true,
        token: kc.token,
        refreshToken: kc.refreshToken,
        // keycloak-js exposes `exp` in epoch seconds; the contract uses epoch ms.
        expiresAt:
          kc.tokenParsed?.exp !== undefined ? kc.tokenParsed.exp * 1000 : undefined,
        tokenParsed: kc.tokenParsed as AuthUserClaims | undefined,
        realmRoles: kc.tokenParsed?.realm_access?.roles ?? [],
        resourceRoles: kc.tokenParsed?.resource_access ?? {},
      };
      return lastResult;
    },

    async login(): Promise<void> {
      await kc.login();
    },

    /**
     * Ends the Keycloak session and redirects the browser to `redirectUri`.
     *
     * The redirect URI must be absolute and registered in the Keycloak client's
     * "Valid post-logout redirect URIs" — relative URLs are rejected by Keycloak.
     *
     * Resolution order for the redirect target:
     * 1. `options.redirectUri` (per-call override)
     * 2. `KeycloakProviderOptions.logoutRedirectUri` (provider-level default)
     * 3. `window.location.origin` (implicit default)
     *
     * Per the auth-core contract, the machine always transitions to
     * `unauthenticated` on both done and error — local state is cleared
     * regardless of whether the network call succeeds.
     */
    async logout(opts?: LogoutOptions): Promise<void> {
      await kc.logout({
        redirectUri: opts?.redirectUri ?? defaultLogoutUri,
      });
    },

    /**
     * Refreshes the access token if it expires within `minValidity` seconds.
     *
     * Returns the current (possibly refreshed) tokens, or `null` if the token
     * fields are absent after the call (defensive; should not occur in normal
     * operation when called from the `authenticated` machine state).
     *
     * @throws when the refresh fails for any reason (network error, server error,
     *   or session expiry). The machine maps this to `REFRESH_FAILED`.
     *
     * ⚠ Limitation (v0.1): keycloak-js does not expose a distinct error type for
     *   "refresh token expired" vs "network error" — `updateToken()` rejects for
     *   both. As a result, both cases route to `REFRESH_FAILED` in the machine,
     *   never to `TOKEN_EXPIRED` (which requires an explicit `null` return).
     *   TODO (v0.2): investigate distinguishing these via a fetch interceptor or by
     *   inspecting the refresh token's `exp` claim before calling `updateToken()`.
     */
    async refreshToken(minValidity = 30): Promise<AuthTokens | null> {
      await kc.updateToken(minValidity);

      if (!kc.token || !kc.refreshToken || kc.tokenParsed?.exp === undefined) {
        return null;
      }

      return {
        token: kc.token,
        refreshToken: kc.refreshToken,
        expiresAt: kc.tokenParsed.exp * 1000,
      };
    },
  };
}
