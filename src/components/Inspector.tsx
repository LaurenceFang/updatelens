import type { Finding, Report, Task } from "../shared/contracts";
import Icon from "./Icon";
import { projectDisplayName } from "./ProjectList";
import { prioritizeEvidence } from "../client/evidence";
interface Props {
  report: Report | null;
  finding: Finding | undefined;
  task: Task | undefined;
  onTask: (patch: Partial<Task>) => void;
}
function DisclosureText({
  text,
  label,
  limit = 240,
}: {
  text: string;
  label: string;
  limit?: number;
}) {
  if (text.length <= limit) return <p>{text}</p>;
  const cut = text.lastIndexOf(" ", limit);
  return (
    <>
      <p>{text.slice(0, cut > limit / 2 ? cut : limit)}…</p>
      <details className="text-disclosure">
        <summary>Read full {label}</summary>
        <p>{text}</p>
      </details>
    </>
  );
}
export default function Inspector(p: Props) {
  const f = p.finding;
  if (!f || !p.report)
    return (
      <aside
        className="inspector empty-inspector"
        aria-label="Finding inspector"
      >
        <div className="inspector-heading">
          <h2>Evidence detail</h2>
        </div>
        <div className="inspector-placeholder">
          <Icon name="search" size={30} />
          <h3>Follow the evidence</h3>
          <p>
            Choose a finding to inspect its source, local declarations and
            suggested check.
          </p>
          <div className="evidence-sequence">
            <span>01 Official change</span>
            <span>02 Local evidence</span>
            <span>03 Association</span>
          </div>
        </div>
      </aside>
    );
  const project = p.report.projects.find((x) => x.id === f.projectId);
  const changes = p.report.releases
    .flatMap((r) => r.changes)
    .filter((c) => f.changeIds.includes(c.id));
  const evidence = prioritizeEvidence(
    project?.evidence.filter((e) => f.evidenceIds.includes(e.id)) ?? [],
    changes,
  );
  const sourceLinks = [
    ...new Map(changes.map((c) => [c.sourceUrl, c])).values(),
  ];
  const tasks = [
    ["pending", "Pending"],
    ["needs-action", "Needs action"],
    ["done", "Done"],
    ["deferred", "Defer"],
  ] as const;
  return (
    <aside
      className="inspector"
      aria-label="Finding inspector"
      id="evidence-detail"
      tabIndex={-1}
    >
      <div className="inspector-heading">
        <h2>Evidence detail</h2>
        <p>
          <Icon name="folder" size={17} />
          {projectDisplayName(project?.name ?? f.projectId)}
        </p>
        <span className="inspector-origin">
          {f.origin === "ai" ? "Live AI refinement" : "Rule inference"} ·{" "}
          {f.confidence} association confidence
        </span>
      </div>
      <section className="inspector-part">
        <span className="step">01</span>
        <div>
          <h3>Official change</h3>
          <DisclosureText
            text={changes[0]?.body ?? f.sourceFact}
            label="statement"
            limit={250}
          />
          {sourceLinks.slice(0, 2).map((c, i) => (
            <a
              key={c.sourceUrl}
              href={c.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Official source{sourceLinks.length > 1 ? ` ${i + 1}` : ""}
              <Icon name="external" size={13} />
            </a>
          ))}
          {changes.length > 1 ? (
            <details className="text-disclosure source-statements">
              <summary>{changes.length} cited changes · inspect all</summary>
              {changes.map((change) => (
                <div key={change.id}>
                  <p>{change.body}</p>
                  <a href={change.sourceUrl} target="_blank" rel="noreferrer">
                    Source
                    <Icon name="external" size={12} />
                  </a>
                </div>
              ))}
            </details>
          ) : null}
          <p className="context-note">
            Retrieved{" "}
            {new Date(p.report.coverage.fetchedAt).toLocaleDateString("en", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            ·{" "}
            {p.report.coverage.complete
              ? "Selected coverage"
              : "Incomplete coverage"}
          </p>
        </div>
      </section>
      <section className="inspector-part">
        <span className="step">02</span>
        <div>
          <h3>Local evidence</h3>
          {evidence.length ? (
            <>
              {evidence.slice(0, 2).map((e) => (
                <div className="evidence" key={e.id}>
                  <code>
                    {e.path}
                    {e.line ? `:${e.line}` : ""}
                    {e.field ? ` → ${e.field}` : ""}
                  </code>
                  <p>{e.summary}</p>
                </div>
              ))}
              {evidence.length > 2 ? (
                <details className="text-disclosure">
                  <summary>
                    {evidence.length - 2} more cited declarations
                  </summary>
                  {evidence.slice(2).map((e) => (
                    <div className="evidence" key={e.id}>
                      <code>
                        {e.path}
                        {e.line ? `:${e.line}` : ""}
                        {e.field ? ` → ${e.field}` : ""}
                      </code>
                      <p>{e.summary}</p>
                    </div>
                  ))}
                </details>
              ) : null}
            </>
          ) : (
            <p>{f.localObservation}</p>
          )}
          <details className="text-disclosure">
            <summary>Collection observation</summary>
            <p>{f.localObservation}</p>
          </details>
        </div>
      </section>
      <section className="inspector-part">
        <span className="step">03</span>
        <div>
          <h3>Association</h3>
          <DisclosureText text={f.inference} label="inference" limit={260} />
        </div>
      </section>
      <section className="inspector-part check-part">
        <span className="check-icon">
          <Icon name="search" size={16} />
        </span>
        <div>
          <h3>Suggested check</h3>
          <DisclosureText text={f.suggestedAction} label="check" limit={220} />
        </div>
      </section>
      <div className="task-editor">
        <label>Task state</label>
        <div className="task-states" role="group" aria-label="Task status">
          {tasks.map(([value, label]) => (
            <button
              key={value}
              className={
                (p.task?.status ?? "pending") === value ? "active" : ""
              }
              aria-pressed={(p.task?.status ?? "pending") === value}
              onClick={() => p.onTask({ status: value })}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="verification-note">
          Verification note
          <textarea
            rows={3}
            maxLength={3000}
            value={p.task?.verificationNotes ?? ""}
            placeholder="Record what you observed…"
            onChange={(e) => p.onTask({ verificationNotes: e.target.value })}
          />
        </label>
        <p className="context-note task-disclosure">
          <Icon name="info" size={14} />
          Status is your report; no check was executed.
        </p>
      </div>
    </aside>
  );
}
