"use client";

import { useState } from "react";
import { useAuth } from "@ricardoqmd/auth-nextjs";

// Endpoint to call THROUGH the API Gateway. Set the full URL (e.g. the gateway
// route for a protected backend service). Left unset, the panel explains how to
// configure it instead of calling.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Result =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; status: number; body: string }
  | { kind: "error"; message: string };

/**
 * Sends the current access token as `Authorization: Bearer <token>` to a backend
 * service behind the API Gateway and shows the result. This is the real
 * end-to-end integration check: it exercises the gateway's JWT validation
 * (audience/issuer), its RBAC, and CORS for this app's origin.
 *
 * A CORS rejection or unreachable host surfaces as a `TypeError` ("Failed to
 * fetch") with no HTTP status — itself a useful signal that the gateway must
 * allow this origin.
 */
export function ApiProbe() {
  const { token } = useAuth();
  const [result, setResult] = useState<Result>({ kind: "idle" });

  async function call() {
    if (!API_URL) {
      setResult({ kind: "error", message: "NEXT_PUBLIC_API_URL is not set." });
      return;
    }
    if (!token) {
      setResult({ kind: "error", message: "No access token available." });
      return;
    }
    setResult({ kind: "loading" });
    try {
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      setResult({ kind: "ok", status: res.status, body: text.slice(0, 600) });
    } catch (e) {
      // CORS failure / unreachable host / DNS — no HTTP status is available.
      setResult({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <div>
      <p style={{ color: "#6b7280", fontSize: 13, marginTop: 0, marginBottom: 12 }}>
        Calls{" "}
        <code>{API_URL ?? "NEXT_PUBLIC_API_URL (unset)"}</code> with{" "}
        <code>Authorization: Bearer &lt;token&gt;</code>. Exercises the gateway&apos;s
        JWT validation, RBAC, and CORS for this origin.
      </p>

      <button
        onClick={call}
        disabled={result.kind === "loading"}
        style={{
          padding: "8px 20px",
          cursor: result.kind === "loading" ? "default" : "pointer",
          background: "#111827",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontFamily: "inherit",
          fontSize: 14,
          fontWeight: 600,
          opacity: result.kind === "loading" ? 0.6 : 1,
        }}
      >
        {result.kind === "loading" ? "Calling…" : "Call backend"}
      </button>

      {result.kind === "ok" && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: "0 0 6px", fontSize: 13 }}>
            HTTP status:{" "}
            <strong style={{ color: result.status < 400 ? "#16a34a" : "#dc2626" }}>
              {result.status}
            </strong>
          </p>
          <pre style={preStyle}>{result.body || "(empty body)"}</pre>
        </div>
      )}

      {result.kind === "error" && (
        <p style={{ marginTop: 12, color: "#dc2626", fontSize: 13 }}>
          {result.message}
        </p>
      )}
    </div>
  );
}

const preStyle: React.CSSProperties = {
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 6,
  fontSize: 12,
  overflow: "auto",
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};
