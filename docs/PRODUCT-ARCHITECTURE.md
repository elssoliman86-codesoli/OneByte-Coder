# Product architecture and staged delivery

## Core services

- **Workspace UI:** project cards, file explorer, editor, preview surface, agent chat, task queue, plan, review, settings.
- **Orchestrator:** classifies project type, selects relevant skills, builds an acceptance plan, routes tasks to the selected coding model, and records results.
- **Provider registry:** provider name, Base URL, secret reference, model list, capability probes, verified pricing/context catalog.
- **Project runtime manager:** creates isolated per-project workspaces, installs dependencies, starts allowed runtimes, exposes only approved preview ports.
- **Visual QA service:** captures screenshots at fixed viewports, inspects DOM/accessibility/layout metrics, creates issue records, and reruns after fixes.
- **Expert reviewer:** separate model selection for maintainability and security review, with test/scanner evidence attached to each finding.
- **Release manager:** test gates, README generation, GitHub repository creation/push, Pages deploy, APK/EXE artifact pipeline, release details.

## Agent state machine

`draft → analyzed → planned → implementing → runtime_ready → visual_review → changes_proposed → awaiting_user_choice → implementing_fixes → tests → expert_review → publish_ready → published`

The system must not advance to `runtime_ready` without a live process and a reachable preview URL. It must not mark `visual_review` complete without screenshots or browser inspection evidence. It must not mark `tests` complete without captured test command results. It must not publish automatically unless the user has enabled that policy and the configured release gates pass.

## Model roles

1. **Orchestrator / planner:** understands brief, chooses stack, writes acceptance criteria and task graph.
2. **Coding model:** writes implementation only; does not control review score or release status.
3. **Visual reviewer:** inspects actual screenshots and layout/accessibility measurements.
4. **Expert reviewer:** independent code quality and security review.
5. **Verifier:** checks test/build output and confirms whether acceptance criteria have evidence.

A single model may fill multiple roles for a small project, but role boundaries and evidence records remain separate.

## Trust and safety boundaries

- Never execute untrusted project code on the API host.
- Use per-project containers with CPU, memory, disk, network, process, and time limits.
- Disable outbound network by default; allowlist package registries or explicitly approved destinations.
- Treat uploaded archives as untrusted; reject path traversal, symlinks escaping the root, oversized archives, and decompression bombs.
- Store provider and GitHub credentials in a secret manager / OS vault; redact logs and model context.
- Require explicit approval for publishing, destructive filesystem operations, or access to secrets.
