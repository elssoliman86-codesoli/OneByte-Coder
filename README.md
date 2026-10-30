# OneByte Coder

An AI-assisted coding workspace prototype built with React, Vite, Monaco Editor, FastAPI, and Capacitor.

## Included

- Dark responsive workspace with file explorer and Monaco code editor.
- OpenAI-compatible provider configuration and model discovery.
- Agent task execution and structured implementation-plan display.
- Static source review through a separately selectable review model.
- ZIP and individual-file import.
- FastAPI backend endpoints for provider discovery, agent execution, source review, and GitHub publishing.
- GitHub Actions workflows for frontend GitHub Pages deployment and Android debug APK generation.

## Run locally

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

API health: http://localhost:8000/health

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

Set `VITE_API_BASE` when the backend is hosted somewhere other than `http://localhost:8000`.

## Android APK

The workflow `.github/workflows/android-apk.yml` creates a **debug APK** and uploads it as a GitHub Actions artifact. It is not a signed Play Store release. The workflow is configured for manual dispatch or a `v*` tag push.

## Current limitations

This is a prototype, not a complete autonomous IDE. The preview is a placeholder and does not launch a project runtime. The workspace does not yet provide isolated terminal execution, real browser-based visual QA, streaming code diffs, durable multi-project storage, or a release-signed APK. Source review is model-assisted static analysis and is not a security certification. The full Vite build and Android Gradle build have not yet been verified in this environment.

Do not deploy the backend as a public multi-user service without authentication, per-user isolation, rate limits, secure secret storage, and stricter network controls.

## License

MIT
