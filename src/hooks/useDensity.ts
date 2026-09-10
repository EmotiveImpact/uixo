import { useEffect, useState } from 'react';
import { readStored, writeStored, DENSITY_KEY } from '../lib/storage';

export type Density = 'comfortable' | 'compact';

/** Grid density, remembered per browser. */
export function useDensity() {
  const [density, setDensity] = useState<Density>(() =>
    readStored<Density>(DENSITY_KEY, 'comfortable'),
  );

  useEffect(() => {
    writeStored(DENSITY_KEY, density);
  }, [density]);

  return { density, setDensity };
}
