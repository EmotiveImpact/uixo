import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { reviewedNotice } from '../../provider-demos/kibo-ui/notices.mjs';
const evidence = JSON.parse(
  readFileSync(
    new URL('../../data/registry/snapshots/kibo-preview-dependency-notices.json', import.meta.url),
    'utf8',
  ),
);
const directory = new URL('../../data/registry/licences/', import.meta.url).pathname;
test('dependency notices retain inspected MIT text for all thirteen exact package versions', () => {
  assert.equal(evidence.packages.length, 13);
  for (const item of evidence.packages) {
    const metadata = {
      name: item.name,
      version: item.version,
      license: 'MIT',
      repository: item.repository,
    };
    const notice = reviewedNotice(metadata, { integrity: item.integrity }, evidence, directory);
    assert.match(notice, /Permission is hereby granted/);
    assert.ok(notice.includes(item.licenceSource));
    assert.throws(
      () =>
        reviewedNotice(
          { ...metadata, version: '99.0.0' },
          { integrity: item.integrity },
          evidence,
          directory,
        ),
      /missing/,
    );
    assert.throws(
      () => reviewedNotice(metadata, { integrity: 'changed' }, evidence, directory),
      /missing/,
    );
    assert.throws(
      () =>
        reviewedNotice(
          { ...metadata, license: 'Commons Clause' },
          { integrity: item.integrity },
          evidence,
          directory,
        ),
      /missing/,
    );
    assert.throws(
      () =>
        reviewedNotice(
          { ...metadata, repository: { url: 'https://unreviewed.test' } },
          { integrity: item.integrity },
          evidence,
          directory,
        ),
      /mismatch/,
    );
  }
});
test('missing or tampered notice evidence fails closed', () => {
  const item = evidence.packages[0];
  const metadata = {
    name: item.name,
    version: item.version,
    license: 'MIT',
    repository: item.repository,
  };
  const temporary = mkdtempSync(path.join(tmpdir(), 'uixo-notices-'));
  try {
    assert.throws(
      () => reviewedNotice(metadata, { integrity: item.integrity }, { packages: [] }, directory),
      /missing/,
    );
    writeFileSync(path.join(temporary, item.licenceFile), 'Unreviewed substitute');
    assert.throws(
      () => reviewedNotice(metadata, { integrity: item.integrity }, evidence, temporary),
      /changed/,
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
