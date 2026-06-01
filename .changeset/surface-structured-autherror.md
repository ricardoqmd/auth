---
"@ricardoqmd/auth-core": minor
"@ricardoqmd/auth-nextjs": minor
---

Surface the structured `AuthError` to consumers and hide machine internals.

`useAuth().error` and the `AuthProvider` `errorComponent` prop now expose the
structured `AuthError` (`{ code, message }`) instead of a flattened `Error`, so
consumers can branch on `error.code` (`TOKEN_EXPIRED`, `NETWORK_ERROR`,
`INIT_FAILED`, `REFRESH_FAILED`) to drive UX. The machine-internal types
`AuthContext` and `AuthEvent` are no longer exported from `@ricardoqmd/auth-core`
(marked `@internal`); `AuthError`, `AuthTokens`, `AuthUserClaims`, and the
`AuthProvider` port remain the public, framework-agnostic contract.

BREAKING CHANGE (pre-1.0, lands in MINOR per the repo convention): the type of
`AuthState.error` and of `errorComponent`'s argument changes from `Error` to
`AuthError`; `AuthContext` and `AuthEvent` are no longer public exports.
