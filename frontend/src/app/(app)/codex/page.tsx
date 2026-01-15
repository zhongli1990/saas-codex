"use client";

import { useMemo, useState, type ChangeEvent } from "react";

type EventLine = {
  at: number;
  data: any;
};

export default function CodexPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [events, setEvents] = useState<EventLine[]>([]);
  const [status, setStatus] = useState<string>("idle");

  const eventsText = useMemo(() => {
    return events
      .map((e: EventLine) => `${new Date(e.at).toISOString()} ${JSON.stringify(e.data)}`)
      .join("\n");
  }, [events]);

  async function onCreateSession() {
    setStatus("creating-session");
    setEvents([]);
    setRunId(null);

    const r = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_url: repoUrl })
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
      } catch {
        setEvents((prev: EventLine[]) => [...prev, { at: Date.now(), data: msg.data }]);
      }
    };
    es.onerror = () => {
      es.close();
      setStatus("stream-closed");
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Codex</h1>
        <p className="mt-1 text-sm text-zinc-600">Clone a repo, run a prompt, and stream Codex events.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="text-sm font-medium text-zinc-900">Repository</div>
            <div className="mt-3 space-y-3">
              <label className="block">
                <div className="text-xs font-medium text-zinc-700">Repo URL</div>
                <input
                  value={repoUrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/org/repo.git"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <button
                onClick={onCreateSession}
                disabled={!repoUrl || status === "creating-session"}
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Create session (clone)
              </button>
              <div className="text-xs text-zinc-600">Session ID: {sessionId ?? "-"}</div>
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
                Run prompt
              </button>
              <div className="text-xs text-zinc-600">Run ID: {runId ?? "-"}</div>
              <div className="text-xs text-zinc-600">Status: {status}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-zinc-900">Event stream</div>
            <div className="text-xs text-zinc-500">SSE</div>
          </div>
          <textarea
            readOnly
            value={eventsText}
            className="mt-3 min-h-[520px] w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs"
          />
        </div>
      </div>
    </div>
  );
}
