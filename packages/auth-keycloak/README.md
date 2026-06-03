# @ricardoqmd/auth-keycloak

> Keycloak adapter for [`@ricardoqmd/auth-core`](https://www.npmjs.com/package/@ricardoqmd/auth-core). Wraps [`keycloak-js`](https://www.npmjs.com/package/keycloak-js) to implement the `AuthProvider` contract.

## Install

```bash
npm install @ricardoqmd/auth-keycloak keycloak-js @ricardoqmd/auth-core
```

`keycloak-js` is a peer dependency — install it explicitly so you control its version.

## What's in the box

- **`createKeycloakProvider()`** — factory that returns an `AuthProvider<KeycloakIdpClaims>` ready to plug into a framework binding.
- **`KeycloakIdpClaims`** — TypeScript interface describing the Keycloak-specific token claims (`realm_access`, `resource_access`).
- **`hasResourceRole()`** — standalone utility for checking client-level (resource) roles. Use this when the universal `hasRole()` from your binding is not enough.

## Quick start

If you are using Next.js, see [`@ricardoqmd/auth-nextjs`](https://www.npmjs.com/package/@ricardoqmd/auth-nextjs) for end-to-end setup. The snippet below shows the adapter in isolation:

```ts
import { createKeycloakProvider } from "@ricardoqmd/auth-keycloak";

const provider = createKeycloakProvider({
  config: {
    url: "https://keycloak.example.com",
    realm: "my-realm",
    clientId: "my-app",
  },
});

// `provider` implements AuthProvider<KeycloakIdpClaims>
// Pass it to <AuthProvider> from @ricardoqmd/auth-nextjs (or any future binding)
```

## Configuration options

```ts
createKeycloakProvider({
  config: {
    url: string;          // Keycloak server URL
    realm: string;        // realm name
    clientId: string;     // OAuth client ID
  },
  onLoad?: "login-required" | "check-sso";  // default: "login-required"
  checkLoginIframe?: boolean;                // default: false
  pkceMethod?: "S256";                       // default: "S256"
  silentCheckSsoRedirectUri?: string;
  logoutRedirectUri?: string;
});
```

## Deployment notes

- **Secure context required.** `keycloak-js` uses the Web Crypto API for PKCE
  (`S256`), which browsers expose only in a secure context — HTTPS or
  `localhost`. Served over plain `http://<ip>`, init fails with `INIT_FAILED`
  ("Web Crypto API is not available").
- **Silent check-sso and CSP.** Setting `silentCheckSsoRedirectUri` loads Keycloak
  in a hidden iframe; Keycloak's default `frame-ancestors 'self'` CSP blocks that
  cross-origin until you allow the app's origin (Realm Settings → Security
  Defenses → Content-Security-Policy). Redirect-based flows (`login-required`, or
  `check-sso` without `silentCheckSsoRedirectUri`) avoid the iframe entirely.

## IDP-specific role checks

For realm roles (universal across IDPs), use `hasRole()` from your framework binding:

```tsx
const { hasRole } = useAuth();
if (hasRole("admin")) { /* ... */ }
```

For Keycloak's client-level (resource) roles, use the standalone utility from this package:

```tsx
import { hasResourceRole } from "@ricardoqmd/auth-keycloak";
import { useAuth } from "@ricardoqmd/auth-nextjs";
import type { KeycloakIdpClaims } from "@ricardoqmd/auth-keycloak";

function EditButton() {
  const { idpClaims } = useAuth<KeycloakIdpClaims>();

  if (!hasResourceRole(idpClaims, "my-app", "editor")) {
    return null;
  }
  return <button>Edit</button>;
}
```

## Compatibility

| Package version | keycloak-js   | Keycloak server |
| --------------- | ------------- | --------------- |
| 1.x             | >=26.0 <28.0  | >=26.0          |

Since Keycloak 26.2, the `keycloak-js` adapter is released independently from the server and is backwards compatible with all actively supported Keycloak server versions.

## Status

**Stable.** The public API is frozen and follows SemVer from 1.0 onward (see
[ADR-009](https://github.com/ricardoqmd/auth/blob/main/docs/decisions/009-freeze-public-api-for-1.0.md)):
additive changes are non-breaking; removing or renaming an export is a major bump.

## License

MIT © [ricardoqmd](https://github.com/ricardoqmd)
