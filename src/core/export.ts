import type { Report, Task } from '../shared/contracts';
import { safeSourceUrl, sanitizeForExport } from './sanitize';

const md = (value: unknown) => String(value ?? '').replace(/[\\`*_{}\[\]<>#|]/g, '\\$&');

function payload(report: Report, tasks: Task[]) {
  return sanitizeForExport({ report, tasks: tasks.filter(task => report.findings.some(finding => finding.id === task.findingId && finding.projectId === task.projectId)),
    disclosure: 'Task statuses and verification notes are user reports. No verification check is executed by exporting this report.' }) as { report: Report; tasks: Task[]; disclosure: string };
}

export function exportJSON(report: Report, tasks: Task[] = []): string {
  return JSON.stringify(payload(report, tasks), null, 2);
}

export function exportMarkdown(report: Report, tasks: Task[] = []): string {
  const safe = payload(report, tasks);
  const r = safe.report;
  const lines = ['# UpdateLens report', '', `Product/channel: ${md(r.channel)}`, `Selection: ${md(r.from)} → ${md(r.to)}`, `Development OS: ${md(r.workflow.operatingSystem ?? 'unspecified')} (${md(r.workflow.operatingSystemSource ?? 'unspecified')}; remote CI platform unconfirmed)`, `Created: ${md(r.createdAt)}`, `Analysis: ${md(r.mode)}; provider: ${md(r.providerStatus)}`, '',
    '## Source coverage', '', `Fetched: ${md(r.coverage.fetchedAt)}; complete: ${r.coverage.complete}; stale: ${r.coverage.stale}`, md(r.coverage.limitation ?? 'Coverage as reported by the source adapter.'), '',
    '## Disclosures', '', ...r.limitations.map(item => `- ${md(item)}`), `- ${md(safe.disclosure)}`, '', '## Projects', ''];
  for (const project of r.projects) {
    lines.push(`### ${md(project.name)} (${md(project.id)})`, '', `Mode: ${md(project.mode)}; collection: ${md(project.status)}`, md(project.activityExplanation), '');
    for (const warning of project.warnings) lines.push(`- Collection note: ${md(warning)}`);
    for (const evidence of project.evidence) lines.push(`- Evidence ${md(evidence.id)}: ${md(evidence.path)}${evidence.line ? `:${evidence.line}` : ''}${evidence.field ? ` → ${md(evidence.field)}` : ''} — ${md(evidence.summary)}`);
    lines.push('');
  }
  lines.push('## Findings', '');
  for (const finding of r.findings) {
    lines.push(`### ${md(finding.title)}`, '', `Finding: ${md(finding.id)}; project: ${md(finding.projectId)}; category: ${md(finding.category)}; association confidence: ${md(finding.confidence)}`, '',
      `**Official source fact:** ${md(finding.sourceFact)}`, '', `**Local evidence:** ${md(finding.localObservation)}`, '', `**Inference:** ${md(finding.inference)}`, '', `**Suggested action:** ${md(finding.suggestedAction)}`, '',
      `Evidence references: ${finding.evidenceIds.length ? finding.evidenceIds.map(md).join(', ') : 'none'}`, '');
    for (const release of r.releases) for (const change of release.changes) if (finding.changeIds.includes(change.id)) {
      const link = safeSourceUrl(change.sourceUrl);
      if (link) lines.push(`Official source: [${md(change.id)}](${link.replace(/[()]/g, character => encodeURIComponent(character))})`, '');
    }
    for (const task of safe.tasks.filter(task => task.findingId === finding.id)) lines.push(`- User-reported task: ${md(task.title)} — ${md(task.status)} (${md(task.updatedAt)})`, `  User verification note: ${md(task.verificationNotes || 'No note provided.')}`, '');
  }
  lines.push('## Official changes', '');
  for (const release of r.releases) {
    const link = safeSourceUrl(release.sourceUrl);
    lines.push(`- ${md(release.version ?? release.date)}: ${md(release.title)}${link ? ` — [source](${link.replace(/[()]/g, character => encodeURIComponent(character))})` : ''}`);
  }
  return lines.join('\n') + '\n';
}

export const exportReportMarkdown = exportMarkdown;
export const exportReportJSON = exportJSON;
