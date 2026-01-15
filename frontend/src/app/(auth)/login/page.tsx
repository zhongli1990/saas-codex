import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-zinc-900">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-600">Placeholder login UI. Auth will be implemented in Phase 2.</p>

        <div className="mt-6 space-y-3">
          <label className="block text-sm">
            <div className="text-xs font-medium text-zinc-700">Email</div>
            <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" placeholder="user@example.com" />
          </label>
          <label className="block text-sm">
            <div className="text-xs font-medium text-zinc-700">Password</div>
            <input type="password" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" placeholder="********" />
          </label>
          <button className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800">
            Sign in
          </button>
        </div>

        <div className="mt-4 text-xs text-zinc-600">
          <Link href="/dashboard" className="text-zinc-900 underline">
            Continue to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
