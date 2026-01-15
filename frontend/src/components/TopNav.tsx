import Link from "next/link";

export default function TopNav() {
  return (
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="text-sm font-semibold text-zinc-900">Codex Console</div>
        <div className="hidden text-xs text-zinc-500 md:block">SaaS UI (Phase 1)</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 md:block">
          user@example.com
        </div>
        <Link
          href="/login"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
