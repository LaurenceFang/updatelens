import type { ReviewController } from "../client/useReviewController";
import Dialog from "./Dialog";
import ProjectList from "./ProjectList";
import Icon from "./Icon";
export default function ScopeDialog({
  review: r,
}: {
  review: ReviewController;
}) {
  if (!r.boot) return null;
  return (
    <Dialog
      title="Edit review scope"
      className="scope-dialog"
      onClose={() => r.setDialog(null)}
    >
      {(close) => (
        <>
          <p className="dialog-intro">
            Choose the workflow and up to three projects for this review.
            Project viewing in the right index does not change this scope.
          </p>
          <fieldset className="scope-feature-set">
            <legend>Workflow areas</legend>
            <div className="scope-feature-grid">
              {r.boot!.workflowFeatures.map((feature) => (
                <label key={feature.id}>
                  <input
                    type="checkbox"
                    checked={r.features.includes(feature.id)}
                    disabled={r.busy}
                    onChange={() =>
                      r.chooseFeatures(
                        r.features.includes(feature.id)
                          ? r.features.filter((item) => item !== feature.id)
                          : [...r.features, feature.id],
                      )
                    }
                  />
                  {feature.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="scope-project-mode">
            <span>Project scope</span>
            <div role="group" aria-label="Project mode">
              <button
                className={r.projectMode === "demo" ? "active" : ""}
                aria-pressed={r.projectMode === "demo"}
                disabled={r.busy}
                onClick={() => r.chooseMode("demo")}
              >
                Sample projects
              </button>
              <button
                className={r.projectMode === "local" ? "active" : ""}
                aria-pressed={r.projectMode === "local"}
                disabled={r.busy || r.boot!.mode === "demo"}
                onClick={() => r.chooseMode("local")}
              >
                Registered local projects
              </button>
            </div>
          </div>
          <ProjectList
            projects={r.projects}
            selected={r.selected}
            pins={r.pins}
            busy={r.busy}
            local={r.projectMode === "local"}
            onSelect={r.toggleProject}
            onPin={r.togglePin}
            onScan={r.scan}
          />
          <div className="scope-coverage">
            <div>
              <h3>Official source coverage</h3>
              <p>{r.coverage?.limitation}</p>
              <p className="metadata">
                Retrieved{" "}
                {r.coverage
                  ? new Date(r.coverage.fetchedAt).toLocaleString()
                  : "unknown"}{" "}
                · {r.coverage?.stale ? "Stale snapshot" : "Dated snapshot"}
              </p>
            </div>
            <button
              className="text-button"
              disabled={r.busy || r.boot!.mode === "demo"}
              onClick={() => void r.refresh()}
            >
              <Icon name="refresh" size={16} />
              Refresh sources
            </button>
          </div>
          {r.error ? (
            <p className="message error" role="alert">
              {r.error}
            </p>
          ) : null}
          {r.notice ? (
            <p className="message notice" role="status">
              {r.notice}
            </p>
          ) : null}
          <div className="dialog-actions">
            <button className="secondary" onClick={close}>
              Close scope
            </button>
            <button
              className="primary"
              disabled={r.busy}
              onClick={async () => {
                if (await r.analyze()) close();
              }}
            >
              {r.busy ? "Working…" : "Analyze update"}
              <Icon name="arrow" />
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
