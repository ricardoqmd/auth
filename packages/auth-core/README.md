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
- **Public types** — `AuthState`, `AuthTokens`, `AuthInitResult`, `AuthUserClaims`, `LogoutOptions`.

## IDP-agnostic by design

The core exposes a `user.roles: string[]` field that is the universal contract across all identity providers (Keycloak, Entra ID, Cognito, Auth0, …). Each adapter is responsible for mapping its IDP-specific claims into this universal shape.

For IDP-specific data (Keycloak's `resource_access`, for example), the core exposes a generic `idpClaims<TIdpClaims>` that adapters populate. Consumers opt in to typed access by passing their IDP claims interface to bindings like `useAuth<KeycloakIdpClaims>()`.

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

**Pre-1.0** — Public API approaching stability. Reserve 1.0.0 expectations until announced.

## License

MIT © [ricardoqmd](https://github.com/ricardoqmd)
