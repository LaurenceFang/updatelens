import { readFile } from "node:fs/promises";
import type {
  ChangeItem,
  Channel,
  ChannelId,
  Coverage,
  FeatureId,
  Release,
  ReleasesResponse,
} from "../src/shared/contracts.js";

export const channels: Channel[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    selectionKind: "version",
    description:
      "Official Claude Code changelog; release dates are not supplied by this source.",
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
    description:
      "Dated official app updates. Desktop build labels are never inferred from CLI tags.",
  },
];
export const sourceUrls = {
  claude:
    "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md",
  cli: "https://api.github.com/repos/openai/codex/releases?per_page=30",
  desktop: "https://developers.openai.com/codex/changelog/",
};
export function signals(text: string): {
  features: FeatureId[];
  signals: string[];
} {
  const rules: [FeatureId, RegExp][] = [
    ["hooks", /\bhooks?\b/i],
    ["mcp", /\bmcp\b/i],
    ["permissions", /permission|sandbox|approval/i],
    ["skills", /skill|plugin/i],
    ["config", /config|settings|toml|CLAUDE\.md|AGENTS\.md/i],
    ["ci", /\bci\b|headless|runner|non-interactive/i],
    ["sessions", /session|resume|thread|conversation/i],
    ["models", /model|provider|bedrock|vertex/i],
  ];
  return {
    features: rules.filter(([, r]) => r.test(text)).map(([f]) => f),
    signals: [
      ...new Set(
        [...text.matchAll(/`((?:--)?[a-zA-Z_][a-zA-Z0-9_.-]{2,80})`/g)].map(
          (m) => m[1],
        ),
      ),
    ],
  };
}
function changes(body: string, id: string, sourceUrl: string): ChangeItem[] {
  const bullets = body
    .split(/\r?\n/)
    .filter((line) => /^\s*[-*]\s/.test(line))
    .map((line) => line.replace(/^\s*[-*]\s+/, "").trim());
  return (bullets.length ? bullets : [body.trim()])
    .filter(Boolean)
    .map((body, i) => ({
      id: `${id}-change-${i + 1}`,
      title: body.replace(/[`*]/g, "").slice(0, 120),
      body,
      sourceUrl,
      ...signals(body),
    }));
}
export function parseClaude(markdown: string, fetchedAt: string): Release[] {
  const sections = [
    ...markdown.matchAll(
      /^##\s+(\d+\.\d+\.\d+)\s*\r?\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/gm,
    ),
  ].slice(0, 5);
  if (sections.length < 2)
    throw new Error("Claude changelog format unsupported; snapshot retained.");
  return sections.map((m) => {
    const id = `claude-code-${m[1]}`;
    const sourceUrl = `https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#${m[1].replaceAll(".", "")}`;
    return {
      id,
      channel: "claude-code",
      version: m[1],
      date: "",
      title: `Claude Code ${m[1]}`,
      changes: changes(m[2], id, sourceUrl),
      sourceUrl,
      fetchedAt,
    };
  });
}
export function parseCLI(data: unknown, fetchedAt: string): Release[] {
  if (!Array.isArray(data))
    throw new Error("CLI release source is not an array.");
  const stable = data
    .filter(
      (r) =>
        !r.prerelease && !r.draft && /^rust-v\d+\.\d+\.\d+$/.test(r.tag_name),
    )
    .slice(0, 5);
  if (stable.length < 2)
    throw new Error("Insufficient stable CLI releases; snapshot retained.");
  return stable.map((r) => {
    if (
      typeof r.body !== "string" ||
      !/^https:\/\/github\.com\/openai\/codex\/releases\/tag\//.test(
        r.html_url,
      ) ||
      !/^\d{4}-\d{2}-\d{2}/.test(r.published_at)
    )
      throw new Error("Invalid CLI release entry.");
    const version = r.tag_name.replace("rust-v", "");
    const id = `codex-cli-${version}`;
    return {
      id,
      channel: "codex-cli",
      version,
      date: r.published_at.slice(0, 10),
      title: `Codex CLI ${version}`,
      changes: changes(r.body, id, r.html_url),
      sourceUrl: r.html_url,
      fetchedAt,
    };
  });
}
const plain = (s: string) =>
  s
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export function parseDesktop(html: string, fetchedAt: string): Release[] {
  const entries = [
    ...html.matchAll(
      /<(?:section|div|li)\b([^>]*\bid="(codex-[^"]+)"[^>]*)>([\s\S]*?)(?=<(?:section|div|li)\b[^>]*\bid="codex-|$(?![\s\S]))/g,
    ),
  ];
  const app = entries
    .filter((m) => /data-codex-topics="[^"]*codex-app/.test(m[1]))
    .slice(0, 5);
  if (app.length < 2)
    throw new Error("Desktop changelog format unsupported; snapshot retained.");
  return app.map((m) => {
    const date = plain(m[3].match(/<time[^>]*>([\s\S]*?)<\/time>/)?.[1] ?? "");
    const title = plain(
      m[3]
        .match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1]
        ?.replace(/<button[\s\S]*?<\/button>/g, "") ?? "Desktop update",
    );
    const article =
      m[3].match(/<article[^>]*>([\s\S]*?)<\/article>/)?.[1] ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !article)
      throw new Error("Invalid desktop source entry.");
    const sourceUrl = `${sourceUrls.desktop}#${m[2]}`;
    const id = m[2];
    const bodies = [
      ...article.matchAll(/<(?:li|p)(?:\s[^>]*)?>([\s\S]*?)<\/(?:li|p)>/g),
    ]
      .map((x) => plain(x[1]))
      .filter(Boolean);
    return {
      id,
      channel: "codex-desktop",
      date,
      title,
      sourceUrl,
      fetchedAt,
      changes: bodies.map((body, i) => ({
        id: `${id}-change-${i + 1}`,
        title: body.slice(0, 120),
        body,
        sourceUrl,
        ...signals(body),
      })),
    };
  });
}
export async function fetchOfficialSnapshots(): Promise<Release[]> {
  const get = async (url: string) => {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "UpdateLens/0.1",
        Accept: "application/json,text/html,text/plain",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw new Error(`Official source returned HTTP ${response.status}.`);
    const text = await response.text();
    if (text.length > 12_000_000)
      throw new Error("Official source exceeds limit.");
    return text;
  };
  const [claude, cli, desktop] = await Promise.all([
    get(sourceUrls.claude),
    get(sourceUrls.cli),
    get(sourceUrls.desktop),
  ]);
  const fetchedAt = new Date().toISOString();
  return [
    ...parseClaude(claude, fetchedAt),
    ...parseCLI(JSON.parse(cli), fetchedAt),
    ...parseDesktop(desktop, fetchedAt),
  ];
}
export async function loadSnapshots(): Promise<Release[]> {
  return JSON.parse(
    await readFile(new URL("./data/releases.json", import.meta.url), "utf8"),
  );
}
export function getCoverage(releases: Release[], channel: ChannelId): Coverage {
  const items = releases.filter((r) => r.channel === channel);
  if (!items.length) throw new Error("Channel snapshot missing.");
  const channelConfig = channels.find((c) => c.id === channel)!;
  return {
    channel,
    selectionKind: channelConfig.selectionKind,
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
}
export function selectReleases(
  releases: Release[],
  channel: ChannelId,
  from: string,
  to: string,
): ReleasesResponse {
  if (!channels.some((c) => c.id === channel))
    throw new Error("Unsupported channel.");
  const items = releases.filter((r) => r.channel === channel);
  const key = (r: Release) => r.version ?? r.date;
  if (channel === "codex-desktop") {
    if (
      !items.some((r) => r.date === from) ||
      !items.some((r) => r.date === to) ||
      from > to
    )
      throw new Error(
        "Unsupported date range. Choose supplied dated entries with target at or after current.",
      );
    return {
      releases: items.filter((r) => r.date > from && r.date <= to),
      coverage: { ...getCoverage(releases, channel), from, to },
    };
  }
  const start = items.findIndex((r) => key(r) === from);
  const end = items.findIndex((r) => key(r) === to);
  if (start < 0 || end < 0 || start < end)
    throw new Error(
      "Unsupported range. Choose a current and target value from the supplied snapshot, with target at or after current.",
    );
  return {
    releases: start === end ? [] : items.slice(end, start),
    coverage: { ...getCoverage(releases, channel), from, to },
  };
}
