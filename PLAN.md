# UpdateLens development baseline

Approved direction, 2026-10-03 (Asia/Shanghai). This is a preparation product for a later timed assessment; it is not a claim that preparation happened inside the assessment timer.

## Product
English-first update impact assistant for developers using Claude Code and Codex. Flow: choose product/channel and a supported current-to-target version range, select workflow features, inspect official updates, correlate with up to three explicitly selected local projects, review evidence-backed impact hypotheses, record update/verification tasks, and export Markdown/JSON.

## Scope
- Claude Code and Codex are required. Distinguish Codex CLI and desktop update channels. Never infer desktop versions or applicability from CLI releases. If the desktop source cannot establish a version mapping, expose dated official updates with coverage limitations.
- Windows is the first real local target; responsive browser UI must work at desktop and mobile widths.
- Public demo uses documented fixtures and real public release snapshots. Local mode serves UI and API from the same loopback service and reads only explicitly registered roots (maximum three).
- Sources include official release notes and documented configuration semantics. Show retrieval time, coverage, cache/stale state and per-entry source link.
- Project evidence: supported agent configs, script declarations, CI references and limited activity metadata. No recursive whole-machine discovery. No secrets, .env files, conversation histories, arbitrary source upload, or project mutation. Scan failures remain per-project visible failures.
- Activity ranking is an approximate declared metric, with manual pinning. Missing evidence is unknown, never compatible/safe.
- Findings must distinguish official source fact, local evidence, AI/rule inference, and suggested action. Finding IDs, project IDs, source IDs and evidence IDs must be stable enough for task persistence and export.
- Tasks support pending / needs-action / done / deferred, plus user-entered verification notes. Done is a user report, not automatically verified execution.
- Real AI analysis uses OpenCode Go, DeepSeek V4.1 Flash. User explicitly selected this provider; the OpenAI-key workflow no longer applies. Use the Go endpoint only; no paid fallback, purchases or top-ups. Credentials remain local/server only. Real integration testing is root-owned and bounded.

## Runtime modes
Public demo: static frontend, curated reproducible fixture projects, dated real release data and clearly labeled sample/recorded analysis. Never expose the local collector or provider key publicly. If live public source refresh is implemented it must be optional and fail gracefully.
Local mode: Node service bound to 127.0.0.1, same-origin frontend; strict Host/Origin and per-session authorization on local API; canonical allowed roots, bounded allowlisted files, safe symlink handling. Project summaries displayed before external AI analysis. No shell-command execution API.

## Architecture and ownership
TypeScript with React/Vite UI, a small Node local backend, and shared typed contracts. Use few dependencies. Backend owns root package/configuration and shared contracts. Core owns collection/parsing/matching/export and fixture projects. Frontend owns UI/components/styles and its design concept. Coordinate schemas before integrating; all developers use GPT-6.1 Sol with high reasoning. Root reviews and verifies.

## Acceptance
1. Both Claude Code and Codex have genuine sourced update data and explicit channel labels.
2. A version/date range either has known coverage or states incomplete coverage; unsupported selections do not silently return success.
3. A real local scan of permitted fixture roots returns correctly located, sanitized evidence; traversal, external symlinks and sensitive files are rejected.
4. At least one explicit matching case, one unrelated-update case and one missing-evidence case produce calibrated findings.
5. Provider success is verified by a real bounded request, citations checked for existence; provider failure yields an honest non-AI report. Citation validity is not semantic correctness.
6. UI covers the core flow, task/notes persistence, Markdown/JSON exports, invalid inputs and network/provider failures. Browser/IAB is primary QA.
7. A local runnable build and deployable demo artifact are delivered, and source is saved to a PRIVATE GitHub repository. The user's latest instruction supersedes earlier public-hosting authorization: no public deployment now. Never include real project data, private assessment material or secrets.

## Delegated decisions
The user authorized routine execution choices and deviations to be made autonomously and recorded in DECISIONS.md. Use existing Go allowance only, no new purchases/top-ups. LATEST: create a private GitHub repository to save source; no public deployment now. Three real project roots have been supplied and are recorded in ignored local configuration; review collector before scanning them read-only. Do not begin/accept terms/submit the assessment.
