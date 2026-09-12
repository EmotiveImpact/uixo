import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// This entrypoint owns the lazy route boundary; it is not a Fast Refresh module.
// eslint-disable-next-line react-refresh/only-export-components
const AssetWorkspace = lazy(() =>
  import('./components/AssetWorkspace').then((module) => ({ default: module.AssetWorkspace })),
);
const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');
const assetView = window.location.pathname.replace(/\/+$/, '') === '/browse/assets';

createRoot(container).render(
  <StrictMode>
    <Suspense
      fallback={
        <p role="status" style={{ padding: '2rem' }}>
          Opening UIXO…
        </p>
      }
    >
      {assetView ? <AssetWorkspace /> : <App />}
    </Suspense>
  </StrictMode>,
);
