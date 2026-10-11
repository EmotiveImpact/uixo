import './adapters/preview-storage';
import { Tooltip } from 'radix-ui';
import React, { Component, Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import manifest from './manifest.json';
import { reportContentSize } from '../shared/preview-stage';
import { customisableDemo, sanitiseDemoProps } from '../shared/demo-props';
import './styles.css';
const files = import.meta.glob(['./vendor/**/*.tsx', './vendor/**/*.jsx', './examples/*.tsx']);
const params = new URLSearchParams(location.search),
  id = params.get('id') || '',
  entry = manifest[id];
function setTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event('uixo-theme'));
}
setTheme(params.get('theme') === 'light' ? 'light' : 'dark');
// Card stages paint their own tinted field behind the demo. With stage=clear the page
// stays transparent and reports its content box so the card can frame it.
const clearStage = params.get('stage') === 'clear';
if (clearStage) document.documentElement.dataset.stage = 'clear';
window.addEventListener('message', (event) => {
  if (event.source === parent && event.data?.type === 'uixo-preview-theme')
    setTheme(event.data.theme);
});
const origins = {
  'simply-buttons': 'https://simply-buttons.vercel.app',
  'magic-ui': 'https://magicui.design',
  shadcn: 'https://ui.shadcn.com',
  'motion-primitives': 'https://motion-primitives.com',
};
const base = document.createElement('base');
base.href = origins[id.split('/')[0]] + '/';
// These button demos are self-contained. Keep lazy CSS on UIXO's origin;
// a provider <base> would redirect Vite's stylesheet preloads to the gallery.
if (!id.startsWith('simply-buttons/')) document.head.append(base);
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
    if (clearStage) return reportContentSize(id, () => document.querySelector('.demo-stage'));
  }, []);
  return null;
}
// props=live: a curated demo renders through its UIXO wrapper and takes props from the
// detail page. Only messages from the parent frame count, and every value is checked
// against the demo's controls before it reaches the component.
const customisable = params.get('props') === 'live' ? customisableDemo(id) : undefined;
function Customised({ Wrapper }) {
  const [values, setValues] = useState(() => sanitiseDemoProps(id, {}));
  useEffect(() => {
    const receive = (event) => {
      if (event.source !== parent || event.data?.type !== 'uixo-preview-props') return;
      if (event.data.id !== id) return;
      const checked = sanitiseDemoProps(id, event.data.values);
      if (checked) setValues(checked);
    };
    window.addEventListener('message', receive);
    parent.postMessage({ type: 'uixo-preview-props-ready', id }, '*');
    return () => window.removeEventListener('message', receive);
  }, []);
  // New props can change the content's size: ask for a fresh measurement.
  useEffect(() => {
    const frame = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    return () => cancelAnimationFrame(frame);
  }, [values]);
  return <Wrapper values={values} />;
}
const Demo = customisable
  ? lazy(() =>
      files['./examples/customisable.tsx']().then((module) => {
        const Wrapper = module[customisable.export];
        return { default: () => <Customised Wrapper={Wrapper} /> };
      }),
    )
  : entry && files[entry.file]
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
