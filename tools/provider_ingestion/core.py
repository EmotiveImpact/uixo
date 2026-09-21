"""Strict, publication-free parsing of upstream ingestion evidence.

This module never executes upstream JavaScript, accepts arbitrary preview URLs,
changes registry/providers.ts, or writes to a UIXO database.
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Any

MAX_ITEMS = 2000
MAX_FILES = 80
MAX_TEXT_BYTES = 16_000_000
CATEGORIES = {
    'buttons', 'forms', 'navigation', 'layout', 'overlays', 'data-display',
    'feedback', 'text', 'backgrounds', 'media', 'motion', 'other',
}
DENIED_IDS = {'21st', '21st-dev', '21st.dev', 'react-bits', 'reactbits'}


@dataclass(frozen=True)
class Provider:
    id: str
    name: str
    website: str | None
    repository: str
    branch: str
    ref: str
    licence_path: str | None

    def __post_init__(self) -> None:
        if self.id in DENIED_IDS or not re.fullmatch(r'[a-z0-9][a-z0-9-]*', self.id):
            raise ValueError('Provider is excluded or has an invalid identifier')
        if self.repository.lower().split('/')[-1] in {'react-bits', 'reactbits', '21st', '21st-dev'} or self.repository.lower().startswith('21st-dev/'):
            raise ValueError('Excluded source repository, regardless of provider label')
        if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', self.repository):
            raise ValueError('Expected an explicit owner/repository')
        if not re.fullmatch(r'[a-f0-9]{40}', self.ref):
            raise ValueError('An exact 40-character upstream commit SHA is required')
        if self.licence_path:
            relative_path(self.licence_path)

    def source(self, path: str) -> str:
        return f'https://github.com/{self.repository}/blob/{self.ref}/{relative_path(path)}'


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()


def relative_path(value: Any) -> str:
    if (not isinstance(value, str) or not value or len(value) > 500 or
            '\\' in value or '%' in value or ':' in value or '\x00' in value or
            value.startswith('/') or any(p in {'', '.', '..'} for p in value.split('/'))):
        raise ValueError('Unsafe upstream source path')
    path = PurePosixPath(value)
    if path.is_absolute():
        raise ValueError('Absolute source paths are forbidden')
    return value


def strict_json(data: bytes) -> Any:
    if len(data) > MAX_TEXT_BYTES:
        raise ValueError('JSON byte budget exceeded')

    def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
        obj: dict[str, Any] = {}
        for key, value in items:
            if key in obj:
                raise ValueError(f'Duplicate JSON property: {key}')
            obj[key] = value
        return obj

    return json.loads(data.decode('utf-8'), object_pairs_hook=pairs)


def string_array(value: Any, *, maximum: int = 80) -> list[str]:
    if not isinstance(value, list) or len(value) > maximum:
        raise ValueError('Expected a bounded string array')
    if any(not isinstance(v, str) or not v.strip() or len(v) > 500 for v in value):
        raise ValueError('Invalid declared string array')
    return list(dict.fromkeys(value))


def category_for(slug: str, provider_tags: list[str]) -> str:
    # Staging suggestions, using the current shared category IDs. Curators must
    # approve the mapping before a record can become a published UIXO Asset.
    rules = [
        ('buttons', r'button|toggle|dock'),
        ('forms', r'input|textarea|checkbox|radio|select|switch|slider|calendar|picker|choicebox|^form$|^field$|^label$'),
        ('navigation', r'navbar|toolbar|navigation|breadcrumb|pagination|sidebar|menubar|tabs|scroll-spy'),
        ('overlays', r'dialog|drawer|sheet|popover|tooltip|hover-card|context-menu|dropdown|command|tour'),
        ('feedback', r'alert|toast|sonner|progress|spinner|skeleton|loading|empty|notification|status|gauge'),
        ('text', r'text|word|highlighter|number-ticker|typewriter|typing|typography'),
        ('backgrounds', r'background|pattern|particles|meteors|sparkles|aurora|border-beam'),
        ('media', r'image|video|avatar|carousel|lens|zoom|reel|stories'),
        ('data-display', r'table|chart|badge|tweet|code|tree|terminal|contribution|^map$'),
        ('layout', r'accordion|collapsible|card|bento|aspect-ratio|resizable|scroll-area|separator|marquee|hero|footer|content|pricing|feature|testimonial|team|call-to-action'),
        ('motion', r'animated|morph|transition|spring|magnetic|tilt|in-view|cursor|pointer|trail|orbit'),
    ]
    for category, pattern in rules:
        if re.search(pattern, slug):
            return category
    return next((tag for tag in provider_tags if tag in CATEGORIES), 'other')


def licence_evidence(provider: Provider, files: dict[str, bytes]) -> dict[str, Any]:
    data = files.get(provider.licence_path, b'') if provider.licence_path else b''
    body = data.decode('utf-8')
    restriction = re.search(
        r'commons clause|additional restriction|non.commercial|all rights reserved|'
        r'no redistribution|significantly modified|cannot be sold', body, re.I,
    )
    mit = ('permission is hereby granted, free of charge' in body.lower() and
           'copyright notice and this permission notice' in body.lower())
    apache = (bool(re.search(r'Apache License\s+Version 2\.0', body)) and
              'Grant of Copyright License' in body and 'Redistribution' in body)
    expression = ('Unlicensed' if not data else 'Restricted / review required' if restriction
                  else 'MIT' if mit else 'Apache-2.0' if apache else 'Unknown')
    permissive = expression in {'MIT', 'Apache-2.0'}
    return {
        'expression': expression,
        'path': provider.licence_path,
        'sourceUrl': provider.source(provider.licence_path) if provider.licence_path else None,
        'sha256': sha256(data) if data else None,
        'gitBlobSha': git_blob_sha(data) if data else None,
        'rootTextCommercialUse': 'allowed' if permissive else 'unknown',
        'rootTextRedistribution': 'allowed' if permissive else 'unknown',
        'publicationApproved': False,
        'note': 'Root-text assessment only. Additional terms, inherited notices, third-party assets and preview permissions require separate review.',
        'additionalLicencePaths': sorted(p for p in files if re.search(r'(^|/)(licen[sc]e[^/]*|NOTICE|COPYING)$', p, re.I)),
    }


def candidate(provider: Provider, slug: str, paths: list[str], files: dict[str, bytes],
              metadata: dict[str, Any], inventory_path: str) -> dict[str, Any]:
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,149}', slug):
        raise ValueError('Invalid upstream component name')
    if not paths or len(paths) > MAX_FILES:
        raise ValueError('Invalid component source file count')
    paths = list(dict.fromkeys(relative_path(path) for path in paths))
    primary = next((p for p in paths if p.endswith(('.tsx', '.jsx'))), None)
    if primary is None:
        raise ValueError('A web component must have a real TSX or JSX source file')
    missing = [p for p in paths if p not in files]
    tags = string_array(metadata.get('categories', []))
    deps = metadata.get('dependencies')
    registry_deps = metadata.get('registryDependencies')
    if deps is not None:
        deps = string_array(deps)
    if registry_deps is not None:
        registry_deps = string_array(registry_deps)
    return {
        'id': f'{provider.id}/{slug}', 'providerId': provider.id, 'slug': slug,
        'name': metadata.get('title') or slug.replace('-', ' ').title(),
        'description': metadata.get('description'), 'kind': 'component', 'platform': 'web',
        'status': 'unpublished', 'categorySuggestion': category_for(slug, tags),
        'providerTags': tags, 'sourceRef': provider.ref, 'sourceUrl': provider.source(primary),
        'sourcePath': primary,
        'sourceFiles': [{'path': p, 'url': provider.source(p), 'sha256': sha256(files[p]),
                         'gitBlobSha': git_blob_sha(files[p])} for p in paths if p in files],
        'inventoryEvidence': {'path': inventory_path, 'url': provider.source(inventory_path)},
        'dependencies': deps, 'registryDependencies': registry_deps,
        'dependencyEvidenceComplete': deps is not None and registry_deps is not None,
        'upstreamMetadata': {**metadata, **({'files': [{k: v for k, v in f.items() if k != 'content'} if isinstance(f, dict) else f for f in metadata['files']]} if isinstance(metadata.get('files'), list) else {})},
        'preview': None, 'previewStatus': 'not-verified', 'missingSourceFiles': missing,
        'publicationBlockers': ['Actual component preview has not passed review and browser acceptance',
                                'Official identity, installation and complete licence review remain required'] +
                               (['One or more declared source files are absent at the pinned SHA'] if missing else []),
    }


def parse_registry(provider: Provider, body: bytes, files: dict[str, bytes],
                   manifest_path: str, source_root: str = '') -> tuple[list[dict], list[dict]]:
    value = strict_json(body)
    items = value.get('items') if isinstance(value, dict) else None
    if not isinstance(items, list) or not items or len(items) > MAX_ITEMS:
        raise ValueError('Unexpected registry item bounds')
    found: set[str] = set()
    accepted, excluded = [], []
    for item in items:
        if not isinstance(item, dict):
            raise ValueError('Registry items must be objects')
        name = item.get('name')
        if not isinstance(name, str) or name in found:
            raise ValueError('Missing or duplicate registry name')
        found.add(name)
        if item.get('type') not in {'registry:ui', 'registry:component'}:
            excluded.append({'name': name, 'reason': f'Out of individual web-component scope: {item.get("type")}'})
            continue
        raw_files = item.get('files')
        if not isinstance(raw_files, list) or not raw_files or len(raw_files) > MAX_FILES:
            raise ValueError('Missing or excessive registry source files')
        paths = []
        for file in raw_files:
            path = file if isinstance(file, str) else file.get('path') if isinstance(file, dict) else None
            path = relative_path(path)
            paths.append(f'{source_root}/{path}' if source_root else path)
        if not any(p.endswith(('.tsx', '.jsx')) for p in paths):
            excluded.append({'name': name, 'reason': 'No standalone web component; no individual icon or helper ingestion'})
            continue
        # An absent optional field has the registry schema's empty-list meaning.
        metadata = {**item, 'dependencies': item.get('dependencies', []),
                    'registryDependencies': item.get('registryDependencies', [])}
        accepted.append(candidate(provider, name, paths, files, metadata, manifest_path))
    return accepted, excluded


def assert_unique(items: list[dict]) -> None:
    ids = [item['id'] for item in items]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate asset identities; no snapshot written')
    if any(item['status'] != 'unpublished' or item['preview'] is not None for item in items):
        raise ValueError('Evidence capture must never publish or invent previews')
