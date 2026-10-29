/** Получает значение CSS-токена темы для Canvas API, который не разрешает выражения var(). */
export function canvasColor(token: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
}

/** Разрешает CSS-переменную в цветовое значение для Canvas API. */
export function resolveCanvasColor(value: string) {
  const match = /^var\((--[\w-]+)\)$/.exec(value);
  return match ? canvasColor(match[1]) : value;
}

/** Снимок значений цветовой палитры для отрисовки Canvas после смены темы или перезагрузки. */
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
