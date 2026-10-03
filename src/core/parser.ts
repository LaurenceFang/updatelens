import type { ChannelId, Evidence, FeatureId } from '../shared/contracts';
import { sanitizeText, stableId } from './sanitize';

type EvidenceType = NonNullable<Evidence['evidenceType']>;
const knownFlags = ['--dangerously-skip-permissions', '--permission-mode', '--mcp-config', '--model', '--resume', '--continue', '--session-id', '--add-dir', '--approval-policy', '--sandbox', '--enable', '--disable', '--json', '--output-format', '--print', '--full-auto', '--ask-for-approval'];
const featureForFlag: Partial<Record<string, FeatureId>> = {
  '--dangerously-skip-permissions': 'permissions', '--permission-mode': 'permissions', '--approval-policy': 'permissions', '--sandbox': 'permissions', '--ask-for-approval': 'permissions', '--full-auto': 'permissions',
  '--mcp-config': 'mcp', '--model': 'models', '--resume': 'sessions', '--continue': 'sessions', '--session-id': 'sessions',
};
const object = (value: unknown): Record<string, unknown> | undefined => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

export interface ParseResult { evidence: Evidence[]; warnings: string[] }

export function parseEvidence(projectId: string, path: string, text: string): ParseResult {
  const evidence: Evidence[] = [], warnings: string[] = [];
  const add = (field: string, type: EvidenceType, summary: string, features: FeatureId[], signals: string[] = [], line?: number, kind: Evidence['kind'] = 'config', appliesTo?: ChannelId[]) => {
    const declaredChannels: ChannelId[] = appliesTo ?? (path.startsWith('.claude/') || path === '.mcp.json' || path === 'CLAUDE.md' ? ['claude-code'] : path.startsWith('.codex/') || path.startsWith('.agents/skills/') ? ['codex-cli'] : []);
    evidence.push({ id: stableId('evidence', projectId, path, field), projectId, path, field, kind, evidenceType: type,
      summary: sanitizeText(summary), features: [...new Set(features)].sort(), signals: [...new Set(signals)].sort(), appliesTo: declaredChannels,
      excerpt: sanitizeText(`${field}: declaration present`), ...(line ? { line } : {}) });
  };
  const lineOf = (key: string) => {
    const at = text.indexOf(`"${key}"`);
    return at < 0 ? undefined : text.slice(0, at).split('\n').length;
  };
  const cli = (field: string, command: unknown, kind: Evidence['kind'], line?: number) => {
    if (typeof command !== 'string') return;
    const products = [...command.matchAll(/\b(claude|codex)(?:\.exe)?\b/g)];
    products.forEach((product, index) => {
      const tail = command.slice(product.index ?? 0, products[index + 1]?.index ?? command.length).split(/&&|\|\||[;\n]/, 1)[0];
      const flags = knownFlags.filter(flag => new RegExp(`(?:^|\\s)${flag}(?:[=\\s]|$)`).test(tail));
      const features: FeatureId[] = ['ci', ...flags.map(flag => featureForFlag[flag]).filter((v): v is FeatureId => !!v)];
      add(products.length === 1 ? field : `${field}.${product[1]}@${index + 1}`, 'cli-script', `Declared ${product[1]} CLI reference; command was not executed.`, features, [product[1], ...flags], line, kind, [product[1] === 'claude' ? 'claude-code' : 'codex-cli']);
    });
  };

  if (path.endsWith('.json')) {
    let json: Record<string, unknown> | undefined;
    try { json = object(JSON.parse(text)); } catch { warnings.push(`${path}: malformed JSON; evidence unknown.`); return { evidence, warnings }; }
    if (!json) { warnings.push(`${path}: expected an object; evidence unknown.`); return { evidence, warnings }; }
    if (path === 'package.json') {
      const scripts = object(json.scripts);
      for (const [name, command] of Object.entries(scripts ?? {}).slice(0, 48)) {
        if (/^[A-Za-z0-9:_-]{1,64}$/.test(name)) cli(`scripts.${name}`, command, 'script', lineOf(name));
      }
      // Metadata alone establishes only declared package capabilities, not runtime use.
      for (const field of ['dependencies', 'devDependencies']) {
        const deps = object(json[field]);
        for (const name of ['@anthropic-ai/claude-code', '@openai/codex']) {
          if (deps && name in deps) add(`${field}.${name}`, 'platform', `${name} is declared as a package dependency; use is unconfirmed.`, ['config'], [name], lineOf(name), 'config', [name.startsWith('@anthropic') ? 'claude-code' : 'codex-cli']);
        }
      }
    } else {
      add('$', 'config', 'Supported project configuration file present; raw values are not collected.', ['config']);
      for (const key of ['mcpServers', 'mcp_servers']) if (object(json[key])) add(key, 'mcp', 'Project MCP server declarations present; server names, URLs and credentials omitted.', ['mcp'], [key], lineOf(key));
      if (object(json.hooks)) {
        add('hooks', 'hooks', 'Project hook declarations present; hook command values omitted.', ['hooks'], ['hooks'], lineOf('hooks'));
        const events = ['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest', 'UserPromptSubmit', 'SessionStart', 'SessionEnd', 'Stop', 'SubagentStart', 'SubagentStop', 'PreCompact', 'Notification'];
        for (const event of events) if (event in object(json.hooks)!) add(`hooks.${event}`, 'hooks', `${event} hook declaration present; execution is unconfirmed.`, ['hooks'], [event], lineOf(event));
      }
      for (const key of ['permissions', 'enabledPlugins', 'skills', 'model', 'model_provider', 'modelProviders']) {
        if (!(key in json)) continue;
        const type: EvidenceType = key === 'enabledPlugins' ? 'plugins' : key === 'skills' ? 'skills' : key.startsWith('model') ? 'custom-provider' : 'config';
        const feature: FeatureId = key === 'permissions' ? 'permissions' : key === 'skills' || key === 'enabledPlugins' ? 'skills' : key.startsWith('model') ? 'models' : 'config';
        add(key, type, `Known ${key} configuration field present; value omitted.`, [feature], [key], lineOf(key));
      }
      const env = object(json.env);
      for (const key of ['ANTHROPIC_BASE_URL', 'OPENAI_BASE_URL', 'OPENAI_API_BASE', 'ANTHROPIC_MODEL', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX']) {
        if (env && key in env) add(`env.${key}`, 'custom-provider', `Custom provider/model environment declaration ${key} present; value omitted.`, ['models'], [key], lineOf(key));
      }
    }
  } else if (path === '.codex/config.toml') {
    add('$', 'config', 'Project Codex configuration present; project trust/loading and raw values are unverified.', ['config']);
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      const section = line.match(/^\s*\[\s*(mcp_servers|model_providers|skills|plugins)(?:[.\s\]])/);
      if (section) {
        const key = section[1];
        const feature: FeatureId = key === 'mcp_servers' ? 'mcp' : key === 'skills' || key === 'plugins' ? 'skills' : key === 'model_providers' ? 'models' : 'config';
        const type: EvidenceType = key === 'mcp_servers' ? 'mcp' : key === 'skills' ? 'skills' : key === 'model_providers' ? 'custom-provider' : 'plugins';
        add(`${key}@${index + 1}`, type, `Codex ${key} table declaration present; values omitted.`, [feature], [key], index + 1);
      }
      const key = line.match(/^\s*(model|model_provider|approval_policy|sandbox_mode|web_search|notify|experimental_use_rmcp_client|experimental_use_unified_exec)\s*=/)?.[1];
      if (key) add(key, key.startsWith('model') ? 'custom-provider' : key === 'notify' ? 'hooks' : 'config', `Known Codex ${key} field present; value omitted.`, [key.startsWith('model') ? 'models' : key === 'notify' ? 'hooks' : key === 'approval_policy' || key === 'sandbox_mode' ? 'permissions' : 'config'], [key], index + 1);
    });
    // This deliberately recognizes declarations, rather than pretending to validate all TOML.
    if (lines.some(line => /^\s*\[/.test(line) && !/^\s*\[.+\]\s*(?:#.*)?$/.test(line))) warnings.push(`${path}: malformed table declaration; recognized fields are partial and TOML validity is unverified.`);
  } else if (path.endsWith('/SKILL.md')) {
    add('file-presence', 'skills', 'Project skill declaration file present; prose and instructions not copied or executed.', ['skills'], ['SKILL.md'], 1);
  } else if (path === 'AGENTS.md' || path === 'CLAUDE.md') {
    add('file-presence', 'config', 'Project instruction/reference file present; arbitrary prose is not collected or treated as an instruction.', ['config'], [path], 1);
    for (const key of ['.mcp.json', '.codex/config.toml', '.claude/settings.json', 'SKILL.md']) {
      if (text.includes(key)) add(`reference:${key}`, key === 'SKILL.md' ? 'skills' : key === '.mcp.json' ? 'mcp' : 'config', `Explicit reference to ${key} found; referenced configuration loading is unverified.`, [key === 'SKILL.md' ? 'skills' : key === '.mcp.json' ? 'mcp' : 'config'], [key], undefined, 'config', key === '.codex/config.toml' ? ['codex-cli'] : key === '.mcp.json' || key === '.claude/settings.json' ? ['claude-code'] : []);
    }
  } else if (path.startsWith('.github/workflows/') || path === '.gitlab-ci.yml') {
    text.split('\n').forEach((line, i) => {
      // Only CLI references in shell run/script declarations. Unparsed YAML stays approximate.
      if (/\b(?:claude|codex)(?:\.exe)?\b/.test(line) && !/^\s*#/.test(line)) cli(`cli-reference@${i + 1}`, line, 'ci', i + 1);
    });
  } else if (path === 'pyproject.toml' || path === 'requirements.txt') {
    text.split('\n').forEach((line, i) => {
      if (/^\s*#/.test(line)) return;
      for (const name of ['claude-code', 'codex-cli']) if (new RegExp(`(?:^|[\\s"'])${name}(?:[\\s"'=<>~]|$)`, 'i').test(line)) add(`dependency:${name}@${i + 1}`, 'platform', `${name} appears in dependency metadata; runtime use is unconfirmed.`, ['config'], [name], i + 1);
    });
  }
  return { evidence, warnings };
}
