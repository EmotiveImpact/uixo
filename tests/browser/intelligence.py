"""Isolated acceptance using a real local registry and simulated frontend identity.
Never target production. Start registry-dev --memory --dev-curator and Vite.
The browser receives a real randomly issued loopback development cookie.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUTPUT = Path(os.environ.get('UIXO_BROWSER_RESULTS', 'test-results/intelligence'))
OUTPUT.mkdir(parents=True, exist_ok=True)
# index.html canonicalises browser navigation to localhost, not 127.0.0.1.
# The Vite development proxy issues and forwards the API's host-only cookie here.
WEB = 'http://localhost:3000'
API = WEB

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
    page.goto(WEB + '/registry/index.html', wait_until='domcontentloaded')

    def api(action, body=None):
        url = API + '/api/registry?action=' + action
        response = ctx.request.post(url, data=body) if body is not None else ctx.request.get(url)
        data = response.json()
        if response.status != 200:
            raise RuntimeError((action, response.status, data))
        return data

    assert api('status')['role'] == 'curator', 'The API did not recognise its issued development session.'
    for slug, title, ids in [
        ('dashboard-foundations', 'Dashboard foundations', ['shadcn/sidebar', 'shadcn/card', 'shadcn/table']),
        ('considered-forms', 'Considered forms', ['shadcn/input', 'shadcn/label', 'shadcn/button']),
        ('navigation-essentials', 'Navigation essentials', ['shadcn/navigation-menu', 'shadcn/breadcrumb', 'shadcn/command']),
    ]:
        draft = api('collection-save', {'slug': slug, 'title': title, 'description': 'A deliberately small set of source-backed building blocks. Inspect source evidence before using them.', 'items': [{'kind': 'asset', 'targetId': asset_id, 'note': 'A focused building block from an approved source. Inspect the original implementation.'} for asset_id in ids], 'expectedRevision': 0})
        api('collection-publish', {'slug': slug, 'expectedRevision': draft['revision'], 'decision': 'publish', 'reason': 'Isolated browser fixture, not a production editorial decision.'})
    api('scout', {'items': [
        {'name': 'shadcn/ui', 'url': 'https://ui.shadcn.com/', 'note': 'Investigate retained source evidence.'},
        {'name': 'Magic UI', 'url': 'https://magicui.design/', 'note': 'Review source-pinned motion previews.'},
    ]})

    page.goto(WEB + '/browse/assets', wait_until='networkidle')
    browser_status = page.evaluate("async () => (await fetch('/api/registry?action=status', {credentials:'same-origin'})).json()")
    print(json.dumps({'preflight': {'apiRole': api('status')['role'], 'browserRole': browser_status['role'], 'pageUrl': page.url}, 'cookies': [{key: c[key] for key in ['name', 'domain', 'path', 'secure', 'sameSite']} for c in ctx.cookies()]}), flush=True)
    assert browser_status['role'] == 'curator', 'The canonical browser/proxy did not retain the issued development session.'

    def check_screen(view, query, heading, width):
        page.set_viewport_size({'width': width, 'height': 1100 if width == 1440 else 844})
        page.goto(WEB + '/browse/assets?' + query, wait_until='networkidle')
        try:
            page.get_by_role('heading', name=heading, exact=True).wait_for(timeout=15000)
        except Exception:
            page.screenshot(path=str(OUTPUT / f'FAILED-{view}-{width}.png'), full_page=True)
            print(json.dumps({'view': view, 'url': page.url, 'headings': page.locator('h1,h2').all_text_contents(), 'alerts': page.locator('[role=alert]').all_text_contents(), 'apiFailures': api_failures, 'pageErrors': errors}), flush=True)
            raise
        page.wait_for_timeout(250)
        overflow = page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
        alerts = page.locator('.registry-intelligence [role=alert]').all_text_contents()
        page.screenshot(path=str(OUTPUT / f'{view}-{width}.png'), full_page=True)
        results.append({'view': view, 'width': width, 'horizontalOverflow': overflow, 'alerts': alerts})

    for view, query, heading in [
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
            check_screen(view, query, heading, width)

    # Use visible discovery navigation, not only query-string routes.
    page.set_viewport_size({'width': 1440, 'height': 1100})
    page.goto(WEB + '/browse/assets', wait_until='networkidle')
    page.get_by_role('button', name='Sources', exact=True).click()
    page.get_by_role('heading', name='Understand the source, not just the count.', exact=True).wait_for()
    page.get_by_role('searchbox', name='Find a source').fill('shadcn')
    expect(page.locator('.dv2-source-card')).to_have_count(1)
    page.get_by_role('button', name='Asset collections', exact=True).click()
    page.get_by_role('heading', name='A considered starting point.', exact=True).wait_for()
    expect(page.locator('.dv2-collection-card')).to_have_count(3)
    expect(page.locator('.dv2-collection-visual')).to_have_count(3)
    results.append({'visibleNavigation': True, 'sourceSearch': True, 'realCollectionCards': 3})

    # A real local curator write cannot change the separate published snapshot.
    page.goto(WEB + '/browse/assets?view=collection-editor&collection=dashboard-foundations', wait_until='networkidle')
    page.get_by_label('Collection title', exact=True).fill('Dashboard foundations, revised draft')
    page.get_by_role('button', name='Save draft', exact=True).click()
    page.get_by_text('Draft saved. The public version is unchanged.', exact=True).wait_for()
    assert api('collection&slug=dashboard-foundations')['title'] == 'Dashboard foundations'

    # Guests cannot read private screens or APIs and still have public collections.
    guest = browser.new_context(viewport={'width': 390, 'height': 844})
    guest.route('**/api/auth/**', lambda r: r.fulfill(body='null', content_type='application/json'))
    gp = guest.new_page()
    gp.goto(WEB + '/browse/assets?view=health', wait_until='networkidle')
    assert gp.locator('.registry-intelligence').count() == 0
    unauthorised = guest.request.get(API + '/api/registry?action=operations')
    assert unauthorised.status == 401
    gp.goto(WEB + '/browse/assets?view=collections', wait_until='networkidle')
    gp.get_by_role('heading', name='A considered starting point.').wait_for()
    results.append({'editorSaveKeptPublishedTitle': True, 'guestPrivateRouteBlocked': True, 'guestOperationsHTTP': unauthorised.status})
    report = {'checks': results, 'pageErrors': errors}
    print(json.dumps(report, indent=2), flush=True)
    (OUTPUT / 'results.json').write_text(json.dumps(report, indent=2))
    assert not errors, errors
    assert not any(check.get('horizontalOverflow') or check.get('alerts') for check in results), results
    guest.close()
    browser.close()
