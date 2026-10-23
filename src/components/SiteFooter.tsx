import type { MouseEvent, ReactNode } from 'react';
import { Copyright } from './Copyright';
import { MadeIn } from './MadeIn';
import { navigateInApp } from '../lib/navigation';
import { Logomark } from './discovery/DiscoveryHeader';

type SiteFooterProps = { count?: number | null; assets?: boolean; children?: ReactNode };

const COLUMNS = [
  {
    title: 'Browse',
    links: [
      ['Components', '/browse/assets?kind=component'],
      ['Icon packs', '/browse/assets?kind=icon-pack'],
      ['Fonts', '/browse/assets?kind=font'],
      ['Websites and libraries', '/browse'],
    ],
  },
  {
    title: 'Curated',
    links: [
      ['Collections', '/collections'],
      ['New this week', '/browse?browse=Recent'],
      ['Saved', '/browse/assets?view=saved'],
    ],
  },
  {
    title: 'For developers',
    links: [
      ['Connect your AI agent', '/browse/assets?view=connect'],
      ['How to use UIXO', '/browse/assets?view=guide'],
      ['Component sources', '/browse/assets?view=sources'],
    ],
  },
] as const;

function follow(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
    return;
  event.preventDefault();
  navigateInApp(event.currentTarget.getAttribute('href') ?? '/');
}

/** One footer for every page: the catalogue's map, then who made it. */
export function SiteFooter({ children }: SiteFooterProps) {
  return (
    <footer className="site-footer site-footer-map">
      <div className="footer-brand">
        <a className="footer-logo" href="/" onClick={follow} aria-label="UIXO home">
          <Logomark />
          <strong>UIXO</strong>
        </a>
        <p>
          A gallery of live components and the sites worth a new tab. Find it, try it, take it into
          your build.
        </p>
      </div>
      {COLUMNS.map((column) => (
        <nav className="footer-column" aria-label={column.title} key={column.title}>
          <h2>{column.title}</h2>
          {column.links.map(([label, href]) => (
            <a key={href} href={href} onClick={follow}>
              {label}
            </a>
          ))}
        </nav>
      ))}
      {children && <div className="footer-extra">{children}</div>}
      <div className="footer-group footer-meta">
        <span>Creators keep the credit. UIXO keeps the index.</span>
        <span className="footer-meta-end">
          <MadeIn />
          <Copyright />
        </span>
      </div>
    </footer>
  );
}
