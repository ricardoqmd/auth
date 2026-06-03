# Roadmap

The guiding principle is **stable over comprehensive**: harden the existing
surface before adding new packages. The rationale for this sequencing is recorded
in [ADR-006](./docs/decisions/006-harden-before-expand.md).

The chronological history of shipped work lives in
[`docs/PROGRESS.md`](./docs/PROGRESS.md).

## Shipped

- [x] **v0.1.0** — first publishable version: redirect-on-boot, `useAuth`, RBAC helpers, working demo against local Keycloak. (2026-05-07)
- [x] **v0.2.0** — IDP-agnostic refactor: generic `idpClaims<T>`, universal `user.roles[]`, `hasResourceRole` moved to the adapter package. Tests + GitHub Actions CI. (2026-05-29)
- [x] **v0.2.1** — documentation: package READMEs refreshed on npm, decision records and community-health files added. (2026-05-30)
- [x] **v0.3.0** — hardening + API surface review: coverage ~83% via direct behavior tests on the machine and adapter; structured `AuthError` surfaced to consumers and machine internals (`AuthContext`/`AuthEvent`) hidden (ADR-008); `useAuth().login()` added; SonarQube Cloud quality gate (ADR-007); Node 20/22 CI matrix; de-hardcoded version labels. (2026-06-01)
- [x] **v1.0.0** — stable API contract: public surface frozen (ADR-009), validated end-to-end on real infrastructure (ADR-010), package READMEs completed (`login()` + structured `AuthError`), and the proactive-refresh interval floored against hot-looping (ADR-011). (2026-06-02)

## v1.0.0 criteria (met)

The 1.0 criteria from [ADR-006](./docs/decisions/006-harden-before-expand.md):

- [x] ~80% test coverage — at ~83%.
- [x] **Public API frozen** — surface reviewed (ADR-008) and frozen in
  [ADR-009](./docs/decisions/009-freeze-public-api-for-1.0.md).
- [x] **Complete documentation** — per-package READMEs cover `login()` and the
  structured `AuthError`; the demo is a reference implementation (public/protected
  routes, a consumer-side route guard, structured-error handling).
- [x] **Validated against a real consumer** — re-scoped from "consumer in
  production" to a real-infrastructure deployment test in
  [ADR-010](./docs/decisions/010-refine-1.0-consumer-gate.md).

## Post-1.0 — Expansion, demand-driven

Built only when a concrete consumer needs them — not on a fixed schedule.

- [ ] **Performance / bundle-size budget** (e.g. `size-limit` in CI) — deferred
  from the 1.0 gate; a CI nice-to-have, not an API or correctness concern.
- [ ] **Reactive token refresh** (renew on 401) — complements the proactive,
  rate-floored refresh (ADR-011); needs new public surface, so it waits for real
  demand.
- [ ] `@ricardoqmd/auth-nextjs-ssr` — SSR support: middleware factory using `jose` for JWKS validation; Server Component / Route Handler helpers.
- [ ] `@ricardoqmd/auth-vue` — Vue 3 bindings.
- [ ] Additional IDP adapters: Entra ID, Cognito, Auth0.
