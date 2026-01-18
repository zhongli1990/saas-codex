import asyncio
import json
import os
import pathlib
import re
import shutil
import subprocess
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncIterator, Literal, Optional

import httpx
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from .database import engine, async_session_maker, Base
from .repositories import WorkspaceRepository, SessionRepository, RunRepository


WORKSPACES_ROOT = os.environ.get("WORKSPACES_ROOT", "/workspaces")
RUNNER_URL = os.environ.get("RUNNER_URL", "http://runner:8081")
RUNNER_CODEX_URL = os.environ.get("RUNNER_CODEX_URL", "http://runner:8081")
RUNNER_CLAUDE_URL = os.environ.get("RUNNER_CLAUDE_URL", "http://claude-runner:8082")


def _derive_display_name(source_type: str, source_uri: str) -> str:
    if source_type == "github":
        match = re.search(r"github\.com[/:]([^/]+)/([^/.]+)", source_uri)
        if match:
            return f"{match.group(1)}/{match.group(2)}"
        return source_uri.split("/")[-1].replace(".git", "")
    else:
        return pathlib.Path(source_uri).name


async def scan_and_import_existing_workspaces():
    """Scan the workspaces directory and import any existing workspaces into the database."""
    workspaces_path = pathlib.Path(WORKSPACES_ROOT)
    if not workspaces_path.exists():
        return
    
    async with async_session_maker() as db:
        repo = WorkspaceRepository(db)
        
        for workspace_dir in workspaces_path.iterdir():
            if not workspace_dir.is_dir():
                continue
            
            repo_path = workspace_dir / "repo"
            if not repo_path.exists():
                continue
            
            # Try to get git remote URL
            try:
                result = subprocess.run(
                    ["git", "remote", "get-url", "origin"],
                    cwd=str(repo_path),
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    source_uri = result.stdout.strip()
                    source_type = "github" if "github.com" in source_uri else "local"
                else:
                    source_uri = str(repo_path)
                    source_type = "local"
            except Exception:
                source_uri = str(repo_path)
                source_type = "local"
            
            # Check if already exists
            existing = await repo.get_by_source(source_type, source_uri)
            if existing:
                continue
            
            # Also check by local path to avoid duplicates
            existing_by_path = await repo.get_by_id(uuid.UUID(workspace_dir.name)) if _is_valid_uuid(workspace_dir.name) else None
            if existing_by_path:
                continue
            
            # Derive display name
            display_name = _derive_display_name(source_type, source_uri)
            
            # Create workspace entry
            try:
                workspace_id = uuid.UUID(workspace_dir.name) if _is_valid_uuid(workspace_dir.name) else uuid.uuid4()
                await repo.create(
                    source_type=source_type,
                    source_uri=source_uri,
                    display_name=display_name,
                    local_path=str(repo_path)
                )
                print(f"Imported existing workspace: {display_name} ({source_uri})")
            except Exception as e:
                print(f"Failed to import workspace {workspace_dir.name}: {e}")


def _is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except ValueError:
        return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Scan and import existing workspaces
    await scan_and_import_existing_workspaces()
    
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


RunnerType = Literal["codex", "claude"]
SourceType = Literal["github", "local"]


class ImportWorkspaceRequest(BaseModel):
    source_type: SourceType
    source_uri: str
    display_name: Optional[str] = None


class WorkspaceResponse(BaseModel):
    workspace_id: str
    display_name: str
    source_type: str
    source_uri: str
    local_path: str
    created_at: str


class WorkspaceListResponse(BaseModel):
    items: list[WorkspaceResponse]


class CreateSessionRequest(BaseModel):
    repo_url: Optional[str] = None
    workspace_id: Optional[str] = None
    runner_type: RunnerType = "codex"


class SessionResponse(BaseModel):
    session_id: str
    workspace_id: str
    runner_type: str
    thread_id: str
    created_at: str
    run_count: int = 0


class SessionListResponse(BaseModel):
    items: list[SessionResponse]


class CreateSessionResponse(BaseModel):
    session_id: str
    repo_path: str
    thread_id: str
    runner_type: RunnerType
    workspace_id: Optional[str] = None


class PromptRequest(BaseModel):
    prompt: str


class PromptResponse(BaseModel):
    run_id: str


class RunResponse(BaseModel):
    run_id: str
    session_id: str
    prompt: str
    status: str
    created_at: str
    completed_at: Optional[str] = None


class RunListResponse(BaseModel):
    items: list[RunResponse]


class TranscriptMessage(BaseModel):
    role: str
    content: str
    tool_name: Optional[str] = None
    tool_input: Optional[dict] = None
    tool_output: Optional[dict] = None


class TranscriptResponse(BaseModel):
    run_id: str
    messages: list[TranscriptMessage]


async def get_db() -> AsyncIterator[AsyncSession]:
    async with async_session_maker() as session:
        yield session


def _get_runner_url(runner_type: str) -> str:
    if runner_type == "claude":
        return RUNNER_CLAUDE_URL
    return RUNNER_CODEX_URL


def _workspace_dir_for_id(workspace_id: str) -> str:
    root = pathlib.Path(WORKSPACES_ROOT)
    root.mkdir(parents=True, exist_ok=True)
    return str(root / workspace_id / "repo")


def _ensure_under_workspaces_root(path_str: str) -> str:
    root = pathlib.Path(WORKSPACES_ROOT).resolve()
    path = pathlib.Path(path_str).resolve()
    if not str(path).startswith(str(root)):
        raise HTTPException(status_code=400, detail="invalid workspace path")
    return str(path)


def _format_datetime(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/workspaces/import", response_model=WorkspaceResponse)
async def import_workspace(
    req: ImportWorkspaceRequest,
    db: AsyncSession = Depends(get_db)
) -> WorkspaceResponse:
    repo = WorkspaceRepository(db)
    
    existing = await repo.get_by_source(req.source_type, req.source_uri)
    if existing:
        await repo.update_last_accessed(existing.id)
        return WorkspaceResponse(
            workspace_id=str(existing.id),
            display_name=existing.display_name,
            source_type=existing.source_type,
            source_uri=existing.source_uri,
            local_path=existing.local_path,
            created_at=_format_datetime(existing.created_at)
        )

    workspace_id = str(uuid.uuid4())
    display_name = req.display_name or _derive_display_name(req.source_type, req.source_uri)
    local_path = _workspace_dir_for_id(workspace_id)
    local_path = _ensure_under_workspaces_root(local_path)

    parent = pathlib.Path(local_path).parent
    parent.mkdir(parents=True, exist_ok=True)

    if req.source_type == "github":
        result = subprocess.run(
            ["git", "clone", "--depth", "1", req.source_uri, local_path],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise HTTPException(status_code=400, detail=f"git clone failed: {result.stderr.strip()}")
    elif req.source_type == "local":
        source_path = pathlib.Path(req.source_uri)
        if not source_path.exists():
            raise HTTPException(status_code=400, detail=f"Source path does not exist: {req.source_uri}")
        if source_path.is_dir():
            shutil.copytree(str(source_path), local_path)
        else:
            raise HTTPException(status_code=400, detail="Source path must be a directory")

    workspace = await repo.create(
        source_type=req.source_type,
        source_uri=req.source_uri,
        display_name=display_name,
        local_path=local_path
    )

    return WorkspaceResponse(
        workspace_id=str(workspace.id),
        display_name=workspace.display_name,
        source_type=workspace.source_type,
        source_uri=workspace.source_uri,
        local_path=workspace.local_path,
        created_at=_format_datetime(workspace.created_at)
    )


@app.get("/api/workspaces", response_model=WorkspaceListResponse)
async def list_workspaces(db: AsyncSession = Depends(get_db)) -> WorkspaceListResponse:
    repo = WorkspaceRepository(db)
    workspaces = await repo.list_all()
    items = [
        WorkspaceResponse(
            workspace_id=str(ws.id),
            display_name=ws.display_name,
            source_type=ws.source_type,
            source_uri=ws.source_uri,
            local_path=ws.local_path,
            created_at=_format_datetime(ws.created_at)
        )
        for ws in workspaces
    ]
    return WorkspaceListResponse(items=items)


@app.get("/api/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    db: AsyncSession = Depends(get_db)
) -> WorkspaceResponse:
    repo = WorkspaceRepository(db)
    ws = await repo.get_by_id(uuid.UUID(workspace_id))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return WorkspaceResponse(
        workspace_id=str(ws.id),
        display_name=ws.display_name,
        source_type=ws.source_type,
        source_uri=ws.source_uri,
        local_path=ws.local_path,
        created_at=_format_datetime(ws.created_at)
    )


@app.get("/api/workspaces/{workspace_id}/sessions", response_model=SessionListResponse)
async def list_workspace_sessions(
    workspace_id: str,
    db: AsyncSession = Depends(get_db)
) -> SessionListResponse:
    ws_repo = WorkspaceRepository(db)
    ws = await ws_repo.get_by_id(uuid.UUID(workspace_id))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    session_repo = SessionRepository(db)
    run_repo = RunRepository(db)
    sessions = await session_repo.list_by_workspace(uuid.UUID(workspace_id))
    
    items = []
    for s in sessions:
        runs = await run_repo.list_by_session(s.id)
        items.append(SessionResponse(
            session_id=str(s.id),
            workspace_id=str(s.workspace_id),
            runner_type=s.runner_type,
            thread_id=s.runner_thread_id,
            created_at=_format_datetime(s.created_at),
            run_count=len(runs)
        ))
    
    return SessionListResponse(items=items)


@app.post("/api/sessions", response_model=CreateSessionResponse)
async def create_session(
    req: CreateSessionRequest,
    db: AsyncSession = Depends(get_db)
) -> CreateSessionResponse:
    ws_repo = WorkspaceRepository(db)
    session_repo = SessionRepository(db)
    
    workspace_id_uuid: Optional[uuid.UUID] = None
    
    if req.workspace_id:
        workspace = await ws_repo.get_by_id(uuid.UUID(req.workspace_id))
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        workspace_id_uuid = workspace.id
        repo_path = workspace.local_path
        await ws_repo.update_last_accessed(workspace.id)
    elif req.repo_url:
        temp_workspace_id = str(uuid.uuid4())
        repo_path = _workspace_dir_for_id(temp_workspace_id)
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
        
        workspace = await ws_repo.create(
            source_type="github",
            source_uri=req.repo_url,
            display_name=_derive_display_name("github", req.repo_url),
            local_path=repo_path
        )
        workspace_id_uuid = workspace.id
    else:
        raise HTTPException(status_code=400, detail="Either workspace_id or repo_url is required")

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

    session = await session_repo.create(
        workspace_id=workspace_id_uuid,
        runner_type=req.runner_type,
        runner_thread_id=thread_id,
        working_directory=repo_path
    )

    return CreateSessionResponse(
        session_id=str(session.id),
        repo_path=repo_path,
        thread_id=thread_id,
        runner_type=req.runner_type,
        workspace_id=str(workspace_id_uuid) if workspace_id_uuid else None
    )


@app.get("/api/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
) -> SessionResponse:
    session_repo = SessionRepository(db)
    run_repo = RunRepository(db)
    
    session = await session_repo.get_by_id(uuid.UUID(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    runs = await run_repo.list_by_session(session.id)
    
    return SessionResponse(
        session_id=str(session.id),
        workspace_id=str(session.workspace_id),
        runner_type=session.runner_type,
        thread_id=session.runner_thread_id,
        created_at=_format_datetime(session.created_at),
        run_count=len(runs)
    )


@app.get("/api/sessions/{session_id}/runs", response_model=RunListResponse)
async def list_session_runs(
    session_id: str,
    db: AsyncSession = Depends(get_db)
) -> RunListResponse:
    session_repo = SessionRepository(db)
    run_repo = RunRepository(db)
    
    session = await session_repo.get_by_id(uuid.UUID(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    runs = await run_repo.list_by_session(session.id)
    
    items = [
        RunResponse(
            run_id=str(r.id),
            session_id=str(r.session_id),
            prompt=r.prompt[:100] + "..." if len(r.prompt) > 100 else r.prompt,
            status=r.status,
            created_at=_format_datetime(r.created_at),
            completed_at=_format_datetime(r.completed_at) if r.completed_at else None
        )
        for r in runs
    ]
    
    return RunListResponse(items=items)


@app.post("/api/sessions/{session_id}/prompt", response_model=PromptResponse)
async def prompt(
    session_id: str,
    req: PromptRequest,
    db: AsyncSession = Depends(get_db)
) -> PromptResponse:
    session_repo = SessionRepository(db)
    run_repo = RunRepository(db)
    
    session = await session_repo.get_by_id(uuid.UUID(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="session not found")

    runner_type = session.runner_type
    runner_url = _get_runner_url(runner_type)

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{runner_url}/runs",
            json={"threadId": session.runner_thread_id, "prompt": req.prompt},
        )
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"runner error: {r.text}")
        data = r.json()

    runner_run_id = data.get("runId")
    if not runner_run_id:
        raise HTTPException(status_code=502, detail="runner did not return runId")

    run = await run_repo.create(
        session_id=session.id,
        runner_run_id=runner_run_id,
        prompt=req.prompt
    )

    return PromptResponse(run_id=str(run.id))


@app.get("/api/runs/{run_id}", response_model=RunResponse)
async def get_run(
    run_id: str,
    db: AsyncSession = Depends(get_db)
) -> RunResponse:
    run_repo = RunRepository(db)
    run = await run_repo.get_by_id(uuid.UUID(run_id))
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    return RunResponse(
        run_id=str(run.id),
        session_id=str(run.session_id),
        prompt=run.prompt,
        status=run.status,
        created_at=_format_datetime(run.created_at),
        completed_at=_format_datetime(run.completed_at) if run.completed_at else None
    )


@app.get("/api/runs/{run_id}/transcript", response_model=TranscriptResponse)
async def get_run_transcript(
    run_id: str,
    db: AsyncSession = Depends(get_db)
) -> TranscriptResponse:
    run_repo = RunRepository(db)
    run = await run_repo.get_by_id(uuid.UUID(run_id))
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    events = await run_repo.get_events(run.id)
    
    messages: list[TranscriptMessage] = []
    current_assistant_text = ""
    
    for event in events:
        data = event.raw_json
        if not data or not isinstance(data, dict):
            continue
        
        event_type = data.get("type", "")
        
        if event_type == "ui.message.user":
            messages.append(TranscriptMessage(
                role="user",
                content=data.get("payload", {}).get("text", "")
            ))
        elif event_type == "ui.message.assistant.delta":
            current_assistant_text += data.get("payload", {}).get("textDelta", "")
        elif event_type == "ui.message.assistant.final":
            messages.append(TranscriptMessage(
                role="assistant",
                content=data.get("payload", {}).get("text", current_assistant_text)
            ))
            current_assistant_text = ""
        elif event_type == "ui.tool.call":
            payload = data.get("payload", {})
            messages.append(TranscriptMessage(
                role="tool",
                content=f"Calling {payload.get('toolName', 'unknown')}",
                tool_name=payload.get("toolName"),
                tool_input=payload.get("input")
            ))
        elif event_type == "ui.tool.result":
            payload = data.get("payload", {})
            messages.append(TranscriptMessage(
                role="tool",
                content=f"Result from {payload.get('toolName', 'unknown')}",
                tool_name=payload.get("toolName"),
                tool_output=payload.get("output")
            ))
    
    if current_assistant_text:
        messages.append(TranscriptMessage(
            role="assistant",
            content=current_assistant_text
        ))
    
    return TranscriptResponse(run_id=str(run.id), messages=messages)


@app.get("/api/runs/{run_id}/events")
async def run_events(
    run_id: str,
    db: AsyncSession = Depends(get_db)
) -> StreamingResponse:
    run_repo = RunRepository(db)
    session_repo = SessionRepository(db)
    
    run = await run_repo.get_by_id(uuid.UUID(run_id))
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    session = await session_repo.get_by_id(run.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    runner_type = session.runner_type
    runner_url = _get_runner_url(runner_type)
    runner_run_id = run.runner_run_id

    async def stream() -> AsyncIterator[bytes]:
        yield b": connected\n\n"
        seq = 0
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "GET",
                f"{runner_url}/runs/{runner_run_id}/events",
                headers={"Accept": "text/event-stream"},
            ) as r:
                if r.status_code >= 400:
                    yield f"data: {{\"type\":\"error\",\"message\":{r.text!r}}}\n\n".encode("utf-8")
                    return
                
                buffer = ""
                async for chunk in r.aiter_text():
                    buffer += chunk
                    while "\n\n" in buffer:
                        event_str, buffer = buffer.split("\n\n", 1)
                        yield (event_str + "\n\n").encode("utf-8")
                        
                        for line in event_str.split("\n"):
                            if line.startswith("data: "):
                                try:
                                    event_data = json.loads(line[6:])
                                    event_type = event_data.get("type")
                                    
                                    async with async_session_maker() as event_db:
                                        event_run_repo = RunRepository(event_db)
                                        await event_run_repo.add_event(
                                            run_id=run.id,
                                            seq=seq,
                                            event_type=event_type,
                                            raw_json=event_data
                                        )
                                        seq += 1
                                        
                                        if event_type in ("run.completed", "stream.closed"):
                                            await event_run_repo.update_status(
                                                run.id,
                                                "completed",
                                                datetime.now(timezone.utc)
                                            )
                                        elif event_type == "error":
                                            await event_run_repo.update_status(
                                                run.id,
                                                "error",
                                                datetime.now(timezone.utc)
                                            )
                                except json.JSONDecodeError:
                                    pass

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
