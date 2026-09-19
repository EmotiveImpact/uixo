"""Isolated Chromium acceptance: real local registry/API, simulated identity and account APIs.
Never target production. Start registry-dev --memory --dev-curator and Vite on documented ports.
"""
from playwright.sync_api import sync_playwright
import json, os
from pathlib import Path
output = Path(os.environ.get('UIXO_BROWSER_RESULTS', 'test-results/intelligence'))
output.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    ctx=browser.new_context(viewport={'width':1440,'height':1100},device_scale_factor=1)
    ctx.request.get('http://127.0.0.1:4175/registry/index.html')
    def api(action,body=None):
        url='http://127.0.0.1:4175/api/registry?action='+action
        res=ctx.request.post(url,data=body) if body is not None else ctx.request.get(url)
        data=res.json()
        if res.status!=200: raise RuntimeError((action,res.status,data))
        return data
    for slug,title,ids in [
        ('dashboard-foundations','Dashboard foundations',['shadcn/sidebar','shadcn/card','shadcn/table']),
        ('considered-forms','Considered forms',['shadcn/input','shadcn/label','shadcn/button']),
        ('navigation-essentials','Navigation essentials',['shadcn/navigation-menu','shadcn/breadcrumb','shadcn/command'])
    ]:
        c=api('collection-save',{'slug':slug,'title':title,'description':'A deliberately small set of source-backed building blocks. Inspect every licence and dependency before using them in your project.','items':[{'kind':'asset','targetId':id,'note':'A focused building block from an approved source. Read the original implementation before adapting it.'} for id in ids],'expectedRevision':0})
        api('collection-publish',{'slug':slug,'expectedRevision':c['revision'],'decision':'publish','reason':'Isolated browser test fixture, not a production editorial decision.'})
    api('scout',{'items':[{'name':'shadcn/ui','url':'https://ui.shadcn.com/','note':'Investigate the original component source and its retained evidence.'},{'name':'Magic UI','url':'https://magicui.design/','note':'Review motion component coverage and source-pinned preview availability.'},{'name':'Motion Primitives','url':'https://motion-primitives.com/','note':'Consider interaction primitives for purposeful motion.'}]})
    def fake_auth(route):
        if 'get-session' in route.request.url:
            route.fulfill(json={'user':{'id':'browser-test-curator','name':'Local Curator','email':'curator@example.test','role':'curator'},'session':{}})
        else: route.fulfill(json={'token':None})
    ctx.route('**/api/auth/**',fake_auth)
    ctx.route('**/api/lists',lambda r:r.fulfill(json={'lists':[],'revision':0}))
    ctx.route('**/api/saved-assets',lambda r:r.fulfill(json={'assetIds':[],'revision':0}))
    page=ctx.new_page();errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    results=[]
    for view,query,heading in [
        ('health','view=health','Know what is in the library.'),
        ('sources','view=sources','Understand the source, not just the count.'),
        ('source','view=sources&provider=shadcn','shadcn/ui'),
        ('collections','view=collections','A considered starting point.'),
        ('collection','view=collections&collection=dashboard-foundations','Dashboard foundations'),
        ('operations','view=operations','From discovery to a reviewed asset.'),
        ('editor','view=collection-editor&collection=dashboard-foundations','Refine the selection.'),
    ]:
        for width in [1440,390]:
            page.set_viewport_size({'width':width,'height':1100 if width==1440 else 844})
            page.goto('http://127.0.0.1:3000/browse/assets?'+query,wait_until='networkidle')
            page.get_by_role('heading',name=heading,exact=True).wait_for()
            page.wait_for_timeout(300)
            overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
            alerts=page.locator('.registry-intelligence [role=alert]').all_text_contents()
            page.screenshot(path=str(output / f'{view}-{width}.png'),full_page=True)
            results.append({'view':view,'width':width,'horizontalOverflow':overflow,'alerts':alerts})
    # A genuine local curator write through the editor UI.
    page.set_viewport_size({'width':1440,'height':1100})
    page.goto('http://127.0.0.1:3000/browse/assets?view=collection-editor&collection=dashboard-foundations',wait_until='networkidle')
    page.get_by_label('Collection title',exact=True).fill('Dashboard foundations, revised draft')
    page.get_by_role('button',name='Save draft',exact=True).click()
    page.get_by_text('Draft saved. The public version is unchanged.',exact=True).wait_for()
    assert api('collection&slug=dashboard-foundations')['title']=='Dashboard foundations'
    # Guest route gating and public collections remain available without a local curator session.
    guest=browser.new_context(viewport={'width':390,'height':844})
    guest.route('**/api/auth/**',lambda r:r.fulfill(body='null',content_type='application/json'))
    gp=guest.new_page(); gp.goto('http://127.0.0.1:3000/browse/assets?view=health',wait_until='networkidle')
    assert gp.locator('.registry-intelligence').count()==0
    unauth=guest.request.get('http://127.0.0.1:4175/api/registry?action=operations'); assert unauth.status==401
    gp.goto('http://127.0.0.1:3000/browse/assets?view=collections',wait_until='networkidle')
    gp.get_by_role('heading',name='A considered starting point.').wait_for()
    results.append({'editorSaveKeptPublishedTitle':True,'guestPrivateRouteBlocked':True,'guestOperationsHTTP':unauth.status})
    print(json.dumps({'checks':results,'pageErrors':errors},indent=2))
    (output / 'results.json').write_text(json.dumps({'checks':results,'pageErrors':errors},indent=2))
    assert not errors, errors
    assert not any(c.get('horizontalOverflow') or c.get('alerts') for c in results), results
    browser.close()
