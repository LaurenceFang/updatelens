import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { createApp, loadRegistrations } from "./app.js";
import { loadSnapshots } from "./releases.js";
import { GoProvider, stableProviderSession } from "./provider.js";
try {
  process.loadEnvFile(resolve(".env.local"));
} catch {
  /* Provider readiness is reported without revealing environment contents. */
}
const port = 4317;
const registrations = await loadRegistrations(resolve(".local/projects.json"));
const provider = new GoProvider({
  apiKey: process.env.OPENCODE_GO_API_KEY,
  sessionId: await stableProviderSession(resolve(".local")),
  maxCalls: 11,
  diagnosticsDirectory: resolve(".local"),
});
const server = createApp({
  port,
  dev: process.argv.includes("--dev"),
  registrations,
  provider,
  releases: await loadSnapshots(),
  distRoot: existsSync(resolve("dist/index.html"))
    ? resolve("dist")
    : undefined,
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `UpdateLens is available at http://127.0.0.1:${port}. Local projects: ${registrations.length}. OpenCode Go ready: ${provider.ready}.`,
  ),
);
