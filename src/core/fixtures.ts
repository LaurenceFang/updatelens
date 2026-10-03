import type { ProjectSummary } from '../shared/contracts';
import { parseEvidence } from './parser';

/** These are declaration strings reproduced by fixtures/projects; none represent user projects. */
export const SYNTHETIC_PROJECTS = [
  { id: 'demo-mcp-hooks', name: 'Synthetic · MCP and hooks', files: {
    '.claude/settings.json': '{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"echo synthetic hook; never executed"}]}]},"permissions":{"allow":["Read"]},"env":{"ANTHROPIC_BASE_URL":"https://example.invalid"}}',
    '.mcp.json': '{"mcpServers":{"synthetic-server":{"command":"synthetic-mcp","args":[]}}}',
    'package.json': '{"private":true,"scripts":{"agent:review":"claude --mcp-config .mcp.json --permission-mode plan"}}',
  } },
  { id: 'demo-missing', name: 'Synthetic · Missing project evidence', files: { 'package.json': '{"private":true,"scripts":{"test":"echo synthetic fixture; never executed"}}' } },
  { id: 'demo-unrelated', name: 'Synthetic · Skills only', files: { '.claude/skills/review/SKILL.md': '---\nname: synthetic-review\ndescription: A synthetic declaration for reproducible testing.\n---\nNo command is executed.\n' } },
] as const;

export function getDemoProjects(): ProjectSummary[] {
  return SYNTHETIC_PROJECTS.map(project => ({ id: project.id, name: project.name, mode: 'demo', status: 'ready',
    evidence: Object.entries(project.files).flatMap(([path, content]) => parseEvidence(project.id, path, content).evidence),
    warnings: [project.id === 'demo-missing' ? 'Synthetic fixture has no supported product declarations. Global-only usage remains unknown.' : 'Synthetic reproducible declaration fixture; no production data or executed verification results.'],
    activityScore: 0, activityExplanation: 'Synthetic fixture; no user activity measured and no commands executed.' }));
}
