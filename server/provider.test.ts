import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  analyzeRules,
  getDemoProjects,
  exportJSON,
} from "../src/core/index.js";
import { loadSnapshots, selectReleases } from "./releases.js";
import {
  buildAnalysisPayload,
  GoProvider,
  PROVIDER_ENDPOINT,
  validateAIOutput,
} from "./provider.js";
async function report() {
  const releases = await loadSnapshots();
  const items = releases.filter((r) => r.channel === "claude-code");
  const request = {
    channel: "claude-code" as const,
    from: items.at(-1)!.version!,
    to: items[0].version!,
    projectIds: getDemoProjects().map((p) => p.id),
    workflow: { features: ["hooks", "mcp", "permissions", "config"] as const },
    mode: "rule-only" as const,
  };
  return analyzeRules({
    request: {
      ...request,
      workflow: { features: [...request.workflow.features] },
    },
    ...selectReleases(releases, request.channel, request.from, request.to),
    projects: getDemoProjects(),
  });
}
test("missing credential and failed request preserve rule-only report without fallback", async () => {
  const r = await report();
  let calls = 0;
  const fetchFn = (async () => {
    calls++;
    return new Response("{}", { status: 503 });
  }) as typeof fetch;
  const missing = await new GoProvider({ sessionId: "test", fetchFn }).analyze(
    r,
  );
  assert.equal(missing.providerStatus, "unavailable");
  assert.equal(calls, 0);
  const provider = new GoProvider({
    apiKey: "test-only",
    sessionId: "test",
    maxCalls: 1,
    fetchFn,
  });
  const failed = await provider.analyze(r);
  assert.equal(failed.providerStatus, "failed");
  assert.deepEqual(failed.findings, r.findings);
  await provider.analyze(r);
  assert.equal(calls, 1);
});
test("AI validation rejects unknown/cross-project citations and normalized payload omits raw files and roots", async () => {
  const r = await report();
  r.projects[0].collectionDigest = "private-test-collection-identity";
  const f = r.findings[0];
  assert.throws(() =>
    validateAIOutput(
      {
        findings: [
          {
            findingId: f.id,
            inference: "Possibly changed behavior",
            suggestedAction: "Verify the relevant behavior",
            changeIds: ["invented"],
            evidenceIds: [],
          },
        ],
      },
      r,
    ),
  );
  const payload = JSON.stringify(buildAnalysisPayload(r));
  assert.ok(!payload.includes("rootPath"));
  assert.ok(!payload.includes("excerpt"));
  assert.ok(!payload.includes("collectionDigest"));
  assert.ok(!payload.includes("private-test-collection-identity"));
  assert.ok(!exportJSON(r, []).includes("private-test-collection-identity"));
  assert.ok(
    !Object.keys(
      buildAnalysisPayload(r).projects[0].evidence[0] ?? {},
    ).includes("path"),
  );
});
test("AI cannot replace a finding citation with another existing but unrelated reference", async () => {
  const r = await report();
  const payload = buildAnalysisPayload(r);
  const f = payload.findings.find((f) => f.category === "impact")!;
  const other = payload.changes.find(
    (c) => !r.findings.find((x) => x.id === f.id)!.changeIds.includes(c.id),
  )!;
  assert.ok(other);
  assert.throws(() =>
    validateAIOutput(
      {
        findings: [
          {
            findingId: f.id,
            inference: "Possibly changed behavior",
            suggestedAction: "Verify the relevant behavior",
            changeIds: [other.id],
            evidenceIds: f.evidenceIds,
          },
        ],
      },
      r,
    ),
  );
});
test("AI representative citations use actual newest-first source order and carry declared OS", async () => {
  const r = await report();
  r.workflow = {
    ...r.workflow,
    operatingSystem: "windows",
    operatingSystemSource: "user-selection",
  };
  const finding = r.findings.find((f) => f.category === "impact")!;
  finding.changeIds = [...finding.changeIds].sort().reverse();
  const originalIds = [...finding.changeIds];
  const expected = r.releases
    .flatMap((release) => release.changes)
    .map((change) => change.id)
    .filter((id) => originalIds.includes(id))
    .slice(0, 6);
  const payload = buildAnalysisPayload(r);
  assert.deepEqual(
    payload.findings.find((f) => f.id === finding.id)!.changeIds,
    expected,
  );
  assert.deepEqual(finding.changeIds, originalIds);
  assert.equal(payload.workflow.operatingSystem, "windows");
  assert.equal(payload.workflow.operatingSystemSource, "user-selection");
  assert.ok(payload.workflow.platformLimitation.includes("remote CI"));
});
test("successful provider uses fixed endpoint, identity, model and existing finding IDs", async () => {
  const r = await report();
  const f =
    buildAnalysisPayload(r).findings.find((f) => f.category === "impact") ??
    buildAnalysisPayload(r).findings[0];
  let target = "";
  const fetchFn = (async (url, init) => {
    target = String(url);
    const headers = init!.headers as Record<string, string>;
    assert.equal(headers["User-Agent"], "UpdateLens/0.1");
    assert.equal(headers["x-opencode-session"], "stable-test");
    const body = JSON.parse(init!.body as string);
    assert.equal(body.model, "deepseek-v4.1-flash");
    return new Response(
      JSON.stringify({
        model: "deepseek-v4.1-flash",
        choices: [
          {
            message: {
              content: JSON.stringify({
                findings: [
                  {
                    findingId: f.id,
                    inference:
                      "This may affect the declared workflow; verify before relying on it.",
                    suggestedAction:
                      "Run a focused manual check against the cited setting.",
                    changeIds: f.changeIds,
                    evidenceIds: f.evidenceIds,
                  },
                ],
              }),
            },
          },
        ],
      }),
    );
  }) as typeof fetch;
  const result = await new GoProvider({
    apiKey: "test-only",
    sessionId: "stable-test",
    fetchFn,
  }).analyze(r);
  assert.equal(target, PROVIDER_ENDPOINT);
  assert.equal(result.providerStatus, "success");
  assert.ok(result.findings.some((f) => f.origin === "ai"));
});
test("multi-project payload balances a bounded quota and preserves complete report refs", async () => {
  const r = await report();
  const original = r.findings.map((f) => ({
    id: f.id,
    changeIds: [...f.changeIds],
    evidenceIds: [...f.evidenceIds],
  }));
  const payload = buildAnalysisPayload(r);
  assert.ok(payload.findings.length <= 6);
  for (const project of r.projects) {
    const selected = payload.findings.filter((f) => f.projectId === project.id);
    assert.ok(selected.length >= 1 && selected.length <= 2);
  }
  assert.deepEqual(
    r.findings.map((f) => ({
      id: f.id,
      changeIds: f.changeIds,
      evidenceIds: f.evidenceIds,
    })),
    original,
  );
});
test("truncated output records safe metadata and retains rule report without retry", async (t) => {
  const directory = await mkdtemp(
    join(tmpdir(), "updatelens-provider-diagnostic-"),
  );
  const file = join(directory, "provider-diagnostics.jsonl");
  t.after(async () => {
    await unlink(file);
    await rmdir(directory);
  });
  const r = await report();
  r.findings[0].inference = "never-log-prompt-detail";
  let calls = 0;
  const fetchFn = (async (_url, init) => {
    calls++;
    const body = JSON.parse(init!.body as string);
    assert.equal(body.max_tokens, 4096);
    return new Response(
      JSON.stringify({
        model: "deepseek-v4.1-flash",
        choices: [
          {
            finish_reason: "length",
            message: { content: '{"findings":["never-log-response-detail"' },
          },
        ],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 4096,
          total_tokens: 5096,
          completion_tokens_details: { reasoning_tokens: 2800 },
        },
      }),
    );
  }) as typeof fetch;
  const result = await new GoProvider({
    apiKey: "never-log-this-credential",
    sessionId: "private-session-not-logged",
    diagnosticsDirectory: directory,
    fetchFn,
  }).analyze(r);
  assert.equal(calls, 1);
  assert.equal(result.providerStatus, "failed");
  assert.equal(result.mode, "rule-only");
  assert.deepEqual(result.findings, r.findings);
  const text = await readFile(file, "utf8");
  const diagnostic = JSON.parse(text.trim());
  assert.equal(diagnostic.code, "OUTPUT_TRUNCATED");
  assert.equal(diagnostic.httpStatus, 200);
  assert.equal(diagnostic.finishReason, "length");
  assert.equal(diagnostic.returnedModel, "deepseek-v4.1-flash");
  assert.equal(diagnostic.usage.reasoningTokens, 2800);
  assert.ok(diagnostic.selectedGroupCount <= 6);
  assert.ok(!text.includes("never-log-"));
  assert.ok(!text.includes("private-session"));
  assert.ok(!text.includes("projectId"));
});
