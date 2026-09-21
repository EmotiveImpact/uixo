"""Exercise unchanged upstream examples under UIXO's opaque preview sandbox.

Local runs emulate Vercel headers. Hosted runs use the real deployment headers.
No screenshot substitutes or mocked components are accepted.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

WEB = os.environ.get('UIXO_WEB_URL', 'http://127.0.0.1:3000').rstrip('/')
OUTPUT = Path(os.environ.get('UIXO_KIBO_BROWSER_OUTPUT', 'test-results/intelligence/kibo'))
OUTPUT.mkdir(parents=True, exist_ok=True)
SNAPSHOT = json.loads(Path('data/registry/snapshots/kibo-ui-3d63cdb15b79d972e3dc38a10997987672f9b263.json').read_text())
CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; frame-src 'none'; media-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'"
local = urlparse(WEB).hostname in ('127.0.0.1', 'localhost')
results = []
failures = []


def exercise(frame, page, slug):
    """Assert each real component's own content and state, not just a loaded iframe."""
    if slug == 'announcement':
        expect(frame.get_by_text('New feature added')).to_be_visible()
        return 'visible original announcement'
    if slug == 'banner':
        expect(frame.get_by_text('Important message')).to_be_visible()
        frame.get_by_role('button').last.click()
        expect(frame.get_by_text('Important message')).not_to_be_visible()
        page.locator('iframe').evaluate('(f) => f.src = f.src')
        expect(frame.get_by_text('Important message')).to_be_visible()
        return 'dismiss and restore banner'
    if slug == 'combobox':
        frame.get_by_role('button', name='Select framework...', exact=True).click()
        frame.get_by_role('option', name='Vite', exact=True).click()
        expect(frame.get_by_role('button', name='Vite', exact=True)).to_be_visible()
        return 'open and select Vite'
    if slug == 'dialog-stack':
        frame.get_by_role('button', name='Show me', exact=True).click()
        expect(frame.get_by_text("I'm the first dialog")).to_be_visible()
        frame.get_by_role('button', name='Next', exact=True).first.click()
        expect(frame.get_by_text("I'm the second dialog")).to_be_visible()
        return 'open and advance original dialog stack'
    if slug == 'rating':
        rating = frame.get_by_role('radiogroup', name='Rating')
        expect(rating.locator('button')).to_have_count(5)
        expect(rating.locator('svg')).to_have_count(5)
        rating.locator('button').last.click()
        expect(rating.locator('button').last).to_have_attribute('tabindex', '0')
        return 'select and retain fifth star'
    if slug == 'relative-time':
        for label in ('EST', 'GMT', 'JST'):
            expect(frame.get_by_text(label, exact=True)).to_be_visible()
        return 'original time-zone display'
    if slug == 'status':
        for label in ('Online', 'Offline', 'Maintenance', 'Degraded'):
            expect(frame.locator(f'text="{label}" >> visible=true')).to_be_visible()
        return 'four original status indicators'
    if slug == 'tags':
        frame.get_by_role('combobox').click()
        frame.get_by_role('option', name='React', exact=True).click()
        expect(frame.locator('button[role=combobox]')).to_contain_text('React')
        return 'select React tag'
    if slug == 'theme-switcher':
        frame.get_by_role('button', name='Dark theme').click()
        expect(frame.get_by_role('button', name='Dark theme').locator('div')).to_have_count(1)
        return 'change component selection to dark'
    if slug == 'tree':
        expect(frame.get_by_text('button.tsx', exact=True)).to_be_visible()
        frame.get_by_text('src', exact=True).click()
        expect(frame.get_by_text('button.tsx', exact=True)).not_to_be_visible()
        return 'collapse src branch'
    raise AssertionError('No reviewed interaction for ' + slug)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or None)
    context = browser.new_context()
    if local:
        def deployment_headers(route):
            response = route.fetch()
            route.fulfill(response=response, headers={**response.headers, 'access-control-allow-origin': '*', 'content-security-policy': CSP})
        context.route('**/provider-demos/**', deployment_headers)
    page = context.new_page()
    page.set_default_timeout(15000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        for item in SNAPSHOT['items']:
            slug = item['slug']
            for width in (960, 360):
                for theme in ('light', 'dark'):
                    errors.clear()
                    case = {'slug': slug, 'width': width, 'theme': theme, 'passed': False}
                    try:
                        page.set_viewport_size({'width': width, 'height': 640})
                        page.set_content('<!doctype html><html><body></body></html>')
                        page.evaluate('''({url}) => {
                          const f = document.createElement('iframe');
                          f.sandbox = 'allow-scripts'; f.referrerPolicy = 'no-referrer';
                          f.title = 'reviewed'; f.src = url;
                          f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0';
                          document.body.append(f);
                        }''', {'url': WEB + item['previewPath'] + '&theme=' + theme})
                        frame = page.frame_locator('iframe[title="reviewed"]')
                        expect(frame.locator('html')).to_have_attribute('data-preview-ready', 'true', timeout=20000)
                        expect(frame.locator('html')).to_have_attribute('data-theme', theme)
                        expect(frame.locator('html')).to_have_attribute('data-source-ref', SNAPSHOT['ref'])
                        expect(frame.locator('[role="alert"]')).to_have_count(0)
                        # Text emptiness misclassifies SVG-only components such as Rating.
                        expect(frame.locator('.demo-stage > *').first).to_be_visible()
                        case['interaction'] = exercise(frame, page, slug)
                        assert not errors, errors
                        other = 'dark' if theme == 'light' else 'light'
                        page.locator('iframe').evaluate('(f, theme) => f.contentWindow.postMessage({type:"uixo-preview-theme",theme}, "*")', other)
                        expect(frame.locator('html')).to_have_attribute('data-theme', other)
                        page.locator('iframe').evaluate('(f, theme) => f.contentWindow.postMessage({type:"uixo-preview-theme",theme}, "*")', theme)
                        expect(frame.locator('html')).to_have_attribute('data-theme', theme)
                        page.screenshot(path=str(OUTPUT / f'{slug}-{width}-{theme}.png'))
                        assert not errors, errors
                        case['passed'] = True
                    except Exception as error:
                        case['error'] = str(error)
                        case['pageErrors'] = list(errors)
                        failures.append(case)
                        page.screenshot(path=str(OUTPUT / f'FAILED-{slug}-{width}-{theme}.png'))
                    results.append(case)
    finally:
        (OUTPUT / 'results.json').write_text(json.dumps({'baseUrl': WEB, 'sourceRef': SNAPSHOT['ref'], 'localDeploymentHeadersEmulated': local, 'productionDatabaseWrite': False, 'checks': results, 'failures': failures}, indent=2))
        browser.close()
assert len(results) == 40 and not failures, json.dumps(failures, indent=2)
print(json.dumps({'passed': len(results), 'sourceRef': SNAPSHOT['ref'], 'baseUrl': WEB, 'localDeploymentHeadersEmulated': local}))
