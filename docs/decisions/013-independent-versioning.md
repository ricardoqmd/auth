# ADR-013: Independent per-package versioning; `auth-core` as a peer dependency

**Date:** 2026-06-10  
**Status:** Accepted

## Context

Until 1.0.0, the three packages (`auth-core`, `auth-keycloak`, `auth-nextjs`) were
versioned as a group — a Changesets `linked` group, so they bumped together. With
a second framework binding arriving (`auth-vue`, ADR-012) and additional IdP
adapters on the post-1.0 horizon (Cognito, Entra), lockstep starts to hurt: a
Vue-only change would bump `auth-nextjs` for no reason, polluting its changelog and
forcing phantom upgrades on its consumers. The real coupling is not
binding↔binding or adapter↔adapter; it is **each package ↔ the version of the
`auth-core` contract** it targets.

At the time of this decision, `auth-core` was a regular `dependency`
(`workspace:*`) of both `auth-keycloak` and `auth-nextjs`.

## Decision

**Each package versions independently.** Dissolve the Changesets `linked` group;
there is no unified monorepo version number.

**`auth-core` is a `peerDependency`** of adapters and bindings (declared as a peer
range, e.g. `auth-core@^1.0.0`, plus a `workspace:*` dev-dependency for the local
link). Contract coupling is expressed only through that peer range. A package bumps
for changes to **its own** API/behavior, not automatically because a dependency
bumped. Adopting a **new major of `auth-core`** (moving the peer from `^1` to `^2`)
is, by convention, a major of the adopting package — but each does so on its own
schedule, not in lockstep. Invariant for the consumer: all their `@ricardoqmd/*`
packages must agree on the same `auth-core` major (the peer range enforces it);
within a major, packages float freely.

`auth-core` as a peer guarantees a **single contract in the runtime** — one
`auth-core` in the consumer's tree, so the Keycloak provider and the Vue/React
`useAuth()` speak the same types, with no risk of a duplicated, mismatched
contract.

### Sequencing of the peer move

The dependency→peer move changes the install contract (the consumer must install
`auth-core` themselves; package managers flag an unmet peer), so on already-published
1.0.0 packages it is strictly a breaking change. Mitigations: the install
instructions already list `auth-core` explicitly, and there are no real external
consumers yet. Chosen path: **`auth-vue` is born with `auth-core` as a peer;
`auth-keycloak` and `auth-nextjs` keep it as a `dependency` and migrate to a peer
on their next release** — no forced bump now. The `linked`-group dissolution is
done immediately (config only, no version impact).

## Alternatives considered

- **Keep the `linked`/`fixed` lockstep.** Simple mental model and a unified number,
  but with two bindings it produces unnecessary bumps and does not scale to
  Cognito/Angular. Rejected.
- **Release only the bindings independently, keep `auth-core` + `auth-keycloak`
  grouped.** Inconsistent: `auth-keycloak` is an adapter on the IdP axis and a
  future Cognito adapter would be its sibling — you would not want them in
  lockstep. Rejected for asymmetry.
- **`auth-core` as a regular `dependency` instead of a peer.** Allows independence
  but risks multiple copies of `auth-core` in the tree → a duplicated contract and
  runtime type mismatch. Rejected.

## Consequences

**Positive:**

- Each package evolves at its own pace; clean per-package releases and changelogs.
  (Realized: `auth-vue@0.1.0` was published as the first release under the
  dissolved group — only `auth-vue` bumped; `auth-core`/`auth-keycloak`/`auth-nextjs`
  stayed put.)
- A single `auth-core` in the consumer's tree; a consistent contract at runtime.
- Scales naturally to new bindings/adapters without rethinking versioning.

**Negative:**

- A policy change over packages already published at 1.0.0 (no API break, but it
  must be communicated: consumers no longer see a unified number).
- A consumer cannot mix contract majors (`auth-vue@1`/`core@^1` +
  `auth-keycloak@2`/`core@^2` is incompatible); crossing an `auth-core` major moves
  the whole set — the flip side of the guarantee.
- The previous `auth-core` line (e.g. 1.x) must be kept alive for a while if a
  binding is slow to adopt the next major.

## Revisit if

- The overhead of coordinating peer ranges across many packages outweighs the
  benefit of independence (unlikely at the current size).
- A strong reason to return to a unified number appears (e.g. distribution as a
  meta-package).
