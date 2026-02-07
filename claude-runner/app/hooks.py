"""
Pre/post tool use hooks for Claude Agent SDK.

Hooks provide validation and security controls for tool execution.
"""

from typing import Any

from .config import ENABLE_HOOKS


# Patterns that should be blocked in bash commands
BLOCKED_BASH_PATTERNS = [
    "rm -rf /",
    "rm -rf /*",
    "sudo rm",
    "chmod 777 /",
    "> /dev/sda",
    "> /dev/null",
    "mkfs.",
    "dd if=",
    ":(){:|:&};:",  # Fork bomb
    "curl | bash",
    "wget | bash",
    "curl | sh",
    "wget | sh",
]

# Patterns that indicate path escape attempts
PATH_ESCAPE_PATTERNS = [
    "../",
    "..\\",
]


async def pre_tool_use_hook(input_data: dict[str, Any], tool_use_id: str, context: Any) -> dict[str, Any]:
    """
    Hook called before tool execution.
    
    Returns empty dict to allow, or dict with hookSpecificOutput to deny.
    """
    if not ENABLE_HOOKS:
        return {}
    
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    
    # Check bash commands for dangerous patterns
    if tool_name == "Bash":
        command = tool_input.get("command", "")
        for pattern in BLOCKED_BASH_PATTERNS:
            if pattern in command:
                return {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": f"Blocked dangerous pattern: {pattern}",
                    }
                }
    
    # Check file operations for path escape attempts
    if tool_name in ["Read", "Write", "Edit", "read_file", "write_file"]:
        path = tool_input.get("path", "") or tool_input.get("file_path", "")
        for pattern in PATH_ESCAPE_PATTERNS:
            if pattern in path:
                return {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": f"Path escape attempt blocked: {pattern}",
                    }
                }
        
        # Block absolute paths outside workspace
        if path.startswith("/") and not path.startswith("/workspaces"):
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": "Absolute paths outside /workspaces are not allowed",
                }
            }
    
    return {}  # Allow


async def post_tool_use_hook(input_data: dict[str, Any], tool_use_id: str, result: Any, context: Any) -> dict[str, Any]:
    """
    Hook called after tool execution.
    
    Can be used for audit logging, result validation, etc.
    """
    if not ENABLE_HOOKS:
        return {}
    
    # Future: Add audit logging here
    # tool_name = input_data.get("tool_name", "")
    # tool_input = input_data.get("tool_input", {})
    # Log to audit trail...
    
    return {}


def get_hook_matchers() -> dict[str, list[dict[str, Any]]]:
    """
    Get hook matchers for Claude Agent SDK.
    
    Returns dict mapping hook event names to list of matchers.
    """
    if not ENABLE_HOOKS:
        return {}
    
    return {
        "PreToolUse": [
            {"matcher": "*", "hooks": [pre_tool_use_hook]},
        ],
        "PostToolUse": [
            {"matcher": "*", "hooks": [post_tool_use_hook]},
        ],
    }
