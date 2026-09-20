"""Public prototype acceptance against real local catalogue data and built demos.
Auth is a signed-out test double. Registry responses, saves and previews are not mocked.
Never point this suite at production. Pace navigation to respect the unchanged API limit.
"""
import json
import os
import re
import time
from urllib.parse import quote
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUT = Path(os.environ.get('UIXO_DESIGN_RESULTS', 'test-results/redesign'))
OUT.mkdir(parents=True, exist_ok=True)
WEB = 'http://localhost:3000'
results = []
last_navigation = 0.0


def visit(page, route):
    global last_navigation
    # This suite deliberately reloads whole applications, unlike normal SPA browsing.
    # Each reload requests fresh public metadata. Do not bypass the server rate limiter.
    remaining = 4.0 - (time.monotonic() - last_navigation)
    if remaining > 0:
        page.wait_for_timeout(remaining * 1000)
    last_navigation = time.monotonic()
    page.goto(WEB + route, wait_until='domcontentloaded')
    expect(page.locator('.discovery-header')).to_be_visible()


def wait_for_card(page):
    expect(page.locator('.asset-library-card').first).to_be_visible(timeout=15000)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or None)
    try:
        for theme in ['dark', 'light']:
            for width in [1440, 390]:
                ctx = browser.new_context(viewport={'width': width, 'height': 1050 if width == 1440 else 844}, color_scheme=theme)
                ctx.route('**/api/auth/**', lambda r: r.fulfill(body='null', content_type='application/json'))
                ctx.add_init_script(f"if (window === window.top) localStorage.setItem('uixo-theme', JSON.stringify('{theme}'))")
                page = ctx.new_page()
                errors, failures = [], []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('response', lambda response: failures.append({'url': response.url, 'status': response.status}) if '/api/registry?' in response.url and response.status >= 400 else None)
                try:
                    for view, route in [('home', '/'), ('components', '/browse/assets'), ('resources', '/browse'), ('detail', '/browse/assets?id=shadcn%2Fbutton')]:
                        visit(page, route)
                        if view == 'home':
                            expect(page.locator('.hero-component')).to_have_count(4)
                            page.wait_for_function("[...document.querySelectorAll('.hero-component img')].every(img => img.complete && img.naturalWidth > 0)")
                            assert page.locator('[data-slot="sidebar"]').count() == 0
                        elif view == 'components':
                            wait_for_card(page)
                            expect(page.locator('.asset-live-viewport[data-preview-state="ready"]').first).to_be_visible(timeout=20000)
                        elif view == 'resources':
                            expect(page.locator('.website-grid article').first).to_be_visible()
                        else:
                            expect(page.get_by_role('dialog')).to_be_visible()
                            expect(page.get_by_role('dialog').locator('.asset-live-viewport')).to_have_attribute('data-preview-state', 'ready', timeout=20000)
                        expect(page.locator('html')).to_have_class(theme)
                        page.wait_for_timeout(300)
                        page.screenshot(path=str(OUT / f'{view}-{theme}-{width}.png'), full_page=False)
                        geometry = page.evaluate('''() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth})''')
                        assert geometry['scrollWidth'] <= width + 1, (view, width, geometry)
                        header = page.locator('.discovery-header').bounding_box()
                        assert header and abs(header['x']) < 1 and abs(header['width'] - width) < 1, header
                        if view == 'components':
                            first = page.locator('.asset-library-card').first.bounding_box()
                            assert first and first['y'] < (500 if width == 390 else 410), first
                            assert page.locator('.discovery-featured').count() == 0
                            if width == 1440:
                                cols = page.locator('.asset-library-grid').evaluate('el => getComputedStyle(el).gridTemplateColumns.split(" ").length')
                                assert cols == 4, cols
                                sidebar = page.locator('.discovery-sidebar').bounding_box()
                                assert sidebar and sidebar['y'] >= header['height'], sidebar
                        if view == 'detail':
                            box = page.get_by_role('dialog').bounding_box()
                            assert box and box['width'] >= width * .9, box
                        results.append({'view': view, 'theme': theme, 'width': width, 'headerWidth': header['width'], 'overflow': False})
                    visit(page, '/browse/assets')
                    wait_for_card(page)
                    with page.expect_response(lambda response: '/api/registry?' in response.url and 'action=search' in response.url and 'category=forms' in response.url) as filtered:
                        page.locator('.component-category-chips').get_by_role('button', name='Forms', exact=True).click()
                    assert filtered.value.status == 200
                    payload = filtered.value.json()
                    assert payload['items'] and payload['total'] > 0
                    selected = payload['items'][0]
                    expect(page).to_have_url(re.compile('category=forms'))
                    expect(page.locator('.asset-library-result-count')).to_contain_text(f"{payload['total']} assets found")
                    first_card = page.locator('.asset-library-card').first
                    expect(first_card.locator('.asset-library-card-link')).to_have_attribute('href', re.compile('id=' + re.escape(quote(selected['id'], safe=''))))
                    expect(page.locator('.component-category-chips').get_by_role('button', name='Forms', exact=True)).to_have_attribute('aria-pressed', 'true')
                    first_card.locator('.asset-library-save').click()
                    expect(first_card.locator('.asset-library-save')).to_have_attribute('aria-pressed', 'true')
                    visit(page, '/browse/assets?view=saved')
                    expect(page.locator('.asset-library-card')).to_have_count(1)
                    expect(page.locator('.asset-library-card-link')).to_have_attribute('href', re.compile('id=' + re.escape(quote(selected['id'], safe=''))))
                    if width == 390:
                        page.get_by_role('button', name='Open navigation', exact=True).click()
                        expect(page.locator('[data-mobile="true"]')).to_be_visible()
                        page.keyboard.press('Escape')
                        expect(page.locator('[data-mobile="true"]')).to_be_hidden()
                        expect(page.get_by_role('button', name='Open navigation', exact=True)).to_be_focused()
                        page.get_by_role('button', name='Open menu', exact=True).click()
                        menu = page.get_by_role('navigation', name='Mobile navigation')
                        menu.get_by_role('link', name='Components', exact=True).focus()
                        page.keyboard.press('Escape')
                        expect(menu).to_have_count(0)
                        expect(page.get_by_role('button', name='Open menu', exact=True)).to_be_focused()
                    visit(page, '/')
                    page.keyboard.press('Control+k')
                    search = page.get_by_role('searchbox', name='Search components', exact=True)
                    expect(search).to_be_focused()
                    search.fill('button')
                    page.locator('.hero-search').get_by_role('button').click()
                    expect(page).to_have_url(re.compile('/browse/assets\\?q=button'))
                    wait_for_card(page)
                    assert not errors, errors
                    assert not failures, failures
                    results.append({'theme': theme, 'width': width, 'searchFilterSaveReload': True, 'searchShortcut': True, 'savedAssetId': selected['id'], 'pageErrors': errors, 'apiFailures': failures})
                except Exception:
                    try:
                        page.screenshot(path=str(OUT / f'FAILED-{theme}-{width}.png'))
                        body = page.locator('body').inner_text()
                    except Exception as capture_error:
                        body = f'Failure capture unavailable: {capture_error}'
                    (OUT / 'failure.json').write_text(json.dumps({'url': page.url, 'errors': errors, 'apiFailures': failures, 'body': body}, indent=2))
                    raise
                finally:
                    (OUT / 'results.json').write_text(json.dumps(results, indent=2))
                    ctx.close()
    finally:
        browser.close()
print(json.dumps({'cases': len(results), 'passed': len(results)}))
