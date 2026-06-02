"use client";

import Link from "next/link";
import { useAuth } from "@ricardoqmd/auth-nextjs";

// PUBLIC route. Because the provider uses onLoad: "check-sso" and the gate is
// configured with renderOnUnauthenticated, this page renders whether or not the
// user is signed in. It demonstrates calling login() / logout() on demand.
export default function HomePage() {
  const { isAuthenticated, user, login, logout } = useAuth();

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
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Public landing</h1>
      <p style={{ color: "#6b7280", marginTop: 0 }}>
        This route is public — it renders for anonymous users because the
        provider is configured with <code>onLoad: &quot;check-sso&quot;</code>.
        Sign-in happens on demand via <code>useAuth().login()</code>.
      </p>

      <section style={{ marginTop: 24 }}>
        {isAuthenticated ? (
          <>
            <p>
              Signed in as{" "}
              <strong>{user?.preferred_username ?? user?.sub ?? "unknown"}</strong>.
            </p>
            <button onClick={logout} style={buttonStyle("#dc2626")}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <p>You are not signed in.</p>
            {/* login() from a public route — full-page redirect to Keycloak. */}
            <button onClick={login} style={buttonStyle("#111827")}>
              Sign in
            </button>
          </>
        )}
      </section>

      <p style={{ marginTop: 28 }}>
        <Link href="/protected">Go to the protected area →</Link>
      </p>
    </main>
  );
}

function buttonStyle(bg: string): React.CSSProperties {
  return {
    padding: "8px 20px",
    cursor: "pointer",
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 600,
  };
}
