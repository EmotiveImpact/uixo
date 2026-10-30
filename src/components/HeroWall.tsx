import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react';
import tiles from '../lib/hero-wall.json';
import { stageHue } from '../lib/stage-hue';

/**
 * The hero's drifting wall of real catalogue components. Each tile is a capture of the
 * component's own demo (scripts/capture-hero-wall.mjs) and opens its page. The wall is
 * decoration for assistive technology, which reaches the same components through the
 * shelf and search, so it is hidden from it and its links take no keyboard focus. It
 * pauses under the pointer, when the hero leaves the screen, and for reduced motion.
 */

type Tile = (typeof tiles)[number];

const COLUMNS = 9;
const PER_COLUMN = 10;

function column(index: number): Tile[] {
  // Ten different tiles per column, starting seven apart, so neighbours never match.
  return Array.from({ length: PER_COLUMN }, (_, n) => tiles[(index * 7 + n) % tiles.length]);
}

export function HeroWall({
  href,
  onOpen,
}: {
  href: (id: string) => string;
  onOpen: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const wall = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = wall.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset.paused = entry.isIntersecting ? 'false' : 'true';
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="hm-wall" ref={wall} aria-hidden="true" data-paused="false">
      <div className="hm-wall-in">
        {Array.from({ length: COLUMNS }, (_, index) => {
          const pieces = column(index);
          const run = (copy: string) =>
            pieces.map((tile, n) => {
              const link = href(tile.id);
              return (
                <a
                  key={`${copy}${n}`}
                  className="wt"
                  href={link}
                  tabIndex={-1}
                  onClick={(event) => onOpen(event, link)}
                  style={{ '--h': stageHue(tile.id) } as CSSProperties}
                >
                  <span className="wt-stage g-tint">
                    <img
                      className="wt-dark"
                      src={`/hero-wall/${tile.file}-dark.webp`}
                      alt=""
                      width={180}
                      height={135}
                      loading="lazy"
                      decoding="async"
                    />
                    <img
                      className="wt-light"
                      src={`/hero-wall/${tile.file}-light.webp`}
                      alt=""
                      width={180}
                      height={135}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="wt-name">
                    {tile.name}
                    <small>{tile.provider}</small>
                  </span>
                </a>
              );
            });
          return (
            <div className="wcol" key={index}>
              <div className="wtrack" style={{ '--d': `${90 + index * 9}s` } as CSSProperties}>
                {run('a')}
                {run('b')}
              </div>
            </div>
          );
        })}
      </div>
      {/* Where the wall fades behind the heading and search, a click lands on nothing. */}
      <div className="hm-wall-shield" />
    </div>
  );
}
