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

## Toward v1.0.0 — Stable API contract

The 1.0 criteria are recorded in [ADR-006](./docs/decisions/006-harden-before-expand.md).
Status after v0.3.0:

- [x] ~80% test coverage — at ~83%.
- [ ] **Public API frozen.** Surface reviewed and hardened in
  [ADR-008](./docs/decisions/008-public-api-surface-for-1.0.md). Remaining: cover
  the public methods still lacking tests (`logout`, `hasRole`, `hasAnyRole`), do a
  final no-accidental-exports pass, then declare the freeze in its own ADR.
- [ ] **Complete documentation.** Polish the per-package READMEs and add a
  quickstart; turn the demo app into a reference implementation showing
  `login()`, public/protected routes (a consumer-side route guard), and
  structured-error handling.
- [ ] **At least one real consumer in production** (platform-react / the RH
  system). External gate — paced by those projects, not by this repo. The demo
  de-risks the integration but does not satisfy this criterion.
- [ ] **Performance budget.** ADR-006 says "benchmarks"; for a frontend library a
  bundle-size budget (e.g. `size-limit` in CI) plus documented init/refresh
  characteristics likely fits better — revisit ADR-006's wording.

## Post-1.0 — Expansion, demand-driven

Built only when a concrete consumer needs them — not on a fixed schedule.

- [ ] `@ricardoqmd/auth-nextjs-ssr` — SSR support: middleware factory using `jose` for JWKS validation; Server Component / Route Handler helpers.
- [ ] `@ricardoqmd/auth-vue` — Vue 3 bindings.
- [ ] Additional IDP adapters: Entra ID, Cognito, Auth0.
