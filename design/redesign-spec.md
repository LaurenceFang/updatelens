# UpdateLens active workbench design

Historical specification: superseded by the user's latest approved `literary-graphite-spec.md` and exact latest first Literary Graphite image. Preserve this earlier forest workbench as iteration history only.

Reference: fresh full ImageGen concept `workbench-redesign-v2.png`. Previous screenshot/concept is rejected and must not be reused as an implementation baseline. Real typed API content replaces illustrative source statements in the concept.

## Design system

- Canvas is true white `#ffffff`; cool rail `#f1f5f6`, inspector `#f7f9fa`, text `#17252b`, muted text `#64717d`, thin divider `#dce3e7`.
- Forest action `#18594b`, hover `#124638`, selected row `#eef7f3`; amber `#c58826` marks uncertainty/curated source coverage only.
- Neutral sans typography uses Inter when available with Segoe UI/Arial fallbacks. Modest 28px page heading; 18–19px region headings; 13–15px row titles and 12–13px evidence body. Chrome is smaller by design, subject to rendered legibility review.
- Four- to seven-pixel radii; no heavy elevation outside native dialogs. Repeated families: forest toggles, outlined controls, concise selectable project rows, divider-separated findings, numbered evidence sections and segmented task states.
- Code-native SVG icons use 1.6px rounded outline strokes, 14–18px dimensions. Geometric quadrant lens brand mark matches the concept's simple forest lens, with no raster hero decoration.

## Composition and workflow

Small header: brand, Review, Sources, Method, runtime mode. Modest page title: “Review an update”; subtitle “Official changes, grounded in your workflow.”

Three desktop regions: narrow setup rail, flexible readable findings, flexible evidence detail pane. Setup owns product/range, workflow area toggles, Sample/Local project mode, bounded project selection/manual pins, scoped scan and Analyze action, source coverage and refresh. No horizontal form row or large marketing hero. Findings own category filters, short grounded summaries and Export action; optional AI preview is a deliberate next action below the list. Inspector owns official facts, local declarations, rule/AI association, suggested check and user-reported task/note records.

Real source/data length requires disclosures rather than fake short statements: first source text with full statement disclosure, all grouped citations available, first declarations with remaining evidence disclosure, full inference/action accessible. Source/evidence content is not rewritten into fabricated facts. Exact external AI payload remains a native modal with project summaries and explicit send action. JSON/Markdown remain real downloads.

At 1099/1280px, all three columns must fit. At tablet widths, inspector moves under findings while setup stays on the left. At 390px, setup collapses and review/inspector stack. Every grid/flex child has zero automatic minimum width; body overflow is not hidden. Independent desktop inspector scrolling preserves all details without widening the page.

Visible passes are recorded in `ITERATIONS.md`. Final fidelity/responsive polish follows functional end-to-end acceptance, not a contiguous cosmetic restyle sequence.
