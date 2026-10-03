import { useLayoutEffect, useRef, useState } from "react";
import type { ReviewController } from "../client/useReviewController";
import {
  presentFinding,
  projectName,
  categoryLabels,
  scopedProjects,
  visibleFindings,
} from "../client/presentation";
import Icon from "./Icon";
export default function ReviewIndex({
  review: r,
}: {
  review: ReviewController;
}) {
  const projects = scopedProjects(r.report, r.projects, r.selected),
    current =
      r.finding && r.report ? presentFinding(r.report, r.finding) : null;
  const container = useRef<HTMLDivElement>(null),
    [marker, setMarker] = useState({ top: 0, height: 0 });
  const signature = r.findings.map((item) => item.id).join("|");
  useLayoutEffect(() => {
    const update = () => {
      const selected = container.current?.querySelector<HTMLElement>(
        '[aria-current="true"]',
      );
      setMarker(
        selected
          ? { top: selected.offsetTop, height: selected.offsetHeight }
          : { top: 0, height: 0 },
      );
      const list = container.current;
      if (selected && list) {
        const bottom = selected.offsetTop + selected.offsetHeight;
        const top = selected.offsetTop;
        if (
          top < list.scrollTop ||
          bottom > list.scrollTop + list.clientHeight
        ) {
          list.scrollTo({
            top: top < list.scrollTop ? top : bottom - list.clientHeight,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "instant"
              : "smooth",
          });
        }
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [r.selectedFinding, signature]);
  const status = r.finding
    ? (r.tasks[r.finding.id]?.status ?? "pending")
    : "pending";
  return (
    <aside className="review-index" aria-label="Review navigation">
      <section className="index-project">
        <div className="index-heading">
          <h2>
            {r.projectMode === "demo" ? "Sample projects" : "Local projects"}
          </h2>
          <span>{r.selected.length}</span>
        </div>
        <label>
          <span className="sr-only">Project view filter</span>
          <select
            value={r.viewProject}
            onChange={(event) => r.chooseProjectView(event.target.value)}
          >
            <option value="all">All scoped projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {projectName(project.name)}
              </option>
            ))}
          </select>
        </label>
        <p className="index-hint">View filter · scope unchanged</p>
      </section>
      <section className="index-findings">
        <div className="index-filter-heading">
          <h2>Changes in this update</h2>
          <label className="category-filter">
            <span className="sr-only">Finding category</span>
            <select
              value={r.category}
              onChange={(event) =>
                r.chooseCategory(event.target.value as typeof r.category)
              }
            >
              {(
                Object.keys(categoryLabels) as (keyof typeof categoryLabels)[]
              ).map((value) => (
                <option key={value} value={value}>
                  {value === "all"
                    ? "All"
                    : value === "unknown"
                      ? "Unknown"
                      : categoryLabels[value]}{" "}
                  ({visibleFindings(r.report, r.viewProject, value).length})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          ref={container}
          className="index-links"
          role="region"
          aria-label={`${r.findings.length} findings in the current view; scroll to inspect all`}
          tabIndex={0}
        >
          <span
            className="index-selection-marker"
            style={{
              height: marker.height,
              transform: `translateY(${marker.top}px)`,
              opacity: marker.height ? 1 : 0,
            }}
            aria-hidden="true"
          />
          {r.findings.map((item) => {
            const view = r.report ? presentFinding(r.report, item) : null;
            return (
              <button
                key={item.id}
                aria-current={
                  item.id === r.selectedFinding ? "true" : undefined
                }
                className={item.id === r.selectedFinding ? "selected" : ""}
                onClick={() => r.setSelectedFinding(item.id)}
              >
                <span>{view?.title ?? item.title}</span>
                <Icon name="chevron" size={18} />
              </button>
            );
          })}
          {!r.findings.length ? (
            <p className="index-empty">
              {r.report
                ? "No findings in this view."
                : "Analyze the selected scope."}
            </p>
          ) : null}
        </div>
      </section>
      <section className="index-current">
        <h2>Current item</h2>
        {current && r.report ? (
          <div className="index-source">
            <Icon name="file" size={25} />
            <div>
              <a
                href={
                  current.changes[0]?.sourceUrl ?? r.report.coverage.sourceUrl
                }
                target="_blank"
                rel="noreferrer"
              >
                Official source
                <Icon name="external" size={16} />
              </a>
              <p>{current.sourceLabel}</p>
              <p>
                Retrieved{" "}
                {new Date(r.report.coverage.fetchedAt).toLocaleDateString(
                  "en",
                  { month: "short", day: "2-digit", year: "numeric" },
                )}
              </p>
              <p>
                {r.report.coverage.complete
                  ? "Selected coverage"
                  : "Incomplete coverage"}
              </p>
            </div>
          </div>
        ) : (
          <p className="index-empty">No item selected.</p>
        )}
      </section>
      <section className="index-task">
        <h2>Task status</h2>
        <div>
          <span className={`task-state-icon ${status}`}>
            <Icon name="circle" weight="fill" size={18} />
          </span>
          <div>
            <h3>
              {status === "needs-action"
                ? "Needs action"
                : status === "deferred"
                  ? "Deferred"
                  : status === "done"
                    ? "Done · your report"
                    : "Pending"}
            </h3>
            <p>
              {r.finding
                ? "Record what you checked, then move to the next change."
                : "Select a finding to record your check."}
            </p>
          </div>
        </div>
      </section>
    </aside>
  );
}
