"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Workspace = {
  workspace_id: string;
  display_name: string;
  source_type: string;
  source_uri: string;
  local_path: string;
  created_at: string;
};

type Session = {
  session_id: string;
  workspace_id: string;
  runner_type: string;
  created_at: string;
  run_count: number;
};

type WorkspaceWithStats = Workspace & {
  sessions: Session[];
  total_runs: number;
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

function WorkspaceCard({ 
  workspace, 
  expanded, 
  onToggle,
  onRefresh 
}: { 
  workspace: WorkspaceWithStats; 
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const copyPath = () => {
    navigator.clipboard.writeText(workspace.local_path);
    setShowMenu(false);
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {workspace.source_type === "github" ? "🐙" : "📁"}
            </span>
            <div>
              <h3 className="text-base font-semibold text-zinc-900">
                {workspace.display_name}
              </h3>
              <p className="text-sm text-zinc-500 mt-0.5">
                {workspace.source_type === "github" 
                  ? workspace.source_uri.replace("https://github.com/", "")
                  : workspace.local_path}
              </p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-40 rounded-md border border-zinc-200 bg-white shadow-lg z-10">
                <button
                  onClick={() => { onRefresh(); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={copyPath}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  📋 Copy Path
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm">
          <span className="text-zinc-600">
            <strong>{workspace.sessions.length}</strong> sessions
          </span>
          <span className="text-zinc-300">•</span>
          <span className="text-zinc-600">
            <strong>{workspace.total_runs}</strong> runs
          </span>
          <span className="text-zinc-300">•</span>
          <span className="text-zinc-500">
            Created {formatRelativeTime(workspace.created_at)}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Link
            href={`/codex?workspace=${workspace.workspace_id}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            ⚡ Open in Agents
          </Link>
          <Link
            href={`/chat?workspace=${workspace.workspace_id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            💬 Open in Chat
          </Link>
          {workspace.sessions.length > 0 && (
            <button
              onClick={onToggle}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {expanded ? "▼" : "▶"} Sessions ({workspace.sessions.length})
            </button>
          )}
        </div>
      </div>

      {expanded && workspace.sessions.length > 0 && (
        <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-3">
          <div className="space-y-2">
            {workspace.sessions.map((session) => (
              <div
                key={session.session_id}
                className="flex items-center justify-between rounded-md bg-white px-3 py-2 border border-zinc-200"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    session.runner_type === "codex" 
                      ? "bg-blue-100 text-blue-700" 
                      : "bg-purple-100 text-purple-700"
                  }`}>
                    {session.runner_type}
                  </span>
                  <span className="text-sm text-zinc-600">
                    {session.run_count} runs
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">
                    {formatRelativeTime(session.created_at)}
                  </span>
                  <Link
                    href={`/codex?workspace=${workspace.workspace_id}&session=${session.session_id}`}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Open →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (!res.ok) return;
      
      const data = await res.json();
      const workspacesList: Workspace[] = data.items || [];
      
      // Fetch sessions for each workspace
      const workspacesWithStats: WorkspaceWithStats[] = await Promise.all(
        workspacesList.map(async (ws) => {
          try {
            const sessRes = await fetch(`/api/workspaces/${ws.workspace_id}/sessions`);
            const sessData = sessRes.ok ? await sessRes.json() : { items: [] };
            const sessions: Session[] = sessData.items || [];
            const total_runs = sessions.reduce((sum, s) => sum + (s.run_count || 0), 0);
            return { ...ws, sessions, total_runs };
          } catch {
            return { ...ws, sessions: [], total_runs: 0 };
          }
        })
      );
      
      setWorkspaces(workspacesWithStats);
    } catch (e) {
      console.error("Failed to fetch workspaces:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ws.source_uri.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Projects</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage your workspaces and integration projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/codex"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            📁 Scan Local
          </Link>
          <Link
            href="/codex"
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            + Import from GitHub
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search workspaces..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 pl-10 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Workspace List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-zinc-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-zinc-200 rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-zinc-200 rounded animate-pulse w-1/3" />
                  <div className="h-4 bg-zinc-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-8 bg-zinc-200 rounded animate-pulse w-24" />
                <div className="h-8 bg-zinc-200 rounded animate-pulse w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredWorkspaces.length > 0 ? (
        <div className="space-y-4">
          {filteredWorkspaces.map((ws) => (
            <WorkspaceCard
              key={ws.workspace_id}
              workspace={ws}
              expanded={expandedIds.has(ws.workspace_id)}
              onToggle={() => toggleExpanded(ws.workspace_id)}
              onRefresh={fetchWorkspaces}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <span className="text-4xl">📦</span>
          <h3 className="mt-4 text-lg font-medium text-zinc-900">No workspaces found</h3>
          <p className="mt-2 text-sm text-zinc-500">
            {searchQuery 
              ? "Try a different search term" 
              : "Import a project from GitHub or scan local folders to get started"}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/codex"
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              + Import Project
            </Link>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      {!loading && workspaces.length > 0 && (
        <div className="text-center text-sm text-zinc-500">
          Showing {filteredWorkspaces.length} of {workspaces.length} workspaces
        </div>
      )}
    </div>
  );
}
