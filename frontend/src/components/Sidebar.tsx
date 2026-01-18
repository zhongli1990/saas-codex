"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getMe, logout, User } from "@/lib/auth";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/codex", label: "Agents" },
  { href: "/chat", label: "Chat" },
  { href: "/settings", label: "Settings" }
];

const adminItems = [
  { href: "/admin/users", label: "User Management" }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getMe().then(setUser);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-6">
        <div className="text-sm font-semibold text-zinc-900">saas-codex</div>
        <div className="text-xs text-zinc-500">Workspace UI</div>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((i) => {
          const active = pathname === i.href;
          const className = active
            ? "rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            : "rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900";

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

        {isAdmin && (
          <>
            <div className="my-2 border-t border-zinc-200" />
            <div className="px-3 py-1 text-xs font-medium text-zinc-500 uppercase">Admin</div>
            {adminItems.map((i) => {
              const active = pathname === i.href || pathname.startsWith(i.href);
              const className = active
                ? "rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
                : "rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900";

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
          </>
        )}
      </nav>
      <div className="mt-auto pt-4 space-y-3">
        {user && (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-medium text-zinc-900 truncate">
              {user.display_name || user.email}
            </div>
            <div className="text-xs text-zinc-500 truncate">{user.email}</div>
            <button
              onClick={handleLogout}
              className="mt-2 w-full rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
