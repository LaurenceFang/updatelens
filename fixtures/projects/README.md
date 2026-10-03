# Synthetic project declarations

These three directories are reproducible test inputs, not production projects. They contain no actual user configuration, provider credentials, activity records or executed outcomes. Their declarations are also represented by `src/core/fixtures.ts` for the browser demo. No declared command is executed.

- `mcp-hooks`: Claude MCP, hook, permission and CLI flag declarations, supporting feature-level and exact-flag association cases.
- `missing`: unrelated package metadata only; absence of agent declarations leaves product usage unknown, including global-only usage.
- `skills-only`: Claude skill declaration, with no MCP or hook evidence; an MCP change is scoped unrelated when MCP is not selected, and unknown when the user says MCP is used.

Official change data is supplied by the release adapter. Tests use clearly labeled synthetic change statements to verify rules; those statements are not official release facts.
