export function describeSessionDevice(userAgent: string | null) {
  if (!userAgent)
    return { browser: 'Неизвестный браузер', device: 'Неизвестное устройство' };

  const browsers: readonly [RegExp, string][] = [
    [/Edg(?:e|A|iOS)?\/([\d.]+)/, 'Microsoft Edge'],
    [/OPR\/([\d.]+)/, 'Opera'],
    [/YaBrowser\/([\d.]+)/, 'Яндекс Браузер'],
    [/SamsungBrowser\/([\d.]+)/, 'Samsung Internet'],
    [/(?:Firefox|FxiOS)\/([\d.]+)/, 'Firefox'],
    [/(?:Chrome|CriOS)\/([\d.]+)/, 'Chrome'],
    [/Version\/([\d.]+).*Safari/, 'Safari'],
  ];
  let browser = 'Неизвестный браузер';
  for (const [pattern, name] of browsers) {
    const match = userAgent.match(pattern);
    if (!match) continue;
    browser = `${name} ${match[1].split('.')[0]}`;
    break;
  }

  let device = 'Неизвестное устройство';
  if (/iPad/.test(userAgent)) device = 'iPad · iPadOS';
  else if (/iPhone/.test(userAgent)) device = 'iPhone · iOS';
  else if (/Android/.test(userAgent)) {
    const model = userAgent.match(
      /Android [^;);]+;\s*(?:[a-z]{2}[-_][A-Z]{2};\s*)?([^;)]+?)(?: Build\/[^;)]+)?[;)]/,
    )?.[1];
    device =
      model && model !== 'K' ? `${model} · Android` : 'Устройство Android';
  } else if (/Windows/.test(userAgent)) device = 'Компьютер · Windows';
  else if (/CrOS/.test(userAgent)) device = 'Chromebook · ChromeOS';
  else if (/Macintosh|Mac OS/.test(userAgent)) device = 'Mac · macOS';
  else if (/Linux/.test(userAgent)) device = 'Компьютер · Linux';
  return { browser, device };
}
