// next/font/google inside the demo frame. Each face comes from an @fontsource package
// that the library's theme imports, so nothing is fetched from Google at run time. The
// returned object has the same shape as next/font's: a class that sets the family, a
// class that sets the requested CSS variable, and an inline style.
function googleFont(family: string, fallback: string) {
  return ({ variable }: { variable?: string } = {}) => {
    const slug = family.toLowerCase().replace(/\s+/g, '-');
    const className = `uixo-font-${slug}`;
    const variableClass = `uixo-font-var-${slug}`;
    const stack = `'${family}', ${fallback}`;
    if (typeof document !== 'undefined' && !document.getElementById(className)) {
      const style = document.createElement('style');
      style.id = className;
      style.textContent =
        `.${className}{font-family:${stack}}` +
        (variable ? `.${variableClass}{${variable}:${stack}}` : '');
      document.head.append(style);
    }
    return { className, variable: variableClass, style: { fontFamily: stack } };
  };
}
export const Geist = googleFont('Geist', 'ui-sans-serif, system-ui, sans-serif');
export const Pacifico = googleFont('Pacifico', 'cursive');
