export type ChannelId = "claude-code" | "codex-cli" | "codex-desktop";
export type AnalysisMode = "rule-only" | "recorded" | "live-ai";
export type OperatingSystem = "windows" | "macos" | "linux" | "unspecified";
export type FeatureId =
  | "config"
  | "skills"
  | "hooks"
  | "mcp"
  | "permissions"
  | "ci"
  | "sessions"
  | "models";
export interface ChangeItem {
  id: string;
  title: string;
  body: string;
  features: FeatureId[];
  signals?: string[];
  sourceUrl: string;
}
export interface Release {
  id: string;
  channel: ChannelId;
  version?: string;
  date: string;
  title: string;
  changes: ChangeItem[];
  sourceUrl: string;
  fetchedAt: string;
}
export interface Coverage {
  channel: ChannelId;
  selectionKind: "version" | "date";
  from: string;
  to: string;
  fetchedAt: string;
  complete: boolean;
  stale: boolean;
  limitation?: string;
  sourceUrl: string;
}
export interface Channel {
  id: ChannelId;
  label: string;
  selectionKind: "version" | "date";
  description: string;
}
export interface WorkflowProfile {
  features: FeatureId[];
  /** Declared development environment; never inferred to represent remote CI. */
  operatingSystem?: OperatingSystem;
  operatingSystemSource?: "user-selection" | "unspecified";
}
export interface Evidence {
  appliesTo?: ChannelId[];
  id: string;
  projectId: string;
  path: string;
  kind: "config" | "script" | "ci" | "activity" | "missing";
  evidenceType?:
    | "mcp"
    | "hooks"
    | "plugins"
    | "skills"
    | "custom-provider"
    | "cli-script"
    | "platform"
    | "config"
    | "activity"
    | "missing";
  field?: string;
  signals?: string[];
  summary: string;
  features: FeatureId[];
  excerpt?: string;
  line?: number;
}
export interface ProjectSummary {
  /** Private bounded collection identity; omitted from exports and external AI. */
  collectionDigest?: string;
  id: string;
  name: string;
  mode: "demo" | "local";
  status: "ready" | "partial" | "failed";
  evidence: Evidence[];
  warnings: string[];
  activityScore: number;
  activityExplanation: string;
  lastCommitAt?: string;
}
export interface ProjectRegistration {
  id: string;
  name: string;
}
export interface Finding {
  id: string;
  projectId: string;
  title: string;
  severity: "high" | "medium" | "low" | "info";
  confidence: "high" | "medium" | "low";
  category: "impact" | "unrelated" | "unknown";
  sourceFact: string;
  localObservation: string;
  inference: string;
  suggestedAction: string;
  changeIds: string[];
  evidenceIds: string[];
  origin: "rule" | "ai" | "recorded";
}
export interface Report {
  id: string;
  createdAt: string;
  channel: ChannelId;
  from: string;
  to: string;
  workflow: WorkflowProfile;
  mode: AnalysisMode;
  providerStatus: "not-requested" | "success" | "unavailable" | "failed";
  providerMessage?: string;
  coverage: Coverage;
  releases: Release[];
  projects: ProjectSummary[];
  findings: Finding[];
  limitations: string[];
}
export interface Task {
  id: string;
  findingId: string;
  projectId: string;
  title: string;
  status: "pending" | "needs-action" | "done" | "deferred";
  verificationNotes: string;
  updatedAt: string;
}
export interface AnalyzeRequest {
  channel: ChannelId;
  from: string;
  to: string;
  workflow: WorkflowProfile;
  projectIds: string[];
  mode: "rule-only" | "live-ai";
  previewId?: string;
}
export interface BootstrapResponse {
  mode: "local" | "demo";
  channels: Channel[];
  releases: Release[];
  coverage: Coverage[];
  workflowFeatures: { id: FeatureId; label: string }[];
  demoProjects: ProjectSummary[];
  localProjects: ProjectRegistration[];
  provider: ProviderPublicState;
  sessionToken?: string;
}
export interface ReleasesResponse {
  releases: Release[];
  coverage: Coverage;
}
export interface ScanResponse {
  projects: ProjectSummary[];
}
export interface AnalyzeResponse {
  report: Report;
  provider?: ProviderPublicState;
}
export interface ProviderPublicState {
  ready: boolean;
  name: string;
  model: string;
  callsRemaining: number;
}
export interface ApiError {
  error: { code: string; message: string };
}
