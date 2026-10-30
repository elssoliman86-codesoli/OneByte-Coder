# OneByte Coder

OneByte Coder is an Android-first AI coding workspace. It separates project planning, code generation and expert review into distinct model roles.

## Workflow

1. Create a project, choose its target (website, Android, CLI or desktop) and describe the product.
2. The Planner returns requirements, architecture, recommended stack, file tree, acceptance criteria and risks.
3. Select a dedicated Coder model. Tasks enter a sequential queue.
4. The Coder streams complete file blocks from an OpenAI-compatible streaming endpoint. Monaco receives file chunks while generation is in progress.
5. Inspect HTML previews, run the in-frame layout/accessibility heuristics, edit files and import ZIP/source files.
6. Select an independent Reviewer model and run static model-assisted review.
7. Publish source to GitHub. OneByte generates a target-specific GitHub Actions workflow and a README.

## Implemented

- Mobile-first React/Capacitor workspace and Monaco editor.
- Multi-project local persistence, file tree, file creation, ZIP/file/folder imports for supported text/source formats (binary assets are skipped).
- OpenAI-compatible provider settings, model discovery, metadata passthrough and per-model HTTP status/latency test; non-secret provider/model settings persist locally.
- Independent Planner, Coder and Reviewer model roles.
- Structured project planning and persistent Skills.md instructions.
- Streaming file generation into Monaco using newline-delimited JSON events.
- Sequential task queue persisted in local storage; interrupted running tasks are returned to queued state after reload.
- Android native secure storage plugin: AES-GCM encrypted values with an AES key protected by Android Keystore. Browser builds keep secrets in memory only.
- Hierarchical file tree with language-specific icons.
- Sandboxed HTML preview with linked CSS and classic JavaScript assets inlined from the project file map.
- In-frame DOM layout heuristics for small touch targets, control overlap, missing accessible labels and horizontal overflow.
- Static model-assisted code review and a 10/10 publish gate.
- GitHub source publishing, generated README and per-target build/deploy workflows for websites, Android, Windows Python/.NET and CLI source archives.
- Import/publish path validation, secret-file blocking, bounded text-file sizes and rejection of incomplete streamed file blocks.
- Dependency security gate in CI: npm audit must pass without high/critical vulnerabilities.

- Backend regression tests (16 passing in the verified CI run) and GitHub Actions CI.

## Latest verification — 2026-10-30

The implementation was verified through GitHub Actions:

| Check | Result | Run |
|---|---|---|
| Backend API regression suite | 16 passed | [Backend tests](https://github.com/elssoliman86-codesoli/OneByte-Coder/actions/runs/41047935373) |
| Frontend production build | Passed; full and production npm audits report zero vulnerabilities | [Frontend CI](https://github.com/elssoliman86-codesoli/OneByte-Coder/actions/runs/41048863579) |
| Android debug APK | Passed; Capacitor secure-storage plugin registration verified | [Android build](https://github.com/elssoliman86-codesoli/OneByte-Coder/actions/runs/41048591618) |
| GitHub Pages frontend bundle | Build passed; deployment skipped because Pages is not enabled | [Pages workflow](https://github.com/elssoliman86-codesoli/OneByte-Coder/actions/runs/41048591633) |

The Android artifact is named `onebyte-coder-debug-apk`. It is a test/debug APK, not a signed Play Store release. CI does not install it on a physical phone.

See [Implementation status](docs/IMPLEMENTATION-STATUS.md) for verified scope and remaining limitations.

## Run locally

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q
```

## Android APK

Open Actions → Build Android APK and download the `onebyte-coder-debug-apk` artifact. This is a debug APK for testing, not a Play Store-signed release.

## Deploying the backend

The default API URL is `http://localhost:8000`. On a physical Android phone, localhost refers to the phone, not your computer. Deploy the FastAPI backend over HTTPS and set the API server URL in Settings. Configure `ONEBYTE_ALLOWED_ORIGINS` on the backend with a comma-separated list of trusted frontend origins (for example, `https://elssoliman86-codesoli.github.io,https://localhost`). CORS is not authentication; do not expose an unauthenticated backend to untrusted networks.

## Important limitations

- Live code streaming requires a provider/model that supports OpenAI-compatible SSE streaming and follows OneByte's file-block protocol. Generated files are applied incrementally; unsupported providers may fail with a clear stream error.
- Import currently stores text/source files only; binary assets such as PNG, JPG, fonts and compiled files are skipped rather than embedded in the project VFS.
- HTML preview supports linked CSS and classic JavaScript files that exist in the project map. It is not a full Vite/React/Next runtime or a Python/CLI/Android emulator.
- The preview audit uses DOM geometry/accessibility heuristics. It does not capture screenshots, evaluate visual aesthetics or replace real device testing.
- Python, CLI, Android and desktop execution still require isolated runtime workers. The generated GitHub workflows build selected project types after publishing.
- Website publishing requires enabling repository Settings → Pages → Build and deployment → GitHub Actions. GitHub settings cannot be enabled by the source-upload endpoint.
- Android debug APK workflow builds an existing Gradle project or bootstraps a Capacitor wrapper for a Node project. Windows EXE workflow supports Python entry points and .NET projects; other stacks need a dedicated packager.
- Static model review is not SAST/DAST, penetration testing or a security certification. A 10/10 model score is not proof that software is vulnerability-free.
- Android Keystore storage is native-only. Browser preview keeps secrets in memory and does not persist them.
- Browser-based project persistence currently uses local storage; very large workspaces may reach browser quota limits.
- Queue state is stored in local storage, not a server-side durable job database.
- Physical-device installation and end-to-end testing have not been performed by CI.
