import type { ChangeItem, Evidence } from "../shared/contracts";

/** Reorders existing citations only; it cannot create evidence or change association strength. */
export function prioritizeEvidence(
  evidence: readonly Evidence[],
  changes: readonly ChangeItem[],
): Evidence[] {
  const signals = new Set(changes.flatMap((change) => change.signals ?? []));
  const features = new Set(changes.flatMap((change) => change.features));
  const typeOrder = {
    "cli-script": 0,
    mcp: 1,
    hooks: 2,
    "custom-provider": 3,
    skills: 4,
    plugins: 4,
    platform: 5,
    config: 6,
    missing: 7,
    activity: 8,
  };
  const score = (item: Evidence) => {
    const generic =
      !item.field || item.field === "$" || item.field === "file-presence";
    const namedSignal = item.signals?.some((signal) => signals.has(signal));
    const sharedFeature = item.features.some((feature) =>
      features.has(feature),
    );
    return (
      (generic ? 100 : 0) +
      (namedSignal ? -50 : sharedFeature ? -10 : 0) +
      typeOrder[item.evidenceType ?? "config"]
    );
  };
  return [...evidence].sort(
    (a, b) =>
      score(a) - score(b) ||
      a.path.localeCompare(b.path, "en") ||
      (a.field ?? "").localeCompare(b.field ?? "", "en"),
  );
}
