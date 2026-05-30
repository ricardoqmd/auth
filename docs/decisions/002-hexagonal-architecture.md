# ADR-002: Hexagonal architecture — three separate packages

**Date:** 2026-05-02  
**Status:** Accepted

## Context

The initial goal was to ship a reusable auth setup for Next.js + Keycloak. The straightforward approach would be a single package that bundles the state machine, the Keycloak SDK, and the React components together.

However, looking ahead: different projects may use different frameworks (Vue, SvelteKit, plain React without Next.js), and different organizations may use different identity providers (Entra ID, Cognito, Auth0). If the IDP and framework are hard-coded into a single package, every such variation requires a new package from scratch.

## Decision

Split the system into three packages following the **Ports & Adapters** (hexagonal) pattern:

```
auth-core        ← defines the port (AuthProvider<T> interface) + XState machine
auth-keycloak    ← implements the port for Keycloak via keycloak-js
auth-nextjs      ← consumes the port via React/Next.js bindings
```

`auth-core` has zero runtime dependencies on any framework or IDP. It defines the contract; it does not implement it. `auth-keycloak` and `auth-nextjs` depend on `auth-core` but are independent of each other.

## Alternatives considered

**Single package (`@ricardoqmd/auth`)**  
Rejected. Bundles Keycloak and React into a single installable unit, making it impossible to swap either without replacing the whole package. Consumers are forced to take a transitive dependency on `keycloak-js` even if they build their own adapter.

**Two packages: `auth-core` + `auth-keycloak-next`**  
Rejected. Merging the adapter and the framework binding prevents reusing the Keycloak adapter with a different framework binding (e.g., a future Vue binding would need to re-implement or fork the Keycloak integration).

**Two packages: `auth-core` + `auth-nextjs` (adapter inside nextjs)**  
Rejected. Same problem from the other direction — a future Entra ID adapter would need to copy the React binding code.

## Consequences

**Positive:**
- Swapping the IDP adapter (Keycloak → Cognito) does not touch the framework binding.
- Swapping the framework binding (Next.js → Vue) does not touch the IDP adapter.
- `auth-core` is testable with zero DOM or browser setup (`environment: "node"` in Vitest).
- Each package can version and publish independently with different changelogs.

**Negative:**
- Consumers must install three packages (plus `keycloak-js` as a peer dependency) instead of one. The quick-start installation is slightly more verbose.
- More complex monorepo management: workspace protocol, build ordering, TypeScript project references.
