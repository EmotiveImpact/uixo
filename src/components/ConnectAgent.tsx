import { Check, ChevronDown, Copy } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { CONNECT_CLIENTS, TRY_ASKING } from '../lib/connect-clients';

const TOOLS: [string, string][] = [
  ['Search components by what they do, framework and licence', 'search_assets'],
  ['Read a component’s variants, dependencies and where it comes from', 'inspect_asset'],
  ['Get a preview of the source', 'get_preview'],
  ['Check a component against your project’s requirements', 'check_compatibility'],
  ['Find where the source can be taken from', 'resolve_asset'],
  ['Get the install command, for you to approve before it runs', 'acquire_asset'],
  ['See how complete and current a source is', 'get_source_health'],
  ['List the curated collections', 'list_asset_collections'],
  ['Read a collection and its curator’s notes', 'inspect_asset_collection'],
];

function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2000);
  }
  return (
    <>
      <button
        type="button"
        className="cx-copy"
        data-state={state}
        aria-label={label}
        onClick={() => void copy()}
      >
        {state === 'copied' ? (
          <Check size={15} aria-hidden="true" />
        ) : (
          <Copy size={15} aria-hidden="true" />
        )}
        <span aria-hidden="true">{state === 'copied' ? 'Copied' : 'Copy'}</span>
      </button>
      <span className="sr-only" role="status">
        {state === 'copied' ? 'Copied.' : state === 'failed' ? 'Select the text to copy it.' : ''}
      </span>
    </>
  );
}

/** Connect page: pick a client, copy one block, then ask for a component by name. */
export function ConnectAgent() {
  const endpoint = `${window.location.origin}/api/mcp`;
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();
  const client = CONNECT_CLIENTS[active];
  const snippet = client.snippet(endpoint);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = CONNECT_CLIENTS.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? (active + 1) % CONNECT_CLIENTS.length
        : event.key === 'ArrowLeft'
          ? (active + last) % CONNECT_CLIENTS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : -1;
    if (next < 0) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="cx">
      <section className="cx-step" aria-labelledby={`${base}-add`}>
        <h2 id={`${base}-add`} className="cx-title">
          <span className="cx-num" aria-hidden="true">
            1
          </span>
          Add UIXO to your client
        </h2>
        <div className="cx-tabs" role="tablist" aria-label="Coding client">
          {CONNECT_CLIENTS.map((entry, index) => (
            <button
              key={entry.id}
              ref={(element) => {
                tabs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${entry.id}`}
              aria-selected={index === active}
              aria-controls={`${base}-panel`}
              tabIndex={index === active ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={onKeyDown}
            >
              {entry.name}
            </button>
          ))}
        </div>
        <div
          className="cx-panel"
          role="tabpanel"
          id={`${base}-panel`}
          aria-labelledby={`${base}-tab-${client.id}`}
        >
          <p className="cx-how">{client.how}</p>
          <div className="cx-block">
            <pre data-language={client.language}>
              <code>{snippet}</code>
            </pre>
            <CopyButton value={snippet} label={`Copy the ${client.name} setup`} />
          </div>
        </div>
      </section>

      <section className="cx-step" aria-labelledby={`${base}-ask`}>
        <h2 id={`${base}-ask`} className="cx-title">
          <span className="cx-num" aria-hidden="true">
            2
          </span>
          Try asking
        </h2>
        <ul className="cx-prompts">
          {TRY_ASKING.map((prompt) => (
            <li key={prompt}>
              <q>{prompt}</q>
            </li>
          ))}
        </ul>
        <p className="cx-note">
          Your agent gets the install command for you to approve. UIXO never runs it for you.
        </p>
      </section>

      <div className="cx-extra">
        <details className="cx-more">
          <summary>
            What your agent can do
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <ul className="cx-tools">
            {TOOLS.map(([plain, name]) => (
              <li key={name}>
                <span>{plain}</span>
                <code>{name}</code>
              </li>
            ))}
          </ul>
        </details>

        <details className="cx-more">
          <summary>
            Run it yourself
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <div className="cx-own">
            <h3>Local connection</h3>
            <p>From the UIXO repository, with dependencies installed:</p>
            <div className="cx-block">
              <pre data-language="shell">
                <code>npm run registry:mcp</code>
              </pre>
              <CopyButton value="npm run registry:mcp" label="Copy the local command" />
            </div>
            <h3>Vercel previews</h3>
            <p>
              Protected Vercel previews need deployment access. Point your client at a deployment it
              can reach.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
