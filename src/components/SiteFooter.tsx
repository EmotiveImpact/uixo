import type { ReactNode } from 'react';
import { Copyright } from './Copyright';
import { MadeIn } from './MadeIn';

type SiteFooterProps = { count: number | null; assets?: boolean; children?: ReactNode };

export function SiteFooter({ count, assets = false, children }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <span className="footer-group">
        {count !== null && (
          <span>
            {count} website{count === 1 ? '' : 's'}
          </span>
        )}
        <span>
          {assets ? 'UIXO keeps the index. Creators keep the credit.' : 'Handpicked, not scraped.'}
        </span>
        <span className="footer-note">
          Curated for the curious.
          <br />A little corner of the internet.
        </span>
      </span>
      {children}
      <span className="footer-group">
        <MadeIn />
        <Copyright />
      </span>
    </footer>
  );
}
