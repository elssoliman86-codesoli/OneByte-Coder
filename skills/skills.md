# OneByte Coder — Skills Library

The orchestrator must load only the skills relevant to the project brief. Skills are persistent project guidance, not permission to skip tests or claim unperformed checks.

## 1. Requirement analysis (`requirement-analysis`)
- Convert the brief into actors, user journeys, functional requirements, non-functional requirements, constraints, and measurable acceptance criteria.
- Identify ambiguities and assumptions. Ask concise questions only when an ambiguity blocks architecture or implementation; otherwise document the assumption.
- Produce a dependency-aware implementation plan and a file tree before coding.

## 2. Architecture and stack selection (`architecture-selection`)
- Choose the simplest maintainable architecture that satisfies the requirements; do not select frameworks only because they are fashionable.
- Explain language, runtime, database, hosting, and library choices with trade-offs.
- Check official documentation and current stable versions before recommending a dependency when network research is available. Never invent a “latest” version.
- Separate UI, domain logic, persistence, integration adapters, and configuration.

## 3. Product UI and visual design (`product-ui-design`)
- Use NameThatUI (https://namethatui.com/) as a vocabulary and interaction-pattern reference. Identify the actual pattern (drawer, command palette, split view, tabs, popover, tree view, toast, etc.) and implement its expected behavior, not merely its appearance.
- Start with a coherent design system: spacing scale, typography scale, semantic colors, elevation, borders, radii, focus states, and motion tokens.
- Prefer a deliberate visual hierarchy, generous whitespace, consistent alignment, clear contrast, and responsive layouts.
- Avoid generic dashboard clutter, random gradients, inconsistent radii, adjacent controls without spacing, and decorative elements that compete with primary actions.
- Build loading, empty, error, disabled, hover, focus, and success states for every important interaction.
- Verify keyboard navigation, touch target size, responsive breakpoints, and accessible names.

## 4. Web application engineering (`web-app-engineering`)
- Use semantic HTML and accessible component patterns. Keep state predictable and components cohesive.
- Validate inputs on both client and server. Handle loading, network failures, retries, and empty results.
- Do not expose API keys, tokens, or private environment values in client bundles or logs.
- Add tests for critical logic and ensure production build succeeds.

## 5. Mobile application engineering (`mobile-app-engineering`)
- Design for small screens first, safe areas, touch interaction, keyboard avoidance, lifecycle, and offline/error states.
- Use native platform capabilities through maintained APIs. Explain permissions before requesting them.
- Validate Android package identifiers, signing configuration, release artifacts, and device behavior. A web preview is not proof that an APK works.

## 6. CLI and terminal tools (`cli-engineering`)
- Provide predictable commands, `--help`, actionable errors, sensible exit codes, and safe defaults.
- Never execute arbitrary user-supplied shell input without isolation and explicit policy checks.
- Test argument parsing, success paths, failures, and platform differences.

## 7. Backend and data (`backend-data-engineering`)
- Validate request schemas, enforce authorization, use parameterized queries, and define migration strategy.
- Add timeouts, bounded retries, rate limits, structured logs, and health checks where appropriate.
- Store secrets in environment variables or a credential vault; never commit `.env` files.

## 8. Code quality (`code-quality-review`)
- Review correctness, complexity, naming, duplication, error handling, type safety, dependency health, and maintainability.
- Prefer small focused modules and explicit contracts. Remove dead code and unused dependencies.
- Run formatter, linter, type checker, unit tests, integration tests, and production build when available. Report exactly what ran.

## 9. Application security (`application-security-review`)
- Threat-model trust boundaries, authentication, authorization, input validation, file uploads, secrets, dependencies, and network exposure.
- Look for injection, path traversal, SSRF, XSS, CSRF, insecure deserialization, broken access control, unsafe subprocesses, and sensitive data leakage.
- Separate confirmed findings from hypotheses. Recommend remediation and regression tests.
- Static model review is not a substitute for SAST, dependency scanning, DAST, penetration testing, or human review.

## 10. Visual QA (`visual-quality-assurance`)
- Capture the actual running application at desktop, tablet, and mobile sizes.
- Inspect alignment, spacing, typography, contrast, overflow, hierarchy, responsive behavior, and interaction feedback.
- Compare screenshots against the written brief and acceptance criteria. Record each issue with route, viewport, reproduction steps, and severity.
- Apply fixes, recapture, and compare again. Never claim visual inspection without an actual screenshot or browser observation.

## 11. Git and release (`git-release`)
- Review staged changes, exclude secrets/build artifacts, create a meaningful README, and keep commits scoped.
- Run checks before publishing. Do not equate a successful upload with a verified release.
- Publish only after the user has configured credentials and explicitly initiated the action.
