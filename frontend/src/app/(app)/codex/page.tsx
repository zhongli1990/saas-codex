"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppContext } from "@/contexts/AppContext";
import { FileBrowser, UploadModal } from "@/components/workspace";

type RunnerType = "codex" | "claude" | "gemini" | "azure" | "bedrock" | "openli" | "custom";

// Runner configuration with availability status
const RUNNERS = [
  { value: "claude", label: "Claude Agent", available: true },
  { value: "codex", label: "OpenAI Agent", available: true },
  { value: "gemini", label: "Gemini Agent", available: false },
  { value: "azure", label: "Azure OpenAI", available: false },
  { value: "bedrock", label: "AWS Bedrock", available: false },
  { value: "openli", label: "OpenLI Agent", available: false },
  { value: "custom", label: "Custom Agent", available: false },
] as const;

type EventLine = {
  at: number;
  data: any;
};

type TranscriptMessage = {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  toolId?: string;
  isBlocked?: boolean;
  skillName?: string;
  skillScope?: string;
  iteration?: { current: number; max: number };
};

type Run = {
  run_id: string;
  session_id: string;
  prompt: string;
  status: string;
  created_at: string;
  completed_at: string | null;
};

type Session = {
  session_id: string;
  workspace_id: string;
  runner_type: RunnerType;
  thread_id: string;
  created_at: string;
  run_count: number;
};

type DiscoveredFolder = {
  folder_name: string;
  path: string;
  has_git: boolean;
  git_remote: string | null;
  suggested_name: string;
};

function CodexPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    sessions,
    sessionId,
    setSessionId,
    runnerType,
    setRunnerType,
    codexEvents: events,
    setCodexEvents: setEvents,
    codexStatus: status,
    setCodexStatus: setStatus,
    codexRunId: runId,
    setCodexRunId: setRunId,
    fetchWorkspaces,
    fetchSessions,
  } = useAppContext();
  
  const [runs, setRuns] = useState<Run[]>([]);
  const [showImportForm, setShowImportForm] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [discoveredFolders, setDiscoveredFolders] = useState<DiscoveredFolder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [folderNames, setFolderNames] = useState<Record<string, string>>({});
  const [repoUrl, setRepoUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [viewMode, setViewMode] = useState<"transcript" | "raw" | "files">("transcript");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Initialize from URL params (only on first load)
  useEffect(() => {
    const wsParam = searchParams.get("workspace");
    const sessParam = searchParams.get("session");
    if (wsParam && !selectedWorkspaceId) setSelectedWorkspaceId(wsParam);
    if (sessParam && !sessionId) setSessionId(sessParam);
    // Pick up prefilled prompt from Prompts page
    const prefill = sessionStorage.getItem("prefill-prompt");
    if (prefill) {
      setPrompt(prefill);
      sessionStorage.removeItem("prefill-prompt");
    }
    setInitialized(true);
  }, [searchParams, selectedWorkspaceId, sessionId, setSelectedWorkspaceId, setSessionId]);

  // Update URL when workspace/session changes
  useEffect(() => {
    if (!initialized) return;
    const params = new URLSearchParams();
    if (selectedWorkspaceId) params.set("workspace", selectedWorkspaceId);
    if (sessionId) params.set("session", sessionId);
    const newUrl = params.toString() ? `?${params.toString()}` : "/codex";
    router.replace(newUrl, { scroll: false });
  }, [selectedWorkspaceId, sessionId, initialized, router]);

  const fetchRuns = useCallback(async (sessionId: string) => {
    try {
      const r = await fetch(`/api/sessions/${sessionId}/runs`);
      if (r.ok) {
        const data = await r.json();
        setRuns(data.items || []);
      }
    } catch (e) {
      console.error("Failed to fetch runs:", e);
    }
  }, []);

  const loadRunDetail = useCallback(async (runIdToLoad: string) => {
    try {
      setStatus("loading");
      const r = await fetch(`/api/runs/${runIdToLoad}/detail`);
      if (r.ok) {
        const data = await r.json();
        setPrompt(data.prompt);
        setRunId(runIdToLoad);
        setEvents(data.events || []);
        setStatus("completed");
      } else {
        setStatus("error: failed to load run");
      }
    } catch (e) {
      console.error("Failed to load run detail:", e);
      setStatus("error: failed to load run");
    }
  }, [setRunId, setEvents, setStatus]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchSessions(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId, fetchSessions]);

  useEffect(() => {
    if (sessionId) {
      fetchRuns(sessionId);
      // Note: Runner type is set explicitly in onContinueSession, not here
      // This prevents overwriting user's dropdown selection on page load
    } else {
      setRuns([]);
    }
  }, [sessionId, fetchRuns]);

  const eventsText = useMemo(() => {
    return events
      .map((e: EventLine) => `${new Date(e.at).toISOString()} ${JSON.stringify(e.data, null, 2)}`)
      .join("\n\n");
  }, [events]);

  const transcript = useMemo(() => {
    const messages: TranscriptMessage[] = [];
    let currentAssistantText = "";

    for (const event of events) {
      const data = event.data;
      if (!data || typeof data !== "object") continue;

      const eventType = data.type || "";

      // Handle Codex runner events
      if (eventType === "item.completed" && data.item) {
        const item = data.item;
        if (item.type === "command_execution") {
          messages.push({
            role: "tool",
            content: item.status === "completed" ? "Command executed" : "Command failed",
            toolName: "shell",
            toolInput: item.command,
            toolOutput: item.aggregated_output || `Exit code: ${item.exit_code}`
          });
        } else if (item.type === "agent_message" || item.text) {
          messages.push({ role: "assistant", content: item.text || "" });
        }
      } else if (eventType === "item.completed" && data.item?.type === "agent_message") {
        messages.push({ role: "assistant", content: data.item.text || "" });
      }

      // Handle agent_message directly (for final responses)
      if (eventType === "item.completed" && data.item?.type === "agent_message") {
        // Already handled above
      }

      // Handle Claude runner events (ui.* format)
      if (eventType === "ui.message.user") {
        messages.push({ role: "user", content: data.payload?.text || "" });
      } else if (eventType === "ui.message.assistant.delta") {
        currentAssistantText += data.payload?.textDelta || "";
      } else if (eventType === "ui.message.assistant.final") {
        messages.push({ role: "assistant", content: data.payload?.text || currentAssistantText });
        currentAssistantText = "";
      } else if (eventType === "ui.tool.call" || eventType === "ui.tool.call.start") {
        messages.push({
          role: "tool",
          content: `Calling ${data.payload?.toolName}`,
          toolName: data.payload?.toolName,
          toolId: data.payload?.toolId,
          toolInput: data.payload?.input
        });
      } else if (eventType === "ui.tool.result") {
        messages.push({
          role: "tool",
          content: `Result from ${data.payload?.toolName}`,
          toolName: data.payload?.toolName,
          toolId: data.payload?.toolId,
          toolOutput: data.payload?.output
        });
      } else if (eventType === "ui.tool.blocked") {
        messages.push({
          role: "tool",
          content: `Blocked: ${data.payload?.reason}`,
          toolName: data.payload?.toolName,
          toolId: data.payload?.toolId,
          isBlocked: true
        });
      } else if (eventType === "ui.skill.activated") {
        messages.push({
          role: "system",
          content: `Skill activated: ${data.payload?.skillName}`,
          skillName: data.payload?.skillName,
          skillScope: data.payload?.scope
        });
      } else if (eventType === "ui.iteration") {
        messages.push({
          role: "system",
          content: `Iteration ${data.payload?.current}/${data.payload?.max}`,
          iteration: { current: data.payload?.current, max: data.payload?.max }
        });
      }
    }

    if (currentAssistantText) {
      messages.push({ role: "assistant", content: currentAssistantText });
    }

    return messages;
  }, [events]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  async function onImportWorkspace() {
    if (!repoUrl) return;
    setStatus("importing");

    const r = await fetch("/api/workspaces/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_type: "github", source_uri: repoUrl })
    });

    if (!r.ok) {
      setStatus(`error: ${await r.text()}`);
      return;
    }

    const data = await r.json();
    setSelectedWorkspaceId(data.workspace_id);
    setShowImportForm(false);
    setRepoUrl("");
    setStatus("idle");
    await fetchWorkspaces();
  }

  async function onScanLocal() {
    setStatus("scanning");
    try {
      const r = await fetch("/api/workspaces/scan");
      if (r.ok) {
        const data = await r.json();
        setDiscoveredFolders(data.discovered || []);
        const names: Record<string, string> = {};
        for (const f of data.discovered || []) {
          names[f.folder_name] = f.suggested_name;
        }
        setFolderNames(names);
        setSelectedFolders(new Set((data.discovered || []).map((f: DiscoveredFolder) => f.folder_name)));
        setShowScanModal(true);
      }
    } catch (e) {
      console.error("Failed to scan:", e);
    }
    setStatus("idle");
  }

  async function onImportSelectedFolders() {
    setStatus("importing");
    for (const folderName of selectedFolders) {
      const displayName = folderNames[folderName] || folderName;
      try {
        await fetch("/api/workspaces/import-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder_name: folderName, display_name: displayName })
        });
      } catch (e) {
        console.error(`Failed to import ${folderName}:`, e);
      }
    }
    setShowScanModal(false);
    setDiscoveredFolders([]);
    setSelectedFolders(new Set());
    setStatus("idle");
    await fetchWorkspaces();
  }

  function toggleFolderSelection(folderName: string) {
    setSelectedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
  }

  async function onCreateSession() {
    if (!selectedWorkspaceId) return;
    setStatus("creating-session");
    setEvents([]);
    setRunId(null);

    const r = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: selectedWorkspaceId, runner_type: runnerType })
    });

    if (!r.ok) {
      setStatus(`error: ${await r.text()}`);
      return;
    }

    const data = await r.json();
    setSessionId(data.session_id);
    setStatus("session-ready");
    if (selectedWorkspaceId) {
      await fetchSessions(selectedWorkspaceId);
    }
  }

  async function onContinueSession(session: Session) {
    setSessionId(session.session_id);
    setRunnerType(session.runner_type);
    setEvents([]);
    setRunId(null);
    setStatus("session-ready");
  }

  async function onDeleteWorkspace() {
    if (!selectedWorkspaceId) return;
    setStatus("deleting");
    try {
      const r = await fetch(`/api/workspaces/${selectedWorkspaceId}`, {
        method: "DELETE"
      });
      if (r.ok) {
        setSelectedWorkspaceId(null);
        setSessionId(null);
        setEvents([]);
        setRunId(null);
        setStatus("idle");
        setPrompt("");
        setShowDeleteConfirm(false);
        await fetchWorkspaces();
      } else {
        setStatus(`error: ${await r.text()}`);
      }
    } catch (e) {
      console.error("Failed to delete workspace:", e);
      setStatus("error: failed to delete");
    }
  }

  async function onRunPrompt() {
    if (!sessionId) return;

    setStatus("running");
    setEvents([]);

    // Persist user message to database
    await fetch(`/api/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user", content: prompt })
    });

    const r = await fetch(`/api/sessions/${sessionId}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    if (!r.ok) {
      setStatus(`error: ${await r.text()}`);
      return;
    }

    const data = await r.json();
    const nextRunId = data.run_id;
    setRunId(nextRunId);

    let assistantContent = "";
    const toolMessages: Array<{ role: string; content: string; metadata?: any }> = [];

    const es = new EventSource(`/api/runs/${nextRunId}/events`);
    es.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        setEvents((prev: EventLine[]) => [...prev, { at: Date.now(), data: parsed }]);

        // Capture assistant content and tool calls for persistence
        if (parsed.type === "item.completed" && parsed.item) {
          const item = parsed.item;
          if (item.type === "agent_message" && item.text) {
            assistantContent = item.text;
          } else if (item.type === "command_execution") {
            toolMessages.push({
              role: "tool",
              content: "shell",
              metadata: {
                tool_name: "shell",
                tool_input: item.command,
                tool_output: item.aggregated_output || `Exit code: ${item.exit_code}`
              }
            });
          }
        } else if (parsed.type === "ui.message.assistant.final") {
          assistantContent = parsed.payload?.text || assistantContent;
        } else if (parsed.type === "ui.tool.result") {
          toolMessages.push({
            role: "tool",
            content: parsed.payload?.toolName || "tool",
            metadata: {
              tool_name: parsed.payload?.toolName,
              tool_output: parsed.payload?.output
            }
          });
        }

        if (parsed.type === "run.completed" || parsed.type === "stream.closed") {
          setStatus("completed");
          es.close();
          
          // Persist assistant and tool messages to database
          (async () => {
            for (const toolMsg of toolMessages) {
              await fetch(`/api/sessions/${sessionId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  role: toolMsg.role,
                  content: toolMsg.content,
                  run_id: nextRunId,
                  metadata: toolMsg.metadata
                })
              });
            }
            if (assistantContent) {
              await fetch(`/api/sessions/${sessionId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  role: "assistant",
                  content: assistantContent,
                  run_id: nextRunId
                })
              });
            }
          })();
        } else if (parsed.type === "error") {
          setStatus(`error: ${parsed.payload?.message || parsed.message || "unknown"}`);
          es.close();
        }
      } catch {
        setEvents((prev: EventLine[]) => [...prev, { at: Date.now(), data: msg.data }]);
      }
    };
    es.onerror = () => {
      es.close();
      if (status === "running") {
        setStatus("stream-closed");
      }
    };
  }

  return (
    <div className="space-y-6">
      {/* Delete Workspace Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-zinc-900">Delete Workspace?</h3>
            <p className="mt-2 text-sm text-zinc-600">
              This will permanently delete the workspace and all associated sessions and runs.
              This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={onDeleteWorkspace}
                disabled={status === "deleting"}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {status === "deleting" ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-zinc-900 dark:text-white">Agent Console</h1>
          <p className="mt-1 text-xs md:text-sm text-zinc-600 dark:text-zinc-400">
            Select a workspace, choose a runner, and run prompts.
          </p>
        </div>
        {/* Mobile Controls Toggle */}
        <button
          onClick={() => setControlsCollapsed(!controlsCollapsed)}
          className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
        >
          <span>⚙️</span>
          <span className="hidden sm:inline">{controlsCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-auto lg:h-[calc(100vh-180px)] min-h-0 lg:min-h-[600px]">
        {/* Controls Panel - Collapsible on mobile, sidebar on desktop */}
        <div className={`lg:w-80 flex-shrink-0 space-y-4 overflow-y-auto transition-all duration-300 ${
          controlsCollapsed ? 'hidden' : 'block'
        }`}>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-zinc-900">Workspace</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportForm(!showImportForm)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showImportForm ? "Cancel" : "+ Import"}
                </button>
                <button
                  onClick={onScanLocal}
                  disabled={status === "scanning"}
                  className="text-xs text-zinc-600 hover:text-zinc-800"
                  title="Scan for local folders"
                >
                  🔍 Scan
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="text-xs text-green-600 hover:text-green-800"
                  title="Upload local folder"
                >
                  📤 Upload
                </button>
                {selectedWorkspaceId && !showImportForm && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-xs text-red-600 hover:text-red-800"
                    title="Remove workspace"
                  >
                    🗑️ Remove
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {showImportForm ? (
                <>
                  <label className="block">
                    <div className="text-xs font-medium text-zinc-700">GitHub Repo URL</div>
                    <input
                      value={repoUrl}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/org/repo.git"
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    onClick={onImportWorkspace}
                    disabled={!repoUrl || status === "importing"}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Import Workspace
                  </button>
                </>
              ) : (
                <select
                  value={selectedWorkspaceId || ""}
                  onChange={(e) => {
                    setSelectedWorkspaceId(e.target.value || null);
                    setSessionId(null);
                    setEvents([]);
                    setStatus("idle");
                  }}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="">Select a workspace...</option>
                  {workspaces.map((ws) => (
                    <option key={ws.workspace_id} value={ws.workspace_id}>
                      {ws.display_name} ({ws.source_type})
                    </option>
                  ))}
                </select>
              )}

              {selectedWorkspaceId && !showImportForm && (
                <div className="pt-2 border-t border-zinc-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-zinc-700">Sessions</div>
                    <span className="text-xs text-zinc-500">{sessions.length} total</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {sessions.length === 0 ? (
                      <div className="text-xs text-zinc-500">No sessions yet</div>
                    ) : (
                      sessions.map((s) => (
                        <button
                          key={s.session_id}
                          onClick={() => onContinueSession(s)}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${
                            sessionId === s.session_id
                              ? "bg-blue-100 text-blue-800"
                              : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          <div className="flex justify-between">
                            <span className="font-medium">{s.runner_type}</span>
                            <span className="text-zinc-500">{s.run_count} runs</span>
                          </div>
                          <div className="text-zinc-500 truncate">
                            {new Date(s.created_at).toLocaleDateString()}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm">
            <div className="text-sm font-medium text-zinc-900 dark:text-white">Session</div>
            <div className="mt-3 space-y-3">
              <label className="block">
                <div className="text-xs font-medium text-zinc-700">Runner</div>
                <select
                  value={runnerType}
                  onChange={(e) => {
                    const newRunner = e.target.value as RunnerType;
                    const runner = RUNNERS.find(r => r.value === newRunner);
                    if (runner && !runner.available) {
                      alert(`${runner.label} is coming soon!`);
                      return;
                    }
                    setRunnerType(newRunner);
                    // Auto-clear session when runner changes
                    if (sessionId) {
                      setSessionId(null);
                      setEvents([]);
                      setRunId(null);
                      setStatus("idle");
                      setPrompt("");
                    }
                  }}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                >
                  {RUNNERS.map((runner) => (
                    <option 
                      key={runner.value} 
                      value={runner.value}
                      disabled={!runner.available}
                    >
                      {runner.label}{!runner.available ? " (Coming Soon)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {sessionId && (
                <button
                  onClick={() => {
                    setSessionId(null);
                    setEvents([]);
                    setRunId(null);
                    setStatus("idle");
                    setPrompt("");
                  }}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Clear Session
                </button>
              )}
              <button
                onClick={onCreateSession}
                disabled={!selectedWorkspaceId || status === "creating-session"}
                className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Create Session
              </button>
            </div>
          </div>

          {sessionId && runs.length > 0 && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm">
              <div className="text-sm font-medium text-zinc-900 dark:text-white">Run History</div>
              <p className="text-xs text-zinc-500 mt-1">Click to load prompt &amp; response</p>
              <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                {runs.map((r) => (
                  <div
                    key={r.run_id}
                    onClick={() => loadRunDetail(r.run_id)}
                    className={`px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                      runId === r.run_id
                        ? "bg-blue-100 border border-blue-300"
                        : "bg-zinc-50 hover:bg-zinc-100"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className={`font-medium ${
                        r.status === "completed" ? "text-green-700" :
                        r.status === "error" ? "text-red-700" :
                        "text-blue-700"
                      }`}>
                        {r.status}
                      </span>
                      <span className="text-zinc-500">
                        {new Date(r.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-zinc-600 truncate">{r.prompt}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Prompt Section */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm">
            <div className="text-sm font-medium text-zinc-900 dark:text-white">Prompt</div>
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded ${
                status === "running" ? "bg-blue-100 text-blue-700" :
                status === "completed" ? "bg-green-100 text-green-700" :
                status.startsWith("error") ? "bg-red-100 text-red-700" :
                sessionId ? "bg-green-100 text-green-700" :
                "bg-zinc-100 text-zinc-600"
              }`}>
                {sessionId ? (status === "idle" ? "ready" : status) : "no session"}
              </span>
              {sessionId && (
                <span className="text-zinc-500">
                  {runnerType} • {sessionId.slice(0, 8)}...
                </span>
              )}
            </div>
            <label className="block">
              <div className="text-xs font-medium text-zinc-700">Instruction</div>
              <textarea
                value={prompt}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                placeholder="Diagnose failing tests and propose a fix"
                className="mt-1 min-h-[100px] max-h-[200px] w-full rounded-md border border-zinc-300 px-3 py-2 text-sm resize-y"
              />
            </label>
            <button
              onClick={onRunPrompt}
              disabled={!sessionId || !prompt || status === "running"}
              className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Run Prompt
            </button>
          </div>
          </div>

          {/* Output Section */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-zinc-900">Output</div>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("transcript")}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === "transcript"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                Transcript
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === "raw"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                Raw Events
              </button>
              <button
                onClick={() => setViewMode("files")}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === "files"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                📁 Files
              </button>
            </div>
          </div>

          {viewMode === "files" ? (
            <div className="flex-1 overflow-y-auto p-2 bg-zinc-50 rounded-md border border-zinc-200">
              {selectedWorkspaceId ? (
                <FileBrowser workspaceId={selectedWorkspaceId} />
              ) : (
                <div className="text-sm text-zinc-500 text-center py-8">
                  Select a workspace to browse files.
                </div>
              )}
            </div>
          ) : viewMode === "transcript" ? (
            <div className="flex-1 overflow-y-auto space-y-4 p-3 bg-zinc-50 rounded-md border border-zinc-200">
              {transcript.length === 0 && status !== "running" ? (
                <div className="text-sm text-zinc-500 text-center py-8">
                  No messages yet. Run a prompt to see the transcript.
                </div>
              ) : transcript.length === 0 && status === "running" ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex items-center gap-1 text-2xl mb-3">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>🤖</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>💭</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>⚡</span>
                  </div>
                  <div className="text-sm text-zinc-600 font-medium">Agent is thinking...</div>
                  <div className="text-xs text-zinc-400 mt-1">Processing your request</div>
                </div>
              ) : (
                <>
                {transcript.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-blue-50 border border-blue-200 ml-8"
                        : msg.role === "tool"
                        ? msg.isBlocked
                          ? "bg-red-50 border border-red-200 mx-4"
                          : "bg-amber-50 border border-amber-200 mx-4"
                        : msg.role === "system"
                        ? "bg-purple-50 border border-purple-200 mx-4 py-2"
                        : "bg-white border border-zinc-200 mr-8"
                    }`}
                  >
                    {msg.role === "system" ? (
                      <div className="flex items-center gap-2 text-xs">
                        {msg.skillName ? (
                          <>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                              🎯 {msg.skillName}
                            </span>
                            <span className="text-purple-600">
                              {msg.skillScope === "workspace" ? "(workspace)" : "(global)"}
                            </span>
                          </>
                        ) : msg.iteration ? (
                          <>
                            <span className="text-purple-600">
                              🔄 Iteration {msg.iteration.current}/{msg.iteration.max}
                            </span>
                            <div className="flex-1 h-1 bg-purple-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500 transition-all duration-300"
                                style={{ width: `${(msg.iteration.current / msg.iteration.max) * 100}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="text-purple-600">{msg.content}</span>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-medium text-zinc-500 mb-1">
                          {msg.role === "user" ? "You" : msg.role === "tool" ? (
                            <span className="flex items-center gap-2">
                              {msg.isBlocked ? "🚫" : "🔧"} Tool: {msg.toolName}
                              {msg.isBlocked && <span className="text-red-600 font-semibold">BLOCKED</span>}
                            </span>
                          ) : "Assistant"}
                        </div>
                        {msg.role === "tool" ? (
                          <div className="text-xs font-mono">
                            {msg.isBlocked ? (
                              <div className="text-red-700 font-medium">{msg.content}</div>
                            ) : (
                              <>
                                {msg.toolInput && (
                                  <details className="mb-2">
                                    <summary className="cursor-pointer text-amber-700 flex items-center gap-1">
                                      <span>▶</span> Input
                                    </summary>
                                    <pre className="mt-1 p-2 bg-amber-100 rounded overflow-x-auto max-h-40">
                                      {JSON.stringify(msg.toolInput, null, 2)}
                                    </pre>
                                  </details>
                                )}
                                {msg.toolOutput && (
                                  <details>
                                    <summary className="cursor-pointer text-amber-700 flex items-center gap-1">
                                      <span>▶</span> Output
                                    </summary>
                                    <pre className="mt-1 p-2 bg-amber-100 rounded overflow-x-auto max-h-40">
                                      {JSON.stringify(msg.toolOutput, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
                }
                {status === "running" && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mr-8">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                    <span className="text-sm text-blue-700">Agent is working...</span>
                  </div>
                )}
                </>
              )}
              <div ref={transcriptEndRef} />
            </div>
          ) : (
            <textarea
              readOnly
              value={eventsText}
              className="flex-1 w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs resize-none"
            />
          )}
        </div>
        </div>
      </div>

      {/* Scan Local Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900">Discovered Local Folders</h3>
              <button
                onClick={() => setShowScanModal(false)}
                className="text-zinc-500 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>
            
            {discoveredFolders.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4">
                No new folders found. Copy a project folder to <code className="bg-zinc-100 px-1 rounded">/workspaces/name/repo/</code> and scan again.
              </p>
            ) : (
              <div className="space-y-3">
                {discoveredFolders.map((folder) => (
                  <div
                    key={folder.folder_name}
                    className={`p-3 rounded-lg border ${
                      selectedFolders.has(folder.folder_name)
                        ? "border-blue-300 bg-blue-50"
                        : "border-zinc-200 bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedFolders.has(folder.folder_name)}
                        onChange={() => toggleFolderSelection(folder.folder_name)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-zinc-900">{folder.folder_name}</span>
                          {folder.has_git && (
                            <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">git</span>
                          )}
                        </div>
                        {folder.git_remote && (
                          <div className="text-xs text-zinc-500 truncate mt-0.5">{folder.git_remote}</div>
                        )}
                        <label className="block mt-2">
                          <span className="text-xs text-zinc-600">Display name:</span>
                          <input
                            type="text"
                            value={folderNames[folder.folder_name] || ""}
                            onChange={(e) => setFolderNames(prev => ({
                              ...prev,
                              [folder.folder_name]: e.target.value
                            }))}
                            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-200">
              <button
                onClick={() => setShowScanModal(false)}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={onImportSelectedFolders}
                disabled={selectedFolders.size === 0 || status === "importing"}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Import Selected ({selectedFolders.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={(workspaceId) => {
          fetchWorkspaces();
          setSelectedWorkspaceId(workspaceId);
          setShowUploadModal(false);
        }}
      />
    </div>
  );
}

export default function CodexPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-zinc-500">Loading...</div></div>}>
      <CodexPageContent />
    </Suspense>
  );
}
