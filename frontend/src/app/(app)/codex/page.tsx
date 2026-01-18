"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type RunnerType = "codex" | "claude";

type EventLine = {
  at: number;
  data: any;
};

type TranscriptMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
};

export default function CodexPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [runnerType, setRunnerType] = useState<RunnerType>("codex");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [events, setEvents] = useState<EventLine[]>([]);
  const [status, setStatus] = useState<string>("idle");
  const [viewMode, setViewMode] = useState<"transcript" | "raw">("transcript");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

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

      if (eventType === "ui.message.user") {
        messages.push({ role: "user", content: data.payload?.text || "" });
      } else if (eventType === "ui.message.assistant.delta") {
        currentAssistantText += data.payload?.textDelta || "";
      } else if (eventType === "ui.message.assistant.final") {
        messages.push({ role: "assistant", content: data.payload?.text || currentAssistantText });
        currentAssistantText = "";
      } else if (eventType === "ui.tool.call") {
        messages.push({
          role: "tool",
          content: `Calling ${data.payload?.toolName}`,
          toolName: data.payload?.toolName,
          toolInput: data.payload?.input
        });
      } else if (eventType === "ui.tool.result") {
        messages.push({
          role: "tool",
          content: `Result from ${data.payload?.toolName}`,
          toolName: data.payload?.toolName,
          toolOutput: data.payload?.output
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

  async function onCreateSession() {
    setStatus("creating-session");
    setEvents([]);
    setRunId(null);

    const r = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_url: repoUrl, runner_type: runnerType })
    });

    if (!r.ok) {
      setStatus(`error: ${await r.text()}`);
      return;
    }

    const data = await r.json();
    setSessionId(data.session_id);
    setStatus("session-ready");
  }

  async function onRunPrompt() {
    if (!sessionId) return;

    setStatus("running");
    setEvents([]);

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

    const es = new EventSource(`/api/runs/${nextRunId}/events`);
    es.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        setEvents((prev: EventLine[]) => [...prev, { at: Date.now(), data: parsed }]);

        if (parsed.type === "run.completed" || parsed.type === "stream.closed") {
          setStatus("completed");
          es.close();
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
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Agent Console</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Clone a repo, select a runner (Codex or Claude), and run prompts with streaming output.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="text-sm font-medium text-zinc-900">Workspace</div>
            <div className="mt-3 space-y-3">
              <label className="block">
                <div className="text-xs font-medium text-zinc-700">GitHub Repo URL</div>
                <input
                  value={repoUrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/org/repo.git"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-zinc-700">Runner</div>
                <select
                  value={runnerType}
                  onChange={(e) => setRunnerType(e.target.value as RunnerType)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  disabled={!!sessionId}
                >
                  <option value="codex">Codex (OpenAI)</option>
                  <option value="claude">Claude (Anthropic)</option>
                </select>
                {sessionId && (
                  <div className="mt-1 text-xs text-zinc-500">
                    Runner is fixed for this session. Create a new session to change.
                  </div>
                )}
              </label>

              <button
                onClick={onCreateSession}
                disabled={!repoUrl || status === "creating-session"}
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Create Session
              </button>

              <div className="flex items-center gap-4 text-xs text-zinc-600">
                <span>Session: {sessionId ? sessionId.slice(0, 8) + "..." : "-"}</span>
                <span className={`px-2 py-0.5 rounded ${
                  status === "running" ? "bg-blue-100 text-blue-700" :
                  status === "completed" ? "bg-green-100 text-green-700" :
                  status.startsWith("error") ? "bg-red-100 text-red-700" :
                  "bg-zinc-100 text-zinc-600"
                }`}>
                  {status}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="text-sm font-medium text-zinc-900">Prompt</div>
            <div className="mt-3 space-y-3">
              <label className="block">
                <div className="text-xs font-medium text-zinc-700">Instruction</div>
                <textarea
                  value={prompt}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                  placeholder="Diagnose failing tests and propose a fix"
                  className="mt-1 min-h-32 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <button
                onClick={onRunPrompt}
                disabled={!sessionId || !prompt || status === "running"}
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Run Prompt
              </button>
              {runId && (
                <div className="text-xs text-zinc-600">Run: {runId.slice(0, 8)}...</div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 flex flex-col">
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
            </div>
          </div>

          {viewMode === "transcript" ? (
            <div className="flex-1 overflow-y-auto min-h-[520px] max-h-[600px] space-y-4 p-2 bg-zinc-50 rounded-md border border-zinc-200">
              {transcript.length === 0 ? (
                <div className="text-sm text-zinc-500 text-center py-8">
                  No messages yet. Run a prompt to see the transcript.
                </div>
              ) : (
                transcript.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-blue-50 border border-blue-200 ml-8"
                        : msg.role === "tool"
                        ? "bg-amber-50 border border-amber-200 mx-4"
                        : "bg-white border border-zinc-200 mr-8"
                    }`}
                  >
                    <div className="text-xs font-medium text-zinc-500 mb-1">
                      {msg.role === "user" ? "You" : msg.role === "tool" ? `Tool: ${msg.toolName}` : "Assistant"}
                    </div>
                    {msg.role === "tool" ? (
                      <div className="text-xs font-mono">
                        {msg.toolInput && (
                          <details className="mb-2">
                            <summary className="cursor-pointer text-amber-700">Input</summary>
                            <pre className="mt-1 p-2 bg-amber-100 rounded overflow-x-auto">
                              {JSON.stringify(msg.toolInput, null, 2)}
                            </pre>
                          </details>
                        )}
                        {msg.toolOutput && (
                          <details>
                            <summary className="cursor-pointer text-amber-700">Output</summary>
                            <pre className="mt-1 p-2 bg-amber-100 rounded overflow-x-auto">
                              {JSON.stringify(msg.toolOutput, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          ) : (
            <textarea
              readOnly
              value={eventsText}
              className="flex-1 min-h-[520px] w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs"
            />
          )}
        </div>
      </div>
    </div>
  );
}
