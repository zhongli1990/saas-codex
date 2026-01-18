"use client";

import { useState } from "react";

type SettingsCategory = "general" | "runners" | "appearance" | "about";

function SettingsSidebar({ 
  active, 
  onSelect 
}: { 
  active: SettingsCategory; 
  onSelect: (cat: SettingsCategory) => void;
}) {
  const categories: { id: SettingsCategory; label: string; icon: string }[] = [
    { id: "general", label: "General", icon: "⚙️" },
    { id: "runners", label: "Runners", icon: "🤖" },
    { id: "appearance", label: "Appearance", icon: "🎨" },
    { id: "about", label: "About", icon: "ℹ️" },
  ];

  return (
    <nav className="space-y-1">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            active === cat.id
              ? "bg-zinc-900 text-white"
              : "text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          <span>{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </nav>
  );
}

function GeneralSettings() {
  const [defaultRunner, setDefaultRunner] = useState("codex");
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [autoSave, setAutoSave] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-zinc-900">General Settings</h3>
        <p className="mt-1 text-sm text-zinc-500">Configure your default preferences</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Default Runner</label>
          <p className="text-xs text-zinc-500 mt-0.5">Select the AI runner for new sessions</p>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 cursor-pointer hover:bg-zinc-50">
              <input
                type="radio"
                name="runner"
                value="codex"
                checked={defaultRunner === "codex"}
                onChange={(e) => setDefaultRunner(e.target.value)}
                className="w-4 h-4 text-zinc-900"
              />
              <div>
                <p className="text-sm font-medium text-zinc-900">Codex (OpenAI)</p>
                <p className="text-xs text-zinc-500">GPT-4 powered code assistant</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 cursor-pointer hover:bg-zinc-50">
              <input
                type="radio"
                name="runner"
                value="claude"
                checked={defaultRunner === "claude"}
                onChange={(e) => setDefaultRunner(e.target.value)}
                className="w-4 h-4 text-zinc-900"
              />
              <div>
                <p className="text-sm font-medium text-zinc-900">Claude (Anthropic)</p>
                <p className="text-xs text-zinc-500">Claude 3 powered assistant</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Session Timeout</label>
          <p className="text-xs text-zinc-500 mt-0.5">Minutes before inactive sessions expire</p>
          <input
            type="number"
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 60)}
            min={5}
            max={480}
            className="mt-2 w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <div>
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700">Auto-save Messages</p>
              <p className="text-xs text-zinc-500">Automatically persist all chat messages</p>
            </div>
            <button
              onClick={() => setAutoSave(!autoSave)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoSave ? "bg-zinc-900" : "bg-zinc-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoSave ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-200">
        <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          Save Changes
        </button>
      </div>
    </div>
  );
}

function RunnerSettings() {
  const [codexModel, setCodexModel] = useState("gpt-4");
  const [claudeModel, setClaudeModel] = useState("claude-3-opus");
  const [maxTokens, setMaxTokens] = useState(4096);
  const [temperature, setTemperature] = useState(0.7);
  const [timeout, setTimeout] = useState(300);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-zinc-900">Runner Configuration</h3>
        <p className="mt-1 text-sm text-zinc-500">Configure AI model parameters</p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Codex Model</label>
            <select
              value={codexModel}
              onChange={(e) => setCodexModel(e.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Claude Model</label>
            <select
              value={claudeModel}
              onChange={(e) => setClaudeModel(e.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              <option value="claude-3-haiku">Claude 3 Haiku</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Max Tokens</label>
          <p className="text-xs text-zinc-500 mt-0.5">Maximum response length</p>
          <input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
            min={256}
            max={32000}
            className="mt-2 w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Temperature</label>
          <p className="text-xs text-zinc-500 mt-0.5">Response creativity (0 = deterministic, 1 = creative)</p>
          <div className="mt-2 flex items-center gap-4">
            <input
              type="range"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              min={0}
              max={1}
              step={0.1}
              className="w-48"
            />
            <span className="text-sm text-zinc-600 w-8">{temperature}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Run Timeout (seconds)</label>
          <p className="text-xs text-zinc-500 mt-0.5">Maximum duration for a single run</p>
          <input
            type="number"
            value={timeout}
            onChange={(e) => setTimeout(parseInt(e.target.value) || 300)}
            min={30}
            max={3600}
            className="mt-2 w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-200">
        <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          Save Changes
        </button>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const [theme, setTheme] = useState("system");
  const [compactMode, setCompactMode] = useState(false);
  const [codeFont, setCodeFont] = useState("fira-code");
  const [syntaxTheme, setSyntaxTheme] = useState("one-dark");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-zinc-900">Appearance</h3>
        <p className="mt-1 text-sm text-zinc-500">Customize the look and feel</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Theme</label>
          <div className="mt-2 flex gap-2">
            {["light", "dark", "system"].map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                  theme === t
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700">Compact Mode</p>
              <p className="text-xs text-zinc-500">Reduce spacing for dense layouts</p>
            </div>
            <button
              onClick={() => setCompactMode(!compactMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                compactMode ? "bg-zinc-900" : "bg-zinc-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  compactMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Code Font</label>
          <select
            value={codeFont}
            onChange={(e) => setCodeFont(e.target.value)}
            className="mt-2 w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="fira-code">Fira Code</option>
            <option value="jetbrains-mono">JetBrains Mono</option>
            <option value="monaco">Monaco</option>
            <option value="source-code-pro">Source Code Pro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Syntax Theme</label>
          <select
            value={syntaxTheme}
            onChange={(e) => setSyntaxTheme(e.target.value)}
            className="mt-2 w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="one-dark">One Dark</option>
            <option value="github">GitHub</option>
            <option value="dracula">Dracula</option>
            <option value="monokai">Monokai</option>
          </select>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-200">
        <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          Save Changes
        </button>
      </div>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-zinc-900">About</h3>
        <p className="mt-1 text-sm text-zinc-500">Application information and resources</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-zinc-900 flex items-center justify-center">
            <span className="text-2xl text-white">🚀</span>
          </div>
          <div>
            <h4 className="text-xl font-bold text-zinc-900">saas-codex</h4>
            <p className="text-sm text-zinc-500">AI-Powered Healthcare Integration Platform</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Version</p>
          <p className="text-sm font-medium text-zinc-900">v0.3.0</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Build</p>
          <p className="text-sm font-medium text-zinc-900 font-mono">1d4b9db</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">License</p>
          <p className="text-sm font-medium text-zinc-900">Enterprise</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Environment</p>
          <p className="text-sm font-medium text-zinc-900">Development</p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-zinc-900">Resources</h4>
        <div className="space-y-1">
          <a
            href="https://github.com/zhongli1990/saas-codex"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <span>📦</span> GitHub Repository
          </a>
          <a
            href="#"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <span>📚</span> Documentation
          </a>
          <a
            href="#"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <span>💬</span> Support
          </a>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-200 text-center text-xs text-zinc-400">
        © 2026 saas-codex. All rights reserved.
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("general");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Configure your workspace and integration preferences
        </p>
      </div>

      {/* Settings Layout */}
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <SettingsSidebar active={activeCategory} onSelect={setActiveCategory} />
        </div>

        {/* Content */}
        <div className="flex-1 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          {activeCategory === "general" && <GeneralSettings />}
          {activeCategory === "runners" && <RunnerSettings />}
          {activeCategory === "appearance" && <AppearanceSettings />}
          {activeCategory === "about" && <AboutSettings />}
        </div>
      </div>
    </div>
  );
}
