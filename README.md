# OneByte Coder — Mobile-first AI code editor

OneByte Coder is an Android-focused coding workspace built with React, Vite, Monaco Editor, FastAPI and Capacitor.

## Mobile app experience

- Mobile-first navigation: Projects, Editor, AI Assistant and Preview.
- Slide-out workspace drawer for project files, imports and settings.
- Monaco code editor with language detection, syntax highlighting, file switching and touch-friendly layout.
- Import individual source files, folders and ZIP archives.
- OpenAI-compatible provider configuration and model discovery.
- AI agent execution, implementation-plan display and model-assisted code review.
- GitHub publishing through the configured backend API.
- Project files and project name are kept in local browser storage; provider credentials are session-scoped.

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

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Android

The Android wrapper uses Capacitor. The GitHub Actions workflow builds a debug APK:

1. Push the repository to GitHub.
2. Open Actions → Build Android APK.
3. Run the workflow manually.
4. Download the `onebyte-coder-debug-apk` artifact.

The generated APK is a debug build, not a Play Store-signed release.

## Important deployment note

The default API URL is `http://localhost:8000`, which is suitable for local browser development only. On a physical phone, localhost refers to the phone itself. Deploy the FastAPI backend over HTTPS and set `VITE_API_BASE` to that backend URL before building the APK.

## Current limitations

The preview screen is an honest placeholder until a secure project runtime is implemented. The app does not execute arbitrary project code on the phone. AI review is static model-assisted analysis, not a security certification. Production deployment requires authentication, per-user isolation, secure secret storage, rate limits and strict runtime/network isolation.
