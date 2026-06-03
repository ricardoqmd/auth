# ADR-011: Floor the proactive token-refresh interval

**Date:** 2026-06-02  
**Status:** Accepted

## Context

The state machine refreshes proactively at `expiresAt - now - PROACTIVE_REFRESH_BUFFER_MS`
(30s), clamped to `>= 0`. When a token's remaining lifetime is **shorter than the
buffer**, the delay computes to `0`: the machine refreshes, gets another
short-lived token, reschedules at `0`, refreshes again — a hot-loop of
*successful* token requests until the session actually ends (then `REFRESH_FAILED`).

This happens in two real situations:

- **Near the IdP session's max lifetime.** Keycloak caps each new access token's
  expiry to the session end, so in the final stretch the tokens come back with
  less than the buffer of life left.
- **Short access-token lifespans.** If the lifespan is `<= 30s` (plausible in
  hardened gov/health setups), the delay is permanently `0`.

Surfaced by a real session-termination test (SSO Session Max = 2 min, access-token
lifespan = 1 min): the Network tab showed a burst of refreshes returning normal
tokens, then the final `invalid_grant: Session not active`.

## Decision

Floor the refresh interval at `MIN_REFRESH_DELAY_MS` (10s): refresh
`PROACTIVE_REFRESH_BUFFER_MS` before expiry, but never more often than the floor.
The computation is extracted into a pure `computeRefreshDelay(expiresAt, now)`
(exported from `machine.ts` for unit tests; **not** re-exported from the package
barrel — internal, so the 1.0 public surface frozen in ADR-009 is untouched).

## Alternatives considered

- **Refresh at expiry when the buffer can't be honored** (`proactive>0 ? proactive : remaining`).
  Self-tunes to the token's life, but does **not** bound the worst case
  (sub-second lifespans still hammer), and because this library has **no reactive
  refresh**, refreshing *at* expiry risks brief token lapses → sporadic 401s the
  consumer must handle alone.
- **Detect that the expiry no longer advances and stop refreshing.** Attacks the
  root, but stopping entirely means nothing detects that the session died (no
  reactive path); to keep that, you must re-add a refresh at expiry, collapsing
  into the option above with more state (remembering the previous `expiresAt` plus
  a skew tolerance).
- **Reactive refresh (renew on 401) instead of a timer.** Removes the proactive
  loop at the root, but it is a different architecture that needs new public
  surface (a consumer interceptor/callback) → would break the ADR-009 freeze.
  Deferred to post-1.0, on demand.

The floor was chosen because **bounding the request rate is the priority**, and
keeping the token always-fresh (refresh early, rate-capped) is more robust for a
proactive-only library than refreshing-at-expiry-with-lapse.

## Consequences

- (+) No hot-loop in any configuration; tokens stay fresh down to ~10s lifespans.
- (+) The delay logic is now a pure, directly-tested function.
- (−) For sub-floor lifespans (extreme configs), the token may lapse a few seconds
  before the next refresh — only relevant in pathological setups and in the dying
  seconds of a session. `MIN_REFRESH_DELAY_MS` is a tunable constant.
- Internal change only: the public API (frozen in ADR-009) is unaffected.

## Revisit if

- A reactive (on-401) refresh is added post-1.0 — the two would coexist
  (proactive-with-floor as the baseline, reactive as a safety net), not replace
  each other.
- Real usage shows the 10s floor is wrong for common deployments.
