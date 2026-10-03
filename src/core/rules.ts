import type { AnalyzeRequest, ChannelId, Coverage, Evidence, Finding, ProjectSummary, Release, Report } from '../shared/contracts';
import { sanitizeForExport, sanitizeText, stableId } from './sanitize';

function supportsChannel(evidence: Evidence, channel: ChannelId): boolean {
  return channel !== 'codex-desktop' && !!evidence.appliesTo?.includes(channel);
}

export interface AnalyzeInput { request: AnalyzeRequest; releases: Release[]; coverage: Coverage; projects: ProjectSummary[]; now?: string }

interface Candidate extends Finding { group: string; directSignals: string[]; inspectionTargets: string[] }
const distinct = <T,>(items: T[]) => [...new Set(items)];
const priority = (finding: Candidate) => finding.directSignals.length ? 0 : finding.category === 'impact' ? 1 : finding.category === 'unknown' ? 2 : 3;

function consolidate(candidates: Candidate[], projects: ProjectSummary[], channel: ChannelId, contextId: string): Finding[] {
  const result: Finding[] = [];
  const merge = (items: Candidate[], title?: string): Finding => {
    const first = [...items].sort((a, b) => priority(a) - priority(b) || a.id.localeCompare(b.id))[0];
    const changeIds = distinct(items.flatMap(item => item.changeIds)).sort();
    const evidenceIds = distinct(items.flatMap(item => item.evidenceIds)).sort();
    const signals = distinct(items.flatMap(item => item.directSignals)).sort();
    const targets = distinct(items.flatMap(item => item.inspectionTargets)).sort();
    const facts = distinct(items.map(item => item.sourceFact));
    const groupName = first.group.split('|').at(-1) ?? 'workflow';
    const association = first.category === 'impact' ? signals.length ? 'Direct association' : 'Possible workflow relevance' : first.category === 'unknown' ? 'Applicability unconfirmed' : 'No scoped association';
    return { id: stableId('finding', contextId, first.projectId, channel, title ?? first.group), projectId: first.projectId,
      title: title ?? `${association}${first.category === 'impact' ? ` · ${groupName}` : ''}${changeIds.length > 1 ? ` · ${changeIds.length} changes` : ''}`,
      severity: 'info', confidence: signals.length ? 'high' : first.confidence, category: first.category,
      sourceFact: facts.slice(0, 3).join('\n\n') + (facts.length > 3 ? `\n\n${facts.length - 3} additional source statements are retained in the official changes and change references.` : ''),
      localObservation: distinct(items.map(item => item.localObservation)).slice(0, 3).join(' '),
      inference: signals.length ? `Direct association: official changes and local declarations share ${signals.join(', ')}. This establishes named associations, not incompatibility or runtime impact.` : first.inference,
      suggestedAction: first.category === 'impact'
        ? `Inspect ${signals.length ? `the declared ${signals.join(', ')} signal(s)` : `the ${groupName} declarations`} at ${targets.slice(0, 4).join('; ')}${targets.length > 4 ? ` and ${targets.length - 4} additional cited locations` : ''}. Review each linked official change for its documented behavior. If that behavior is used, compare it on the current and target versions and record the observed result. No command or verification check has been executed.`
        : first.suggestedAction,
      changeIds, evidenceIds, origin: 'rule' };
  };
  for (const project of projects) {
    const groups = new Map<string, Candidate[]>();
    for (const finding of candidates.filter(item => item.projectId === project.id)) groups.set(finding.group, [...(groups.get(finding.group) ?? []), finding]);
    const ordered = [...groups.values()].sort((a, b) => priority(a[0]) - priority(b[0]) || a[0].group.localeCompare(b[0].group));
    if (ordered.length <= 6) result.push(...ordered.map(items => merge(items)));
    else {
      // Preserve calibrated categories when reducing many features; unknown changes must
      // never be folded into an impact group merely to meet a display cap.
      const direct = ordered.filter(items => items[0].directSignals.length);
      const hypotheses = ordered.filter(items => items[0].category === 'impact' && !items[0].directSignals.length);
      if (direct.length) result.push(merge(direct.flat(), 'Direct associations across declared features'));
      if (hypotheses.length) result.push(merge(hypotheses.flat(), 'Possible relevance across declared features'));
      result.push(...ordered.filter(items => items[0].category !== 'impact').map(items => merge(items)));
    }
  }
  return result;
}

/** Deterministic associations, not compatibility verdicts or executed verification. */
export function analyzeRules(input: AnalyzeInput): Report {
  const { request } = input;
  const projects = input.projects.filter(project => request.projectIds.includes(project.id));
  const releases = input.releases.filter(release => release.channel === request.channel);
  const operatingSystem = request.workflow.operatingSystem ?? 'unspecified';
  const operatingSystemSource = operatingSystem === 'unspecified' ? 'unspecified' as const : 'user-selection' as const;
  const contextId = stableId('context', request.channel, request.from, request.to,
    operatingSystem, operatingSystemSource,
    [...request.workflow.features].sort().join(','), [...request.projectIds].sort().join(','),
    JSON.stringify(releases.map(release => ({ id: release.id, channel: release.channel, version: release.version, date: release.date, title: release.title,
      sourceUrl: release.sourceUrl, changes: release.changes })).sort((a,b) => a.id.localeCompare(b.id))),
    JSON.stringify(projects.map(project => ({ id: project.id, status: project.status, collectionDigest: project.collectionDigest,
      evidence: [...project.evidence].sort((a,b) => a.id.localeCompare(b.id)) })).sort((a,b) => a.id.localeCompare(b.id))));
  const candidates: Candidate[] = [];
  for (const project of projects) {
    const observed = project.evidence.filter(evidence => supportsChannel(evidence, request.channel));
    for (const release of releases) for (const change of release.changes) {
      const matching = observed.filter(evidence => evidence.features.some(feature => change.features.includes(feature)));
      const selected = change.features.some(feature => request.workflow.features.includes(feature));
      const explicitSignals = [...new Set((change.signals ?? []).filter(signal => matching.some(evidence => evidence.signals?.includes(signal))))];
      const sharedFeatures = [...new Set(matching.flatMap(evidence => evidence.features.filter(feature => change.features.includes(feature))))].sort();
      const category: Finding['category'] = matching.length ? 'impact' : selected || !observed.length || !change.features.length || project.status === 'failed' ? 'unknown' : 'unrelated';
      let observation: string, inference: string, action: string;
      if (matching.length) {
        observation = matching.slice(0, 4).map(evidence => `${evidence.path}${evidence.field ? ` → ${evidence.field}` : ''}: ${evidence.summary}`).join(' ');
        inference = explicitSignals.length
          ? `Direct association: official change and local declaration share ${explicitSignals.join(', ')}. This establishes a named association, not incompatibility or runtime impact.`
          : `Feature-level hypothesis: official change and collected project declarations share ${sharedFeatures.join(', ')}. Configuration presence alone does not prove the changed behavior is used.`;
        action = `Review the linked official change and the cited local declarations. If the documented behavior is part of this workflow, reproduce that behavior on the current and target versions and record the observed result. No verification command has been executed.`;
      } else if (category === 'unrelated') {
        observation = `Collected ${observed.length} channel-relevant declaration(s); no matching feature was found within the bounded collection.`;
        inference = 'No association with the collected evidence or selected workflow features. This scoped unrelated classification does not rule out uncollected or global usage and is not a compatibility verdict.';
        action = 'Defer this item only if the selected workflow describes actual use. Review manually if global configuration or an uncollected workflow uses the changed feature. No check was executed.';
      } else {
        observation = project.status === 'failed' ? 'The project scan failed; no reliable local evidence is available.' : request.channel === 'codex-desktop' ? 'Local CLI/project declarations do not establish Codex desktop applicability or installed desktop version.' : observed.length ? 'No collected declaration establishes use of the changed feature. Global configuration and runtime use are uncollected.' : 'No supported evidence for this product channel was collected. Missing project configuration does not mean the product is unused.';
        inference = 'Applicability remains unconfirmed. Absence of evidence cannot establish compatibility, safety, or absence of usage.';
        action = 'Confirm whether this feature is used, including global configuration when applicable, then compare the documented behavior on current and target versions. Record your own verification notes; no check was executed.';
      }
      const featureGroup = sharedFeatures.find(feature => feature !== 'config' && feature !== 'ci') ?? sharedFeatures[0] ?? 'workflow';
      const group = `${project.id}|${category}|${category === 'impact' ? `${explicitSignals.length ? 'direct' : 'feature'}|${featureGroup}` : 'summary'}`;
      candidates.push({ id: stableId('finding', project.id, request.channel, change.id), projectId: project.id, group, directSignals: explicitSignals,
        inspectionTargets: matching.map(evidence => `${evidence.path}${evidence.field ? ` → ${evidence.field}` : ''}`),
        title: `${category === 'impact' ? explicitSignals.length ? 'Direct association' : 'Possible workflow relevance' : category === 'unknown' ? 'Applicability unconfirmed' : 'No scoped association'}: ${sanitizeText(change.title, 150)}`,
        severity: 'info', confidence: explicitSignals.length ? 'high' : matching.length ? 'medium' : 'low', category,
        sourceFact: sanitizeText(`${release.version ?? release.date}: ${change.body || change.title}`, 2400), localObservation: sanitizeText(observation, 2400), inference, suggestedAction: action,
        changeIds: [change.id], evidenceIds: matching.map(evidence => evidence.id), origin: 'rule' });
    }
  }
  const limitations = [
    'Read-only bounded declarations; no scripts, update commands, model calls or verification checks were executed by the rule engine.',
    'Global configuration, secrets, histories, source trees and installed versions are not collected. Missing evidence means unknown.',
    'Confidence describes strength of the association only. Findings do not prove impact, incompatibility, compatibility or safety.',
    'Task statuses and verification notes are user reports, not independently verified execution.',
    'Development OS is a user-selected profile value, not an observed runtime fact. It does not establish remote CI runner platforms, platform applicability or compatibility.',
    'Findings are grouped by project, feature and association category, with named associations prioritized; at most six groups per project are displayed. Every selected official change and all grouped change/evidence references remain in the report. Group summaries may quote only the first three source statements.',
  ];
  if (!input.coverage.complete) limitations.push(`Official source coverage is incomplete: ${input.coverage.limitation ?? 'Range completeness is unconfirmed.'}`);
  if (input.coverage.stale) limitations.push('Official source snapshot is stale; retrieval time is shown and applicability may have changed.');
  if (request.channel === 'codex-desktop') limitations.push('Codex CLI releases/configuration cannot establish desktop version mapping or desktop applicability.');
  if (!releases.length) limitations.push('No official changes available for the selected range; no project compatibility conclusion can be drawn.');
  for (const id of request.projectIds) if (!projects.some(project => project.id === id)) limitations.push(`Selected project ${sanitizeText(id, 64)} has no scan result; applicability unknown.`);
  const report: Report = { id: stableId('report', contextId),
    createdAt: input.now ?? new Date().toISOString(), channel: request.channel, from: request.from, to: request.to, workflow: { ...request.workflow, operatingSystem, operatingSystemSource },
    mode: 'rule-only', providerStatus: 'not-requested', coverage: input.coverage, releases, projects, findings: consolidate(candidates, projects, request.channel, contextId), limitations };
  return sanitizeForExport(report) as Report;
}
