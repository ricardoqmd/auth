# Architecture Decision Records

Significant architectural decisions for this project are recorded here using the [ADR format](https://adr.github.io/). Each record captures the context, the decision made, the alternatives considered, and the consequences.

| # | Title | Date | Status |
|---|---|---|---|
| [ADR-001](./001-xstate-for-auth-state.md) | XState v5 for authentication state management | 2026-05-02 | Accepted |
| [ADR-002](./002-hexagonal-architecture.md) | Hexagonal architecture — three separate packages | 2026-05-02 | Accepted |
| [ADR-003](./003-promise-idempotency-guard.md) | Promise-based idempotency guard for `init()` | 2026-05-06 | Accepted |
| [ADR-004](./004-idp-agnostic-generic-claims.md) | IDP-agnostic design with generic `idpClaims<TIdpClaims>` | 2026-05-28 | Accepted |
| [ADR-005](./005-hasresourcerole-as-standalone-utility.md) | `hasResourceRole` as a standalone utility in `auth-keycloak` | 2026-05-28 | Accepted |

## Statuses

- **Accepted** — in effect, reflected in the current codebase.
- **Deprecated** — superseded by a newer decision; kept for historical context.
- **Superseded by ADR-XXX** — replaced; the newer ADR explains why.
