import { Fragment, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, Bell, Camera, Check, House, Mail, Music, Search } from 'lucide-react';

/**
 * The hero's drifting wall of miniature components. Purely decorative: it is hidden
 * from assistive technology and pauses when the hero leaves the screen or when the
 * visitor prefers reduced motion.
 */

const Star = () => (
  <svg viewBox="0 0 24 24">
    <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
  </svg>
);

const DOCK: [ReactNode, string][] = [
  [<House key="h" />, '#3b82f6,#1d4ed8'],
  [<Search key="s" />, '#a855f7,#6d28d9'],
  [<Music key="m" />, '#f43f5e,#be123c'],
  [<Mail key="e" />, '#22c55e,#15803d'],
  [<Camera key="c" />, '#f59e0b,#b45309'],
];

const Piece = ({ className = '', children }: { className?: string; children: ReactNode }) => (
  <div className={`wp ${className}`}>{children}</div>
);

const PIECES: Record<string, () => ReactNode> = {
  btn: () => (
    <Piece className="wc">
      <span className="w-btn">
        Get started
        <ArrowRight />
      </span>
    </Piece>
  ),
  grad: () => (
    <Piece className="wc">
      <span className="w-grad">Upgrade plan</span>
    </Piece>
  ),
  toggle: () => (
    <Piece className="wr">
      <div>
        <b>Dark mode</b>
        <small>Follow the system</small>
      </div>
      <span className="w-tg">
        <i />
      </span>
    </Piece>
  ),
  input: () => (
    <Piece>
      <span className="w-lab">Email</span>
      <div className="w-in">
        you@studio.com
        <span className="w-caret" />
      </div>
    </Piece>
  ),
  avatars: () => (
    <Piece className="wr">
      <div className="w-av">
        <i style={{ background: '#f97316' }}>AK</i>
        <i style={{ background: '#8b5cf6' }}>EM</i>
        <i style={{ background: '#0ea5e9' }}>JO</i>
        <i style={{ background: '#10b981' }}>RS</i>
      </div>
      <small>Editing now</small>
    </Piece>
  ),
  chart: () => (
    <Piece>
      <b>This week</b>
      <small>Installs by day</small>
      <div className="w-bars">
        {[5, 8, 6, 9, 7, 10, 8].map((height, n) => (
          <i key={n} style={{ height: `${height * 10}%`, '--n': n } as CSSProperties} />
        ))}
      </div>
    </Piece>
  ),
  dock: () => (
    <Piece className="wc">
      <div className="w-dock">
        {DOCK.map(([icon, gradient], n) => (
          <i key={n} style={{ background: `linear-gradient(160deg,${gradient})` }}>
            {icon}
          </i>
        ))}
      </div>
    </Piece>
  ),
  cal: () => (
    <Piece>
      <b>October</b>
      <div className="w-cal">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, n) => (
          <span key={`d${n}`} className="h">
            {day}
          </span>
        ))}
        {Array.from({ length: 21 }, (_, n) => n + 1).map((day) => (
          <span
            key={day}
            className={day === 9 || day === 13 ? 's' : day > 9 && day < 13 ? 'r' : ''}
          >
            {day}
          </span>
        ))}
      </div>
    </Piece>
  ),
  toast: () => (
    <Piece className="w-toast">
      <span className="w-ok">
        <Check />
      </span>
      <div>
        <b>Copied</b>
        <small>Paste it in your terminal</small>
      </div>
    </Piece>
  ),
  badges: () => (
    <Piece className="wc w-badges">
      <span className="b-new">New</span>
      <span className="b-beta">Beta</span>
      <span className="b-free">Free</span>
    </Piece>
  ),
  slider: () => (
    <Piece>
      <b>Volume</b>
      <div className="w-sl">
        <i />
        <b />
      </div>
    </Piece>
  ),
  seg: () => (
    <Piece className="wc">
      <div className="w-seg">
        <span className="on">Day</span>
        <span>Week</span>
        <span>Month</span>
      </div>
    </Piece>
  ),
  otp: () => (
    <Piece className="wc">
      <div className="w-otp">
        <i>4</i>
        <i>2</i>
        <i>7</i>
        <i className="act" />
      </div>
    </Piece>
  ),
  kbd: () => (
    <Piece className="wc">
      <span className="w-kbd">⌘</span>
      <span className="w-kbd">K</span>
    </Piece>
  ),
  ring: () => (
    <Piece className="wr">
      <svg className="w-ring" viewBox="0 0 40 40">
        <circle className="tr" cx="20" cy="20" r="16" />
        <circle
          className="pg"
          cx="20"
          cy="20"
          r="16"
          pathLength={100}
          transform="rotate(-90 20 20)"
        />
      </svg>
      <div>
        <b>Uploading</b>
        <small>hero-video.mp4</small>
      </div>
    </Piece>
  ),
  checks: () => (
    <Piece className="w-checks">
      {['Hero', 'Pricing', 'Footer'].map((label, n) => (
        <span className="w-check" key={label}>
          <i className={n < 2 ? 'on' : ''}>{n < 2 && <Check />}</i>
          {label}
        </span>
      ))}
    </Piece>
  ),
  player: () => (
    <Piece className="wr">
      <span className="w-art" />
      <div className="w-grow">
        <b>Night drive</b>
        <div className="w-prog">
          <i />
        </div>
      </div>
      <span className="w-play">
        <svg viewBox="0 0 24 24">
          <path d="M7 4v16l13-8z" />
        </svg>
      </span>
    </Piece>
  ),
  aurora: () => (
    <Piece className="wc">
      <span className="w-aur">Ship it</span>
    </Piece>
  ),
  shimmer: () => (
    <Piece className="wc">
      <span className="w-shim">Shimmer Button</span>
    </Piece>
  ),
  tabs: () => (
    <Piece>
      <div className="w-tabs">
        <span className="on">Preview</span>
        <span>Code</span>
      </div>
      <div className="w-skel">
        <i />
        <i />
      </div>
    </Piece>
  ),
  swatch: () => (
    <Piece className="wc">
      <div className="w-sw">
        {['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'].map((colour) => (
          <i key={colour} style={{ background: colour }} />
        ))}
      </div>
    </Piece>
  ),
  search: () => (
    <Piece>
      <div className="w-search">
        <Search />
        Search
        <kbd>⌘K</kbd>
      </div>
    </Piece>
  ),
  stars: () => (
    <Piece>
      <b>Rate this</b>
      <div className="w-stars">
        {Array.from({ length: 5 }, (_, n) => (
          <Star key={n} />
        ))}
      </div>
    </Piece>
  ),
  notif: () => (
    <Piece className="wr">
      <span className="w-bell">
        <Bell />
        <i />
      </span>
      <div>
        <b>New comment</b>
        <small>Ama replied to you</small>
      </div>
    </Piece>
  ),
};

const COLUMNS = [
  ['toggle', 'chart', 'badges', 'input', 'player', 'kbd'],
  ['shimmer', 'cal', 'toast', 'seg', 'avatars', 'ring'],
  ['dock', 'input', 'stars', 'grad', 'checks', 'search'],
  ['notif', 'slider', 'otp', 'tabs', 'aurora', 'toast'],
  ['avatars', 'btn', 'swatch', 'chart', 'toggle', 'cal'],
  ['grad', 'checks', 'ring', 'dock', 'notif', 'slider'],
  ['tabs', 'aurora', 'search', 'player', 'badges', 'otp'],
  ['seg', 'stars', 'toast', 'btn', 'cal', 'shimmer'],
  ['kbd', 'toggle', 'chart', 'swatch', 'input', 'notif'],
];

export function HeroWall() {
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
        {COLUMNS.map((column, index) => {
          // Ten pieces per column before it loops, so nothing repeats within view.
          const pieces = column.concat(COLUMNS[(index + 4) % COLUMNS.length].slice(0, 4));
          const run = (copy: string) =>
            pieces.map((key, n) => <Fragment key={`${copy}${n}`}>{PIECES[key]()}</Fragment>);
          return (
            <div className="wcol" key={index}>
              <div className="wtrack" style={{ '--d': `${70 + index * 9}s` } as CSSProperties}>
                {run('a')}
                {run('b')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
