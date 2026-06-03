# @ricardoqmd/auth-nextjs

> Next.js (App Router) client-side bindings for `@ricardoqmd/auth-core`. Drop-in `<AuthProvider>` and `useAuth()` hook with RBAC helpers.

## Installation

```bash
npm install @ricardoqmd/auth-core @ricardoqmd/auth-keycloak @ricardoqmd/auth-nextjs keycloak-js
```

## Usage

### 1. Create the provider (Client Component)

Create the Keycloak provider **outside** the component render to keep the
instance stable across re-renders:

```tsx
// app/providers.tsx
"use client";
import { AuthProvider } from "@ricardoqmd/auth-nextjs";
import { createKeycloakProvider } from "@ricardoqmd/auth-keycloak";

const provider = createKeycloakProvider({
  config: {
    url: process.env.NEXT_PUBLIC_KC_URL!,
    realm: process.env.NEXT_PUBLIC_KC_REALM!,
    clientId: process.env.NEXT_PUBLIC_KC_CLIENT_ID!,
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider provider={provider}>{children}</AuthProvider>;
}
```

### 2. Wrap your layout

```tsx
// app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 3. Use auth state in any Client Component

```tsx
"use client";
import { useAuth } from "@ricardoqmd/auth-nextjs";
import { hasResourceRole } from "@ricardoqmd/auth-keycloak";
import type { KeycloakIdpClaims } from "@ricardoqmd/auth-keycloak";

export function Dashboard() {
  const { user, token, logout, hasRole, hasAnyRole, idpClaims } =
    useAuth<KeycloakIdpClaims>();

  return (
    <>
      <p>Welcome, {user?.preferred_username}</p>
      {hasRole("admin") && <AdminPanel />}
      {hasResourceRole(idpClaims, "my-app", "editor") && <EditButton />}
      <button onClick={logout}>Sign out</button>
    </>
  );
}
```

### Sign-in on demand (`check-sso` flows)

With `renderOnUnauthenticated`, anonymous users see your UI and sign in when they
choose. Call `login()` from the hook:

```tsx
"use client";
import { useAuth } from "@ricardoqmd/auth-nextjs";

export function SignInButton() {
  const { isAuthenticated, login, logout } = useAuth();
  return isAuthenticated ? (
    <button onClick={logout}>Sign out</button>
  ) : (
    <button onClick={login}>Sign in</button>
  );
}
```

### IDP-specific claims (typed)

`useAuth()` is generic over the IDP claims shape. If you want typed access to provider-specific fields, pass your adapter's claims interface:

```tsx
"use client";
import { useAuth } from "@ricardoqmd/auth-nextjs";
import type { KeycloakIdpClaims } from "@ricardoqmd/auth-keycloak";

export function MyComponent() {
  const { idpClaims } = useAuth<KeycloakIdpClaims>();

  // idpClaims is now typed as KeycloakIdpClaims | null
  // You can access realm_access, resource_access, etc. with full type safety.
  const realmRoles = idpClaims?.realm_access?.roles ?? [];
  return <p>Realm roles: {realmRoles.join(", ")}</p>;
}
```

For common role checks, use the universal `hasRole()` / `hasAnyRole()` exposed by the hook. For provider-specific checks (e.g., Keycloak's resource roles), import dedicated utilities from your adapter package.

## API

### `<AuthProvider>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `provider` | `AuthProvider` | required | Adapter instance from `createKeycloakProvider()` |
| `loadingComponent` | `ReactNode` | `null` | Shown while initializing or during logout redirect |
| `errorComponent` | `(error: AuthError) => ReactNode` | `null` | Shown in the `error` state; receives a structured [`AuthError`](#handling-errors) |
| `renderOnUnauthenticated` | `boolean` | `false` | Render children when unauthenticated (for `check-sso` flows with a login button) |

### `useAuth<TIdpClaims>()`

Returns an `AuthState<TIdpClaims>` object. The generic `TIdpClaims` defaults to `unknown` — pass your adapter's claims interface for typed access to IDP-specific fields:

```tsx
const { idpClaims } = useAuth<KeycloakIdpClaims>();
```

| Field | Type | Description |
|---|---|---|
| `isAuthenticated` | `boolean` | True when the machine is in the `authenticated` state |
| `isLoading` | `boolean` | True during `initializing` or `loggingOut` transitions |
| `token` | `string \| null` | Raw JWT access token |
| `user` | `AuthUserClaims \| null` | Decoded standard OIDC claims (`preferred_username`, `email`, `name`, `sub`, `roles`, …) |
| `idpClaims` | `TIdpClaims \| null` | IDP-specific token claims. Type is generic — pass your IDP's claims interface to `useAuth<T>()`. Use this to access provider-specific fields (e.g., Keycloak's `resource_access`). |
| `error` | `AuthError \| null` | Structured error set in the `error` state; branch on `error.code` (see [Handling errors](#handling-errors)) |
| `login` | `() => void` | Starts the login redirect (useful on public routes with `check-sso`) |
| `logout` | `() => void` | Triggers the logout flow |
| `hasRole` | `(role: string) => boolean` | Check if user has a role in the universal `user.roles` array |
| `hasAnyRole` | `(roles: string[]) => boolean` | True if user has at least one of the given roles |

For IDP-specific role checks (e.g., Keycloak's resource roles), import dedicated utilities from your adapter package. See [`@ricardoqmd/auth-keycloak`](https://www.npmjs.com/package/@ricardoqmd/auth-keycloak) for `hasResourceRole()`.

## Handling errors

`error` (from `useAuth()`) and the value passed to `errorComponent` are a
structured `AuthError` from `@ricardoqmd/auth-core`, not a plain `Error`. Branch
on `error.code` to drive UX:

```tsx
import type { AuthError } from "@ricardoqmd/auth-core";

// errorComponent receives the AuthError directly.
function ErrorScreen(error: AuthError) {
  switch (error.code) {
    case "NETWORK_ERROR": // identity server unreachable — retryable
    case "INIT_FAILED": // could not initialize the session
      return <button onClick={() => window.location.reload()}>Retry</button>;
    case "REFRESH_FAILED": // session ended — a fresh login is required
    case "TOKEN_EXPIRED":
      return <button onClick={() => provider.login()}>Sign in again</button>;
    default:
      return <p>{error.message}</p>;
  }
}
```

`code` is one of `INIT_FAILED`, `REFRESH_FAILED`, `TOKEN_EXPIRED`, or
`NETWORK_ERROR`. New codes may be added over time, so always handle `default`.
(`TOKEN_EXPIRED` is reserved and not currently emitted by `auth-keycloak` — a dead
refresh token rejects as `REFRESH_FAILED`; see ADR-009.)

> `errorComponent` is rendered **outside** the auth context, so it cannot call
> `useAuth()`. To trigger a new login from it, call the module-scope
> `provider.login()` directly (as above).

## Troubleshooting

### Module resolution errors during build or SSR

The package is distributed as ESM with a proper CJS fallback and works
out-of-the-box with Next.js 14, 15, and 16. However, if you encounter
errors related to module resolution under specific conditions (e.g.,
corrupted cache, complex monorepo setups, or specific Next.js plugin
combinations), you can add the packages to `transpilePackages` in your
`next.config.ts` as a defensive measure:

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ricardoqmd/auth-core",
    "@ricardoqmd/auth-keycloak",
    "@ricardoqmd/auth-nextjs",
  ],
};

export default nextConfig;
```

This forces Next.js to transpile the packages through its bundler,
bypassing any ESM/CJS resolution edge cases.

If you run into a module resolution error, also try clearing the Next.js
cache before concluding the issue requires `transpilePackages`:

```bash
rm -rf .next node_modules/.cache
npm run dev
```

## Status

**Stable.** The public API is frozen and follows SemVer from 1.0 onward (see
[ADR-009](https://github.com/ricardoqmd/auth/blob/main/docs/decisions/009-freeze-public-api-for-1.0.md)):
additive changes are non-breaking; removing or renaming an export, or adding a
method to the `AuthProvider` port, is a major bump.

## License

MIT © [ricardoqmd](https://github.com/ricardoqmd)
