// The demo kokonutui.com renders for Particle Button: the docs page's own JSX,
// around the unchanged component.
import ParticleButton from '../../vendor/kokonut-ui/components/kokonutui/particle-button';

export function Demo() {
  return (
    <ParticleButton successDuration={1000} variant="default">
      Click me!
    </ParticleButton>
  );
}
