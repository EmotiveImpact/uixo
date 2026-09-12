import { useEffect, useState } from 'react';
import { App } from './App';
import { AssetWorkspace } from './components/AssetWorkspace';
import { isAssetWorkspacePath } from './lib/navigation';

/** Keeps UIXO's catalogues in one document so moving between them never shows a page loader. */
export function WorkspaceRouter() {
  const [assetView, setAssetView] = useState(() => isAssetWorkspacePath(window.location.pathname));

  useEffect(() => {
    const readPath = () => setAssetView(isAssetWorkspacePath(window.location.pathname));
    window.addEventListener('popstate', readPath);
    return () => window.removeEventListener('popstate', readPath);
  }, []);

  return assetView ? <AssetWorkspace /> : <App />;
}
