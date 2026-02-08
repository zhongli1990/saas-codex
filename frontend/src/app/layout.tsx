import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SaaS Codex | Enterprise AI Agent Platform",
  description: "AI-powered enterprise SaaS platform for healthcare integration, clinical workflows, and intelligent document generation",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  applicationName: "SaaS Codex",
  keywords: ["AI", "Claude", "Healthcare", "NHS", "Enterprise", "SaaS", "Agent"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
