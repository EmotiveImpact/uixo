// The docs page (content/docs/components/theme-selector.mdx) leads with ThemeSelectorShowcase:
// the unchanged SelectThemeDropdown fed by ActiveThemeProvider's state. That provider needs
// Next's router and nuqs's URL sync, which a sandboxed frame does not have, so this file holds
// the same state itself and puts the same theme-<name> class on <html> and <body>, as the
// provider does, so picking a theme recolours the page through retro-globals.css.
import { useEffect, useState } from 'react';
import { SelectThemeDropdown } from '../../vendor/8bitcn/components/select-theme-dropdown';
import { Theme } from '../../vendor/8bitcn/lib/themes';

export default function Demo() {
  const [activeTheme, setActiveTheme] = useState<Theme>(Theme.Default);
  useEffect(() => {
    for (const el of [document.body, document.documentElement]) {
      for (const name of [...el.classList])
        if (name.startsWith('theme-')) el.classList.remove(name);
      el.classList.add(`theme-${activeTheme}`);
    }
  }, [activeTheme]);
  return (
    <div className="w-full max-w-md">
      <SelectThemeDropdown activeTheme={activeTheme} setActiveTheme={setActiveTheme} />
    </div>
  );
}
