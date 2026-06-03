# ADR-010: Refine the 1.0 consumer gate to a real-infrastructure deployment test

**Date:** 2026-06-02  
**Status:** Accepted

## Context

ADR-006 set "at least one real consumer in production" as a 1.0 prerequisite — a
proxy for "the public API has survived real, integrated use, so we can commit to
it under SemVer." After freezing the surface (ADR-009) and verifying it against
real Keycloak (18 and 26) in a local spike, the open question was whether a full
production rollout (e.g. RH) was actually required, or whether a deployed
reference app exercising the whole surface against real infrastructure gives
equivalent evidence without an open-ended wait.

To answer it, the reference demo was deployed on real infrastructure: a VM behind
the organization's firewall (Fortinet) and DNS, served over **HTTPS** on an org
domain, **cross-origin** to Keycloak, and calling a real backend **through the
API Gateway**.

## Decision

Refine ADR-006's consumer criterion. The 1.0 consumer gate is met by a
real-infrastructure deployment of the reference app that — cross-origin to
Keycloak, over HTTPS — demonstrates:

1. Loads over HTTPS on a real domain, cross-origin to Keycloak, behind the
   firewall/DNS.
2. Login and logout.
3. Identity and role helpers (`hasRole` / `hasAnyRole` / `hasResourceRole`)
   against real token claims.
4. A backend call through the API Gateway with the bearer token, where the
   gateway validates the token and coarse RBAC (realm role).
5. Reload mid-session on a protected route without a redirect loop.
6. Proactive token refresh over the real access-token lifespan.

This replaces the vague "consumer in production" with a concrete, verifiable bar.

**This bar is now met.** Results from the deployment:

- HTTPS load on the org domain, cross-origin to Keycloak, behind Fortinet/DNS — ✓
- Login / logout — ✓
- Identity + `hasRole` / `hasAnyRole` / `hasResourceRole` on real claims — ✓
- Backend call through the API Gateway; gateway validated the token and the realm
  role — ✓
- Reload on the protected route — ✓
- Proactive refresh over the real 5-minute access-token lifespan — ✓
- Error states (forced) deferred in this deployment; the reachable codes
  (`INIT_FAILED`, `NETWORK_ERROR`, `REFRESH_FAILED`) were already verified live in
  prior testing — `INIT_FAILED` again during this deployment's secure-context
  probe — and all four mappings are unit-tested. Re-forcing them against the
  production Keycloak adds risk without new information.

Tagging 1.0 is therefore unblocked.

## Rationale

A deployed reference exercising the full public surface against real
infrastructure (HTTPS, cross-origin, real gateway + RBAC, real refresh timing)
provides the durability and integration evidence ADR-006 wanted. A full
production rollout would not yield additional signal *about the API itself*; the
API risk is already retired. The deployment also surfaced deployment-level
requirements that are documentation concerns, not API issues:

- keycloak-js requires a **secure context** (HTTPS or localhost) for the Web
  Crypto API used by PKCE; plain `http://<ip>` fails with `INIT_FAILED`.
- Keycloak's `frame-ancestors` CSP blocks the **silent check-sso iframe** from a
  different origin; redirect-based flows (`login-required`, or `check-sso`
  without `silentCheckSsoRedirectUri`) avoid it entirely.

These are captured in the demo docs and a gating recommendation, separate from
this decision.

## Alternatives considered

- **Hold 1.0 for a full production consumer (RH).** Open-ended wait that yields no
  additional signal about the API; the integration risk is already retired by
  this deployment. Rejected.
- **Tag 1.0 off the local spike alone.** Rejected earlier (this ADR's premise):
  the spike never exercised cross-origin, HTTPS, the gateway/RBAC, or real refresh
  timing — exactly what this deployment did.

## Consequences

- (+) 1.0 is unblocked with concrete, reproducible evidence rather than a vague
  milestone.
- (+) A reusable acceptance bar for future major validations.
- (−) The bar is a reference deployment, not a long-term multi-user production
  soak; that residual risk is accepted and mitigated by the frozen API (post-1.0,
  additive changes are non-breaking; a forced breaking change would be a
  deliberate 2.0).

## Revisit if

- A later production consumer surfaces a needed breaking change (would force a
  deliberate major bump).
- The deployment-level findings (secure context, silent-iframe CSP) warrant
  changing the demo's **default** flow to redirect-based.

## Relationship to ADR-006

Refines ADR-006's "≥1 real consumer in production" criterion; the rest of ADR-006
(hardening sequence, the other 1.0 prerequisites) stands.
