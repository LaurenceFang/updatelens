import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { lstat, realpath, open, opendir } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { ProjectSummary } from '../shared/contracts';
import { parseEvidence } from './parser';
import { sanitizeText } from './sanitize';

export const COLLECTION_LIMITS = Object.freeze({ roots: 3, files: 64, fileBytes: 48 * 1024, totalBytes: 512 * 1024, directoryEntries: 64, skillsPerDirectory: 12, workflowFiles: 24 });
export interface RegisteredRoot { id: string; name: string; rootPath: string }
const fixedFiles = ['.claude/settings.json', '.mcp.json', '.codex/config.toml', 'AGENTS.md', 'CLAUDE.md', 'package.json', 'pyproject.toml', 'requirements.txt', '.gitlab-ci.yml'];
const safeSegment = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const normalize = (path: string) => process.platform === 'win32' ? path.toLowerCase() : path;
const inside = (root: string, path: string) => {
  const diff = relative(root, path);
  return !isAbsolute(diff) && diff !== '..' && !diff.startsWith(`..${sep}`);
};
const allowedFile = (path: string) => fixedFiles.includes(path) || /^\.(?:claude|agents)\/skills\/[A-Za-z0-9][A-Za-z0-9._-]{0,79}\/SKILL\.md$/.test(path) || /^\.github\/workflows\/[A-Za-z0-9][A-Za-z0-9._-]{0,79}\.ya?ml$/.test(path);
const missing = (error: unknown) => ['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '');

/** Check every component; links inside the root are also refused to simplify the boundary. */
async function checkedPath(root: string, relativePath: string): Promise<string | undefined> {
  const target = resolve(root, relativePath);
  if (!inside(root, target) || isAbsolute(relativePath)) throw new Error('Path outside registered root rejected.');
  let current = root;
  for (const segment of relative(root, target).split(sep)) {
    current = resolve(current, segment);
    let stat;
    try { stat = await lstat(current); } catch (error) { if (missing(error)) return undefined; throw error; }
    if (stat.isSymbolicLink()) throw new Error('Symbolic link or junction rejected.');
    const canonical = await realpath(current);
    if (!inside(root, canonical)) throw new Error('Canonical path outside registered root rejected.');
  }
  return target;
}

/** Reads only fixed declarations and one-level allowlisted declaration directories. */
export async function scanRegisteredProject(registration: RegisteredRoot): Promise<ProjectSummary> {
  const project: ProjectSummary = {
    id: registration.id, name: sanitizeText(registration.name, 100), mode: 'local', status: 'ready', evidence: [], warnings: [],
    activityScore: 0, activityExplanation: 'No activity established. File timestamps are only an approximation; Git history and user activity are not collected.',
  };
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(registration.id)) {
    project.id = 'invalid-registration'; project.status = 'failed'; project.warnings.push('Invalid registered project ID.'); return project;
  }
  let root: string;
  try {
    if (!isAbsolute(registration.rootPath)) throw new Error('Root must be an absolute registered directory.');
    const requested = resolve(registration.rootPath);
    if (!(await lstat(requested)).isDirectory()) throw new Error('Root must be a directory.');
    root = await realpath(requested);
    // A root selected through a symlink/junction needs registration using its canonical path.
    if (normalize(root) !== normalize(requested)) throw new Error('Root must be registered using its canonical directory path.');
  } catch {
    project.status = 'failed'; project.warnings.push('Registered root is unavailable or is not a canonical directory. Absolute paths are omitted.'); return project;
  }
  const paths = [...fixedFiles];
  const declarations = async (dir: string, kind: 'skills' | 'workflows') => {
    try {
      const checked = await checkedPath(root, dir);
      if (!checked) return;
      const handle = await opendir(checked);
      const entries: { name: string; directory: boolean; file: boolean; link: boolean }[] = [];
      try {
        for await (const entry of handle) {
          if (entries.length >= COLLECTION_LIMITS.directoryEntries) {
            project.warnings.push(`${dir}: directory-entry limit exceeded; directory omitted.`); return;
          }
          entries.push({ name: entry.name, directory: entry.isDirectory(), file: entry.isFile(), link: entry.isSymbolicLink() });
        }
      } finally { await handle.close().catch(() => undefined); }
      const accepted = entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))
        .filter(entry => safeSegment.test(entry.name) && (kind === 'skills' ? entry.directory || entry.link : (entry.file || entry.link) && /\.ya?ml$/.test(entry.name)));
      const limit = kind === 'skills' ? COLLECTION_LIMITS.skillsPerDirectory : COLLECTION_LIMITS.workflowFiles;
      if (accepted.length > limit) project.warnings.push(`${dir}: declaration count limit reached; remaining declarations omitted.`);
      for (const entry of accepted.slice(0, limit)) paths.push(kind === 'skills' ? `${dir}/${entry.name}/SKILL.md` : `${dir}/${entry.name}`);
    } catch {
      project.warnings.push(`${dir}: declaration directory unavailable or symbolic link rejected.`);
    }
  };
  await declarations('.claude/skills', 'skills');
  await declarations('.agents/skills', 'skills');
  await declarations('.github/workflows', 'workflows');
  let bytes = 0, newest = 0, readCount = 0;
  const collectionHash = createHash('sha256');
  for (const path of paths.sort()) {
    if (!allowedFile(path)) { project.warnings.push('Unsupported declaration path rejected.'); continue; }
    if (readCount >= COLLECTION_LIMITS.files) { project.warnings.push('File-count limit reached; remaining files omitted.'); break; }
    const displayPath = sanitizeText(path, 200);
    try {
      const checked = await checkedPath(root, path);
      if (!checked) continue;
      const before = await lstat(checked);
      if (!before.isFile()) { project.warnings.push(`${displayPath}: non-file rejected.`); continue; }
      if (before.size > COLLECTION_LIMITS.fileBytes) { project.warnings.push(`${displayPath}: file-size limit exceeded; omitted.`); continue; }
      if (bytes + before.size > COLLECTION_LIMITS.totalBytes) { project.warnings.push('Total byte limit reached; remaining files omitted.'); break; }
      const handle = await open(checked, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      try {
        const opened = await handle.stat();
        const canonical = await realpath(checked);
        if (!inside(root, canonical) || normalize(canonical) !== normalize(checked) || opened.ino !== before.ino || opened.dev !== before.dev || !opened.isFile()) throw new Error('File changed or crossed collection boundary.');
        // Bounded handle read also protects against growth after the size check.
        const buffer = Buffer.alloc(COLLECTION_LIMITS.fileBytes + 1);
        const result = await handle.read(buffer, 0, buffer.length, 0);
        if (result.bytesRead > COLLECTION_LIMITS.fileBytes || bytes + result.bytesRead > COLLECTION_LIMITS.totalBytes) throw new Error('File grew beyond byte limit.');
        // Recheck components before releasing any parsed result.
        await checkedPath(root, path);
        bytes += result.bytesRead; readCount++;
        collectionHash.update(path).update('\0').update(buffer.subarray(0, result.bytesRead)).update('\0');
        const parsed = parseEvidence(registration.id, displayPath, buffer.subarray(0, result.bytesRead).toString('utf8'));
        project.evidence.push(...parsed.evidence);
        project.warnings.push(...parsed.warnings);
        if (parsed.evidence.length) newest = Math.max(newest, opened.mtimeMs);
      } finally { await handle.close(); }
    } catch {
      project.warnings.push(`${displayPath}: read failed or unsafe path rejected; evidence unknown.`);
    }
  }
  project.evidence.sort((a, b) => a.path.localeCompare(b.path, 'en') || (a.field ?? '').localeCompare(b.field ?? '', 'en'));
  project.warnings = [...new Set(project.warnings)].sort();
  project.collectionDigest = collectionHash.digest('hex');
  if (!project.evidence.length) project.warnings.push('No supported project declarations found. Global configuration was not read; usage remains unknown.');
  if (project.warnings.length) project.status = 'partial';
  if (newest) {
    const days = Math.max(0, Math.floor((Date.now() - newest) / 86_400_000));
    project.activityScore = Math.max(0, 100 - days * 5);
    project.activityExplanation = `Approximation only: newest collected declaration file modified ${new Date(newest).toISOString()}; recency = max(0, 100 - 5 × whole days since modification). This does not establish user activity or runtime use. No Git history read.`;
  }
  return project;
}

export async function collectProjects(registrations: RegisteredRoot[]): Promise<ProjectSummary[]> {
  if (registrations.length > COLLECTION_LIMITS.roots) throw new Error('At most three registered roots may be collected.');
  if (new Set(registrations.map(root => root.id)).size !== registrations.length) throw new Error('Registered project IDs must be unique.');
  const canonical = await Promise.all(registrations.map(root => realpath(root.rootPath).catch(() => undefined)));
  const valid = canonical.filter((root): root is string => !!root).map(normalize);
  if (new Set(valid).size !== valid.length) throw new Error('Registered roots must be distinct.');
  return Promise.all(registrations.map(scanRegisteredProject));
}

export const collectProject = scanRegisteredProject;
