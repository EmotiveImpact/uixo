import type { MouseEvent, ReactNode } from 'react';
import { Copyright } from './Copyright';
import { MadeIn } from './MadeIn';
import { navigateInApp } from '../lib/navigation';

type SiteFooterProps = { count?: number | null; assets?: boolean; children?: ReactNode };

const COLUMNS = [
  {
    title: 'Browse',
    links: [
      ['Components', '/browse/assets?kind=component'],
      ['Icon packs', '/browse/assets?kind=icon-pack'],
      ['Fonts', '/browse/assets?kind=font'],
      ['All resources', '/browse'],
    ],
  },
  {
    title: 'Curated',
    links: [
      ['Collections', '/collections'],
      ['New this week', '/browse?browse=Recent'],
      ['Saved components', '/browse/assets?view=saved'],
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
        <strong>UIXO</strong>
        <p>Hand-picked components and resources, with the original source one click away.</p>
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
        <MadeIn />
        <Copyright />
      </div>
    </footer>
  );
}
