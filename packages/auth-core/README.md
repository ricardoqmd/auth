# @ricardoqmd/auth-core

> Framework-agnostic authentication primitives — the brain of `@ricardoqmd/auth-*`.

This package contains the [XState](https://stately.ai/docs/xstate) state machine and TypeScript contracts that drive authentication flows. It has **zero runtime dependencies on React, Next.js, or any specific identity provider**.

Pair it with an adapter (e.g. [`@ricardoqmd/auth-keycloak`](https://www.npmjs.com/package/@ricardoqmd/auth-keycloak)) and a framework binding (e.g. [`@ricardoqmd/auth-nextjs`](https://www.npmjs.com/package/@ricardoqmd/auth-nextjs)).

## Install

```bash
npm install @ricardoqmd/auth-core
```

Most consumers will not install `auth-core` directly — it comes as a transitive dependency through bindings like `@ricardoqmd/auth-nextjs`. Install it explicitly only if you are building your own adapter or framework binding.

## What's in the box

- **State machine** (`createAuthMachine`) that owns the lifecycle: `idle → initializing → authenticated | unauthenticated → loggingOut → ...`
- **`AuthProvider<TIdpClaims>` contract** — the interface every IDP adapter implements.
- **Public types** — `AuthTokens`, `AuthUserClaims`, `AuthInitResult`, `LogoutOptions`, and the structured `AuthError`.

## IDP-agnostic by design

The core exposes a `user.roles: string[]` field that is the universal contract across all identity providers (Keycloak, Entra ID, Cognito, Auth0, …). Each adapter is responsible for mapping its IDP-specific claims into this universal shape.

For IDP-specific data (Keycloak's `resource_access`, for example), the core exposes a generic `idpClaims<TIdpClaims>` that adapters populate. Consumers opt in to typed access by passing their IDP claims interface to bindings like `useAuth<KeycloakIdpClaims>()`.

## Error contract

Auth failures surface as a structured `AuthError`, not a plain `Error`, so
consumers branch on a stable code instead of parsing messages:

```ts
import type { AuthError } from "@ricardoqmd/auth-core";

interface AuthError {
  code: "INIT_FAILED" | "REFRESH_FAILED" | "TOKEN_EXPIRED" | "NETWORK_ERROR";
  message: string;
}
```

Bindings expose it directly — e.g. `useAuth().error` and `errorComponent` in
`@ricardoqmd/auth-nextjs`. New codes may be added over time, so always handle a
`default` branch. (`TOKEN_EXPIRED` is reserved and not currently emitted by
`auth-keycloak`; see ADR-009.)

## Typical consumer code

You will almost never call `auth-core` APIs directly. The typical pattern is:

```tsx
// Through @ricardoqmd/auth-nextjs
import { useAuth } from "@ricardoqmd/auth-nextjs";
import type { KeycloakIdpClaims } from "@ricardoqmd/auth-keycloak";

const { user, hasRole, idpClaims } = useAuth<KeycloakIdpClaims>();
```

`auth-core` is the layer that sits underneath, owning state transitions and contracts.

## Building your own adapter

If you need to support an identity provider that does not yet have an official adapter, implement the `AuthProvider<TIdpClaims>` contract:

```ts
import type { AuthProvider, AuthInitResult } from "@ricardoqmd/auth-core";

interface MyIdpClaims {
  // your IDP-specific token claims
}

export function createMyIdpProvider(config: MyConfig): AuthProvider<MyIdpClaims> {
  return {
    async init(): Promise<AuthInitResult<MyIdpClaims>> {
      // initialize your IDP SDK, return tokens + user + idpClaims
    },
    login() { /* ... */ },
    logout(options) { /* ... */ },
    async refreshToken() { /* ... */ },
  };
}
```

## Status

**Stable.** The public API is frozen and follows SemVer from 1.0 onward (see
[ADR-009](https://github.com/ricardoqmd/auth/blob/main/docs/decisions/009-freeze-public-api-for-1.0.md)):
additive changes are non-breaking; removing or renaming an export, or adding a
method to the `AuthProvider` port, is a major bump.

## License

MIT © [ricardoqmd](https://github.com/ricardoqmd)
