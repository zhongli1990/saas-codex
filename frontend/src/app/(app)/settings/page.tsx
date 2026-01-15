export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">Placeholders for integrations, billing, and security policies.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm font-medium text-zinc-900">Git integrations</div>
          <div className="mt-2 text-sm text-zinc-600">GitHub/GitLab OAuth (placeholder).</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm font-medium text-zinc-900">Billing</div>
          <div className="mt-2 text-sm text-zinc-600">Stripe subscription + usage limits (placeholder).</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm font-medium text-zinc-900">Security</div>
          <div className="mt-2 text-sm text-zinc-600">Workspace retention, audit logs, IP allowlist (placeholder).</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm font-medium text-zinc-900">Runner policy</div>
          <div className="mt-2 text-sm text-zinc-600">Timeouts, resource limits, and isolation (placeholder).</div>
        </div>
      </div>
    </div>
  );
}
