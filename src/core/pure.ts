// Browser-safe exports. Node filesystem collection is deliberately a separate module.
export { getDemoProjects } from './fixtures';
export { analyzeRules } from './rules';
export { exportMarkdown, exportJSON, exportReportMarkdown, exportReportJSON } from './export';
export { sanitizeText, safeSourceUrl, sanitizeForExport, stableId } from './sanitize';
