import test from "node:test";
import assert from "node:assert/strict";
import type { Finding, Report } from "../shared/contracts";
import { presentFinding, visibleFindings } from "./presentation";
const finding = (
  id: string,
  projectId: string,
  category: Finding["category"],
): Finding => ({
  id,
  projectId,
  title: "Synthetic source grouping",
  severity: "info",
  confidence: "low",
  category,
  sourceFact: "Synthetic fact only.",
  localObservation: "No supported declaration.",
  inference: "Unconfirmed.",
  suggestedAction: "Review manually.",
  changeIds: ["change"],
  evidenceIds: [],
  origin: "rule",
});
const report: Report = {
  id: "synthetic-report",
  createdAt: "2026-01-01T00:00:00Z",
  from: "1.0",
  to: "1.1",
  channel: "claude-code",
  workflow: { features: ["mcp"] },
  mode: "rule-only",
  providerStatus: "not-requested",
  limitations: [],
  coverage: {
    channel: "claude-code",
    selectionKind: "version",
    from: "1.0",
    to: "1.1",
    fetchedAt: "2026-01-01T00:00:00Z",
    complete: false,
    stale: false,
    sourceUrl: "https://example.invalid",
  },
  projects: [
    { id: "one", name: "Synthetic · First project" },
    { id: "two", name: "Synthetic · Second project" },
  ].map((project) => ({
    ...project,
    mode: "demo",
    status: "ready",
    evidence: [],
    warnings: [],
    activityScore: 0,
    activityExplanation: "Synthetic; no activity measured.",
  })),
  releases: [
    {
      id: "synthetic-release",
      channel: "claude-code",
      version: "1.1",
      date: "2026-01-01",
      fetchedAt: "2026-01-01T00:00:00Z",
      sourceUrl: "https://example.invalid",
      title: "Synthetic release",
      changes: [
        {
          id: "change",
          title: "Synthetic MCP statement",
          sourceUrl: "https://example.invalid",
          body: "Synthetic MCP statement.",
          features: ["mcp"],
          signals: [],
        },
      ],
    },
  ],
  findings: [
    finding("f1", "one", "unknown"),
    finding("f2", "two", "unknown"),
    finding("f3", "one", "impact"),
  ],
};
test("right project/category filters only alter the view and preserve full report/scope references", () => {
  const before = structuredClone(report);
  assert.deepEqual(
    visibleFindings(report, "one", "unknown").map((item) => item.id),
    ["f1"],
  );
  assert.equal(visibleFindings(report, "all", "all").length, 3);
  assert.deepEqual(report, before);
});
test("unknown item titles identify projects and do not imply compatibility or absence of product use", () => {
  const first = presentFinding(report, report.findings[0]),
    second = presentFinding(report, report.findings[1]);
  assert.notEqual(first.title, second.title);
  assert.match(first.title, /First project/);
  assert.match(second.title, /Second project/);
  assert.doesNotMatch(first.title, /compatible|safe|unused/i);
});
