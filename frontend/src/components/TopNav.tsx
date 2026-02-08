"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMe, logout, User } from "@/lib/auth";

export default function TopNav() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getMe().then(setUser);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-zinc-900">Codex Console</div>
          <div className="hidden text-xs text-zinc-500 md:block">SaaS UI</div>
        </div>
        <nav className="hidden md:flex items-center gap-4">
          <Link href="/codex" className="text-sm text-zinc-600 hover:text-zinc-900">
            Agent
          </Link>
          <Link href="/admin/skills" className="text-sm text-zinc-600 hover:text-zinc-900">
            Skills
          </Link>
          <Link href="/admin/hooks" className="text-sm text-zinc-600 hover:text-zinc-900">
            Hooks
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <div className="hidden rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 md:block">
              {user.display_name || user.email}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Sign out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
          >
            Login
          </Link>
        )}
      </div>
    </div>
  );
}
