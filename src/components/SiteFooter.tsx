import { Copyright } from './Copyright';
import { MadeIn } from './MadeIn';

type SiteFooterProps = { count: number | null };

export function SiteFooter({ count }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <span className="footer-group">
        <span>{count === null ? '' : `${count} website${count === 1 ? '' : 's'}`}</span>
        <span>Handpicked, not scraped.</span>
      </span>
      <span className="footer-group">
        <MadeIn />
        <Copyright />
      </span>
    </footer>
  );
}
