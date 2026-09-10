import { Compass } from 'lucide-react';

type NotFoundProps = { onReset: () => void };

export function NotFound({ onReset }: NotFoundProps) {
  return (
    <section className="empty" aria-labelledby="notfound-heading">
      <Compass size={26} />
      <h2 id="notfound-heading">That page has moved on.</h2>
      <p>The link may be out of date, or the listing may have been retired.</p>
      <button onClick={onReset}>Back to all websites</button>
    </section>
  );
}
