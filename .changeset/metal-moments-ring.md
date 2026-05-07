---
"@ricardoqmd/auth-nextjs": patch
---

Support Next.js 16

Next.js 16 was released on May 6, 2026, after the v0.1.0 publication. The
previous peerDependency range "<16.0.0" prevented installation in projects
using Next.js 16. The range has been expanded to ">=14.0.0 <17.0.0" to allow
Next.js 14, 15, and 16.

Internal devDependency @xstate/react was bumped from 4.1.3 to 5.0.5 to support
React 19 (no API changes for consumers).

No source code changes required. Package code is forward-compatible.

Verified end-to-end with Next.js 16 + Keycloak (local and production):

- Login flow
- Proactive token refresh
- Logout
- Session persistence on reload
- RBAC helpers (hasRole, hasAnyRole, hasResourceRole)
