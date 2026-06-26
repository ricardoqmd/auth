# @ricardoqmd/auth-vue

> Vue 3 client-side bindings for `@ricardoqmd/auth-core`. A `createAuth` plugin and a reactive `useAuth()` composable with RBAC helpers.

## Installation

```bash
npm install @ricardoqmd/auth-core @ricardoqmd/auth-keycloak @ricardoqmd/auth-vue vue keycloak-js xstate
```

> Install `xstate` even though you never import it: `@ricardoqmd/auth-core` and
> `@xstate/vue` declare it as a peer, and a single shared instance must resolve at
> the top level (a duplicate copy would break the actor's reactivity).

> Scope is SPA / client-only (ADR-012). The plugin eagerly initializes the auth
> flow on install, which assumes a browser. It is SSR-ready by construction (one
> actor per app instance, never a module-level singleton) but SSR is not a
> supported target in v0.x.

## Usage

### 1. Create the provider

Create the Keycloak provider **outside** the plugin call so the instance is
created once. The binding is IDP-agnostic — pass any `AuthProvider`.

```ts
// src/auth.ts
import { createKeycloakProvider } from "@ricardoqmd/auth-keycloak";

export const provider = createKeycloakProvider({
  config: {
    url: import.meta.env.VITE_KC_URL,
    realm: import.meta.env.VITE_KC_REALM,
    clientId: import.meta.env.VITE_KC_CLIENT_ID,
  },
  onLoad: "check-sso",
});
```

> `check-sso` boots the app without forcing a login — anonymous users land on
> your UI and sign in on demand. Use `login-required` instead to redirect
> straight to Keycloak before the app renders.

### 2. Install the plugin

```ts
// src/main.ts
import { createApp } from "vue";
import { createAuth } from "@ricardoqmd/auth-vue";
import App from "./App.vue";
import { provider } from "./auth";

createApp(App).use(createAuth({ provider })).mount("#app");
```

### 3. Use auth state in any component

`useAuth()` returns reactive state. The state values are `ComputedRef`s — read
them with `.value` in `<script setup>`; in the template they are auto-unwrapped,
so you can write `isAuthenticated` directly without `.value`.

```vue
<script setup lang="ts">
import { useAuth } from "@ricardoqmd/auth-vue";
import type { KeycloakIdpClaims } from "@ricardoqmd/auth-keycloak";

const { user, isAuthenticated, logout, hasRole, hasAnyRole } =
  useAuth<KeycloakIdpClaims>();

// In script context, ComputedRefs need .value:
function reportAdmin() {
  console.log("is admin?", hasRole("admin"));
  console.log("authenticated?", isAuthenticated.value);
}
</script>

<template>
  <!-- In templates, refs are auto-unwrapped (no .value): -->
  <p>Welcome, {{ user?.preferred_username }}</p>
  <button v-if="hasRole('admin')">Admin panel</button>
  <button v-if="hasAnyRole(['editor', 'admin'])">Edit</button>
  <button @click="logout">Sign out</button>
</template>
```

`useAuth<TIdpClaims>()` is generic over the IDP claims shape. Pass your adapter's
claims interface (e.g. `KeycloakIdpClaims`) for typed access to `idpClaims`. For
the universal role checks, use `hasRole()` / `hasAnyRole()`; for provider-specific
checks (e.g. Keycloak resource roles), import utilities from your adapter package.

### Sign-in on demand (`check-sso` flows)

When the provider is configured for `check-sso`, the app starts unauthenticated.
Call `login()` from the composable to start the redirect:

```vue
<script setup lang="ts">
import { useAuth } from "@ricardoqmd/auth-vue";

const { isAuthenticated, login, logout } = useAuth();
</script>

<template>
  <button v-if="isAuthenticated" @click="logout">Sign out</button>
  <button v-else @click="login">Sign in</button>
</template>
```

### Gating the app while auth settles

There is no built-in `AuthGate` component in v0.x. Gate at the root with `v-if`
on `isLoading` and `error`, then render your app once auth is settled:

```vue
<script setup lang="ts">
import { useAuth } from "@ricardoqmd/auth-vue";

const { isLoading, error, isAuthenticated } = useAuth();
</script>

<template>
  <p v-if="isLoading">Signing in…</p>
  <p v-else-if="error">Authentication failed: {{ error.message }}</p>
  <RouterView v-else-if="isAuthenticated" />
  <LoginScreen v-else />
</template>
```

### Route guards (imperative)

`useAuth()` is for components — it is reactive and **throws outside `setup()`**.
For code that runs outside the render tree (a vue-router `beforeEach` guard, an
HTTP interceptor), use the value returned by `createAuth(...)`: it is BOTH a Vue
plugin AND an imperative `AuthHandle`. The same object you install with
`app.use()` exposes synchronous accessors.

```ts
// main.ts
import { createApp } from "vue";
import { createAuth } from "@ricardoqmd/auth-vue";
import { router } from "./router";
import App from "./App.vue";
import { provider } from "./auth";

const auth = createAuth({ provider });
const app = createApp(App);
app.use(auth);
app.use(router);

router.beforeEach(async (to) => {
  await auth.whenReady();                 // wait out the first-navigation init race
  if (to.meta.requiresAuth && !auth.isAuthenticated()) return { name: "login" };
  if (to.meta.roles && !auth.hasAnyRole(to.meta.roles as string[])) {
    return { name: "forbidden" };
  }
});

app.mount("#app");
```

`auth.whenReady()` resolves once `init()` settles (authenticated, unauthenticated,
or error), so the first navigation does not race a pending initialization. The
handle also exposes `isAuthenticated()`, `isLoading()`, `getToken()`, `getUser()`,
`getIdpClaims()`, `getError()`, `hasRole()`, `hasAnyRole()`, and `subscribe()`.
Use `useAuth()` in components (reactive); use the handle in guards/interceptors
(imperative).

## API

### `createAuth(options)`

Returns a value that is BOTH a Vue `Plugin` AND an `AuthHandle<TIdpClaims>`.
Install it with `app.use(createAuth({ provider }))`; the same object is usable
imperatively outside components (see [Route guards](#route-guards-imperative)).
Creates one auth actor per call, starts it, sends `INIT`, and provides it
app-wide.

| Option | Type | Description |
|---|---|---|
| `provider` | `AuthProvider<TIdpClaims>` | Adapter instance from `createKeycloakProvider()` (or any IDP adapter). Create it once, outside the plugin call. |

### `useAuth<TIdpClaims>()`

Must be called in `setup()` of a component whose app installed `createAuth()`.
Throws otherwise. Returns an `AuthState<TIdpClaims>`:

| Field | Type | Description |
|---|---|---|
| `isLoading` | `ComputedRef<boolean>` | True during `initializing` or `loggingOut` |
| `isAuthenticated` | `ComputedRef<boolean>` | True when the machine is in the `authenticated` state |
| `token` | `ComputedRef<string \| null>` | Raw JWT access token |
| `user` | `ComputedRef<AuthUserClaims \| null>` | Decoded standard OIDC claims (`preferred_username`, `email`, `name`, `sub`, `roles`, …) |
| `idpClaims` | `ComputedRef<TIdpClaims \| null>` | IDP-specific token claims; pass your IDP's claims interface to `useAuth<T>()` |
| `error` | `ComputedRef<AuthError \| null>` | Structured error set in the `error` state; branch on `error.code` |
| `login` | `() => void` | Starts the login redirect (useful with `check-sso`) |
| `logout` | `() => void` | Triggers the logout flow |
| `hasRole` | `(role: string) => boolean` | True if `user.roles` includes `role` |
| `hasAnyRole` | `(roles: string[]) => boolean` | True if the user has at least one of the given roles |

## Handling errors

`error` is a structured `AuthError` from `@ricardoqmd/auth-core`, not a plain
`Error`. Branch on `error.code` to drive UX. `code` is one of `INIT_FAILED`,
`REFRESH_FAILED`, `TOKEN_EXPIRED`, or `NETWORK_ERROR`. New codes may be added
over time, so always handle `default`. (`TOKEN_EXPIRED` is reserved and not
currently emitted by `auth-keycloak` — a dead refresh token rejects as
`REFRESH_FAILED`; see ADR-009.)

## Status

**Pre-1.0.** The public API mirrors `@ricardoqmd/auth-nextjs` and shares the
`@ricardoqmd/auth-core` contract.

`@ricardoqmd/auth-vue` is `0.x` and versions **independently** from
`@ricardoqmd/auth-core` and `@ricardoqmd/auth-keycloak` (ADR-013): its version
does not track theirs, and the API is not frozen until `1.0`.

## License

MIT © [ricardoqmd](https://github.com/ricardoqmd)
