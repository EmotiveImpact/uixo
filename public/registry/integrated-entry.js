// Keep curator/MCP utility pages available while visitor discovery uses the shared React shell.
const integratedViews = new Set(['assets', 'saved', 'sources']);
function integratedUrl(search) {
  const query = new URLSearchParams(search);
  const localFrontend = location.origin === 'http://127.0.0.1:4175' ? 'http://127.0.0.1:5173' : '';
  return localFrontend + '/browse/assets' + (query.size ? '?' + query.toString() : '');
}
if (integratedViews.has(new URLSearchParams(location.search).get('view') || 'assets')) {
  location.replace(integratedUrl(location.search));
}
document.addEventListener('click', (event) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target instanceof Element ? event.target.closest('a[data-view]') : null;
  if (!link || !integratedViews.has(link.dataset.view)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  location.assign(integratedUrl(new URL(link.href).search));
}, true);
