"""Synthetic-fixture tests. These are not production or live-preview acceptance."""
from __future__ import annotations
import io
import hashlib
import json
import tarfile
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from tools.provider_ingestion.core import (
    Provider, strict_json, relative_path, parse_registry, licence_evidence,
    category_for, assert_unique, candidate,
)
from tools.provider_ingestion.inventories import inventory, property_names, tailark_blocks
from tools.provider_ingestion.capture import capture, unpack_archive, immutable_batch, load_queue

MIT = b'Permission is hereby granted, free of charge. The above copyright notice and this permission notice shall be included.'
REF = 'a' * 40


def provider(pid='kibo-ui', licence='LICENSE'):
    return Provider(pid, 'Test fixture', 'https://example.test/', 'owner/project', 'main', REF, licence)


def make_tar(files, root=None, symlink=None):
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz') as output:
        for name, body in files.items():
            entry = tarfile.TarInfo(f'{root or "project-" + REF}/{name}')
            entry.size = len(body)
            output.addfile(entry, io.BytesIO(body))
        if symlink:
            entry = tarfile.TarInfo(f'project-{REF}/{symlink}')
            entry.type = tarfile.SYMTYPE
            entry.linkname = '/etc/passwd'
            output.addfile(entry)
    return buf.getvalue()


def registry_item(name='card', path='src/card.tsx', **extra):
    return {'name': name, 'type': 'registry:component', 'files': [{'path': path}], **extra}


class CoreTests(unittest.TestCase):
    def test_queue_exact_order_and_pins(self):
        queue = load_queue()
        self.assertEqual(len(queue), 15)
        self.assertEqual([p.id for p in queue[:5]], ['kibo-ui', 'dice-ui', 'uiable', 'flowbite-react', 'heroui-web'])
        self.assertEqual(queue[8].repository, 'AnmolSaini16/mapcn')
        self.assertEqual(queue[4].branch, 'v3')
        self.assertEqual(queue[9].website, 'https://elements.babelize.co/')

    def test_excluded_repository_cannot_be_relabelled(self):
        for repo in ['DavidHDev/react-bits', '21st-dev/registry']:
            with self.subTest(repo=repo), self.assertRaises(ValueError):
                Provider('innocent-label', 'Source', None, repo, 'main', REF, 'LICENSE')

    def test_retained_licence_blobs_match_native_github_evidence(self):
        root = Path(__file__).resolve().parents[2]
        records = list((root / 'data/registry/licences').rglob('*.evidence.json'))
        self.assertEqual(len(records), 2)
        for record in records:
            evidence = json.loads(record.read_text())
            data = (root / evidence['retainedPath']).read_bytes()
            actual = hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()
            self.assertEqual(actual, evidence['gitBlobSha'])
            self.assertEqual(hashlib.sha256(data).hexdigest(), evidence['sha256'])

    def test_real_badtz_licence_stays_blocked(self):
        root = Path(__file__).resolve().parents[2]
        text = next((root / 'data/registry/licences/badtz-ui').glob('*.txt')).read_bytes()
        result = licence_evidence(provider(), {'LICENSE': text})
        self.assertEqual(result['expression'], 'Restricted / review required')
        self.assertFalse(result['publicationApproved'])

    def test_pin_required(self):
        with self.assertRaises(ValueError):
            Provider('kibo-ui', 'Kibo', None, 'owner/project', 'main', 'main', 'LICENSE')

    def test_denied_providers(self):
        for pid in ['21st-dev', '21st.dev', 'react-bits', 'reactbits']:
            with self.subTest(pid=pid), self.assertRaises(ValueError):
                provider(pid)

    def test_unsafe_source_paths(self):
        for path in ['../escape.tsx', '/absolute.tsx', 'a//b.tsx', 'a/./b.tsx', 'a\\b.tsx', '%2e%2e/a', 'https://example.com/a']:
            with self.subTest(path=path), self.assertRaises(ValueError):
                relative_path(path)

    def test_duplicate_json_keys(self):
        with self.assertRaises(ValueError):
            strict_json(b'{"items": [], "items": []}')

    def test_invalid_json(self):
        with self.assertRaises(ValueError):
            strict_json(b'{broken')

    def test_registry_bounds(self):
        with self.assertRaises(ValueError):
            parse_registry(provider(), json.dumps({'items': []}).encode(), {}, 'registry.json')
        with self.assertRaises(ValueError):
            parse_registry(provider(), json.dumps({'items': [{}] * 2001}).encode(), {}, 'registry.json')

    def test_duplicate_ids_rejected(self):
        with self.assertRaises(ValueError):
            parse_registry(provider(), json.dumps({'items': [registry_item(), registry_item()]}).encode(), {'src/card.tsx': b'fixture'}, 'registry.json')

    def test_real_paths_and_provider_tags_retained(self):
        item = registry_item(dependencies=['motion', 'motion'], registryDependencies=['button'], categories=['card', 'radix'])
        items, excluded = parse_registry(provider(), json.dumps({'items': [item]}).encode(), {'src/card.tsx': b'fixture'}, 'registry.json')
        self.assertEqual(excluded, [])
        self.assertEqual(items[0]['dependencies'], ['motion'])
        self.assertEqual(items[0]['registryDependencies'], ['button'])
        self.assertEqual(items[0]['providerTags'], ['card', 'radix'])
        self.assertIn('/blob/' + REF + '/src/card.tsx', items[0]['sourceUrl'])
        self.assertEqual(items[0]['categorySuggestion'], 'layout')
        self.assertEqual(items[0]['status'], 'unpublished')
        self.assertIsNone(items[0]['preview'])

    def test_uiable_source_root(self):
        item = registry_item('accordion-basic', 'accordion/accordion-basic.tsx')
        path = 'src/components/uiable/accordion/accordion-basic.tsx'
        items, _ = parse_registry(provider('uiable'), json.dumps({'items': [item]}).encode(), {path: b'fixture'}, 'src/components/uiable/registry.json', 'src/components/uiable')
        self.assertEqual(items[0]['sourcePath'], path)
        self.assertEqual(items[0]['missingSourceFiles'], [])

    def test_missing_auxiliary_files_remain_blocked(self):
        item = registry_item()
        item['files'].append({'path': 'src/helper.ts'})
        items, _ = parse_registry(provider(), json.dumps({'items': [item]}).encode(), {'src/card.tsx': b'fixture'}, 'registry.json')
        self.assertEqual(items[0]['missingSourceFiles'], ['src/helper.ts'])
        self.assertTrue(any('absent' in b for b in items[0]['publicationBlockers']))

    def test_no_individual_icons_helpers_or_blocks(self):
        raw = [registry_item('icon', 'icon.svg'), registry_item('hook', 'hook.ts', type='registry:hook'),
               registry_item('paid-block', 'paid.tsx', type='registry:block')]
        items, excluded = parse_registry(provider(), json.dumps({'items': raw}).encode(), {}, 'registry.json')
        self.assertEqual(items, [])
        self.assertEqual(len(excluded), 3)

    def test_source_content_is_not_copied_into_metadata(self):
        item = registry_item()
        item['files'][0]['content'] = 'do not redistribute unreviewed code'
        items, _ = parse_registry(provider(), json.dumps({'items': [item]}).encode(), {'src/card.tsx': b'fixture'}, 'registry.json')
        self.assertNotIn('content', items[0]['upstreamMetadata']['files'][0])

    def test_malformed_dependency_array(self):
        item = registry_item(dependencies='not-an-array')
        with self.assertRaises(ValueError):
            parse_registry(provider(), json.dumps({'items': [item]}).encode(), {'src/card.tsx': b'fixture'}, 'registry.json')

    def test_mit_root_does_not_approve_publication(self):
        evidence = licence_evidence(provider(), {'LICENSE': MIT})
        self.assertEqual(evidence['expression'], 'MIT')
        self.assertFalse(evidence['publicationApproved'])

    def test_commons_clause_blocked(self):
        evidence = licence_evidence(provider(), {'LICENSE': MIT + b' Commons Clause'})
        self.assertEqual(evidence['rootTextRedistribution'], 'unknown')

    def test_badtz_significant_modification_condition_blocked(self):
        evidence = licence_evidence(provider(), {'LICENSE': MIT + b' Additional Restriction: must be significantly modified'})
        self.assertEqual(evidence['expression'], 'Restricted / review required')
        self.assertEqual(evidence['rootTextCommercialUse'], 'unknown')

    def test_unrelated_skill_licence_is_not_project_permission(self):
        evidence = licence_evidence(provider('microinteractions-ui', None), {'.agents/skills/example/LICENSE.txt': MIT})
        self.assertEqual(evidence['expression'], 'Unlicensed')

    def test_apache_heading_alone_not_enough(self):
        evidence = licence_evidence(provider(), {'LICENSE': b'Apache License\nVersion 2.0'})
        self.assertEqual(evidence['expression'], 'Unknown')

    def test_unknown_dependencies_are_not_empty_claims(self):
        record = candidate(provider(), 'card', ['card.tsx'], {'card.tsx': b'fixture'}, {}, 'package.json')
        self.assertIsNone(record['dependencies'])
        self.assertFalse(record['dependencyEvidenceComplete'])

    def test_taxonomy_suggestions_use_shared_categories(self):
        for slug, expected in [('date-picker', 'forms'), ('chart', 'data-display'), ('navbar', 'navigation'), ('map', 'data-display')]:
            self.assertEqual(category_for(slug, []), expected)

    def test_no_implicit_preview_or_publication(self):
        record = candidate(provider(), 'card', ['card.tsx'], {'card.tsx': b'fixture'}, {}, 'package.json')
        record['preview'] = {'kind': 'embed', 'url': 'https://arbitrary.example/'}
        with self.assertRaises(ValueError):
            assert_unique([record])


class InventoryTests(unittest.TestCase):
    def test_kibo_packages_and_style_exclusion(self):
        files = {'packages/card/package.json': b'{"dependencies":{"react":"^19","motion":"^12","@repo/shadcn-ui":"workspace:*"}}',
                 'packages/card/index.tsx': b'fixture', 'packages/typography/package.json': b'{}',
                 'packages/shadcn-ui/package.json': b'{}'}
        items, excluded, manifests = inventory(provider(), files)
        self.assertEqual(len(items), 1)
        self.assertEqual(len(excluded), 2)
        self.assertEqual(items[0]['dependencies'], ['motion'])
        self.assertIsNone(items[0]['registryDependencies'])
        self.assertIn('apps/docs/lib/package.ts', manifests)

    def test_typescript_comments_and_strings_do_not_inflate_names(self):
        source = '// name: "fake"\nconst text = "name: fake"; export const ui = [{name: "card"}, {name: "button"}];'
        self.assertEqual(property_names(source), ['card', 'button'])

    def test_typescript_dynamic_name_rejected_without_execution(self):
        with self.assertRaises(ValueError):
            property_names('const items = [{name: process.exit(1)}];')

    def test_typescript_duplicate_names_rejected(self):
        with self.assertRaises(ValueError):
            property_names('const items = [{name:"card"},{name:"card"}];')

    def test_tailark_static_blocks_nested_metadata(self):
        source = 'block({category:"hero", variant:"one", path:"dusk/blocks/hero/one.tsx", meta:{height:4}})'
        self.assertEqual(tailark_blocks(source), [{'category': 'hero', 'variant': 'one', 'path': 'dusk/blocks/hero/one.tsx'}])

    def test_tailark_dynamic_path_requires_review(self):
        with self.assertRaises(ValueError):
            tailark_blocks('block({category:"hero",variant:"one",path: buildPath()})')


class CaptureTests(unittest.TestCase):
    def test_archive_exact_root_and_source_only(self):
        result = unpack_archive(make_tar({'src/card.tsx': b'fixture', 'font.woff2': b'font', 'node_modules/x/a.ts': b'excluded'}), provider())
        self.assertEqual(result, {'src/card.tsx': b'fixture'})

    def test_archive_traversal_rejected(self):
        with self.assertRaises(ValueError):
            unpack_archive(make_tar({'../escape.tsx': b'bad'}), provider())

    def test_archive_wrong_pin_rejected(self):
        with self.assertRaises(ValueError):
            unpack_archive(make_tar({'src/card.tsx': b'fixture'}, root='project-main'), provider())

    def test_archive_symlink_not_followed(self):
        self.assertEqual(unpack_archive(make_tar({}, symlink='link.tsx'), provider()), {})

    def test_archive_budget_enforced(self):
        with patch('tools.provider_ingestion.capture.MAX_ARCHIVE_BYTES', 1), self.assertRaises(ValueError):
            unpack_archive(make_tar({'x.tsx': b'fixture'}), provider())

    def test_immutable_batch_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / 'proof.json'
            self.assertEqual(immutable_batch({target: b'proof'}), 1)
            self.assertEqual(immutable_batch({target: b'proof'}), 0)

    def test_collision_preflight_does_not_create_unrelated_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            old, new = Path(tmp) / 'old', Path(tmp) / 'new'
            old.write_bytes(b'original')
            with self.assertRaises(ValueError):
                immutable_batch({new: b'new', old: b'changed'})
            self.assertFalse(new.exists())
            self.assertEqual(old.read_bytes(), b'original')

    def test_evidence_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            target, link = Path(tmp) / 'target', Path(tmp) / 'link'
            target.mkdir()
            link.symlink_to(target, target_is_directory=True)
            with self.assertRaises(ValueError):
                immutable_batch({link / 'file': b'data'})

    def test_capture_idempotent_and_always_unpublished(self):
        source = {'LICENSE': MIT, 'packages/card/package.json': b'{"dependencies":{}}',
                  'packages/card/index.tsx': b'fixture', 'apps/docs/lib/package.ts': b'fixture'}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with patch('tools.provider_ingestion.capture.get', side_effect=[json.dumps({'sha': REF}).encode(), make_tar(source)]) as network:
                first = capture(provider(), root)
                second = capture(provider(), root)
            self.assertEqual(network.call_count, 2)
            self.assertEqual(first['published'], 0)
            self.assertEqual(second['status'], 'unchanged')
            self.assertEqual(len(list(root.rglob('staged.json'))), 1)
            snapshot = json.loads(next(root.rglob('staged.json')).read_text())
            self.assertEqual(snapshot['actualPublishedCount'], 0)
            self.assertFalse(snapshot['publicationApproved'])

    def test_wrong_github_commit_fails_before_capture(self):
        with tempfile.TemporaryDirectory() as tmp, patch('tools.provider_ingestion.capture.get', return_value=b'{"sha":"wrong"}') as network:
            with self.assertRaises(ValueError):
                capture(provider(), Path(tmp))
            self.assertEqual(network.call_count, 1)
            self.assertEqual(list(Path(tmp).rglob('*')), [])

    def test_modified_licence_evidence_is_not_silently_accepted(self):
        source = {'LICENSE': MIT, 'packages/card/package.json': b'{}', 'packages/card/index.tsx': b'fixture'}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with patch('tools.provider_ingestion.capture.get', side_effect=[json.dumps({'sha': REF}).encode(), make_tar(source)]):
                capture(provider(), root)
            next((root / 'data/registry/licences').rglob('*.txt')).write_bytes(b'changed')
            with self.assertRaises(ValueError):
                capture(provider(), root)

    def test_modified_publication_flag_is_rejected(self):
        source = {'LICENSE': MIT, 'packages/card/package.json': b'{}', 'packages/card/index.tsx': b'fixture'}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with patch('tools.provider_ingestion.capture.get', side_effect=[json.dumps({'sha': REF}).encode(), make_tar(source)]):
                capture(provider(), root)
            path = next(root.rglob('staged.json'))
            data = json.loads(path.read_text())
            data['publicationApproved'] = True
            path.write_text(json.dumps(data))
            with self.assertRaises(ValueError):
                capture(provider(), root)


if __name__ == '__main__':
    unittest.main()
