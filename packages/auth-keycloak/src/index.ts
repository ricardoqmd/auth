/**
 * @ricardoqmd/auth-keycloak
 *
 * Keycloak adapter implementing the AuthProvider contract from @ricardoqmd/auth-core.
 *
 * STATUS: Skeleton — full implementation lands in next step.
 */

import type { AuthProvider } from "@ricardoqmd/auth-core";

export interface KeycloakProviderConfig {
  /** Keycloak server URL, e.g. https://kc.example.com */
  url: string;
  /** Realm name */
  realm: string;
  /** Public client ID configured in the realm */
  clientId: string;
}

export interface KeycloakProviderOptions {
  config: KeycloakProviderConfig;
  /**
   * - 'login-required' (default): redirect immediately if not authenticated.
   *   This is the SPA-style behavior: the user never sees the app unauthenticated.
   * - 'check-sso': do not redirect; let the app render and decide.
   */
  onLoad?: "login-required" | "check-sso";
  /** Path to the silent SSO HTML (for 'check-sso' mode in iframes). */
  silentCheckSsoRedirectUri?: string;
  /** Disable the legacy login-status iframe (recommended). */
  checkLoginIframe?: boolean;
  /** PKCE method — keep 'S256'. */
  pkceMethod?: "S256";
}

/**
 * Placeholder factory — returns a stub until the Keycloak adapter is implemented.
 */
export function createKeycloakProvider(_options: KeycloakProviderOptions): AuthProvider {
  return {
    async init() {
      throw new Error("createKeycloakProvider: not yet implemented (track 1, step 'auth-keycloak').");
    },
    async login() {
      throw new Error("createKeycloakProvider: not yet implemented.");
    },
    async logout() {
      throw new Error("createKeycloakProvider: not yet implemented.");
    },
    async refreshToken() {
      throw new Error("createKeycloakProvider: not yet implemented.");
    },
  };
}
