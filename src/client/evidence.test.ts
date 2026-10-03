import test from "node:test";
import assert from "node:assert/strict";
import type { ChangeItem, Evidence } from "../shared/contracts";
import { prioritizeEvidence } from "./evidence";

test("named CLI/MCP evidence comes before generic presence without adding or modifying citations", () => {
  const evidence: Evidence[] = [
    {
      id: "generic",
      projectId: "sample",
      path: ".claude/settings.json",
      field: "$",
      kind: "config",
      evidenceType: "config",
      summary: "Presence only.",
      features: ["config"],
    },
    {
      id: "mcp",
      projectId: "sample",
      path: ".mcp.json",
      field: "mcpServers",
      kind: "config",
      evidenceType: "mcp",
      summary: "Declared.",
      features: ["mcp"],
      signals: ["mcpServers"],
    },
    {
      id: "script",
      projectId: "sample",
      path: "package.json",
      field: "scripts.review",
      kind: "script",
      evidenceType: "cli-script",
      summary: "Declared.",
      features: ["mcp"],
      signals: ["--mcp-config"],
    },
  ];
  const changes: ChangeItem[] = [
    {
      id: "change",
      title: "Synthetic",
      body: "Synthetic statement.",
      features: ["config", "mcp"],
      signals: ["--mcp-config"],
      sourceUrl: "https://example.invalid",
    },
  ];
  const before = structuredClone(evidence);
  const result = prioritizeEvidence(evidence, changes);
  assert.deepEqual(
    result.map((item) => item.id),
    ["script", "mcp", "generic"],
  );
  assert.deepEqual(evidence, before);
  assert.deepEqual(
    [...result.map((item) => item.id)].sort(),
    evidence.map((item) => item.id).sort(),
  );
  assert.deepEqual(prioritizeEvidence(evidence, changes), result);
});
