"use client";

import { RequireAuth } from "@/components/require-auth";
import { ApiProbe } from "@/components/api-probe";
import { useAuth } from "@ricardoqmd/auth-nextjs";
import { hasResourceRole, type KeycloakIdpClaims } from "@ricardoqmd/auth-keycloak";

// PROTECTED route. The page itself is wrapped in <RequireAuth>; the dashboard
// inside only renders for authenticated users, so useAuth() values (user,
// idpClaims, ...) are guaranteed populated there.
//
// This dashboard exercises the Keycloak-specific surface:
//   - role helpers (hasRole / hasAnyRole over the normalized user.roles)
//   - resource roles via hasResourceRole(idpClaims, client, role)
//   - typed idpClaims via useAuth<KeycloakIdpClaims>()
const DEMO_CLIENT = "demo-app";

export default function ProtectedPage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}

function Dashboard() {
  const { user, token, idpClaims, logout, hasRole, hasAnyRole } =
    useAuth<KeycloakIdpClaims>();

  const truncatedToken = token ? `${token.slice(0, 40)}…` : null;

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
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Protected area</h1>
      <p style={{ color: "#6b7280", marginTop: 0 }}>
        Rendered only behind <code>&lt;RequireAuth&gt;</code>. This page exercises
        the authenticated surface of <code>useAuth&lt;KeycloakIdpClaims&gt;()</code>.
      </p>

      {/* Identity */}
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

      {/* RBAC checks */}
      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>RBAC checks</h2>
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: 0, marginBottom: 12 }}>
          Realm roles come from the normalized <code>user.roles</code> array;
          resource roles use <code>hasResourceRole(idpClaims, ...)</code> from the
          Keycloak adapter.
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
              label={`hasResourceRole(idpClaims, "${DEMO_CLIENT}", "editor")`}
              value={hasResourceRole(idpClaims, DEMO_CLIENT, "editor")}
            />
            <RbacRow
              label={`hasResourceRole(idpClaims, "${DEMO_CLIENT}", "viewer")`}
              value={hasResourceRole(idpClaims, DEMO_CLIENT, "viewer")}
            />
            <RbacRow
              label={`hasResourceRole(idpClaims, "${DEMO_CLIENT}", "nonexistent")`}
              value={hasResourceRole(idpClaims, DEMO_CLIENT, "nonexistent")}
            />
          </tbody>
        </table>
      </section>

      {/* Token (truncated) */}
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

      {/* Backend call through the API Gateway */}
      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Backend call (through the gateway)</h2>
        <ApiProbe />
      </section>

      {/* Normalized OIDC claims */}
      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>
          Normalized OIDC claims (<code>user</code>)
        </h2>
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: 0, marginBottom: 12 }}>
          Shape is identical across IDPs (Keycloak, Entra, Cognito, etc.).
        </p>
        <pre style={preStyle}>{JSON.stringify(user, null, 2)}</pre>
      </section>

      {/* Keycloak-specific claims */}
      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>
          Keycloak-specific claims (<code>idpClaims</code>)
        </h2>
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: 0, marginBottom: 12 }}>
          IDP-specific token contents (realm_access, resource_access, etc.).
        </p>
        <pre style={preStyle}>{JSON.stringify(idpClaims, null, 2)}</pre>
      </section>

      {/* Actions */}
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

const preStyle: React.CSSProperties = {
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 6,
  fontSize: 12,
  overflow: "auto",
  margin: 0,
};

function RbacRow({ label, value }: { label: string; value: boolean }) {
  return (
    <tr>
      <td style={{ padding: "6px 12px 6px 0", fontFamily: "monospace", fontSize: 13 }}>
        {label}
      </td>
      <td style={{ padding: "6px 0", fontWeight: 600, color: value ? "#16a34a" : "#dc2626" }}>
        {value ? "true" : "false"}
      </td>
    </tr>
  );
}

function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <tr>
      <td
        style={{
          padding: "4px 16px 4px 0",
          color: "#6b7280",
          fontSize: 13,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </td>
      <td style={{ padding: "4px 0", fontFamily: "monospace", fontSize: 13 }}>
        {value ?? <span style={{ color: "#9ca3af" }}>—</span>}
      </td>
    </tr>
  );
}
