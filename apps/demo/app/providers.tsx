"use client";

import { AuthProvider } from "@ricardoqmd/auth-nextjs";
import { createKeycloakProvider } from "@ricardoqmd/auth-keycloak";

const provider = createKeycloakProvider({
  config: {
    url: process.env.NEXT_PUBLIC_KC_URL!,
    realm: process.env.NEXT_PUBLIC_KC_REALM!,
    clientId: process.env.NEXT_PUBLIC_KC_CLIENT_ID!,
  },
  // Default behavior: if not authenticated, redirect immediately to Keycloak.
  // No "Login" button needed — the app is gated at boot.
  onLoad: "login-required",
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider
      provider={provider}
      loadingComponent={
        <div style={{ display: "grid", placeItems: "center", height: "100vh", fontFamily: "system-ui" }}>
          <p>Authenticating…</p>
        </div>
      }
      errorComponent={(error) => (
        <div style={{ padding: 24, fontFamily: "system-ui", color: "crimson" }}>
          <h1>Authentication failed</h1>
          <pre>{error.message}</pre>
        </div>
      )}
    >
      {children}
    </AuthProvider>
  );
}
