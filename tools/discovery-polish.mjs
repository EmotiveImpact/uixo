import { readFileSync, writeFileSync } from 'node:fs';
function edit(path, before, after) {
  const content = readFileSync(path, 'utf8');
  if (!content.includes(before)) throw new Error('Expected source anchor missing: ' + path);
  writeFileSync(path, content.replace(before, after));
}
edit('src/components/RegistryExplore.tsx', 'export const EXPLORE_VIEWS', 'const EXPLORE_VIEWS');
edit('src/components/RegistryExplore.tsx', 'export const CURATOR_VIEWS', 'const CURATOR_VIEWS');
edit('src/components/AssetDetail.tsx', "import { AssetPreview }", "import { AssetProvenance } from './AssetProvenance';\nimport { AssetPreview }");
edit('src/components/AssetDetail.tsx', '            <label className="asset-library-field asset-variant-field">', `            <AssetProvenance asset={asset} variantId={variant} providerName={nameOf(asset.providerId)} />
            <label className="asset-library-field asset-variant-field">`);
edit('src/components/AssetWorkspace.tsx', "import { FeaturedCollections }", "import { RegistryReadiness } from './RegistryReadiness';\nimport { FeaturedCollections }");
edit('src/components/AssetWorkspace.tsx', '        <SaveSyncNotice\n          label="Asset favourites"', '        <RegistryReadiness />\n        <SaveSyncNotice\n          label="Asset favourites"');
edit('src/components/AssetUtilities.tsx', 'Saved assets currently stay in this browser.', 'Guest saves stay in this browser. Sign in to synchronise assets across devices.');
edit('src/components/AssetUtilities.tsx', 'This preview requires Vercel deployment access. Public client setup will use the\n              production endpoint after release.', 'Protected Vercel previews require deployment access. Use an accessible deployment endpoint\n              for your coding client. Acquisition tools return instructions; they do not install code.');
edit('registry/mcp.ts', "name: 'uixo', version: '0.2.0'", "name: 'uixo', version: '0.3.0'");
const packagePath = 'package.json';
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
pkg.scripts['registry:test'] += ' tests/registry/discovery.node.ts';
pkg.scripts['registry:verify-release'] = 'node --experimental-strip-types registry/verify-release.ts';
writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
edit('tools/registry-db.ts', "import { seedCollectionDrafts }", "import { publishNewStarterCollections } from '../registry/release-collections.ts';\nimport { intelligenceReadiness } from '../registry/readiness.ts';\nimport { seedCollectionDrafts }");
edit('tools/registry-db.ts', "['migrate', 'seed', 'sync', 'index', 'collections-seed']", "['migrate', 'seed', 'sync', 'index', 'collections-seed', 'readiness', 'collections-publish-new']");
edit('tools/registry-db.ts', "  if (command === 'collections-seed')", `  if (command === 'readiness') console.log(JSON.stringify(await intelligenceReadiness(registry)));
  if (command === 'collections-publish-new') {
    const actor = process.env.UIXO_OPERATOR_ID || '';
    const reason = process.env.UIXO_EDITORIAL_REASON || '';
    if (!process.argv.includes('--publish-reviewed'))
      throw new Error('Explicit --publish-reviewed acknowledgement, UIXO_OPERATOR_ID and UIXO_EDITORIAL_REASON are required. Existing drafts and withdrawals are never overwritten.');
    console.log(JSON.stringify(await publishNewStarterCollections(registry, actor, reason)));
  }
  if (command === 'collections-seed')`);
edit('tools/registry-db.ts', 'migrate|seed|sync|index|collections-seed [provider-id]', 'migrate|seed|sync|index|collections-seed|readiness|collections-publish-new [provider-id]');
const css = 'src/components/discovery-v2.css';
writeFileSync(css, readFileSync(css, 'utf8') + `
.dv2-provenance-heading { display: flex; align-items: center; justify-content: space-between; gap: 15px; }
.dv2-provenance-heading h3 { margin: 0; font-size: 16px; font-weight: 500; }
.dv2-provenance-heading a { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--foreground); text-decoration: none; }
.dv2-provenance-note { font-size: 11px; line-height: 1.7; color: var(--muted-foreground); }
.dv2-provenance code { overflow-wrap: anywhere; font-size: 11px; }
`);
// Preserve full build evidence as artifacts while keeping failure output useful.
edit('.github/workflows/ci.yml', '        run: npm test', `        run: |
          mkdir -p test-results/intelligence
          npm test > test-results/intelligence/application.log 2>&1 || { tail -n 120 test-results/intelligence/application.log; exit 1; }
          tail -n 14 test-results/intelligence/application.log`);
edit('.github/workflows/ci.yml', '        run: npm run build', `        run: |
          mkdir -p test-results/intelligence
          npm run build > test-results/intelligence/build.log 2>&1 || { tail -n 150 test-results/intelligence/build.log; exit 1; }
          grep -E '# tests|# pass|# fail|Verified|prerendered' test-results/intelligence/build.log`);
edit('.github/workflows/ci.yml', '          python tests/browser/intelligence.py', `          python tests/browser/intelligence.py
          npm run registry:verify-release -- http://127.0.0.1:4175 | tee test-results/intelligence/network-acceptance.log`);
console.log('Source evidence, readiness and network acceptance integrated.');
