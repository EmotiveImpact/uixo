// UIXO wrappers for the detail page's Customise panel. Each one renders the provider's
// own demo markup around the unchanged provider component, with checked props from
// shared/demo-props.ts in place of the demo's fixed values.
import { AuroraText } from '../vendor/magic-ui/registry/magicui/aurora-text';
import { RetroGrid } from '../vendor/magic-ui/registry/magicui/retro-grid';
import { ShimmerButton } from '../vendor/magic-ui/registry/magicui/shimmer-button';
import { auroraPalette, type DemoPropValues } from '../../shared/demo-props';

export function ShimmerButtonCustomised({ values }: { values: DemoPropValues }) {
  return (
    <ShimmerButton
      className="shadow-2xl"
      shimmerColor={String(values.shimmerColor)}
      background={String(values.background)}
      shimmerDuration={`${values.shimmerDuration}s`}
      borderRadius={`${values.borderRadius}px`}
    >
      <span className="text-center text-sm leading-none font-medium tracking-tight whitespace-pre-wrap text-white lg:text-lg">
        {String(values.children) || ' '}
      </span>
    </ShimmerButton>
  );
}

export function AuroraTextCustomised({ values }: { values: DemoPropValues }) {
  return (
    <h1 className="text-4xl font-bold tracking-tighter md:text-5xl lg:text-7xl">
      Ship{' '}
      <AuroraText colors={[...auroraPalette(values.colors)]} speed={Number(values.speed)}>
        {String(values.children) || ' '}
      </AuroraText>
    </h1>
  );
}

export function RetroGridCustomised({ values }: { values: DemoPropValues }) {
  return (
    <div className="bg-background relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border">
      <span className="pointer-events-none z-10 bg-linear-to-b from-[#ffd319] via-[#ff2975] to-[#8c1eff] bg-clip-text text-center text-7xl leading-none font-bold tracking-tighter whitespace-pre-wrap text-transparent">
        Retro Grid
      </span>
      <RetroGrid
        angle={Number(values.angle)}
        cellSize={Number(values.cellSize)}
        opacity={Number(values.opacity)}
        darkLineColor={String(values.darkLineColor)}
        lightLineColor={String(values.lightLineColor)}
      />
    </div>
  );
}
