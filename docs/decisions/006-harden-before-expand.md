# ADR-006: Harden before expand — v0.3.0 stabilizes, SSR/adapters are post-1.0

**Date:** 2026-05-30  
**Status:** Accepted

## Context

Two conflicting roadmaps coexisted. `docs/PROGRESS.md` listed v0.3.0 as SSR
support (a new `auth-nextjs-ssr` package), while the root `README.md` and the
project context listed v0.3.0 as test-coverage and public-API-surface work. The
plan had shifted more than once — at one point `auth-entra` was considered for
v0.3.0. The sequence from here to a 1.0 release needs to be fixed in a single
place.

## Decision

Prioritize hardening over expansion.

1. **v0.3.0 — stabilization.** Raise test coverage to ~70% (including
   token-refresh races, network errors, Keycloak-unavailable paths, and
   `@xstate/test` on the state machine) and review the public API surface,
   marking internals `@internal` before anything is frozen.

2. **v1.0.0 — stable contract.** ~80% coverage, public API frozen, complete
   documentation, and at least one real consumer in production.

3. **Post-1.0, demand-driven.** SSR (`auth-nextjs-ssr`), Vue bindings, and
   additional IDP adapters (Entra ID, Cognito, Auth0) are built only when a
   concrete consumer needs them.

The single source of truth for the roadmap is `ROADMAP.md`; `docs/PROGRESS.md`
is the chronological log only.

## Alternatives considered

**SSR support in v0.3.0 (the previous `PROGRESS.md` plan)**  
Rejected. Expanding the surface before stabilizing what already exists
contradicts "stable over comprehensive." Freezing a public API at 1.0 without
hardening it first risks breaking consumers. The team's adoption criteria —
"what concrete problem does it solve today? who is asking for it?" — are not yet
answered for SSR.

**Leave both roadmaps as-is**  
Rejected. Two divergent roadmaps guarantee drift and confusion about what the
next release actually contains.

## Consequences

**Positive:**

- A shorter, safer path to 1.0; the public surface becomes intentional rather
  than accidental.
- A real consumer (platform-react / the RH system) validates the API under real
  use before any 1.0 backward-compatibility commitments.
- The roadmap lives in one place; `PROGRESS.md` is purely historical.

**Negative:**

- SSR and Vue wait. If concrete, urgent SSR demand appears before 1.0, this
  decision (and this ADR) must be revisited.
