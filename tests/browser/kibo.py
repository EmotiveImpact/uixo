"""Real built upstream examples, with the same sandbox/CSP intended for Vercel.

Local runs emulate the deployment headers; this is not evidence of a production
Neon sync. Set UIXO_WEB_URL to an accessible deployed preview for a hosted run.
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
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or None)
    context = browser.new_context()
    if local:
        def deployment_headers(route):
            response = route.fetch()
            route.fulfill(response=response, headers={**response.headers, 'access-control-allow-origin': '*', 'content-security-policy': CSP})
        context.route('**/provider-demos/**', deployment_headers)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        for item in SNAPSHOT['items']:
            slug = item['slug']
            for width in (960, 360):
                for theme in ('light', 'dark'):
                    errors.clear()
                    page.set_viewport_size({'width': width, 'height': 640})
                    # Neutral fixture parent: the iframe loads the actual built source with
                    # the same opaque sandbox as UIXO. It is not a mocked component.
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
                    expect(frame.locator('.demo-stage')).not_to_be_empty()
                    check = 'visible original example'
                    if slug == 'announcement':
                        expect(frame.get_by_text('New feature added')).to_be_visible()
                    elif slug == 'banner':
                        expect(frame.get_by_text('Important message')).to_be_visible()
                        frame.get_by_role('button').last.click()
                        expect(frame.get_by_text('Important message')).not_to_be_visible()
                        check = 'dismiss banner'
                        # Restore the real initial state for the retained screenshot.
                        page.locator('iframe').evaluate('(f) => f.src = f.src')
                        expect(frame.get_by_text('Important message')).to_be_visible()
                    elif slug == 'combobox':
                        frame.get_by_role('button', name='Select framework...', exact=True).click()
                        frame.get_by_role('option', name='Vite', exact=True).click()
                        expect(frame.get_by_role('button', name='Vite', exact=True)).to_be_visible()
                        check = 'open and select Vite'
                    elif slug == 'dialog-stack':
                        frame.get_by_role('button', name='Show me', exact=True).click()
                        expect(frame.get_by_text("I'm the first dialog")).to_be_visible()
                        frame.get_by_role('button', name='Next', exact=True).first.click()
                        expect(frame.get_by_text("I'm the second dialog")).to_be_visible()
                        check = 'open and advance the original dialog stack'
                    elif slug == 'rating':
                        rating = frame.get_by_role('radiogroup', name='Rating')
                        expect(rating.locator('button')).to_have_count(5)
                        rating.locator('button').last.click()
                        expect(rating.locator('button').last).to_have_attribute('tabindex', '0')
                        check = 'select and retain fifth star'
                    elif slug == 'relative-time':
                        for label in ('EST', 'GMT', 'JST'):
                            expect(frame.get_by_text(label, exact=True)).to_be_visible()
                    elif slug == 'status':
                        for label in ('Online', 'Offline', 'Maintenance', 'Degraded'):
                            expect(frame.locator(f'text="{label}" >> visible=true')).to_be_visible()
                    elif slug == 'tags':
                        frame.get_by_role('combobox').click()
                        frame.get_by_role('option', name='React', exact=True).click()
                        expect(frame.locator('button[role=combobox]')).to_contain_text('React')
                        check = 'select React tag'
                    elif slug == 'theme-switcher':
                        frame.get_by_role('button', name='Dark theme').click()
                        expect(frame.get_by_role('button', name='Dark theme').locator('div')).to_have_count(1)
                        check = 'change component selection to dark'
                    elif slug == 'tree':
                        expect(frame.get_by_text('button.tsx', exact=True)).to_be_visible()
                        frame.get_by_text('src', exact=True).click()
                        expect(frame.get_by_text('button.tsx', exact=True)).not_to_be_visible()
                        check = 'collapse src branch'
                    assert not errors, errors
                    # Theme messages must originate from the parent; component state stays real.
                    other = 'dark' if theme == 'light' else 'light'
                    page.locator('iframe').evaluate('(f, theme) => f.contentWindow.postMessage({type:"uixo-preview-theme",theme}, "*")', other)
                    expect(frame.locator('html')).to_have_attribute('data-theme', other)
                    page.locator('iframe').evaluate('(f, theme) => f.contentWindow.postMessage({type:"uixo-preview-theme",theme}, "*")', theme)
                    expect(frame.locator('html')).to_have_attribute('data-theme', theme)
                    page.screenshot(path=str(OUTPUT / f'{slug}-{width}-{theme}.png'))
                    results.append({'slug': slug, 'width': width, 'theme': theme, 'interaction': check, 'passed': True})
    except Exception as error:
        page.screenshot(path=str(OUTPUT / 'failure.png'))
        (OUTPUT / 'failure.json').write_text(json.dumps({'error': str(error), 'slug': slug, 'width': width, 'theme': theme, 'frameUrls': [f.url for f in page.frames], 'frameText': [f.locator('body').inner_text(timeout=2000)[:5000] for f in page.frames]}, indent=2))
        raise
    finally:
        (OUTPUT / 'results.json').write_text(json.dumps({'baseUrl': WEB, 'sourceRef': SNAPSHOT['ref'], 'localDeploymentHeadersEmulated': local, 'productionDatabaseWrite': False, 'checks': results, 'errors': errors}, indent=2))
        browser.close()
assert len(results) == 40
print(json.dumps({'passed': len(results), 'sourceRef': SNAPSHOT['ref'], 'baseUrl': WEB, 'localDeploymentHeadersEmulated': local}))
