export const validateEnv = (config: Record<string, unknown>) => {
  const errors: string[] = [];

  if (!config['JWT_ACCESS_SECRET'])
    errors.push('JWT_ACCESS_SECRET is required');

  if (!config['JWT_REFRESH_SECRET'])
    errors.push('JWT_REFRESH_SECRET is required');

  if (errors.length) {
    throw new Error(`Config validation error:\n${errors.join('\n')}`);
  }

  return config;
};
