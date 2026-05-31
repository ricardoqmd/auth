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

## v0.3.0 — Hardening + API surface review (next)
- [ ] Instrument quality: vitest LCOV coverage + SonarQube Cloud on CI, with a Clean-as-You-Code quality gate (ADR-007).
- [ ] Raise test coverage to ~70%.
  - [ ] `@xstate/test` coverage on the auth state machine.
  - [ ] Edge cases: token-refresh races, network errors, Keycloak unavailable.
  - [ ] (optional) Playwright E2E against Dockerized Keycloak.
- [ ] Public API surface review: mark internals `@internal`; decide what is public before it is frozen.
- [ ] Settle the supported Node baseline: `engines` and CONTRIBUTING document `>=18.18`, but CI runs Node 20 only. Either add an `18 / 20 / 22` CI matrix or raise the documented floor to 20.
- [ ] De-hardcode the version label in package READMEs (`**0.2.x**` → `**Pre-1.0**`) so it stops going stale on every release.

## v1.0.0 — Stable API contract

- [ ] ~80% test coverage.
- [ ] Public API frozen for backward-compatibility commitments.
- [ ] Complete documentation (candidate: a dedicated docs site).
- [ ] At least one real consumer in production (platform-react / the RH system).
- [ ] Performance benchmarks.

## Post-1.0 — Expansion, demand-driven

Built only when a concrete consumer needs them — not on a fixed schedule.

- [ ] `@ricardoqmd/auth-nextjs-ssr` — SSR support: middleware factory using `jose` for JWKS validation; Server Component / Route Handler helpers.
- [ ] `@ricardoqmd/auth-vue` — Vue 3 bindings.
- [ ] Additional IDP adapters: Entra ID, Cognito, Auth0.
