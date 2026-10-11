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


def record_page_error(errors, error):
    """Keep application failures while excluding expected opaque preview errors.

    Remote provider demos deliberately run with only ``allow-scripts`` so they
    cannot read UIXO storage or share the application's origin. Some upstream
    demos probe localStorage or Vercel's challenge worker during boot; Chromium
    reports those blocked probes through the parent page's ``pageerror`` event.
    """
    message = str(error)
    expected_preview_errors = (
        "document is sandboxed and lacks the 'allow-same-origin' flag",
        "Failed to construct 'Worker': Script at ",
    )
    if not any(expected in message for expected in expected_preview_errors):
        errors.append(message)


def visit(page, route):
    global last_navigation
    # This suite deliberately reloads whole applications, unlike normal SPA browsing.
    # Each reload requests fresh public metadata. Do not bypass the server rate limiter.
    remaining = 7.0 - (time.monotonic() - last_navigation)
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
                page.on('pageerror', lambda error: record_page_error(errors, error))
                page.on('response', lambda response: failures.append({'url': response.url, 'status': response.status}) if '/api/registry?' in response.url and response.status >= 400 else None)
                try:
                    for view, route in [('home', '/'), ('components', '/browse/assets'), ('resources', '/browse'), ('detail', '/browse/assets?id=shadcn%2Fbutton')]:
                        visit(page, route)
                        if view == 'home':
                            live = page.locator('.component-tile .asset-live-viewport').first
                            expect(live).to_be_attached(timeout=15000)
                            live.scroll_into_view_if_needed()
                            expect(page.locator('.component-tile .asset-live-viewport[data-preview-state="ready"]').first).to_be_visible(timeout=20000)
                            page.evaluate('window.scrollTo(0, 0)')
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
                        wordmark = page.locator('.discovery-wordmark').evaluate('el => ({weight: getComputedStyle(el).fontWeight, spacing: getComputedStyle(el).letterSpacing, size: getComputedStyle(el).fontSize, font: getComputedStyle(el).fontFamily})')
                        # The spaced wordmark tracks at 0.3em at every size.
                        assert wordmark['weight'] == '600' and abs(float(wordmark['spacing'][:-2]) - 0.3 * float(wordmark['size'][:-2])) < 0.05, wordmark
                        assert 'Figtree' in wordmark['font'], wordmark
                        if view == 'components':
                            card_style = page.locator('.asset-library-card').first.evaluate('el => ({border: getComputedStyle(el).borderTopWidth, radius: getComputedStyle(el).borderRadius, padding: getComputedStyle(el.querySelector(".g-meta")).padding})')
                            assert card_style == {'border': '0px', 'radius': '18px', 'padding': '14px 8px 6px'}, card_style
                            first = page.locator('.asset-library-card').first.bounding_box()
                            assert first and first['y'] < (520 if width == 390 else 460), first
                            assert page.locator('.discovery-featured').count() == 0
                            if width == 1440:
                                cols = page.locator('.asset-library-grid').evaluate('el => getComputedStyle(el).gridTemplateColumns.split(" ").length')
                                assert cols == 3, cols
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
                    expect(page.locator('.asset-library-result-count')).to_contain_text(f"{payload['total']:,} result")
                    expect(page.locator('.active-filter', has_text='Forms')).to_be_visible()
                    first_card = page.locator('.asset-library-card').first
                    expect(first_card.locator('.asset-library-card-link')).to_have_attribute('href', re.compile('id=' + re.escape(quote(selected['id'], safe=''))))
                    expect(page.locator('.component-category-chips').get_by_role('button', name='Forms', exact=True)).to_have_attribute('aria-pressed', 'true')
                    save = first_card.get_by_role('button', name=f"Save {selected['name']}", exact=True)
                    save.click()
                    expect(first_card.get_by_role('button', name=f"Unsave {selected['name']}", exact=True)).to_have_attribute('aria-pressed', 'true')
                    visit(page, '/browse/assets?view=saved')
                    expect(page.locator('.asset-library-card')).to_have_count(1)
                    expect(page.locator('.asset-library-card-link')).to_have_attribute('href', re.compile('id=' + re.escape(quote(selected['id'], safe=''))))
                    if width == 390:
                        page.get_by_role('button', name='Open navigation', exact=True).click()
                        expect(page.locator('[data-mobile="true"]')).to_be_visible()
                        page.keyboard.press('Escape')
                        expect(page.locator('[data-mobile="true"]')).to_be_hidden()
                        expect(page.get_by_role('button', name='Open navigation', exact=True)).to_be_focused()
                    visit(page, '/')
                    if width == 390:
                        # The homepage has no sidebar; on a phone its header menu holds the site links.
                        page.locator('.discovery-header').get_by_role('button', name='Open menu', exact=True).click()
                        expect(page.locator('#discovery-mobile-navigation').get_by_role('link', name='Collections', exact=True)).to_be_visible()
                        page.locator('.discovery-header').get_by_role('button', name='Close menu', exact=True).click()
                    else:
                        expect(page.locator('.discovery-header').get_by_role('link', name='Collections', exact=True)).to_be_visible()
                    page.keyboard.press('Control+k')
                    search = page.get_by_role('searchbox', name='Search components', exact=True)
                    expect(search).to_be_focused()
                    search.fill('button')
                    page.locator('.hm-search').get_by_role('button', name='Search', exact=True).click()
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
