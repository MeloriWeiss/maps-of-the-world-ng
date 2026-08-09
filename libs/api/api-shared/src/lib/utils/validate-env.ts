export const validateEnv = (config: Record<string, unknown>) => {
  const errors: string[] = [];

  // JWT секреты и экспирации
  if (!config['JWT_ACCESS_SECRET'])
    errors.push(
      'JWT_ACCESS_SECRET is required (JWT secret key for access tokens)',
    );

  if (!config['JWT_REFRESH_SECRET'])
    errors.push(
      'JWT_REFRESH_SECRET is required (JWT secret key for refresh tokens)',
    );

  if (!config['JWT_ACCESS_EXPIRES'])
    errors.push(
      'JWT_ACCESS_EXPIRES is required (access token expiration time, e.g. "900s" or "15m")',
    );

  if (!config['JWT_REFRESH_EXPIRES'])
    errors.push(
      'JWT_REFRESH_EXPIRES is required (refresh token expiration time, e.g. "30d")',
    );

  // Порты
  if (!config['MAIN_API_PORT'])
    errors.push('MAIN_API_PORT is required (API server port, e.g. "3000")');

  // База данных
  if (!config['MAIN_DATABASE_URL'])
    errors.push('MAIN_DATABASE_URL is required (PostgreSQL connection URL)');

  // NODE_ENV (опционально, но рекомендуется)
  if (!config['NODE_ENV'])
    errors.push(
      'NODE_ENV is required (environment mode: "development", "production", or "test")',
    );

  const objectStorageVariables = [
    'OBJECT_STORAGE_ENDPOINT',
    'OBJECT_STORAGE_REGION',
    'OBJECT_STORAGE_BUCKET',
    'OBJECT_STORAGE_ACCESS_KEY',
    'OBJECT_STORAGE_SECRET_KEY',
    'OBJECT_STORAGE_FORCE_PATH_STYLE',
  ];

  for (const variable of objectStorageVariables) {
    if (!config[variable]) {
      errors.push(`${variable} is required (S3-compatible object storage)`);
    }
  }

  if (
    config['OBJECT_STORAGE_FORCE_PATH_STYLE'] &&
    !['true', 'false'].includes(
      String(config['OBJECT_STORAGE_FORCE_PATH_STYLE']),
    )
  ) {
    errors.push('OBJECT_STORAGE_FORCE_PATH_STYLE must be "true" or "false"');
  }

  if (config['OBJECT_STORAGE_ENDPOINT']) {
    try {
      new URL(String(config['OBJECT_STORAGE_ENDPOINT']));
    } catch {
      errors.push('OBJECT_STORAGE_ENDPOINT must be a valid absolute URL');
    }
  }

  if (errors.length) {
    throw new Error(
      `Missing required environment variables in .env file:\n\n${errors.join('\n')}\n\n` +
        `Please check your .env file and ensure all required variables are set.`,
    );
  }

  return config;
};
