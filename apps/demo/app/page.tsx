"use client";

import { useAuth } from "@ricardoqmd/auth-nextjs";

export default function HomePage() {
  const { user, logout, hasRole, hasResourceRole } = useAuth();

  return (
    <main style={{ padding: 32, fontFamily: "system-ui", maxWidth: 720, margin: "0 auto" }}>
      <h1>@ricardoqmd/auth — demo</h1>
      <p>If you can see this, you are authenticated against Keycloak.</p>

      <section style={{ marginTop: 24 }}>
        <h2>User</h2>
        <pre style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, overflow: "auto" }}>
          {JSON.stringify(user, null, 2)}
        </pre>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>RBAC checks</h2>
        <ul>
          <li>hasRole(&quot;admin&quot;): {String(hasRole("admin"))}</li>
          <li>hasRole(&quot;user&quot;): {String(hasRole("user"))}</li>
          <li>hasResourceRole(&quot;demo-app&quot;, &quot;editor&quot;): {String(hasResourceRole("demo-app", "editor"))}</li>
        </ul>
      </section>

      <button onClick={logout} style={{ marginTop: 24, padding: "8px 16px", cursor: "pointer" }}>
        Sign out
      </button>
    </main>
  );
}
