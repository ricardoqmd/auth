---
"@ricardoqmd/auth-nextjs": minor
---

Expose `login()` from `useAuth()`.

`useAuth()` now returns a `login()` method (symmetric to `logout()`) that triggers
the IDP login flow. This lets consumers drive authentication on demand — public
routes / `check-sso` setups where the app starts unauthenticated and logs in via
a sign-in button or a consumer-defined route guard — instead of relying solely on
`onLoad: 'login-required'`. Additive: no existing behavior changes.
