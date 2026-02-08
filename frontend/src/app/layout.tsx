/**
 * OpenLi Codex - Enterprise AI Agent Platform
 * Copyright (c) 2026 Lightweight Integration Ltd
 * 
 * This file is part of OpenLi Codex.
 * Licensed under AGPL-3.0 (community) or Commercial license.
 * See LICENSE file for details.
 * 
 * Contact: Zhong@li-ai.co.uk
 */

import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenLI Codex | Enterprise AI Agent Platform",
  description: "OpenLI Codex - AI-powered enterprise platform for healthcare, pharma, and banking. Self-evolving multi-tenant agent ecosystem.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  applicationName: "OpenLI Codex",
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
