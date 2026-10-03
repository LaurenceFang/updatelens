/** Boundary sanitizer. Configuration values are intentionally not collected. */
export function sanitizeText(value: unknown, limit = 480): string {
  let text = String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  text = text.replace(/https?:\/\/[^\s<>"'`]+/gi, candidate => {
    try {
      const url = new URL(candidate);
      url.username = ''; url.password = ''; url.search = '';
      url.hash = ''; // Arbitrary text never needs opaque URL-fragment contents.
      return url.toString();
    } catch { return '[redacted-url]'; }
  });
  text = text.replace(/\b(?:oc_sk_[A-Za-z0-9_-]{8,}|sk-[A-Za-z0-9_-]{8,}|(?:gh[pousr]_|github_pat_|hf_)[A-Za-z0-9_]{8,}|AKIA[A-Z0-9]{16})\b/g, '[redacted-secret]');
  text = text.replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-secret]');
  text = text.replace(/\bBearer\s+[^\s,;"']+/gi, 'Bearer [redacted-secret]');
  text = text.replace(/\b(api[_-]?key|access[_-]?token|auth[_-]?token|password|secret|authorization)\s*[=:]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1=[redacted-secret]');
  text = text.replace(/\b[A-Za-z]:[\\/][^\n\r<>"'`),;]*/g, '[local-path]');
  text = text.replace(/\\\\[A-Za-z0-9_.-]+\\[^\n\r<>"'`),;]*/g, '[local-path]');
  text = text.replace(/(?:^|\s)(?:\/Users\/|\/home\/|\/tmp\/|\/private\/|\/mnt\/)[^\s<>"'`),;]*/g, ' [local-path]');
  return text.slice(0, limit);
}

export function safeSourceUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    url.username = ''; url.password = ''; url.search = '';
    const fragment = decodeURIComponent(url.hash.slice(1));
    const official = url.protocol === 'https:' && (
      (url.hostname === 'github.com' && /^\/(?:anthropics\/claude-code|openai\/codex)(?:\/|$)/.test(url.pathname)) ||
      (url.hostname === 'developers.openai.com' && url.pathname.startsWith('/codex/')) ||
      (url.hostname === 'learn.chatgpt.com' && url.pathname.startsWith('/docs/')) ||
      (url.hostname === 'code.claude.com' && url.pathname.startsWith('/docs/')) ||
      (url.hostname === 'help.openai.com' && url.pathname.startsWith('/en/articles/'))
    );
    const keepFragment = official && /^[A-Za-z0-9._~%/-]{1,200}$/.test(fragment) && sanitizeText(fragment, 4000) === fragment;
    const anchor = keepFragment ? url.hash : '';
    url.hash = '';
    return sanitizeText(url.toString(), 4000) + anchor;
  } catch { return ''; }
}

/** Stable browser-safe IDs; inputs contain only project IDs and relative locators. */
export function stableId(prefix: string, ...parts: string[]): string {
  const input = parts.join('\u001f');
  let a = 0x811c9dc5, b = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    a = Math.imul(a ^ input.charCodeAt(i), 0x01000193);
    b = Math.imul(b ^ input.charCodeAt(i), 0x85ebca6b);
  }
  return `${prefix}-${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`;
}

export function sanitizeForExport(value: unknown): unknown {
  if (typeof value === 'string') return sanitizeText(value, 20_000);
  if (Array.isArray(value)) return value.map(sanitizeForExport);
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (/^(root|rootPath|absolutePath|apiKey|authorization|password|secret|token|sessionToken|collectionDigest)$/i.test(key)) continue;
      output[sanitizeText(key, 160)] = key === 'sourceUrl' && typeof child === 'string' ? safeSourceUrl(child) : sanitizeForExport(child);
    }
    return output;
  }
  return value;
}
