import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import {
  PACKAGE_MANAGERS,
  forPackageManager,
  hasPackageManagerVariants,
  readPackageManager,
  writePackageManager,
} from '../lib/package-manager';
import type { PackageManager } from '../lib/package-manager';

/** The install line with npm, pnpm, bun and yarn tabs. The choice is remembered. */
export function InstallCommand({ command }: { command: string }) {
  const [manager, setManager] = useState<PackageManager>(readPackageManager);
  const [copied, setCopied] = useState<'yes' | 'failed' | ''>('');
  const variants = hasPackageManagerVariants(command);
  const shown = variants ? forPackageManager(command, manager) : command;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shown);
      setCopied('yes');
    } catch {
      setCopied('failed');
    }
    window.setTimeout(() => setCopied(''), 1800);
  }

  return (
    <div className="install-command">
      <div className="install-command-tabs">
        {variants && (
          <div role="group" aria-label="Package manager">
            {PACKAGE_MANAGERS.map((entry) => (
              <button
                key={entry}
                aria-pressed={entry === manager}
                onClick={() => {
                  setManager(entry);
                  writePackageManager(entry);
                }}
              >
                {entry}
              </button>
            ))}
          </div>
        )}
        <span className="install-command-label">Install</span>
      </div>
      <div className="install-command-line">
        <span className="install-command-prompt" aria-hidden="true">
          $
        </span>
        <code tabIndex={0}>{shown}</code>
        <button
          onClick={() => void copy()}
          data-state={copied || undefined}
          aria-label={copied === 'yes' ? 'Copied' : 'Copy install command'}
        >
          {copied === 'yes' ? <Check size={15} /> : <Copy size={15} />}
          <span>
            {copied === 'yes' ? 'Copied' : copied === 'failed' ? 'Select to copy' : 'Copy'}
          </span>
        </button>
      </div>
    </div>
  );
}
