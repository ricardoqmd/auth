"use client";

import { useAuth } from "@ricardoqmd/auth-nextjs";

// This page is only rendered when the machine is in the `authenticated` state.
// The gate in <AuthProvider> (loadingComponent / errorComponent) handles all other
// states, so isLoading and error from useAuth() are always false/null here.
// They are included in useAuth()'s return type for completeness and for consumers
// who implement their own gate logic.

const DEMO_CLIENT = "demo-app";

function RbacRow({ label, value }: { label: string; value: boolean }) {
  return (
    <tr>
      <td style={{ padding: "6px 12px 6px 0", fontFamily: "monospace", fontSize: 13 }}>
        {label}
      </td>
      <td
        style={{
          padding: "6px 0",
          fontWeight: 600,
          color: value ? "#16a34a" : "#dc2626",
        }}
      >
        {value ? "true" : "false"}
      </td>
    </tr>
  );
}

function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <tr>
      <td style={{ padding: "4px 16px 4px 0", color: "#6b7280", fontSize: 13, whiteSpace: "nowrap" }}>
        {label}
      </td>
      <td style={{ padding: "4px 0", fontFamily: "monospace", fontSize: 13 }}>
        {value ?? <span style={{ color: "#9ca3af" }}>—</span>}
      </td>
    </tr>
  );
}

export default function HomePage() {
  const {
    user,
    token,
    logout,
    hasRole,
    hasAnyRole,
    hasResourceRole,
  } = useAuth();

  const truncatedToken = token
    ? `${token.slice(0, 40)}…`
    : null;

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
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>@ricardoqmd/auth — demo</h1>
      <p style={{ color: "#6b7280", marginTop: 0 }}>
        You are authenticated against Keycloak. This page exercises the full
        public API surface of <code>useAuth()</code>.
      </p>

      {/* ------------------------------------------------------------------ */}
      {/* User identity */}
      {/* ------------------------------------------------------------------ */}
      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Identity</h2>
        <table style={{ borderCollapse: "collapse" }}>
          <tbody>
            <InfoRow label="preferred_username" value={user?.preferred_username} />
            <InfoRow label="name" value={user?.name} />
            <InfoRow label="email" value={user?.email} />
            <InfoRow label="sub" value={user?.sub} />
          </tbody>
        </table>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* RBAC checks — these are the main value-add of the package */}
      {/* ------------------------------------------------------------------ */}
      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>RBAC checks</h2>
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: 0, marginBottom: 12 }}>
          Realm roles come from <code>realm_access.roles</code>; resource roles from{" "}
          <code>resource_access[resource].roles</code> in the decoded token.
        </p>
        <table style={{ borderCollapse: "collapse" }}>
          <tbody>
            <RbacRow label='hasRole("admin")' value={hasRole("admin")} />
            <RbacRow label='hasRole("user")' value={hasRole("user")} />
            <RbacRow
              label='hasAnyRole(["admin", "superuser"])'
              value={hasAnyRole(["admin", "superuser"])}
            />
            <RbacRow
              label={`hasResourceRole("${DEMO_CLIENT}", "editor")`}
              value={hasResourceRole(DEMO_CLIENT, "editor")}
            />
            <RbacRow
              label={`hasResourceRole("${DEMO_CLIENT}", "viewer")`}
              value={hasResourceRole(DEMO_CLIENT, "viewer")}
            />
            <RbacRow
              label={`hasResourceRole("${DEMO_CLIENT}", "nonexistent")`}
              value={hasResourceRole(DEMO_CLIENT, "nonexistent")}
            />
          </tbody>
        </table>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Token (truncated) */}
      {/* ------------------------------------------------------------------ */}
      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Access token (truncated)</h2>
        <code
          style={{
            display: "block",
            background: "#f3f4f6",
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: 12,
            wordBreak: "break-all",
            color: "#374151",
          }}
        >
          {truncatedToken}
        </code>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Full decoded claims */}
      {/* ------------------------------------------------------------------ */}
      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Decoded token claims (user object)</h2>
        <pre
          style={{
            background: "#f3f4f6",
            padding: "12px 14px",
            borderRadius: 6,
            fontSize: 12,
            overflow: "auto",
            margin: 0,
          }}
        >
          {JSON.stringify(user, null, 2)}
        </pre>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Actions */}
      {/* ------------------------------------------------------------------ */}
      <section style={{ marginTop: 32 }}>
        <button
          onClick={logout}
          style={{
            padding: "8px 20px",
            cursor: "pointer",
            background: "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Sign out
        </button>
      </section>
    </main>
  );
}
