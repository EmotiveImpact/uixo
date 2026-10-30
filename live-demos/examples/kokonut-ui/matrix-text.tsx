// The demo kokonutui.com renders for Matrix Text: the docs page's own JSX,
// around the unchanged component.
import MatrixText from '../../vendor/kokonut-ui/components/kokonutui/matrix-text';

export function Demo() {
  return (
    <MatrixText text="Hello World!" className="min-h-[200px]" />
  );
}
