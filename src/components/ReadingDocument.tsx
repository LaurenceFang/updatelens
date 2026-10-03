import type { ReviewController } from "../client/useReviewController";
import { presentFinding, channelLabels } from "../client/presentation";
import Icon from "./Icon";
import VerificationPack from "./VerificationPack";
const statuses = [
  ["pending", "Pending"],
  ["needs-action", "Needs action"],
  ["done", "Done"],
  ["deferred", "Deferred"],
] as const;
function InlineSource({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(`[^`]*`)/g)
        .map((part, index) =>
          part.startsWith("`") && part.endsWith("`") && part.length > 1 ? (
            <code key={index}>{part.slice(1, -1)}</code>
          ) : (
            part
          ),
        )}
    </>
  );
}
export default function ReadingDocument({
  review: r,
}: {
  review: ReviewController;
}) {
  const f = r.finding,
    report = r.report;
  if (!f || !report)
    return (
      <article className="empty-document">
        <h1>{report ? "No findings in this view" : "Review this scope"}</h1>
        <p>
          {report
            ? "This view contains no supported association. An empty result provides no compatibility conclusion."
            : "Choose your workflow and projects in Edit scope, then analyze the official source window."}
        </p>
        <button className="secondary" onClick={() => r.setDialog("scope")}>
          <Icon name="edit" />
          Edit scope
        </button>
      </article>
    );
  const v = presentFinding(report, f),
    task = r.tasks[f.id],
    index = r.findings.findIndex((item) => item.id === f.id);
  const flags = [
    ...new Set(
      v.evidence
        .flatMap((item) => item.signals ?? [])
        .filter((signal) => signal.startsWith("--")),
    ),
  ];
  return (
    <article className="reading-document" aria-label="Finding document">
      <div className="document-heading">
        <h1>{v.title}</h1>
        <p>
          {v.name}
          <span>·</span>
          {v.sourceLabel}
          <span>·</span>
          {f.origin === "ai" ? "AI refinement" : "Rule association"}
        </p>
      </div>
      <section className="document-section official-section">
        <h2>Official release note</h2>
        <p className="release-statement">
          <InlineSource text={v.body} />
        </p>
        <div className="source-metadata">
          <a
            href={v.changes[0]?.sourceUrl ?? report.coverage.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="external" size={17} />
            View official source
          </a>
          <span>{v.sourceLabel}</span>
          <span>
            Retrieved{" "}
            {new Date(report.coverage.fetchedAt).toLocaleDateString("en", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            })}
          </span>
          <span>
            {report.coverage.complete
              ? "Selected coverage"
              : "Incomplete coverage"}
          </span>
          {v.changes.length > 1 ? (
            <details className="document-disclosure source-inline-disclosure">
              <summary>
                Read all {v.changes.length} cited official changes
              </summary>
              {v.changes.map((change) => (
                <div className="expanded-source" key={change.id}>
                  <p>
                    <InlineSource text={change.body} />
                  </p>
                  <a href={change.sourceUrl} target="_blank" rel="noreferrer">
                    Official source
                    <Icon name="external" size={14} />
                  </a>
                </div>
              ))}
            </details>
          ) : null}
        </div>
      </section>
      <section className="document-section declaration-section">
        <div className="chapter-heading">
          <h2>Project declaration</h2>
          <details className="document-disclosure collection-inline-disclosure">
            <summary>Collection details</summary>
            <p>{f.localObservation}</p>
            {v.evidence.map((item) => (
              <div className="expanded-evidence" key={item.id}>
                <code>
                  {item.path}
                  {item.line ? `:${item.line}` : ""}
                  {item.field ? ` → ${item.field}` : ""}
                </code>
                <p>{item.summary}</p>
              </div>
            ))}
          </details>
        </div>
        <p className="section-intro">
          {v.evidence.length
            ? "Relevant declarations from the selected project."
            : f.localObservation}
        </p>
        {v.evidence.length ? (
          <dl className="declaration-rows">
            <div>
              <dt>Source</dt>
              <dd>
                <code>
                  {v.evidence[0].path}
                  {v.evidence[0].line ? `:${v.evidence[0].line}` : ""}
                  {v.evidence[0].field ? ` → ${v.evidence[0].field}` : ""}
                </code>
              </dd>
            </div>
            {flags.length ? (
              <div>
                <dt>Declared flags</dt>
                <dd>
                  <code>{flags.join(", ")}</code>
                </dd>
              </div>
            ) : null}
            {v.evidence[1] ? (
              <div>
                <dt>Declaration</dt>
                <dd>
                  <code>
                    {v.evidence[1].path}
                    {v.evidence[1].field ? ` → ${v.evidence[1].field}` : ""}
                  </code>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Value</dt>
              <dd>
                <code>Raw values omitted</code>
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{v.evidence[0].summary}</dd>
            </div>
          </dl>
        ) : null}
      </section>
      <section className="document-section association-section">
        <h2>Association hypothesis</h2>
        <p>
          {f.category === "impact"
            ? f.confidence === "high"
              ? "Named declarations overlap with the cited update. Runtime impact remains unconfirmed."
              : "Shared workflow features suggest possible relevance. Runtime impact remains unconfirmed."
            : f.category === "unknown"
              ? "Collected evidence does not establish applicability. Product usage and compatibility remain unconfirmed."
              : "No association within the selected workflow and bounded evidence. Uncollected usage remains unconfirmed."}
        </p>
        <div className="association-details">
          <details className="document-disclosure">
            <summary>
              {f.origin === "ai"
                ? "Original AI inference"
                : "Original rule inference"}
            </summary>
            <p>{f.inference}</p>
          </details>
          <details className="document-disclosure">
            <summary>Suggested check</summary>
            <p>{f.suggestedAction}</p>
          </details>
        </div>
      </section>
      <section className="verification-section">
        <div className="verification-heading">
          <h2>Verification task</h2>
          <p>Done is your report; no check was executed.</p>
        </div>
        <div
          className="verification-statuses"
          role="group"
          aria-label="Task status"
        >
          {statuses.map(([value, label]) => (
            <label
              key={value}
              className={
                (task?.status ?? "pending") === value ? "selected" : ""
              }
            >
              <input
                type="radio"
                name={`status-${f.id}`}
                value={value}
                checked={(task?.status ?? "pending") === value}
                onChange={() => r.updateTask({ status: value })}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="verification-actions">
          <label className="note-control">
            <span className="sr-only">Verification note</span>
            <Icon name="edit" size={20} />
            <textarea
              rows={1}
              maxLength={3000}
              value={task?.verificationNotes ?? ""}
              placeholder="Record what you checked…"
              onChange={(event) =>
                r.updateTask({ verificationNotes: event.target.value })
              }
            />
          </label>
          <button
            className="secondary"
            onClick={() => void r.prepareAI()}
            disabled={
              r.busy ||
              r.boot?.mode === "demo" ||
              !r.boot?.provider.ready ||
              !r.selected.length ||
              (r.boot?.provider.callsRemaining ?? 0) < 1
            }
          >
            <Icon name="file" size={19} />
            {r.busy ? "Working…" : "Go payload preview"}
          </button>
          <button
            className="primary next-change"
            disabled={index < 0 || index >= r.findings.length - 1}
            onClick={() => r.moveFinding(1)}
          >
            Next change
            <Icon name="arrow" />
          </button>
        </div>
        <div className="previous-row">
          <button
            className="text-button"
            disabled={index <= 0}
            onClick={() => r.moveFinding(-1)}
          >
            <Icon name="previous" size={15} />
            Previous change
          </button>
          <span>
            {index + 1} of {r.findings.length} in this view
          </span>
        </div>
        <VerificationPack report={report} findingId={f.id} />
      </section>
      <div className="document-footer">
        <span>
          {r.projectMode === "demo"
            ? "Synthetic samples"
            : "Registered local declarations"}{" "}
          · Official snapshot
        </span>
        <span>
          {channelLabels[report.channel]} · {report.from} → {report.to}
        </span>
      </div>
      {report.providerMessage ? (
        <p className="provider-message">{report.providerMessage}</p>
      ) : null}
    </article>
  );
}
