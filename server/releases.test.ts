import test from "node:test";
import assert from "node:assert/strict";
import {
  loadSnapshots,
  parseClaude,
  parseCLI,
  parseDesktop,
  selectReleases,
  signals,
  getCoverage,
} from "./releases.js";

test("bundled snapshots are genuine channels with unique IDs and explicit limitations", async () => {
  const releases = await loadSnapshots();
  assert.equal(releases.length, 15);
  assert.equal(new Set(releases.map((r) => r.id)).size, 15);
  for (const channel of [
    "claude-code",
    "codex-cli",
    "codex-desktop",
  ] as const) {
    const items = releases.filter((r) => r.channel === channel);
    assert.equal(items.length, 5);
    assert.ok(
      items.every(
        (r) =>
          r.sourceUrl.startsWith("https://") &&
          !Number.isNaN(Date.parse(r.fetchedAt)) &&
          r.changes.length,
      ),
    );
    const selected = selectReleases(
      releases,
      channel,
      items.at(-1)!.version ?? items.at(-1)!.date,
      items[0].version ?? items[0].date,
    );
    assert.equal(selected.coverage.complete, false);
  }
  assert.ok(
    releases
      .filter((r) => r.channel === "claude-code")
      .every((r) => r.date === ""),
  );
  assert.ok(
    releases
      .filter((r) => r.channel === "codex-desktop")
      .every((r) => r.version === undefined),
  );
});
test("unsupported sources and ranges fail rather than fabricate coverage", async () => {
  assert.throws(() => parseClaude("# empty", "today"));
  assert.throws(() => parseCLI({}, "today"));
  assert.throws(() => parseDesktop("<html/>", "today"));
  const releases = await loadSnapshots();
  assert.throws(() => selectReleases(releases, "codex-cli", "0.0.1", "0.0.2"));
  const items = releases.filter((r) => r.channel === "codex-cli");
  assert.throws(() =>
    selectReleases(
      releases,
      "codex-cli",
      items[0].version!,
      items.at(-1)!.version!,
    ),
  );
  assert.equal(
    selectReleases(releases, "codex-cli", items[0].version!, items[0].version!)
      .releases.length,
    0,
  );
});
test("desktop date interval includes every entry on target day", async () => {
  const base = (await loadSnapshots()).filter(
    (r) => r.channel === "codex-desktop",
  );
  const older = base.at(-1)!;
  const target = base[0];
  const all = [...base, { ...target, id: "second-target-entry" }];
  const result = selectReleases(all, "codex-desktop", older.date, target.date);
  assert.equal(result.releases.filter((r) => r.date === target.date).length, 2);
  assert.ok(
    result.releases.every((r) => r.date > older.date && r.date <= target.date),
  );
  assert.equal(
    selectReleases(all, "codex-desktop", target.date, target.date).releases
      .length,
    0,
  );
  assert.throws(() =>
    selectReleases(all, "codex-desktop", target.date, older.date),
  );
});
test("official explicit CLI option tokens retain leading hyphens", () => {
  assert.ok(
    signals("Fixed `--mcp-config` and `CLAUDE.md` loading.").signals.includes(
      "--mcp-config",
    ),
  );
});
test("coverage describes actual adapter window count rather than the upper bound", async () => {
  const releases = await loadSnapshots();
  for (const channel of [
    "claude-code",
    "codex-cli",
    "codex-desktop",
  ] as const) {
    const shortWindow = releases
      .filter((r) => r.channel === channel)
      .slice(0, 2);
    const coverage = getCoverage(shortWindow, channel);
    assert.ok(coverage.limitation?.startsWith("2 "));
    assert.equal(coverage.complete, false);
  }
});
