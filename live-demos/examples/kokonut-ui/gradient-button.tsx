// The demo kokonutui.com renders for Gradient Button: the docs page's own JSX,
// around the unchanged component.
import GradientButton from '../../vendor/kokonut-ui/components/kokonutui/gradient-button';

export function Demo() {
  return (
    <div className="flex flex-col gap-2">
      <GradientButton label="Gradient Button" />
      <GradientButton label="Gradient Button" variant="orange" />
      <GradientButton label="Gradient Button" variant="purple" />
    </div>
  );
}
