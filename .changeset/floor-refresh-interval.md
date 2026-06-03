---
"@ricardoqmd/auth-core": patch
---

Floor the proactive token-refresh interval so it can't hot-loop. When a token's
remaining lifetime is shorter than the refresh buffer — near the IdP session's
max lifetime (tokens are capped to the session end) or with very short
access-token lifespans — the scheduler previously recomputed a 0ms delay and
re-refreshed on every round trip, hammering the token endpoint. Refresh now polls
no more often than a 10s floor. Internal change; public API unchanged. See ADR-011.
