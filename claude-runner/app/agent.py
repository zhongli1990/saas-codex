import json
from typing import Any, AsyncIterator

import anthropic

from .config import ANTHROPIC_API_KEY, CLAUDE_MODEL, WORKSPACES_ROOT
from .tools import TOOLS, execute_tool
from .events import make_event, format_sse


SYSTEM_PROMPT = """You are an AI coding assistant with access to a workspace directory. You can read files, write files, list directories, and execute bash commands to help the user with their coding tasks.

When working on code:
1. First explore the codebase to understand its structure
2. Make targeted, minimal changes
3. Test your changes when possible
4. Explain what you're doing

Always use the available tools to interact with the filesystem rather than asking the user to do it manually."""


async def run_agent_loop(
    thread_id: str,
    run_id: str,
    prompt: str,
    working_directory: str
) -> AsyncIterator[str]:
    """Run the agent loop and yield SSE events."""
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    
    messages: list[dict[str, Any]] = [
        {"role": "user", "content": prompt}
    ]
    
    seq = 0
    
    yield format_sse(make_event(run_id, "run.started", {"threadId": thread_id}, seq))
    seq += 1
    
    yield format_sse(make_event(run_id, "ui.message.user", {"text": prompt}, seq))
    seq += 1
    
    max_iterations = 20
    iteration = 0
    
    while iteration < max_iterations:
        iteration += 1
        
        try:
            with client.messages.stream(
                model=CLAUDE_MODEL,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=messages,
                tools=TOOLS
            ) as stream:
                accumulated_text = ""
                tool_use_blocks: list[dict[str, Any]] = []
                current_tool_input = ""
                current_tool_id = ""
                current_tool_name = ""
                
                for event in stream:
                    if event.type == "content_block_start":
                        if hasattr(event.content_block, "type"):
                            if event.content_block.type == "tool_use":
                                current_tool_id = event.content_block.id
                                current_tool_name = event.content_block.name
                                current_tool_input = ""
                    
                    elif event.type == "content_block_delta":
                        if hasattr(event.delta, "text"):
                            text_delta = event.delta.text
                            accumulated_text += text_delta
                            yield format_sse(make_event(
                                run_id,
                                "ui.message.assistant.delta",
                                {"textDelta": text_delta},
                                seq
                            ))
                            seq += 1
                        
                        elif hasattr(event.delta, "partial_json"):
                            current_tool_input += event.delta.partial_json
                    
                    elif event.type == "content_block_stop":
                        if current_tool_id and current_tool_name:
                            try:
                                tool_input = json.loads(current_tool_input) if current_tool_input else {}
                            except json.JSONDecodeError:
                                tool_input = {}
                            
                            tool_use_blocks.append({
                                "id": current_tool_id,
                                "name": current_tool_name,
                                "input": tool_input
                            })
                            
                            yield format_sse(make_event(
                                run_id,
                                "ui.tool.call",
                                {"toolName": current_tool_name, "input": tool_input},
                                seq
                            ))
                            seq += 1
                            
                            current_tool_id = ""
                            current_tool_name = ""
                            current_tool_input = ""
                
                final_message = stream.get_final_message()
                stop_reason = final_message.stop_reason
                
                if accumulated_text:
                    yield format_sse(make_event(
                        run_id,
                        "ui.message.assistant.final",
                        {"text": accumulated_text, "format": "markdown"},
                        seq
                    ))
                    seq += 1
                
                if stop_reason == "end_turn" and not tool_use_blocks:
                    yield format_sse(make_event(run_id, "run.completed", {"threadId": thread_id}, seq))
                    return
                
                if stop_reason == "tool_use" or tool_use_blocks:
                    assistant_content: list[dict[str, Any]] = []
                    
                    if accumulated_text:
                        assistant_content.append({"type": "text", "text": accumulated_text})
                    
                    for tool_block in tool_use_blocks:
                        assistant_content.append({
                            "type": "tool_use",
                            "id": tool_block["id"],
                            "name": tool_block["name"],
                            "input": tool_block["input"]
                        })
                    
                    messages.append({"role": "assistant", "content": assistant_content})
                    
                    tool_results: list[dict[str, Any]] = []
                    for tool_block in tool_use_blocks:
                        result = execute_tool(
                            tool_block["name"],
                            tool_block["input"],
                            working_directory,
                            WORKSPACES_ROOT
                        )
                        
                        yield format_sse(make_event(
                            run_id,
                            "ui.tool.result",
                            {"toolName": tool_block["name"], "output": result},
                            seq
                        ))
                        seq += 1
                        
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tool_block["id"],
                            "content": json.dumps(result)
                        })
                    
                    messages.append({"role": "user", "content": tool_results})
                else:
                    yield format_sse(make_event(run_id, "run.completed", {"threadId": thread_id}, seq))
                    return
        
        except anthropic.APIError as e:
            yield format_sse(make_event(run_id, "error", {"message": str(e)}, seq))
            return
    
    yield format_sse(make_event(run_id, "error", {"message": "Max iterations reached"}, seq))
