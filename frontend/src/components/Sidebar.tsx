"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/codex", label: "Agents" },
  { href: "/chat", label: "Chat" },
  { href: "/settings", label: "Settings" }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-6">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">saas-codex</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Workspace UI</div>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((i) => {
          const active = pathname === i.href;
          const className = active
            ? "rounded-md bg-zinc-200 dark:bg-zinc-700 px-3 py-2 text-sm font-medium text-zinc-900 dark:text-white"
            : "rounded-md px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white";

          return (
            <Link
              key={i.href}
              href={i.href}
              className={className}
              aria-current={active ? "page" : undefined}
            >
              {i.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-4">
        <div className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3">
          <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Tenant</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Org Placeholder</div>
        </div>
      </div>
    </div>
  );
}
