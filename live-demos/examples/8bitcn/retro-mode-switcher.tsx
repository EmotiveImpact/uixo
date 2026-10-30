// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/retro-mode-switcher.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
// The switcher shows its moon on html.light and its sun on html.dark, the two classes the
// site's next-themes ThemeProvider (attribute="class") puts on <html>. The harness only sets
// "dark", so this file adds "light" whenever the frame is not dark, as next-themes would.
import { useEffect } from "react";
import { RetroModeSwitcher } from "../../vendor/8bitcn/components/ui/retro-mode-switcher";

function useLightClass() {
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => root.classList.toggle("light", !root.classList.contains("dark"));
    sync();
    window.addEventListener("uixo-theme", sync);
    return () => {
      window.removeEventListener("uixo-theme", sync);
      root.classList.remove("light");
    };
  }, []);
}

export default function Demo() {
  useLightClass();
  return (
    <>
      <div className="flex items-center gap-4">
        <RetroModeSwitcher />
        <span className="text-sm text-muted-foreground">
          Click to toggle between light and dark themes
        </span>
      </div>
    </>
  );
}
