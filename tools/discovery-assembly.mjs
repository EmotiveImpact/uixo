import { readFileSync, writeFileSync } from 'node:fs';

function edit(path, before, after) {
  const content = readFileSync(path, 'utf8');
  if (!content.includes(before)) throw new Error('Assembly anchor missing: ' + path + ' / ' + before.slice(0, 80));
  writeFileSync(path, content.replace(before, after));
}
function section(path, start, end, replacement) {
  const content = readFileSync(path, 'utf8');
  const a = content.indexOf(start);
  const b = content.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error('Assembly section missing: ' + path);
  writeFileSync(path, content.slice(0, a) + replacement + content.slice(b));
}

edit('shared/intelligence.ts', "export type PublicCollection = Omit<CollectionInput, 'items'> & {\n  items: (CollectionItem & { name: string; sourceUrl: string })[];", `export type CollectionAssetPreview = {
  id: string;
  name: string;
  kind: string;
  sourceUrl: string;
  preview: { kind: string; url?: string; label: string } | null;
};
export type PublicCollectionItem = CollectionItem & {
  name: string;
  sourceUrl: string;
  providerId?: string;
  providerName?: string;
  frameworks?: string[];
  licenceExpression?: string;
  asset?: CollectionAssetPreview;
};
export type PublicCollection = Omit<CollectionInput, 'items'> & {
  items: PublicCollectionItem[];`);

edit('src/components/AssetPreview.tsx', "import type { AssetRecord } from '../lib/asset-library';", "import type { CollectionAssetPreview } from '../../shared/intelligence';");
let previews = readFileSync('src/components/AssetPreview.tsx', 'utf8').replaceAll('asset: AssetRecord', 'asset: CollectionAssetPreview');
writeFileSync('src/components/AssetPreview.tsx', previews);

edit('registry/collections.ts', "import { randomUUID } from 'node:crypto';", "import { randomUUID } from 'node:crypto';\nimport { STARTER_COLLECTIONS } from '../shared/starter-collections.ts';\nimport type { Asset } from './domain.ts';\nimport type { PublicCollectionItem } from '../shared/intelligence.ts';");
edit('registry/collections.ts', 'const found = new Map<string, { name: string; sourceUrl: string }>();', "const found = new Map<string, Omit<PublicCollectionItem, 'kind' | 'targetId' | 'note'>>();");
edit('registry/collections.ts', 'SELECT a.id,a.name,a.source_url AS source_url FROM', 'SELECT a.id,a.name,a.source_url AS source_url,a.payload,p.name AS provider_name FROM');
edit('registry/collections.ts', '? { name: String(row.name), sourceUrl: String(row.source_url) }', `? (() => {
                const asset = JSON.parse(String(row.payload)) as Asset;
                return {
                  name: asset.name,
                  sourceUrl: asset.sourceUrl,
                  providerId: asset.providerId,
                  providerName: String(row.provider_name),
                  frameworks: [...new Set(asset.variants.map((variant) => variant.framework))],
                  licenceExpression: asset.licence.expression,
                  asset: {
                    id: asset.id,
                    name: asset.name,
                    kind: asset.kind,
                    sourceUrl: asset.sourceUrl,
                    preview: asset.preview,
                  },
                };
              })()`);
const collectionsPath = 'registry/collections.ts';
const collections = readFileSync(collectionsPath, 'utf8');
const seedStart = collections.indexOf('export async function seedCollectionDrafts(');
if (seedStart < 0) throw new Error('Collection seed not found.');
writeFileSync(collectionsPath, collections.slice(0, seedStart) + `export async function seedCollectionDrafts(registry: Registry) {
  requireWritable(registry);
  let inserted = 0;
  const skipped: string[] = [];
  for (const starter of STARTER_COLLECTIONS) {
    if ((await registry.db.query('SELECT slug FROM uixo_v2_collections WHERE slug=$1', [starter.slug])).length)
      continue;
    if ((await available(registry, starter)).length !== starter.items.length) {
      skipped.push(starter.slug);
      continue;
    }
    await saveCollection(registry, { ...starter, expectedRevision: 0 }, 'collection-bootstrap');
    inserted++;
  }
  return { inserted, published: 0, skipped };
}
`);

edit('registry/http.ts', "import { coverage, sourceHealth } from './intelligence.ts';", "import { coverage, sourceHealth } from './intelligence.ts';\nimport { intelligenceReadiness } from './readiness.ts';");
edit('registry/http.ts', '  publishCollection,\n', '  publishCollection,\n  seedCollectionDrafts,\n');
edit('registry/http.ts', "        'source-health': ['GET'],", "        'source-health': ['GET'],\n        'source-directory': ['GET'],\n        'collection-starters': ['POST'],");
edit('registry/http.ts', "        'collection-save',\n", "        'collection-save',\n        'collection-starters',\n");
edit('registry/http.ts', "      else if (action === 'source-health')", "      else if (action === 'source-directory')\n        result = { items: (await coverage(registry)).sources };\n      else if (action === 'collection-starters')\n        result = await seedCollectionDrafts(registry);\n      else if (action === 'source-health')");
edit('registry/http.ts', "          version: '0.2.0',", "          version: '0.3.0',\n          release: 'discovery-v2',\n          build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,\n          intelligence: await intelligenceReadiness(registry),");
edit('registry/runtime.ts', "import { seedCaptured } from './bootstrap.ts';", "import { seedCaptured } from './bootstrap.ts';\nimport { bootstrapSnapshotCollections } from './release-collections.ts';");
edit('registry/runtime.ts', '  await seedCaptured(registry);', '  await seedCaptured(registry);\n  await bootstrapSnapshotCollections(registry);');

edit('src/components/AppSidebar.tsx', "import { COMPONENT_CATEGORIES }", "import { RegistryExplore } from './RegistryExplore';\nimport { EMPTY_ASSET_QUERY, assetHref } from '../lib/asset-library';\nimport { COMPONENT_CATEGORIES }");
edit('src/components/AppSidebar.tsx', 'import type { ProviderRecord }', 'import type { AssetQuery, ProviderRecord }');
edit('src/components/AppSidebar.tsx', '  assetProviders?: ProviderRecord[];', "  assetProviders?: ProviderRecord[];\n  assetView?: AssetQuery['view'];\n  registryCurator?: boolean;\n  onChooseAssetView?: (view: AssetQuery['view']) => void;");
edit('src/components/AppSidebar.tsx', '  assetProviders = [],', "  assetProviders = [],\n  assetView = 'assets',\n  registryCurator = false,\n  onChooseAssetView,");
edit('src/components/AppSidebar.tsx', '      <AnimatedSidebarContent className="px-2 pt-1">', `      <AnimatedSidebarContent className="px-2 pt-1">
        <RegistryExplore
          view={onAssets ? assetView : null}
          isCurator={registryCurator}
          onChoose={onChooseAssetView ?? ((view) => navigateInApp(assetHref({ ...EMPTY_ASSET_QUERY, view })))}
        />`);

edit('src/components/AssetWorkspace.tsx', "import { RegistryIntelligence }", "import { FeaturedCollections } from './DiscoveryCollections';\nimport { RegistryIntelligence }");
edit('src/components/AssetWorkspace.tsx', '        onAssets\n', "        onAssets\n        assetView={query.view}\n        registryCurator={isCurator}\n        onChooseAssetView={(view) => navigate({ view }, true)}\n");
edit('src/components/AssetWorkspace.tsx', '        {intelligence ? (', `        {!intelligence && !utility && query.view === 'assets' && !hasFilters && query.offset === 0 && !query.id && (
          <FeaturedCollections query={query} navigate={navigate} />
        )}
        {intelligence ? (`);
edit('src/components/AssetWorkspace.tsx', "            utility\n              ? 'One library. Your workflow.'", "            intelligence\n              ? 'Source-backed selections and evidence from the UIXO registry.'\n              : utility\n              ? 'One library. Your workflow.'");
edit('src/components/AssetWorkspace.tsx', '          <AssetUtilities key={query.view} view={query.view} />', `          ['review', 'scout', 'jobs'].includes(query.view) && !settled ? (
            <p role="status">Checking account…</p>
          ) : ['review', 'scout', 'jobs'].includes(query.view) && !isCurator ? (
            <NotFound onReset={() => navigate({}, true)} />
          ) : (
            <AssetUtilities key={query.view} view={query.view} />
          )`);
edit('src/components/AssetWorkspace.tsx', '        <SiteFooter count={null} assets>', '        <p className="dv2-release-label">DISCOVERY V2 · SOURCE-BACKED ASSET REGISTRY</p>\n        <SiteFooter count={null} assets>');

edit('src/components/RegistryIntelligence.tsx', "import { ArrowLeft,", "import { SourceDirectory } from './SourceDirectory';\nimport { ArrowLeft,");
edit('src/components/RegistryIntelligence.tsx', 'import type { AssetQuery, ProviderRecord }', 'import type { AssetQuery }');
section('src/components/RegistryIntelligence.tsx', 'function Sources(props: IntelligenceProps) {', 'function SourceProfile(', `function Sources(props: IntelligenceProps) {
  return props.query.provider ? <SourceProfile {...props} /> : <SourceDirectory {...props} />;
}
`);

edit('src/components/AssetCollections.tsx', "import { AssetDetail }", "import { AssetPreview } from './AssetPreview';\nimport { CollectionGrid } from './DiscoveryCollections';\nimport { AssetDetail }");
section('src/components/AssetCollections.tsx', '        <div className="ri-source-grid">', '      )}\n      <div className="ri-pagination">', `        <CollectionGrid items={remote.data.items} query={query} navigate={navigate} />
`);
edit('src/components/AssetCollections.tsx', '                  <span className="ri-item-number">', `                  {i.asset && <div className="dv2-item-preview"><AssetPreview asset={i.asset} /></div>}
                  <span className="ri-item-number">`);
edit('src/components/AssetCollections.tsx', '                    <h3>{i.name}</h3>', `                    <h3>{i.name}</h3>
                    <div className="dv2-selection-meta">
                      {i.providerName && <span>{i.providerName}</span>}
                      {i.frameworks?.map((framework) => <span key={framework}>{framework}</span>)}
                      {i.licenceExpression && <span>{i.licenceExpression}</span>}
                    </div>`);
edit('src/components/AssetCollections.tsx', '  const [create, setCreate] = useState(false);', `  const [create, setCreate] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState('');
  const [prepareNotice, setPrepareNotice] = useState('');`);
edit('src/components/AssetCollections.tsx', '  if (query.collection) return <ExistingCollectionEditor {...props} />;', `  async function prepareStarters() {
    setPreparing(true);
    setPrepareError('');
    setPrepareNotice('');
    try {
      const result = await registryRequest<{ inserted: number; published: number; skipped: string[] }>('collection-starters', { authenticated: true, body: {} });
      setPrepareNotice(result.inserted + ' starter drafts prepared. Nothing was published.' + (result.skipped.length ? ' Some selections need missing source assets before they can be prepared.' : ''));
      remote.reload();
    } catch (error) {
      setPrepareError(error instanceof Error ? error.message : 'Could not prepare starter drafts.');
    } finally {
      setPreparing(false);
    }
  }
  if (query.collection) return <ExistingCollectionEditor {...props} />;`);
edit('src/components/AssetCollections.tsx', `        <button className="ri-primary" onClick={() => setCreate(true)}>
          <Plus size={15} /> New collection
        </button>`, `        <div className="dv2-starter-actions">
          <button disabled={preparing} onClick={() => void prepareStarters()}>
            {preparing ? 'Preparing drafts…' : 'Prepare starter drafts'}
          </button>
          <button className="ri-primary" onClick={() => setCreate(true)}>
            <Plus size={15} /> New collection
          </button>
        </div>`);
edit('src/components/AssetCollections.tsx', '      {!remote.data?.items.length && (', `      {prepareError && <p role="alert" className="ri-notice">{prepareError}</p>}
      {prepareNotice && <p role="status" className="ri-notice">{prepareNotice}</p>}
      {!remote.data?.items.length && (`);
edit('src/components/AssetCollections.tsx', 'Create a collection, or run the documented collections-seed command to prepare three\n            starter drafts.', 'Create a collection or prepare the starter drafts above. Inspect each selection, then publish deliberately.');

edit('tests/registry/intelligence.node.ts', 'assert.equal((await seedCollectionDrafts(registry)).inserted, 3);', 'assert.equal((await seedCollectionDrafts(registry)).inserted, 6);');
edit('tools/verify-registry.mjs', "      'tests/registry/intelligence.node.ts',", "      'tests/registry/intelligence.node.ts',\n      'tests/registry/discovery.node.ts',");

// Repair the fixture through its legitimate development cookie and retain diagnostics.
// Production auth is intentionally not modified by this assembly.
edit('tests/browser/intelligence.py', '    page=ctx.new_page();errors=[]', `    assert api('status')['role']=='curator', 'The local API fixture did not receive its curator cookie.'
    page=ctx.new_page();errors=[]`);
edit('tests/browser/intelligence.py', '    results=[]', `    api_failures=[]
    page.on('response', lambda response: api_failures.append({'url':response.url,'status':response.status}) if '/api/registry' in response.url and response.status>=400 else None)
    page.goto('http://127.0.0.1:3000/browse/assets',wait_until='networkidle')
    browser_status=page.evaluate("async () => (await fetch('/api/registry?action=status', {credentials:'same-origin'})).json()")
    print(json.dumps({'browserPreflight':browser_status,'cookieNames':[c['name'] for c in ctx.cookies()],'apiFailures':api_failures}),flush=True)
    assert browser_status['role']=='curator', 'The browser/proxy did not retain the issued development session.'
    results=[]`);
edit('tests/browser/intelligence.py', "            page.get_by_role('heading',name=heading,exact=True).wait_for()", `            try:
                page.get_by_role('heading',name=heading,exact=True).wait_for(timeout=15000)
            except Exception:
                page.screenshot(path=str(output / f'FAILED-{view}-{width}.png'),full_page=True)
                print(json.dumps({'view':view,'url':page.url,'headings':page.locator('h1,h2').all_text_contents(),'alerts':page.locator('[role=alert]').all_text_contents(),'apiFailures':api_failures,'pageErrors':errors}),flush=True)
                raise`);

// Node syntax and formatting are checked by the assembly workflow; full normal CI follows
// on the generated PR head. This temporary file is removed before that head is committed.
console.log('Discovery V2 integration applied.');
