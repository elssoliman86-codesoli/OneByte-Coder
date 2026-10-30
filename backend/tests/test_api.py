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
