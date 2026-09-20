"""Actual public UI screenshots and structural acceptance against the approved prototype.
Runs against the local test registry only; no production credentials or database writes.
"""
import json
import os
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
                if view in ['components', 'detail']:
                    expect(page.locator('.asset-library-card').first).to_be_visible()
                    expect(page.locator('.asset-live-viewport[data-preview-state="ready"]').first).to_be_visible(timeout=20000)
                expect(page.locator('html')).to_have_class(theme)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (view, width, 'page overflow')
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
                page.screenshot(path=str(OUT / f'{view}-{theme}-{width}.png'), full_page=False)
                results.append({'view': view, 'theme': theme, 'width': width, 'headerWidth': header['width'], 'overflow': False})
            # Desktop and mobile use the same route/filter/save state, not a disconnected demo.
            page.goto(WEB + '/browse/assets', wait_until='domcontentloaded')
            expect(page.locator('.asset-library-card').first).to_be_visible()
            page.locator('.component-category-chips').get_by_role('button', name='Forms', exact=True).click()
            expect(page).to_have_url(__import__('re').compile('category=forms'))
            expect(page.locator('.asset-library-card').first).to_be_visible()
            expect(page.locator('.component-category-chips').get_by_role('button', name='Forms', exact=True)).to_have_attribute('aria-pressed', 'true')
            page.locator('.asset-library-save').first.click()
            expect(page.locator('.asset-library-save').first).to_have_attribute('aria-pressed', 'true')
            page.goto(WEB + '/browse/assets?view=saved', wait_until='domcontentloaded')
            expect(page.locator('.asset-library-card')).to_have_count(1)
            if width == 390:
                page.get_by_role('button', name='Open navigation', exact=True).click()
                expect(page.locator('[data-mobile="true"]')).to_be_visible()
                page.keyboard.press('Escape')
                expect(page.locator('[data-mobile="true"]')).to_be_hidden()
            page.goto(WEB + '/', wait_until='domcontentloaded')
            page.get_by_role('searchbox', name='Search components', exact=True).fill('button')
            page.locator('.hero-search').get_by_role('button').click()
            expect(page).to_have_url(__import__('re').compile('/browse/assets\\?q=button'))
            assert not errors, errors
            results.append({'theme': theme, 'width': width, 'searchFilterSaveReload': True, 'pageErrors': errors})
            ctx.close()
    browser.close()
(OUT / 'results.json').write_text(json.dumps(results, indent=2))
print(json.dumps({'cases':len(results),'passed':len(results)}))
