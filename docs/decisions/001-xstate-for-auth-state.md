# ADR-001: XState v5 for authentication state management

**Date:** 2026-05-02  
**Status:** Accepted

## Context

The authentication lifecycle has inherent complexity that goes beyond a simple boolean flag. A real auth flow involves:

- Async initialization with a 30-second timeout window
- A compound "authenticated" state with an active sub-state and a concurrent token-refresh sub-state
- Race conditions between refresh attempts and logout events
- Error states that must be reachable from multiple paths (init failure, refresh failure, network timeout)
- Clear lifecycle: `idle → initializing → authenticated | unauthenticated → loggingOut`

Managing this with `useState` or `useReducer` would require careful boolean flag combinations (`isLoading && !isError && !isAuthenticated`), which are error-prone and make invalid states representable.

## Decision

Use **XState v5** (`setup().createMachine()` pattern) as the state management layer in `auth-core`.

The machine lives in a framework-agnostic package and is consumed by framework bindings via `useMachine()` from the corresponding XState React adapter.

## Alternatives considered

**`useState` / `useReducer` in React**  
Rejected. Ties the state logic to React, preventing reuse in other frameworks. More importantly, boolean flags can represent invalid combinations (e.g., `isLoading: true` and `isAuthenticated: true` simultaneously), which a state machine makes impossible by construction.

**Zustand**  
Rejected. A state store does not enforce valid transitions — any code can write any field at any time. The auth flow needs the guarantee that, for example, `LOGOUT` is only accepted from the `authenticated` state.

**Jotai / Valtio**  
Rejected for the same reason as Zustand. Atomic state libraries are not designed to model sequential async flows with timeout branches.

**Redux Toolkit with async thunks**  
Rejected. The boilerplate-to-value ratio is poor for a single async workflow. XState's `fromPromise` actor handles the same async lifecycle more declaratively and with built-in timeout support via `after`.

## Consequences

**Positive:**
- Invalid states are impossible by construction — the machine only accepts events valid for the current state.
- Compound states (`authenticated.active`, `authenticated.refreshing`) model the real system accurately without additional flags.
- The `after` delay mechanism handles the proactive token refresh timer and operation timeouts without manual `setTimeout` management.
- The machine is framework-agnostic, which directly enables the hexagonal architecture (see ADR-002).
- Testing is straightforward: create an actor, send events, assert state — no React required.

**Negative:**
- XState v5 has a learning curve. Contributors unfamiliar with state machines will need to read the documentation before making changes to `machine.ts`.
- Adds `xstate` as a direct dependency of `auth-core` and `@xstate/react` as a dependency of `auth-nextjs`.
