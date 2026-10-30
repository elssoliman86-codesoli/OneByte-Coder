from __future__ import annotations
import json, re
from urllib.parse import quote
from typing import Any
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, HttpUrl

app = FastAPI(title="OneByte Coder API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "capacitor://localhost", "http://localhost"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

class ProviderRequest(BaseModel):
    base_url: str
    api_key: str

class ProjectPayload(BaseModel):
    name: str
    description: str = ""
    kind: str = ""
    files: dict[str, str] = Field(default_factory=dict)

class AgentRequest(BaseModel):
    base_url: str
    api_key: str
    model: str
    task: str
    project: ProjectPayload
    skills: str = ""

class ReviewRequest(BaseModel):
    base_url: str
    api_key: str
    model: str
    project: ProjectPayload
    skills: str = ""

class PlanRequest(BaseModel):
    base_url: str
    api_key: str
    model: str
    name: str
    description: str
    kind: str = "Web app"
    files: dict[str, str] = Field(default_factory=dict)
    skills: str = ""

class PublishRequest(BaseModel):
    token: str
    owner: str | None = None
    repo_name: str
    description: str = ""
    kind: str = "Web app"
    files: dict[str, str]
    make_private: bool = False


def normalized_base(url: str) -> str:
    value = url.strip().rstrip("/")
    if not value.startswith(("http://", "https://")):
        raise HTTPException(400, "Base URL must start with http:// or https://")
    return value


def select_relevant_skills(raw: str, project_kind: str, task: str) -> str:
    if not raw.strip():
        return ""
    sections = re.split(r"(?=^##\s+)", raw, flags=re.MULTILINE)
    always_terms = ("requirement analysis", "architecture and stack", "code quality", "application security", "git and release", "model metadata integrity")
    context = (project_kind + " " + task).lower()
    selected = []
    for section in sections:
        heading = section.splitlines()[0].lower() if section.strip() else ""
        if not heading.startswith("## "):
            continue
        include = any(term in heading for term in always_terms)
        if any(term in context for term in ("website", "web app", "frontend", "html", "css", "react", "ui", "design")):
            include = include or any(term in heading for term in ("premium ui", "web application engineering", "visual qa"))
        if any(term in context for term in ("android", "mobile", "apk", "capacitor", "ios")):
            include = include or any(term in heading for term in ("premium ui", "android engineering", "visual qa"))
        if any(term in context for term in ("backend", "api", "database", "server", "fastapi", "sql")):
            include = include or "backend and database" in heading
        if any(term in context for term in ("cli", "terminal", "command line", "shell")):
            include = include or "cli and terminal" in heading
        if any(term in context for term in ("desktop", "windows", "exe")):
            include = include or "desktop" in heading
        if include:
            selected.append(section.strip())
    return "\n\n".join(selected)[:16000]

async def provider_post(base: str, key: str, payload: dict[str, Any]) -> dict[str, Any]:
    url = normalized_base(base) + "/chat/completions"
    try:
        async with httpx.AsyncClient(timeout=180) as client:
            response = await client.post(url, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, json=payload)
    except httpx.RequestError as exc:
        raise HTTPException(502, f"Provider connection failed: {exc}") from exc
    if response.status_code >= 400:
        detail = response.text[:1200]
        raise HTTPException(response.status_code, f"Provider returned {response.status_code}: {detail}")
    try:
        return response.json()
    except ValueError as exc:
        raise HTTPException(502, "Provider returned invalid JSON") from exc

@app.get("/health")
async def health():
    return {"status": "ok", "service": "onebyte-coder-api", "version": "0.1.0"}

@app.post("/api/providers/models")
async def list_models(body: ProviderRequest):
    url = normalized_base(body.base_url) + "/models"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers={"Authorization": f"Bearer {body.api_key}"})
    except httpx.RequestError as exc:
        raise HTTPException(502, f"Could not reach provider: {exc}") from exc
    if response.status_code >= 400:
        raise HTTPException(response.status_code, f"Provider returned {response.status_code}: {response.text[:700]}")
    data = response.json()
    rows = data.get("data", []) if isinstance(data, dict) else []
    models = [{"id": row.get("id", ""), "owned_by": row.get("owned_by"), "created": row.get("created"), "context_window": row.get("context_window"), "input_price": row.get("input_price"), "output_price": row.get("output_price")} for row in rows if row.get("id")]
    return {"models": models, "metadata_note": "The OpenAI-compatible models endpoint generally does not provide verified pricing, context-window limits, or coding benchmark scores."}


class ModelTestRequest(BaseModel):
    base_url: str
    api_key: str
    model: str

@app.post("/api/providers/test-model")
async def test_model(body: ModelTestRequest):
    import time
    url = normalized_base(body.base_url) + "/chat/completions"
    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(35.0, connect=10.0)) as client:
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {body.api_key}", "Content-Type": "application/json"},
                json={"model": body.model, "messages": [{"role": "user", "content": "Reply with OK."}], "max_tokens": 2, "temperature": 0},
            )
        elapsed = round((time.perf_counter() - started) * 1000)
        return {"model": body.model, "http_status": response.status_code, "ok": response.status_code == 200, "latency_ms": elapsed, "detail": None if response.status_code == 200 else response.text[:500]}
    except httpx.RequestError as exc:
        return {"model": body.model, "http_status": None, "ok": False, "latency_ms": round((time.perf_counter() - started) * 1000), "detail": str(exc)[:500]}

@app.post("/api/agent/plan")
async def plan_project(body: PlanRequest):
    if not body.description.strip():
        raise HTTPException(400, "Project description is required")
    file_context = "\n\n".join(f"--- FILE: {path} ---\n{content[:12000]}" for path, content in list(body.files.items())[:25])
    system = """You are OneByte Coder's principal product architect. Analyze the user's brief before coding. Return ONLY valid JSON: {"summary":string,"plan":{"title":string,"summary":string,"steps":[string],"requirements":[string],"architecture":string,"stack":[string],"file_tree":[string],"acceptance_criteria":[string],"risks":[string]}}. Recommend a suitable language, framework, database only if needed, API boundaries, design system, responsive behavior, security controls, tests and deployment. State assumptions. Never invent library versions or claim code has been executed."""
    selected_skills = select_relevant_skills(body.skills, body.kind, body.description)
    if selected_skills:
        system += "\n\nRELEVANT PROJECT SKILLS:\n" + selected_skills
    user = f"Project: {body.name}\nType: {body.kind}\nBrief:\n{body.description}\n\nImported files:\n{file_context or '(none)'}"
    data = await provider_post(body.base_url, body.api_key, {"model": body.model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}], "temperature": 0.15, "response_format": {"type": "json_object"}})
    try:
        result = json.loads(data["choices"][0]["message"]["content"])
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(502, "Planner response was not valid JSON. Choose a model that supports JSON mode.") from exc
    return {"summary": result.get("summary", "Project analysis complete."), "plan": result.get("plan") or {}}


@app.post("/api/agent/execute")
async def execute_agent(body: AgentRequest):
    if not body.task.strip():
        raise HTTPException(400, "Task is required")
    file_context = "\n\n".join(f"--- FILE: {path} ---\n{content[:18000]}" for path, content in list(body.project.files.items())[:35])
    system = """You are OneByte Coder's implementation agent. First understand the user's request and the project architecture. Return ONLY valid JSON with this schema: {\"summary\":string,\"plan\":{\"title\":string,\"summary\":string,\"steps\":[string]},\"files\":{\"relative/path\":\"complete replacement file content\"}}. Only include files that must be created or fully replaced. Never use markdown fences. Do not claim tests, runtime previews, visual inspection, security scans, or deployments were performed unless actual tool results are supplied. Keep secrets out of source files. Prefer maintainable, production-minded code and explain important tradeoffs in summary. If the user asks for a large feature, implement a coherent vertical slice rather than stubs."""
    selected_skills = select_relevant_skills(body.skills, body.project.kind or body.project.description, body.task)
    if selected_skills:
        system += "\n\nRELEVANT USER SKILLS / PROJECT RULES:\n" + selected_skills
    user = f"Project: {body.project.name}\nBrief: {body.project.description}\nTask: {body.task}\n\nCurrent project files:\n{file_context or '(no files yet)'}"
    data = await provider_post(body.base_url, body.api_key, {"model": body.model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}], "temperature": 0.2, "response_format": {"type": "json_object"}})
    try:
        content = data["choices"][0]["message"]["content"]
        result = json.loads(content)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(502, "Model response did not match the required JSON schema. Try a model that supports JSON mode.") from exc
    safe_files = {}
    for path, content in (result.get("files") or {}).items():
        clean = path.replace("\\", "/").lstrip("/")
        if not clean or ".." in clean.split("/") or not isinstance(content, str):
            continue
        if len(content) > 500_000:
            raise HTTPException(413, f"Generated file is too large: {clean}")
        safe_files[clean] = content
    return {"summary": result.get("summary", "Implementation response received."), "plan": result.get("plan"), "files": safe_files}

@app.post("/api/agent/review")
async def review_project(body: ReviewRequest):
    selected_skills = select_relevant_skills(body.skills, body.project.kind or body.project.description, "review security code quality")
    if selected_skills:
        system = "Apply these review-specific standards:\\n" + selected_skills
    else:
        system = ""
    file_context = "\n\n".join(f"--- FILE: {path} ---\n{content[:14000]}" for path, content in list(body.project.files.items())[:45])
    system += "\\nYou are a rigorous senior software engineer and application security reviewer. Review only the supplied source; do not claim to run tests, scanners, or execute the app. Return ONLY JSON: {\"score\":number 0-10,\"summary\":string,\"findings\":[{\"severity\":\"high|medium|low|info\",\"title\":string,\"description\":string,\"file\":string|null,\"recommendation\":string}]}. Distinguish confirmed code issues from risks that need runtime validation. Never promise that a score means the project is vulnerability-free."
    data = await provider_post(body.base_url, body.api_key, {"model": body.model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": f"Project {body.project.name}\nBrief: {body.project.description}\nFiles:\n{file_context}"}], "temperature": 0.1, "response_format": {"type": "json_object"}})
    try:
        result = json.loads(data["choices"][0]["message"]["content"])
    except Exception as exc:
        raise HTTPException(502, "Reviewer response was not valid JSON") from exc
    result["score"] = max(0, min(10, float(result.get("score", 0))))
    return result

@app.post("/api/github/publish")
async def publish_to_github(body: PublishRequest):
    """Create a GitHub repository and upload source files. Token is used only for this request."""
    headers = {"Authorization": f"Bearer {body.token}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    async with httpx.AsyncClient(timeout=60) as client:
        me = await client.get("https://api.github.com/user", headers=headers)
        if me.status_code >= 400:
            raise HTTPException(me.status_code, "GitHub authentication failed. Check token and permissions.")
        login = me.json().get("login")
        owner = body.owner or login
        if owner != login:
            raise HTTPException(403, "This starter currently publishes only to the authenticated user's own account.")
        repo_name = re.sub(r"[^A-Za-z0-9_.-]", "-", body.repo_name).strip(".-")
        if not repo_name:
            raise HTTPException(400, "Repository name is invalid")
        created = await client.post("https://api.github.com/user/repos", headers=headers, json={"name": repo_name, "description": body.description[:350], "private": body.make_private, "auto_init": True})
        if created.status_code == 422:
            raise HTTPException(409, "Repository already exists. Choose another name or import the existing repository.")
        if created.status_code >= 400:
            raise HTTPException(created.status_code, f"Could not create repository: {created.text[:700]}")
        repo = created.json(); full = repo["full_name"]; branch = repo.get("default_branch", "main")
        readme = f"""# {repo_name}

{body.description or "Built with OneByte Coder."}

## Project type

{body.kind}

## Getting started

- Review the project files and install the dependencies required by the selected stack.
- Configure credentials through environment variables; never commit API keys or tokens.
- Use the generated GitHub Actions workflow for supported build or deployment targets.

## Build and deployment

For static websites, enable GitHub Pages in Settings → Pages → Build and deployment → GitHub Actions before the first deployment.
The workflow cannot enable repository Pages settings on its own.

- A successful source upload does not mean the build or deployment has completed.
- Android debug APKs are for testing and are not Play Store-signed releases.
- Windows executable packaging supports Python entry points and .NET projects.

---
Generated with [OneByte Coder](https://github.com/{login}/OneByte-Coder).
"""
        uploads = dict(body.files)
        uploads.setdefault("README.md", readme)
        kind = body.kind.strip().lower()
        build_workflow = None
        if kind in {"website", "web app", "web"}:
            build_workflow = """name: Build and deploy website
on:
  workflow_dispatch:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Build site
        shell: bash
        run: |
          if [ -f package.json ]; then
            npm install
            npm run build --if-present
          fi
          if [ -d dist ]; then echo "SITE_DIR=dist" >> "$GITHUB_ENV"
          elif [ -d build ]; then echo "SITE_DIR=build" >> "$GITHUB_ENV"
          else echo "SITE_DIR=." >> "$GITHUB_ENV"; fi
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ${{ env.SITE_DIR }}
      - id: deployment
        uses: actions/deploy-pages@v4
"""
        elif kind in {"android app", "android", "apk"}:
            build_workflow = """name: Build Android APK
on:
  workflow_dispatch:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - name: Build Capacitor Android app
        run: |
          npm install
          npm run build
          npx cap sync android
          sed -i 's/minSdkVersion = 22/minSdkVersion = 23/' android/variables.gradle
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug
      - uses: actions/upload-artifact@v4
        with:
          name: android-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: error
"""
        elif kind in {"desktop app", "desktop", "exe", "windows app"}:
            build_workflow = """name: Build Windows executable
on:
  workflow_dispatch:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  windows-exe:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Build Python desktop executable when entry point exists
        shell: pwsh
        run: |
          if (Test-Path *.csproj) {
            $project = Get-ChildItem *.csproj | Select-Object -First 1
            dotnet publish $project.FullName -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o publish
          } else {
            python -m pip install --upgrade pip
            if (Test-Path requirements.txt) { python -m pip install -r requirements.txt }
            $entry = @("main.py", "app.py", "src/main.py") | Where-Object { Test-Path $_ } | Select-Object -First 1
            if (!$entry) { throw "No Python entry point or .NET project was found." }
            python -m pip install pyinstaller
            pyinstaller --noconfirm --onefile --name OneByteApp $entry
          }
      - uses: actions/upload-artifact@v4
        if: success()
        with:
          name: windows-exe-or-build-output
          path: |
            dist/
            publish/\n          if-no-files-found: warn
"""
        elif kind in {"cli", "terminal", "command line"}:
            build_workflow = """name: Package CLI project
on:
  workflow_dispatch:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create source package
        run: zip -r cli-source.zip . -x '.git/*' '.github/*'
      - uses: actions/upload-artifact@v4
        with:
          name: cli-source-package
          path: cli-source.zip
"""
        if build_workflow:
            uploads[".github/workflows/onebyte-build.yml"] = build_workflow
        results = []
        for path, content in uploads.items():
            clean = path.replace("\\", "/").lstrip("/")
            if not clean or ".." in clean.split("/") or clean.startswith(".git/"):
                continue
            response = await client.put(f"https://api.github.com/repos/{full}/contents/{quote(clean, safe='/')}", headers=headers, json={"message": f"Add {clean}", "content": __import__('base64').b64encode(content.encode()).decode(), "branch": branch})
            if response.status_code >= 400:
                raise HTTPException(response.status_code, f"Upload failed for {clean}: {response.text[:500]}")
            results.append(clean)
    return {"repository": repo.get("html_url"), "branch": branch, "files_uploaded": len(results), "workflow_path": ".github/workflows/onebyte-build.yml" if build_workflow else None, "workflow_url": repo.get("html_url") + "/actions/workflows/onebyte-build.yml" if build_workflow else None, "pages_note": "Enable Settings → Pages → Build and deployment → GitHub Actions before the first static website deployment." if kind in {"website", "web app", "web"} else None}


# Streaming implementation endpoint. The frontend consumes newline-delimited JSON events
# and applies file chunks to Monaco as they arrive.
from fastapi.responses import StreamingResponse

def _ndjson(event: dict[str, Any]) -> str:
    return json.dumps(event, ensure_ascii=False, separators=(",", ":")) + "\n"

@app.post("/api/agent/execute/stream")
async def execute_agent_stream(body: AgentRequest):
    if not body.task.strip():
        raise HTTPException(400, "Task is required")
    if len(body.project.files) > 80:
        raise HTTPException(413, "Project has too many files for one model request")
    file_context = "\n\n".join(
        f"--- FILE: {path} ---\n{content[:14000]}"
        for path, content in list(body.project.files.items())[:35]
    )
    system = """You are OneByte Coder's implementation agent. Stream your answer in this exact plain-text protocol; do not use Markdown fences:
<ONEBYTE_SUMMARY>
A concise explanation of the changes.
</ONEBYTE_SUMMARY>
<ONEBYTE_FILE path="relative/path.ext">
COMPLETE FILE CONTENT HERE
<ONEBYTE_FILE_END>
Repeat ONEBYTE_FILE blocks for every file that must be created or fully replaced. File paths must be relative and must not contain .. segments. Do not emit partial snippets: each file block must contain the complete final file. Do not claim tests, runtime previews, visual inspection, security scans, or deployments were performed unless actual tool results are supplied. Keep secrets out of source files. Follow the supplied skills. The file end marker must be on its own line."""
    selected_skills = select_relevant_skills(body.skills, body.project.description, body.task)
    if selected_skills:
        system += "\n\nRELEVANT USER SKILLS / PROJECT RULES:\n" + selected_skills
    user = (
        f"Project: {body.project.name}\nBrief: {body.project.description}"
        f"\nTask: {body.task}\n\nCurrent project files:\n{file_context or '(no files yet)'}"
    )
    payload = {
        "model": body.model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": 0.2,
        "stream": True,
    }

    async def event_stream():
        buffer = ""
        state = "seek_summary"
        current_path: str | None = None
        total_chars = 0
        summary_parts: list[str] = []
        files_written: list[str] = []
        marker_summary = "<ONEBYTE_SUMMARY>"
        marker_summary_end = "</ONEBYTE_SUMMARY>"
        marker_file_end = "\n<ONEBYTE_FILE_END>"
        try:
            url = normalized_base(body.base_url) + "/chat/completions"
            async with httpx.AsyncClient(timeout=httpx.Timeout(240.0, connect=25.0)) as client:
                async with client.stream(
                    "POST", url,
                    headers={"Authorization": f"Bearer {body.api_key}", "Content-Type": "application/json"},
                    json=payload,
                ) as response:
                    if response.status_code >= 400:
                        detail = (await response.aread()).decode("utf-8", "replace")[:1000]
                        yield _ndjson({"type": "error", "message": f"Provider returned {response.status_code}: {detail}"})
                        return
                    async for line in response.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        raw = line[5:].strip()
                        if not raw or raw == "[DONE]":
                            continue
                        try:
                            packet = json.loads(raw)
                            delta = packet.get("choices", [{}])[0].get("delta", {}).get("content", "")
                        except (json.JSONDecodeError, IndexError, AttributeError, TypeError):
                            continue
                        if not isinstance(delta, str) or not delta:
                            continue
                        buffer += delta
                        while True:
                            if state == "seek_summary":
                                pos = buffer.find(marker_summary)
                                if pos < 0:
                                    buffer = buffer[-(len(marker_summary) - 1):]
                                    break
                                buffer = buffer[pos + len(marker_summary):]
                                state = "summary"
                            elif state == "summary":
                                pos = buffer.find(marker_summary_end)
                                if pos < 0:
                                    safe = max(0, len(buffer) - (len(marker_summary_end) - 1))
                                    piece, buffer = buffer[:safe], buffer[safe:]
                                    if piece:
                                        summary_parts.append(piece)
                                        yield _ndjson({"type": "summary_delta", "text": piece})
                                    break
                                piece, buffer = buffer[:pos], buffer[pos + len(marker_summary_end):]
                                if piece:
                                    summary_parts.append(piece)
                                    yield _ndjson({"type": "summary_delta", "text": piece})
                                state = "seek_file"
                            elif state == "seek_file":
                                match = re.search(r'<ONEBYTE_FILE\s+path="([^"]+)">', buffer)
                                if not match:
                                    buffer = buffer[-256:]
                                    break
                                current_path = match.group(1).replace("\\", "/").lstrip("/")
                                if (not current_path or ".." in current_path.split("/") or
                                    current_path.startswith(".git/") or len(current_path) > 240):
                                    yield _ndjson({"type": "error", "message": f"Unsafe generated file path: {current_path}"})
                                    return
                                buffer = buffer[match.end():]
                                state = "file"
                                yield _ndjson({"type": "file_start", "path": current_path})
                            elif state == "file":
                                pos = buffer.find(marker_file_end)
                                if pos < 0:
                                    safe = max(0, len(buffer) - (len(marker_file_end) - 1))
                                    piece, buffer = buffer[:safe], buffer[safe:]
                                    if piece:
                                        total_chars += len(piece)
                                        if total_chars > 4_000_000:
                                            yield _ndjson({"type": "error", "message": "Generated project exceeds the 4 MB response limit"})
                                            return
                                        yield _ndjson({"type": "file_delta", "path": current_path, "text": piece})
                                    break
                                piece, buffer = buffer[:pos], buffer[pos + len(marker_file_end):]
                                if piece.endswith("\r"):
                                    piece = piece[:-1]
                                total_chars += len(piece)
                                if total_chars > 4_000_000:
                                    yield _ndjson({"type": "error", "message": "Generated project exceeds the 4 MB response limit"})
                                    return
                                if piece:
                                    yield _ndjson({"type": "file_delta", "path": current_path, "text": piece})
                                files_written.append(current_path or "")
                                yield _ndjson({"type": "file_end", "path": current_path})
                                current_path = None
                                state = "seek_file"
                            else:
                                break
            if state == "file" and current_path:
                if buffer:
                    total_chars += len(buffer)
                    if total_chars > 4_000_000:
                        yield _ndjson({"type": "error", "message": "Generated project exceeds the 4 MB response limit"})
                        return
                    yield _ndjson({"type": "file_delta", "path": current_path, "text": buffer})
                files_written.append(current_path)
                yield _ndjson({"type": "file_end", "path": current_path})
            if not files_written:
                yield _ndjson({"type": "error", "message": "The model did not return any complete file blocks. Retry or choose a model that follows the streaming file protocol."})
                return
            yield _ndjson({
                "type": "done",
                "summary": "".join(summary_parts).strip() or "Code generation completed.",
                "files_written": files_written,
            })
        except httpx.RequestError as exc:
            yield _ndjson({"type": "error", "message": f"Provider stream failed: {exc}"})
        except Exception as exc:
            yield _ndjson({"type": "error", "message": f"Streaming failed: {str(exc)[:500]}"})

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )
