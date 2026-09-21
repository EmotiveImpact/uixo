"""Explicit, bounded capture of unpublished source evidence for UIXO.

Run from a UIXO checkout:
  python -m tools.provider_ingestion.capture --plan --all
  python -m tools.provider_ingestion.capture --capture kibo-ui
  python -m tools.provider_ingestion.capture --capture --all

This is a staging tool. It never approves providers, creates previews, publishes
assets, updates existing UIXO records, or connects to Neon.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import tarfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import urlsplit

from .core import Provider, licence_evidence, sha256, strict_json, relative_path, assert_unique
from .inventories import inventory

MAX_ARCHIVE_BYTES = 200_000_000
MAX_EXPANDED_BYTES = 500_000_000
MAX_RETAINED_BYTES = 100_000_000
SOURCE_SUFFIXES = {'.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.css', '.md', '.mdx', '.txt', '.yaml', '.yml'}
NETWORK_HOSTS = {'api.github.com', 'codeload.github.com'}


class RestrictedRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        url = urlsplit(newurl)
        if url.scheme != 'https' or url.hostname not in NETWORK_HOSTS or url.username or url.password:
            raise ValueError('An upstream redirect left the reviewed GitHub hosts')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def get(url: str, limit: int) -> bytes:
    parsed = urlsplit(url)
    if (parsed.scheme != 'https' or parsed.hostname not in NETWORK_HOSTS or
            parsed.username or parsed.password or parsed.port not in {None, 443}):
        raise ValueError('Unapproved capture source')
    request = urllib.request.Request(url, headers={
        'User-Agent': 'UIXO-reviewed-ingestion/1.0', 'Accept': 'application/vnd.github+json',
    })
    opener = urllib.request.build_opener(RestrictedRedirect())
    with opener.open(request, timeout=90) as response:
        if response.status != 200:
            raise ValueError('Expected a successful upstream response')
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError('Upstream response exceeded the byte budget')
    return data


def unpack_archive(data: bytes, provider: Provider) -> dict[str, bytes]:
    if len(data) > MAX_ARCHIVE_BYTES:
        raise ValueError('Archive byte budget exceeded')
    files: dict[str, bytes] = {}
    expanded = retained = count = 0
    expected_root = f'{provider.repository.split("/")[1]}-{provider.ref}'.lower()
    with tarfile.open(fileobj=io.BytesIO(data), mode='r|gz') as archive:
        for member in archive:
            count += 1
            if count > 100_000:
                raise ValueError('Archive entry budget exceeded')
            raw_parts = member.name.split('/')
            if not raw_parts or raw_parts[0].lower() != expected_root:
                raise ValueError('Archive root does not match the exact pinned repository and SHA')
            # Reject traversal before normalisation, even for entries we would skip.
            if any(p == '..' for p in raw_parts) or member.name.startswith('/') or '\\' in member.name:
                raise ValueError('Unsafe archive path')
            if member.issym() or member.islnk():
                # Never dereference links or count them as upstream source files.
                continue
            if not member.isfile():
                continue
            expanded += member.size
            if expanded > MAX_EXPANDED_BYTES:
                raise ValueError('Expanded archive budget exceeded')
            parts = PurePosixPath(member.name).parts[1:]
            if not parts or any(p in {'node_modules', '.git', '.next', 'dist', '.agents'} for p in parts):
                continue
            path = relative_path('/'.join(parts))
            if Path(path).suffix.lower() not in SOURCE_SUFFIXES and not re.search(r'(^|/)(LICENSE|LICENCE|NOTICE|COPYING)$', path, re.I):
                continue
            if member.size > 16_000_000:
                raise ValueError('Individual source file exceeds the byte budget')
            retained += member.size
            if retained > MAX_RETAINED_BYTES or len(files) >= 30_000:
                raise ValueError('Retained source budget exceeded')
            if path in files:
                raise ValueError('Duplicate archive source path')
            reader = archive.extractfile(member)
            if reader is None:
                raise ValueError('Unreadable upstream source file')
            files[path] = reader.read()
    return files


def encoded(value: Any) -> bytes:
    return (json.dumps(value, indent=2, ensure_ascii=False, sort_keys=True) + '\n').encode()


def immutable_batch(entries: dict[Path, bytes]) -> int:
    """Preflight all collisions; existing equal evidence is a no-op."""
    for path, data in entries.items():
        if path.is_symlink() or any(parent.is_symlink() for parent in path.parents):
            raise ValueError('Evidence output must not traverse a symbolic link')
        if path.exists() and path.read_bytes() != data:
            raise ValueError(f'Refusing to overwrite immutable evidence: {path}')
    created = 0
    for path, data in entries.items():
        if path.exists():
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        # O_EXCL prevents a concurrent writer from replacing the evidence.
        descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
        with os.fdopen(descriptor, 'wb') as stream:
            stream.write(data)
        created += 1
    return created


def provider_risks(pid: str) -> list[str]:
    risks = {
        'mapcn': ['MIT applies to the code, not automatically to CARTO basemap services. Review authorised tile configuration and commercial-use terms.'],
        'spectrum-ui': ['Mixed ancestry includes Aceternity, Magic UI and shadcn. Root Apache-2.0 does not prove all inherited notices and redistribution permissions.'],
        'badtz-ui': ['The additional significant-modification condition blocks automatic commercial redistribution approval.'],
        'microinteractions-ui': ['No project licence has been established. An unrelated skill licence is not a component-project licence.'],
    }
    return risks.get(pid, []) + [
        'Official first-party identity needs signed-off website/repository evidence.',
        'No actual component preview has passed browser acceptance.',
        'Installation and transitive dependency evidence must be reviewed before publication.',
        'Production project, Neon branch/database/endpoint and post-merge deployment acceptance remain unverified.',
    ]


def capture(provider: Provider, root: Path) -> dict:
    folder = root / 'data/registry/snapshots/ingestion' / provider.id / provider.ref
    target = folder / 'staged.json'
    if target.exists():
        old = strict_json(target.read_bytes())
        if (old.get('providerId') != provider.id or old.get('sourceRef') != provider.ref or
                old.get('publicationApproved') is not False):
            raise ValueError('Existing staging snapshot does not match this operation')
        assert_unique(old['items'])
        for evidence in old['retainedEvidence']:
            path = root / relative_path(evidence['path'])
            if path.is_symlink() or sha256(path.read_bytes()) != evidence['sha256']:
                raise ValueError('Retained evidence changed or is missing')
        return {'provider': provider.id, 'status': 'unchanged', 'candidates': len(old['items']), 'published': 0}

    commit = strict_json(get(f'https://api.github.com/repos/{provider.repository}/commits/{provider.ref}', 4_000_000))
    if commit.get('sha') != provider.ref:
        raise ValueError('GitHub did not confirm the exact source SHA')
    archive = get(f'https://codeload.github.com/{provider.repository}/tar.gz/{provider.ref}', MAX_ARCHIVE_BYTES)
    files = unpack_archive(archive, provider)
    items, exclusions, manifests = inventory(provider, files)
    licence = licence_evidence(provider, files)
    entries: dict[Path, bytes] = {}
    if provider.licence_path and provider.licence_path in files:
        entries[root / 'data/registry/licences' / provider.id / f'{provider.ref}.txt'] = files[provider.licence_path]
    # Never retain component code from an unlicensed/restricted source, nor infer
    # that Spectrum's mixed component ancestry is cleared by its root licence.
    retain_source = licence['expression'] in {'MIT', 'Apache-2.0'} and provider.id != 'spectrum-ui'
    for path in sorted(set(manifests + ['README.md', 'NOTICE'])):
        if path not in files:
            continue
        if retain_source:
            entries[folder / 'upstream' / relative_path(path)] = files[path]
    evidence = [{'path': str(p.relative_to(root)), 'sha256': sha256(data)} for p, data in entries.items()]
    snapshot = {
        'schemaVersion': 1, 'providerId': provider.id, 'name': provider.name,
        'website': provider.website, 'repository': provider.repository, 'branch': provider.branch,
        'sourceRef': provider.ref, 'archiveSha256': sha256(archive),
        'observedAt': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'status': 'captured-unpublished', 'publicationApproved': False,
        'licence': licence, 'retainedEvidence': evidence,
        'inventoryCount': len(items), 'excludedCount': len(exclusions), 'actualPublishedCount': 0,
        'unresolvedRisks': provider_risks(provider.id), 'exclusions': exclusions,
        'previewStrategy': 'Unapproved. Prefer official isolated demos; otherwise render pinned source. Never fabricate a preview.',
        'installationStrategy': 'Use retained upstream evidence. No installation command is approved by this capture.',
        'items': items,
    }
    entries[target] = encoded(snapshot)
    count = immutable_batch(entries)
    return {'provider': provider.id, 'status': 'captured-unpublished', 'candidates': len(items),
            'excluded': len(exclusions), 'filesCreated': count, 'published': 0}


def load_queue() -> list[Provider]:
    rows = strict_json(Path(__file__).with_name('queue.json').read_bytes())
    providers = [Provider(*row) for row in rows]
    if len(providers) != 15 or len({p.id for p in providers}) != 15:
        raise ValueError('The explicit 15-provider queue changed; review is required')
    return providers


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--plan', action='store_true')
    mode.add_argument('--capture', action='store_true')
    parser.add_argument('--all', action='store_true')
    parser.add_argument('--output-root', type=Path, default=Path.cwd())
    parser.add_argument('providers', nargs='*')
    args = parser.parse_args()
    queue = load_queue()
    wanted = set(args.providers)
    if args.all and wanted:
        parser.error('Select --all or explicit provider IDs, not both')
    if not args.all and not wanted:
        parser.error('Select --all or at least one explicit provider ID')
    if wanted - {p.id for p in queue}:
        parser.error('Unknown provider. Directory entries and excluded providers cannot be ingested here.')
    selected = [p for p in queue if args.all or p.id in wanted]
    if args.plan:
        print(json.dumps({'mode': 'plan-only', 'providers': [{'id': p.id, 'ref': p.ref} for p in selected], 'publishes': False}, indent=2))
        return 0
    root = args.output_root.resolve()
    if not (root / 'registry/providers.ts').is_file() or not (root / 'src/content/resources.json').is_file():
        parser.error('--output-root must be a real UIXO checkout; the capture does not read the directory as an approval list')
    failures = 0
    for provider in selected:  # Deliberately sequential at provider level.
        try:
            result = capture(provider, root)
        except Exception as error:
            failures += 1
            result = {'provider': provider.id, 'status': 'blocked', 'error': str(error), 'published': 0}
        print(json.dumps(result), flush=True)
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
