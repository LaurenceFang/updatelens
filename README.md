# UpdateLens

**Source-linked update reviews and verification prompts for Claude Code and Codex.**

UpdateLens connects official release notes with agent configuration declared in your projects. It helps you identify what deserves a closer look, inspect the evidence, and record what you actually checked.

## Why UpdateLens?

Coding agents change quickly. Release notes describe new MCP behavior, hooks, permissions, and configuration options, but do not tell you whether your projects use them. UpdateLens brings official changes and project declarations into one review. Facts, observations, and inferred relevance stay separate, so missing evidence remains visible.

## Features

- **Distinct channels:** Claude Code, Codex CLI, and Codex desktop, with separate version or date ranges.
- **Scoped review:** scan up to three explicitly registered local projects, or explore reproducible synthetic examples.
- **Cited findings:** inspect official source links, known configuration fields, declared flags, hypotheses, and suggested checks.
- **Verification Pack:** preview, copy, or download a read-only coding-agent prompt for the selected finding, including sources, declarations, unknowns, and a verification checklist. Generating a pack makes no model call.
- **Optional AI refinement:** inspect the exact sanitized payload before sending it to OpenCode Go. A failed or unavailable model leaves the rule-based review usable.
- **Review records:** browser-persisted Pending, Needs action, Done, or Deferred status and verification notes.
- **Exports:** Markdown and JSON reports containing the complete scoped review, citations, and related notes.
- **Desktop workspace:** focused reading layout, project/category navigation, subtle transitions, and reduced-motion support.

## Quick start

Requires **Node.js 22.19+** and npm.

```sh
git clone https://github.com/LaurenceFang/updatelens.git
cd updatelens
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:4317**. The UI and API share a loopback service. Sample projects and rule-based analysis work without an API key.

For development, run `npm run dev` and open **http://127.0.0.1:5173**. Vite proxies API requests to the backend.

## Workflow

1. Choose the product, current/target version or date, and development OS.
2. Open **Edit scope** to select workflow areas and projects. Use **Scan selected** for registered projects.
3. Choose **Analyze update**, then select a finding in the right-hand index.
4. Inspect the official change, project declarations, hypothesis, and suggested check. Expand references for the full evidence.
5. Open **Verification pack** to preview, copy, or download a source-linked review prompt.
6. Record your observations and task status, then export Markdown or JSON.

Right-side project/category filters change the reading view, not collection scope. Exports include the complete scoped review.

## Local projects

Create ignored `.local/projects.json` with up to three explicit absolute roots:

```json
{
  "projects": [
    {
      "id": "example-project",
      "name": "Example project",
      "rootPath": "C:/projects/example-project"
    }
  ]
}
```

Restart the backend after changing registration. IDs starting with `demo-` are reserved. A missing registration file permits sample-only operation; invalid configuration produces a startup error.

Collection uses a bounded allowlist of project-level agent configuration, known script references, CI declarations, and skill metadata. Scope escapes and symlinks/junctions are rejected. The collector does not execute project commands, install updates, inspect conversation histories, or upload arbitrary source trees.

## Optional AI configuration

Set `OPENCODE_GO_API_KEY` in `.env.local`. Both `.env.local` and `.local/` are ignored by Git. Never put credentials in a `VITE_` variable.

The integration uses OpenCode Go at `https://opencode.ai/zen/go/v1/chat/completions` with `deepseek-v4.1-flash`. Select **Go payload preview**, review the normalized content, then explicitly send it if appropriate.

Requests exclude raw files, absolute roots, project names, and private collection digests. Refinement is bounded and balanced across selected projects. There are no automatic retries or model switches. Missing credentials, exhausted runtime limits, timeouts, and invalid output retain a rule-based report.

**Verification Pack is a separate local feature:** it formats an inspectable prompt and neither sends it to a provider nor executes the proposed checks.

## Static sample mode

`npm run build` produces a static frontend in `dist/`. Without the local API, it uses bundled official release snapshots and synthetic projects. Local scanning, source refresh, and live AI are disabled; review, Verification Pack, notes, and client-side exports remain available.

Serve the build at a static host's root because asset paths are root-relative. Keep the local backend and private runtime configuration off public hosts.

## Sources and limitations

- Claude Code uses its official changelog; unavailable publication dates remain unknown.
- Codex CLI uses stable official GitHub releases.
- Codex desktop uses explicitly app-tagged, dated entries rather than CLI version numbers.
- Snapshots cover a **curated, incomplete window**. Entries retain source URLs and retrieval times.
- Project declarations do not establish installed versions, global-only configuration, or actual runtime usage.
- Findings are associations to investigate. Empty results do not prove compatibility.
- **Done is user-reported:** UpdateLens does not execute or independently verify checks.

Refresh the bundled sources with `npm run refresh:releases`, then rebuild.

## Validation

```sh
npm test
npm run build
```

Tests cover collection boundaries, channel separation, source ranges, task identity, citation validation, sanitization, exports, and Verification Pack behavior. Unit tests do not establish compatibility with an updated coding tool.

## Architecture

| Area | Responsibility |
| --- | --- |
| `src/shared` | Typed contracts |
| `src/core` | Collection, parsing, deterministic matching, sanitization, exports |
| `src/client` | API access, preferences, presentation, Verification Pack generation |
| `src/components` | React review workspace and dialogs |
| `server` | Guarded local API, official sources, optional model integration |
| `fixtures` | Reproducible synthetic projects |
| `public/fonts` | Self-hosted typography and upstream licenses |

Built with **React, TypeScript, Vite, and Node.js**. Font and icon dependencies retain their upstream license notices.
