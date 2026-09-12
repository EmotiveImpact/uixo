import { useState } from 'react';
import type { AssetRecord } from '../lib/asset-library';
import { safeAssetUrl } from '../lib/asset-library';

const FORM_CONTROLS = new Set([
  'checkbox',
  'field',
  'form',
  'input',
  'input-group',
  'input-otp',
  'label',
  'radio-group',
  'select',
  'slider',
]);
const OVERLAYS = new Set([
  'alert-dialog',
  'context-menu',
  'dialog',
  'drawer',
  'dropdown-menu',
  'hover-card',
  'popover',
  'sheet',
]);
const NAVIGATION = new Set(['breadcrumb', 'menubar', 'navigation-menu', 'pagination', 'sidebar']);

function ComponentPreview({ slug }: { slug: string }) {
  if (slug === 'accordion' || slug === 'collapsible')
    return (
      <div className="asset-demo asset-demo-stack">
        <span className="asset-demo-heading">Is it accessible?</span>
        <i>⌄</i>
        <span />
        <span className="asset-demo-heading">Is it styled?</span>
        <i>⌄</i>
        <span />
        <span className="asset-demo-heading">Is it animated?</span>
        <i>⌄</i>
      </div>
    );
  if (slug === 'alert')
    return (
      <div className="asset-demo asset-demo-alert">
        <b>✓</b>
        <span>
          <strong>Heads up</strong>
          <small>Your changes have been saved.</small>
        </span>
      </div>
    );
  if (slug === 'avatar' || slug === 'badge' || slug === 'item')
    return (
      <div className="asset-demo asset-demo-profile">
        <span className="asset-demo-avatar">UI</span>
        <span>
          <strong>Olivia Martin</strong>
          <small>Product designer</small>
        </span>
        <em>Active</em>
      </div>
    );
  if (slug === 'button' || slug === 'button-group')
    return (
      <div className="asset-demo asset-demo-buttons">
        <button type="button">Continue</button>
        <button type="button">Cancel</button>
      </div>
    );
  if (slug === 'calendar')
    return (
      <div className="asset-demo asset-demo-calendar">
        <strong>September 2026</strong>
        <span>Mo Tu We Th Fr Sa Su</span>
        <span>
          7 8 9 <b>10</b> 11 12 13
        </span>
      </div>
    );
  if (slug === 'card' || slug === 'carousel')
    return (
      <div className="asset-demo asset-demo-card">
        <span />
        <strong>Beautifully composed</strong>
        <small>A flexible surface for product content.</small>
      </div>
    );
  if (slug === 'chart' || slug === 'progress')
    return (
      <div className="asset-demo asset-demo-chart">
        <span style={{ height: '34%' }} />
        <span style={{ height: '58%' }} />
        <span style={{ height: '45%' }} />
        <span style={{ height: '82%' }} />
        <span style={{ height: '68%' }} />
      </div>
    );
  if (slug === 'command' || slug === 'combobox')
    return (
      <div className="asset-demo asset-demo-command">
        <span>⌕ Search commands…</span>
        <strong>
          Open dashboard <kbd>⌘ D</kbd>
        </strong>
        <strong>
          View settings <kbd>⌘ S</kbd>
        </strong>
      </div>
    );
  if (FORM_CONTROLS.has(slug))
    return (
      <div className="asset-demo asset-demo-form">
        <small>Email address</small>
        <span>name@example.com</span>
        <label>
          <i>✓</i> Remember me
        </label>
      </div>
    );
  if (NAVIGATION.has(slug))
    return (
      <div className="asset-demo asset-demo-nav">
        <strong>UIXO</strong>
        <span>Overview</span>
        <span className="active">Assets</span>
        <span>Settings</span>
      </div>
    );
  if (OVERLAYS.has(slug))
    return (
      <div className="asset-demo asset-demo-overlay">
        <span className="asset-demo-window">
          <strong>Share this asset</strong>
          <small>Anyone with the link can view it.</small>
          <i>Copy link</i>
        </span>
      </div>
    );
  if (slug === 'spinner')
    return (
      <div className="asset-demo asset-demo-spinner">
        <span />
      </div>
    );
  if (slug === 'separator')
    return (
      <div className="asset-demo asset-demo-separator">
        <strong>Account</strong>
        <span />
        <small>Profile settings</small>
      </div>
    );
  if (slug === 'skeleton')
    return (
      <div className="asset-demo asset-demo-skeleton">
        <i />
        <span />
        <span />
      </div>
    );
  return (
    <div className="asset-demo asset-demo-generic">
      <span />
      <span />
      <strong>{slug.replace(/-/g, ' ')}</strong>
    </div>
  );
}

export function AssetPreview({ asset }: { asset: AssetRecord }) {
  const [failedUrl, setFailedUrl] = useState('');
  const url = safeAssetUrl(asset.preview?.url);
  const original =
    asset.preview?.kind === 'image' && url && new URL(url).hostname === 'raw.githubusercontent.com';
  const showOriginal = original && failedUrl !== url;
  return (
    <div className={`asset-library-preview ${asset.kind === 'icon' ? 'is-icon' : ''}`}>
      {showOriginal ? (
        <img
          src={url}
          loading="lazy"
          alt={`${asset.name} original source preview`}
          onError={() => setFailedUrl(url)}
        />
      ) : asset.kind === 'component' ? (
        <ComponentPreview slug={asset.slug} />
      ) : (
        <div className="asset-library-no-preview">
          <span aria-hidden="true">◇</span>
          <strong>{asset.name}</strong>
        </div>
      )}
      <small>
        {showOriginal
          ? 'Original GitHub SVG'
          : asset.kind === 'component'
            ? 'UIXO preview · source code on GitHub'
            : 'Source preview not captured'}
      </small>
    </div>
  );
}
