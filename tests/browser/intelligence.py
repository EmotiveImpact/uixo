"""Isolated acceptance: real local registry, simulated frontend account identity.
Never target production. The API issues the legitimate loopback curator cookie.
Pace page changes so this multi-page suite respects the unchanged API rate limit.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUTPUT = Path(os.environ.get('UIXO_BROWSER_RESULTS', 'test-results/intelligence'))
OUTPUT.mkdir(parents=True, exist_ok=True)
WEB = 'http://localhost:3000'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1440, 'height': 1100}, device_scale_factor=1)

    def fake_auth(route):
        if 'get-session' in route.request.url:
            route.fulfill(json={'user': {'id': 'browser-test-curator', 'name': 'Local Curator', 'email': 'curator@example.test', 'role': 'curator'}, 'session': {}})
        else:
            route.fulfill(json={'token': None})

    ctx.route('**/api/auth/**', fake_auth)
    ctx.route('**/api/lists', lambda r: r.fulfill(json={'lists': [], 'revision': 0}))
    ctx.route('**/api/saved-assets', lambda r: r.fulfill(json={'assetIds': [], 'revision': 0}))
    page = ctx.new_page()
    errors, api_failures, results = [], [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: api_failures.append({'url': response.url, 'status': response.status}) if '/api/registry' in response.url and response.status >= 400 else None)

    def api(action, body=None):
        url = WEB + '/api/registry?action=' + action
        response = ctx.request.post(url, data=body) if body is not None else ctx.request.get(url)
        data = response.json()
        if response.status != 200:
            raise RuntimeError((action, response.status, data))
        return data

    def heading(name):
        page.get_by_role('heading', name=name, exact=True).wait_for(timeout=15000)

    def verify_visible_cover():
        cover = page.locator('.dv2-collection-visual').first
        cover.scroll_into_view_if_needed()
        dimensions = cover.evaluate("""el => [el, ...el.querySelectorAll('.asset-library-preview,.asset-live-viewport,iframe')].map(node => {const box=node.getBoundingClientRect(); const style=getComputedStyle(node); return {tag:node.tagName,classes:node.className,width:box.width,height:box.height,display:style.display,position:style.position};})""")
        print(json.dumps({'embeddedPreviewGeometry': dimensions}), flush=True)
        viewport = cover.locator('.asset-live-viewport')
        box = viewport.bounding_box()
        assert box and box['width'] > 100 and box['height'] > 100, dimensions
        expect(cover.locator('iframe')).to_have_count(1)
        expect(cover.frame_locator('iframe').locator('html')).to_have_attribute('data-preview-ready', 'true', timeout=15000)
        results.append({'embeddedCollectionPreviewReady': True, 'width': box['width'], 'height': box['height']})
        page.evaluate('window.scrollTo(0,0)')

    try:
        page.goto(WEB + '/registry/index.html', wait_until='domcontentloaded')
        assert api('status')['role'] == 'curator'
        prepared = api('collection-starters', {})
        assert prepared['inserted'] == 6 and prepared['published'] == 0
        assert api('collections')['total'] == 0
        for draft in api('collections-editor')['items']:
            api('collection-publish', {'slug': draft['slug'], 'expectedRevision': draft['revision'], 'decision': 'publish', 'reason': 'Isolated browser fixture publication, not a production editorial action.'})
        api('scout', {'items': [
            {'name': 'shadcn/ui', 'url': 'https://ui.shadcn.com/', 'note': 'Investigate retained source evidence.'},
            {'name': 'Magic UI', 'url': 'https://magicui.design/', 'note': 'Review source-pinned motion previews.'},
        ]})
        page.goto(WEB + '/browse/assets', wait_until='networkidle')
        browser_status = page.evaluate("async () => (await fetch('/api/registry?action=status', {credentials:'same-origin'})).json()")
        print(json.dumps({'preflight': {'apiRole': api('status')['role'], 'browserRole': browser_status['role'], 'pageUrl': page.url}}), flush=True)
        assert browser_status['role'] == 'curator'

        for view, query, expected_heading in [
            ('assets', '', 'Build from a considered selection.'),
            ('health', 'view=health', 'Know what is in the library.'),
            ('sources', 'view=sources', 'Understand the source, not just the count.'),
            ('source', 'view=sources&provider=shadcn', 'shadcn/ui'),
            ('collections', 'view=collections', 'A considered starting point.'),
            ('collection', 'view=collections&collection=dashboard-foundations', 'Dashboard foundations'),
            ('operations', 'view=operations', 'From discovery to a reviewed asset.'),
            ('editor', 'view=collection-editor&collection=dashboard-foundations', 'Refine the selection.'),
        ]:
            for width in [1440, 390]:
                page.wait_for_timeout(4000)
                page.set_viewport_size({'width': width, 'height': 1100 if width == 1440 else 844})
                page.goto(WEB + '/browse/assets?' + query, wait_until='networkidle')
                heading(expected_heading)
                page.wait_for_timeout(300)
                if view == 'collections':
                    verify_visible_cover()
                overflow = page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
                alerts = page.locator('.registry-intelligence [role=alert]').all_text_contents()
                page.screenshot(path=str(OUTPUT / f'{view}-{width}.png'), full_page=True)
                results.append({'view': view, 'width': width, 'horizontalOverflow': overflow, 'alerts': alerts})

        page.set_viewport_size({'width': 1440, 'height': 1100})
        page.goto(WEB + '/browse/assets', wait_until='networkidle')
        page.get_by_role('button', name='Sources', exact=True).click()
        heading('Understand the source, not just the count.')
        page.get_by_role('searchbox', name='Find a source').fill('shadcn')
        expect(page.locator('.dv2-source-card')).to_have_count(1)
        page.get_by_role('button', name='Asset collections', exact=True).click()
        heading('A considered starting point.')
        expect(page.locator('.dv2-collection-card')).to_have_count(6)
        expect(page.locator('.dv2-collection-visual')).to_have_count(6)
        results.append({'visibleNavigation': True, 'sourceSearch': True, 'realCollectionCards': 6})

        page.goto(WEB + '/browse/assets?view=collection-editor&collection=dashboard-foundations', wait_until='networkidle')
        page.get_by_label('Collection title', exact=True).fill('Dashboard foundations, revised draft')
        page.get_by_role('button', name='Save draft', exact=True).click()
        page.get_by_text('Draft saved. The public version is unchanged.', exact=True).wait_for()
        assert api('collection&slug=dashboard-foundations')['title'] == 'Dashboard foundations'

        guest = browser.new_context(viewport={'width': 390, 'height': 844})
        guest.route('**/api/auth/**', lambda r: r.fulfill(body='null', content_type='application/json'))
        gp = guest.new_page()
        gp.goto(WEB + '/browse/assets?view=health', wait_until='networkidle')
        assert gp.locator('.registry-intelligence').count() == 0
        unauthorised = guest.request.get(WEB + '/api/registry?action=operations')
        assert unauthorised.status == 401
        gp.goto(WEB + '/browse/assets?view=collections', wait_until='networkidle')
        gp.get_by_role('heading', name='A considered starting point.').wait_for()
        results.append({'editorSaveKeptPublishedTitle': True, 'guestPrivateRouteBlocked': True, 'guestOperationsHTTP': unauthorised.status})
        guest.close()

        demo = ctx.new_page()
        for asset_id in ['shadcn/card', 'magic-ui/blur-fade', 'motion-primitives/accordion', 'simply-buttons/arttech-download']:
            demo.goto(WEB + '/live-demos/index.html?id=' + asset_id, wait_until='networkidle')
            assert '/live-demos?' in demo.url, demo.url
            expect(demo.locator('html')).to_have_attribute('data-preview-ready', 'true')
        demo.close()
        results.append({'fourProviderDemoBootsAfterCleanURLRedirect': True})
        assert not errors, errors
        assert not api_failures, api_failures
        assert not any(check.get('horizontalOverflow') or check.get('alerts') for check in results), results
    except Exception:
        page.screenshot(path=str(OUTPUT / 'FAILED-interaction.png'), full_page=True)
        print(json.dumps({'failedUrl': page.url, 'headings': page.locator('h1,h2').all_text_contents(), 'alerts': page.locator('[role=alert]').all_text_contents(), 'apiFailures': api_failures, 'pageErrors': errors}), flush=True)
        raise
    finally:
        report = {'checks': results, 'pageErrors': errors, 'apiFailures': api_failures}
        print(json.dumps(report, indent=2), flush=True)
        (OUTPUT / 'results.json').write_text(json.dumps(report, indent=2))
        browser.close()
