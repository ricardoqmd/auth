# Security Policy

## Supported versions

This project is pre-1.0 (`0.x`). Only the **latest published minor** receives
security fixes; older minors are unsupported. Upgrade to the latest release
before reporting. When `1.0.0` ships, this moves to a standard supported-major
window.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately via GitHub's built-in mechanism:

1. Go to the [Security tab](https://github.com/ricardoqmd/auth/security) of this repository.
2. Click **"Report a vulnerability"**.
3. Fill in the form with as much detail as possible.

Alternatively, send a direct message to [@ricardoqmd](https://github.com/ricardoqmd) on GitHub.

### What to include

- A description of the vulnerability and its potential impact.
- Steps to reproduce or a minimal proof of concept.
- The affected package(s) and version(s).
- Any suggested mitigation if you have one.

### Response timeline

| Step | Target |
|---|---|
| Acknowledgement | Within 48 hours |
| Initial assessment | Within 5 business days |
| Fix or mitigation | Depends on severity — critical issues within 14 days |

## Scope

These packages are client-side authentication helpers. Security issues relevant to this project include:

- Token leakage or exposure in unexpected contexts.
- Bypass of the idempotency guard in `createKeycloakProvider` that could allow double initialization.
- Type-level vulnerabilities that allow bypassing RBAC checks (`hasRole`, `hasAnyRole`, `hasResourceRole`).
- XSS vectors introduced by the `AuthProvider` or `useAuth` hook.

**Out of scope:**

- Vulnerabilities in `keycloak-js`, `xstate`, or `@xstate/react` — report those to their respective maintainers.
- Vulnerabilities in the Keycloak server itself — report those to the [Keycloak project](https://www.keycloak.org/community).
- The demo app in `apps/demo` — it is not a production deployment.

## Disclosure policy

Once a fix is released, a security advisory will be published on this repository. Credit will be given to reporters who wish to be named.
