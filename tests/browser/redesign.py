"""Actual public UI screenshots and structural acceptance against the approved prototype.
Runs against the local test registry only; no production credentials or database writes.
"""
import json
import os
import re
from urllib.parse import quote
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUT = Path(os.environ.get('UIXO_DESIGN_RESULTS', 'test-results/redesign'))
OUT.mkdir(parents=True, exist_ok=True)
WEB = 'http://localhost:3000'
results = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    for theme in ['dark', 'light']:
        for width in [1440, 390]:
            ctx = browser.new_context(viewport={'width': width, 'height': 1050 if width == 1440 else 844}, color_scheme=theme)
            ctx.route('**/api/auth/**', lambda r: r.fulfill(body='null', content_type='application/json'))
            ctx.add_init_script(f"localStorage.setItem('uixo-theme', JSON.stringify('{theme}'))")
            page = ctx.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            for view, route in [('home', '/'), ('components', '/browse/assets'), ('resources', '/browse'), ('detail', '/browse/assets?id=shadcn%2Fbutton')]:
                page.goto(WEB + route, wait_until='domcontentloaded')
                page.wait_for_timeout(2500)
                page.screenshot(path=str(OUT / f'{view}-{theme}-{width}.png'), full_page=False)
                if view in ['components', 'detail']:
                    expect(page.locator('.asset-library-card').first).to_be_visible()
                    expect(page.locator('.asset-live-viewport[data-preview-state="ready"]').first).to_be_visible(timeout=20000)
                expect(page.locator('html')).to_have_class(theme)
                geometry = page.evaluate('''() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth, overflowing: [...document.querySelectorAll('body *')].map(el => ({tag:el.tagName, cls:typeof el.className === 'string' ? el.className : '', rect:el.getBoundingClientRect().toJSON()})).filter(x => x.rect.right > innerWidth + 1 || x.rect.left < -1).slice(0,30)})''')
                (OUT / f'{view}-{theme}-{width}-geometry.json').write_text(json.dumps(geometry, indent=2))
                assert geometry['scrollWidth'] <= width + 1, (view, width, geometry)
                header = page.locator('.discovery-header').bounding_box()
                assert header and abs(header['x']) < 1 and abs(header['width'] - width) < 1, header
                if view == 'home':
                    expect(page.locator('.hero-component')).to_have_count(4)
                    assert page.locator('.hero-component img').evaluate_all('(images) => images.every(img => img.complete && img.naturalWidth > 0)')
                    assert page.locator('[data-slot="sidebar"]').count() == 0
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
                    expect(page.get_by_role('dialog')).to_be_visible()
                    box = page.get_by_role('dialog').bounding_box()
                    assert box and box['width'] >= width * .9, box
                results.append({'view': view, 'theme': theme, 'width': width, 'headerWidth': header['width'], 'overflow': False})
            page.goto(WEB + '/browse/assets', wait_until='domcontentloaded')
            expect(page.locator('.asset-library-card').first).to_be_visible()
            # Filtering is asynchronous. Save the returned asset, not the outgoing grid's first card.
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
            page.goto(WEB + '/browse/assets?view=saved', wait_until='domcontentloaded')
            expect(page.locator('.asset-library-card')).to_have_count(1)
            expect(page.locator('.asset-library-card-link')).to_have_attribute('href', re.compile('id=' + re.escape(quote(selected['id'], safe=''))))
            if width == 390:
                page.get_by_role('button', name='Open navigation', exact=True).click()
                expect(page.locator('[data-mobile="true"]')).to_be_visible()
                page.keyboard.press('Escape')
                expect(page.locator('[data-mobile="true"]')).to_be_hidden()
                expect(page.get_by_role('button', name='Open navigation', exact=True)).to_be_focused()
            page.goto(WEB + '/', wait_until='domcontentloaded')
            page.get_by_role('searchbox', name='Search components', exact=True).fill('button')
            page.locator('.hero-search').get_by_role('button').click()
            expect(page).to_have_url(re.compile('/browse/assets\\?q=button'))
            assert not errors, errors
            results.append({'theme': theme, 'width': width, 'searchFilterSaveReload': True, 'savedAssetId': selected['id'], 'pageErrors': errors})
            ctx.close()
    browser.close()
(OUT / 'results.json').write_text(json.dumps(results, indent=2))
print(json.dumps({'cases':len(results),'passed':len(results)}))
