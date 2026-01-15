export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">Overview and placeholders for SaaS metrics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-xs text-zinc-500">Active Projects</div>
          <div className="mt-2 text-2xl font-semibold">-</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-xs text-zinc-500">Runs Today</div>
          <div className="mt-2 text-2xl font-semibold">-</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-xs text-zinc-500">Workspace Usage</div>
          <div className="mt-2 text-2xl font-semibold">-</div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="text-sm font-medium text-zinc-900">Getting started</div>
        <div className="mt-2 text-sm text-zinc-600">
          Use the Codex page to clone a repo, start a session, and stream events.
        </div>
      </div>
    </div>
  );
}
