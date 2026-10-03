import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, resolve, sep } from "node:path";
import type {
  AnalyzeRequest,
  FeatureId,
  OperatingSystem,
  ProjectSummary,
  Report,
  Task,
} from "../src/shared/contracts.js";
import {
  getDemoProjects,
  scanRegisteredProject,
  analyzeRules,
  exportMarkdown,
  exportJSON,
} from "../src/core/index.js";
import {
  channels,
  fetchOfficialSnapshots,
  getCoverage,
  selectReleases,
} from "./releases.js";
import {
  buildAnalysisPayload,
  GoProvider,
  PROVIDER_MODEL,
} from "./provider.js";

export interface Registration {
  id: string;
  name: string;
  rootPath: string;
}
export interface AppOptions {
  port: number;
  dev?: boolean;
  registrations: Registration[];
  releases: Awaited<ReturnType<typeof fetchOfficialSnapshots>>;
  provider: GoProvider;
  distRoot?: string;
}
const featureLabels: { id: FeatureId; label: string }[] = [
  { id: "config", label: "Configuration" },
  { id: "skills", label: "Skills & plugins" },
  { id: "hooks", label: "Hooks" },
  { id: "mcp", label: "MCP" },
  { id: "permissions", label: "Permissions" },
  { id: "ci", label: "CI / headless" },
  { id: "sessions", label: "Sessions" },
  { id: "models", label: "Models & providers" },
];
class APIException extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
function fail(status: number, code: string, message: string): never {
  throw new APIException(status, code, message);
}
function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}
async function readBody(req: IncomingMessage): Promise<unknown> {
  if (!req.headers["content-type"]?.startsWith("application/json"))
    fail(415, "CONTENT_TYPE", "Use application/json.");
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 256000) fail(413, "BODY_LIMIT", "Request body exceeds 256 KB.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    fail(400, "INVALID_JSON", "Request JSON is invalid.");
  }
}
function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function projectIds(value: unknown, valid: Set<string>): string[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 3 ||
    !value.every((id) => typeof id === "string" && valid.has(id)) ||
    new Set(value).size !== value.length
  )
    fail(
      400,
      "PROJECT_SELECTION",
      "Select one to three distinct registered or sample project IDs.",
    );
  return value as string[];
}
export function validateAnalyze(
  value: unknown,
  valid: Set<string>,
): AnalyzeRequest {
  if (
    !isObject(value) ||
    !channels.some((c) => c.id === value.channel) ||
    typeof value.from !== "string" ||
    typeof value.to !== "string" ||
    value.from.length > 50 ||
    value.to.length > 50 ||
    !isObject(value.workflow) ||
    !Array.isArray(value.workflow.features) ||
    value.workflow.features.length > 8 ||
    !value.workflow.features.every((f) =>
      featureLabels.some((x) => x.id === f),
    ) ||
    typeof value.mode !== "string" ||
    !["rule-only", "live-ai"].includes(value.mode)
  )
    fail(400, "INVALID_ANALYSIS", "Analysis selection is invalid.");
  if (
    value.workflow.operatingSystem !== undefined &&
    (typeof value.workflow.operatingSystem !== "string" ||
      !["windows", "macos", "linux", "unspecified"].includes(
        value.workflow.operatingSystem,
      ))
  )
    fail(
      400,
      "INVALID_OPERATING_SYSTEM",
      "Choose a supported declared development operating system.",
    );
  if (
    value.workflow.operatingSystemSource !== undefined &&
    !["user-selection", "unspecified"].includes(
      value.workflow.operatingSystemSource as string,
    )
  )
    fail(
      400,
      "INVALID_OPERATING_SYSTEM",
      "Operating system source is invalid.",
    );
  if (
    Object.keys(value).some(
      (key) =>
        ![
          "channel",
          "from",
          "to",
          "workflow",
          "projectIds",
          "mode",
          "previewId",
        ].includes(key),
    )
  )
    fail(400, "INVALID_ANALYSIS", "Unsupported analysis fields.");
  if (
    value.previewId !== undefined &&
    (typeof value.previewId !== "string" || value.previewId.length > 80)
  )
    fail(400, "INVALID_PREVIEW", "Invalid preview identifier.");
  return {
    channel: value.channel as AnalyzeRequest["channel"],
    from: value.from,
    to: value.to,
    workflow: {
      features: [...new Set(value.workflow.features)] as FeatureId[],
      operatingSystem:
        (value.workflow.operatingSystem as OperatingSystem | undefined) ??
        "unspecified",
      operatingSystemSource:
        value.workflow.operatingSystem === undefined
          ? "unspecified"
          : "user-selection",
    },
    projectIds: projectIds(value.projectIds, valid),
    mode: value.mode as AnalyzeRequest["mode"],
    previewId: value.previewId as string | undefined,
  };
}
export async function loadRegistrations(file: string): Promise<Registration[]> {
  let content: string;
  try {
    content = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new Error("Unable to read local project registration.");
  }
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error("Local project registration JSON is invalid.");
  }
  const entries = isObject(data) ? data.projects : data;
  if (!Array.isArray(entries) || entries.length > 3)
    throw new Error("Local registration must contain at most three projects.");
  const seen = new Set<string>();
  const roots = new Set<string>();
  const result: Registration[] = [];
  for (const item of entries) {
    if (
      !isObject(item) ||
      typeof item.id !== "string" ||
      !/^[a-z0-9-]{1,60}$/.test(item.id) ||
      item.id.startsWith("demo-") ||
      typeof item.name !== "string" ||
      item.name.length > 120 ||
      typeof item.rootPath !== "string" ||
      !isAbsolute(item.rootPath) ||
      seen.has(item.id)
    )
      throw new Error("Invalid local project registration.");
    // Preserve the registered locator so the collector can reject root aliases too.
    // Unavailable roots remain registered: their scan fails visibly per project.
    const rootPath = resolve(item.rootPath);
    let canonical = rootPath;
    try {
      canonical = await realpath(rootPath);
    } catch {
      /* Per-project failure on scan. */
    }
    if (roots.has(canonical.toLowerCase()))
      throw new Error("Duplicate registered directory.");
    seen.add(item.id);
    roots.add(canonical.toLowerCase());
    result.push({ id: item.id, name: item.name, rootPath });
  }
  return result;
}
export function createApp(options: AppOptions) {
  const token = randomBytes(32).toString("hex");
  let releases = options.releases;
  const demos = getDemoProjects();
  const validIds = new Set([
    ...demos.map((p) => p.id),
    ...options.registrations.map((p) => p.id),
  ]);
  const previews = new Map<
    string,
    { createdAt: number; key: string; report: Report }
  >();
  const reports = new Map<string, Report>();
  const providerState = () => ({
    ready: options.provider.ready,
    name: "OpenCode Go",
    model: PROVIDER_MODEL,
    callsRemaining: options.provider.callsRemaining,
  });
  const keyFor = (request: AnalyzeRequest) =>
    JSON.stringify({ ...request, mode: "rule-only", previewId: undefined });
  const scan = async (ids: string[]): Promise<ProjectSummary[]> =>
    Promise.all(
      ids.map(async (id) => {
        const demo = demos.find((p) => p.id === id);
        if (demo) return demo;
        const registration = options.registrations.find((p) => p.id === id)!;
        try {
          return await scanRegisteredProject(registration);
        } catch {
          return {
            id,
            name: registration.name,
            mode: "local",
            status: "failed",
            evidence: [],
            warnings: [
              "Project scan failed. Check the registered directory and permissions.",
            ],
            activityScore: 0,
            activityExplanation: "Activity unavailable.",
          };
        }
      }),
    );
  const ruleReport = async (request: AnalyzeRequest) => {
    let selected;
    try {
      selected = selectReleases(
        releases,
        request.channel,
        request.from,
        request.to,
      );
    } catch (error) {
      fail(400, "UNSUPPORTED_RANGE", (error as Error).message);
    }
    return analyzeRules({
      request: { ...request, mode: "rule-only" },
      ...selected,
      projects: await scan(request.projectIds),
    });
  };
  const server = createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    try {
      const allowedHosts = [
        `127.0.0.1:${options.port}`,
        `localhost:${options.port}`,
        ...(options.dev ? ["127.0.0.1:5173", "localhost:5173"] : []),
      ];
      if (!allowedHosts.includes(req.headers.host ?? ""))
        fail(403, "HOST_REJECTED", "Request host is not allowed.");
      const origins = allowedHosts.map((host) => `http://${host}`);
      if (req.headers.origin && !origins.includes(req.headers.origin))
        fail(403, "ORIGIN_REJECTED", "Request origin is not allowed.");
      if (req.headers["sec-fetch-site"] === "cross-site")
        fail(403, "ORIGIN_REJECTED", "Cross-site requests are not allowed.");
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${options.port}`);
      if (url.pathname.startsWith("/api/")) {
        if (url.pathname !== "/api/bootstrap") {
          const supplied = req.headers["x-updatelens-session"];
          const a = Buffer.from(typeof supplied === "string" ? supplied : "");
          const b = Buffer.from(token);
          if (a.length !== b.length || !timingSafeEqual(a, b))
            fail(
              401,
              "SESSION_REQUIRED",
              "Local API session authorization is required. Reload the app.",
            );
        }
        if (url.pathname === "/api/bootstrap" && req.method === "GET")
          return json(res, 200, {
            mode: "local",
            channels,
            releases,
            coverage: channels.map((c) => getCoverage(releases, c.id)),
            workflowFeatures: featureLabels,
            demoProjects: demos,
            localProjects: options.registrations.map(({ id, name }) => ({
              id,
              name,
            })),
            provider: providerState(),
            sessionToken: token,
          });
        if (url.pathname === "/api/releases" && req.method === "GET") {
          try {
            return json(
              res,
              200,
              selectReleases(
                releases,
                url.searchParams.get("channel") as AnalyzeRequest["channel"],
                url.searchParams.get("from") ?? "",
                url.searchParams.get("to") ?? "",
              ),
            );
          } catch (error) {
            fail(400, "UNSUPPORTED_RANGE", (error as Error).message);
          }
        }
        if (url.pathname === "/api/releases/refresh" && req.method === "POST") {
          try {
            releases = await fetchOfficialSnapshots();
            return json(res, 200, {
              releases,
              coverage: channels.map((c) => getCoverage(releases, c.id)),
            });
          } catch {
            fail(
              502,
              "REFRESH_FAILED",
              "Official source refresh failed. The existing dated snapshot remains available.",
            );
          }
        }
        if (url.pathname === "/api/projects/scan" && req.method === "POST") {
          const body = await readBody(req);
          if (
            !isObject(body) ||
            Object.keys(body).some((k) => k !== "projectIds")
          )
            fail(400, "INVALID_SCAN", "Supply project IDs only.");
          return json(res, 200, {
            projects: await scan(projectIds(body.projectIds, validIds)),
          });
        }
        if (
          ["/api/analyze", "/api/analyze/preview"].includes(url.pathname) &&
          req.method === "POST"
        ) {
          const request = validateAnalyze(await readBody(req), validIds);
          if (url.pathname === "/api/analyze/preview") {
            const report = await ruleReport(request);
            const previewId = randomBytes(16).toString("hex");
            for (const [id, p] of previews)
              if (Date.now() - p.createdAt > 600000) previews.delete(id);
            if (previews.size >= 20)
              previews.delete(previews.keys().next().value!);
            previews.set(previewId, {
              report,
              key: keyFor(request),
              createdAt: Date.now(),
            });
            return json(res, 200, {
              previewId,
              report,
              payload: buildAnalysisPayload(report),
              provider: providerState(),
            });
          }
          let report: Report;
          if (request.mode === "live-ai") {
            const preview = request.previewId
              ? previews.get(request.previewId)
              : undefined;
            if (
              !preview ||
              preview.key !== keyFor(request) ||
              Date.now() - preview.createdAt > 600000
            )
              fail(
                400,
                "PREVIEW_REQUIRED",
                "Preview the current normalized payload before explicitly sending it to OpenCode Go.",
              );
            previews.delete(request.previewId!);
            report = await options.provider.analyze(preview.report);
          } else report = await ruleReport(request);
          if (reports.size >= 30) reports.delete(reports.keys().next().value!);
          reports.set(report.id, report);
          return json(res, 200, { report, provider: providerState() });
        }
        if (url.pathname === "/api/export" && req.method === "POST") {
          const body = await readBody(req);
          if (
            !isObject(body) ||
            typeof body.reportId !== "string" ||
            !reports.has(body.reportId) ||
            typeof body.format !== "string" ||
            !["markdown", "json"].includes(body.format) ||
            !Array.isArray(body.tasks) ||
            body.tasks.length > 500
          )
            fail(
              400,
              "INVALID_EXPORT",
              "Supply an active report ID, tasks and supported format.",
            );
          const report = reports.get(body.reportId)!;
          const tasks: Task[] = body.tasks.map((raw) => {
            if (
              !isObject(raw) ||
              typeof raw.id !== "string" ||
              typeof raw.findingId !== "string" ||
              typeof raw.projectId !== "string" ||
              !report.findings.some(
                (f) => f.id === raw.findingId && f.projectId === raw.projectId,
              ) ||
              typeof raw.status !== "string" ||
              !["pending", "needs-action", "done", "deferred"].includes(
                raw.status,
              ) ||
              typeof raw.verificationNotes !== "string" ||
              raw.verificationNotes.length > 3000
            )
              fail(400, "INVALID_TASK", "Task data is invalid.");
            return {
              id: raw.id.slice(0, 100),
              findingId: raw.findingId,
              projectId: raw.projectId,
              title: String(raw.title ?? "").slice(0, 200),
              status: raw.status as Task["status"],
              verificationNotes: raw.verificationNotes,
              updatedAt: String(raw.updatedAt ?? "").slice(0, 50),
            };
          });
          res.writeHead(200, {
            "Content-Type":
              body.format === "json"
                ? "application/json"
                : "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="updatelens-report.${body.format === "json" ? "json" : "md"}"`,
          });
          return res.end(
            body.format === "json"
              ? exportJSON(report, tasks)
              : exportMarkdown(report, tasks),
          );
        }
        fail(404, "API_NOT_FOUND", "API endpoint not found.");
      }
      if (!["GET", "HEAD"].includes(req.method ?? ""))
        fail(405, "METHOD", "Method not allowed.");
      if (!options.distRoot)
        fail(
          404,
          "UI_BUILD_MISSING",
          "Start Vite for development or run npm run build.",
        );
      const requested = resolve(
        options.distRoot,
        "." + decodeURIComponent(url.pathname),
      );
      if (
        requested !== options.distRoot &&
        !requested.startsWith(options.distRoot + sep)
      )
        fail(403, "PATH_REJECTED", "Static path rejected.");
      let file = requested;
      try {
        if (!(await stat(file)).isFile())
          file = resolve(options.distRoot, "index.html");
      } catch {
        file = resolve(options.distRoot, "index.html");
      }
      const extension = file.split(".").at(-1);
      const types: Record<string, string> = {
        html: "text/html",
        js: "text/javascript",
        css: "text/css",
        json: "application/json",
        png: "image/png",
        svg: "image/svg+xml",
      };
      res.writeHead(200, {
        "Content-Type": types[extension ?? ""] ?? "application/octet-stream",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
      });
      res.end(req.method === "HEAD" ? undefined : await readFile(file));
    } catch (error) {
      if (error instanceof APIException)
        json(res, error.status, {
          error: { code: error.code, message: error.message },
        });
      else
        json(res, 500, {
          error: {
            code: "INTERNAL_ERROR",
            message:
              "The local operation failed. No project files were modified.",
          },
        });
    }
  });
  return server;
}
