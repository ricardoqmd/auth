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

export function Dashboard() {
  const { user, token, logout, hasRole, hasAnyRole, hasResourceRole } = useAuth();

  return (
    <>
      <p>Welcome, {user?.preferred_username}</p>
      {hasRole("admin") && <AdminPanel />}
      {hasResourceRole("my-app", "editor") && <EditButton />}
      <button onClick={logout}>Sign out</button>
    </>
  );
}
```

## API

### `<AuthProvider>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `provider` | `AuthProvider` | required | Adapter instance from `createKeycloakProvider()` |
| `loadingComponent` | `ReactNode` | `null` | Shown while initializing or during logout redirect |
| `errorComponent` | `(error: Error) => ReactNode` | `null` | Shown when initialization fails |
| `renderOnUnauthenticated` | `boolean` | `false` | Render children when unauthenticated (for `check-sso` flows with a login button) |

### `useAuth()`

Returns an `AuthState` object:

| Field | Type | Description |
|---|---|---|
| `isAuthenticated` | `boolean` | True when the machine is in the `authenticated` state |
| `isLoading` | `boolean` | True during `initializing` or `loggingOut` transitions |
| `token` | `string \| null` | Raw JWT access token |
| `user` | `AuthUserClaims \| null` | Decoded token claims (`preferred_username`, `email`, `name`, `sub`, …) |
| `error` | `Error \| null` | Set when initialization or token refresh fails |
| `logout` | `() => void` | Triggers the logout flow |
| `hasRole` | `(role: string) => boolean` | Check realm-level role |
| `hasAnyRole` | `(roles: string[]) => boolean` | True if user has at least one of the given realm roles |
| `hasResourceRole` | `(resource: string, role: string) => boolean` | Check client-level role for a specific resource |

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

## License

MIT © ricardoqmd
