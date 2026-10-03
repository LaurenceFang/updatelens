import { useState } from "react";
import type { Finding, Report, Task } from "../shared/contracts";
import Icon from "./Icon";
import { projectDisplayName } from "./ProjectList";
import { prioritizeEvidence } from "../client/evidence";
interface Props {
  report: Report | null;
  projectMode: "demo" | "local";
  selectedId: string;
  onSelect: (id: string) => void;
  tasks: Record<string, Task>;
  onExport: () => void;
}
const filters = [
  { id: "all", label: "All" },
  { id: "impact", label: "Relevant" },
  { id: "unknown", label: "Unconfirmed" },
  { id: "unrelated", label: "Unrelated" },
] as const;
export default function FindingList(p: Props) {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const findings = p.report?.findings ?? [],
    filtered = findings
      .filter((f) => filter === "all" || f.category === filter)
      .sort(
        (a, b) =>
          ({ impact: 0, unknown: 1, unrelated: 2 })[a.category] -
          { impact: 0, unknown: 1, unrelated: 2 }[b.category],
      );
  return (
    <section className="findings-section">
      <div className="finding-toolbar">
        <div>
          <h2>Findings</h2>
          <span>
            {!p.report
              ? "Awaiting analysis"
              : p.report.mode === "live-ai"
                ? "Live AI refinement"
                : "Rule analysis"}
          </span>
        </div>
        <button
          className="text-button export-trigger"
          onClick={p.onExport}
          disabled={!p.report}
        >
          Export <Icon name="download" size={15} />
        </button>
      </div>
      <div className="tabs" role="group" aria-label="Finding category">
        {filters.map((f) => (
          <button
            key={f.id}
            aria-pressed={filter === f.id}
            className={filter === f.id ? "active" : ""}
            onClick={() => {
              setFilter(f.id);
              const visible = findings.filter(
                (item) => f.id === "all" || item.category === f.id,
              );
              if (!visible.some((item) => item.id === p.selectedId))
                p.onSelect(visible[0]?.id ?? "");
            }}
          >
            {f.label}
            <span>
              {
                findings.filter((x) => f.id === "all" || x.category === f.id)
                  .length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="finding-list">
        {filtered.length ? (
          filtered.map((f) => {
            const project = p.report?.projects.find(
                (x) => x.id === f.projectId,
              ),
              changes =
                p.report?.releases
                  .flatMap((release) => release.changes)
                  .filter((change) => f.changeIds.includes(change.id)) ?? [];
            const locator = prioritizeEvidence(
              project?.evidence.filter((e) => f.evidenceIds.includes(e.id)) ??
                [],
              changes,
            )[0];
            return (
              <button
                className={`finding-row ${f.category} ${p.selectedId === f.id ? "selected" : ""}`}
                key={f.id}
                aria-pressed={p.selectedId === f.id}
                onClick={() => p.onSelect(f.id)}
              >
                <span className={`association-dot ${f.category}`} />
                <div className="finding-content">
                  <strong>{displayTitle(f)}</strong>
                  <p>{findingDescription(f)}</p>
                  <div className="finding-metadata">
                    <span>
                      <Icon name="folder" size={14} />
                      {projectDisplayName(project?.name ?? f.projectId)}
                    </span>
                    {locator ? (
                      <span className="locator">
                        <Icon name="file" size={14} />
                        {locator.path}
                      </span>
                    ) : null}
                    <span className="association-label">
                      {p.tasks[f.id]?.status === "done"
                        ? "Done · your report"
                        : f.category === "impact"
                          ? f.confidence === "high"
                            ? "Direct association"
                            : "Feature hypothesis"
                          : f.category === "unknown"
                            ? "Unconfirmed"
                            : "Scoped unrelated"}
                    </span>
                  </div>
                </div>
                <Icon name="chevron" size={17} />
              </button>
            );
          })
        ) : (
          <div className="empty finding-empty">
            <Icon name="search" size={26} />
            <h3>{p.report ? "No findings in this view" : "Ready to review"}</h3>
            <p>
              {p.report
                ? "No compatibility conclusion follows from an empty result."
                : "Choose your update and projects, then analyze the official changes."}
            </p>
          </div>
        )}
      </div>
      <p className="finding-disclosure">
        <Icon name="info" size={15} />
        {p.projectMode === "local"
          ? p.report?.projects.length
            ? "Local declarations · associations are hypotheses."
            : p.report
              ? "Local review · no project evidence in this report."
              : "Local projects · no scan-based review yet."
          : "Synthetic projects · real official source snapshot."}
      </p>
    </section>
  );
}
function displayTitle(f: Finding) {
  if (f.category === "unknown") return "Project applicability is unconfirmed";
  if (f.category === "unrelated")
    return "No match within the selected workflow";
  const feature = f.title.split(" · ")[1];
  if (feature && !/^\d/.test(feature))
    return `${feature === "mcp" ? "MCP" : feature[0].toUpperCase() + feature.slice(1)} ${f.confidence === "high" ? "declaration deserves a focused check" : "changes may affect this workflow"}`;
  return f.title;
}
function findingDescription(f: Finding) {
  return f.category === "unknown"
    ? "Collected declarations do not establish applicability."
    : f.category === "unrelated"
      ? "No association within the collected evidence and chosen areas."
      : f.confidence === "high"
        ? "Named declarations intersect with official change signals."
        : "Shared features suggest relevance; runtime impact is unconfirmed.";
}
