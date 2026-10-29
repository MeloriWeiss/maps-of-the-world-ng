/** Преобразует строковый seed в беззнаковое целое для генератора. */
export function hashSeed(seed: string) {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Создаёт воспроизводимый генератор псевдослучайных чисел по seed. */
export function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Возвращает псевдослучайное число в заданном диапазоне. */
export function between(random: () => number, min: number, max: number) {
  return min + random() * (max - min);
}

/** Выбирает элемент массива с помощью переданного генератора. */
export function pick<T>(random: () => number, values: readonly T[]) {
  return values[Math.floor(random() * values.length)];
}
