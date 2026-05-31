# ADR-007: SonarQube Cloud for the public repo, with a Clean-as-You-Code quality gate

**Date:** 2026-05-30  
**Status:** Accepted

## Context

The team standard for code-quality analysis is a self-hosted SonarQube instance,
used by the internal projects (Jenkins / Asepro pipelines). This monorepo is
different: it is public, lives on GitHub, runs CI on GitHub Actions, and doubles
as a portfolio piece. Pointing the internal, self-hosted instance at a public
GitHub repo is awkward — the analysis would not be publicly visible, which
defeats part of the purpose, and it couples public CI to internal infrastructure.

Code-quality analysis should be wired up at the **start** of the v0.3.0 hardening
phase, not deferred to 1.0: the instrument has to be in place while coverage is
being raised, not after.

## Decision

Use **SonarQube Cloud** (formerly SonarCloud) for this repository, via the
official `SonarSource/sonarqube-scan-action` on GitHub Actions:

1. Vitest produces LCOV coverage per package; the scan reads all three reports.
2. The analysis runs on pushes to `main` and on pull requests (PR decoration).
3. The quality gate follows **Clean as You Code**: thresholds apply to new and
   changed code, not the whole legacy surface. CI waits on the gate
   (`-Dsonar.qualitygate.wait=true`) and fails the job if it is not met.

The self-hosted SonarQube remains the standard for the internal projects (e.g.
the RH system). This is a deviation-with-reason for the public repo, in the same
spirit as the public-repo / MIT-license decisions already made for this monorepo.

## Alternatives considered

**Self-hosted SonarQube (the literal team standard)**  
Rejected for this repo. It is internal-only, so the results would not be visible
on the public repo, and it ties public GitHub CI to private infrastructure.
Correct for internal projects; wrong for a public portfolio repo.

**Defer analysis to v1.0 (once coverage is ~80%)**  
Rejected. Sonar is a measurement tool, not a milestone. It should be in place
while hardening, so it can track coverage as it climbs and catch issues early.
The 70% / 80% coverage figures are roadmap goals, independent of when the tool is
wired up.

## Consequences

**Positive:**

- A public quality gate and coverage badge — useful evidence for a portfolio repo.
- Smells, bugs, vulnerabilities, and duplication are caught during v0.3.0, not
  discovered at 1.0.
- "Clean as You Code" lets the gate be strict on new code immediately, without
  failing every PR because legacy coverage is still low.

**Negative:**

- A second SaaS dependency for this repo (free for public projects).
- Two different quality setups across the ecosystem — self-hosted for internal
  projects, Cloud for the public repo. Intentional, but worth remembering.
