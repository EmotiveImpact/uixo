import React, { Component, Suspense, lazy, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { KIBO_PREVIEW_REF, KIBO_REVIEWED_COMPONENTS } from '../../shared/reviewed-previews';
import './styles.css';

const examples = import.meta.glob('./vendor/apps/docs/examples/*.tsx');
const params = new URLSearchParams(location.search);
const slug = params.get('id') ?? '';
const id = `kibo-ui/${slug}`;
let failed = false;
document.documentElement.dataset.sourceRef = KIBO_PREVIEW_REF;
function notify(status: 'ready' | 'error') {
  if (status === 'error') {
    failed = true;
    delete document.documentElement.dataset.previewReady;
  }
  if (status === 'ready' && failed) return;
  parent.postMessage({ type: 'uixo-preview-status', id, status }, '*');
}
function setTheme(theme: unknown) {
  if (theme !== 'light' && theme !== 'dark') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  document.documentElement.dataset.theme = theme;
}
setTheme(params.get('theme') === 'light' ? 'light' : 'dark');
window.addEventListener('message', (event) => {
  if (event.source === parent && event.data?.type === 'uixo-preview-theme')
    setTheme(event.data.theme);
});
window.addEventListener('error', () => notify('error'));
window.addEventListener('unhandledrejection', () => notify('error'));
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    notify('error');
  }
  render() {
    return this.state.failed ? (
      <p role="alert">The original demo could not run.</p>
    ) : (
      this.props.children
    );
  }
}
function Ready() {
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      if (failed) return;
      document.documentElement.dataset.previewReady = 'true';
      notify('ready');
    });
    return () => cancelAnimationFrame(timer);
  }, []);
  return null;
}
const load = Object.hasOwn(KIBO_REVIEWED_COMPONENTS, slug)
  ? examples[`./vendor/apps/docs/examples/${slug}.tsx`]
  : undefined;
const Demo = load ? lazy(() => load() as Promise<{ default: React.ComponentType }>) : null;
const root = document.getElementById('root');
if (!root) throw new Error('Missing preview root.');
createRoot(root).render(
  <Boundary>
    <Suspense fallback={<p role="status">Loading original component…</p>}>
      <main className="demo-stage" onSubmit={(event) => event.preventDefault()}>
        {Demo ? (
          <>
            <Demo />
            <Ready />
          </>
        ) : (
          <p role="alert">This component is not in the reviewed snapshot.</p>
        )}
      </main>
    </Suspense>
  </Boundary>,
);
