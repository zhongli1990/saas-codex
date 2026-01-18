import uuid
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI(title="Prompt Manager Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class CreateTemplateRequest(BaseModel):
    name: str
    description: str = ""
    template: str
    variables: list[str] = []


class TemplateResponse(BaseModel):
    template_id: str
    name: str
    description: str
    template: str
    variables: list[str]
    created_at: str
    version: int


class TemplateListResponse(BaseModel):
    items: list[TemplateResponse]


class RenderRequest(BaseModel):
    params: dict[str, str]


class RenderResponse(BaseModel):
    rendered: str


_templates: dict[str, dict] = {}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/templates", response_model=TemplateResponse)
async def create_template(req: CreateTemplateRequest) -> TemplateResponse:
    template_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat() + "Z"
    
    template = {
        "template_id": template_id,
        "name": req.name,
        "description": req.description,
        "template": req.template,
        "variables": req.variables,
        "created_at": created_at,
        "version": 1
    }
    _templates[template_id] = template
    
    return TemplateResponse(**template)


@app.get("/templates", response_model=TemplateListResponse)
async def list_templates() -> TemplateListResponse:
    items = [TemplateResponse(**t) for t in _templates.values()]
    return TemplateListResponse(items=items)


@app.get("/templates/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: str) -> TemplateResponse:
    template = _templates.get(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return TemplateResponse(**template)


@app.post("/templates/{template_id}/render", response_model=RenderResponse)
async def render_template(template_id: str, req: RenderRequest) -> RenderResponse:
    template = _templates.get(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    rendered = template["template"]
    for var, value in req.params.items():
        rendered = rendered.replace(f"{{{{{var}}}}}", value)
    
    return RenderResponse(rendered=rendered)
