"""Provider-specific, data-only source inventory readers.

These create staging evidence, not publishable Asset objects. Missing dependency
or preview evidence is represented explicitly rather than invented.
"""
from __future__ import annotations
import re
from typing import Any
from .core import Provider, candidate, parse_registry, strict_json, assert_unique

JSON_REGISTRIES = {
    'uiable': ('src/components/uiable/registry.json', 'src/components/uiable'),
    'evilcharts': ('registry.json', ''),
    'kokonut-ui': ('registry.json', ''),
    'mapcn': ('registry.json', ''),
    'spectrum-ui': ('registry.json', ''),
    'microinteractions-ui': ('src/registry.json', ''),
    'badtz-ui': ('registry.json', ''),
    '8bitcn-ui': ('registry.json', ''),
}
TOKEN = re.compile(r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|\x27(?:\\.|[^\x27\\])*\x27|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$-]*|[^\s]')


def tokens(body: str) -> list[str]:
    return [m.group() for m in TOKEN.finditer(body)
            if not m.group().startswith(('//', '/*'))]


def property_names(body: str) -> list[str]:
    parts = tokens(body)
    names = []
    for i in range(1, len(parts) - 2):
        if parts[i] != 'name' or parts[i - 1] not in {'{', ','} or parts[i + 1] != ':':
            continue
        literal = parts[i + 2]
        if literal[0] not in {'"', "'"}:
            raise ValueError('Dynamic registry name requires manual review')
        name = literal[1:-1]
        if not re.fullmatch(r'[a-z0-9][a-z0-9-]*', name):
            raise ValueError('Non-literal or unsafe registry component name')
        names.append(name)
    if not names or len(names) > 200:
        raise ValueError('Unexpected TypeScript UI inventory bounds')
    if len(names) != len(set(names)):
        raise ValueError('Duplicate TypeScript registry component names')
    return names


def tailark_blocks(body: str) -> list[dict[str, str]]:
    parts = tokens(body)
    out = []
    for i in range(len(parts) - 2):
        if parts[i:i + 3] != ['block', '(', '{']:
            continue
        depth, j, fields = 1, i + 3, {}
        while j < len(parts) and depth:
            if depth == 1 and parts[j] in {'category', 'variant', 'path'} and parts[j + 1:j + 2] == [':']:
                literal = parts[j + 2]
                if literal[0] not in {'"', "'"} or '\\' in literal:
                    raise ValueError('Dynamic Tailark block declaration requires review')
                fields[parts[j]] = literal[1:-1]
            if parts[j] == '{':
                depth += 1
            elif parts[j] == '}':
                depth -= 1
            j += 1
        if depth or set(fields) != {'category', 'variant', 'path'}:
            raise ValueError('Incomplete Tailark block declaration')
        out.append(fields)
    return out


def inventory(provider: Provider, files: dict[str, bytes]) -> tuple[list[dict], list[dict], list[str]]:
    pid = provider.id
    items: list[dict[str, Any]] = []
    excluded: list[dict] = []
    manifests: list[str] = []
    paths = sorted(files)

    def add(slug: str, source_paths: list[str], metadata: dict, manifest: str):
        items.append(candidate(provider, slug, source_paths, files, metadata, manifest))

    if pid in JSON_REGISTRIES:
        manifest, prefix = JSON_REGISTRIES[pid]
        items, excluded = parse_registry(provider, files[manifest], files, manifest, prefix)
        manifests.append(manifest)
    elif pid == 'kibo-ui':
        manifests.append('apps/docs/lib/package.ts')
        for path in paths:
            match = re.fullmatch(r'packages/([^/]+)/package.json', path)
            if not match:
                continue
            slug = match[1]
            if slug in {'patterns', 'shadcn-ui', 'typescript-config'}:
                excluded.append({'name': slug, 'reason': 'Patterns, shared primitives or tooling, not an individual Kibo component'})
                continue
            manifests.append(path)
            meta = strict_json(files[path])
            source_paths = sorted(p for p in paths if re.fullmatch(rf'packages/{re.escape(slug)}/[^/]+\.tsx', p))
            if not source_paths:
                excluded.append({'name': slug, 'reason': 'No standalone TSX source; style-only packages stay out'})
                continue
            index = f'packages/{slug}/index.tsx'
            if index in source_paths:
                source_paths.remove(index)
                source_paths.insert(0, index)
            declared = meta.get('dependencies', {})
            add(slug, source_paths, {'description': meta.get('description'), 'package': meta,
                'dependencies': [key for key in declared if not key.startswith('@repo/') and key not in {'react', 'react-dom'}],
                'registryDependencies': None,
                'installationNote': 'Registry dependency resolution remains to be reviewed against the retained upstream getPackage implementation.'}, path)
    elif pid == 'dice-ui':
        # One identity per Radix UI component; Base UI records are alternative
        # implementations to review, not silently added as duplicate assets.
        manifest = 'docs/registry/bases/radix/ui/_registry.ts'
        manifests.extend([manifest, 'docs/registry/bases/base/ui/_registry.ts'])
        for slug in property_names(files[manifest].decode()):
            add(slug, [f'docs/registry/bases/radix/ui/{slug}.tsx'],
                {'base': 'radix', 'installationNote': 'Dependency declarations need a full literal AST review before publication.'}, manifest)
    elif pid == 'flowbite-react':
        pkg_path = 'packages/ui/package.json'
        manifests.append(pkg_path)
        pkg = strict_json(files[pkg_path])
        for path in paths:
            match = re.fullmatch(r'packages/ui/src/components/([^/]+)/index.ts', path)
            if not match:
                continue
            name = match[1]
            if name == 'Floating':
                excluded.append({'name': name, 'reason': 'Internal floating primitive'})
                continue
            slug = re.sub(r'(?<!^)(?=[A-Z][a-z])', '-', name).lower()
            add(slug, [f'packages/ui/src/components/{name}/{name}.tsx'], {'package': pkg}, path)
        add('button-group', ['packages/ui/src/components/Button/ButtonGroup.tsx'], {'package': pkg}, 'packages/ui/src/components/Button/index.ts')
    elif pid == 'heroui-web':
        pkg_path = 'packages/react/package.json'
        manifests.append(pkg_path)
        pkg = strict_json(files[pkg_path])
        for path in paths:
            match = re.fullmatch(r'packages/react/src/components/([^/]+)/\1\.stories\.tsx', path)
            if match:
                slug = match[1]
                add(slug, [f'packages/react/src/components/{slug}/{slug}.tsx'], {'storyPath': path, 'package': pkg}, path)
                manifests.append(path)
    elif pid == 'fancy-components':
        manifests.append('package.json')
        for path in paths:
            match = re.fullmatch(r'src/fancy/components/([^/]+)/([^/]+)\.tsx', path)
            if match:
                add(match[2], [path], {'categories': [match[1]], 'projectPackage': strict_json(files['package.json']),
                    'installationNote': 'Project dependencies are not a per-component dependency claim.'}, path)
                manifests.append(path)
    elif pid == 'babelize-elements':
        manifests.extend(['src/registry/registry.ts', 'package.json'])
        for slug in ['language-switcher', 'navbar', 'phone-input']:
            add(slug, [f'src/registry/components/{slug}.tsx'], {'projectPackage': strict_json(files['package.json'])}, 'src/registry/registry.ts')
    elif pid == 'tailark':
        for path in paths:
            match = re.fullmatch(r'registry/bases/(base|radix)/([^/]+)/_registry.ts', path)
            if not match:
                continue
            base, kit = match.groups()
            manifests.append(path)
            for block in tailark_blocks(files[path].decode()):
                slug = f'{base}-{kit}-{block["category"]}-{block["variant"]}'
                add(slug, [f'registry/bases/{base}/{block["path"]}'],
                    {'categories': [block['category']], 'base': base, 'kit': kit,
                     'variant': block['variant'], 'installationNote': 'Resolve the upstream registry helper name and dependencies before installation approval.'}, path)
    else:
        raise ValueError('No explicit inventory adapter for this provider')
    if not items:
        raise ValueError('Inventory produced no component candidates; source layout needs review')
    assert_unique(items)
    return items, excluded, sorted(set(manifests))
