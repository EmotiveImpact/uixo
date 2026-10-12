import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { ArrowRight, Check } from 'lucide-react';

/**
 * The homepage's wide "Connect your AI agent" band. The terminal replays one real
 * session shape: the UIXO MCP tools (`search_assets`, `resolve_asset`) find the piece and
 * return its install command, and the coding client runs and wires it in.
 */

const PROMPT = 'add a shimmer button to my hero';

const STEPS = [
  <>
    <span className="dot" />
    <span className="t">uixo</span> <span className="m">search_assets</span>{' '}
    <span className="s">&quot;shimmer button&quot;</span>
  </>,
  <>
    <span className="tree">└</span>Shimmer Button <span className="m">· Magic UI · Free · MIT</span>
  </>,
  <>
    <span className="dot" />
    <span className="t">uixo</span> <span className="m">resolve_asset</span>{' '}
    <span className="s">&quot;magic-ui/shimmer-button&quot;</span>
  </>,
  <>
    <span className="tree">└</span>
    <span className="m">npx shadcn add https://magicui.design/r/shimmer-button.json</span>
  </>,
  <>
    <span className="dot b" />
    <span className="t">Bash</span> <span className="m">npx shadcn add …/shimmer-button.json</span>
  </>,
  <>
    <span className="tree">└</span>
    <span className="ok">✔</span> Created components/ui/shimmer-button.tsx
  </>,
  <>
    <span className="dot g" />
    <span className="t">Edit</span> <span className="m">app/page.tsx</span>
  </>,
  <>
    <span className="tree">└</span>
    <span className="add">+ &lt;ShimmerButton&gt;Start free trial&lt;/ShimmerButton&gt;</span>
  </>,
];

const CLIENTS: [string, string, string][] = [
  ['Claude Code', 'C', '#d97757'],
  ['Cursor', 'C', '#0a0a0a'],
  ['VS Code', 'V', '#0a7acc'],
  ['Windsurf', 'W', '#0f9b8e'],
];

type Frame = { typed: number; lines: number; result: boolean; added: boolean; done: boolean };
const FINAL: Frame = { typed: 0, lines: STEPS.length, result: true, added: true, done: true };
const EMPTY: Frame = { typed: 0, lines: -1, result: false, added: false, done: false };

/** Each step of the replay, with how long to hold it. */
function timeline(): [Frame, number][] {
  const frames: [Frame, number][] = [[EMPTY, 700]];
  for (let typed = 1; typed <= PROMPT.length; typed += 1) frames.push([{ ...EMPTY, typed }, 38]);
  frames.push([{ ...EMPTY, typed: PROMPT.length }, 450]);
  frames.push([{ ...EMPTY, lines: 0 }, 500]);
  for (let lines = 1; lines <= STEPS.length; lines += 1)
    frames.push([{ ...EMPTY, lines, result: lines >= 6 }, lines % 2 ? 760 : 520]);
  frames.push([{ ...FINAL, done: false }, 500]);
  frames.push([FINAL, 5200]);
  return frames;
}

export function AgentBand({
  href,
  guideHref,
  onFollow,
}: {
  href: string;
  guideHref: string;
  onFollow: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<Frame>(FINAL);
  useEffect(() => {
    const element = stage.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const frames = timeline();
    let index = 0;
    let timer = 0;
    const play = () => {
      const [next, hold] = frames[index];
      setFrame(next);
      index = (index + 1) % frames.length;
      timer = window.setTimeout(play, hold);
    };
    const observer = new IntersectionObserver(([entry]) => {
      window.clearTimeout(timer);
      if (entry.isIntersecting) play();
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <section className="hm-band" aria-labelledby="agent-title">
      <div className="hm-band-copy">
        <p className="hm-kicker">For developers · MCP</p>
        <h2 id="agent-title">Connect your AI agent</h2>
        <p>
          Ask for a component by name in your editor. Your agent searches UIXO, checks the licence
          and gets the install command, then adds the piece to your page.
        </p>
        <ul className="hm-clients" aria-label="Works with MCP clients such as">
          {CLIENTS.map(([name, glyph, colour]) => (
            <li key={name}>
              <i style={{ background: colour } as CSSProperties} aria-hidden="true">
                {glyph}
              </i>
              {name}
            </li>
          ))}
        </ul>
        <div className="hm-band-actions">
          <a className="hm-btn-main" href={href} onClick={(event) => onFollow(event, href)}>
            Set up in a minute
            <ArrowRight size={16} aria-hidden="true" />
          </a>
          <a
            className="hm-btn-ghost"
            href={guideHref}
            onClick={(event) => onFollow(event, guideHref)}
          >
            How to use UIXO
          </a>
        </div>
      </div>
      <div
        className="hm-band-stage g-tint"
        style={{ '--h': 252 } as CSSProperties}
        ref={stage}
        aria-hidden="true"
      >
        <div className="hm-term">
          <div className="hm-tbar">
            <i />
            <i />
            <i />
            <span>~/my-site · claude</span>
          </div>
          <div className="hm-tbody">
            {frame.lines >= 0 && (
              <div className="you">
                <b>›</b> {PROMPT}
              </div>
            )}
            {STEPS.slice(0, Math.max(frame.lines, 0)).map((step, n) => (
              <div key={n}>{step}</div>
            ))}
            {frame.done && (
              <div className="fin">Done. Your hero now opens with a Shimmer Button.</div>
            )}
          </div>
          <div className="hm-tin">
            <span className="pr">›</span>
            {frame.typed > 0 ? (
              <span>{PROMPT.slice(0, frame.typed)}</span>
            ) : (
              frame.lines !== 0 && <span className="ph">Ask for any component</span>
            )}
            <span className="cur" />
          </div>
        </div>
        <div className={`hm-browser ${frame.result ? 'on' : ''}`}>
          <div className="hm-bbar">
            <i />
            <i />
            <i />
            <span>localhost:3000</span>
          </div>
          <div className="hm-bbody">
            <small>Now in beta</small>
            <h4>Launch in a weekend</h4>
            <p />
            <p />
            <div className="hm-bcta">
              <span className={`hm-slot ${frame.added ? 'on' : ''}`}>
                <span className="ph" />
                <span className="hm-shimmer">Start free trial</span>
                <span className="added">
                  <Check size={10} />
                  Added
                </span>
              </span>
              <span className="gh">Docs</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
