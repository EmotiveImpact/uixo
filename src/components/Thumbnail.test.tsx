import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Thumbnail } from './Thumbnail';
import withVariants from '../content/thumbnails.json';

/**
 * A <picture> whose chosen <source> 404s does not fall back to its <img> — it errors. So a
 * listing whose WebP has not been generated must be offered the PNG only.
 */
describe('Thumbnail', () => {
  const known = (withVariants as string[])[0];

  it('offers WebP for an id that has variants', () => {
    const { container } = render(
      <Thumbnail id={known} alt="" sizes="100px" onError={() => undefined} />,
    );
    expect(container.querySelector('source')).not.toBeNull();
    expect(container.querySelector('source')?.getAttribute('srcset')).toContain(
      `${known}-400.webp`,
    );
  });

  it('offers no WebP source for an id that has none, so the PNG is used', () => {
    const { container } = render(
      <Thumbnail id="not-generated-yet" alt="" sizes="100px" onError={() => undefined} />,
    );
    expect(container.querySelector('source')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/not-generated-yet.png',
    );
  });

  it('always renders the png img regardless', () => {
    for (const id of [known, 'not-generated-yet']) {
      const { container } = render(
        <Thumbnail id={id} alt="x" sizes="100px" onError={() => undefined} />,
      );
      expect(container.querySelector('img')?.getAttribute('src')).toBe(`/assets/${id}.png`);
    }
  });
});
