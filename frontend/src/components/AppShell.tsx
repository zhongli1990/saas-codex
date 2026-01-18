import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import { AppProvider } from "@/contexts/AppContext";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <div className="min-h-screen">
        <div className="flex min-h-screen">
          <aside className="hidden w-64 border-r border-zinc-200 bg-white md:block">
            <Sidebar />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="border-b border-zinc-200 bg-white">
              <TopNav />
            </header>
            <main className="flex-1 p-6">
              <div className="mx-auto w-full max-w-6xl">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </AppProvider>
  );
}
