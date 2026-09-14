import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SemanticComponentPreview } from './SemanticComponentPreview';
import { semanticPreviewFamily } from './semantic-preview';

afterEach(cleanup);

describe('semantic component previews', () => {
  it.each([
    ['iphone-15-pro', 'device'],
    ['terminal', 'code'],
    ['rainbow-button', 'button'],
    ['morphing-dialog', 'dialog'],
    ['number-ticker', 'number'],
    ['animated-gradient-text', 'text'],
    ['grid-pattern', 'pattern'],
    ['image-comparison', 'media'],
    ['dock', 'navigation'],
    ['animated-list', 'list'],
    ['border-beam', 'effect'],
    ['magic-card', 'effect'],
  ])('maps %s to a %s illustration', (slug, family) => {
    expect(semanticPreviewFamily(slug)).toBe(family);
  });

  it('renders different structures for different component families', () => {
    const first = render(
      <SemanticComponentPreview providerId="magic-ui" slug="iphone-15-pro" name="iPhone" />,
    );
    expect(first.container.querySelector('[data-preview-family="device"]')).not.toBeNull();
    first.unmount();

    const second = render(
      <SemanticComponentPreview
        providerId="motion-primitives"
        slug="text-shimmer"
        name="Text Shimmer"
      />,
    );
    expect(second.container.querySelector('[data-preview-family="text"]')).not.toBeNull();
  });
});
