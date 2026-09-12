import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PinnedComponentPreview } from './PinnedComponentPreview';
import { pinnedComponentSource, SHADCN_PREVIEW_REF } from './pinned-component-sources';

afterEach(cleanup);

describe('source-pinned component previews', () => {
  it.each([
    ['alert', '[data-slot="alert"]'],
    ['card', '[data-slot="card"]'],
    ['input', '[data-slot="input"]'],
    ['skeleton', '[data-slot="skeleton"]'],
    ['spinner', '[role="status"]'],
  ])('renders the reviewed %s primitive', (slug, selector) => {
    const { container } = render(<PinnedComponentPreview providerId="shadcn" slug={slug} />);
    expect(container.querySelector(selector)).not.toBeNull();
  });

  it('uses an immutable upstream source URL', () => {
    expect(pinnedComponentSource('shadcn', 'card')).toBe(
      `https://github.com/shadcn-ui/ui/blob/${SHADCN_PREVIEW_REF}/apps/v4/registry/new-york-v4/ui/card.tsx`,
    );
  });

  it('returns no render for an unreviewed component or another provider', () => {
    expect(pinnedComponentSource('shadcn', 'dialog')).toBeNull();
    expect(pinnedComponentSource('another-provider', 'card')).toBeNull();
    const { container } = render(
      <PinnedComponentPreview providerId="another-provider" slug="card" />,
    );
    expect(container.childElementCount).toBe(0);
  });
});
