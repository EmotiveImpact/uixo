import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkspaceRouter } from './WorkspaceRouter';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <WorkspaceRouter />
  </StrictMode>,
);
