import Link from "next/link";

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Projects</h1>
          <p className="mt-1 text-sm text-zinc-600">Placeholder list; will be backed by the backend DB later.</p>
        </div>
        <Link
          href="/codex"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New run
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900">Project list</div>
        <div className="p-4 text-sm text-zinc-600">No projects yet (placeholder).</div>
      </div>
    </div>
  );
}
