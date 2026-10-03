import type { ReviewController } from "../client/useReviewController";
import ScopeDialog from "./ScopeDialog";
import Dialog from "./Dialog";
import Icon from "./Icon";
export default function ReviewDialogs({
  review: r,
}: {
  review: ReviewController;
}) {
  if (!r.boot) return null;
  return (
    <>
      {r.dialog === "scope" ? <ScopeDialog review={r} /> : null}
      {r.dialog === "method" ? (
        <Dialog title="Method & privacy" onClose={() => r.setDialog(null)}>
          <div className="prose">
            <p>
              UpdateLens associates official release statements with bounded
              project declarations. An association is a hypothesis, never proof
              of impact or a compatibility verdict.
            </p>
            <p>
              Sample projects are synthetic fixtures. Local mode reads only
              explicitly registered roots, supported configuration, known script
              references, CI declarations and limited metadata. Raw
              configuration values are omitted; histories and sensitive file
              types are excluded. No scripts are executed and no projects are
              modified.
            </p>
            <p>
              Sources are a curated dated snapshot with incomplete coverage.
              Claude changelog publication dates are unknown. Codex desktop uses
              dated app entries separately from CLI releases; CLI configuration
              cannot establish desktop applicability.
            </p>
            <p>
              Live AI uses OpenCode Go / DeepSeek V4.1 Flash only after the
              exact normalized payload is previewed and explicitly sent.
              Credentials stay on the local server. Raw files, absolute roots,
              project names and private collection digests are excluded.
              Citation existence and ownership are checked; semantic correctness
              is not automatically verified.
            </p>
            <p>
              Task status and notes persist in this browser. Done is your
              report, not independently verified execution. OS and workflow
              areas are remembered as user-selected preferences; development OS
              does not establish remote CI platforms. No roots, provider keys or
              collected project data are stored in the reusable profile.
            </p>
            <p>
              The right project selector filters the reading view among the
              projects already selected in scope. It never adds a root, runs a
              scan or changes the external payload scope.
            </p>
            {r.error ? (
              <p className="message error" role="alert">
                {r.error}
              </p>
            ) : null}
            <button className="secondary" onClick={r.clearTasks}>
              Clear saved task notes
            </button>
          </div>
        </Dialog>
      ) : null}
      {r.dialog === "sources" ? (
        <Dialog
          title="Official source snapshot"
          onClose={() => r.setDialog(null)}
        >
          <p className="dialog-intro">{r.coverage?.limitation}</p>
          <p className="metadata">
            Changes after the current boundary, through the target. This list
            shows the available curated window.
          </p>
          <div className="source-list">
            {r.boot.releases
              .filter((release) => release.channel === r.channel)
              .map((release) => (
                <details key={release.id}>
                  <summary>
                    {release.title}
                    <span>
                      {release.date || "Publication date not provided"}
                    </span>
                  </summary>
                  <p className="metadata">
                    <a
                      href={release.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Official source
                      <Icon name="external" size={15} />
                    </a>{" "}
                    · Retrieved {new Date(release.fetchedAt).toLocaleString()}
                  </p>
                  <ul>
                    {release.changes.map((change) => (
                      <li key={change.id}>{change.body}</li>
                    ))}
                  </ul>
                </details>
              ))}
          </div>
        </Dialog>
      ) : null}
      {r.dialog === "export" ? (
        <Dialog title="Export this review" onClose={() => r.setDialog(null)}>
          <p className="dialog-intro">
            Export the complete scoped review, including source links, cited
            declarations and your reported task notes. A reading-view filter
            does not reduce the export scope. Secrets and absolute paths are
            scrubbed.
          </p>
          <div className="export-options">
            <button
              className="secondary"
              disabled={!r.report}
              onClick={() => r.exportReview("markdown")}
            >
              <Icon name="file" size={22} />
              <span>
                <strong>Markdown</strong>
                <small>Readable review and source links</small>
              </span>
              <Icon name="download" />
            </button>
            <button
              className="secondary"
              disabled={!r.report}
              onClick={() => r.exportReview("json")}
            >
              <Icon name="file" size={22} />
              <span>
                <strong>JSON</strong>
                <small>Structured evidence and user task records</small>
              </span>
              <Icon name="download" />
            </button>
          </div>
        </Dialog>
      ) : null}
      {r.preview ? (
        <Dialog
          title="Review the external AI payload"
          className="payload-dialog"
          onClose={() => r.setPreview(null)}
        >
          <p className="dialog-intro">
            This exact normalized payload will be sent to OpenCode Go / DeepSeek
            V4.1 Flash. It contains official changes and sanitized declaration
            summaries; raw files, excerpts, project names and absolute roots are
            excluded.
          </p>
          <p className="metadata">
            {r.boot.provider.callsRemaining} runtime requests remaining. No
            retry, model switch or paid fallback. Up to six finding groups are
            balanced across projects with findings; remaining groups retain rule
            analysis.
          </p>
          <div className="preview-projects">
            <h3>Project summaries</h3>
            {r.preview.report.projects.map((project) => (
              <p key={project.id}>
                <strong>{project.name}</strong> · {project.status} ·{" "}
                {project.evidence.length} declaration observations.{" "}
                {project.warnings[0]}
              </p>
            ))}
          </div>
          <pre className="payload">
            {JSON.stringify(r.preview.payload, null, 2)}
          </pre>
          <div className="dialog-actions">
            <button className="secondary" onClick={() => r.setPreview(null)}>
              Cancel
            </button>
            <button
              className="primary"
              onClick={() => void r.sendAI()}
              disabled={
                r.busy ||
                !r.boot.provider.ready ||
                r.boot.provider.callsRemaining < 1
              }
            >
              Send this payload to OpenCode Go
              <Icon name="arrow" />
            </button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
