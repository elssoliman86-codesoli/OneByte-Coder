# OneByte Coder — Skills Library

The Planner, Coder and Expert Reviewer use this persistent skill library. Select relevant skills by project type and task. Never invent test results or bypass security boundaries.

## 1. Requirement analysis — always
- Translate the brief into actors, workflows, functional/non-functional requirements, constraints and measurable acceptance criteria.
- Identify assumptions and blocking ambiguities.
- Produce a dependency-aware plan and proposed file tree before coding.
- Include data model, API boundaries, error states, accessibility, security and deployment.

## 2. Architecture and stack selection — always
- Choose a maintainable stack that fits the requirements; do not follow trends blindly.
- Explain language, framework, runtime, database and hosting trade-offs.
- Check official documentation and stable versions when research is available; never invent versions.
- Separate UI, domain logic, persistence, integrations, configuration and tests.

## 3. Premium UI and visual design — web and mobile
- Use https://namethatui.com/ as the interaction-pattern and vocabulary reference.
- Name patterns precisely: navigation drawer, source list/tree view, split view, command palette, tabs, popover, modal sheet, toast and responsive preview.
- Define spacing, typography, color, borders, radii, elevation, focus and motion tokens before building screens.
- Use deliberate hierarchy, whitespace, alignment, contrast and responsive behavior.
- Avoid generic dashboard clutter, arbitrary gradients, inconsistent radii and adjacent controls without spacing.
- Implement loading, empty, error, disabled, focus and success states.
- Verify keyboard navigation, touch target sizes, accessibility and mobile safe areas.
- Websites need a defined visual direction, grid, type pairing, palette, component states and breakpoints.
- Android interfaces must account for back behavior, keyboard resizing, permissions and lifecycle.

## 4. Web application engineering
- Use semantic HTML and accessible components.
- Keep state predictable and components cohesive.
- Validate inputs on client and server.
- Handle loading, failures, retries and empty results.
- Never expose credentials in bundles, logs or project files.
- Add tests for critical logic and verify production builds.

## 5. Android engineering
- Design small screens first, then tablet and desktop.
- Account for safe areas, touch interaction, keyboard avoidance, lifecycle and offline/error states.
- Use maintained native APIs and request only required permissions.
- Verify package IDs, signing, APK artifacts and physical-device behavior.

## 6. Backend and database engineering
- Validate schemas, enforce authorization, use parameterized queries and define migrations.
- Add timeouts, bounded retries, rate limits, structured logs and health checks.
- Keep secrets in environment variables or a credential vault.
- Threat-model tenant isolation, uploads, outbound requests and resource limits.
- Never execute untrusted project code on the API host.

## 7. CLI and terminal engineering
- Provide predictable commands, --help, actionable errors, sensible defaults and correct exit codes.
- Never execute arbitrary user shell input without isolation and explicit policy checks.
- Test argument parsing, success/failure paths and platform differences.

## 8. Code quality
- Review correctness, complexity, naming, duplication, error handling, type safety, dependency health and maintainability.
- Prefer focused modules and explicit contracts.
- Run formatter, linter, type checker, unit/integration tests and production build when available.
- Report exactly which checks ran.

## 9. Application security
- Threat-model authentication, authorization, input validation, uploads, secrets, dependencies and network exposure.
- Check injection, path traversal, SSRF, XSS, CSRF, insecure deserialization, broken access control, unsafe subprocesses and data leakage.
- Separate confirmed findings from hypotheses.
- Static model review is not SAST, DAST, penetration testing or human review.

## 10. Visual QA
- Inspect the actual app at desktop, tablet and mobile sizes when runtime/browser tools are available.
- Check alignment, spacing, typography, contrast, overflow, hierarchy, responsiveness and feedback.
- Compare screenshots to acceptance criteria, fix issues, recapture and compare.
- Never claim visual inspection without screenshots or browser observation.

## 11. Git and release
- Exclude secrets/build artifacts and maintain a useful README.
- Run checks before publishing.
- Repository upload, website deployment, APK/EXE builds and signed releases are distinct operations.
- Publish only after explicit user action.

## 12. Model metadata integrity
- Never invent pricing, context windows, throughput, coding scores or HTTP results.
- Show "Not provided" when provider APIs omit metadata.
- HTTP 200 means endpoint success, not model quality.
- Use repeatable benchmarks for objective model comparisons.

## 13. Desktop application engineering — desktop, Windows and EXE
- Select a desktop framework that matches the language and UI requirements; avoid packaging a web page as a native desktop app without explaining the trade-offs.
- Define application lifecycle, window sizing, menus, keyboard shortcuts, file access and update behavior.
- Keep filesystem access scoped to user-selected workspaces and validate imported paths.
- Package reproducibly for the target OS and architecture; distinguish portable builds from installers and signed releases.
- Test startup, shutdown, missing dependencies, file permissions and clean-machine installation.

## 14. Model provider integration — AI and API clients
- Treat provider base URLs, authentication headers, model IDs and streaming formats as provider-specific configuration.
- Support timeouts, cancellation, bounded response sizes and clear HTTP error reporting.
- Do not assume every model supports JSON mode, tool calling or server-sent events.
- Never log API keys or include them in generated project files, browser storage or diagnostics.
- Report provider-supplied metadata separately from measured latency and actual capability tests.
