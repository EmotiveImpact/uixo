// cult-ui's demo sets a 64rem minimum width (min-w-5xl), so a card would show only its
// left edge. This renders the unchanged demo at that width, scaled to fit the card.
import TabsIllustrationVercelDemo from '../../vendor/cult-ui/registry/default/example/tabs-illustration-vercel-demo';

export function TabsIllustrationVercelExample() {
  return (
    <div style={{ width: 1024, zoom: 0.42 }}>
      <TabsIllustrationVercelDemo />
    </div>
  );
}
