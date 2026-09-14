import './adapters/preview-storage';
import { Tooltip } from 'radix-ui';
import React, { Component, Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import manifest from './manifest.json';
import './styles.css';
const files = import.meta.glob(['./vendor/**/*.tsx', './examples/*.tsx']);
const params = new URLSearchParams(location.search),
  id = params.get('id') || '',
  entry = manifest[id];
function setTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  window.dispatchEvent(new Event('uixo-theme'));
}
setTheme(params.get('theme') === 'light' ? 'light' : 'dark');
window.addEventListener('message', (event) => {
  if (event.source === parent && event.data?.type === 'uixo-preview-theme')
    setTheme(event.data.theme);
});
const origins = {
  'magic-ui': 'https://magicui.design',
  shadcn: 'https://ui.shadcn.com',
  'motion-primitives': 'https://motion-primitives.com',
};
const base = document.createElement('base');
base.href = origins[id.split('/')[0]] + '/';
document.head.append(base);
window.addEventListener('error', () => notify('error'));
function notify(status) {
  parent.postMessage({ type: 'uixo-preview-status', id, status }, '*');
}
class Boundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch() {
    notify('error');
  }
  render() {
    return this.state.error ? (
      <p role="alert">This demo could not start. Open the original provider demo.</p>
    ) : (
      this.props.children
    );
  }
}
function Ready() {
  useEffect(() => {
    notify('ready');
    document.documentElement.dataset.previewReady = 'true';
  }, []);
  return null;
}
const Demo =
  entry && files[entry.file]
    ? lazy(() => files[entry.file]().then((module) => ({ default: module[entry.export] })))
    : null;
createRoot(document.getElementById('root')).render(
  <Boundary>
    <Suspense fallback={<p role="status">Loading live demo…</p>}>
      <main className="demo-stage" onSubmit={(event) => event.preventDefault()}>
        {Demo ? (
          <>
            <Tooltip.Provider>
              <Demo />
            </Tooltip.Provider>
            <Ready />
          </>
        ) : (
          <p>Live demo unavailable.</p>
        )}
      </main>
    </Suspense>
  </Boundary>,
);
