import { useEffect, useState } from "react";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  BootstrapResponse,
  ChannelId,
  FeatureId,
  OperatingSystem,
  ProjectSummary,
  ProviderPublicState,
  Report,
  Task,
} from "../shared/contracts";
import {
  api,
  bootstrap,
  demoAnalyze,
  demoBootstrap,
  downloadReport,
} from "./api";
import {
  readPins,
  readProfile,
  readTasks,
  savePins,
  saveProfile,
  saveTasks,
} from "./storage";
import { visibleFindings, type FindingCategory } from "./presentation";
export type DialogKind = "scope" | "method" | "sources" | "export" | null;
export type Preview = {
  previewId: string;
  report: Report;
  payload: unknown;
  provider?: ProviderPublicState;
};
export default function useReviewController() {
  const [savedProfile] = useState(readProfile);
  const [boot, setBoot] = useState<BootstrapResponse | null>(null);
  const [channel, setChannel] = useState<ChannelId>("claude-code");
  const [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [operatingSystem, setOperatingSystem] = useState<OperatingSystem>(
    savedProfile.operatingSystem,
  );
  const [features, setFeatures] = useState<FeatureId[]>(savedProfile.features);
  const [projectMode, setProjectMode] = useState<"demo" | "local">("demo");
  const [selected, setSelected] = useState<string[]>([]);
  const [localScans, setLocalScans] = useState<ProjectSummary[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [selectedFinding, setSelectedFinding] = useState("");
  const [viewProject, setViewProject] = useState("all");
  const [category, setCategory] = useState<FindingCategory>("all");
  const [tasks, setTasks] = useState(readTasks),
    [pins, setPins] = useState(readPins);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<DialogKind>(null),
    [preview, setPreview] = useState<Preview | null>(null);
  useEffect(() => {
    if (!saveProfile({ operatingSystem, features }))
      setError(
        "Browser preference storage is unavailable. OS and workflow areas may not survive reload.",
      );
  }, [operatingSystem, features]);
  useEffect(() => {
    let active = true;
    bootstrap()
      .catch(() => {
        if (active)
          setNotice(
            "Local API unavailable. Using synthetic samples and the dated official snapshot.",
          );
        return demoBootstrap();
      })
      .then((value) => {
        if (!active) return;
        setBoot(value);
        const releases = value.releases.filter(
          (release) => release.channel === "claude-code",
        );
        const current = releases.at(-1)!.version!,
          target = releases[0].version!;
        setFrom(current);
        setTo(target);
        const ids = value.demoProjects.map((project) => project.id);
        setSelected(ids);
        setViewProject(ids[0] ?? "all");
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
          initial.findings.find((finding) => finding.category === "impact")
            ?.id ??
            initial.findings[0]?.id ??
            "",
        );
      });
    return () => {
      active = false;
    };
  }, []);
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
  const projects =
    projectMode === "demo"
      ? (boot?.demoProjects ?? [])
      : (boot?.localProjects ?? []).map(
          (project) =>
            localScans.find((scan) => scan.id === project.id) ?? project,
        );
  const coverage = boot?.coverage.find((item) => item.channel === channel);
  const findings = visibleFindings(report, viewProject, category);
  const finding = report?.findings.find((item) => item.id === selectedFinding);
  function invalidate() {
    setReport(null);
    setSelectedFinding("");
    setCategory("all");
    setPreview(null);
    setError("");
    setNotice("");
  }
  function chooseChannel(value: ChannelId) {
    if (!boot) return;
    const items = boot.releases.filter((release) => release.channel === value);
    setChannel(value);
    setFrom(items.at(-1)?.version ?? items.at(-1)?.date ?? "");
    setTo(items[0]?.version ?? items[0]?.date ?? "");
    invalidate();
  }
  function chooseFrom(value: string) {
    setFrom(value);
    invalidate();
  }
  function chooseTo(value: string) {
    setTo(value);
    invalidate();
  }
  function chooseFeatures(value: FeatureId[]) {
    setFeatures(value);
    invalidate();
  }
  function chooseOS(value: OperatingSystem) {
    setOperatingSystem(value);
    invalidate();
  }
  function chooseMode(value: "demo" | "local") {
    if (!boot) return;
    const ids = (value === "demo" ? boot.demoProjects : boot.localProjects)
      .slice(0, 3)
      .map((project) => project.id);
    setProjectMode(value);
    setSelected(ids);
    setViewProject(ids[0] ?? "all");
    invalidate();
  }
  function toggleProject(id: string) {
    const next = selected.includes(id)
      ? selected.filter((item) => item !== id)
      : selected.length < 3
        ? [...selected, id]
        : selected;
    setSelected(next);
    if (viewProject !== "all" && !next.includes(viewProject))
      setViewProject(next[0] ?? "all");
    invalidate();
  }
  function chooseProjectView(id: string) {
    const valid = id === "all" || selected.includes(id) ? id : "all";
    setViewProject(valid);
    const visible = visibleFindings(report, valid, category);
    if (!visible.some((item) => item.id === selectedFinding))
      setSelectedFinding(visible[0]?.id ?? "");
  }
  function chooseCategory(value: FindingCategory) {
    setCategory(value);
    const visible = visibleFindings(report, viewProject, value);
    if (!visible.some((item) => item.id === selectedFinding))
      setSelectedFinding(visible[0]?.id ?? "");
  }
  function displayReport(value: Report) {
    const contextChanged = report?.id !== value.id,
      newCategory = contextChanged ? "all" : category;
    const newProject = value.projects.some(
      (project) => project.id === viewProject,
    )
      ? viewProject
      : viewProject === "all"
        ? "all"
        : (value.projects[0]?.id ?? "all");
    const visible = visibleFindings(value, newProject, newCategory);
    setReport(value);
    setViewProject(newProject);
    setCategory(newCategory);
    setSelectedFinding(
      !contextChanged && visible.some((item) => item.id === selectedFinding)
        ? selectedFinding
        : (visible.find((item) => item.category === "impact")?.id ??
            visible[0]?.id ??
            ""),
    );
    setLocalScans((old) => {
      const local = value.projects.filter(
        (project) => project.mode === "local",
      );
      return [
        ...old.filter(
          (project) => !local.some((item) => item.id === project.id),
        ),
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
      return true;
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "The operation failed.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function analyze() {
    if (!boot) return false;
    if (!selected.length) {
      setError("Select at least one project before analysis.");
      return false;
    }
    return run(async () => {
      const result: AnalyzeResponse =
        boot.mode === "demo"
          ? { report: demoAnalyze(boot, request) }
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
    return run(async () => {
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
    if (!boot) return false;
    return run(async () => {
      const result = await api<
        Pick<BootstrapResponse, "releases" | "coverage">
      >("/api/releases/refresh", {});
      setBoot({ ...boot, ...result });
      const boundaries = result.releases
        .filter((item) => item.channel === channel)
        .map((item) => item.version ?? item.date);
      if (!boundaries.includes(from)) setFrom(boundaries.at(-1) ?? "");
      if (!boundaries.includes(to)) setTo(boundaries[0] ?? "");
      invalidate();
      setNotice(
        "Official sources refreshed. Review the supplied boundaries and analyze again.",
      );
    });
  }
  async function prepareAI() {
    if (!selected.length) {
      setError("Select at least one project before preparing the payload.");
      return false;
    }
    return run(async () => {
      const value = await api<Preview>("/api/analyze/preview", request);
      displayReport(value.report);
      if (value.provider)
        setBoot((old) => (old ? { ...old, provider: value.provider! } : old));
      setPreview(value);
    });
  }
  async function sendAI() {
    if (!preview) return false;
    const previewId = preview.previewId;
    setPreview(null);
    return run(async () => {
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
        "Browser storage is unavailable. Export the review to preserve verification notes.",
      );
  }
  function togglePin(id: string) {
    const next = pins.includes(id)
      ? pins.filter((item) => item !== id)
      : [...pins, id];
    setPins(next);
    if (!savePins(next))
      setError("Browser storage is unavailable; manual pins will not persist.");
  }
  function clearTasks() {
    if (!saveTasks({})) {
      setError(
        "Browser storage could not clear saved task notes. Existing notes remain available; export them before trying again.",
      );
      setNotice("");
      return;
    }
    setTasks({});
    setError("");
    setNotice(
      "Saved task statuses and verification notes cleared in this browser.",
    );
    setDialog(null);
  }
  function moveFinding(direction: -1 | 1) {
    const index = findings.findIndex((item) => item.id === selectedFinding);
    const next = findings[index + direction];
    if (next) setSelectedFinding(next.id);
  }
  const reportTasks = report
    ? Object.values(tasks).filter((task) =>
        report.findings.some(
          (item) =>
            item.id === task.findingId && item.projectId === task.projectId,
        ),
      )
    : [];
  function exportReview(format: "markdown" | "json") {
    if (report) downloadReport(report, reportTasks, format);
  }
  return {
    boot,
    channel,
    from,
    to,
    operatingSystem,
    features,
    projectMode,
    selected,
    projects,
    localScans,
    report,
    coverage,
    finding,
    findings,
    selectedFinding,
    viewProject,
    category,
    tasks,
    pins,
    busy,
    error,
    notice,
    dialog,
    preview,
    setDialog,
    setPreview,
    setSelectedFinding,
    chooseChannel,
    chooseFrom,
    chooseTo,
    chooseFeatures,
    chooseOS,
    chooseMode,
    toggleProject,
    chooseProjectView,
    chooseCategory,
    analyze,
    scan,
    refresh,
    prepareAI,
    sendAI,
    updateTask,
    togglePin,
    clearTasks,
    moveFinding,
    exportReview,
    dismissNotice: () => setNotice(""),
  };
}
export type ReviewController = ReturnType<typeof useReviewController>;
