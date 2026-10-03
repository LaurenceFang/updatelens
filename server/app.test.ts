import test from "node:test";
import assert from "node:assert/strict";
import { createApp, loadRegistrations } from "./app.js";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadSnapshots } from "./releases.js";
import { GoProvider } from "./provider.js";
test("missing registration supports demo startup, malformed or unreadable registration fails explicitly", async (t) => {
  const directory = await mkdtemp(
    join(tmpdir(), "updatelens-registration-review-"),
  );
  const file = join(directory, "projects.json");
  t.after(async () => {
    await unlink(file);
    await rmdir(directory);
  });
  assert.deepEqual(
    await loadRegistrations(join(directory, "missing.json")),
    [],
  );
  await writeFile(file, "{invalid configuration");
  await assert.rejects(loadRegistrations(file), /registration JSON is invalid/);
  await assert.rejects(
    loadRegistrations(directory),
    /Unable to read local project registration/,
  );
});
test("local API requires session, rejects foreign origins/roots, and keeps provider optional", async (t) => {
  const server = createApp({
    port: 44319,
    registrations: [],
    releases: await loadSnapshots(),
    provider: new GoProvider({ sessionId: "test" }),
  });
  await new Promise<void>((resolve) =>
    server.listen(44319, "127.0.0.1", resolve),
  );
  t.after(() => server.close());
  const base = "http://127.0.0.1:44319";
  const foreign = await fetch(base + "/api/bootstrap", {
    headers: { Origin: "https://example.com" },
  });
  assert.equal(foreign.status, 403);
  const unauth = await fetch(base + "/api/releases");
  assert.equal(unauth.status, 401);
  const boot = await (await fetch(base + "/api/bootstrap")).json();
  assert.equal(boot.provider.ready, false);
  assert.ok(boot.sessionToken);
  const headers = {
    "Content-Type": "application/json",
    "X-UpdateLens-Session": boot.sessionToken,
  };
  const roots = await fetch(base + "/api/projects/scan", {
    method: "POST",
    headers,
    body: JSON.stringify({
      projectIds: [boot.demoProjects[0].id],
      rootPath: "C:/private",
    }),
  });
  assert.equal(roots.status, 400);
  const unknown = await fetch(base + "/api/projects/scan", {
    method: "POST",
    headers,
    body: JSON.stringify({ projectIds: ["../../private"] }),
  });
  assert.equal(unknown.status, 400);
  const selected = boot.releases.filter(
    (r: { channel: string }) => r.channel === "claude-code",
  );
  const request = {
    channel: "claude-code",
    from: selected.at(-1).version,
    to: selected[0].version,
    workflow: { features: ["hooks"] },
    projectIds: [boot.demoProjects[0].id],
    mode: "rule-only",
  };
  const rule = await fetch(base + "/api/analyze", {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });
  assert.equal(rule.status, 200);
  const report = (await rule.json()).report;
  assert.equal(report.mode, "rule-only");
  assert.equal(report.workflow.operatingSystem, "unspecified");
  assert.equal(report.workflow.operatingSystemSource, "unspecified");
  const windowsResponse = await fetch(base + "/api/analyze", {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...request,
      workflow: { features: ["hooks"], operatingSystem: "windows" },
    }),
  });
  assert.equal(windowsResponse.status, 200);
  const windowsReport = (await windowsResponse.json()).report;
  assert.equal(windowsReport.workflow.operatingSystem, "windows");
  assert.equal(windowsReport.workflow.operatingSystemSource, "user-selection");
  for (const operatingSystem of ["other", ["windows"], null]) {
    const invalidOS = await fetch(base + "/api/analyze", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...request,
        workflow: { features: ["hooks"], operatingSystem },
      }),
    });
    assert.equal(invalidOS.status, 400);
  }
  const invalidMode = await fetch(base + "/api/analyze", {
    method: "POST",
    headers,
    body: JSON.stringify({ ...request, mode: ["rule-only"] }),
  });
  assert.equal(invalidMode.status, 400);
  const noPreview = await fetch(base + "/api/analyze", {
    method: "POST",
    headers,
    body: JSON.stringify({ ...request, mode: "live-ai" }),
  });
  assert.equal(noPreview.status, 400);
  const preview = await (
    await fetch(base + "/api/analyze/preview", {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    })
  ).json();
  const changedSelection = await fetch(base + "/api/analyze", {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...request,
      workflow: { features: ["mcp"] },
      mode: "live-ai",
      previewId: preview.previewId,
    }),
  });
  assert.equal(changedSelection.status, 400);
  assert.equal((await changedSelection.json()).error.code, "PREVIEW_REQUIRED");
  const unavailable = await (
    await fetch(base + "/api/analyze", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...request,
        mode: "live-ai",
        previewId: preview.previewId,
      }),
    })
  ).json();
  assert.equal(unavailable.report.providerStatus, "unavailable");
  assert.equal(unavailable.provider.ready, false);
  const replay = await fetch(base + "/api/analyze", {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...request,
      mode: "live-ai",
      previewId: preview.previewId,
    }),
  });
  assert.equal(replay.status, 400);
  const finding = report.findings[0];
  const exportResponse = await fetch(base + "/api/export", {
    method: "POST",
    headers,
    body: JSON.stringify({
      reportId: report.id,
      format: "json",
      tasks: [
        {
          id: "task-test",
          findingId: finding.id,
          projectId: finding.projectId,
          title: finding.title,
          status: "done",
          verificationNotes:
            "User observed expected behavior in a manual check.",
          updatedAt: report.createdAt,
        },
      ],
    }),
  });
  assert.equal(exportResponse.status, 200);
  assert.ok(
    (await exportResponse.text()).includes("User observed expected behavior"),
  );
  const arbitraryExport = await fetch(base + "/api/export", {
    method: "POST",
    headers,
    body: JSON.stringify({
      reportId: "unrecognized",
      format: "json",
      tasks: [],
    }),
  });
  assert.equal(arbitraryExport.status, 400);
  const invalidFormat = await fetch(base + "/api/export", {
    method: "POST",
    headers,
    body: JSON.stringify({ reportId: report.id, format: ["json"], tasks: [] }),
  });
  assert.equal(invalidFormat.status, 400);
  const oversized = await fetch(base + "/api/analyze", {
    method: "POST",
    headers,
    body: JSON.stringify({ ...request, padding: "x".repeat(256000) }),
  });
  assert.equal(oversized.status, 413);
  const invalid = await fetch(base + "/api/analyze", {
    method: "POST",
    headers,
    body: "{broken",
  });
  assert.equal(invalid.status, 400);
});
test("development Vite entry host and origin work only in development mode", async (t) => {
  const releases = await loadSnapshots();
  const production = createApp({
    port: 44320,
    registrations: [],
    releases,
    provider: new GoProvider({ sessionId: "test" }),
  });
  const dev = createApp({
    port: 44321,
    dev: true,
    registrations: [],
    releases,
    provider: new GoProvider({ sessionId: "test" }),
  });
  await Promise.all([
    new Promise<void>((r) => production.listen(44320, "127.0.0.1", r)),
    new Promise<void>((r) => dev.listen(44321, "127.0.0.1", r)),
  ]);
  t.after(() => {
    production.close();
    dev.close();
  });
  const headers = { Host: "127.0.0.1:5173", Origin: "http://127.0.0.1:5173" };
  assert.equal(
    (await fetch("http://127.0.0.1:44320/api/bootstrap", { headers })).status,
    403,
  );
  assert.equal(
    (await fetch("http://127.0.0.1:44321/api/bootstrap", { headers })).status,
    200,
  );
});
test("self-hosted font bytes are served with WOFF2 MIME under the local static policy", async (t) => {
  const server = createApp({
    port: 44322,
    registrations: [],
    releases: await loadSnapshots(),
    provider: new GoProvider({ sessionId: "test" }),
    distRoot: resolve("public"),
  });
  await new Promise<void>((done) => server.listen(44322, "127.0.0.1", done));
  t.after(() => server.close());
  const response = await fetch(
    "http://127.0.0.1:44322/fonts/newsreader-latin-variable.woff2",
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "font/woff2");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.ok(
    response.headers
      .get("content-security-policy")
      ?.includes("default-src 'self'"),
  );
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "wOF2");
  assert.ok(bytes.length > 10000);
});
