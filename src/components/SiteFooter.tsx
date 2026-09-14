import type { ReactNode } from 'react';
import { Copyright } from './Copyright';
import { MadeIn } from './MadeIn';

type SiteFooterProps = { count: number | null; assets?: boolean; children?: ReactNode };

export function SiteFooter({ count, assets = false, children }: SiteFooterProps) {
  const description = [
    count === null ? null : `${count} website${count === 1 ? '' : 's'}`,
    assets ? 'UIXO keeps the index. Creators keep the credit.' : 'Handpicked, not scraped.',
    'Curated for the curious.',
    'A little corner of the internet.',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <footer className="site-footer">
      <div className="footer-group footer-intro">
        <span className="footer-description">{description}</span>
      </div>
      {children}
      <div className="footer-group footer-meta">
        <MadeIn />
        <Copyright />
      </div>
    </footer>
  );
}
