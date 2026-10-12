/**
 * A small, curated set of live demos that accept props from the detail page. The page
 * sends chosen values to the demo frame with a source-checked message; the frame checks
 * every value against these controls again before a UIXO wrapper passes it to the
 * unchanged provider component. Prop names, types and defaults are read from the pinned
 * provider source; nothing outside this list is customisable.
 */

export type PropControl =
  | { kind: 'color'; options: readonly string[] }
  | { kind: 'range'; min: number; max: number; step: number; unit: string }
  | { kind: 'text'; maxLength: number }
  | { kind: 'palette'; options: readonly { label: string; colors: readonly string[] }[] };

export type PropDoc = {
  name: string;
  type: string;
  /** The default as the provider source writes it. */
  defaultValue: string;
  description: string;
  control?: PropControl;
};

export type DemoPropValues = Record<string, string | number>;

export type CustomisableDemo = {
  /** Named export of the UIXO wrapper in live-demos/examples/customisable.tsx. */
  export: string;
  /** File name shown above the code. */
  fileName: string;
  props: readonly PropDoc[];
  defaults: DemoPropValues;
  code: (values: DemoPropValues) => string;
};

export type DemoPropsMessage = { type: 'uixo-preview-props'; id: string; values: DemoPropValues };

const quote = (value: string) => JSON.stringify(value);

/** Lines of JSX attributes for the props that differ from their defaults. */
function attributes(
  values: DemoPropValues,
  defaults: DemoPropValues,
  render: Record<string, (value: string | number) => string>,
): string[] {
  return Object.entries(render)
    .filter(([name]) => values[name] !== defaults[name])
    .map(([name, format]) => `${name}=${format(values[name])}`);
}

const SHIMMER_DEFAULTS: DemoPropValues = {
  shimmerColor: '#ffffff',
  background: '#000000',
  shimmerDuration: 3,
  borderRadius: 100,
  children: 'Shimmer Button',
};

const AURORA_PALETTES = [
  { label: 'Original', colors: ['#FF0080', '#7928CA', '#0070F3', '#38bdf8'] },
  { label: 'Sunset', colors: ['#f97316', '#ec4899', '#facc15', '#fb7185'] },
  { label: 'Lagoon', colors: ['#22d3ee', '#34d399', '#3b82f6', '#a3e635'] },
  { label: 'Violet', colors: ['#a78bfa', '#6d28d9', '#c084fc', '#818cf8'] },
] as const;

const AURORA_DEFAULTS: DemoPropValues = { colors: 'Original', speed: 1, children: 'beautiful' };

const RETRO_DEFAULTS: DemoPropValues = {
  angle: 65,
  cellSize: 60,
  opacity: 0.5,
  darkLineColor: 'gray',
  lightLineColor: 'gray',
};

const LINE_COLOURS = ['gray', '#a78bfa', '#22d3ee', '#f472b6', '#facc15'] as const;

export const CUSTOMISABLE_DEMOS: Record<string, CustomisableDemo> = {
  'magic-ui/shimmer-button': {
    export: 'ShimmerButtonCustomised',
    fileName: 'shimmer-button-demo.tsx',
    defaults: SHIMMER_DEFAULTS,
    props: [
      {
        name: 'shimmerColor',
        type: 'string',
        defaultValue: '"#ffffff"',
        description: 'Colour of the light that runs round the edge.',
        control: {
          kind: 'color',
          options: ['#ffffff', '#c4b5fd', '#67e8f9', '#fcd34d', '#f9a8d4'],
        },
      },
      {
        name: 'shimmerDuration',
        type: 'string',
        defaultValue: '"3s"',
        description: 'Time for one lap.',
        control: { kind: 'range', min: 1, max: 6, step: 0.1, unit: 's' },
      },
      {
        name: 'borderRadius',
        type: 'string',
        defaultValue: '"100px"',
        description: 'Corner radius of the button.',
        control: { kind: 'range', min: 0, max: 100, step: 1, unit: 'px' },
      },
      {
        name: 'background',
        type: 'string',
        defaultValue: '"rgba(0, 0, 0, 1)"',
        description: 'Fill behind the label.',
        control: { kind: 'color', options: ['#000000', '#1e1b4b', '#082f49', '#3b0a1e'] },
      },
      {
        name: 'shimmerSize',
        type: 'string',
        defaultValue: '"0.05em"',
        description: 'Thickness of the light.',
      },
      {
        name: 'children',
        type: 'ReactNode',
        defaultValue: '',
        description: 'The label.',
        control: { kind: 'text', maxLength: 28 },
      },
    ],
    code: (values) => {
      const props = attributes(values, SHIMMER_DEFAULTS, {
        shimmerColor: (value) => quote(String(value)),
        shimmerDuration: (value) => quote(`${value}s`),
        borderRadius: (value) => quote(`${value}px`),
        background: (value) => quote(String(value)),
      });
      const open = props.length
        ? [
            '    <ShimmerButton',
            ...props.map((line) => `      ${line}`),
            '      className="shadow-2xl"',
            '    >',
          ]
        : ['    <ShimmerButton className="shadow-2xl">'];
      return [
        'import { ShimmerButton } from "@/components/ui/shimmer-button"',
        '',
        'export function ShimmerButtonDemo() {',
        '  return (',
        ...open,
        '      <span className="text-center text-sm leading-none font-medium tracking-tight whitespace-pre-wrap text-white lg:text-lg">',
        `        ${String(values.children)}`,
        '      </span>',
        '    </ShimmerButton>',
        '  )',
        '}',
      ].join('\n');
    },
  },
  'magic-ui/aurora-text': {
    export: 'AuroraTextCustomised',
    fileName: 'aurora-text-demo.tsx',
    defaults: AURORA_DEFAULTS,
    props: [
      {
        name: 'colors',
        type: 'string[]',
        defaultValue: '["#FF0080", "#7928CA", "#0070F3", "#38bdf8"]',
        description: 'Colours the gradient runs through.',
        control: { kind: 'palette', options: AURORA_PALETTES },
      },
      {
        name: 'speed',
        type: 'number',
        defaultValue: '1',
        description: 'How fast the colours move. 2 is twice as fast.',
        control: { kind: 'range', min: 0.25, max: 3, step: 0.25, unit: '×' },
      },
      { name: 'className', type: 'string', defaultValue: '""', description: 'Extra classes.' },
      {
        name: 'children',
        type: 'ReactNode',
        defaultValue: '',
        description: 'The words to light up.',
        control: { kind: 'text', maxLength: 24 },
      },
    ],
    code: (values) => {
      const palette = AURORA_PALETTES.find((entry) => entry.label === values.colors);
      const props = attributes(values, AURORA_DEFAULTS, {
        colors: () => `{[${(palette?.colors ?? []).map(quote).join(', ')}]}`,
        speed: (value) => `{${value}}`,
      });
      const tag = props.length ? `<AuroraText ${props.join(' ')}>` : '<AuroraText>';
      return [
        'import { AuroraText } from "@/components/ui/aurora-text"',
        '',
        'export function AuroraTextDemo() {',
        '  return (',
        '    <h1 className="text-4xl font-bold tracking-tighter md:text-5xl lg:text-7xl">',
        `      Ship ${tag}${String(values.children)}</AuroraText>`,
        '    </h1>',
        '  )',
        '}',
      ].join('\n');
    },
  },
  'magic-ui/retro-grid': {
    export: 'RetroGridCustomised',
    fileName: 'retro-grid-demo.tsx',
    defaults: RETRO_DEFAULTS,
    props: [
      {
        name: 'angle',
        type: 'number',
        defaultValue: '65',
        description: 'Tilt of the grid, in degrees.',
        control: { kind: 'range', min: 20, max: 85, step: 1, unit: '°' },
      },
      {
        name: 'cellSize',
        type: 'number',
        defaultValue: '60',
        description: 'Size of one grid square, in pixels.',
        control: { kind: 'range', min: 20, max: 120, step: 2, unit: 'px' },
      },
      {
        name: 'opacity',
        type: 'number',
        defaultValue: '0.5',
        description: 'Strength of the lines.',
        control: { kind: 'range', min: 0.1, max: 1, step: 0.05, unit: '' },
      },
      {
        name: 'darkLineColor',
        type: 'string',
        defaultValue: '"gray"',
        description: 'Line colour in the dark theme.',
        control: { kind: 'color', options: LINE_COLOURS },
      },
      {
        name: 'lightLineColor',
        type: 'string',
        defaultValue: '"gray"',
        description: 'Line colour in the light theme.',
        control: { kind: 'color', options: LINE_COLOURS },
      },
      { name: 'className', type: 'string', defaultValue: '', description: 'Extra classes.' },
    ],
    code: (values) => {
      const props = attributes(values, RETRO_DEFAULTS, {
        angle: (value) => `{${value}}`,
        cellSize: (value) => `{${value}}`,
        opacity: (value) => `{${value}}`,
        darkLineColor: (value) => quote(String(value)),
        lightLineColor: (value) => quote(String(value)),
      });
      return [
        'import { RetroGrid } from "@/components/ui/retro-grid"',
        '',
        'export function RetroGridDemo() {',
        '  return (',
        '    <div className="bg-background relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border">',
        '      <span className="pointer-events-none z-10 bg-linear-to-b from-[#ffd319] via-[#ff2975] to-[#8c1eff] bg-clip-text text-center text-7xl leading-none font-bold tracking-tighter whitespace-pre-wrap text-transparent">',
        '        Retro Grid',
        '      </span>',
        '',
        props.length ? `      <RetroGrid ${props.join(' ')} />` : '      <RetroGrid />',
        '    </div>',
        '  )',
        '}',
      ].join('\n');
    },
  },
};

export function customisableDemo(id: string): CustomisableDemo | undefined {
  return Object.hasOwn(CUSTOMISABLE_DEMOS, id) ? CUSTOMISABLE_DEMOS[id] : undefined;
}

/** The colours of an Aurora Text palette, by its label. */
export function auroraPalette(label: string | number): readonly string[] {
  return (AURORA_PALETTES.find((entry) => entry.label === label) ?? AURORA_PALETTES[0]).colors;
}

function sanitiseValue(control: PropControl, value: unknown, fallback: string | number) {
  switch (control.kind) {
    case 'color':
      return typeof value === 'string' && control.options.includes(value) ? value : fallback;
    case 'palette':
      return typeof value === 'string' && control.options.some((entry) => entry.label === value)
        ? value
        : fallback;
    case 'range': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
      const clamped = Math.min(control.max, Math.max(control.min, value));
      return Number((Math.round(clamped / control.step) * control.step).toFixed(4));
    }
    case 'text':
      return typeof value === 'string'
        ? // eslint-disable-next-line no-control-regex
          value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, control.maxLength)
        : fallback;
  }
}

/**
 * Every value checked against its control: colours and palettes from the listed options,
 * numbers clamped to their range and step, text stripped of control characters and cut
 * to length. Anything unknown is dropped; anything invalid falls back to its default.
 */
export function sanitiseDemoProps(id: string, input: unknown): DemoPropValues | null {
  const demo = customisableDemo(id);
  if (!demo) return null;
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const values: DemoPropValues = { ...demo.defaults };
  for (const prop of demo.props) {
    if (!prop.control || !Object.hasOwn(demo.defaults, prop.name)) continue;
    values[prop.name] = sanitiseValue(prop.control, source[prop.name], demo.defaults[prop.name]);
  }
  return values;
}
