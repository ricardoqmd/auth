# Contributing

Thanks for your interest. This is a small open-source project — contributions are welcome, but please read this first so we can keep the review cycle short.

## Before you open a PR

- **Bug fix or small improvement?** Open a PR directly with a clear description of the problem and the fix.
- **New feature or API change?** Open an issue first to discuss. The API surface is intentionally small and changes require a version bump coordinated through Changesets.
- **New IDP adapter** (Auth0, Cognito, Entra…)? Same — open an issue first. The architecture supports it but each adapter ships as its own package.

## Local setup

**Prerequisites:** Node.js >= 18.18, pnpm >= 9, Docker + Docker Compose.

```bash
# Install dependencies
pnpm install

# Build all packages (required before running tests or the demo)
pnpm build

# Run tests
pnpm test

# Start local Keycloak (port 8080)
pnpm kc:up

# Configure and run the demo app
cp apps/demo/.env.example apps/demo/.env.local
pnpm demo    # http://localhost:3000
```

Demo Keycloak credentials: `admin / admin` at `http://localhost:8080/admin`, realm `demo`.

## Project structure

```
packages/
  auth-core/       # XState machine + TypeScript contracts (no framework deps)
  auth-keycloak/   # keycloak-js adapter implementing AuthProvider
  auth-nextjs/     # React/Next.js bindings (AuthProvider component, useAuth hook)
apps/
  demo/            # Next.js app for local testing (private, not published)
docker/            # Keycloak 26 Docker Compose + realm export
docs/decisions/    # Architecture Decision Records (ADR-001 to ADR-005)
```

The design is hexagonal: `auth-core` defines the port (`AuthProvider<TIdpClaims>`), adapters implement it, bindings consume it. Changes to `auth-core` interfaces affect everything — tread carefully.

## Commit conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<optional scope>): <short description>

<optional body>

<optional footer>
```

### Allowed types

| Type | Purpose | Example |
|---|---|---|
| `feat` | New feature for users | `feat(auth-core): add token refresh callback` |
| `fix` | Bug fix for users | `fix(auth-keycloak): handle expired refresh token` |
| `chore` | Maintenance, no user-facing change | `chore: release v0.2.0` |
| `refactor` | Code change without behavior change | `refactor(auth-core): extract guards to separate module` |
| `docs` | Documentation only | `docs: align internal docs with v0.2.0 published state` |
| `test` | Adding or fixing tests | `test(auth-keycloak): add idempotency guard tests` |
| `perf` | Performance improvement | `perf(auth-core): memoize role lookup` |
| `build` | Build system, deps, configs | `build: upgrade tsup to 8.5.0` |
| `ci` | CI/CD configuration | `ci: cache pnpm store between runs` |

### Scope

Use the package name without the `@ricardoqmd/` prefix:

```
feat(auth-core): ...
fix(auth-keycloak): ...
docs(auth-nextjs): ...
```

Omit scope for changes that affect multiple packages or the root:

```
chore: bump all packages to 0.2.0
docs: update README
```

### Short description rules

- Imperative mood: "add" not "added" or "adds"
- Lowercase first letter
- No period at the end
- Max 72 characters
- Be specific: not "fix bug" but "fix infinite re-renders in AuthProvider"

### Body

Use when the change requires context. Explain **why**, not just **what** — the diff already shows what. Wrap at 72 characters per line.

```
fix(auth-keycloak): cache init Promise to prevent double init

Previously, the idempotency guard used a boolean flag set AFTER the
kc.init() async call resolved. Under React 18 Strict Mode's simulated
unmount/remount, the second mount called init() while the first was
still in flight — the boolean was still false, the guard passed, and
kc.init() ran twice, throwing.

Now the guard caches the Promise itself, set synchronously before the
await. Any concurrent call finds the cached Promise and returns it.
```

### Footer

Use for breaking changes and issue references:

```
BREAKING CHANGE: useAuth().user.roles is now always defined.
Closes #42
```

### Examples

**Feature:**
```
feat(auth-nextjs): add useAuth generic for typed idpClaims

Consumers can now pass their IDP's claims interface as a type parameter:

  const { idpClaims } = useAuth<KeycloakIdpClaims>();

Default remains `unknown` for consumers who don't need IDP-specific fields.
```

**Bug fix:**
```
fix(auth-nextjs): prevent infinite re-renders in AuthProvider

createAuthMachine(provider) was called inline on every render.
@xstate/react's useIdleActorRef compares logic.config by reference;
each call produced a new object, triggering setCurrent during render.

Fix: wrap in useMemo keyed on provider.
```

**Documentation:**
```
docs(auth-keycloak): document hasResourceRole utility

Added "IDP-specific role checks" section distinguishing the universal
hasRole (from the hook) from Keycloak's resource roles (standalone
utility from this package).
```

## Branch naming

```
<type>/<short-description>
```

Examples:
- `feat/auth-core-token-refresh-callback`
- `fix/auth-nextjs-strict-mode-double-init`
- `chore/release-v0.3.0`
- `docs/post-v0.2.0-internal-docs`

Use kebab-case. Keep under 50 characters.

## Pull request standards

### Title

Same format as commit message: `<type>(<scope>): <description>`

### Description structure

```markdown
## What
Brief summary of what this PR does (1-3 sentences).

## Why
Context and reasoning. What problem does this solve? Reference issues if relevant.

## How
Technical approach and non-obvious decisions.

## Validation
How was this tested? Build status, test counts, manual testing notes.

## Notes (optional)
Deferred work, known limitations, follow-up PRs.
```

### Merge policy

This repo uses **squash-merge** to keep `main` history linear.

**Squash commit title** — must follow Conventional Commits. GitHub pre-fills it
from the PR title and appends the PR number, e.g.
`feat: surface structured AuthError and hide machine internals (#20)`. Clean it
up before confirming if needed.

**Squash commit body (extended description)** — replace GitHub's auto-filled list
of intermediate commit subjects with a short, durable summary:

- 1-3 bullets of what changed and its user-facing effect
- a pointer to the relevant ADR, when there is one
- a `BREAKING CHANGE:` footer when applicable

Do **not** paste the full PR description. The What / Why / How / Validation /
Notes lives in the PR itself (linked via the `(#NN)`); test output and process
notes are noise in permanent `git log` history. Versioning is driven by
Changesets, not by commit messages, so a `BREAKING CHANGE:` footer here is
informational only — it does not trigger a version bump on its own (the
changeset does).

The **Build, test & analyze** and **SonarCloud Code Analysis** checks must pass
before merging. Do not merge with red CI.

## Versioning and releases

Since 1.0, the public surface follows SemVer: removing or renaming an export, or
adding a method to the `AuthProvider` port, is a **major** bump; backward-compatible
additions are **minor**; fixes are **patch**. Adding a new `AuthError.code` is
non-breaking when consumers handle `default`. The frozen surface is defined in
[ADR-009](./docs/decisions/009-freeze-public-api-for-1.0.md).

All three packages are version-linked via [Changesets](https://github.com/changesets/changesets). If your change warrants a release entry:

```bash
pnpm changeset    # follow the prompts
```

Do not manually edit `package.json` versions. The release flow is:

1. Create branch `chore/release-vX.Y.Z` from `main`
2. `pnpm changeset` — describe the change and select packages
3. `pnpm version-packages` — apply changeset, updates package.json + CHANGELOGs
4. `pnpm install && pnpm build && pnpm test` — validate
5. Commit, push, open PR — wait for CI green
6. Squash and merge
7. On `main`: `pnpm release` — publishes to npm
8. `git push --tags` — pushes the tags Changesets created

## Code style

- TypeScript everywhere — no plain `.js` files in packages
- No `any` — use generics or `unknown` with type guards
- Functional style; avoid classes unless a library requires them
- No comments explaining *what* the code does — only *why* when non-obvious

## Running CI locally

```bash
pnpm build && pnpm test
```

This is exactly what GitHub Actions runs on every PR. If it passes locally, CI will pass.

## What not to do

- ❌ Generic messages: "update files", "fix stuff", "wip"
- ❌ All-caps: "FIX BUG"
- ❌ Past tense: "fixed bug" — use "fix bug"
- ❌ Period at the end of the first line
- ❌ More than 72 characters in the first line
- ❌ Body without a blank line separating it from the subject
- ❌ Squash-merging without rewriting the auto-generated message
- ❌ Manually editing `package.json` versions

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
