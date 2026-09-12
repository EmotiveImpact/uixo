import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const AssetWorkspace = lazy(() => import('./components/AssetWorkspace').then((module) => ({ default: module.AssetWorkspace })));
const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');
const assetView = window.location.pathname.replace(/\/+$/, '') === '/browse/assets';

createRoot(container).render(
  <StrictMode>
    <Suspense fallback={<p role="status" style={{ padding: '2rem' }}>Opening UIXO…</p>}>
      {assetView ? <AssetWorkspace /> : <App />}
    </Suspense>
  </StrictMode>,
);
