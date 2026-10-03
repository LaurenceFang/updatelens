import type { FeatureId, OperatingSystem, Task } from "../shared/contracts";
const TASK_KEY = "updatelens.tasks.v1";
const PIN_KEY = "updatelens.pins.v1";
const PROFILE_KEY = "updatelens.profile.v1";
export interface SavedProfile {
  operatingSystem: OperatingSystem;
  features: FeatureId[];
}
type ProfileStorage = Pick<Storage, "getItem" | "setItem">;
const validOperatingSystems: OperatingSystem[] = [
  "windows",
  "macos",
  "linux",
  "unspecified",
];
const validFeatures: FeatureId[] = [
  "config",
  "skills",
  "hooks",
  "mcp",
  "permissions",
  "ci",
  "sessions",
  "models",
];
const defaultFeatures: FeatureId[] = ["hooks", "mcp", "permissions", "skills"];
function normalizeProfile(value: unknown): SavedProfile {
  const candidate =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<SavedProfile>)
      : {};
  const features = Array.isArray(candidate.features)
    ? [
        ...new Set(
          candidate.features.filter((feature): feature is FeatureId =>
            validFeatures.includes(feature),
          ),
        ),
      ].slice(0, 8)
    : [];
  return {
    operatingSystem: validOperatingSystems.includes(
      candidate.operatingSystem as OperatingSystem,
    )
      ? (candidate.operatingSystem as OperatingSystem)
      : "windows",
    features: features.length ? features : [...defaultFeatures],
  };
}
export function readProfile(storage?: ProfileStorage): SavedProfile {
  try {
    const raw = JSON.parse(
      (storage ?? localStorage).getItem(PROFILE_KEY) ?? "null",
    );
    return normalizeProfile(raw?.version === 1 ? raw.data : null);
  } catch {
    return normalizeProfile(null);
  }
}
export function saveProfile(
  profile: SavedProfile,
  storage?: ProfileStorage,
): boolean {
  try {
    // Persist only normalized metadata; never spread caller objects or save roots/data/keys.
    (storage ?? localStorage).setItem(
      PROFILE_KEY,
      JSON.stringify({ version: 1, data: normalizeProfile(profile) }),
    );
    return true;
  } catch {
    return false;
  }
}
export function readTasks(): Record<string, Task> {
  try {
    const raw = JSON.parse(localStorage.getItem(TASK_KEY) ?? "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw).filter(
        ([, t]) =>
          !!t &&
          typeof t === "object" &&
          typeof (t as Task).findingId === "string" &&
          typeof (t as Task).verificationNotes === "string" &&
          ["pending", "needs-action", "done", "deferred"].includes(
            (t as Task).status,
          ),
      ),
    ) as Record<string, Task>;
  } catch {
    return {};
  }
}
export function saveTasks(tasks: Record<string, Task>): boolean {
  try {
    localStorage.setItem(TASK_KEY, JSON.stringify(tasks));
    return true;
  } catch {
    return false;
  }
}
export function readPins(): string[] {
  try {
    const pins = JSON.parse(localStorage.getItem(PIN_KEY) ?? "[]");
    return Array.isArray(pins)
      ? pins.filter((p) => typeof p === "string").slice(0, 30)
      : [];
  } catch {
    return [];
  }
}
export function savePins(pins: string[]): boolean {
  try {
    localStorage.setItem(PIN_KEY, JSON.stringify(pins));
    return true;
  } catch {
    return false;
  }
}
