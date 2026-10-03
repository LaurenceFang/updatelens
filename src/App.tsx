import { useEffect, useState } from "react";
import type {
  AnalyzeRequest,
  BootstrapResponse,
  ChannelId,
  FeatureId,
  Finding,
  ProjectSummary,
  Report,
  Task,
  AnalyzeResponse,
  ProviderPublicState,
  OperatingSystem,
} from "./shared/contracts";
import {
  api,
  bootstrap,
  demoAnalyze,
  demoBootstrap,
  downloadReport,
} from "./client/api";
import {
  readPins,
  readProfile,
  readTasks,
  savePins,
  saveProfile,
  saveTasks,
} from "./client/storage";
import SelectionBar from "./components/SelectionBar";
import ProjectList from "./components/ProjectList";
import FindingList from "./components/FindingList";
import Inspector from "./components/Inspector";
import Dialog from "./components/Dialog";
import Icon from "./components/Icon";
import SetupRail from "./components/SetupRail";

type Preview = {
  previewId: string;
  report: Report;
  payload: unknown;
  provider?: ProviderPublicState;
};
export default function App() {
  const [savedProfile] = useState(readProfile);
  const [boot, setBoot] = useState<BootstrapResponse | null>(null);
  const [channel, setChannel] = useState<ChannelId>("claude-code");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [operatingSystem, setOperatingSystem] = useState<OperatingSystem>(
    savedProfile.operatingSystem,
  );
  const [features, setFeatures] = useState<FeatureId[]>(savedProfile.features);
  const [projectMode, setProjectMode] = useState<"demo" | "local">("demo");
  const [selected, setSelected] = useState<string[]>([]);
  const [localScans, setLocalScans] = useState<ProjectSummary[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [selectedFinding, setSelectedFinding] = useState("");
  const [tasks, setTasks] = useState(readTasks);
  const [pins, setPins] = useState(readPins);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!saveProfile({ operatingSystem, features }))
      setError(
        "Browser preference storage is unavailable. OS and workflow areas may not survive reload.",
      );
  }, [operatingSystem, features]);
  const [dialog, setDialog] = useState<"method" | "sources" | "export" | null>(
    null,
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [setupOpen, setSetupOpen] = useState(() => window.innerWidth > 760);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 761px)");
    const change = () => setSetupOpen(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    let active = true;
    bootstrap()
      .catch(() => {
        if (active)
          setNotice(
            "Local API is unavailable. Showing synthetic sample projects with bundled, dated official sources. Local scans and live AI are unavailable.",
          );
        return demoBootstrap();
      })
      .then((value) => {
        if (!active) return;
        setBoot(value);
        const releases = value.releases.filter(
          (r) => r.channel === "claude-code",
        );
        const current = releases.at(-1)!.version!,
          target = releases[0].version!;
        setFrom(current);
        setTo(target);
        const ids = value.demoProjects.map((p) => p.id);
        setSelected(ids);
        const initial = demoAnalyze(value, {
          channel: "claude-code",
          from: current,
          to: target,
          workflow: {
            features: savedProfile.features,
            operatingSystem: savedProfile.operatingSystem,
            operatingSystemSource:
              savedProfile.operatingSystem === "unspecified"
                ? "unspecified"
                : "user-selection",
          },
          projectIds: ids,
          mode: "rule-only",
        });
        setReport(initial);
        setSelectedFinding(
          initial.findings.find((f) => f.category === "impact")?.id ??
            initial.findings[0]?.id ??
            "",
        );
      });
    return () => {
      active = false;
    };
  }, []);
  if (!boot)
    return (
      <main className="loading">
        <h1>UpdateLens</h1>
        <p>Loading the official snapshot and sample declarations…</p>
      </main>
    );
  const request: AnalyzeRequest = {
    channel,
    from,
    to,
    workflow: {
      features,
      operatingSystem,
      operatingSystemSource:
        operatingSystem === "unspecified" ? "unspecified" : "user-selection",
    },
    projectIds: selected,
    mode: "rule-only",
  };
  const coverage = boot.coverage.find((c) => c.channel === channel)!;
  const finding = report?.findings.find((f) => f.id === selectedFinding);
  const projects =
    projectMode === "demo"
      ? boot.demoProjects
      : boot.localProjects.map(
          (p) => localScans.find((s) => s.id === p.id) ?? p,
        );
  function invalidate() {
    setReport(null);
    setSelectedFinding("");
    setPreview(null);
    setError("");
    setNotice("");
  }
  function chooseChannel(value: ChannelId) {
    const items = boot!.releases.filter((r) => r.channel === value);
    setChannel(value);
    setFrom(items.at(-1)!.version ?? items.at(-1)!.date);
    setTo(items[0].version ?? items[0].date);
    invalidate();
  }
  function chooseMode(value: "demo" | "local") {
    setProjectMode(value);
    setSelected(
      (value === "demo" ? boot!.demoProjects : boot!.localProjects)
        .slice(0, 3)
        .map((p) => p.id),
    );
    invalidate();
  }
  function displayReport(value: Report) {
    setReport(value);
    setSelectedFinding(
      value.findings.find((f) => f.category === "impact")?.id ??
        value.findings[0]?.id ??
        "",
    );
    setLocalScans((old) => {
      const local = value.projects.filter((p) => p.mode === "local");
      return [
        ...old.filter((p) => !local.some((x) => x.id === p.id)),
        ...local,
      ];
    });
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The operation failed.");
    } finally {
      setBusy(false);
    }
  }
  async function analyze() {
    if (!selected.length) {
      setError("Select at least one project before analysis.");
      return;
    }
    await run(async () => {
      const result: AnalyzeResponse =
        boot!.mode === "demo"
          ? { report: demoAnalyze(boot!, request) }
          : await api<AnalyzeResponse>("/api/analyze", request);
      displayReport(result.report);
      if (result.provider)
        setBoot((old) => (old ? { ...old, provider: result.provider! } : old));
      setNotice(
        "Rule analysis complete. No verification checks were executed.",
      );
    });
  }
  async function scan() {
    await run(async () => {
      const value = await api<{ projects: ProjectSummary[] }>(
        "/api/projects/scan",
        { projectIds: selected },
      );
      setLocalScans(value.projects);
      invalidate();
      setNotice("Scoped collection ready. Analyze to review its declarations.");
    });
  }
  async function refresh() {
    await run(async () => {
      const result = await api<
        Pick<BootstrapResponse, "releases" | "coverage">
      >("/api/releases/refresh", {});
      setBoot({ ...boot!, ...result });
      const boundaries = result.releases
        .filter((item) => item.channel === channel)
        .map((item) => item.version ?? item.date);
      if (!boundaries.includes(from)) setFrom(boundaries.at(-1) ?? "");
      if (!boundaries.includes(to)) setTo(boundaries[0] ?? "");
      invalidate();
      setNotice(
        "Official sources refreshed. Review the supplied boundaries and run analysis again.",
      );
    });
  }
  async function prepareAI() {
    if (!selected.length) {
      setError("Select at least one project before preparing the payload.");
      return;
    }
    await run(async () => {
      const value = await api<Preview>("/api/analyze/preview", request);
      displayReport(value.report);
      if (value.provider)
        setBoot((old) => (old ? { ...old, provider: value.provider! } : old));
      setPreview(value);
    });
  }
  async function sendAI() {
    if (!preview) return;
    const previewId = preview.previewId;
    setPreview(null);
    await run(async () => {
      const value = await api<AnalyzeResponse>("/api/analyze", {
        ...request,
        mode: "live-ai",
        previewId,
      });
      displayReport(value.report);
      if (value.provider)
        setBoot((old) => (old ? { ...old, provider: value.provider! } : old));
      setNotice(value.report.providerMessage ?? "Analysis complete.");
    });
  }
  function updateTask(patch: Partial<Task>) {
    if (!finding) return;
    const previous = tasks[finding.id];
    const task: Task = {
      id: previous?.id ?? `task-${finding.id}`,
      findingId: finding.id,
      projectId: finding.projectId,
      title: finding.title,
      status: previous?.status ?? "pending",
      verificationNotes: previous?.verificationNotes ?? "",
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const next = { ...tasks, [finding.id]: task };
    setTasks(next);
    if (!saveTasks(next))
      setError(
        "Browser storage is unavailable. Export your report to preserve verification notes.",
      );
  }
  function togglePin(id: string) {
    const next = pins.includes(id)
      ? pins.filter((x) => x !== id)
      : [...pins, id];
    setPins(next);
    if (!savePins(next))
      setError("Browser storage is unavailable; manual pins will not persist.");
  }
  const reportTasks = report
    ? Object.values(tasks).filter((t) =>
        report.findings.some(
          (f) => f.id === t.findingId && f.projectId === t.projectId,
        ),
      )
    : [];
  return (
    <>
      <header className="app-header">
        <a className="brand" href="/" aria-label="UpdateLens home">
          <span className="brand-mark">
            <i />
            <i />
            <i />
            <i />
          </span>
          UpdateLens
        </a>
        <nav className="header-actions" aria-label="Main navigation">
          <button className="nav-link active" onClick={() => setDialog(null)}>
            Review
          </button>
          <button className="nav-link" onClick={() => setDialog("sources")}>
            Sources
          </button>
          <button className="nav-link" onClick={() => setDialog("method")}>
            Method
          </button>
          <span className="runtime-mode">
            <Icon name="monitor" size={17} />
            {boot.mode === "local" ? "Local service" : "Offline sample"}
          </span>
        </nav>
      </header>
      <main className="app-main">
        <section className="intro">
          <h1>Review an update</h1>
          <p>Official changes, grounded in your workflow.</p>
        </section>
        {error ? (
          <div className="message error" role="alert">
            <Icon name="info" size={17} />
            <span>{error}</span>
          </div>
        ) : null}
        {notice ? (
          <div className="message notice" role="status">
            <Icon name="check" size={17} />
            <span>{notice}</span>
            <button
              aria-label="Dismiss notice"
              className="icon-button"
              onClick={() => setNotice("")}
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        ) : null}
        <div className="workbench">
          <SetupRail
            open={setupOpen}
            onOpen={setSetupOpen}
            layoutKey={error || notice}
            footer={
              <>
                <p className="rail-selection-note">
                  {selected.length}{" "}
                  {projectMode === "demo"
                    ? "synthetic samples"
                    : "local projects"}{" "}
                  selected
                </p>
                <button
                  className="primary analyze"
                  onClick={analyze}
                  disabled={busy}
                >
                  {busy ? "Working…" : "Analyze update"}
                  <Icon name="arrow" size={17} />
                </button>
                <div className="source-context">
                  <span>Source coverage</span>
                  <div>
                    <span className="snapshot-dot" />
                    <strong>
                      {coverage.stale ? "Stale snapshot" : "Curated snapshot"}
                    </strong>
                    <button
                      className="text-button"
                      onClick={() => setDialog("sources")}
                    >
                      View coverage
                    </button>
                  </div>
                  <button
                    className="refresh-link"
                    onClick={refresh}
                    disabled={busy || boot.mode === "demo"}
                  >
                    <Icon name="refresh" size={13} />
                    Refresh official sources
                  </button>
                </div>
              </>
            }
          >
            <SelectionBar
              boot={boot}
              channel={channel}
              from={from}
              to={to}
              features={features}
              operatingSystem={operatingSystem}
              busy={busy}
              onChannel={chooseChannel}
              onFrom={(v) => {
                setFrom(v);
                invalidate();
              }}
              onTo={(v) => {
                setTo(v);
                invalidate();
              }}
              onFeatures={(v) => {
                setFeatures(v);
                invalidate();
              }}
              onOperatingSystem={(v) => {
                setOperatingSystem(v);
                invalidate();
              }}
            />
            <section className="project-mode-section">
              <label>Project mode</label>
              <div
                className="mode-switch"
                role="group"
                aria-label="Project mode"
              >
                <button
                  className={projectMode === "demo" ? "active" : ""}
                  aria-pressed={projectMode === "demo"}
                  onClick={() => chooseMode("demo")}
                  disabled={busy}
                >
                  Sample
                </button>
                <button
                  className={projectMode === "local" ? "active" : ""}
                  aria-pressed={projectMode === "local"}
                  onClick={() => chooseMode("local")}
                  disabled={busy || boot.mode === "demo"}
                >
                  Local
                </button>
              </div>
            </section>
            <ProjectList
              projects={projects}
              selected={selected}
              pins={pins}
              busy={busy}
              local={projectMode === "local"}
              onSelect={(id) => {
                setSelected((old) =>
                  old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
                );
                invalidate();
              }}
              onPin={togglePin}
              onScan={scan}
            />
          </SetupRail>
          <div className="review-column">
            <FindingList
              key={report?.id ?? "setup"}
              report={report}
              projectMode={projectMode}
              selectedId={selectedFinding}
              onSelect={setSelectedFinding}
              tasks={tasks}
              onExport={() => setDialog("export")}
            />
            <section className="analysis-actions">
              <div>
                <h3>
                  {report?.mode === "live-ai" ? "AI refinement" : "Go deeper"}
                </h3>
                <p>
                  {report?.mode === "live-ai"
                    ? "Review the cited reasoning and record your own checks."
                    : "Optional AI refinement, after an exact payload preview."}
                </p>
              </div>
              <button
                className="secondary"
                onClick={prepareAI}
                disabled={
                  busy ||
                  boot.mode === "demo" ||
                  !boot.provider.ready ||
                  !selected.length ||
                  boot.provider.callsRemaining < 1
                }
              >
                {boot.provider.ready ? "Preview AI payload" : "AI unavailable"}
                <Icon name="arrow" size={16} />
              </button>
            </section>
            {report?.providerMessage ? (
              <p className="provider-message">{report.providerMessage}</p>
            ) : null}
            <details className="limitations">
              <summary>Coverage & analysis method</summary>
              <p>{coverage.limitation}</p>
              {(report?.limitations ?? []).map((text, i) => (
                <p key={i}>{text}</p>
              ))}
            </details>
          </div>
          <Inspector
            report={report}
            finding={finding}
            task={finding ? tasks[finding.id] : undefined}
            onTask={updateTask}
          />
        </div>
        <footer className="report-footer">
          <span>UpdateLens · read-only review</span>
          <span>
            {report?.mode === "live-ai"
              ? "Live AI refinement"
              : "Rule analysis"}{" "}
            ·{" "}
            {projectMode === "demo"
              ? "Synthetic fixtures"
              : "Local declarations"}{" "}
            · User-reported checks
          </span>
        </footer>
      </main>
      {dialog === "export" ? (
        <Dialog title="Export this review" onClose={() => setDialog(null)}>
          <p>
            Source links, cited declarations and your reported verification
            notes are included. Secrets and absolute paths are scrubbed.
          </p>
          <div className="export-options">
            <button
              className="secondary"
              disabled={!report}
              onClick={() =>
                report && downloadReport(report, reportTasks, "markdown")
              }
            >
              <Icon name="file" size={20} />
              <strong>Markdown</strong>
              <span>Readable review & source links</span>
              <Icon name="download" size={17} />
            </button>
            <button
              className="secondary"
              disabled={!report}
              onClick={() =>
                report && downloadReport(report, reportTasks, "json")
              }
            >
              <Icon name="file" size={20} />
              <strong>JSON</strong>
              <span>Structured evidence & task records</span>
              <Icon name="download" size={17} />
            </button>
          </div>
        </Dialog>
      ) : null}

      {dialog === "method" ? (
        <Dialog title="Method & privacy" onClose={() => setDialog(null)}>
          <div className="prose">
            <p>
              UpdateLens associates official release statements with bounded
              project declarations. An association is a hypothesis, never proof
              of impact or a compatibility verdict.
            </p>
            <p>
              Sample mode uses three synthetic fixtures. Local mode reads only
              explicitly registered roots, supported configuration, known script
              references, CI declarations, and limited metadata. It does not
              execute scripts, inspect secrets or histories, update tools, or
              modify projects.
            </p>
            <p>
              Sources are a curated dated snapshot with incomplete coverage.
              Claude changelog publication dates are unknown. Codex desktop uses
              dated official app entries separately from CLI releases; CLI
              configuration cannot establish desktop applicability.
            </p>
            <p>
              Live AI uses OpenCode Go / DeepSeek V4.1 Flash only after you
              preview the exact normalized payload and explicitly choose to send
              it. Credentials stay on the local server. Payloads omit raw files
              and absolute paths. Citation IDs are checked for existence and
              project ownership; their meaning is not automatically verified.
            </p>
            <p>
              Task status and notes persist in this browser. Done means you
              reported completion, not that UpdateLens ran or independently
              verified a check. You can export Markdown or JSON, or clear saved
              notes below.
            </p>
            <p>
              Development OS and workflow areas are automatically remembered in
              this browser. They are user-selected preferences; development OS
              does not establish a remote CI runner's platform. Channel and
              range start within the currently available source window. Profile
              storage contains no project roots, provider credentials or
              collected project data.
            </p>
            <button
              className="secondary"
              onClick={() => {
                setTasks({});
                saveTasks({});
                setNotice(
                  "Saved task statuses and verification notes cleared in this browser.",
                );
                setDialog(null);
              }}
            >
              Clear saved task notes
            </button>
          </div>
        </Dialog>
      ) : null}
      {dialog === "sources" ? (
        <Dialog
          title="Official update snapshot"
          onClose={() => setDialog(null)}
        >
          <p className="muted">{coverage.limitation}</p>
          <p className="muted small">
            Range semantics: changes after the current boundary, through the
            target boundary. Entries below show the full available curated
            window.
          </p>
          <div className="source-list">
            {boot.releases
              .filter((r) => r.channel === channel)
              .map((r) => (
                <details key={r.id}>
                  <summary>
                    <strong>{r.title}</strong>
                    <span>{r.date || "Publication date not provided"}</span>
                  </summary>
                  <p>
                    <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                      Official source ↗
                    </a>{" "}
                    · Retrieved {new Date(r.fetchedAt).toLocaleString()}
                  </p>
                  <ul>
                    {r.changes.map((c) => (
                      <li key={c.id}>{c.body}</li>
                    ))}
                  </ul>
                </details>
              ))}
          </div>
        </Dialog>
      ) : null}
      {preview ? (
        <Dialog
          title="Review the external AI payload"
          onClose={() => setPreview(null)}
        >
          <p>
            This exact normalized payload will be sent to OpenCode Go using
            DeepSeek V4.1 Flash. It contains official changes and sanitized
            declaration summaries. It excludes raw files, excerpts, project
            names, and absolute roots.
          </p>
          <p className="muted small">
            {boot.provider.callsRemaining} runtime requests remaining. No retry,
            model switch, or paid fallback.
          </p>
          <p className="muted small">
            Up to six finding groups, balanced across projects with findings.
            Remaining groups retain their rule analysis in the report.
          </p>
          <div className="preview-projects">
            <h3>Project summaries</h3>
            {preview.report.projects.map((p) => (
              <p key={p.id}>
                <strong>{p.name}</strong> · {p.status} · {p.evidence.length}{" "}
                sanitized declaration observations. {p.warnings[0]}
              </p>
            ))}
          </div>
          <pre className="payload">
            {JSON.stringify(preview.payload, null, 2)}
          </pre>
          <div className="dialog-actions">
            <button className="secondary" onClick={() => setPreview(null)}>
              Cancel
            </button>
            <button
              className="primary"
              onClick={sendAI}
              disabled={
                busy || !boot.provider.ready || boot.provider.callsRemaining < 1
              }
            >
              Send this payload to OpenCode Go
            </button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
