# UpdateLens

An English developer update impact workbench for Claude Code, Codex CLI, and Codex desktop. It connects official update statements with scoped project declarations, makes the association reviewable, and records user verification tasks.

Source delivery is a **private GitHub repository**. No public deployment is part of the current delivery. The app supports local operation and a synthetic sample mode; sample projects never represent a user's production projects.

Private source: [LaurenceFang/updatelens](https://github.com/LaurenceFang/updatelens). This prototype was developed as advance preparation. It is not represented as work completed entirely inside a later timed assessment.

## Run locally

Requirements: Node.js 22.19 or newer and npm.

```powershell
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:4317`. The production UI and API share the same loopback service. The service never binds to an external interface.

For frontend development:

```powershell
npm run dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` to the loopback backend. The development server explicitly allows only the fixed Vite and backend loopback origins; production excludes the Vite origin.

Tests and official snapshot retrieval:

```powershell
npm test
npm run refresh:releases
```

The refresh script retrieves public official sources only and replaces the bundled snapshot only after all adapters succeed. Rebuild after a script refresh to update the standalone sample bundle. The app's Refresh sources button updates the running server snapshot in memory and retains the existing snapshot on failure.

## Register explicit projects

Create ignored `.local/projects.json` with up to three explicit absolute roots. API requests can select these IDs; they cannot submit filesystem paths. The schema is:

```json
{
  "projects": [
    {
      "id": "example-project",
      "name": "Example project",
      "rootPath": "C:/YourWorkspace/example-project"
    }
  ]
}
```

Use distinct lowercase IDs and roots. IDs beginning with `demo-` are reserved. Restart the backend after changing registration. Paths and registration values belong only in ignored local configuration, never tracked code or documentation. Inaccessible roots remain visible as per-project scan failures.

A missing registration file permits sample-only startup. Malformed JSON or an unreadable registration file stops startup with a clear configuration error; it never silently discards registered projects.

Choose Registered local projects, select at most three projects, and scan to review bounded declaration summaries. The collector reads supported agent configuration, known script references, CI declarations, skill metadata, and limited activity metadata. It rejects symlinks/junctions, oversized files, and scope escapes. It does not execute scripts, read secrets or `.env` files, inspect conversation histories or arbitrary source trees, discover other machine roots, modify projects, or install updates.

## Optional live analysis

The server reads `OPENCODE_GO_API_KEY` from ignored `.env.local`. Keep the credential local; never use a `VITE_` credential variable or put it in tracked files. The endpoint and model are fixed to the authorized OpenCode Go service: `https://opencode.ai/zen/go/v1/chat/completions`, `deepseek-v4.1-flash`.

Rule-only analysis works without a credential. Live analysis requires **Preview AI payload**, followed by **Send this payload to OpenCode Go**. The exact preview contains normalized, sanitized declaration summaries and public official statements. It excludes raw files, excerpts, project names and absolute roots. At most six finding groups are selected using a per-project quota (two each for three projects), with six representative changes and four evidence references per group; this partial refinement is disclosed. Original source/local facts and complete grouped citation sets remain unchanged.

The server uses `User-Agent: UpdateLens/0.1` and an ignored, stable provider session identity. There are no automatic retries, endpoint/model switches, purchases or paid fallbacks. The adapter defaults to twelve calls per process; this entry point uses eleven to account for a separate authorized credential smoke check. Failed calls consume the runtime budget. Restarting starts a new runtime budget, so operators must still respect their overall authorized allowance. Missing credentials, exhaustion, timeouts and invalid output retain a rule-only report with a visible status.

Output citation checks establish known IDs and membership in the original finding; they do not establish semantic correctness. A model response is a hypothesis, never proof of compatibility or executed verification.

The fixed model request uses a bounded 4,096-token output budget and concise per-finding output instructions. Safe diagnostics are recorded only in ignored `.local/provider-diagnostics.jsonl`: controlled outcome codes, HTTP status, validated model label, finish reason, numeric token usage, lengths, elapsed time and selected group count. Prompts, responses, keys, session IDs, project IDs/names and roots are never logged there. Truncation or any schema/citation failure retains the rule report and does not trigger a retry.

## What the sources establish

- **Claude Code:** five curated official changelog versions. The source does not provide publication dates; dates remain unknown rather than fabricated.
- **Codex CLI:** five stable official GitHub releases from one bounded release page. Prereleases and older history are outside the curated window.
- **Codex desktop:** five explicitly app-tagged, dated official update entries. Date ranges include every entry after the current date through the target date. Desktop builds and applicability are never inferred from CLI tags or project CLI configuration.

Each entry carries a source URL and actual retrieval time. Every curated range states incomplete coverage. Unsupported boundaries and reversed ranges fail explicitly. A zero-change range is not a compatibility conclusion. Installed versions, global-only configuration and actual runtime use are uncollected; missing evidence means unknown.

## Findings, tasks and exports

Findings distinguish official source facts, project observations, rule/AI inference and suggested user checks. Repeated changes are grouped by project/feature/category while preserving full source and evidence references. Confidence labels describe association strength, not upgrade safety. Manual pins reorder projects; activity ranking is approximate and its method is shown.

The development OS is your declared selection, with a conservative Windows default in the local UI. It does not establish a remote CI runner's OS or filter away other-platform release statements. Older requests that omit this field normalize to unspecified. The declared OS is included in review context and the normalized AI preview.

Verification status and notes persist in versioned browser storage. Done means **user-reported**, not independently verified execution. Markdown and JSON exports include the report, cited sources, limitations, and related task notes through the boundary sanitizer. Use Method & privacy to clear stored task notes.

## Structure

`src/shared` contains contracts; `src/core` contains collection, parsing, rules, fixtures and exports; `server` contains guarded APIs, official source adapters and the provider boundary; `src/components`, `src/client` and `src/styles` contain the workbench UI. The accepted visual reference is `design/workbench-redesign-v2.png`, with tokens in `design/redesign-spec.md` and the implementation history in `design/ITERATIONS.md`. Earlier concepts are historical material. Private runtime configuration and QA evidence belong in ignored `.local/`.

See `docs/backend-notes.md` and `docs/core-notes.md` for implementation decisions. A successful build or unit suite does not substitute for real provider and browser acceptance; those checks are performed separately and reported with their evidence.

## Verified delivery checks

The complete automated suite passed 44 checks, including local authorization, scope limits, cross-product separation, contextual task identity, citation boundaries and exports. TypeScript and the production Vite build passed.

Root separately exercised real OpenCode Go responses, the three-project preview/send/browser result, registered local collection, task/note reload persistence, changed-range isolation, pins/filters, both actual download formats, source refresh and invalid ranges. Synthetic samples also rendered from the static build without an API; local scans, refresh and AI were visibly unavailable in that mode. Private QA records are excluded from Git.

The three explicitly supplied real roots yielded insufficient product-associated declarations: two had none within the supported scope; one had generic AGENTS.md presence only. Their applicability remains unconfirmed. These checks establish the collector's actual observed output, not tool compatibility or executed update safety.
