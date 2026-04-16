/**
 * "900s", "15m", "1h", "30d", "5000ms" -> миллисекунды
 * @returns Миллисекунды в виде числа или undefined.
 */

export function parseDurationToMs(value: string): number {
  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const match = trimmed.match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) {
    throw new Error(
      `Invalid duration format: "${value}". Use e.g. 900s, 15m, 1h, 30d, 5000ms.`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const unitToMs: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * unitToMs[unit];
}
