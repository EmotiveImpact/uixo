import type { CSSProperties, ReactNode } from 'react';
import { semanticPreviewFamily } from './semantic-preview';
import type { SemanticPreviewFamily } from './semantic-preview';

function previewHue(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % 360;
}

function artwork(family: SemanticPreviewFamily, name: string): ReactNode {
  const shortName = name.length > 21 ? `${name.slice(0, 20)}…` : name;
  if (family === 'device')
    return (
      <span className="semantic-device">
        <i />
        <b>{shortName}</b>
        <em />
      </span>
    );
  if (family === 'code')
    return (
      <span className="semantic-code">
        <i />
        <i />
        <i />
        <i />
        <b>{shortName}</b>
      </span>
    );
  if (family === 'button')
    return (
      <span className="semantic-button">
        <i />
        <b>{shortName}</b>
      </span>
    );
  if (family === 'dialog')
    return (
      <span className="semantic-dialog">
        <i />
        <b>{shortName}</b>
        <small>A focused interface moment</small>
        <em>Continue</em>
      </span>
    );
  if (family === 'number')
    return (
      <span className="semantic-number">
        <i>
          <b>72</b>
        </i>
        <strong>{shortName}</strong>
      </span>
    );
  if (family === 'text')
    return (
      <span className="semantic-text">
        <small>TYPE / MOTION</small>
        <b>{shortName}</b>
        <i />
      </span>
    );
  if (family === 'pattern')
    return (
      <span className="semantic-pattern">
        {Array.from({ length: 24 }, (_, index) => (
          <i key={index} />
        ))}
        <b>{shortName}</b>
      </span>
    );
  if (family === 'media')
    return (
      <span className="semantic-media">
        <i />
        <i />
        <em />
        <b>{shortName}</b>
      </span>
    );
  if (family === 'navigation')
    return (
      <span className="semantic-navigation">
        <b>{shortName}</b>
        <span>
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <em />
      </span>
    );
  if (family === 'list')
    return (
      <span className="semantic-list">
        <b>{shortName}</b>
        {Array.from({ length: 3 }, (_, index) => (
          <i key={index}>
            <em />
            <span />
          </i>
        ))}
      </span>
    );
  if (family === 'effect')
    return (
      <span className="semantic-effect">
        <i />
        <i />
        <b>{shortName}</b>
      </span>
    );
  return (
    <span className="semantic-layout">
      <i />
      <i />
      <i />
      <b>{shortName}</b>
    </span>
  );
}

export function SemanticComponentPreview({
  providerId,
  slug,
  name,
}: {
  providerId: string;
  slug: string;
  name: string;
}) {
  const family = semanticPreviewFamily(slug);
  const hue = previewHue(`${providerId}/${slug}`);
  const style = {
    '--preview-accent': `hsl(${hue} 88% 64%)`,
    '--preview-accent-soft': `hsl(${(hue + 42) % 360} 82% 58% / 0.3)`,
  } as CSSProperties;

  return (
    <div
      className={`asset-semantic-preview is-${family}`}
      data-preview-family={family}
      style={style}
    >
      {artwork(family, name)}
    </div>
  );
}
