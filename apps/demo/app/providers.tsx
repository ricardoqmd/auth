"use client";

import { AuthProvider } from "@ricardoqmd/auth-nextjs";
import { createKeycloakProvider } from "@ricardoqmd/auth-keycloak";
import type { AuthError } from "@ricardoqmd/auth-core";

// ----------------------------------------------------------------------------
// Environment
// ----------------------------------------------------------------------------
// NEXT_PUBLIC_* vars are inlined by Next only when referenced *statically*
// (process.env.NEXT_PUBLIC_KC_URL), never via process.env[name]. Read them
// statically and fail loudly if any is missing — otherwise Keycloak receives
// `url=undefined` and builds a relative auth URL that redirects onto itself
// (the classic `/undefined/protocol/openid-connect/...` redirect loop).
const url = process.env.NEXT_PUBLIC_KC_URL;
const realm = process.env.NEXT_PUBLIC_KC_REALM;
const clientId = process.env.NEXT_PUBLIC_KC_CLIENT_ID;

if (!url || !realm || !clientId) {
  throw new Error(
    "Missing NEXT_PUBLIC_KC_URL / NEXT_PUBLIC_KC_REALM / NEXT_PUBLIC_KC_CLIENT_ID. " +
      "Copy apps/demo/.env.example to apps/demo/.env.local, fill in your Keycloak " +
      "url/realm/clientId, and restart the dev server.",
  );
}

// ----------------------------------------------------------------------------
// Provider (module scope — created once)
// ----------------------------------------------------------------------------
// Must NOT be created inside a component: a new instance per render spawns a
// new Keycloak singleton and resets the auth flow on every render.
const provider = createKeycloakProvider({
  config: { url, realm, clientId },
  // check-sso: do not force a redirect at boot. Anonymous users see the public
  // landing and sign in on demand via useAuth().login(). For a fully-private
  // app, use onLoad: "login-required" and drop renderOnUnauthenticated below
  // (see README → "Gating patterns").
  onLoad: "check-sso",
  // Required for check-sso: a static doc served by the app that lets Keycloak
  // verify the session in a hidden iframe (no full-page redirect). Its URL must
  // be covered by the client's "Valid redirect URIs" in Keycloak.
  silentCheckSsoRedirectUri:
    typeof window !== "undefined"
      ? `${window.location.origin}/silent-check-sso.html`
      : undefined,
});

// ----------------------------------------------------------------------------
// Error screen — rendered by the gate in the `error` state
// ----------------------------------------------------------------------------
// This UI lives OUTSIDE the auth context, so it cannot call useAuth(). It talks
// to the module-scope `provider` directly. Branch on error.code to drive UX:
// a network blip is retryable; an expired session needs a fresh login.
function describeError(error: AuthError): {
  title: string;
  hint: string;
  action: React.ReactNode;
} {
  switch (error.code) {
    case "NETWORK_ERROR":
      return {
        title: "Can't reach the identity server",
        hint: "Keycloak looks unreachable. Check your connection and try again.",
        action: <RetryButton label="Retry" />,
      };
    case "TOKEN_EXPIRED":
    case "REFRESH_FAILED":
      return {
        title: "Your session expired",
        hint: "Sign in again to continue.",
        action: (
          <ActionButton label="Sign in again" onClick={() => void provider.login()} />
        ),
      };
    case "INIT_FAILED":
    default:
      return {
        title: "Authentication failed",
        hint: error.message,
        action: <RetryButton label="Try again" />,
      };
  }
}

function AuthErrorScreen(error: AuthError): React.ReactNode {
  const { title, hint, action } = describeError(error);
  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, color: "#b91c1c", marginBottom: 8 }}>{title}</h1>
        <p style={{ color: "#374151", marginTop: 0 }}>{hint}</p>
        <p style={{ fontFamily: "monospace", fontSize: 12, color: "#9ca3af" }}>
          code: {error.code}
        </p>
        <div style={{ marginTop: 16 }}>{action}</div>
      </div>
    </main>
  );
}

function RetryButton({ label }: { label: string }) {
  return <ActionButton label={label} onClick={() => window.location.reload()} />;
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 20px",
        cursor: "pointer",
        background: "#111827",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );
}

// ----------------------------------------------------------------------------
// Providers
// ----------------------------------------------------------------------------
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider
      provider={provider}
      loadingComponent={
        <div
          style={{
            display: "grid",
            placeItems: "center",
            height: "100vh",
            fontFamily: "system-ui",
          }}
        >
          <p>Authenticating…</p>
        </div>
      }
      errorComponent={AuthErrorScreen}
      // check-sso renders the app for anonymous users (public landing). With
      // onLoad: "login-required" this would be false and Keycloak would redirect
      // before anything renders.
      renderOnUnauthenticated={true}
    >
      {children}
    </AuthProvider>
  );
}
