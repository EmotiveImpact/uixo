"""Read-only acceptance of Kibo inside the actual deployed UIXO catalogue.

No network mocks, local header emulation, seeding, indexing, saving or publication.
The UI's resolve POST returns guidance only and never executes installation.
"""
import hashlib
import json
import os
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

WEB = 'https://uixo-git-astra-provider-dd32cd-emotiveimpact-gmailcoms-projects.vercel.app'
EXPECTED_BUILD = os.environ.get('UIXO_EXPECTED_BUILD', '')
if not re.fullmatch(r'[a-f0-9]{40}', EXPECTED_BUILD):
    raise ValueError('Set UIXO_EXPECTED_BUILD to the exact PR head SHA.')
OUTPUT = Path('test-results/intelligence/kibo-hosted')
OUTPUT.mkdir(parents=True, exist_ok=True)
SNAPSHOT = json.loads(Path('data/registry/snapshots/kibo-ui-3d63cdb15b79d972e3dc38a10997987672f9b263.json').read_text())
results = []
errors = []
mutations = []
status = None
page = None

with sync_playwright() as p:
    browser = p.chromium.launch()
    request = p.request.new_context(timeout=20000)
    try:
        # Wait only for this commit, never accept the previous deployment's green result.
        for attempt in range(60):
            response = request.get(WEB + '/api/registry?action=status')
            if response.status in (401, 403):
                raise AssertionError('Hosted preview requires authentication; no acceptance claimed.')
            if response.ok and 'application/json' in response.headers.get('content-type', ''):
                status = response.json()
                if status.get('build') == EXPECTED_BUILD[:12]:
                    break
            time.sleep(5)
        assert status and status.get('build') == EXPECTED_BUILD[:12], status
        assert status['readOnly'] is True and status['storage'] == 'snapshot', status
        assert status['stats'] == {'assets': 474, 'providers': 8}, status
        response = request.get(WEB + '/api/registry?action=search&provider=kibo-ui&limit=48')
        assert response.ok, response.status
        catalogue = response.json()
        assert catalogue['total'] == 10 and len(catalogue['items']) == 10, catalogue
        by_slug = {item['slug']: item for item in catalogue['items']}
        assert set(by_slug) == {item['slug'] for item in SNAPSHOT['items']}
        for item in SNAPSHOT['items']:
            demo = request.get(WEB + item['previewPath'])
            assert demo.ok and demo.headers.get('access-control-allow-origin') == '*'
            csp = demo.headers.get('content-security-policy', '')
            for rule in ("default-src 'none'", "connect-src 'none'", "frame-src 'none'", "form-action 'none'", "base-uri 'none'"):
                assert rule in csp, csp
            asset = by_slug[item['slug']]
            assert asset['sourceUrl'] == f"https://github.com/shadcnblocks/kibo/blob/{SNAPSHOT['ref']}/{item['sourcePath']}"
            assert all(v['sourceRef'] == SNAPSHOT['ref'] for v in asset['variants'])
            assert asset['preview']['kind'] == 'embed'
            assert asset['variants'][0]['acquisition']['url'] == item['registryUrl']
            assert asset['licence']['expression'] == 'MIT'
            assert asset['licence']['commercial'] == asset['licence']['redistribution'] == 'allowed'
            evidence = Path('data/registry/licences/kibo-ui.txt').read_bytes()
            assert hashlib.sha256(evidence).hexdigest() == SNAPSHOT['licence']['sha256']
            assert asset['licence']['text'].strip() == evidence.decode().strip()
        for width in (1440, 390):
            for theme in ('light', 'dark'):
                context = browser.new_context(viewport={'width': width, 'height': 950}, color_scheme=theme)
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('request', lambda r: mutations.append({'method': r.method, 'url': r.url})
                        if r.method not in ('GET', 'HEAD', 'OPTIONS') and '/api/' in r.url and 'action=resolve' not in r.url else None)
                page.goto(WEB + '/browse/assets?provider=kibo-ui', wait_until='domcontentloaded')
                expect(page.locator('html')).to_have_class(re.compile(r'\b' + theme + r'\b'))
                expect(page.locator('.asset-library-card')).to_have_count(10, timeout=20000)
                for item in SNAPSHOT['items']:
                    slug = item['slug']
                    card = page.locator('.asset-library-card').filter(has=page.get_by_role('link', name=f"Inspect {item['name']} from Kibo UI", exact=True))
                    card.scroll_into_view_if_needed()
                    iframe = card.locator('iframe')
                    expect(iframe).to_have_count(1)
                    expect(iframe).to_have_attribute('sandbox', 'allow-scripts')
                    expect(iframe).to_have_css('visibility', 'visible', timeout=20000)
                    expect(card.locator('.asset-library-preview > img')).to_have_count(0)
                    frame = card.frame_locator('iframe')
                    expect(frame.locator('html')).to_have_attribute('data-preview-ready', 'true')
                    expect(frame.locator('html')).to_have_attribute('data-source-ref', SNAPSHOT['ref'])
                    expect(frame.locator('html')).to_have_attribute('data-theme', theme)
                    expect(frame.locator('.demo-stage > *').first).to_be_visible()
                    card.get_by_role('link', name=f"Inspect {item['name']} from Kibo UI", exact=True).click()
                    dialog = page.get_by_role('dialog', name=item['name'], exact=True)
                    expect(dialog).to_be_visible()
                    detail_frame = dialog.frame_locator('iframe')
                    expect(dialog.locator('iframe')).to_have_css('visibility', 'visible', timeout=20000)
                    expect(detail_frame.locator('html')).to_have_attribute('data-source-ref', SNAPSHOT['ref'])
                    expect(detail_frame.locator('html')).to_have_attribute('data-theme', theme)
                    expect(dialog.locator(f'code[title="{SNAPSHOT["ref"]}"]')).to_have_count(1)
                    expect(dialog.locator('.asset-command pre')).to_contain_text(item['registryUrl'], timeout=10000)
                    expect(dialog.locator('[role=alert]')).to_have_count(0)
                    bounds = dialog.locator('iframe').bounding_box()
                    assert bounds and bounds['width'] > 100 and bounds['height'] > 100, bounds
                    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
                    page.screenshot(path=str(OUTPUT / f'{slug}-{width}-{theme}.png'))
                    results.append({'slug': slug, 'width': width, 'theme': theme, 'card': 'real component', 'detail': 'real component', 'sourceRef': SNAPSHOT['ref'], 'installGuidance': 'upstream URL', 'passed': True})
                    dialog.get_by_role('button', name='Close asset details').click()
                other = 'dark' if theme == 'light' else 'light'
                page.get_by_role('button', name=f'Switch to {other} theme', exact=True).click()
                expect(page.locator('html')).to_have_class(re.compile(r'\b' + other + r'\b'))
                first = page.locator('.asset-library-card').first
                first.scroll_into_view_if_needed()
                expect(first.frame_locator('iframe').locator('html')).to_have_attribute('data-theme', other)
                context.close()
        assert len(results) == 40 and not errors and not mutations, {'checks': len(results), 'errors': errors, 'mutations': mutations}
    except Exception as error:
        failure = {'error': str(error)}
        if page and not page.is_closed():
            page.screenshot(path=str(OUTPUT / 'failure.png'))
            failure['url'] = page.url
            failure['body'] = page.locator('body').inner_text(timeout=2000)[:10000]
        (OUTPUT / 'failure.json').write_text(json.dumps(failure, indent=2))
        raise
    finally:
        (OUTPUT / 'results.json').write_text(json.dumps({'baseUrl': WEB, 'expectedBuild': EXPECTED_BUILD, 'status': status, 'sourceRef': SNAPSHOT['ref'], 'productionDatabaseWrite': False, 'localDeploymentHeadersEmulated': False, 'checks': results, 'errors': errors, 'unexpectedMutationRequests': mutations}, indent=2))
        request.dispose()
        browser.close()
print(json.dumps({'hostedChecksPassed': len(results), 'build': EXPECTED_BUILD, 'sourceRef': SNAPSHOT['ref']}))
