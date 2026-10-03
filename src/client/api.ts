import type {
  AnalyzeRequest,
  BootstrapResponse,
  Release,
  Report,
  Task,
} from "../shared/contracts";
import snapshot from "../../server/data/releases.json";
import {
  analyzeRules,
  getDemoProjects,
  exportMarkdown,
  exportJSON,
} from "../core/pure";
let token = "";
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "X-UpdateLens-Session": token,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(path === "/api/analyze" ? 45000 : 25000),
  });
  if (!response.ok) {
    const value = await response.json().catch(() => null);
    throw new Error(
      value?.error?.message ?? `Request failed (${response.status}).`,
    );
  }
  return response.json();
}
export async function bootstrap(): Promise<BootstrapResponse> {
  const value = await api<BootstrapResponse>("/api/bootstrap");
  token = value.sessionToken ?? "";
  return value;
}
export function demoBootstrap(): BootstrapResponse {
  const releases = snapshot as Release[];
  return {
    mode: "demo",
    channels: [
      {
        id: "claude-code",
        label: "Claude Code",
        selectionKind: "version",
        description:
          "Official changelog versions; publication dates not provided.",
      },
      {
        id: "codex-cli",
        label: "Codex CLI",
        selectionKind: "version",
        description: "Stable official GitHub CLI releases.",
      },
      {
        id: "codex-desktop",
        label: "Codex desktop",
        selectionKind: "date",
        description: "Dated app updates, separate from CLI versions.",
      },
    ],
    releases,
    coverage: (["claude-code", "codex-cli", "codex-desktop"] as const).map(
      (channel) => {
        const items = releases.filter((r) => r.channel === channel);
        return {
          channel,
          selectionKind: channel === "codex-desktop" ? "date" : "version",
          from: items.at(-1)!.version ?? items.at(-1)!.date,
          to: items[0].version ?? items[0].date,
          fetchedAt: items[0].fetchedAt,
          complete: false,
          stale: Date.now() - Date.parse(items[0].fetchedAt) > 7 * 86400000,
          sourceUrl: items[0].sourceUrl,
          limitation:
            channel === "codex-desktop"
              ? `${items.length} curated dated app entries only; this is not a complete desktop build history or platform applicability guarantee.`
              : channel === "claude-code"
                ? `${items.length} curated changelog versions. The source does not provide publication dates; version gaps and older history are outside coverage.`
                : `${items.length} stable releases from one bounded GitHub page. Prereleases and older history are outside coverage.`,
        };
      },
    ),
    workflowFeatures: [
      { id: "config", label: "Configuration" },
      { id: "skills", label: "Skills & plugins" },
      { id: "hooks", label: "Hooks" },
      { id: "mcp", label: "MCP" },
      { id: "permissions", label: "Permissions" },
      { id: "ci", label: "CI / headless" },
      { id: "sessions", label: "Sessions" },
      { id: "models", label: "Models & providers" },
    ],
    demoProjects: getDemoProjects(),
    localProjects: [],
    provider: {
      ready: false,
      name: "OpenCode Go",
      model: "deepseek-v4.1-flash",
      callsRemaining: 0,
    },
  };
}
export function demoAnalyze(
  boot: BootstrapResponse,
  request: AnalyzeRequest,
): Report {
  const all = boot.releases.filter((r) => r.channel === request.channel);
  const key = (r: Release) => r.version ?? r.date;
  const start = all.findIndex((r) => key(r) === request.from),
    end = all.findIndex((r) => key(r) === request.to);
  if (start < 0 || end < 0 || start < end)
    throw new Error(
      "Unsupported range. Select supplied boundaries with target at or after current.",
    );
  const releases =
    request.channel === "codex-desktop"
      ? all.filter((r) => r.date > request.from && r.date <= request.to)
      : all.slice(end, start);
  return analyzeRules({
    request: { ...request, mode: "rule-only" },
    releases,
    coverage: {
      ...boot.coverage.find((c) => c.channel === request.channel)!,
      from: request.from,
      to: request.to,
    },
    projects: boot.demoProjects.filter((p) =>
      request.projectIds.includes(p.id),
    ),
  });
}
export function downloadReport(
  report: Report,
  tasks: Task[],
  format: "markdown" | "json",
) {
  const text =
    format === "json"
      ? exportJSON(report, tasks)
      : exportMarkdown(report, tasks);
  const url = URL.createObjectURL(
    new Blob([text], {
      type: format === "json" ? "application/json" : "text/markdown",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `updatelens-report.${format === "json" ? "json" : "md"}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
