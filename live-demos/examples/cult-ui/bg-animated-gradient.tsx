// cult-ui's demo is a configurator: a heading and controls above a 500px preview, so a
// card shows mostly controls. This renders the preview panel alone: the unchanged
// GradientAnimation with the demo's initial configuration, in the demo's own frame.
import { GradientAnimation } from '../../vendor/cult-ui/registry/default/ui/bg-animated-gradient';

const initialConfig = {
  animationDuration: 5,
  gradients: [
    {
      stops: [
        { color: '#3498DB', position: 0 },
        { color: '#2980B9', position: 25 },
        { color: '#1ABC9C', position: 50 },
        { color: 'transparent', position: 75 },
      ],
      centerX: 30,
      centerY: 70,
    },
    {
      stops: [
        { color: '#16A085', position: 0 },
        { color: '#2980B9', position: 25 },
        { color: '#3498DB', position: 50 },
        { color: 'transparent', position: 75 },
      ],
      centerX: 70,
      centerY: 30,
    },
  ],
};

export function BgAnimatedGradientExample() {
  return (
    <div className="w-[440px] max-w-full overflow-hidden rounded-lg bg-white">
      <div className="relative h-[300px] w-full">
        <GradientAnimation {...initialConfig} />
      </div>
    </div>
  );
}
