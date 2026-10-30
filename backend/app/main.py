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

class PublishRequest(BaseModel):
    token: str
    owner: str | None = None
    repo_name: str
    description: str = ""
    files: dict[str, str]
    make_private: bool = False


def normalized_base(url: str) -> str:
    value = url.strip().rstrip("/")
    if not value.startswith(("http://", "https://")):
        raise HTTPException(400, "Base URL must start with http:// or https://")
    return value

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
    models = [{"id": row.get("id", ""), "owned_by": row.get("owned_by"), "created": row.get("created")} for row in rows if row.get("id")]
    return {"models": models, "metadata_note": "The OpenAI-compatible models endpoint generally does not provide verified pricing, context-window limits, or coding benchmark scores."}

@app.post("/api/agent/execute")
async def execute_agent(body: AgentRequest):
    if not body.task.strip():
        raise HTTPException(400, "Task is required")
    file_context = "\n\n".join(f"--- FILE: {path} ---\n{content[:18000]}" for path, content in list(body.project.files.items())[:35])
    system = """You are OneByte Coder's implementation agent. First understand the user's request and the project architecture. Return ONLY valid JSON with this schema: {\"summary\":string,\"plan\":{\"title\":string,\"summary\":string,\"steps\":[string]},\"files\":{\"relative/path\":\"complete replacement file content\"}}. Only include files that must be created or fully replaced. Never use markdown fences. Do not claim tests, runtime previews, visual inspection, security scans, or deployments were performed unless actual tool results are supplied. Keep secrets out of source files. Prefer maintainable, production-minded code and explain important tradeoffs in summary. If the user asks for a large feature, implement a coherent vertical slice rather than stubs."""
    if body.skills.strip():
        system += "\n\nUSER SKILLS / PROJECT RULES:\n" + body.skills[:12000]
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
    file_context = "\n\n".join(f"--- FILE: {path} ---\n{content[:14000]}" for path, content in list(body.project.files.items())[:45])
    system = "You are a rigorous senior software engineer and application security reviewer. Review only the supplied source; do not claim to run tests, scanners, or execute the app. Return ONLY JSON: {\"score\":number 0-10,\"summary\":string,\"findings\":[{\"severity\":\"high|medium|low|info\",\"title\":string,\"description\":string,\"file\":string|null,\"recommendation\":string}]}. Distinguish confirmed code issues from risks that need runtime validation. Never promise that a score means the project is vulnerability-free."
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
        readme = f"# {repo_name}\n\n{body.description or 'Built with OneByte Coder.'}\n\n## Development\n\nSee project files for setup instructions.\n\n---\nGenerated with [OneByte Coder](https://github.com/{login}/OneByte-Coder).\n"
        uploads = dict(body.files)
        uploads.setdefault("README.md", readme)
        results = []
        for path, content in uploads.items():
            clean = path.replace("\\", "/").lstrip("/")
            if not clean or ".." in clean.split("/") or clean.startswith(".git/"):
                continue
            response = await client.put(f"https://api.github.com/repos/{full}/contents/{quote(clean, safe='/')}", headers=headers, json={"message": f"Add {clean}", "content": __import__('base64').b64encode(content.encode()).decode(), "branch": branch})
            if response.status_code >= 400:
                raise HTTPException(response.status_code, f"Upload failed for {clean}: {response.text[:500]}")
            results.append(clean)
    return {"repository": repo.get("html_url"), "branch": branch, "files_uploaded": len(results), "pages_note": "GitHub Pages can be enabled for static web projects after adding a build workflow. APK/EXE artifacts require platform-specific CI builds."}
