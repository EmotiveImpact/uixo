"""Read-only browser startup diagnostics against isolated localhost only."""
import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    context.route('**/api/auth/**', lambda r: r.fulfill(json={'user': {'id': 'diagnostic', 'name': 'Local Curator', 'email': 'curator@example.test', 'role': 'curator'}, 'session': {}}) if 'get-session' in r.request.url else r.fulfill(json={'token': None}))
    context.route('**/api/lists', lambda r: r.fulfill(json={'lists': [], 'revision': 0}))
    context.route('**/api/saved-assets', lambda r: r.fulfill(json={'assetIds': [], 'revision': 0}))
    page = context.new_page()
    messages, failures, responses = [], [], []
    page.on('console', lambda m: messages.append({'type': m.type, 'text': m.text[:2000]}) if m.type in ['error', 'warning'] else None)
    page.on('pageerror', lambda e: messages.append({'type': 'pageerror', 'text': str(e)}))
    page.on('requestfailed', lambda r: failures.append({'url': r.url, 'failure': r.failure}))
    page.on('response', lambda r: responses.append({'url': r.url, 'status': r.status, 'mime': r.headers.get('content-type')}) if r.status >= 400 or '/src/' in r.url else None)
    page.goto('http://localhost:3000/registry/index.html', wait_until='domcontentloaded')
    response = page.goto('http://localhost:3000/browse/assets?', wait_until='networkidle')
    page.wait_for_timeout(1500)
    print(json.dumps({
        'url': page.url,
        'documentStatus': response.status,
        'documentHeaders': {k: v for k, v in response.headers.items() if k in ['content-type', 'content-security-policy', 'location']},
        'readyState': page.evaluate('document.readyState'),
        'headings': page.locator('h1,h2').all_text_contents(),
        'body': page.locator('body').inner_html()[:3000],
        'scripts': page.locator('script').evaluate_all('(elements) => elements.map(el => ({src:el.src,type:el.type}))'),
        'console': messages,
        'failedRequests': failures,
        'responses': responses,
    }, indent=2), flush=True)
    browser.close()
