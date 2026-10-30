// The demo kokonutui.com renders for Hold Button: the docs page's own JSX,
// around the unchanged component.
import HoldButton from '../../vendor/kokonut-ui/components/kokonutui/hold-button';

export function Demo() {
  return (
    <div className="flex flex-col gap-2">
      <HoldButton />
      <HoldButton variant="green" holdDuration="1000" />
      <HoldButton variant="blue" holdDuration="2000" />
      <HoldButton variant="orange" />
      <HoldButton variant="grey" />
    </div>
  );
}
