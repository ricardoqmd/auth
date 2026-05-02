# @ricardoqmd/auth-nextjs

> Next.js (App Router) client-side bindings for `@ricardoqmd/auth-core`. Drop-in `<AuthProvider>` and `useAuth()` hook with RBAC helpers.

## Install

```bash
npm install @ricardoqmd/auth-nextjs @ricardoqmd/auth-keycloak @ricardoqmd/auth-core keycloak-js
```

## Quick start

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

## Status

🚧 **0.0.1 — Pre-release scaffold.** Public API not stable until 1.0.0.

## License

MIT © ricardoqmd
