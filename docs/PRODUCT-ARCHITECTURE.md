# OneByte Coder — Product architecture

## Product direction

Android-first AI coding workspace with distinct planning, implementation and review roles.

## User-facing areas

- Projects: project list, project type, description and import.
- Editor: Monaco, file tree, live streamed file updates, queue status and preview entry.
- Assistant: chat, architecture plan, independent static review.
- Preview: sandboxed HTML, linked asset inlining and DOM layout audit.
- Settings: provider URL/key, model discovery, per-model HTTP tests, planner/coder/reviewer roles, Skills.md, backend URL and GitHub token.
- Publish details: repository link, generated workflow link and deployment prerequisites.

## Services

- React/Capacitor frontend.
- FastAPI orchestration API.
- OpenAI-compatible provider discovery and streaming completion.
- Android native secure storage backed by AES-GCM and Android Keystore.
- Local project and queue persistence.
- GitHub integration: import repository files, publish a new repository or update an existing owner/name target, and generate target-specific build workflows.


## Streaming protocol

The backend consumes upstream SSE deltas and emits newline-delimited JSON events:
- summary_delta
- file_start
- file_delta
- file_end
- done / error

The Coder model is instructed to emit complete file blocks. Monaco updates each file as its deltas arrive. This is a constrained text protocol, not a general agent tool loop.

## Preview and QA boundary

HTML preview is sandboxed. Project CSS and classic JS assets can be inlined when their paths exist in the project file map. The injected audit checks DOM geometry and accessibility heuristics; it does not capture screenshots or judge subjective visual quality. Never claim screenshot-based visual QA without an actual screenshot and visual inspection.

## Release workflows

Publishing creates source files and a target-specific Actions workflow:
- Website: Pages artifact and deployment (repository Pages setting must be enabled).
- Android: Capacitor debug APK artifact.
- Windows desktop: Python PyInstaller or .NET single-file publish.
- CLI: source ZIP artifact.

A generated workflow is a build attempt; only its completed Actions run and artifacts prove success.

## Trust boundaries

- Never execute untrusted project code on the API host.
- Runtime execution requires isolated containers/workers with resource and network restrictions.
- Reject archive traversal and generated path traversal.
- Keep credentials out of project source and model context.
- Model review is not a substitute for scanners or penetration testing.
