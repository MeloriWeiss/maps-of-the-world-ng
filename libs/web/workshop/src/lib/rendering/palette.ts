/** Resolve theme tokens for Canvas, whose color properties do not resolve var(). */
export function canvasColor(token: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
}

export function resolveCanvasColor(value: string) {
  const match = /^var\((--[\w-]+)\)$/.exec(value);
  return match ? canvasColor(match[1]) : value;
}

/** Frozen values for canvas rendering after a theme change or reload. */
export function captureCanvasPalette(): Readonly<Record<string, string>> {
  const style = getComputedStyle(document.documentElement);
  const palette: Record<string, string> = {};
  for (let index = 0; index < style.length; index++) {
    const name = style.item(index);
    if (!name.startsWith('--')) continue;
    const value = style.getPropertyValue(name).trim();
    if (value) palette[name] = value;
  }
  return palette;
}
