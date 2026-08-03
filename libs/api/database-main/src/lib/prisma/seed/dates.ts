const seedNow = new Date('2026-08-03T09:00:00.000Z');

export const daysAgo = (days: number, hours = 0) =>
  new Date(seedNow.getTime() - (days * 24 + hours) * 60 * 60 * 1000);

export const daysFromNow = (days: number) =>
  new Date(seedNow.getTime() + days * 24 * 60 * 60 * 1000);
