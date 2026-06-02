"use client";

import { useAuth } from "@ricardoqmd/auth-nextjs";

/**
 * Consumer-side route guard.
 *
 * The library intentionally ships no guard component: whether to redirect,
 * show a prompt, or render a fallback is a UX decision the consumer owns
 * (and it differs per IDP). This is the reference pattern — render children
 * only when authenticated, otherwise prompt the user to sign in.
 *
 * Assumes the provider uses onLoad: "check-sso" with renderOnUnauthenticated,
 * so by the time this component renders, the auth state has settled and
 * isAuthenticated is stable.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return (
      <main
        style={{
          padding: "32px 24px",
          fontFamily: "system-ui, sans-serif",
          maxWidth: 760,
          margin: "0 auto",
          lineHeight: 1.5,
        }}
      >
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Sign in required</h1>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          This area is protected. Sign in to continue.
        </p>
        <button
          onClick={login}
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
          Sign in
        </button>
      </main>
    );
  }

  return <>{children}</>;
}
