// cult-ui's demo is a configurator: a heading and controls above a 500px preview, so a
// card shows mostly controls. This renders the preview panel alone: the unchanged
// CanvasFractalGrid with the demo's initial configuration, in the demo's own frame.
import { CanvasFractalGrid } from '../../vendor/cult-ui/registry/default/ui/canvas-fractal-grid';

const initialConfig = {
  dotSize: 5,
  dotSpacing: 25,
  dotOpacity: 0.8,
  gradientAnimationDuration: 5,
  waveIntensity: 40,
  waveRadius: 250,
  dotColor: 'rgba(100, 200, 255, 0.2)',
  glowColor: 'rgba(100, 200, 255, 1)',
  enableNoise: true,
  noiseOpacity: 0.05,
  enableMouseGlow: false,
  initialPerformance: 'high' as const,
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

export function CanvasFractalGridExample() {
  return (
    <div className="w-[440px] max-w-full overflow-hidden rounded-lg bg-white">
      <div className="relative h-[300px] w-full">
        <CanvasFractalGrid {...initialConfig} />
      </div>
    </div>
  );
}
