import { useEffect, useState } from 'react';
import { App } from './App';
import { AssetWorkspace } from './components/AssetWorkspace';
import { isAssetWorkspacePath, redirectLegacySaves } from './lib/navigation';

/** Keeps UIXO's catalogues in one document so moving between them never shows a page loader. */
export function WorkspaceRouter() {
  const [assetView, setAssetView] = useState(() => {
    redirectLegacySaves();
    return isAssetWorkspacePath(window.location.pathname);
  });

  useEffect(() => {
    const readPath = () => {
      redirectLegacySaves();
      setAssetView(isAssetWorkspacePath(window.location.pathname));
    };
    window.addEventListener('popstate', readPath);
    return () => window.removeEventListener('popstate', readPath);
  }, []);

  return assetView ? <AssetWorkspace /> : <App />;
}
