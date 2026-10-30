// cult-ui's terminal demo is a full-width hero: the window slides up once a tenth of it is
// on screen, which never happens in a 360px-tall card. This renders the unchanged demo at
// a docs-preview width, scaled to fit the card, so it plays as it does there.
import { TerminalAnimationDemo } from '../../vendor/cult-ui/registry/default/example/terminal-animation-demo';

export function TerminalAnimationExample() {
  return (
    <div style={{ width: 880, zoom: 0.5 }}>
      <TerminalAnimationDemo />
    </div>
  );
}
