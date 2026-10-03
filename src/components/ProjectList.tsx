import type { ProjectRegistration, ProjectSummary } from "../shared/contracts";
import Icon from "./Icon";
interface Props {
  projects: (ProjectRegistration | ProjectSummary)[];
  selected: string[];
  pins: string[];
  busy: boolean;
  local: boolean;
  onSelect: (id: string) => void;
  onPin: (id: string) => void;
  onScan: () => void;
}
export function projectDisplayName(name: string) {
  return name
    .replace(/^Synthetic\s*·\s*/, "")
    .replace("Missing project evidence", "Missing evidence");
}
export default function ProjectList(p: Props) {
  const ordered = [...p.projects].sort(
    (a, b) =>
      Number(p.pins.includes(b.id)) - Number(p.pins.includes(a.id)) ||
      ("activityScore" in b ? b.activityScore : 0) -
        ("activityScore" in a ? a.activityScore : 0),
  );
  return (
    <section className="project-section">
      <div className="rail-section-heading">
        <h3>Projects</h3>
        <span>Up to 3</span>
      </div>
      {!p.projects.length ? (
        <p className="empty">No registered roots available.</p>
      ) : (
        <div className="project-list">
          {ordered.map((project) => (
            <div
              className={`project-row ${p.selected.includes(project.id) ? "chosen" : ""}`}
              key={project.id}
            >
              <label className="project-selection">
                <input
                  type="checkbox"
                  aria-label={`Select ${project.name}`}
                  checked={p.selected.includes(project.id)}
                  disabled={
                    p.busy ||
                    (!p.selected.includes(project.id) && p.selected.length >= 3)
                  }
                  onChange={() => p.onSelect(project.id)}
                />
                <span className="project-name">
                  <strong>{projectDisplayName(project.name)}</strong>
                  <span>
                    {p.local
                      ? "status" in project
                        ? `${project.evidence.length} declarations · ${project.status}`
                        : "Registered · not scanned"
                      : "Synthetic fixture"}
                  </span>
                </span>
              </label>
              <button
                className={`pin ${p.pins.includes(project.id) ? "pinned" : ""}`}
                aria-label={`${p.pins.includes(project.id) ? "Unpin" : "Pin"} ${project.name}`}
                aria-pressed={p.pins.includes(project.id)}
                onClick={() => p.onPin(project.id)}
                title="Manual pin"
              >
                <Icon name="pin" size={17} />
              </button>
            </div>
          ))}
        </div>
      )}
      {p.local ? (
        <button
          className="secondary scan-button"
          onClick={p.onScan}
          disabled={p.busy || !p.selected.length}
        >
          <Icon name="search" size={15} />
          Scan selected
        </button>
      ) : null}
      {p.local &&
      ordered.some((project) => "activityExplanation" in project) ? (
        <details className="rail-note">
          <summary>Collection & recency</summary>
          {ordered.map((project) =>
            "activityExplanation" in project ? (
              <div key={project.id}>
                <strong>{project.name}</strong>
                <p>{project.activityExplanation}</p>
                {project.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null,
          )}
        </details>
      ) : null}
    </section>
  );
}
