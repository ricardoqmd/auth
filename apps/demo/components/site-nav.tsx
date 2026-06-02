"use client";

import Link from "next/link";

/**
 * Minimal nav so the demo is navigable between the public ("/") and protected
 * ("/protected") routes. Deliberately dumb — it carries no auth logic; sign-in
 * and sign-out live on the pages themselves to keep each concept in one place.
 */
export function SiteNav() {
  return (
    <nav
      style={{
        display: "flex",
        gap: 16,
        padding: "12px 24px",
        borderBottom: "1px solid #e5e7eb",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
      }}
    >
      <Link href="/">Home</Link>
      <Link href="/protected">Protected</Link>
    </nav>
  );
}
