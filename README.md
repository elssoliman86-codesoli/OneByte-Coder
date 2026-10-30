# OneByte Coder

OneByte Coder is an AI-assisted coding workspace built around three independent model roles: **Planner**, **Coder**, and **Expert Reviewer**.

## Workflow

1. Create a project and describe the intended product.
2. The Planner analyzes the brief and returns a structured project plan before implementation.
3. Select a dedicated coding model. Coding requests are added to a sequential queue.
4. Edit generated files in Monaco, import ZIP/source files, and inspect HTML entry-point previews.
5. Select a separate reviewer model for model-assisted code-quality and security review.
6. Publish the reviewed source project to GitHub.

## Implemented

- Responsive project/editor/assistant screens and mobile navigation.
- Monaco editor, file switching, file creation, ZIP/file/folder imports.
- OpenAI-compatible provider settings and model discovery.
- Dedicated planner, coding and reviewer model selectors.
- Structured planning endpoint for requirements, architecture, stack, file tree and acceptance criteria.
- Sequential coding task queue with queued/running/done/failed states.
- Persistent custom Skills.md instructions, plus the built-in skills library at `skills/skills.md`.
- Provider metadata display for context/pricing only when the provider actually returns those fields.
- Sandboxed HTML preview when an `index.html` entry file exists.
- Model-assisted static review and GitHub repository publishing.
- Capacitor Android wrapper and GitHub Actions debug APK workflow.

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

## Android APK

Open Actions → Build Android APK → Run workflow manually. Download the `onebyte-coder-debug-apk` artifact. This is a debug APK for testing, not a Play Store-signed release.

## Backend deployment

The default API URL is `http://localhost:8000`, suitable for local browser development. On a physical Android device, localhost refers to the phone. Deploy the backend over HTTPS and configure `VITE_API_BASE` before building the APK.

## Important limitations

- Provider keys are session-scoped in the current app; Android Keystore-backed secure storage is not implemented yet.
- Coding output is applied after the model response completes; token-by-token Monaco streaming is not implemented yet.
- The queue is sequential in the current app session and is not durable across restarts.
- HTML preview is sandboxed. Python, CLI, Android and desktop execution need isolated runtime/build workers.
- Provider APIs often omit context-window and pricing metadata. Unknown values are shown as unavailable, not guessed.
- Model review is static and is not SAST/DAST, penetration testing or a security certification.
- GitHub publishing uploads source files and a README. APK/EXE packaging and GitHub Pages deployment need separate workflows.
