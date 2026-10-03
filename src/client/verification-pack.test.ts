import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRules, getDemoProjects } from "../core/pure";
import type { ChannelId, Report } from "../shared/contracts";
import { createVerificationPack } from "./verification-pack";
function fixture(channel: ChannelId = "claude-code"): Report {
  const sourceUrl =
    channel === "claude-code"
      ? "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#21287"
      : "https://github.com/openai/codex/releases/tag/rust-v1.0.0#notes";
  return analyzeRules({
    request: {
      channel,
      from: "1.0",
      to: "1.1",
      workflow: { features: ["mcp"] },
      projectIds: ["demo-mcp-hooks", "demo-missing"],
      mode: "rule-only",
    },
    releases: [
      {
        id: "synthetic-release",
        channel,
        version: "1.1",
        date: "2026-01-01",
        title: "Synthetic source statement",
        fetchedAt: "2026-01-01T00:00:00Z",
        sourceUrl,
        changes: [
          {
            id: "synthetic-change",
            title: "Synthetic statement",
            body: "Synthetic statement about --mcp-config.",
            features: ["mcp"],
            signals: ["--mcp-config"],
            sourceUrl,
          },
        ],
      },
    ],
    coverage: {
      channel,
      selectionKind: "version",
      from: "1.0",
      to: "1.1",
      fetchedAt: "2026-01-01T00:00:00Z",
      complete: false,
      stale: false,
      sourceUrl,
      limitation: "Synthetic bounded coverage.",
    },
    projects: getDemoProjects(),
  });
}
test("missing evidence stays explicitly unknown; CC/Codex packs retain official anchors and read-only boundaries", () => {
  for (const channel of ["claude-code", "codex-cli"] as const) {
    const report = fixture(channel),
      finding = report.findings.find(
        (item) => item.projectId === "demo-missing",
      )!;
    const pack = createVerificationPack(report, finding.id);
    assert.match(pack.content, /Unknown: no cited supported declaration/);
    assert.match(
      pack.content,
      /does not mean the product is unused, compatible or safe/,
    );
    assert.ok(pack.content.includes(report.releases[0].changes[0].sourceUrl));
    assert.match(pack.content, /Do not execute project commands/);
    assert.match(pack.content, /proposed manual check/);
    assert.equal(pack.filename.endsWith(".md"), true);
  }
});
test("pack omits private extras/foreign citations, rejects absolute/traversal locators and scrubs secrets/query credentials", () => {
  const report = fixture(),
    finding = report.findings.find(
      (item) => item.projectId === "demo-mcp-hooks",
    )!;
  const project = report.projects.find(
    (item) => item.id === finding.projectId,
  )!;
  project.collectionDigest = "PRIVATE_DIGEST_SENTINEL";
  Object.assign(project, {
    rootPath: "E:\\Private Records\\root",
    rawContent: "RAW_CONTENT_SENTINEL",
    apiKey: "oc_sk_dummy1234567890",
  });
  project.evidence.push(
    {
      id: "foreign",
      projectId: "other-project",
      path: "package.json",
      field: "scripts.secret",
      kind: "script",
      summary: "FOREIGN_TASK_OR_EVIDENCE_SENTINEL",
      features: ["mcp"],
    },
    {
      id: "absolute",
      projectId: project.id,
      path: "E:\\Private Records\\secret.json",
      field: "mcpServers",
      kind: "config",
      summary: "ABSOLUTE_PATH_SENTINEL",
      features: ["mcp"],
    },
    {
      id: "traversal",
      projectId: project.id,
      path: "../private.json",
      kind: "config",
      summary: "TRAVERSAL_SENTINEL",
      features: ["mcp"],
    },
  );
  finding.evidenceIds.push("foreign", "absolute", "traversal");
  report.releases[0].changes[0].sourceUrl =
    "https://user:dummyPassword@github.com/anthropics/claude-code/blob/main/CHANGELOG.md?token=dummyQuery#21287";
  report.releases[0].changes[0].body =
    "Synthetic public statement; API_KEY=dummyValue oc_sk_dummy1234567890";
  Object.assign(report, {
    tasks: [{ verificationNotes: "PRIVATE_TASK_NOTE_SENTINEL" }],
  });
  const before = structuredClone(report),
    pack = createVerificationPack(report, finding.id);
  assert.doesNotMatch(
    pack.content,
    /PRIVATE_DIGEST|RAW_CONTENT|Private Records|dummyPassword|dummyQuery|dummyValue|dummy123|FOREIGN_TASK|ABSOLUTE_PATH_SENTINEL|TRAVERSAL_SENTINEL|PRIVATE_TASK_NOTE/,
  );
  assert.match(pack.content, /CHANGELOG\.md#21287/);
  assert.match(pack.content, /--mcp-config/);
  assert.match(pack.content, /locators were rejected/);
  assert.deepEqual(report, before);
});
