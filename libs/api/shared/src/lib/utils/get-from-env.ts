import 'dotenv/config';

/** Читает обязательное значение переменной окружения. */
export const getFromEnv = (
  envName: string,
  fallback: string | number,
): string => {
  return process.env[envName] ?? String(fallback);
};
