# ADR-003: Promise-based idempotency guard for `init()`

**Date:** 2026-05-06  
**Status:** Accepted

## Context

`keycloak-js` enforces a hard constraint: `kc.init()` can only be called once per `Keycloak` instance. A second call throws:

```
A 'Keycloak' instance can only be initialized once.
```

React 18 introduced Strict Mode behavior where every component is intentionally mounted, unmounted, and remounted in development. This means `useEffect` (where the `INIT` event is dispatched) fires twice in quick succession on every component mount during development.

The first implementation used a boolean flag:

```typescript
let initialized = false;

init() {
  if (initialized) return /* cached result */;
  initialized = true;
  return kc.init({ ... });
}
```

This caused the runtime crash in production-equivalent flows: the second mount arrived while the first `kc.init()` was still awaiting the Keycloak server response. At that moment `initialized` was still `false` (it's set *after* the `await`), so both calls proceeded into `kc.init()` — triggering the error.

## Decision

Cache the **in-flight Promise** itself rather than a boolean flag:

```typescript
let initPromise: Promise<AuthInitResult> | null = null;

init(): Promise<AuthInitResult> {
  if (initPromise !== null) return initPromise;   // ← join the in-flight call
  initPromise = (async () => {
    const authenticated = await kc.init({ ... }); // ← only ever called once
    // ... build and return AuthInitResult
  })();
  return initPromise;
}
```

The Promise reference is assigned **synchronously**, before the first `await`. Any concurrent or subsequent call sees a non-null `initPromise` and returns the same Promise, joining the original call rather than starting a new one.

## Alternatives considered

**Boolean flag set before `await`**  
Would work for the idempotency problem but breaks the return value contract: subsequent callers get `undefined` instead of the `AuthInitResult`. Each caller needs the init result to populate the machine context.

**Boolean flag + stored result**  
Would require storing the result separately and handling the window between "flag set" and "result stored". Adds complexity with no advantage over caching the Promise directly.

**Moving the guard to the React component with `useRef`**  
Rejected. `useRef` is not synchronously shared between the two mounts in Strict Mode — each mount gets its own ref. More importantly, the guard belongs in the adapter (single responsibility): the component should not need to know about `keycloak-js` initialization constraints.

**Using `keycloak-js` `silentCheckSso` flow to avoid double init**  
Not applicable. The double-init problem is independent of the SSO flow — it's caused by React's lifecycle, not by the authentication method.

## Consequences

**Positive:**
- Concurrent callers automatically share the same result — no wasted network requests.
- Survives React 18 Strict Mode's double-mount in development without special handling in the React layer.
- The guard is fully contained in the adapter; the machine and the React component are unaware of it.

**Negative:**
- If `init()` fails, the cached Promise is a rejected one. Subsequent calls will immediately receive the same rejection rather than retrying. To retry after a failure, the consumer must create a new provider instance. This is intentional — a failed Keycloak initialization usually indicates a configuration error, not a transient condition.
