import os

WORKSPACES_ROOT = os.environ.get("WORKSPACES_ROOT", "/workspaces")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-20250514")
PORT = int(os.environ.get("PORT", "8082"))
