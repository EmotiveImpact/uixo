"""Read-only deployed frame diagnostics. Never log cookies, tokens or URL queries."""
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

BASE = 'https://uixo-git-astra-provider-dd32cd-emotiveimpact-gmailcoms-projects.vercel.app'
OUT = Path('test-results/intelligence/kibo-hosted')
OUT.mkdir(parents=True, exist_ok=True)

def safe(url):
    value = urlsplit(url)
    return value.scheme + '://' + value.netloc + value.path

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context()
    page = context.new_page()
    share = Path(os.environ['UIXO_PREVIEW_SHARE_FILE']).read_text().strip()
    assert safe(share) == BASE + '/'
    try:
        page.goto(share, wait_until='networkidle', timeout=45000)
    except Exception:
        raise RuntimeError('Authorised preview session could not be established.') from None
    del share
    status = context.request.get(BASE + '/api/registry?action=status').json()
    assert status.get('build') == os.environ['UIXO_EXPECTED_BUILD'][:12]
    assert status['readOnly'] is True and status['storage'] == 'snapshot'
    network = []
    console = []
    def response(r):
        if '/provider-demos/' in r.url:
            network.append({'url':safe(r.url), 'status':r.status, 'type':r.headers.get('content-type'), 'cors':r.headers.get('access-control-allow-origin'), 'csp':r.headers.get('content-security-policy'), 'requestType':r.request.resource_type})
    def failed(r):
        if '/provider-demos/' in r.url:
            network.append({'url':safe(r.url), 'failure':r.failure, 'requestType':r.resource_type})
    def message(m):
        if m.type == 'error':
            # Strip URL query strings and never retain authentication values.
            import re
            console.append(re.sub(r'https?://[^\s\"\']+', lambda match: safe(match.group()), m.text)[:1000])
    page.on('response',response)
    page.on('requestfailed',failed)
    page.on('console',message)
    page.goto(BASE + '/browse/assets?provider=kibo-ui', wait_until='domcontentloaded')
    page.wait_for_timeout(22000)
    frames = []
    for frame in page.frames:
        if '/provider-demos/' not in frame.url:
            continue
        try:
            frames.append({'url':safe(frame.url), 'html':frame.locator('html').evaluate('(e)=>({ready:e.dataset.previewReady,theme:e.dataset.theme,sourceRef:e.dataset.sourceRef})'), 'body':frame.locator('body').inner_text()[:600], 'scripts':frame.locator('script[src]').evaluate_all('(nodes)=>nodes.map(n=>({path:new URL(n.src).pathname,crossOrigin:n.crossOrigin,type:n.type}))')})
        except Exception:
            frames.append({'url':safe(frame.url),'inspection':'not accessible'})
    # Compare the same script path through the authorised HTTP context.
    checks=[]
    for url in sorted(set(item['url'] for item in network if item['requestType']=='script'))[:10]:
        r=context.request.get(url)
        checks.append({'url':url,'authorisedStatus':r.status,'type':r.headers.get('content-type')})
    result={'build':status['build'],'databaseWrites':False,'network':network,'consoleErrors':console,'frames':frames,'authorisedScriptChecks':checks}
    (OUT/'network-diagnostics.json').write_text(json.dumps(result,indent=2))
    page.screenshot(path=str(OUT/'network-diagnostics.png'))
    print(json.dumps(result,indent=2))
    context.close()
    browser.close()
