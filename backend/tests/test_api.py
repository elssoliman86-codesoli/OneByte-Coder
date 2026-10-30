import json

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_plan_returns_structured_architecture(monkeypatch):
    async def fake_provider_post(base, key, payload):
        return {"choices": [{"message": {"content": json.dumps({
            "summary": "Plan ready",
            "plan": {
                "title": "Sample",
                "summary": "A test project",
                "steps": ["Create app"],
                "requirements": ["Responsive UI"],
                "architecture": "Frontend and API",
                "stack": ["React", "FastAPI"],
                "file_tree": ["src/main.jsx"],
                "acceptance_criteria": ["Loads on mobile"],
                "risks": []
            }
        })}}]}
    monkeypatch.setattr("app.main.provider_post", fake_provider_post)
    response = client.post("/api/agent/plan", json={
        "base_url": "https://provider.example/v1",
        "api_key": "test-secret",
        "model": "test-model",
        "name": "Sample",
        "description": "Build a responsive sample app",
        "kind": "Web app",
        "files": {}
    })
    assert response.status_code == 200
    assert response.json()["plan"]["stack"] == ["React", "FastAPI"]


def test_execute_rejects_path_traversal(monkeypatch):
    async def fake_provider_post(base, key, payload):
        return {"choices": [{"message": {"content": json.dumps({
            "summary": "Generated",
            "plan": None,
            "files": {
                "../outside.txt": "must not be returned",
                ".env": "API_KEY=must-not-be-written",
                "id_rsa": "private key",
                "src/main.py": "print('ok')"
            }
        })}}]}
    monkeypatch.setattr("app.main.provider_post", fake_provider_post)
    response = client.post("/api/agent/execute", json={
        "base_url": "https://provider.example/v1",
        "api_key": "test-secret",
        "model": "test-model",
        "task": "Create a Python file",
        "project": {"name": "Sample", "description": "CLI", "files": {}}
    })
    assert response.status_code == 200
    assert response.json()["files"] == {"src/main.py": "print('ok')"}


def test_execute_rejects_oversized_generated_file(monkeypatch):
    async def fake_provider_post(base, key, payload):
        return {"choices": [{"message": {"content": json.dumps({
            "summary": "Generated",
            "files": {"large.txt": "x" * 500001}
        })}}]}
    monkeypatch.setattr("app.main.provider_post", fake_provider_post)
    response = client.post("/api/agent/execute", json={
        "base_url": "https://provider.example/v1",
        "api_key": "test-secret",
        "model": "test-model",
        "task": "Create a large file",
        "project": {"name": "Sample", "description": "", "files": {}}
    })
    assert response.status_code == 413


def test_review_score_is_clamped(monkeypatch):
    async def fake_provider_post(base, key, payload):
        return {"choices": [{"message": {"content": json.dumps({
            "score": 14,
            "summary": "Reviewed",
            "findings": []
        })}}]}
    monkeypatch.setattr("app.main.provider_post", fake_provider_post)
    response = client.post("/api/agent/review", json={
        "base_url": "https://provider.example/v1",
        "api_key": "test-secret",
        "model": "test-model",
        "project": {"name": "Sample", "description": "", "files": {}}
    })
    assert response.status_code == 200
    assert response.json()["score"] == 10


def test_stream_requires_non_empty_task():
    response = client.post("/api/agent/execute/stream", json={
        "base_url": "https://provider.example/v1",
        "api_key": "test-secret",
        "model": "test-model",
        "task": " ",
        "project": {"name": "Sample", "description": "", "files": {}}
    })
    assert response.status_code == 400

def test_skill_selector_filters_by_project_type():
    from app.main import select_relevant_skills

    skills = """# Skills
## 1. Requirement analysis — always
Always clarify requirements.
## 2. Premium UI and visual design
Use a design system.
## 3. CLI and terminal engineering
Use predictable CLI behavior.
"""
    web = select_relevant_skills(skills, "Website", "Build a responsive landing page")
    cli = select_relevant_skills(skills, "CLI", "Build a command line utility")
    assert "Requirement analysis" in web
    assert "Premium UI" in web
    assert "CLI and terminal" not in web
    assert "CLI and terminal" in cli
    assert "Premium UI" not in cli

def test_github_import_requires_owner_repo_format():
    response = client.post("/api/github/import", json={
        "token": "test-token",
        "repository": "not-a-repository-path"
    })
    assert response.status_code == 400


def test_publish_to_existing_repository_uses_owner_and_default_branch(monkeypatch):
    uploaded = {}

    class FakeResponse:
        def __init__(self, status_code, payload=None):
            self.status_code = status_code
            self._payload = payload or {}
            self.text = json.dumps(self._payload)

        def json(self):
            return self._payload

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, url, **kwargs):
            if url.endswith("/repos/acme/sample"):
                return FakeResponse(200, {
                    "name": "sample",
                    "full_name": "acme/sample",
                    "html_url": "https://github.com/acme/sample",
                    "default_branch": "trunk",
                    "owner": {"login": "acme"}
                })
            if "/contents/" in url:
                return FakeResponse(404, {"message": "Not Found"})
            raise AssertionError(f"Unexpected GET: {url}")

        async def put(self, url, **kwargs):
            uploaded[url] = kwargs["json"]
            return FakeResponse(201, {"content": {"path": url.rsplit("/", 1)[-1]}})

    monkeypatch.setattr("app.main.httpx.AsyncClient", FakeAsyncClient)
    response = client.post("/api/github/publish", json={
        "token": "test-token",
        "repo_name": "sample",
        "existing_repo": "acme/sample",
        "description": "A sample website",
        "kind": "Website",
        "files": {"index.html": "<h1>Hello</h1>"}
    })

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["repository"] == "https://github.com/acme/sample"
    assert payload["branch"] == "trunk"
    assert payload["files_uploaded"] == 3
    readme = next(v for k, v in uploaded.items() if k.endswith("/README.md"))["content"]
    import base64
    readme_text = base64.b64decode(readme).decode()
    assert readme_text.startswith("# sample")
    assert "https://github.com/acme/OneByte-Coder" in readme_text
    workflow = next(v for k, v in uploaded.items() if k.endswith("/onebyte-build.yml"))["content"]
    workflow_text = base64.b64decode(workflow).decode()
    assert 'branches: ["trunk"]' in workflow_text


def test_model_test_reports_provider_http_status(monkeypatch):
    class FakeResponse:
        status_code = 401
        text = "Invalid API key"

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr("app.main.httpx.AsyncClient", FakeAsyncClient)
    response = client.post("/api/providers/test-model", json={
        "base_url": "https://provider.example/v1",
        "api_key": "bad-key",
        "model": "sample-model"
    })
    assert response.status_code == 200
    assert response.json()["ok"] is False
    assert response.json()["http_status"] == 401
    assert response.json()["detail"] == "Invalid API key"


def test_skill_selector_includes_desktop_and_provider_skills():
    from app.main import select_relevant_skills

    skills = """# Skills
## 1. Requirement analysis — always
Analyze the brief.
## 2. Model provider integration — AI and API clients
Handle provider APIs.
## 3. Desktop application engineering — desktop, Windows and EXE
Package native apps.
"""
    selected = select_relevant_skills(skills, "Desktop app", "Build a Windows executable")
    assert "Requirement analysis" in selected
    assert "Model provider integration" in selected
    assert "Desktop application engineering" in selected


def test_skill_selector_treats_python_project_as_cli():
    from app.main import select_relevant_skills

    skills = """# Skills
## 1. CLI and terminal engineering
Build predictable commands.
"""
    selected = select_relevant_skills(skills, "Python", "Create a local script")
    assert "CLI and terminal engineering" in selected


def test_publish_path_and_secret_guards():
    from fastapi import HTTPException
    from app.main import is_sensitive_project_path, normalize_project_path, validate_publish_files

    assert normalize_project_path(r"src\main.py") == "src/main.py"
    assert normalize_project_path(r"src\\main.py") == "src/main.py"
    assert normalize_project_path("../outside.txt") is None
    assert normalize_project_path(r"C:\private\secret.txt") is None
    assert is_sensitive_project_path(".env.production")
    assert not is_sensitive_project_path(".env.example")
    with pytest.raises(HTTPException) as error:
        validate_publish_files({".env.production": "TOKEN=do-not-upload"})
    assert error.value.status_code == 400


def test_generated_workflow_uses_actual_branch_and_valid_yaml_lines():
    from app.main import finalize_build_workflow

    workflow = """on:
  push:
    branches: [main]
"""
    finalized = finalize_build_workflow(workflow, "trunk")
    assert 'branches: ["trunk"]' in finalized
    assert "branches: [main]" not in finalized


def test_stream_rejects_truncated_file_instead_of_marking_it_complete(monkeypatch):
    class FakeStreamResponse:
        status_code = 200

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def aiter_lines(self):
            content = '<ONEBYTE_SUMMARY>Partial</ONEBYTE_SUMMARY><ONEBYTE_FILE path="src/main.py">print("partial")'
            packet = {"choices": [{"delta": {"content": content}}]}
            yield "data: " + json.dumps(packet)
            yield "data: [DONE]"

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        def stream(self, *args, **kwargs):
            return FakeStreamResponse()

    monkeypatch.setattr("app.main.httpx.AsyncClient", FakeAsyncClient)
    response = client.post("/api/agent/execute/stream", json={
        "base_url": "https://provider.example/v1",
        "api_key": "test-secret",
        "model": "test-model",
        "task": "Create a Python file",
        "project": {"name": "Sample", "description": "CLI", "kind": "CLI", "files": {}}
    })
    assert response.status_code == 200, response.text
    events = [json.loads(line) for line in response.text.splitlines() if line.strip()]
    assert any(event.get("type") == "error" and "file-end marker" in event.get("message", "") for event in events), response.text
    assert not any(event.get("type") == "done" for event in events)
    assert not any(event.get("type") == "file_end" for event in events)


def test_review_handles_non_numeric_score_and_invalid_findings(monkeypatch):
    async def fake_provider_post(base, key, payload):
        return {"choices": [{"message": {"content": json.dumps({
            "score": "excellent",
            "summary": "Reviewed",
            "findings": "not-a-list"
        })}}]}
    monkeypatch.setattr("app.main.provider_post", fake_provider_post)
    response = client.post("/api/agent/review", json={
        "base_url": "https://provider.example/v1",
        "api_key": "test-secret",
        "model": "test-model",
        "project": {"name": "Sample", "description": "", "files": {}}
    })
    assert response.status_code == 200
    assert response.json()["score"] == 0
    assert response.json()["findings"] == []
