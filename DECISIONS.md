# Decisions and deviations

## 2026-10-03 — Baseline
- Product name is UpdateLens, not UpgradeLens or Changebrief.
- Scope includes Claude Code and Codex. Existing Changebrief drafts outside this folder are preserved and are not the accepted product.
- Subagent implementation model: GPT-6.1 Sol, high. Root owns review, integration acceptance and user communication.
- User authorized independent routine decisions while asleep, with written rationale and verification.
- Provider: OpenCode Go, `deepseek-v4.1-flash`, official documented endpoint `https://opencode.ai/zen/go/v1/chat/completions`. Documentation: https://opencode.ai/docs/go/
- Go requires an identifying user-agent and stable `x-opencode-session`; use UpdateLens identity, never impersonate another client.
- Only existing Go allowance, no purchases/top-ups and no automatic fallback to Zen or another paid endpoint.
- Public demo may use an existing-account free host with sanitized fixtures; source repository and research/private data remain non-public. Real project paths await user input.
- Stripe Directory identification was attempted: CLI absent, web reader could not consume the directory's Markdown response. Used the named provider's official documentation to verify the connection details; no service was provisioned.
- Public/local separation is deliberate: public demo never accesses a visitor's filesystem and contains no provider credential. Local same-origin mode performs explicit scoped collection.

## Initial execution checks (historical)
- At the baseline, provider authentication and runtime acceptance were pending. The measured results below supersede that initial status.
- No public deployment is included in the current delivery.

## Latest user decisions
- Public-hosting permission was superseded: first create a PRIVATE GitHub repository and save code only; do not publicly deploy.
- Three real project roots supplied by the user are stored only in ignored local configuration. Validate read-only and keep any project-derived snapshots/reports in ignored .local/.
- Safe reuse of the explicitly supplied Go credential configured server-side .env.local, excluded by .gitignore. No credential value was emitted.
- Two developers successfully started with explicit model gpt-6.1-sol and reasoning high. A third developer hit the retained agent-thread limit. Backend owns the service/provider/sources; core owns collection/matching and subsequently the frontend redesign. Root remains reviewer and acceptance tester. This changes assignment, not the approved scope.

## Root review and measured checks
- Private repository created and read back as PRIVATE: https://github.com/LaurenceFang/updatelens. Git author uses the authenticated user's GitHub noreply address; .env.local and .local/projects.json are confirmed ignored. Source push awaits acceptance.
- A single bounded Go fixture request succeeded: HTTP 200, returned model deepseek-v4.1-flash, 606 total tokens, nonempty structured JSON. Metadata remains in ignored local review records; no credential or actual project data sent in this check.
- Root reviewed local collection, provider boundaries, source/range selection and exports. Requested fixes: credential-prefix redaction, Claude/Codex evidence scoping, source-anchor preservation, duplicate desktop-date range handling, real flag extraction, dev proxy startup and restrictive AI references. Developers are addressing them with targeted checks.
- Windows real collection on all three user-specified roots completed read-only. Selected declaration hashes and tracked Git status fingerprints were unchanged. No absolute registered roots or known credential prefixes occurred in outgoing summaries.
- Real-project limitation: the first two roots supplied no supported project-level agent declaration, and the third supplied generic AGENTS.md presence only. Their Codex desktop project names are user context, not proof of per-project runtime configuration. Missing evidence remains unknown. Global configuration and nested repositories were not read automatically; no speculative impact verdict is substituted.
- Activity uses collected declaration modification time only, not full Git history. This deliberate bounded implementation and its disclosed limits preserve the read-only/private-data boundary.
- Design/workbench-concept.png visual structure reviewed: source controls, project/finding rows and one evidence/task inspector approved. Generated placeholder dates, claims and project names are replaced by actual source/fixture data; disclosure/preview/error states are required additions.

## Subsequent acceptance and coordination
- The earlier frontend was rejected. A fresh full concept, workbench-redesign-v2.png, replaced it. Visible iterations are distributed across functional integration; the final typography/wrapping/responsive pass begins after root's functional E2E acceptance.
- Root made five bounded live Go requests in total: credential smoke, one-project application success, a three-project validation failure, then repaired three-project API and actual browser UI successes. The original validation failure's precise cause is unknown because the earlier adapter did not retain diagnostics. The failure kept the rule report; there was no retry or provider fallback. Later successes do not retroactively prove the original cause.
- Browser acceptance established task/note reload persistence, review-context isolation, actual Markdown/JSON downloads, channel/range separation, source refresh, local scans and missing-evidence results. Final visual acceptance and source push remain tracked separately until completed.
- One review handoff took too long: developers had completed their assigned phases and were waiting while root investigated browser input delivery. Root owns that coordination lapse. No further user decision was required.
- The user briefly requested a pause, then explicitly resumed. Both developers were already completed when the pause was checked; no active developer change was lost. Backend resumed an independent final review; core resumed the final visual pass.
- New user communication rule: if the entire effort unexpectedly stops, report the cause, each developer's state, completed and remaining scope, blocking conditions, and specific recovery steps. A developer completing its phase is not a reason to silently stop the whole effort.

## Final acceptance
- Four visible implementation passes completed, with final visual polish after the functional E2E scope. Root and frontend developer directly compared the accepted concept against actual 1536×1024, 1280×720 and 390×844 renders. Long labels fit, the action footer remains reachable, and independent configuration/evidence scrolling exposes projects and task controls. No further visual iteration was judged necessary; this is a recorded review judgment, not a claim that the user has approved the final appearance.
- The high-level IAB screenshot cropped at its device scaling. Explicit CSS-clip screenshots through the same documented Browser CDP capability corrected the evidence capture. DOM measurements showed no body horizontal overflow; no browser fallback or hidden app-state mutation was used.
- Complete standard npm test passed 44/44; TypeScript/Vite production build passed. The final backend review repaired explicit registration-error handling and actual source-count wording. The static no-API sample path rendered real bundled sources with Local/AI/Refresh disabled; no service was publicly deployed.
- Final local application console had no relevant errors/warnings. The QA tab for the transient static server was closed, that server stopped, viewport overrides reset, and the main loopback application retained for the user.
- Intended Git payload checked against the actual configured credential and all three registered roots, with no matches. Runtime configuration, scan records and provider diagnostics are ignored. Secret-shaped test literals are synthetic sanitizer regression inputs.

## User-approved visual replacement
- The user rejected the earlier frontend after the initial delivery. Earlier internal visual sign-off is historical and is not evidence of user acceptance.
- The user narrowed frontend scope to desktop web/desktop form. We implement the local desktop-browser workbench; mobile-specific layouts and native desktop packaging are not part of this revision.
- Several generated design directions were rejected. The upper-table/lower-detail composition was explicitly rejected, as were oversized/mechanical typography and candy-like gradients. The user selected the continuous central review manuscript with a narrow right navigation, then chose the latest displayed typography/color option 1 as final.
- Exact selected reference: `design/literary-graphite-concept.png`, copied without modifying the generated source. It is the Literary Graphite variant, not an earlier option with the same ordinal.
- Implement the approved structure in the existing React/Vite project. Product Design template initialization is unnecessary because the user requested changes to this working app with its existing real backend and persistence.
- Newsreader and Instrument Sans are self-hosted with upstream license/source records; standard icons use a matching outline library. Generated standalone background and transparent lens symbol are used as raster assets. UI text and controls remain native components.
- Edit scope contains configuration, project selection/scan, pins, coverage/refresh and analysis. The right project selector filters the current review view; it does not silently change what roots are collected or sent to the model.
- Transition polish must preserve task notes and focus, follow current evidence selection and honor reduced-motion preferences. No new model requests or backend workflow features are needed for the visual replacement.
