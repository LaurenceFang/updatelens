# UpdateLens visual specification — superseded

This older implementation baseline was rejected by the user. The active replacement specification is `redesign-spec.md`, based on the freshly generated full screenshot `workbench-redesign-v2.png`. Preserve this file only as historical material.

Reference: `workbench-concept.png`, generated with the built-in ImageGen tool and inspected on 2026-10-03. Prompt: a complete English developer update impact workbench with a true-white canvas, forest teal accents, open project/finding lists, and a single numbered evidence inspector.

## Tokens and structure

White #ffffff background; near-black #101719 headings; muted #5b6776 copy; forest #18594b primary accent; pale teal #edf7f3 selected row; light neutral #f5f6f7 inspector; divider #dce2e6; amber #fff0ca unknown labels. UI type uses local system sans; code locators use system monospace. Header 64px; horizontal gutters 40px; title 32px/1.2 bold; section titles 22px; body/control 14px/1.5. Buttons and inputs 6px corner radius; no shadows or decorative charts.

Open project and finding lists occupy two thirds; the single inspector occupies one third. Fine dividers connect the regions. Inspector sections are Official change, Project evidence, Impact hypothesis, Verification task. Selected rows use pale teal. At mobile widths, controls wrap and inspector follows the list. Focus rings remain visible.

## Intentional functional extensions

- Generated source prose, dates, counts and project names are illustrative. Actual fetched official notes and synthetic fixture identities replace them. No generated statement becomes a release fact.
- Mode selector explicitly distinguishes synthetic sample projects from registered local projects; registration stays outside the browser. No arbitrary add-path input.
- Source coverage and retrieval time are visible, with an expandable official update list and refresh/error state.
- A separate payload-preview dialog and explicit send action precede AI. Model status never implies compatibility.
- Findings paginate in twenty-row increments; filters and one inspector preserve legibility on large real changelogs.
- User task statuses/notes and manual pins persist in versioned browser storage. Done is labeled user-reported.
- Method/privacy dialog, scan errors, empty selections, unsupported ranges and provider failures use the same typography and control family.

No raster asset is needed in the runtime app; the concept is a design reference for code-native controls.
