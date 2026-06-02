# @ricardoqmd/auth — demo

A runnable Next.js (App Router) reference app for the `@ricardoqmd/auth-*`
packages, wired against a real Keycloak server. It is the canonical example of
how a consumer integrates the packages.

What it demonstrates:

- A **public** route (`/`) that renders for anonymous users and signs in on
  demand via `useAuth().login()`.
- A **protected** route (`/protected`) gated by a consumer-side `<RequireAuth>`
  guard (`components/require-auth.tsx`).
- **Role helpers**: `hasRole` / `hasAnyRole` over the normalized `user.roles`,
  and `hasResourceRole(idpClaims, client, role)` from the Keycloak adapter.
- **Typed IDP claims** via `useAuth<KeycloakIdpClaims>()`.
- **Structured errors**: the gate's `errorComponent` branches on `error.code`
  (`NETWORK_ERROR`, `TOKEN_EXPIRED`, `REFRESH_FAILED`, `INIT_FAILED`).
- A **backend call through the API Gateway** (`/protected` → "Backend call"):
  sends `Authorization: Bearer <token>` to `NEXT_PUBLIC_API_URL` and shows the
  response — the real end-to-end check (gateway JWT validation, RBAC, CORS).

## Run

From the repo root:

```bash
pnpm install
cp apps/demo/.env.example apps/demo/.env.local   # then edit it
pnpm --filter @ricardoqmd-demo/app dev           # http://localhost:3000
```

`.env.local`:

```
NEXT_PUBLIC_KC_URL=http://localhost:8080
NEXT_PUBLIC_KC_REALM=demo
NEXT_PUBLIC_KC_CLIENT_ID=demo-app
# Optional — endpoint behind the API Gateway for the "Backend call" panel:
NEXT_PUBLIC_API_URL=https://gateway.example.org/api/whoami
```

## Run with Docker

The repo ships a compose stack under `docker/` that already seeds Keycloak (realm
`demo`, client `demo-app`, roles, and a user). The demo app is behind a `demo`
compose profile so a plain Keycloak start is unaffected. From the repo root:

```bash
pnpm demo:docker        # Keycloak :8080 + demo :3000 (builds the image)
# stop it with:
pnpm demo:docker:down
```

Then open http://localhost:3000 and sign in with **`ricardo` / `password`**.
Keycloak needs ~30–60s to import the realm on first start.

- `pnpm kc:up` starts **only** Keycloak (e.g. for E2E or `pnpm demo`, which runs
  `next dev`). The `demo` service is opt-in via its profile, so it won't start.
- The demo image bakes `NEXT_PUBLIC_KC_*` at build time (they are inlined into
  the client bundle). To point a built image at a different Keycloak, rebuild with
  `--build-arg NEXT_PUBLIC_KC_URL=...` (and realm/clientId).
- Note: with both on `localhost`, app and Keycloak are the **same site**, so this
  does **not** exercise the cross-origin path (app and Keycloak on different
  origins). For that, deploy with distinct origins (see "Testing behind a real
  gateway").

## Keycloak client setup

Create a **public** client (no client secret) with the **Standard flow**
enabled, then set:

| Setting | Value |
|---|---|
| Valid redirect URIs | `http://localhost:3000/*` |
| Valid post-logout redirect URIs | `http://localhost:3000/*` |
| Web origins | `http://localhost:3000` (or `+`) |

Notes:

- `public/silent-check-sso.html` ships for the **opt-in** silent check-sso variant
  (see "Gating patterns"); the default redirect-based flow does not use it. If you
  do opt in, it is already covered by the `http://localhost:3000/*` redirect
  pattern — no separate entry needed.
- To see the RBAC rows turn `true`, assign the user a realm role (`admin` /
  `user`) and, for the resource-role rows, a client role (`editor` / `viewer`)
  on the `demo-app` client.

## Gating patterns

This demo uses **redirect-based check-sso** so it can show both public and
protected routes:

- `onLoad: "check-sso"` (no `silentCheckSsoRedirectUri`) + `renderOnUnauthenticated`
  → keycloak-js does a brief top-level redirect to verify the session, then the
  app renders for anonymous users; the consumer gates protected areas with
  `<RequireAuth>`. No iframe, so it is unaffected by Keycloak's `frame-ancestors`
  CSP and by third-party-cookie restrictions.

For a **fully-private** app (e.g. an internal dashboard with no public pages),
use the simpler boot gate instead:

- `onLoad: "login-required"` and **drop** `renderOnUnauthenticated` — Keycloak
  redirects before anything renders, so no guard component is needed. This is the
  recommended choice for private apps.

To **opt into silent check-sso** (session checked in a hidden iframe, no redirect
flash), set `silentCheckSsoRedirectUri` in the provider. Mind the trade-offs in a
cross-origin / strict-CSP deployment: Keycloak's `frame-ancestors 'self'` CSP
blocks the app from framing the login page (allow this app's origin under Realm
Settings → Security Defenses → Content-Security-Policy), and browsers that block
third-party cookies can make the iframe time out. The redirect flow above avoids
both.

All flows require a **secure context** (HTTPS, or `localhost`): keycloak-js uses
the Web Crypto API for PKCE, which browsers withhold over plain `http://<ip>`
(surfaces as `INIT_FAILED` — "Web Crypto API is not available").

## Testing behind a real gateway (cross-origin)

To validate the integration the way production behaves — not just localhost —
deploy this app where its origin **differs from Keycloak's** (real DNS, behind
your proxy/firewall), build with `next build && next start`, and:

- Serve over **HTTPS** (or tunnel so the app is reached via `localhost`). On plain
  `http://<ip>` the browser withholds the Web Crypto API that PKCE needs, so init
  fails with `INIT_FAILED` ("Web Crypto API is not available") — a secure-context
  rule, not a code bug. Dev shortcuts: an SSH tunnel to `localhost`, a self-signed
  cert, or Chrome's "treat insecure origin as secure" flag.
- The default redirect-based check-sso uses no iframe and is unaffected by
  third-party cookies. If you opted into silent check-sso, Keycloak's
  `frame-ancestors` CSP blocks the iframe cross-origin until you allow this app's
  origin (Realm Settings → Security Defenses → Content-Security-Policy).
- Set `NEXT_PUBLIC_API_URL` to a real gateway route and use the "Backend call"
  panel to send the token end-to-end. The gateway must allow this app's origin
  (CORS) or `fetch` fails with no HTTP status.
- Reload mid-session, and let the session expire (or revoke it) to confirm the
  error UX and recovery under real timing.

A same-origin deployment does **not** exercise the third-party-cookie path, so it
gives a false green — keep the app and Keycloak on different origins.

## Troubleshooting

**The page loops and the URL shows `/undefined/protocol/openid-connect/...`
with `client_id=undefined`.** Your `NEXT_PUBLIC_KC_*` env vars are not loaded,
so Keycloak receives `url=undefined` and builds a relative auth URL that
redirects onto itself. Create `apps/demo/.env.local` (see above) and **restart**
the dev server — `NEXT_PUBLIC_*` vars are read at build/start time. This demo
fails fast with a clear message in that case instead of looping.

**Redirect/CORS errors after Keycloak login.** The client's Valid redirect URIs
or Web origins don't match `http://localhost:3000`. See the table above.
