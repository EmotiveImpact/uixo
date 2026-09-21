import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** A finite, version/integrity-bound supplement for packages that omit their MIT text. */
export function reviewedNotice(metadata, locked, evidence, licenceDirectory) {
  const match = evidence.packages.find(
    (entry) => entry.name === metadata.name && entry.version === metadata.version,
  );
  if (
    !match ||
    metadata.license !== 'MIT' ||
    match.licence !== 'MIT' ||
    locked.integrity !== match.integrity ||
    !/^[a-z0-9-]+\.txt$/.test(match.licenceFile)
  ) {
    throw new Error(`Dependency licence notice missing: ${metadata.name}@${metadata.version}`);
  }
  const repository =
    typeof metadata.repository === 'string' ? metadata.repository : metadata.repository?.url;
  if (repository !== match.repository.url && `git+${repository}.git` !== match.repository.url)
    throw new Error(`Dependency repository mismatch: ${metadata.name}`);
  const text = readFileSync(path.join(licenceDirectory, match.licenceFile), 'utf8');
  if (createHash('sha256').update(text).digest('hex') !== match.licenceSha256)
    throw new Error(`Retained dependency licence changed: ${metadata.name}`);
  return `${match.licenceSource}\n${match.sourceNote}\n\n${text}`;
}

export function dependencyNotices(root) {
  const evidenceRoot = path.resolve(root, '../../data/registry');
  const evidence = JSON.parse(
    readFileSync(path.join(evidenceRoot, 'snapshots/kibo-preview-dependency-notices.json'), 'utf8'),
  );
  const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const notices = [];
  for (const entry of Object.keys(lock.packages)
    .filter((entry) => entry.startsWith('node_modules/'))
    .sort()) {
    const directory = path.join(root, entry);
    const metadata = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
    const files = readdirSync(directory, { withFileTypes: true }).filter(
      (file) => file.isFile() && /^(licen[cs]e|copying|notice)([.-].*)?$/i.test(file.name),
    );
    notices.push(
      `${metadata.name}@${metadata.version} (${metadata.license ?? 'See retained notice'})`,
    );
    if (files.length) {
      for (const file of files) notices.push(readFileSync(path.join(directory, file.name), 'utf8'));
    } else {
      notices.push(
        reviewedNotice(
          metadata,
          lock.packages[entry],
          evidence,
          path.join(evidenceRoot, 'licences'),
        ),
      );
    }
  }
  return notices.join('\n\n');
}
