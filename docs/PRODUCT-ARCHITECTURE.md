# OneByte Coder — Product architecture

## Product direction

OneByte Coder is an Android-first mobile code editor with an AI coding assistant. The phone experience is the primary product; desktop browser support is secondary and responsive.

## Mobile information architecture

- **Projects:** current project, quick-start project types and import entry points.
- **Editor:** Monaco editor, file switching, file creation, GitHub publishing and preview access.
- **AI Assistant:** chat, implementation plan and independent static review.
- **Preview:** runtime status and project preview surface.
- **Navigation drawer:** file tree, import file/folder/ZIP, settings and provider connections.
- **Settings sheet:** AI provider URL/key/model, backend URL and GitHub token.

## Core services

- **Workspace UI:** mobile-first React application packaged for Android by Capacitor.
- **Editor:** Monaco with language inference from file extensions.
- **Orchestrator:** FastAPI endpoints for provider discovery, AI implementation and source review.
- **Provider registry:** OpenAI-compatible provider URL, API key and model selection.
- **Project storage:** local browser storage for the current project's files and metadata.
- **Release manager:** GitHub publishing endpoint and GitHub Actions Android debug APK workflow.

## Mobile interaction requirements

- Use dynamic viewport sizing and safe-area insets.
- Keep primary navigation reachable at the bottom.
- Keep files and settings in a slide-out drawer / bottom sheet rather than desktop sidebars.
- Avoid hiding the assistant or file explorer on narrow screens.
- Make editor and chat composer flex within the available viewport when the soft keyboard opens.
- Touch targets should be comfortable and controls should not rely on hover.

## Agent state and evidence

`draft → analyzed → planned → implementing → changes_returned → review → publish_ready → published`

Do not claim runtime preview, visual QA, tests, security scans or deployment unless evidence from the corresponding tool exists.

## Trust and safety boundaries

- Never execute untrusted project code on the API host.
- Use isolated per-project runtimes with resource and network limits before enabling previews or terminal execution.
- Reject archive path traversal and oversized files.
- Keep credentials out of source files and model context unless explicitly required; redact logs.
- Require explicit user approval for publishing and destructive file operations.

## Current limitations

The current Preview surface is a placeholder. The app does not yet have a sandboxed runtime, on-device terminal, durable multi-project database, streaming code diffs or signed release pipeline. The backend must be deployed over HTTPS for physical-device use.
