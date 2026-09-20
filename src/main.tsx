import { Tooltip } from 'radix-ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkspaceRouter } from './WorkspaceRouter';
import './styles.css';
import './components/uixo-redesign.css';
import './components/discovery/layout-refinements.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <Tooltip.Provider delayDuration={500}>
      <WorkspaceRouter />
    </Tooltip.Provider>
  </StrictMode>,
);
