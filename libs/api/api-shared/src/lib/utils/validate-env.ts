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

  if (!config['MAIN_DB_PORT'])
    errors.push(
      'MAIN_DB_PORT is required (PostgreSQL database port, e.g. "5432")',
    );

  if (!config['PGADMIN_PORT'])
    errors.push(
      'PGADMIN_PORT is required (pgAdmin web interface port, e.g. "5050")',
    );

  // База данных
  if (!config['MAIN_DATABASE_URL'])
    errors.push('MAIN_DATABASE_URL is required (PostgreSQL connection URL)');

  if (!config['MAIN_DB_USER'])
    errors.push('MAIN_DB_USER is required (PostgreSQL database username)');

  if (!config['MAIN_DB_PASSWORD'])
    errors.push('MAIN_DB_PASSWORD is required (PostgreSQL database password)');

  if (!config['MAIN_DB_NAME'])
    errors.push('MAIN_DB_NAME is required (PostgreSQL database name)');

  // pgAdmin
  if (!config['PGADMIN_DEFAULT_EMAIL'])
    errors.push('PGADMIN_DEFAULT_EMAIL is required (pgAdmin login email)');

  if (!config['PGADMIN_DEFAULT_PASSWORD'])
    errors.push(
      'PGADMIN_DEFAULT_PASSWORD is required (pgAdmin login password)',
    );

  // NODE_ENV (опционально, но рекомендуется)
  if (!config['NODE_ENV'])
    errors.push(
      'NODE_ENV is required (environment mode: "development", "production", or "test")',
    );

  if (errors.length) {
    throw new Error(
      `Missing required environment variables in .env file:\n\n${errors.join('\n')}\n\n` +
        `Please check your .env file and ensure all required variables are set.`,
    );
  }

  return config;
};
