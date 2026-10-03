import type { Finding, ProjectSummary, Report } from "../shared/contracts";
import { prioritizeEvidence } from "./evidence";
export type FindingCategory = "all" | Finding["category"];
export const categoryLabels = {
  all: "All findings",
  impact: "Relevant",
  unknown: "Unconfirmed",
  unrelated: "Unrelated",
} as const;
export const channelLabels = {
  "claude-code": "Claude Code",
  "codex-cli": "Codex CLI",
  "codex-desktop": "Codex desktop",
} as const;
export function projectName(name: string) {
  return name
    .replace(/^Synthetic\s*·\s*/, "")
    .replace("Missing project evidence", "Missing evidence");
}
export function visibleFindings(
  report: Report | null,
  projectId: string,
  category: FindingCategory,
): Finding[] {
  return (report?.findings ?? []).filter(
    (item) =>
      (projectId === "all" || item.projectId === projectId) &&
      (category === "all" || item.category === category),
  );
}
export function presentFinding(report: Report, finding: Finding) {
  const project = report.projects.find((item) => item.id === finding.projectId);
  const changes = report.releases
    .flatMap((release) => release.changes)
    .filter((change) => finding.changeIds.includes(change.id));
  const evidence = prioritizeEvidence(
    project?.evidence.filter((item) => finding.evidenceIds.includes(item.id)) ??
      [],
    changes,
  );
  const release = report.releases.find((item) =>
    item.changes.some((change) => finding.changeIds.includes(change.id)),
  );
  const name = projectName(project?.name ?? finding.projectId);
  const signals = new Set(changes.flatMap((change) => change.signals ?? []));
  const features = new Set(changes.flatMap((change) => change.features));
  const body = changes[0]?.body ?? finding.sourceFact;
  let title: string;
  if (finding.category === "unknown") {
    title = !project?.evidence.length
      ? `${name}: project evidence missing`
      : !features.size
        ? `${name}: unmapped update notes`
        : `${name}: applicability unconfirmed`;
  } else if (finding.category === "unrelated") {
    title = `${name}: no scoped ${features.has("mcp") ? "MCP" : features.has("skills") ? "skills" : "workflow"} association`;
  } else if (
    features.has("mcp") &&
    /load|defer|alwaysLoad/i.test(body) &&
    finding.confidence === "high"
  )
    title = "MCP loading precedence";
  else if (features.has("mcp"))
    title =
      finding.confidence === "high"
        ? "MCP configuration signals"
        : "MCP workflow changes";
  else if (signals.has("PreToolUse")) title = "PreToolUse hook behavior";
  else if (features.has("hooks")) title = "Hook workflow changes";
  else if (features.has("skills")) title = "Skills and plugin workflow";
  else if (features.has("models")) title = "Model provider declarations";
  else if (features.has("permissions"))
    title = "Permission and sandbox controls";
  else if (features.has("sessions")) title = "Session workflow changes";
  else if (features.has("ci")) title = "CLI automation declarations";
  else title = "Project configuration signals";
  return {
    project,
    name,
    changes,
    evidence,
    release,
    body,
    title,
    sourceLabel: release?.title ?? channelLabels[report.channel],
  };
}
export function scopedProjects(
  report: Report | null,
  projects: Pick<ProjectSummary, "id" | "name">[],
  selected: string[],
) {
  return (report?.projects ?? projects).filter((project) =>
    selected.includes(project.id),
  );
}
