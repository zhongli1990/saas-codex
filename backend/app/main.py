import asyncio
import os
import pathlib
import subprocess
import uuid
from typing import AsyncIterator, Literal

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel


WORKSPACES_ROOT = os.environ.get("WORKSPACES_ROOT", "/workspaces")
RUNNER_URL = os.environ.get("RUNNER_URL", "http://runner:8081")
RUNNER_CODEX_URL = os.environ.get("RUNNER_CODEX_URL", "http://runner:8081")
RUNNER_CLAUDE_URL = os.environ.get("RUNNER_CLAUDE_URL", "http://claude-runner:8082")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


RunnerType = Literal["codex", "claude"]


class CreateSessionRequest(BaseModel):
    repo_url: str
    runner_type: RunnerType = "codex"


class CreateSessionResponse(BaseModel):
    session_id: str
    repo_path: str
    thread_id: str
    runner_type: RunnerType


class PromptRequest(BaseModel):
    prompt: str


class PromptResponse(BaseModel):
    run_id: str


_sessions: dict[str, dict[str, str]] = {}
_runs: dict[str, str] = {}


def _get_runner_url(runner_type: RunnerType) -> str:
    if runner_type == "claude":
        return RUNNER_CLAUDE_URL
    return RUNNER_CODEX_URL


def _workspace_dir_for_session(session_id: str) -> str:
    root = pathlib.Path(WORKSPACES_ROOT)
    root.mkdir(parents=True, exist_ok=True)
    return str(root / session_id / "repo")


def _ensure_under_workspaces_root(path_str: str) -> str:
    root = pathlib.Path(WORKSPACES_ROOT).resolve()
    path = pathlib.Path(path_str).resolve()
    if not str(path).startswith(str(root)):
        raise HTTPException(status_code=400, detail="invalid workspace path")
    return str(path)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/sessions", response_model=CreateSessionResponse)
async def create_session(req: CreateSessionRequest) -> CreateSessionResponse:
    session_id = str(uuid.uuid4())
    repo_path = _workspace_dir_for_session(session_id)
    repo_path = _ensure_under_workspaces_root(repo_path)

    parent = pathlib.Path(repo_path).parent
    parent.mkdir(parents=True, exist_ok=True)

    result = subprocess.run(
        ["git", "clone", "--depth", "1", req.repo_url, repo_path],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise HTTPException(status_code=400, detail=f"git clone failed: {result.stderr.strip()}")

    runner_url = _get_runner_url(req.runner_type)

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{runner_url}/threads",
            json={"workingDirectory": repo_path, "skipGitRepoCheck": False},
        )
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"runner error: {r.text}")
        data = r.json()

    thread_id = data.get("threadId")
    if not thread_id:
        raise HTTPException(status_code=502, detail="runner did not return threadId")

    _sessions[session_id] = {"repo_path": repo_path, "thread_id": thread_id, "runner_type": req.runner_type}
    return CreateSessionResponse(session_id=session_id, repo_path=repo_path, thread_id=thread_id, runner_type=req.runner_type)


@app.post("/api/sessions/{session_id}/prompt", response_model=PromptResponse)
async def prompt(session_id: str, req: PromptRequest) -> PromptResponse:
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="session not found")

    runner_type = session.get("runner_type", "codex")
    runner_url = _get_runner_url(runner_type)

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{runner_url}/runs",
            json={"threadId": session["thread_id"], "prompt": req.prompt},
        )
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"runner error: {r.text}")
        data = r.json()

    run_id = data.get("runId")
    if not run_id:
        raise HTTPException(status_code=502, detail="runner did not return runId")

    _runs[run_id] = runner_type

    return PromptResponse(run_id=run_id)


@app.get("/api/runs/{run_id}/events")
async def run_events(run_id: str) -> StreamingResponse:
    runner_type = _runs.get(run_id, "codex")
    runner_url = _get_runner_url(runner_type)

    async def stream() -> AsyncIterator[bytes]:
        yield b": connected\n\n"
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "GET",
                f"{runner_url}/runs/{run_id}/events",
                headers={"Accept": "text/event-stream"},
            ) as r:
                if r.status_code >= 400:
                    yield f"data: {{\"type\":\"error\",\"message\":{r.text!r}}}\n\n".encode("utf-8")
                    return
                async for chunk in r.aiter_bytes():
                    yield chunk

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
