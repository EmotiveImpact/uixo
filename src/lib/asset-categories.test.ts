import { describe, expect, it } from 'vitest';
import { assetHref, readAssetQuery } from './asset-library';
import { componentCategory } from '../../shared/component-categories';

describe('component category routes', () => {
  it('retains combined category filters in shareable URLs', () => {
    const query = readAssetQuery(
      '?kind=component&category=forms&provider=shadcn&q=switch&view=saved',
    );
    expect(readAssetQuery(assetHref(query).split('?')[1])).toEqual(query);
    expect(query.category).toBe('forms');
  });
  it('routes old icon discovery links to packs without changing saved detail IDs', () => {
    expect(readAssetQuery('?kind=icon&id=lucide/activity')).toMatchObject({
      kind: 'icon-pack',
      id: 'lucide/activity',
    });
  });
  it('rejects unknown categories and distinguishes common component purposes', () => {
    expect(readAssetQuery('?category=invalid').category).toBe('');
    expect(componentCategory('tabs')).toBe('navigation');
    expect(componentCategory('switch')).toBe('forms');
    expect(componentCategory('table')).toBe('data-display');
    expect(componentCategory('tooltip')).toBe('overlays');
  });
  it('files names the first rules miss without moving any they already placed', () => {
    expect(componentCategory('prompt-input')).toBe('forms');
    expect(componentCategory('chain-of-thought')).toBe('ai');
    expect(componentCategory('date-picker')).toBe('forms');
    expect(componentCategory('widget-study-timer')).toBe('data-display');
    expect(componentCategory('s12')).toBe('media');
    expect(componentCategory('kbd')).toBe('text');
    expect(componentCategory('zzz-unknown')).toBe('other');
  });
});
