import 'dotenv/config';

export const getFromEnv = (
  envName: string,
  fallback: string | number,
): string => {
  return process.env[envName] ?? String(fallback);
};
